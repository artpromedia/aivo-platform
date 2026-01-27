import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../config/environment.dart';
import 'study_skills_models.dart';

/// Study Skills Service
///
/// Provides API access for note-taking, study guides, memory techniques, and test prep.
class StudySkillsService {
  final String _accessToken;
  final String _baseUrl;

  StudySkillsService({
    required String accessToken,
  })  : _accessToken = accessToken,
        _baseUrl = EnvironmentConfig.studySkillsBaseUrl;

  Map<String, String> get _headers => {
        'Authorization': 'Bearer $_accessToken',
        'Content-Type': 'application/json',
      };

  // ==================== NOTE TEMPLATES ====================

  /// Get all note templates for a user.
  Future<List<NoteTemplate>> getNoteTemplates(String userId) async {
    if (EnvironmentConfig.useStudySkillsMock) {
      return _mockNoteTemplates;
    }

    final response = await http.get(
      Uri.parse('$_baseUrl/note-templates?userId=$userId'),
      headers: _headers,
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to fetch note templates');
    }

    final List<dynamic> data = json.decode(response.body);
    return data.map((e) => NoteTemplate.fromJson(e)).toList();
  }

  /// Create a new note template.
  Future<NoteTemplate> createNoteTemplate({
    required String userId,
    required String name,
    required NoteTemplateType type,
    String? description,
  }) async {
    if (EnvironmentConfig.useStudySkillsMock) {
      return NoteTemplate(
        id: 'new-${DateTime.now().millisecondsSinceEpoch}',
        userId: userId,
        name: name,
        description: description,
        type: type,
        sections: [],
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
        tags: [],
      );
    }

    final response = await http.post(
      Uri.parse('$_baseUrl/note-templates'),
      headers: _headers,
      body: json.encode({
        'userId': userId,
        'name': name,
        'type': type.name,
        if (description != null) 'description': description,
      }),
    );

    if (response.statusCode != 201) {
      throw Exception('Failed to create note template');
    }

    return NoteTemplate.fromJson(json.decode(response.body));
  }

  /// Delete a note template.
  Future<void> deleteNoteTemplate(String templateId) async {
    if (EnvironmentConfig.useStudySkillsMock) return;

    final response = await http.delete(
      Uri.parse('$_baseUrl/note-templates/$templateId'),
      headers: _headers,
    );

    if (response.statusCode != 204) {
      throw Exception('Failed to delete note template');
    }
  }

  // ==================== NOTES ====================

  /// Get all notes for a user.
  Future<List<Note>> getNotes(String userId) async {
    if (EnvironmentConfig.useStudySkillsMock) {
      return _mockNotes;
    }

    final response = await http.get(
      Uri.parse('$_baseUrl/notes?userId=$userId'),
      headers: _headers,
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to fetch notes');
    }

    final List<dynamic> data = json.decode(response.body);
    return data.map((e) => Note.fromJson(e)).toList();
  }

  /// Create a new note.
  Future<Note> createNote({
    required String userId,
    required String subject,
    required String title,
    String? templateId,
  }) async {
    if (EnvironmentConfig.useStudySkillsMock) {
      return Note(
        id: 'note-${DateTime.now().millisecondsSinceEpoch}',
        userId: userId,
        templateId: templateId,
        subject: subject,
        title: title,
        sections: [
          NoteSection(
            id: 'sec-1',
            title: 'Main Notes',
            type: NoteSectionType.paragraph,
            content: '',
            order: 0,
          ),
        ],
        lastEdited: DateTime.now(),
        wordCount: 0,
        tags: [],
      );
    }

    final response = await http.post(
      Uri.parse('$_baseUrl/notes'),
      headers: _headers,
      body: json.encode({
        'userId': userId,
        'subject': subject,
        'title': title,
        if (templateId != null) 'templateId': templateId,
      }),
    );

    if (response.statusCode != 201) {
      throw Exception('Failed to create note');
    }

    return Note.fromJson(json.decode(response.body));
  }

  /// Update a note.
  Future<Note> updateNote(String noteId, List<NoteSection> sections) async {
    if (EnvironmentConfig.useStudySkillsMock) {
      throw UnimplementedError('Mock update not implemented');
    }

    final response = await http.put(
      Uri.parse('$_baseUrl/notes/$noteId'),
      headers: _headers,
      body: json.encode({
        'sections': sections.map((s) => s.toJson()).toList(),
      }),
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to update note');
    }

    return Note.fromJson(json.decode(response.body));
  }

  /// Delete a note.
  Future<void> deleteNote(String noteId) async {
    if (EnvironmentConfig.useStudySkillsMock) return;

    final response = await http.delete(
      Uri.parse('$_baseUrl/notes/$noteId'),
      headers: _headers,
    );

    if (response.statusCode != 204) {
      throw Exception('Failed to delete note');
    }
  }

  // ==================== STUDY GUIDES ====================

  /// Get all study guides for a user.
  Future<List<StudyGuide>> getStudyGuides(String userId) async {
    if (EnvironmentConfig.useStudySkillsMock) {
      return _mockStudyGuides;
    }

    final response = await http.get(
      Uri.parse('$_baseUrl/study-guides?userId=$userId'),
      headers: _headers,
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to fetch study guides');
    }

    final List<dynamic> data = json.decode(response.body);
    return data.map((e) => StudyGuide.fromJson(e)).toList();
  }

  /// Create a study guide.
  Future<StudyGuide> createStudyGuide({
    required String userId,
    required String subject,
    required String topic,
    String? description,
  }) async {
    if (EnvironmentConfig.useStudySkillsMock) {
      return StudyGuide(
        id: 'guide-${DateTime.now().millisecondsSinceEpoch}',
        userId: userId,
        subject: subject,
        topic: topic,
        description: description,
        sections: [],
        keyTerms: [],
        practiceQuestions: [],
        estimatedStudyTime: 30,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
        tags: [],
      );
    }

    final response = await http.post(
      Uri.parse('$_baseUrl/study-guides'),
      headers: _headers,
      body: json.encode({
        'userId': userId,
        'subject': subject,
        'topic': topic,
        if (description != null) 'description': description,
      }),
    );

    if (response.statusCode != 201) {
      throw Exception('Failed to create study guide');
    }

    return StudyGuide.fromJson(json.decode(response.body));
  }

  /// Delete a study guide.
  Future<void> deleteStudyGuide(String guideId) async {
    if (EnvironmentConfig.useStudySkillsMock) return;

    final response = await http.delete(
      Uri.parse('$_baseUrl/study-guides/$guideId'),
      headers: _headers,
    );

    if (response.statusCode != 204) {
      throw Exception('Failed to delete study guide');
    }
  }

  // ==================== MEMORY TECHNIQUES ====================

  /// Get all memory techniques for a user.
  Future<List<MemoryTechnique>> getMemoryTechniques(String userId) async {
    if (EnvironmentConfig.useStudySkillsMock) {
      return _mockMemoryTechniques;
    }

    final response = await http.get(
      Uri.parse('$_baseUrl/memory-techniques?userId=$userId'),
      headers: _headers,
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to fetch memory techniques');
    }

    final List<dynamic> data = json.decode(response.body);
    return data.map((e) => MemoryTechnique.fromJson(e)).toList();
  }

  /// Get all memory cards for a user, optionally filtered by deck.
  Future<List<MemoryCard>> getMemoryCards(String userId, {String? deck}) async {
    if (EnvironmentConfig.useStudySkillsMock) {
      return _mockMemoryCards;
    }

    final uri = deck != null
        ? Uri.parse('$_baseUrl/memory-cards?userId=$userId&deck=$deck')
        : Uri.parse('$_baseUrl/memory-cards?userId=$userId');

    final response = await http.get(uri, headers: _headers);

    if (response.statusCode != 200) {
      throw Exception('Failed to fetch memory cards');
    }

    final List<dynamic> data = json.decode(response.body);
    return data.map((e) => MemoryCard.fromJson(e)).toList();
  }

  /// Create a memory card.
  Future<MemoryCard> createMemoryCard({
    required String userId,
    required String front,
    required String back,
    required String subject,
    required String deck,
    String? techniqueId,
  }) async {
    if (EnvironmentConfig.useStudySkillsMock) {
      return MemoryCard(
        id: 'card-${DateTime.now().millisecondsSinceEpoch}',
        userId: userId,
        techniqueId: techniqueId,
        front: front,
        back: back,
        subject: subject,
        deck: deck,
        correctCount: 0,
        incorrectCount: 0,
        difficulty: MemoryCardDifficulty.medium,
      );
    }

    final response = await http.post(
      Uri.parse('$_baseUrl/memory-cards'),
      headers: _headers,
      body: json.encode({
        'userId': userId,
        'front': front,
        'back': back,
        'subject': subject,
        'deck': deck,
        if (techniqueId != null) 'techniqueId': techniqueId,
      }),
    );

    if (response.statusCode != 201) {
      throw Exception('Failed to create memory card');
    }

    return MemoryCard.fromJson(json.decode(response.body));
  }

  /// Review a memory card.
  Future<MemoryCard> reviewMemoryCard(String cardId, bool correct) async {
    if (EnvironmentConfig.useStudySkillsMock) {
      throw UnimplementedError('Mock review not implemented');
    }

    final response = await http.post(
      Uri.parse('$_baseUrl/memory-cards/$cardId/review'),
      headers: _headers,
      body: json.encode({'correct': correct}),
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to review memory card');
    }

    return MemoryCard.fromJson(json.decode(response.body));
  }

  // ==================== TEST PREP ====================

  /// Get all test prep plans for a user.
  Future<List<TestPrepPlan>> getTestPrepPlans(String userId) async {
    if (EnvironmentConfig.useStudySkillsMock) {
      return _mockTestPrepPlans;
    }

    final response = await http.get(
      Uri.parse('$_baseUrl/test-prep-plans?userId=$userId'),
      headers: _headers,
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to fetch test prep plans');
    }

    final List<dynamic> data = json.decode(response.body);
    return data.map((e) => TestPrepPlan.fromJson(e)).toList();
  }

  /// Create a test prep plan.
  Future<TestPrepPlan> createTestPrepPlan({
    required String userId,
    required String testName,
    required DateTime testDate,
    required String subject,
    String? description,
  }) async {
    if (EnvironmentConfig.useStudySkillsMock) {
      return TestPrepPlan(
        id: 'plan-${DateTime.now().millisecondsSinceEpoch}',
        userId: userId,
        testName: testName,
        testDate: testDate,
        subject: subject,
        description: description,
        studySessions: [],
        topics: [],
        progress: 0,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );
    }

    final response = await http.post(
      Uri.parse('$_baseUrl/test-prep-plans'),
      headers: _headers,
      body: json.encode({
        'userId': userId,
        'testName': testName,
        'testDate': testDate.toIso8601String().split('T')[0],
        'subject': subject,
        if (description != null) 'description': description,
      }),
    );

    if (response.statusCode != 201) {
      throw Exception('Failed to create test prep plan');
    }

    return TestPrepPlan.fromJson(json.decode(response.body));
  }

  /// Complete a study session.
  Future<TestPrepPlan> completeStudySession(
      String planId, String sessionId) async {
    if (EnvironmentConfig.useStudySkillsMock) {
      throw UnimplementedError('Mock complete not implemented');
    }

    final response = await http.post(
      Uri.parse('$_baseUrl/test-prep-plans/$planId/sessions/$sessionId/complete'),
      headers: _headers,
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to complete study session');
    }

    return TestPrepPlan.fromJson(json.decode(response.body));
  }

  /// Get all practice tests for a user.
  Future<List<PracticeTest>> getPracticeTests(String userId) async {
    if (EnvironmentConfig.useStudySkillsMock) {
      return _mockPracticeTests;
    }

    final response = await http.get(
      Uri.parse('$_baseUrl/practice-tests?userId=$userId'),
      headers: _headers,
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to fetch practice tests');
    }

    final List<dynamic> data = json.decode(response.body);
    return data.map((e) => PracticeTest.fromJson(e)).toList();
  }

  // ==================== MOCK DATA ====================

  static final List<NoteTemplate> _mockNoteTemplates = [
    NoteTemplate(
      id: 'template-1',
      userId: 'user123',
      name: 'Cornell Notes',
      description: 'The classic Cornell note-taking method',
      type: NoteTemplateType.cornell,
      sections: [
        NoteSection(
          id: 'sec-1',
          title: 'Cues',
          type: NoteSectionType.bulletList,
          content: '',
          order: 0,
        ),
        NoteSection(
          id: 'sec-2',
          title: 'Notes',
          type: NoteSectionType.paragraph,
          content: '',
          order: 1,
        ),
        NoteSection(
          id: 'sec-3',
          title: 'Summary',
          type: NoteSectionType.paragraph,
          content: '',
          order: 2,
        ),
      ],
      createdAt: DateTime.now().subtract(const Duration(days: 30)),
      updatedAt: DateTime.now().subtract(const Duration(days: 5)),
      tags: ['default', 'popular'],
    ),
    NoteTemplate(
      id: 'template-2',
      userId: 'user123',
      name: 'Mind Map',
      description: 'Visual mind mapping template',
      type: NoteTemplateType.mindMap,
      sections: [
        NoteSection(
          id: 'sec-1',
          title: 'Central Idea',
          type: NoteSectionType.heading,
          content: '',
          order: 0,
        ),
        NoteSection(
          id: 'sec-2',
          title: 'Branches',
          type: NoteSectionType.bulletList,
          content: '',
          order: 1,
        ),
      ],
      createdAt: DateTime.now().subtract(const Duration(days: 20)),
      updatedAt: DateTime.now().subtract(const Duration(days: 3)),
      tags: ['visual', 'creative'],
    ),
    NoteTemplate(
      id: 'template-3',
      userId: 'user123',
      name: 'Outline',
      description: 'Hierarchical outline format',
      type: NoteTemplateType.outline,
      sections: [
        NoteSection(
          id: 'sec-1',
          title: 'I. Main Topic',
          type: NoteSectionType.numberedList,
          content: '',
          order: 0,
        ),
      ],
      createdAt: DateTime.now().subtract(const Duration(days: 15)),
      updatedAt: DateTime.now().subtract(const Duration(days: 1)),
      tags: ['structured'],
    ),
  ];

  static final List<Note> _mockNotes = [
    Note(
      id: 'note-1',
      userId: 'user123',
      templateId: 'template-1',
      subject: 'History',
      title: 'World War II Overview',
      sections: [
        NoteSection(
          id: 'sec-1',
          title: 'Cues',
          type: NoteSectionType.bulletList,
          content: '• 1939-1945\n• Allied vs Axis\n• Major battles',
          order: 0,
        ),
        NoteSection(
          id: 'sec-2',
          title: 'Notes',
          type: NoteSectionType.paragraph,
          content: 'World War II was a global conflict that lasted from 1939 to 1945...',
          order: 1,
        ),
      ],
      lastEdited: DateTime.now().subtract(const Duration(hours: 2)),
      wordCount: 156,
      tags: ['history', 'wwii'],
    ),
    Note(
      id: 'note-2',
      userId: 'user123',
      templateId: 'template-3',
      subject: 'Science',
      title: 'Photosynthesis',
      sections: [
        NoteSection(
          id: 'sec-1',
          title: 'Main Points',
          type: NoteSectionType.numberedList,
          content:
              '1. Light reaction\n2. Dark reaction\n3. Chlorophyll importance',
          order: 0,
        ),
      ],
      lastEdited: DateTime.now().subtract(const Duration(days: 1)),
      wordCount: 89,
      tags: ['science', 'biology'],
    ),
  ];

  static final List<StudyGuide> _mockStudyGuides = [
    StudyGuide(
      id: 'guide-1',
      userId: 'user123',
      subject: 'Math',
      topic: 'Algebra Basics',
      description: 'Introduction to algebraic expressions and equations',
      sections: [
        StudyGuideSection(
          id: 'sec-1',
          title: 'Overview',
          type: StudyGuideSectionType.overview,
          content: 'Learn the fundamentals of algebra...',
          order: 0,
        ),
      ],
      keyTerms: [
        KeyTerm(
          id: 'term-1',
          term: 'Variable',
          definition: 'A symbol representing an unknown value',
          examples: ['x', 'y', 'n'],
        ),
        KeyTerm(
          id: 'term-2',
          term: 'Expression',
          definition: 'A combination of numbers, variables, and operations',
          examples: ['2x + 3', '5y - 7'],
        ),
      ],
      practiceQuestions: [
        PracticeQuestion(
          id: 'q-1',
          question: 'Solve for x: 2x + 5 = 13',
          type: QuestionType.shortAnswer,
          correctAnswer: '4',
          explanation: 'Subtract 5 from both sides, then divide by 2',
          difficulty: QuestionDifficulty.easy,
        ),
      ],
      estimatedStudyTime: 45,
      createdAt: DateTime.now().subtract(const Duration(days: 7)),
      updatedAt: DateTime.now().subtract(const Duration(days: 2)),
      tags: ['math', 'algebra'],
    ),
  ];

  static final List<MemoryTechnique> _mockMemoryTechniques = [
    MemoryTechnique(
      id: 'tech-1',
      userId: 'user123',
      name: 'Acronym Method',
      type: MemoryTechniqueType.mnemonic,
      description: 'Create acronyms from first letters of items to remember',
      steps: [
        'List all items you need to remember',
        'Take the first letter of each item',
        'Arrange letters into a memorable word or phrase',
        'Practice recalling the full items from the acronym',
      ],
      examples: ['HOMES for Great Lakes', 'ROY G BIV for rainbow colors'],
      effectiveness: 4,
      timesUsed: 12,
      createdAt: DateTime.now().subtract(const Duration(days: 30)),
      updatedAt: DateTime.now().subtract(const Duration(days: 5)),
    ),
    MemoryTechnique(
      id: 'tech-2',
      userId: 'user123',
      name: 'Memory Palace',
      type: MemoryTechniqueType.visualization,
      description: 'Place items to remember in familiar locations',
      steps: [
        'Choose a familiar place (your home, school)',
        'Identify specific locations within that place',
        'Associate each item with a location',
        'Mentally walk through the place to recall items',
      ],
      effectiveness: 5,
      timesUsed: 8,
      createdAt: DateTime.now().subtract(const Duration(days: 20)),
      updatedAt: DateTime.now().subtract(const Duration(days: 3)),
    ),
    MemoryTechnique(
      id: 'tech-3',
      userId: 'user123',
      name: 'Chunking',
      type: MemoryTechniqueType.chunking,
      description: 'Group items into smaller, manageable chunks',
      steps: [
        'Identify patterns or relationships in the information',
        'Group related items together',
        'Create meaningful labels for each group',
        'Practice recalling groups, then items within',
      ],
      examples: ['Phone numbers: 555-123-4567', 'SSN: 123-45-6789'],
      effectiveness: 4,
      timesUsed: 15,
      createdAt: DateTime.now().subtract(const Duration(days: 15)),
      updatedAt: DateTime.now().subtract(const Duration(days: 1)),
    ),
  ];

  static final List<MemoryCard> _mockMemoryCards = [
    MemoryCard(
      id: 'card-1',
      userId: 'user123',
      front: 'What is photosynthesis?',
      back:
          'The process by which plants convert light energy into chemical energy',
      subject: 'Science',
      deck: 'Biology Basics',
      lastReviewed: DateTime.now().subtract(const Duration(hours: 6)),
      nextReview: DateTime.now().add(const Duration(days: 1)),
      correctCount: 5,
      incorrectCount: 1,
      difficulty: MemoryCardDifficulty.easy,
    ),
    MemoryCard(
      id: 'card-2',
      userId: 'user123',
      front: 'What is the capital of France?',
      back: 'Paris',
      subject: 'Geography',
      deck: 'World Capitals',
      lastReviewed: DateTime.now().subtract(const Duration(days: 1)),
      nextReview: DateTime.now().add(const Duration(days: 3)),
      correctCount: 8,
      incorrectCount: 0,
      difficulty: MemoryCardDifficulty.easy,
    ),
    MemoryCard(
      id: 'card-3',
      userId: 'user123',
      front: 'What is the quadratic formula?',
      back: 'x = (-b ± √(b² - 4ac)) / 2a',
      subject: 'Math',
      deck: 'Algebra',
      lastReviewed: DateTime.now().subtract(const Duration(hours: 12)),
      nextReview: DateTime.now().add(const Duration(hours: 12)),
      correctCount: 3,
      incorrectCount: 4,
      difficulty: MemoryCardDifficulty.hard,
    ),
  ];

  static final List<TestPrepPlan> _mockTestPrepPlans = [
    TestPrepPlan(
      id: 'plan-1',
      userId: 'user123',
      testName: 'Math Midterm',
      testDate: DateTime.now().add(const Duration(days: 14)),
      subject: 'Mathematics',
      description: 'Covers chapters 1-5: Algebra and Geometry',
      studySessions: [
        StudySession(
          id: 'session-1',
          date: DateTime.now().subtract(const Duration(days: 2)),
          time: '3:00 PM',
          duration: 60,
          topics: ['Chapter 1: Basics'],
          activities: ['Read textbook', 'Complete practice problems'],
          isCompleted: true,
          completedAt: DateTime.now().subtract(const Duration(days: 2)),
        ),
        StudySession(
          id: 'session-2',
          date: DateTime.now(),
          time: '4:00 PM',
          duration: 45,
          topics: ['Chapter 2: Linear Equations'],
          activities: ['Review notes', 'Flashcards'],
          isCompleted: false,
        ),
        StudySession(
          id: 'session-3',
          date: DateTime.now().add(const Duration(days: 2)),
          time: '3:30 PM',
          duration: 60,
          topics: ['Chapter 3: Inequalities'],
          activities: ['Practice test', 'Review mistakes'],
          isCompleted: false,
        ),
      ],
      topics: [
        'Algebra basics',
        'Linear equations',
        'Inequalities',
        'Geometry fundamentals',
        'Triangles',
      ],
      progress: 25,
      createdAt: DateTime.now().subtract(const Duration(days: 7)),
      updatedAt: DateTime.now().subtract(const Duration(hours: 6)),
    ),
  ];

  static final List<PracticeTest> _mockPracticeTests = [
    PracticeTest(
      id: 'test-1',
      userId: 'user123',
      testPrepPlanId: 'plan-1',
      name: 'Math Practice Test 1',
      subject: 'Mathematics',
      questions: [
        PracticeQuestion(
          id: 'pq-1',
          question: 'Solve: 3x + 7 = 22',
          type: QuestionType.shortAnswer,
          correctAnswer: '5',
          difficulty: QuestionDifficulty.easy,
        ),
        PracticeQuestion(
          id: 'pq-2',
          question: 'Is 2x - 5 > 3 when x = 4?',
          type: QuestionType.trueFalse,
          options: ['True', 'False'],
          correctAnswer: 'True',
          difficulty: QuestionDifficulty.easy,
        ),
      ],
      duration: 30,
      score: 85,
      completedAt: DateTime.now().subtract(const Duration(days: 1)),
      createdAt: DateTime.now().subtract(const Duration(days: 3)),
    ),
  ];
}
