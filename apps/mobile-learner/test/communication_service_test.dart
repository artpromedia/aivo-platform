import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'dart:convert';
import 'package:mobile_learner/communication/communication_service.dart';
import 'package:mobile_learner/communication/models.dart';

void main() {
  group('CommunicationService - AAC Boards', () {
    test('getAACBoards returns list of boards', () async {
      final mockClient = MockClient((request) async {
        return http.Response(
          json.encode([
            {
              'id': '1',
              'userId': 'user123',
              'name': 'My Board',
              'layout': 'grid3x3',
              'symbols': [],
              'createdAt': '2026-01-15T10:00:00Z',
              'updatedAt': '2026-01-15T10:00:00Z',
            }
          ]),
          200,
        );
      });

      final service = CommunicationService(client: mockClient);
      final boards = await service.getAACBoards('user123');

      expect(boards, isA<List<AACBoard>>());
      expect(boards.length, 1);
      expect(boards[0].name, 'My Board');
      expect(boards[0].layout, AACBoardLayout.grid3x3);
    });

    test('createAACBoard creates new board', () async {
      final mockClient = MockClient((request) async {
        expect(request.method, 'POST');
        expect(request.url.path, '/aac-boards');
        final body = json.decode(request.body);
        expect(body['name'], 'Test Board');
        expect(body['layout'], 'grid3x3');

        return http.Response(
          json.encode({
            'id': '1',
            'userId': 'user123',
            'name': 'Test Board',
            'layout': 'grid3x3',
            'symbols': [],
            'createdAt': '2026-01-15T10:00:00Z',
            'updatedAt': '2026-01-15T10:00:00Z',
          }),
          201,
        );
      });

      final service = CommunicationService(client: mockClient);
      final board = await service.createAACBoard(
        userId: 'user123',
        name: 'Test Board',
        layout: AACBoardLayout.grid3x3,
      );

      expect(board.name, 'Test Board');
      expect(board.layout, AACBoardLayout.grid3x3);
    });

    test('addSymbolToBoard adds symbol', () async {
      final mockClient = MockClient((request) async {
        expect(request.method, 'POST');
        expect(request.url.path, '/aac-boards/1/symbols');

        return http.Response(
          json.encode({
            'id': '1',
            'userId': 'user123',
            'name': 'Test Board',
            'layout': 'grid3x3',
            'symbols': [
              {
                'id': 'sym1',
                'label': 'Hello',
                'category': 'greeting',
                'row': 0,
                'column': 0,
              }
            ],
            'createdAt': '2026-01-15T10:00:00Z',
            'updatedAt': '2026-01-15T10:00:00Z',
          }),
          200,
        );
      });

      final service = CommunicationService(client: mockClient);
      final symbol = AACSymbol(
        id: 'sym1',
        label: 'Hello',
        category: 'greeting',
        row: 0,
        column: 0,
      );
      final board = await service.addSymbolToBoard('1', symbol);

      expect(board.symbols.length, 1);
      expect(board.symbols[0].label, 'Hello');
    });

    test('createMessage creates AAC message', () async {
      final mockClient = MockClient((request) async {
        expect(request.method, 'POST');
        expect(request.url.path, '/aac-messages');
        final body = json.decode(request.body);
        expect(body['text'], 'Hello World');

        return http.Response(
          json.encode({
            'id': '1',
            'userId': 'user123',
            'boardId': 'board1',
            'symbolIds': ['sym1', 'sym2'],
            'text': 'Hello World',
            'createdAt': '2026-01-15T10:00:00Z',
          }),
          201,
        );
      });

      final service = CommunicationService(client: mockClient);
      final message = await service.createMessage(
        userId: 'user123',
        boardId: 'board1',
        symbolIds: ['sym1', 'sym2'],
        text: 'Hello World',
      );

      expect(message.text, 'Hello World');
      expect(message.symbolIds.length, 2);
    });
  });

  group('CommunicationService - Visual Schedules', () {
    test('getSchedules returns list of schedules', () async {
      final mockClient = MockClient((request) async {
        return http.Response(
          json.encode([
            {
              'id': '1',
              'userId': 'user123',
              'name': 'Daily Schedule',
              'date': '2026-01-15',
              'activities': [],
              'createdAt': '2026-01-15T10:00:00Z',
              'updatedAt': '2026-01-15T10:00:00Z',
            }
          ]),
          200,
        );
      });

      final service = CommunicationService(client: mockClient);
      final schedules = await service.getSchedules('user123');

      expect(schedules, isA<List<VisualSchedule>>());
      expect(schedules.length, 1);
      expect(schedules[0].name, 'Daily Schedule');
    });

    test('createSchedule creates new schedule', () async {
      final mockClient = MockClient((request) async {
        expect(request.method, 'POST');
        expect(request.url.path, '/schedules');
        final body = json.decode(request.body);
        expect(body['name'], 'Test Schedule');

        return http.Response(
          json.encode({
            'id': '1',
            'userId': 'user123',
            'name': 'Test Schedule',
            'date': '2026-01-15',
            'activities': [],
            'createdAt': '2026-01-15T10:00:00Z',
            'updatedAt': '2026-01-15T10:00:00Z',
          }),
          201,
        );
      });

      final service = CommunicationService(client: mockClient);
      final schedule = await service.createSchedule(
        userId: 'user123',
        name: 'Test Schedule',
        date: '2026-01-15',
      );

      expect(schedule.name, 'Test Schedule');
    });

    test('addActivity adds activity to schedule', () async {
      final mockClient = MockClient((request) async {
        expect(request.method, 'POST');
        expect(request.url.path, '/schedules/1/activities');

        return http.Response(
          json.encode({
            'id': '1',
            'userId': 'user123',
            'name': 'Test Schedule',
            'date': '2026-01-15',
            'activities': [
              {
                'id': 'act1',
                'name': 'Math Class',
                'time': '09:00',
                'duration': 60,
                'category': 'learning',
                'isCompleted': false,
              }
            ],
            'createdAt': '2026-01-15T10:00:00Z',
            'updatedAt': '2026-01-15T10:00:00Z',
          }),
          200,
        );
      });

      final service = CommunicationService(client: mockClient);
      final activity = ScheduleActivity(
        id: 'act1',
        name: 'Math Class',
        time: '09:00',
        duration: 60,
        category: 'learning',
      );
      final schedule = await service.addActivity('1', activity);

      expect(schedule.activities.length, 1);
      expect(schedule.activities[0].name, 'Math Class');
    });

    test('completeActivity marks activity as complete', () async {
      final mockClient = MockClient((request) async {
        expect(request.method, 'POST');
        expect(request.url.path, '/schedules/1/activities/act1/complete');

        return http.Response(
          json.encode({
            'id': '1',
            'userId': 'user123',
            'name': 'Test Schedule',
            'date': '2026-01-15',
            'activities': [
              {
                'id': 'act1',
                'name': 'Math Class',
                'time': '09:00',
                'duration': 60,
                'category': 'learning',
                'isCompleted': true,
                'completedAt': '2026-01-15T10:30:00Z',
              }
            ],
            'createdAt': '2026-01-15T10:00:00Z',
            'updatedAt': '2026-01-15T10:30:00Z',
          }),
          200,
        );
      });

      final service = CommunicationService(client: mockClient);
      final schedule = await service.completeActivity('1', 'act1');

      expect(schedule.activities[0].isCompleted, true);
    });
  });

  group('CommunicationService - Choice Boards', () {
    test('getChoiceBoards returns list of boards', () async {
      final mockClient = MockClient((request) async {
        return http.Response(
          json.encode([
            {
              'id': '1',
              'userId': 'user123',
              'name': 'Yes/No Board',
              'type': 'yesNo',
              'choices': [],
              'createdAt': '2026-01-15T10:00:00Z',
              'updatedAt': '2026-01-15T10:00:00Z',
            }
          ]),
          200,
        );
      });

      final service = CommunicationService(client: mockClient);
      final boards = await service.getChoiceBoards('user123');

      expect(boards, isA<List<ChoiceBoard>>());
      expect(boards.length, 1);
      expect(boards[0].type, ChoiceBoardType.yesNo);
    });

    test('createChoiceBoard creates new board', () async {
      final mockClient = MockClient((request) async {
        expect(request.method, 'POST');
        expect(request.url.path, '/choice-boards');
        final body = json.decode(request.body);
        expect(body['name'], 'Test Board');
        expect(body['type'], 'custom');

        return http.Response(
          json.encode({
            'id': '1',
            'userId': 'user123',
            'name': 'Test Board',
            'type': 'custom',
            'choices': [],
            'createdAt': '2026-01-15T10:00:00Z',
            'updatedAt': '2026-01-15T10:00:00Z',
          }),
          201,
        );
      });

      final service = CommunicationService(client: mockClient);
      final board = await service.createChoiceBoard(
        userId: 'user123',
        name: 'Test Board',
        type: ChoiceBoardType.custom,
      );

      expect(board.name, 'Test Board');
      expect(board.type, ChoiceBoardType.custom);
    });

    test('recordSelection saves selection', () async {
      final mockClient = MockClient((request) async {
        expect(request.method, 'POST');
        expect(request.url.path, '/choice-selections');
        final body = json.decode(request.body);
        expect(body['boardId'], 'board1');

        return http.Response(
          json.encode({
            'id': '1',
            'userId': 'user123',
            'boardId': 'board1',
            'choiceIds': ['choice1'],
            'createdAt': '2026-01-15T10:00:00Z',
          }),
          201,
        );
      });

      final service = CommunicationService(client: mockClient);
      final selection = await service.recordSelection(
        userId: 'user123',
        boardId: 'board1',
        choiceIds: ['choice1'],
      );

      expect(selection.boardId, 'board1');
      expect(selection.choiceIds.length, 1);
    });
  });

  group('CommunicationService - Templates', () {
    test('getTemplates returns list of templates', () async {
      final mockClient = MockClient((request) async {
        return http.Response(
          json.encode([
            {
              'id': '1',
              'userId': 'user123',
              'name': 'Greeting Template',
              'category': 'greeting',
              'template': 'Hello {name}',
              'fields': [
                {
                  'id': 'name',
                  'label': 'Name',
                  'type': 'text',
                }
              ],
              'timesUsed': 0,
              'createdAt': '2026-01-15T10:00:00Z',
              'updatedAt': '2026-01-15T10:00:00Z',
            }
          ]),
          200,
        );
      });

      final service = CommunicationService(client: mockClient);
      final templates = await service.getTemplates('user123');

      expect(templates, isA<List<CommunicationTemplate>>());
      expect(templates.length, 1);
      expect(templates[0].category, TemplateCategory.greeting);
      expect(templates[0].fields.length, 1);
    });

    test('createTemplate creates new template', () async {
      final mockClient = MockClient((request) async {
        expect(request.method, 'POST');
        expect(request.url.path, '/templates');
        final body = json.decode(request.body);
        expect(body['name'], 'Test Template');
        expect(body['template'], 'Hello {name}');

        return http.Response(
          json.encode({
            'id': '1',
            'userId': 'user123',
            'name': 'Test Template',
            'category': 'greeting',
            'template': 'Hello {name}',
            'fields': [
              {
                'id': 'name',
                'label': 'Name',
                'type': 'text',
              }
            ],
            'timesUsed': 0,
            'createdAt': '2026-01-15T10:00:00Z',
            'updatedAt': '2026-01-15T10:00:00Z',
          }),
          201,
        );
      });

      final service = CommunicationService(client: mockClient);
      final template = await service.createTemplate(
        userId: 'user123',
        name: 'Test Template',
        category: TemplateCategory.greeting,
        template: 'Hello {name}',
        fields: [
          const TemplateField(id: 'name', label: 'Name', type: 'text'),
        ],
      );

      expect(template.name, 'Test Template');
      expect(template.template, 'Hello {name}');
    });

    test('composeMessage creates message from template', () async {
      final mockClient = MockClient((request) async {
        expect(request.method, 'POST');
        expect(request.url.path, '/template-messages');
        final body = json.decode(request.body);
        expect(body['templateId'], 'tmpl1');
        expect(body['fieldValues'], {'name': 'Alice'});

        return http.Response(
          json.encode({
            'id': '1',
            'userId': 'user123',
            'templateId': 'tmpl1',
            'fieldValues': {'name': 'Alice'},
            'composedMessage': 'Hello Alice',
            'createdAt': '2026-01-15T10:00:00Z',
          }),
          201,
        );
      });

      final service = CommunicationService(client: mockClient);
      final message = await service.composeMessage(
        userId: 'user123',
        templateId: 'tmpl1',
        fieldValues: {'name': 'Alice'},
      );

      expect(message.composedMessage, 'Hello Alice');
      expect(message.fieldValues['name'], 'Alice');
    });
  });
}
