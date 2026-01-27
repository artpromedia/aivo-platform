import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../config/environment.dart';
import 'visual_learning_models.dart';

/// Visual Learning Service
///
/// Provides API access for mind maps, diagrams, video annotations, and visual notebooks.
class VisualLearningService {
  final String _accessToken;
  final String _baseUrl;

  VisualLearningService({
    required String accessToken,
  })  : _accessToken = accessToken,
        _baseUrl = EnvironmentConfig.visualLearningBaseUrl;

  Map<String, String> get _headers => {
        'Authorization': 'Bearer $_accessToken',
        'Content-Type': 'application/json',
      };

  // ==================== MIND MAPS ====================

  Future<List<MindMap>> getMindMaps(String userId) async {
    if (EnvironmentConfig.useVisualLearningMock) {
      return _mockMindMaps;
    }

    final response = await http.get(
      Uri.parse('$_baseUrl/mind-maps?userId=$userId'),
      headers: _headers,
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to fetch mind maps');
    }

    final List<dynamic> data = json.decode(response.body);
    return data.map((e) => MindMap.fromJson(e)).toList();
  }

  Future<MindMap> createMindMap({
    required String userId,
    required String title,
    required String description,
    MindMapTheme theme = MindMapTheme.light,
  }) async {
    if (EnvironmentConfig.useVisualLearningMock) {
      return MindMap(
        id: 'mindmap-${DateTime.now().millisecondsSinceEpoch}',
        userId: userId,
        title: title,
        description: description,
        nodes: [
          MindMapNode(
            id: 'node-1',
            label: title,
            color: '#3B82F6',
            x: 200,
            y: 200,
          ),
        ],
        connections: [],
        theme: theme,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
        isPublic: false,
        tags: [],
      );
    }

    final response = await http.post(
      Uri.parse('$_baseUrl/mind-maps'),
      headers: _headers,
      body: json.encode({
        'userId': userId,
        'title': title,
        'description': description,
        'theme': theme.name,
      }),
    );

    if (response.statusCode != 201) {
      throw Exception('Failed to create mind map');
    }

    return MindMap.fromJson(json.decode(response.body));
  }

  Future<void> deleteMindMap(String mapId) async {
    if (EnvironmentConfig.useVisualLearningMock) return;

    final response = await http.delete(
      Uri.parse('$_baseUrl/mind-maps/$mapId'),
      headers: _headers,
    );

    if (response.statusCode != 204) {
      throw Exception('Failed to delete mind map');
    }
  }

  // ==================== DIAGRAMS ====================

  Future<List<Diagram>> getDiagrams(String userId) async {
    if (EnvironmentConfig.useVisualLearningMock) {
      return _mockDiagrams;
    }

    final response = await http.get(
      Uri.parse('$_baseUrl/diagrams?userId=$userId'),
      headers: _headers,
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to fetch diagrams');
    }

    final List<dynamic> data = json.decode(response.body);
    return data.map((e) => Diagram.fromJson(e)).toList();
  }

  Future<Diagram> createDiagram({
    required String userId,
    required String title,
    required String description,
    DiagramType type = DiagramType.flowchart,
  }) async {
    if (EnvironmentConfig.useVisualLearningMock) {
      return Diagram(
        id: 'diagram-${DateTime.now().millisecondsSinceEpoch}',
        userId: userId,
        title: title,
        description: description,
        type: type,
        shapes: [],
        connectors: [],
        canvas: DiagramCanvas(
          width: 800,
          height: 600,
          backgroundColor: '#FFFFFF',
          gridEnabled: true,
        ),
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
        tags: [],
      );
    }

    final response = await http.post(
      Uri.parse('$_baseUrl/diagrams'),
      headers: _headers,
      body: json.encode({
        'userId': userId,
        'title': title,
        'description': description,
        'type': type.name,
      }),
    );

    if (response.statusCode != 201) {
      throw Exception('Failed to create diagram');
    }

    return Diagram.fromJson(json.decode(response.body));
  }

  Future<void> deleteDiagram(String diagramId) async {
    if (EnvironmentConfig.useVisualLearningMock) return;

    final response = await http.delete(
      Uri.parse('$_baseUrl/diagrams/$diagramId'),
      headers: _headers,
    );

    if (response.statusCode != 204) {
      throw Exception('Failed to delete diagram');
    }
  }

  // ==================== VIDEO ANNOTATIONS ====================

  Future<List<AnnotatedVideo>> getAnnotatedVideos(String userId) async {
    if (EnvironmentConfig.useVisualLearningMock) {
      return _mockVideos;
    }

    final response = await http.get(
      Uri.parse('$_baseUrl/videos?userId=$userId'),
      headers: _headers,
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to fetch annotated videos');
    }

    final List<dynamic> data = json.decode(response.body);
    return data.map((e) => AnnotatedVideo.fromJson(e)).toList();
  }

  Future<AnnotatedVideo> createAnnotatedVideo({
    required String userId,
    required String title,
    required String videoUrl,
    required int duration,
  }) async {
    if (EnvironmentConfig.useVisualLearningMock) {
      return AnnotatedVideo(
        id: 'video-${DateTime.now().millisecondsSinceEpoch}',
        userId: userId,
        title: title,
        videoUrl: videoUrl,
        duration: duration,
        annotations: [],
        chapters: [],
        tags: [],
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );
    }

    final response = await http.post(
      Uri.parse('$_baseUrl/videos'),
      headers: _headers,
      body: json.encode({
        'userId': userId,
        'title': title,
        'videoUrl': videoUrl,
        'duration': duration,
      }),
    );

    if (response.statusCode != 201) {
      throw Exception('Failed to create annotated video');
    }

    return AnnotatedVideo.fromJson(json.decode(response.body));
  }

  // ==================== VISUAL NOTEBOOKS ====================

  Future<List<VisualNotebook>> getVisualNotebooks(String userId) async {
    if (EnvironmentConfig.useVisualLearningMock) {
      return _mockNotebooks;
    }

    final response = await http.get(
      Uri.parse('$_baseUrl/notebooks?userId=$userId'),
      headers: _headers,
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to fetch visual notebooks');
    }

    final List<dynamic> data = json.decode(response.body);
    return data.map((e) => VisualNotebook.fromJson(e)).toList();
  }

  Future<VisualNotebook> createVisualNotebook({
    required String userId,
    required String title,
    required String description,
    String? subject,
  }) async {
    if (EnvironmentConfig.useVisualLearningMock) {
      return VisualNotebook(
        id: 'notebook-${DateTime.now().millisecondsSinceEpoch}',
        userId: userId,
        title: title,
        description: description,
        subject: subject,
        notes: [],
        backgroundColor: '#FFFFFF',
        gridType: GridType.dots,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
        tags: [],
      );
    }

    final response = await http.post(
      Uri.parse('$_baseUrl/notebooks'),
      headers: _headers,
      body: json.encode({
        'userId': userId,
        'title': title,
        'description': description,
        if (subject != null) 'subject': subject,
      }),
    );

    if (response.statusCode != 201) {
      throw Exception('Failed to create visual notebook');
    }

    return VisualNotebook.fromJson(json.decode(response.body));
  }

  Future<void> deleteVisualNotebook(String notebookId) async {
    if (EnvironmentConfig.useVisualLearningMock) return;

    final response = await http.delete(
      Uri.parse('$_baseUrl/notebooks/$notebookId'),
      headers: _headers,
    );

    if (response.statusCode != 204) {
      throw Exception('Failed to delete visual notebook');
    }
  }

  // ==================== MOCK DATA ====================

  static final List<MindMap> _mockMindMaps = [
    MindMap(
      id: 'mindmap-1',
      userId: 'user123',
      title: 'Photosynthesis',
      description: 'Understanding how plants make food',
      nodes: [
        MindMapNode(
            id: 'n1', label: 'Photosynthesis', color: '#10B981', x: 200, y: 200),
        MindMapNode(
            id: 'n2',
            label: 'Light Reaction',
            color: '#F59E0B',
            x: 100,
            y: 300,
            parentId: 'n1'),
        MindMapNode(
            id: 'n3',
            label: 'Dark Reaction',
            color: '#3B82F6',
            x: 300,
            y: 300,
            parentId: 'n1'),
      ],
      connections: [
        MindMapConnection(
            id: 'c1', sourceId: 'n1', targetId: 'n2', style: ConnectionStyle.solid),
        MindMapConnection(
            id: 'c2', sourceId: 'n1', targetId: 'n3', style: ConnectionStyle.solid),
      ],
      theme: MindMapTheme.colorful,
      createdAt: DateTime.now().subtract(const Duration(days: 7)),
      updatedAt: DateTime.now().subtract(const Duration(hours: 2)),
      isPublic: false,
      tags: ['science', 'biology'],
    ),
    MindMap(
      id: 'mindmap-2',
      userId: 'user123',
      title: 'History Timeline',
      description: 'World War II events',
      nodes: [
        MindMapNode(id: 'n1', label: 'WWII', color: '#EF4444', x: 200, y: 200),
        MindMapNode(
            id: 'n2', label: '1939', color: '#6B7280', x: 100, y: 300, parentId: 'n1'),
        MindMapNode(
            id: 'n3', label: '1945', color: '#6B7280', x: 300, y: 300, parentId: 'n1'),
      ],
      connections: [],
      theme: MindMapTheme.light,
      createdAt: DateTime.now().subtract(const Duration(days: 3)),
      updatedAt: DateTime.now().subtract(const Duration(days: 1)),
      isPublic: false,
      tags: ['history'],
    ),
  ];

  static final List<Diagram> _mockDiagrams = [
    Diagram(
      id: 'diagram-1',
      userId: 'user123',
      title: 'Water Cycle',
      description: 'The water cycle process',
      type: DiagramType.flowchart,
      shapes: [
        DiagramShape(
          id: 's1',
          type: DiagramShapeType.rectangle,
          x: 100,
          y: 100,
          width: 100,
          height: 50,
          fill: '#3B82F6',
          stroke: '#1E40AF',
          strokeWidth: 2,
          text: 'Evaporation',
        ),
        DiagramShape(
          id: 's2',
          type: DiagramShapeType.rectangle,
          x: 100,
          y: 200,
          width: 100,
          height: 50,
          fill: '#8B5CF6',
          stroke: '#6D28D9',
          strokeWidth: 2,
          text: 'Condensation',
        ),
      ],
      connectors: [
        DiagramConnector(
          id: 'c1',
          sourceId: 's1',
          targetId: 's2',
          type: ConnectorType.curved,
          arrowStart: false,
          arrowEnd: true,
        ),
      ],
      canvas: DiagramCanvas(
        width: 800,
        height: 600,
        backgroundColor: '#F8FAFC',
        gridEnabled: true,
      ),
      createdAt: DateTime.now().subtract(const Duration(days: 5)),
      updatedAt: DateTime.now().subtract(const Duration(hours: 6)),
      tags: ['science'],
    ),
  ];

  static final List<AnnotatedVideo> _mockVideos = [
    AnnotatedVideo(
      id: 'video-1',
      userId: 'user123',
      title: 'Math Tutorial: Fractions',
      videoUrl: 'https://example.com/video.mp4',
      duration: 600,
      annotations: [
        VideoAnnotation(
          id: 'a1',
          timestamp: 30,
          type: AnnotationType.note,
          content: 'Important: numerator on top',
          color: '#F59E0B',
        ),
        VideoAnnotation(
          id: 'a2',
          timestamp: 120,
          type: AnnotationType.bookmark,
          content: 'Adding fractions example',
          color: '#3B82F6',
        ),
      ],
      chapters: [
        VideoChapter(id: 'ch1', title: 'Introduction', startTime: 0, endTime: 60),
        VideoChapter(id: 'ch2', title: 'Adding Fractions', startTime: 60, endTime: 300),
      ],
      tags: ['math', 'fractions'],
      createdAt: DateTime.now().subtract(const Duration(days: 2)),
      updatedAt: DateTime.now().subtract(const Duration(hours: 4)),
    ),
  ];

  static final List<VisualNotebook> _mockNotebooks = [
    VisualNotebook(
      id: 'notebook-1',
      userId: 'user123',
      title: 'Science Sketches',
      description: 'Visual notes from science class',
      subject: 'Science',
      notes: [
        VisualNote(
          id: 'note-1',
          type: VisualNoteType.sketch,
          content: '{}',
          position: 0,
        ),
      ],
      backgroundColor: '#FFFBEB',
      gridType: GridType.dots,
      createdAt: DateTime.now().subtract(const Duration(days: 10)),
      updatedAt: DateTime.now().subtract(const Duration(hours: 1)),
      tags: ['science', 'sketches'],
    ),
    VisualNotebook(
      id: 'notebook-2',
      userId: 'user123',
      title: 'Math Diagrams',
      description: 'Geometry and graphs',
      subject: 'Math',
      notes: [],
      backgroundColor: '#F0FDF4',
      gridType: GridType.graph,
      createdAt: DateTime.now().subtract(const Duration(days: 5)),
      updatedAt: DateTime.now().subtract(const Duration(days: 2)),
      tags: ['math', 'geometry'],
    ),
  ];
}
