import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_learner/features/visual_learning/visual_learning_models.dart';
import 'package:mobile_learner/features/visual_learning/visual_learning_service.dart';

void main() {
  group('Visual Learning Models', () {
    group('MindMap', () {
      test('should create MindMap from JSON', () {
        final json = {
          'id': 'map-1',
          'title': 'Cell Biology',
          'description': 'Overview of cell structure',
          'subject': 'Biology',
          'rootNode': {
            'id': 'node-1',
            'label': 'Cell',
            'x': 200.0,
            'y': 200.0,
            'color': '#4CAF50',
            'children': [
              {
                'id': 'node-2',
                'label': 'Nucleus',
                'x': 100.0,
                'y': 100.0,
                'color': '#2196F3',
                'children': [],
              },
              {
                'id': 'node-3',
                'label': 'Mitochondria',
                'x': 300.0,
                'y': 100.0,
                'color': '#FF9800',
                'children': [],
              },
            ],
          },
          'createdAt': '2024-01-15T10:00:00Z',
          'lastModifiedAt': '2024-01-15T12:00:00Z',
          'isFavorite': true,
        };

        final map = MindMap.fromJson(json);

        expect(map.id, 'map-1');
        expect(map.title, 'Cell Biology');
        expect(map.rootNode.label, 'Cell');
        expect(map.rootNode.children.length, 2);
        expect(map.isFavorite, true);
      });

      test('should convert MindMap to JSON', () {
        final map = MindMap(
          id: 'map-1',
          title: 'Test Map',
          description: 'Description',
          subject: 'Subject',
          rootNode: MindMapNode(
            id: 'node-1',
            label: 'Root',
            x: 200.0,
            y: 200.0,
            color: '#4CAF50',
            children: [],
          ),
          createdAt: DateTime.parse('2024-01-15T10:00:00Z'),
          lastModifiedAt: DateTime.parse('2024-01-15T12:00:00Z'),
          isFavorite: false,
        );

        final json = map.toJson();

        expect(json['id'], 'map-1');
        expect(json['title'], 'Test Map');
        expect(json['rootNode']['label'], 'Root');
      });
    });

    group('MindMapNode', () {
      test('should count total nodes including children', () {
        final node = MindMapNode(
          id: 'node-1',
          label: 'Root',
          x: 200.0,
          y: 200.0,
          color: '#4CAF50',
          children: [
            MindMapNode(
              id: 'node-2',
              label: 'Child 1',
              x: 100.0,
              y: 100.0,
              color: '#2196F3',
              children: [
                MindMapNode(
                  id: 'node-4',
                  label: 'Grandchild',
                  x: 50.0,
                  y: 50.0,
                  color: '#9C27B0',
                  children: [],
                ),
              ],
            ),
            MindMapNode(
              id: 'node-3',
              label: 'Child 2',
              x: 300.0,
              y: 100.0,
              color: '#FF9800',
              children: [],
            ),
          ],
        );

        expect(node.totalNodes, 4);
      });
    });

    group('Diagram', () {
      test('should create Diagram from JSON', () {
        final json = {
          'id': 'diagram-1',
          'title': 'Login Flow',
          'description': 'User authentication process',
          'type': 'flowchart',
          'subject': 'Computer Science',
          'shapes': [
            {
              'id': 'shape-1',
              'type': 'rectangle',
              'x': 100.0,
              'y': 100.0,
              'width': 120.0,
              'height': 60.0,
              'label': 'Start',
              'color': '#4CAF50',
              'connections': ['shape-2'],
            },
            {
              'id': 'shape-2',
              'type': 'diamond',
              'x': 100.0,
              'y': 200.0,
              'width': 100.0,
              'height': 100.0,
              'label': 'Valid?',
              'color': '#2196F3',
              'connections': ['shape-3', 'shape-4'],
            },
          ],
          'createdAt': '2024-01-15T10:00:00Z',
          'lastModifiedAt': '2024-01-15T12:00:00Z',
        };

        final diagram = Diagram.fromJson(json);

        expect(diagram.id, 'diagram-1');
        expect(diagram.title, 'Login Flow');
        expect(diagram.type, DiagramType.flowchart);
        expect(diagram.shapes.length, 2);
      });

      test('should identify diagram types correctly', () {
        expect(DiagramType.flowchart.displayName, 'Flowchart');
        expect(DiagramType.sequence.displayName, 'Sequence');
        expect(DiagramType.venn.displayName, 'Venn');
        expect(DiagramType.timeline.displayName, 'Timeline');
        expect(DiagramType.hierarchy.displayName, 'Hierarchy');
      });
    });

    group('DiagramShape', () {
      test('should create DiagramShape from JSON', () {
        final json = {
          'id': 'shape-1',
          'type': 'circle',
          'x': 100.0,
          'y': 100.0,
          'width': 80.0,
          'height': 80.0,
          'label': 'Node',
          'color': '#4CAF50',
          'connections': ['shape-2'],
        };

        final shape = DiagramShape.fromJson(json);

        expect(shape.id, 'shape-1');
        expect(shape.type, ShapeType.circle);
        expect(shape.label, 'Node');
        expect(shape.connections, ['shape-2']);
      });

      test('should identify shape types correctly', () {
        expect(ShapeType.rectangle.displayName, 'Rectangle');
        expect(ShapeType.circle.displayName, 'Circle');
        expect(ShapeType.diamond.displayName, 'Diamond');
        expect(ShapeType.arrow.displayName, 'Arrow');
        expect(ShapeType.oval.displayName, 'Oval');
      });
    });

    group('AnnotatedVideo', () {
      test('should create AnnotatedVideo from JSON', () {
        final json = {
          'id': 'video-1',
          'title': 'Intro to Physics',
          'videoUrl': 'https://example.com/video.mp4',
          'thumbnailUrl': 'https://example.com/thumb.jpg',
          'subject': 'Physics',
          'durationSeconds': 600,
          'annotations': [
            {
              'id': 'ann-1',
              'timestampSeconds': 30,
              'text': 'Key concept explained here',
              'type': 'note',
              'color': '#4CAF50',
              'createdAt': '2024-01-15T10:00:00Z',
            },
            {
              'id': 'ann-2',
              'timestampSeconds': 120,
              'text': 'Important formula',
              'type': 'highlight',
              'color': '#FFEB3B',
              'createdAt': '2024-01-15T10:05:00Z',
            },
          ],
          'createdAt': '2024-01-15T10:00:00Z',
          'lastWatchedAt': '2024-01-15T11:00:00Z',
          'watchProgress': 0.5,
        };

        final video = AnnotatedVideo.fromJson(json);

        expect(video.id, 'video-1');
        expect(video.title, 'Intro to Physics');
        expect(video.durationSeconds, 600);
        expect(video.annotations.length, 2);
        expect(video.watchProgress, 0.5);
      });

      test('should format duration correctly', () {
        final video = AnnotatedVideo(
          id: 'video-1',
          title: 'Test',
          videoUrl: 'url',
          thumbnailUrl: 'thumb',
          subject: 'Subject',
          durationSeconds: 3665, // 1:01:05
          annotations: [],
          createdAt: DateTime.now(),
          watchProgress: 0.0,
        );

        expect(video.formattedDuration, '1:01:05');
      });
    });

    group('VideoAnnotation', () {
      test('should create VideoAnnotation from JSON', () {
        final json = {
          'id': 'ann-1',
          'timestampSeconds': 90,
          'text': 'Important point',
          'type': 'question',
          'color': '#FF5722',
          'createdAt': '2024-01-15T10:00:00Z',
        };

        final annotation = VideoAnnotation.fromJson(json);

        expect(annotation.id, 'ann-1');
        expect(annotation.timestampSeconds, 90);
        expect(annotation.type, AnnotationType.question);
      });

      test('should format timestamp correctly', () {
        final annotation = VideoAnnotation(
          id: 'ann-1',
          timestampSeconds: 125, // 2:05
          text: 'Note',
          type: AnnotationType.note,
          color: '#4CAF50',
          createdAt: DateTime.now(),
        );

        expect(annotation.formattedTimestamp, '2:05');
      });

      test('should identify annotation types correctly', () {
        expect(AnnotationType.note.displayName, 'Note');
        expect(AnnotationType.highlight.displayName, 'Highlight');
        expect(AnnotationType.question.displayName, 'Question');
        expect(AnnotationType.bookmark.displayName, 'Bookmark');
      });
    });

    group('VisualNotebook', () {
      test('should create VisualNotebook from JSON', () {
        final json = {
          'id': 'notebook-1',
          'title': 'Biology Sketches',
          'description': 'Visual notes for biology class',
          'subject': 'Biology',
          'pages': [
            {
              'id': 'page-1',
              'pageNumber': 1,
              'thumbnailUrl': 'https://example.com/page1.jpg',
              'canvasData': '{"strokes":[]}',
              'createdAt': '2024-01-15T10:00:00Z',
              'lastModifiedAt': '2024-01-15T12:00:00Z',
            }
          ],
          'gridPattern': 'dots',
          'createdAt': '2024-01-15T10:00:00Z',
          'lastModifiedAt': '2024-01-15T12:00:00Z',
          'isFavorite': true,
        };

        final notebook = VisualNotebook.fromJson(json);

        expect(notebook.id, 'notebook-1');
        expect(notebook.title, 'Biology Sketches');
        expect(notebook.pages.length, 1);
        expect(notebook.gridPattern, GridPattern.dots);
        expect(notebook.isFavorite, true);
      });

      test('should identify grid patterns correctly', () {
        expect(GridPattern.none.displayName, 'None');
        expect(GridPattern.dots.displayName, 'Dots');
        expect(GridPattern.lines.displayName, 'Lines');
        expect(GridPattern.graph.displayName, 'Graph');
        expect(GridPattern.isometric.displayName, 'Isometric');
      });
    });
  });

  group('Visual Learning Service', () {
    late VisualLearningService service;

    setUp(() {
      service = VisualLearningService(accessToken: 'test-token');
    });

    test('should get mind maps', () async {
      final maps = await service.getMindMaps();

      expect(maps, isNotEmpty);
      expect(maps.first.title, isNotNull);
    });

    test('should get diagrams', () async {
      final diagrams = await service.getDiagrams();

      expect(diagrams, isNotEmpty);
      expect(diagrams.first.title, isNotNull);
    });

    test('should get annotated videos', () async {
      final videos = await service.getAnnotatedVideos();

      expect(videos, isNotEmpty);
      expect(videos.first.title, isNotNull);
    });

    test('should get visual notebooks', () async {
      final notebooks = await service.getVisualNotebooks();

      expect(notebooks, isNotEmpty);
      expect(notebooks.first.title, isNotNull);
    });
  });
}
