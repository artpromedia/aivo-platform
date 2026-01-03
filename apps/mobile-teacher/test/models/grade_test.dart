import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_teacher/models/grade.dart';

void main() {
  group('GradeScale', () {
    test('standard scale has correct entries', () {
      final scale = GradeScale.standard;

      expect(scale.id, 'standard');
      expect(scale.entries.length, 13);
      expect(scale.entries.first.letter, 'A+');
      expect(scale.entries.last.letter, 'F');
    });

    test('getLetterGrade returns correct grade', () {
      final scale = GradeScale.standard;

      expect(scale.getLetterGrade(100), 'A+');
      expect(scale.getLetterGrade(95), 'A');
      expect(scale.getLetterGrade(91), 'A-');
      expect(scale.getLetterGrade(88), 'B+');
      expect(scale.getLetterGrade(85), 'B');
      expect(scale.getLetterGrade(75), 'C');
      expect(scale.getLetterGrade(65), 'D');
      expect(scale.getLetterGrade(50), 'F');
    });

    test('getGpaValue returns correct GPA', () {
      final scale = GradeScale.standard;

      expect(scale.getGpaValue(95), 4.0);
      expect(scale.getGpaValue(91), 3.7);
      expect(scale.getGpaValue(85), 3.0);
      expect(scale.getGpaValue(75), 2.0);
      expect(scale.getGpaValue(50), 0.0);
    });

    test('fromJson creates valid scale', () {
      final json = {
        'id': 'custom',
        'name': 'Custom Scale',
        'isDefault': false,
        'entries': [
          {'letter': 'Pass', 'minPercent': 70.0, 'maxPercent': 100.0},
          {'letter': 'Fail', 'minPercent': 0.0, 'maxPercent': 69.99},
        ],
      };

      final scale = GradeScale.fromJson(json);

      expect(scale.id, 'custom');
      expect(scale.entries.length, 2);
      expect(scale.getLetterGrade(80), 'Pass');
      expect(scale.getLetterGrade(60), 'Fail');
    });
  });

  group('GradeEntry', () {
    test('fromJson creates valid entry', () {
      final json = {
        'id': 'g1',
        'studentId': 'st1',
        'assignmentId': 'a1',
        'studentName': 'Jane Doe',
        'assignmentTitle': 'Quiz 1',
        'pointsEarned': 45.0,
        'pointsPossible': 50.0,
        'letterGrade': 'A',
        'percent': 90.0,
        'isExcused': false,
        'isMissing': false,
        'isLate': false,
      };

      final entry = GradeEntry.fromJson(json);

      expect(entry.id, 'g1');
      expect(entry.studentName, 'Jane Doe');
      expect(entry.pointsEarned, 45.0);
      expect(entry.percent, 90.0);
      expect(entry.hasGrade, true);
    });

    test('hasGrade returns true when excused', () {
      final entry = GradeEntry(
        id: 'g1',
        studentId: 'st1',
        assignmentId: 'a1',
        isExcused: true,
      );

      expect(entry.hasGrade, true);
    });

    test('hasGrade returns false when no points and not excused', () {
      final entry = GradeEntry(
        id: 'g1',
        studentId: 'st1',
        assignmentId: 'a1',
        isExcused: false,
      );

      expect(entry.hasGrade, false);
    });

    test('copyWith creates modified copy', () {
      final original = GradeEntry(
        id: 'g1',
        studentId: 'st1',
        assignmentId: 'a1',
        pointsEarned: 80.0,
      );

      final modified = original.copyWith(
        pointsEarned: 90.0,
        feedback: 'Great work!',
      );

      expect(modified.pointsEarned, 90.0);
      expect(modified.feedback, 'Great work!');
      expect(original.pointsEarned, 80.0);
      expect(original.feedback, null);
    });
  });

  group('StudentGrade', () {
    test('fromJson creates valid student grade', () {
      final json = {
        'studentId': 'st1',
        'classId': 'c1',
        'studentName': 'John Smith',
        'totalPoints': 450.0,
        'possiblePoints': 500.0,
        'percent': 90.0,
        'letterGrade': 'A-',
        'gpa': 3.7,
        'assignmentsGraded': 9,
        'assignmentsTotal': 10,
        'categoryGrades': {
          'cat1': {
            'categoryId': 'cat1',
            'categoryName': 'Homework',
            'percent': 95.0,
          },
        },
      };

      final grade = StudentGrade.fromJson(json);

      expect(grade.studentId, 'st1');
      expect(grade.percent, 90.0);
      expect(grade.assignmentsMissing, 1);
      expect(grade.categoryGrades['cat1']?.categoryName, 'Homework');
    });
  });

  group('Gradebook', () {
    test('fromJson creates valid gradebook', () {
      final json = {
        'classId': 'c1',
        'className': 'Math 101',
        'gradeScale': {
          'id': 'standard',
          'name': 'Standard',
          'entries': [
            {'letter': 'A', 'minPercent': 90.0, 'maxPercent': 100.0},
          ],
        },
        'students': [
          {'id': 'st1', 'name': 'Student 1'},
        ],
        'assignments': [
          {'id': 'a1', 'title': 'Assignment 1', 'pointsPossible': 100.0},
        ],
        'grades': {
          'st1': {
            'a1': {
              'id': 'g1',
              'studentId': 'st1',
              'assignmentId': 'a1',
              'pointsEarned': 90.0,
            },
          },
        },
        'categories': [],
      };

      final gradebook = Gradebook.fromJson(json);

      expect(gradebook.classId, 'c1');
      expect(gradebook.className, 'Math 101');
      expect(gradebook.students.length, 1);
      expect(gradebook.assignments.length, 1);
      expect(gradebook.getGrade('st1', 'a1')?.pointsEarned, 90.0);
    });

    test('getGrade returns null for non-existent grade', () {
      final gradebook = Gradebook(
        classId: 'c1',
        className: 'Test',
        gradeScale: GradeScale.standard,
        students: [],
        assignments: [],
        grades: {},
        categories: [],
      );

      expect(gradebook.getGrade('unknown', 'unknown'), null);
    });
  });

  group('GradeTrend', () {
    test('isImproving returns correct value', () {
      final improving = GradeTrend(direction: 'up', changePercent: 5.0);
      final declining = GradeTrend(direction: 'down', changePercent: -5.0);
      final stable = GradeTrend(direction: 'stable');

      expect(improving.isImproving, true);
      expect(improving.isDeclining, false);
      expect(declining.isDeclining, true);
      expect(stable.isStable, true);
    });
  });

  group('BulkGradeDto', () {
    test('toJson produces valid JSON', () {
      final dto = BulkGradeDto(
        grades: [
          BulkGradeEntry(
            studentId: 'st1',
            assignmentId: 'a1',
            pointsEarned: 90.0,
          ),
          BulkGradeEntry(
            studentId: 'st2',
            assignmentId: 'a1',
            pointsEarned: 85.0,
            isExcused: false,
          ),
        ],
      );

      final json = dto.toJson();
      final grades = json['grades'] as List;

      expect(grades.length, 2);
      expect(grades[0]['studentId'], 'st1');
      expect(grades[0]['pointsEarned'], 90.0);
    });
  });
}
