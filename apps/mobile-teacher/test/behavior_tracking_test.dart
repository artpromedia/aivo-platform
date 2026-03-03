/// Behavior Tracking Tests
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'dart:convert';

import 'package:mobile_teacher/behavior_tracking/behavior_api.dart';
import 'package:mobile_teacher/behavior_tracking/models.dart';

void main() {
  group('BehaviorTrackingApi', () {
    group('Incidents', () {
      test('getIncidents returns list of incidents', () async {
        final client = MockClient((request) async {
          expect(request.url.path, '/api/behavior/incidents');
          expect(request.url.queryParameters['studentId'], 'student123');

          return http.Response(
            json.encode([
              {
                'id': '1',
                'studentId': 'student123',
                'teacherId': 'teacher123',
                'date': '2024-01-15T00:00:00.000Z',
                'time': '10:30 AM',
                'type': 'disruptive',
                'severity': 'medium',
                'description': 'Talking during lesson',
                'location': 'Classroom',
                'duration': 5,
                'witnesses': [],
                'interventionsUsed': [],
                'followUpRequired': false,
                'parentNotified': false,
                'adminNotified': false,
                'attachments': [],
                'createdAt': '2024-01-15T00:00:00.000Z',
                'updatedAt': '2024-01-15T00:00:00.000Z',
              }
            ]),
            200,
          );
        });

        final api = BehaviorTrackingApi(client: client);
        final incidents = await api.getIncidents(studentId: 'student123');

        expect(incidents.length, 1);
        expect(incidents.first.id, '1');
        expect(incidents.first.type, BehaviorType.disruptive);
        expect(incidents.first.severity, BehaviorSeverity.medium);
        expect(incidents.first.description, 'Talking during lesson');
      });

      test('createIncident creates and returns incident', () async {
        final newIncident = BehaviorIncident(
          studentId: 'student123',
          teacherId: 'teacher123',
          date: DateTime.parse('2024-01-15'),
          time: '10:30 AM',
          type: BehaviorType.verbal,
          severity: BehaviorSeverity.low,
          description: 'Inappropriate language',
        );

        final client = MockClient((request) async {
          expect(request.url.path, '/api/behavior/incidents');
          expect(request.method, 'POST');

          final body = json.decode(request.body);
          expect(body['type'], 'verbal');
          expect(body['severity'], 'low');

          return http.Response(
            json.encode({
              'id': '2',
              ...body,
              'witnesses': [],
              'interventionsUsed': [],
              'attachments': [],
              'createdAt': '2024-01-15T00:00:00.000Z',
              'updatedAt': '2024-01-15T00:00:00.000Z',
            }),
            201,
          );
        });

        final api = BehaviorTrackingApi(client: client);
        final created = await api.createIncident(newIncident);

        expect(created.id, '2');
        expect(created.type, BehaviorType.verbal);
        expect(created.severity, BehaviorSeverity.low);
      });

      test('deleteIncident removes incident', () async {
        final client = MockClient((request) async {
          expect(request.url.path, '/api/behavior/incidents/1');
          expect(request.method, 'DELETE');
          return http.Response('', 204);
        });

        final api = BehaviorTrackingApi(client: client);
        await api.deleteIncident('1');
      });
    });

    group('Pattern Analysis', () {
      test('getPatterns returns behavior pattern', () async {
        final client = MockClient((request) async {
          expect(request.url.path, '/api/behavior/patterns');

          return http.Response(
            json.encode({
              'studentId': 'student123',
              'startDate': '2024-01-01T00:00:00.000Z',
              'endDate': '2024-01-31T00:00:00.000Z',
              'totalIncidents': 15,
              'incidentsByType': {
                'disruptive': 8,
                'verbal': 5,
                'offtask': 2,
              },
              'incidentsBySeverity': {
                'low': 10,
                'medium': 4,
                'high': 1,
              },
              'commonTriggers': ['Transitions', 'Math class'],
              'peakTimes': ['10:00 AM - 11:00 AM', '2:00 PM - 3:00 PM'],
              'peakLocations': ['Classroom', 'Cafeteria'],
              'effectiveness': {
                'Visual schedule': 85.0,
                'Breaks': 70.0,
              },
              'recommendations': [
                'Consider more frequent breaks',
                'Use visual timer during transitions',
              ],
            }),
            200,
          );
        });

        final api = BehaviorTrackingApi(client: client);
        final pattern = await api.getPatterns(studentId: 'student123');

        expect(pattern.totalIncidents, 15);
        expect(pattern.incidentsByType[BehaviorType.disruptive], 8);
        expect(pattern.incidentsBySeverity[BehaviorSeverity.low], 10);
        expect(pattern.commonTriggers.length, 2);
        expect(pattern.peakTimes.length, 2);
        expect(pattern.effectiveness['Visual schedule'], 85.0);
        expect(pattern.recommendations.length, 2);
      });

      test('getTrends returns behavior trends', () async {
        final client = MockClient((request) async {
          expect(request.url.path, '/api/behavior/trends');

          return http.Response(
            json.encode([
              {
                'date': '2024-01-15T00:00:00.000Z',
                'incidentCount': 3,
                'averageSeverity': 1.5,
                'typeBreakdown': {
                  'disruptive': 2,
                  'verbal': 1,
                },
              },
              {
                'date': '2024-01-16T00:00:00.000Z',
                'incidentCount': 2,
                'averageSeverity': 1.0,
                'typeBreakdown': {
                  'disruptive': 1,
                  'offtask': 1,
                },
              }
            ]),
            200,
          );
        });

        final api = BehaviorTrackingApi(client: client);
        final trends = await api.getTrends(studentId: 'student123');

        expect(trends.length, 2);
        expect(trends.first.incidentCount, 3);
        expect(trends.first.averageSeverity, 1.5);
        expect(trends.last.incidentCount, 2);
      });
    });

    group('Interventions', () {
      test('getInterventions returns list of interventions', () async {
        final client = MockClient((request) async {
          expect(request.url.path, '/api/behavior/interventions');

          return http.Response(
            json.encode([
              {
                'id': '1',
                'studentId': 'student123',
                'teacherId': 'teacher123',
                'targetBehavior': 'Disruptive behavior during transitions',
                'strategy': 'Visual Schedule',
                'description': 'Use visual schedule to prepare for transitions',
                'implementation': 'Show schedule 5 minutes before transition',
                'status': 'active',
                'startDate': '2024-01-01T00:00:00.000Z',
                'frequency': 'Before each transition',
                'effectivenessRating': 4,
                'createdAt': '2024-01-01T00:00:00.000Z',
                'updatedAt': '2024-01-15T00:00:00.000Z',
              }
            ]),
            200,
          );
        });

        final api = BehaviorTrackingApi(client: client);
        final interventions = await api.getInterventions(studentId: 'student123');

        expect(interventions.length, 1);
        expect(interventions.first.strategy, 'Visual Schedule');
        expect(interventions.first.status, InterventionStatus.active);
        expect(interventions.first.effectivenessRating, 4);
      });

      test('createIntervention creates and returns intervention', () async {
        const newIntervention = BehaviorIntervention(
          studentId: 'student123',
          teacherId: 'teacher123',
          targetBehavior: 'Off-task behavior',
          strategy: 'Timer',
          description: 'Use visual timer for work periods',
          implementation: 'Set timer for 15-minute work periods',
          status: InterventionStatus.planned,
          frequency: 'Daily',
        );

        final client = MockClient((request) async {
          expect(request.url.path, '/api/behavior/interventions');
          expect(request.method, 'POST');

          final body = json.decode(request.body);
          expect(body['strategy'], 'Timer');
          expect(body['status'], 'planned');

          return http.Response(
            json.encode({
              'id': '2',
              ...body,
              'createdAt': '2024-01-15T00:00:00.000Z',
              'updatedAt': '2024-01-15T00:00:00.000Z',
            }),
            201,
          );
        });

        final api = BehaviorTrackingApi(client: client);
        final created = await api.createIntervention(newIntervention);

        expect(created.id, '2');
        expect(created.strategy, 'Timer');
        expect(created.status, InterventionStatus.planned);
      });

      test('recordImplementation creates intervention log', () async {
        final client = MockClient((request) async {
          expect(request.url.path, '/api/behavior/interventions/1/log');
          expect(request.method, 'POST');

          final body = json.decode(request.body);
          expect(body['implemented'], true);
          expect(body['effectiveness'], 4);

          return http.Response(
            json.encode({
              'id': '1',
              'interventionId': '1',
              'studentId': 'student123',
              'date': '2024-01-15T00:00:00.000Z',
              'implemented': true,
              'effectiveness': 4,
              'notes': 'Worked well today',
              'recordedBy': 'teacher123',
              'createdAt': '2024-01-15T00:00:00.000Z',
            }),
            201,
          );
        });

        final api = BehaviorTrackingApi(client: client);
        final log = await api.recordImplementation(
          interventionId: '1',
          studentId: 'student123',
          date: DateTime.parse('2024-01-15'),
          implemented: true,
          effectiveness: 4,
          notes: 'Worked well today',
        );

        expect(log.id, '1');
        expect(log.implemented, true);
        expect(log.effectiveness, 4);
        expect(log.notes, 'Worked well today');
      });
    });

    group('Reports', () {
      test('generateReport returns behavior report', () async {
        final client = MockClient((request) async {
          expect(request.url.path, '/api/behavior/reports');

          return http.Response(
            json.encode({
              'studentId': 'student123',
              'startDate': '2024-01-01T00:00:00.000Z',
              'endDate': '2024-01-31T00:00:00.000Z',
              'summary': {
                'totalIncidents': 15,
                'averagePerDay': 0.5,
                'mostCommonType': 'disruptive',
                'mostCommonSeverity': 'low',
                'improvementRate': 20.0,
                'interventionCompliance': 85.0,
              },
              'incidents': [],
              'activeInterventions': [],
              'recommendations': [
                'Continue current interventions',
                'Monitor progress weekly',
              ],
              'generatedAt': '2024-02-01T00:00:00.000Z',
            }),
            200,
          );
        });

        final api = BehaviorTrackingApi(client: client);
        final report = await api.generateReport(
          studentId: 'student123',
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        );

        expect(report.summary.totalIncidents, 15);
        expect(report.summary.averagePerDay, 0.5);
        expect(report.summary.improvementRate, 20.0);
        expect(report.recommendations.length, 2);
      });
    });

    group('Templates', () {
      test('getInterventionTemplates returns templates', () async {
        final client = MockClient((request) async {
          expect(request.url.path, '/api/behavior/intervention-templates');

          return http.Response(
            json.encode([
              {
                'id': '1',
                'name': 'Visual Schedule',
                'category': 'Transitions',
                'targetBehaviors': ['disruptive', 'noncompliance'],
                'strategy': 'Visual supports',
                'description': 'Use visual schedule for transitions',
                'implementation': 'Display schedule prominently',
                'frequency': 'Throughout the day',
                'successCriteria': '80% reduction in transition incidents',
                'dataCollection': 'Track incidents during transitions',
                'evidenceBased': true,
                'resources': ['Visual schedule template', 'Timer app'],
              }
            ]),
            200,
          );
        });

        final api = BehaviorTrackingApi(client: client);
        final templates = await api.getInterventionTemplates();

        expect(templates.length, 1);
        expect(templates.first.name, 'Visual Schedule');
        expect(templates.first.evidenceBased, true);
        expect(templates.first.targetBehaviors.length, 2);
      });
    });
  });

  group('BehaviorIncident Model', () {
    test('fromJson creates incident from JSON', () {
      final json = {
        'id': '1',
        'studentId': 'student123',
        'teacherId': 'teacher123',
        'date': '2024-01-15T00:00:00.000Z',
        'time': '10:30 AM',
        'type': 'verbal',
        'severity': 'high',
        'description': 'Yelling in classroom',
        'location': 'Room 101',
        'duration': 10,
        'antecedent': 'Difficult math problem',
        'consequence': 'Calming break',
        'witnesses': ['Teacher', 'Aide'],
        'interventionsUsed': ['Deep breathing', 'Movement break'],
        'followUpRequired': true,
        'parentNotified': true,
        'adminNotified': false,
        'attachments': [],
        'createdAt': '2024-01-15T00:00:00.000Z',
        'updatedAt': '2024-01-15T00:00:00.000Z',
      };

      final incident = BehaviorIncident.fromJson(json);

      expect(incident.id, '1');
      expect(incident.type, BehaviorType.verbal);
      expect(incident.severity, BehaviorSeverity.high);
      expect(incident.description, 'Yelling in classroom');
      expect(incident.duration, 10);
      expect(incident.witnesses.length, 2);
      expect(incident.followUpRequired, true);
    });

    test('toJson creates JSON from incident', () {
      final incident = BehaviorIncident(
        id: '1',
        studentId: 'student123',
        teacherId: 'teacher123',
        date: DateTime.parse('2024-01-15'),
        time: '10:30 AM',
        type: BehaviorType.physical,
        severity: BehaviorSeverity.crisis,
        description: 'Pushing another student',
        location: 'Playground',
        duration: 5,
        followUpRequired: true,
        parentNotified: true,
        adminNotified: true,
      );

      final json = incident.toJson();

      expect(json['id'], '1');
      expect(json['type'], 'physical');
      expect(json['severity'], 'crisis');
      expect(json['description'], 'Pushing another student');
      expect(json['followUpRequired'], true);
      expect(json['adminNotified'], true);
    });

    test('copyWith creates modified copy', () {
      final original = BehaviorIncident(
        studentId: 'student123',
        teacherId: 'teacher123',
        date: DateTime.parse('2024-01-15'),
        time: '10:30 AM',
        type: BehaviorType.disruptive,
        severity: BehaviorSeverity.low,
        description: 'Talking during lesson',
      );

      final modified = original.copyWith(
        severity: BehaviorSeverity.medium,
        followUpRequired: true,
      );

      expect(modified.severity, BehaviorSeverity.medium);
      expect(modified.followUpRequired, true);
      expect(modified.description, 'Talking during lesson');
    });
  });

  group('BehaviorIntervention Model', () {
    test('fromJson creates intervention from JSON', () {
      final json = {
        'id': '1',
        'studentId': 'student123',
        'teacherId': 'teacher123',
        'targetBehavior': 'Off-task behavior',
        'strategy': 'Timer',
        'description': 'Use timer for work periods',
        'implementation': 'Set 15-minute timer',
        'status': 'active',
        'startDate': '2024-01-01T00:00:00.000Z',
        'frequency': 'Daily',
        'successCriteria': '80% on-task behavior',
        'effectivenessRating': 4,
        'createdAt': '2024-01-01T00:00:00.000Z',
        'updatedAt': '2024-01-15T00:00:00.000Z',
      };

      final intervention = BehaviorIntervention.fromJson(json);

      expect(intervention.id, '1');
      expect(intervention.strategy, 'Timer');
      expect(intervention.status, InterventionStatus.active);
      expect(intervention.effectivenessRating, 4);
    });

    test('toJson creates JSON from intervention', () {
      const intervention = BehaviorIntervention(
        id: '1',
        studentId: 'student123',
        teacherId: 'teacher123',
        targetBehavior: 'Disruptive behavior',
        strategy: 'Positive reinforcement',
        description: 'Reward on-task behavior',
        implementation: 'Give sticker for 15 min on-task',
        status: InterventionStatus.active,
        frequency: '3x per day',
      );

      final json = intervention.toJson();

      expect(json['strategy'], 'Positive reinforcement');
      expect(json['status'], 'active');
      expect(json['frequency'], '3x per day');
    });
  });
}
