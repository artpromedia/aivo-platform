import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_teacher/models/assignment.dart';

void main() {
  group('Assignment', () {
    test('fromJson creates valid Assignment', () {
      final json = {
        'id': 'a1',
        'classId': 'c1',
        'title': 'Math Homework',
        'description': 'Complete problems 1-10',
        'status': 'published',
        'assignmentType': 'homework',
        'pointsPossible': 100.0,
        'weight': 1.0,
        'dueAt': '2024-12-15T23:59:59Z',
        'submissionCount': 25,
        'gradedCount': 20,
        'studentCount': 30,
      };

      final assignment = Assignment.fromJson(json);

      expect(assignment.id, 'a1');
      expect(assignment.classId, 'c1');
      expect(assignment.title, 'Math Homework');
      expect(assignment.status, AssignmentStatus.published);
      expect(assignment.assignmentType, AssignmentType.homework);
      expect(assignment.pointsPossible, 100.0);
      expect(assignment.submissionCount, 25);
      expect(assignment.gradedCount, 20);
      expect(assignment.ungradedCount, 5);
    });

    test('toJson produces valid JSON', () {
      final assignment = Assignment(
        id: 'a1',
        classId: 'c1',
        title: 'Quiz 1',
        status: AssignmentStatus.draft,
        assignmentType: AssignmentType.quiz,
        pointsPossible: 50.0,
      );

      final json = assignment.toJson();

      expect(json['id'], 'a1');
      expect(json['title'], 'Quiz 1');
      expect(json['status'], 'draft');
      expect(json['assignmentType'], 'quiz');
      expect(json['pointsPossible'], 50.0);
    });

    test('isPublished returns correct value', () {
      final draft = Assignment(
        id: 'a1',
        classId: 'c1',
        title: 'Draft',
        status: AssignmentStatus.draft,
        assignmentType: AssignmentType.homework,
      );
      final published = Assignment(
        id: 'a2',
        classId: 'c1',
        title: 'Published',
        status: AssignmentStatus.published,
        assignmentType: AssignmentType.homework,
      );

      expect(draft.isPublished, false);
      expect(draft.isDraft, true);
      expect(published.isPublished, true);
      expect(published.isDraft, false);
    });

    test('isPastDue returns correct value', () {
      final pastDue = Assignment(
        id: 'a1',
        classId: 'c1',
        title: 'Past Due',
        status: AssignmentStatus.published,
        assignmentType: AssignmentType.homework,
        dueAt: DateTime.now().subtract(const Duration(days: 1)),
      );
      final upcoming = Assignment(
        id: 'a2',
        classId: 'c1',
        title: 'Upcoming',
        status: AssignmentStatus.published,
        assignmentType: AssignmentType.homework,
        dueAt: DateTime.now().add(const Duration(days: 1)),
      );
      final noDue = Assignment(
        id: 'a3',
        classId: 'c1',
        title: 'No Due Date',
        status: AssignmentStatus.published,
        assignmentType: AssignmentType.homework,
      );

      expect(pastDue.isPastDue, true);
      expect(upcoming.isPastDue, false);
      expect(noDue.isPastDue, false);
    });

    test('completionRate calculates correctly', () {
      final assignment = Assignment(
        id: 'a1',
        classId: 'c1',
        title: 'Test',
        status: AssignmentStatus.published,
        assignmentType: AssignmentType.test,
        submissionCount: 15,
        studentCount: 30,
      );

      expect(assignment.completionRate, 0.5);
    });

    test('copyWith creates modified copy', () {
      final original = Assignment(
        id: 'a1',
        classId: 'c1',
        title: 'Original',
        status: AssignmentStatus.draft,
        assignmentType: AssignmentType.homework,
      );

      final modified = original.copyWith(
        title: 'Modified',
        status: AssignmentStatus.published,
      );

      expect(modified.id, 'a1');
      expect(modified.title, 'Modified');
      expect(modified.status, AssignmentStatus.published);
      expect(original.title, 'Original');
      expect(original.status, AssignmentStatus.draft);
    });
  });

  group('Submission', () {
    test('fromJson creates valid Submission', () {
      final json = {
        'id': 's1',
        'assignmentId': 'a1',
        'studentId': 'st1',
        'studentName': 'John Doe',
        'status': 'graded',
        'pointsEarned': 85.0,
        'isLate': false,
        'isExcused': false,
      };

      final submission = Submission.fromJson(json);

      expect(submission.id, 's1');
      expect(submission.studentName, 'John Doe');
      expect(submission.status, SubmissionStatus.graded);
      expect(submission.pointsEarned, 85.0);
      expect(submission.isGraded, true);
    });

    test('finalPoints applies late penalty', () {
      final submission = Submission(
        id: 's1',
        assignmentId: 'a1',
        studentId: 'st1',
        status: SubmissionStatus.graded,
        pointsEarned: 100.0,
        latePenalty: 10.0,
        isLate: true,
      );

      expect(submission.finalPoints, 90.0);
    });

    test('finalPoints returns null when excused', () {
      final submission = Submission(
        id: 's1',
        assignmentId: 'a1',
        studentId: 'st1',
        status: SubmissionStatus.excused,
        pointsEarned: 100.0,
        isExcused: true,
      );

      expect(submission.finalPoints, null);
    });
  });

  group('AssignmentCategory', () {
    test('fromJson creates valid category', () {
      final json = {
        'id': 'cat1',
        'classId': 'c1',
        'name': 'Homework',
        'weight': 0.3,
        'dropLowest': 2,
        'color': '#FF5722',
      };

      final category = AssignmentCategory.fromJson(json);

      expect(category.id, 'cat1');
      expect(category.name, 'Homework');
      expect(category.weight, 0.3);
      expect(category.dropLowest, 2);
    });
  });

  group('CreateAssignmentDto', () {
    test('toJson produces valid JSON', () {
      final dto = CreateAssignmentDto(
        classId: 'c1',
        title: 'New Assignment',
        assignmentType: AssignmentType.project,
        description: 'Build something cool',
        pointsPossible: 200,
        dueAt: DateTime(2024, 12, 31, 23, 59),
        publishImmediately: true,
      );

      final json = dto.toJson();

      expect(json['classId'], 'c1');
      expect(json['title'], 'New Assignment');
      expect(json['assignmentType'], 'project');
      expect(json['pointsPossible'], 200);
      expect(json['publishImmediately'], true);
    });
  });
}
