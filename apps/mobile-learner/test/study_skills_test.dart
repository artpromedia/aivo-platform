import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_learner/features/study_skills/study_skills_models.dart';
import 'package:mobile_learner/features/study_skills/study_skills_service.dart';

void main() {
  group('Study Skills Models', () {
    group('NoteTemplate', () {
      test('should create NoteTemplate from JSON', () {
        final json = {
          'id': 'template-1',
          'name': 'Cornell Notes',
          'description': 'Cornell note-taking method',
          'type': 'cornell',
          'icon': 'notes',
          'structure': {
            'sections': ['cues', 'notes', 'summary'],
          },
          'prompts': ['What are the key concepts?'],
          'isCustom': false,
          'createdAt': '2024-01-15T10:00:00Z',
        };

        final template = NoteTemplate.fromJson(json);

        expect(template.id, 'template-1');
        expect(template.name, 'Cornell Notes');
        expect(template.type, NoteTemplateType.cornell);
        expect(template.prompts, ['What are the key concepts?']);
        expect(template.isCustom, false);
      });

      test('should convert NoteTemplate to JSON', () {
        final template = NoteTemplate(
          id: 'template-1',
          name: 'Cornell Notes',
          description: 'Cornell note-taking method',
          type: NoteTemplateType.cornell,
          icon: 'notes',
          structure: {'sections': ['cues', 'notes', 'summary']},
          prompts: ['What are the key concepts?'],
          isCustom: false,
          createdAt: DateTime.parse('2024-01-15T10:00:00Z'),
        );

        final json = template.toJson();

        expect(json['id'], 'template-1');
        expect(json['name'], 'Cornell Notes');
        expect(json['type'], 'cornell');
      });
    });

    group('Note', () {
      test('should create Note from JSON', () {
        final json = {
          'id': 'note-1',
          'templateId': 'template-1',
          'title': 'Physics Lecture',
          'subject': 'Physics',
          'content': {'notes': 'Force = mass * acceleration'},
          'createdAt': '2024-01-15T10:00:00Z',
          'lastModifiedAt': '2024-01-15T12:00:00Z',
          'tags': ['physics', 'mechanics'],
          'isFavorite': true,
        };

        final note = Note.fromJson(json);

        expect(note.id, 'note-1');
        expect(note.title, 'Physics Lecture');
        expect(note.subject, 'Physics');
        expect(note.tags, ['physics', 'mechanics']);
        expect(note.isFavorite, true);
      });
    });

    group('StudyGuide', () {
      test('should create StudyGuide from JSON', () {
        final json = {
          'id': 'guide-1',
          'title': 'Algebra Fundamentals',
          'subject': 'Math',
          'description': 'Learn basic algebra concepts',
          'keyTerms': [
            {
              'term': 'Variable',
              'definition': 'A symbol representing an unknown value',
              'examples': ['x', 'y', 'n'],
            }
          ],
          'practiceQuestions': [
            {
              'id': 'q1',
              'question': 'Solve for x: 2x + 5 = 11',
              'options': ['2', '3', '4', '5'],
              'correctAnswer': 1,
              'explanation': 'Subtract 5, then divide by 2',
            }
          ],
          'resources': [],
          'createdAt': '2024-01-15T10:00:00Z',
          'progress': 0.5,
        };

        final guide = StudyGuide.fromJson(json);

        expect(guide.id, 'guide-1');
        expect(guide.title, 'Algebra Fundamentals');
        expect(guide.keyTerms.length, 1);
        expect(guide.practiceQuestions.length, 1);
        expect(guide.progress, 0.5);
      });
    });

    group('MemoryTechnique', () {
      test('should create MemoryTechnique from JSON', () {
        final json = {
          'id': 'technique-1',
          'name': 'Spaced Repetition',
          'description': 'Review material at increasing intervals',
          'type': 'spaced_repetition',
          'icon': 'schedule',
          'steps': [
            'Review immediately after learning',
            'Review again after 1 day',
            'Review after 3 days',
          ],
          'benefits': [
            'Long-term retention',
            'Efficient use of time',
          ],
          'exampleUse': 'Use for vocabulary learning',
        };

        final technique = MemoryTechnique.fromJson(json);

        expect(technique.id, 'technique-1');
        expect(technique.name, 'Spaced Repetition');
        expect(technique.type, MemoryTechniqueType.spacedRepetition);
        expect(technique.steps.length, 3);
        expect(technique.benefits.length, 2);
      });
    });

    group('MemoryCard', () {
      test('should create MemoryCard from JSON', () {
        final json = {
          'id': 'card-1',
          'front': 'What is photosynthesis?',
          'back': 'The process by which plants convert sunlight to energy',
          'subject': 'Biology',
          'tags': ['plants', 'energy'],
          'nextReviewDate': '2024-01-20T10:00:00Z',
          'interval': 5,
          'easeFactor': 2.5,
          'repetitions': 3,
          'createdAt': '2024-01-10T10:00:00Z',
        };

        final card = MemoryCard.fromJson(json);

        expect(card.id, 'card-1');
        expect(card.front, 'What is photosynthesis?');
        expect(card.interval, 5);
        expect(card.easeFactor, 2.5);
        expect(card.repetitions, 3);
      });

      test('should check if card is due for review', () {
        final cardDue = MemoryCard(
          id: 'card-1',
          front: 'Question',
          back: 'Answer',
          subject: 'Test',
          tags: [],
          nextReviewDate: DateTime.now().subtract(Duration(days: 1)),
          interval: 1,
          easeFactor: 2.5,
          repetitions: 1,
          createdAt: DateTime.now(),
        );

        final cardNotDue = MemoryCard(
          id: 'card-2',
          front: 'Question',
          back: 'Answer',
          subject: 'Test',
          tags: [],
          nextReviewDate: DateTime.now().add(Duration(days: 1)),
          interval: 1,
          easeFactor: 2.5,
          repetitions: 1,
          createdAt: DateTime.now(),
        );

        expect(cardDue.isDue, true);
        expect(cardNotDue.isDue, false);
      });
    });

    group('TestPrepPlan', () {
      test('should create TestPrepPlan from JSON', () {
        final json = {
          'id': 'plan-1',
          'title': 'Math Final Exam',
          'subject': 'Math',
          'testDate': '2024-02-15T09:00:00Z',
          'topics': ['Algebra', 'Geometry', 'Calculus'],
          'studySessions': [
            {
              'id': 'session-1',
              'date': '2024-02-01T14:00:00Z',
              'topic': 'Algebra Review',
              'durationMinutes': 60,
              'completed': true,
              'notes': 'Focused on quadratic equations',
            }
          ],
          'practiceTests': [
            {
              'id': 'test-1',
              'title': 'Practice Test 1',
              'questions': 50,
              'timeLimit': 90,
              'completedAt': '2024-02-05T10:00:00Z',
              'score': 85.0,
            }
          ],
          'createdAt': '2024-01-20T10:00:00Z',
        };

        final plan = TestPrepPlan.fromJson(json);

        expect(plan.id, 'plan-1');
        expect(plan.title, 'Math Final Exam');
        expect(plan.topics.length, 3);
        expect(plan.studySessions.length, 1);
        expect(plan.practiceTests.length, 1);
      });

      test('should calculate days until test', () {
        final plan = TestPrepPlan(
          id: 'plan-1',
          title: 'Test',
          subject: 'Subject',
          testDate: DateTime.now().add(Duration(days: 10)),
          topics: [],
          studySessions: [],
          practiceTests: [],
          createdAt: DateTime.now(),
        );

        expect(plan.daysUntilTest, 10);
      });

      test('should calculate completion percentage', () {
        final plan = TestPrepPlan(
          id: 'plan-1',
          title: 'Test',
          subject: 'Subject',
          testDate: DateTime.now(),
          topics: [],
          studySessions: [
            StudySession(
              id: 's1',
              date: DateTime.now(),
              topic: 'Topic 1',
              durationMinutes: 60,
              completed: true,
            ),
            StudySession(
              id: 's2',
              date: DateTime.now(),
              topic: 'Topic 2',
              durationMinutes: 60,
              completed: false,
            ),
          ],
          practiceTests: [],
          createdAt: DateTime.now(),
        );

        expect(plan.completionPercentage, 0.5);
      });
    });
  });

  group('Study Skills Service', () {
    late StudySkillsService service;

    setUp(() {
      service = StudySkillsService(accessToken: 'test-token');
    });

    test('should get note templates', () async {
      final templates = await service.getNoteTemplates();

      expect(templates, isNotEmpty);
      expect(templates.first.name, isNotNull);
    });

    test('should get memory techniques', () async {
      final techniques = await service.getMemoryTechniques();

      expect(techniques, isNotEmpty);
      expect(techniques.first.name, isNotNull);
    });

    test('should get memory cards for subject', () async {
      final cards = await service.getMemoryCards(subject: 'Biology');

      expect(cards, isNotEmpty);
      expect(cards.first.subject, 'Biology');
    });

    test('should get test prep plans', () async {
      final plans = await service.getTestPrepPlans();

      expect(plans, isNotEmpty);
      expect(plans.first.title, isNotNull);
    });
  });
}
