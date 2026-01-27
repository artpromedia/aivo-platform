/// Visual Learning Models
///
/// Data models for Mind Maps, Diagrams, Video Annotations, and Visual Notebooks.

// ==================== MIND MAP TYPES ====================

class MindMapNode {
  final String id;
  final String label;
  final String color;
  final double x;
  final double y;
  final String? parentId;
  final String? notes;
  final List<String>? images;
  final List<String>? links;

  MindMapNode({
    required this.id,
    required this.label,
    required this.color,
    required this.x,
    required this.y,
    this.parentId,
    this.notes,
    this.images,
    this.links,
  });

  factory MindMapNode.fromJson(Map<String, dynamic> json) => MindMapNode(
        id: json['id'] as String,
        label: json['label'] as String,
        color: json['color'] as String,
        x: (json['x'] as num).toDouble(),
        y: (json['y'] as num).toDouble(),
        parentId: json['parentId'] as String?,
        notes: json['notes'] as String?,
        images: (json['images'] as List<dynamic>?)?.cast<String>(),
        links: (json['links'] as List<dynamic>?)?.cast<String>(),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'label': label,
        'color': color,
        'x': x,
        'y': y,
        if (parentId != null) 'parentId': parentId,
        if (notes != null) 'notes': notes,
        if (images != null) 'images': images,
        if (links != null) 'links': links,
      };

  MindMapNode copyWith({
    String? id,
    String? label,
    String? color,
    double? x,
    double? y,
    String? parentId,
    String? notes,
    List<String>? images,
    List<String>? links,
  }) =>
      MindMapNode(
        id: id ?? this.id,
        label: label ?? this.label,
        color: color ?? this.color,
        x: x ?? this.x,
        y: y ?? this.y,
        parentId: parentId ?? this.parentId,
        notes: notes ?? this.notes,
        images: images ?? this.images,
        links: links ?? this.links,
      );
}

enum ConnectionStyle { solid, dashed, dotted }

class MindMapConnection {
  final String id;
  final String sourceId;
  final String targetId;
  final String? label;
  final ConnectionStyle style;

  MindMapConnection({
    required this.id,
    required this.sourceId,
    required this.targetId,
    this.label,
    required this.style,
  });

  factory MindMapConnection.fromJson(Map<String, dynamic> json) =>
      MindMapConnection(
        id: json['id'] as String,
        sourceId: json['sourceId'] as String,
        targetId: json['targetId'] as String,
        label: json['label'] as String?,
        style: ConnectionStyle.values.firstWhere(
          (e) => e.name == json['style'],
          orElse: () => ConnectionStyle.solid,
        ),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'sourceId': sourceId,
        'targetId': targetId,
        if (label != null) 'label': label,
        'style': style.name,
      };
}

enum MindMapTheme { light, dark, colorful }

class MindMap {
  final String id;
  final String userId;
  final String title;
  final String description;
  final List<MindMapNode> nodes;
  final List<MindMapConnection> connections;
  final MindMapTheme theme;
  final DateTime createdAt;
  final DateTime updatedAt;
  final bool isPublic;
  final List<String> tags;

  MindMap({
    required this.id,
    required this.userId,
    required this.title,
    required this.description,
    required this.nodes,
    required this.connections,
    required this.theme,
    required this.createdAt,
    required this.updatedAt,
    required this.isPublic,
    required this.tags,
  });

  factory MindMap.fromJson(Map<String, dynamic> json) => MindMap(
        id: json['id'] as String,
        userId: json['userId'] as String,
        title: json['title'] as String,
        description: json['description'] as String? ?? '',
        nodes: (json['nodes'] as List<dynamic>?)
                ?.map((e) => MindMapNode.fromJson(e as Map<String, dynamic>))
                .toList() ??
            [],
        connections: (json['connections'] as List<dynamic>?)
                ?.map(
                    (e) => MindMapConnection.fromJson(e as Map<String, dynamic>))
                .toList() ??
            [],
        theme: MindMapTheme.values.firstWhere(
          (e) => e.name == json['theme'],
          orElse: () => MindMapTheme.light,
        ),
        createdAt: DateTime.parse(json['createdAt'] as String),
        updatedAt: DateTime.parse(json['updatedAt'] as String),
        isPublic: json['isPublic'] as bool? ?? false,
        tags: (json['tags'] as List<dynamic>?)?.cast<String>() ?? [],
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'userId': userId,
        'title': title,
        'description': description,
        'nodes': nodes.map((n) => n.toJson()).toList(),
        'connections': connections.map((c) => c.toJson()).toList(),
        'theme': theme.name,
        'createdAt': createdAt.toIso8601String(),
        'updatedAt': updatedAt.toIso8601String(),
        'isPublic': isPublic,
        'tags': tags,
      };
}

// ==================== DIAGRAM TYPES ====================

enum DiagramShapeType { rectangle, circle, triangle, diamond, arrow, text }

class DiagramShape {
  final String id;
  final DiagramShapeType type;
  final double x;
  final double y;
  final double width;
  final double height;
  final String fill;
  final String stroke;
  final double strokeWidth;
  final String? text;
  final double? fontSize;
  final double? rotation;

  DiagramShape({
    required this.id,
    required this.type,
    required this.x,
    required this.y,
    required this.width,
    required this.height,
    required this.fill,
    required this.stroke,
    required this.strokeWidth,
    this.text,
    this.fontSize,
    this.rotation,
  });

  factory DiagramShape.fromJson(Map<String, dynamic> json) => DiagramShape(
        id: json['id'] as String,
        type: DiagramShapeType.values.firstWhere(
          (e) => e.name == json['type'],
          orElse: () => DiagramShapeType.rectangle,
        ),
        x: (json['x'] as num).toDouble(),
        y: (json['y'] as num).toDouble(),
        width: (json['width'] as num).toDouble(),
        height: (json['height'] as num).toDouble(),
        fill: json['fill'] as String,
        stroke: json['stroke'] as String,
        strokeWidth: (json['strokeWidth'] as num).toDouble(),
        text: json['text'] as String?,
        fontSize: (json['fontSize'] as num?)?.toDouble(),
        rotation: (json['rotation'] as num?)?.toDouble(),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'type': type.name,
        'x': x,
        'y': y,
        'width': width,
        'height': height,
        'fill': fill,
        'stroke': stroke,
        'strokeWidth': strokeWidth,
        if (text != null) 'text': text,
        if (fontSize != null) 'fontSize': fontSize,
        if (rotation != null) 'rotation': rotation,
      };
}

enum ConnectorType { straight, curved, stepped }

class DiagramConnector {
  final String id;
  final String sourceId;
  final String targetId;
  final ConnectorType type;
  final String? label;
  final bool arrowStart;
  final bool arrowEnd;

  DiagramConnector({
    required this.id,
    required this.sourceId,
    required this.targetId,
    required this.type,
    this.label,
    required this.arrowStart,
    required this.arrowEnd,
  });

  factory DiagramConnector.fromJson(Map<String, dynamic> json) =>
      DiagramConnector(
        id: json['id'] as String,
        sourceId: json['sourceId'] as String,
        targetId: json['targetId'] as String,
        type: ConnectorType.values.firstWhere(
          (e) => e.name == json['type'],
          orElse: () => ConnectorType.straight,
        ),
        label: json['label'] as String?,
        arrowStart: json['arrowStart'] as bool? ?? false,
        arrowEnd: json['arrowEnd'] as bool? ?? true,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'sourceId': sourceId,
        'targetId': targetId,
        'type': type.name,
        if (label != null) 'label': label,
        'arrowStart': arrowStart,
        'arrowEnd': arrowEnd,
      };
}

enum DiagramType {
  flowchart,
  sequence,
  classD,
  entityRelationship,
  network,
  custom
}

class DiagramCanvas {
  final double width;
  final double height;
  final String backgroundColor;
  final bool gridEnabled;

  DiagramCanvas({
    required this.width,
    required this.height,
    required this.backgroundColor,
    required this.gridEnabled,
  });

  factory DiagramCanvas.fromJson(Map<String, dynamic> json) => DiagramCanvas(
        width: (json['width'] as num).toDouble(),
        height: (json['height'] as num).toDouble(),
        backgroundColor: json['backgroundColor'] as String? ?? '#FFFFFF',
        gridEnabled: json['gridEnabled'] as bool? ?? true,
      );

  Map<String, dynamic> toJson() => {
        'width': width,
        'height': height,
        'backgroundColor': backgroundColor,
        'gridEnabled': gridEnabled,
      };
}

class Diagram {
  final String id;
  final String userId;
  final String title;
  final String description;
  final DiagramType type;
  final List<DiagramShape> shapes;
  final List<DiagramConnector> connectors;
  final DiagramCanvas canvas;
  final DateTime createdAt;
  final DateTime updatedAt;
  final List<String> tags;

  Diagram({
    required this.id,
    required this.userId,
    required this.title,
    required this.description,
    required this.type,
    required this.shapes,
    required this.connectors,
    required this.canvas,
    required this.createdAt,
    required this.updatedAt,
    required this.tags,
  });

  factory Diagram.fromJson(Map<String, dynamic> json) => Diagram(
        id: json['id'] as String,
        userId: json['userId'] as String,
        title: json['title'] as String,
        description: json['description'] as String? ?? '',
        type: DiagramType.values.firstWhere(
          (e) => e.name == json['type'],
          orElse: () => DiagramType.flowchart,
        ),
        shapes: (json['shapes'] as List<dynamic>?)
                ?.map((e) => DiagramShape.fromJson(e as Map<String, dynamic>))
                .toList() ??
            [],
        connectors: (json['connectors'] as List<dynamic>?)
                ?.map(
                    (e) => DiagramConnector.fromJson(e as Map<String, dynamic>))
                .toList() ??
            [],
        canvas: DiagramCanvas.fromJson(
            json['canvas'] as Map<String, dynamic>? ?? {}),
        createdAt: DateTime.parse(json['createdAt'] as String),
        updatedAt: DateTime.parse(json['updatedAt'] as String),
        tags: (json['tags'] as List<dynamic>?)?.cast<String>() ?? [],
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'userId': userId,
        'title': title,
        'description': description,
        'type': type.name,
        'shapes': shapes.map((s) => s.toJson()).toList(),
        'connectors': connectors.map((c) => c.toJson()).toList(),
        'canvas': canvas.toJson(),
        'createdAt': createdAt.toIso8601String(),
        'updatedAt': updatedAt.toIso8601String(),
        'tags': tags,
      };
}

// ==================== VIDEO ANNOTATION TYPES ====================

enum AnnotationType { note, highlight, question, bookmark }

class VideoAnnotation {
  final String id;
  final int timestamp; // seconds
  final AnnotationType type;
  final String content;
  final String color;
  final double? x;
  final double? y;
  final double? width;
  final double? height;

  VideoAnnotation({
    required this.id,
    required this.timestamp,
    required this.type,
    required this.content,
    required this.color,
    this.x,
    this.y,
    this.width,
    this.height,
  });

  factory VideoAnnotation.fromJson(Map<String, dynamic> json) =>
      VideoAnnotation(
        id: json['id'] as String,
        timestamp: json['timestamp'] as int,
        type: AnnotationType.values.firstWhere(
          (e) => e.name == json['type'],
          orElse: () => AnnotationType.note,
        ),
        content: json['content'] as String,
        color: json['color'] as String,
        x: (json['x'] as num?)?.toDouble(),
        y: (json['y'] as num?)?.toDouble(),
        width: (json['width'] as num?)?.toDouble(),
        height: (json['height'] as num?)?.toDouble(),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'timestamp': timestamp,
        'type': type.name,
        'content': content,
        'color': color,
        if (x != null) 'x': x,
        if (y != null) 'y': y,
        if (width != null) 'width': width,
        if (height != null) 'height': height,
      };
}

class VideoChapter {
  final String id;
  final String title;
  final int startTime;
  final int endTime;

  VideoChapter({
    required this.id,
    required this.title,
    required this.startTime,
    required this.endTime,
  });

  factory VideoChapter.fromJson(Map<String, dynamic> json) => VideoChapter(
        id: json['id'] as String,
        title: json['title'] as String,
        startTime: json['startTime'] as int,
        endTime: json['endTime'] as int,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'startTime': startTime,
        'endTime': endTime,
      };
}

class AnnotatedVideo {
  final String id;
  final String userId;
  final String title;
  final String videoUrl;
  final String? thumbnailUrl;
  final int duration; // seconds
  final List<VideoAnnotation> annotations;
  final List<VideoChapter> chapters;
  final List<String> tags;
  final DateTime createdAt;
  final DateTime updatedAt;

  AnnotatedVideo({
    required this.id,
    required this.userId,
    required this.title,
    required this.videoUrl,
    this.thumbnailUrl,
    required this.duration,
    required this.annotations,
    required this.chapters,
    required this.tags,
    required this.createdAt,
    required this.updatedAt,
  });

  factory AnnotatedVideo.fromJson(Map<String, dynamic> json) => AnnotatedVideo(
        id: json['id'] as String,
        userId: json['userId'] as String,
        title: json['title'] as String,
        videoUrl: json['videoUrl'] as String,
        thumbnailUrl: json['thumbnailUrl'] as String?,
        duration: json['duration'] as int,
        annotations: (json['annotations'] as List<dynamic>?)
                ?.map(
                    (e) => VideoAnnotation.fromJson(e as Map<String, dynamic>))
                .toList() ??
            [],
        chapters: (json['chapters'] as List<dynamic>?)
                ?.map((e) => VideoChapter.fromJson(e as Map<String, dynamic>))
                .toList() ??
            [],
        tags: (json['tags'] as List<dynamic>?)?.cast<String>() ?? [],
        createdAt: DateTime.parse(json['createdAt'] as String),
        updatedAt: DateTime.parse(json['updatedAt'] as String),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'userId': userId,
        'title': title,
        'videoUrl': videoUrl,
        if (thumbnailUrl != null) 'thumbnailUrl': thumbnailUrl,
        'duration': duration,
        'annotations': annotations.map((a) => a.toJson()).toList(),
        'chapters': chapters.map((c) => c.toJson()).toList(),
        'tags': tags,
        'createdAt': createdAt.toIso8601String(),
        'updatedAt': updatedAt.toIso8601String(),
      };
}

// ==================== VISUAL NOTEBOOK TYPES ====================

enum VisualNoteType { sketch, diagram, table, chart, mixed }

class VisualNote {
  final String id;
  final VisualNoteType type;
  final String content; // JSON or SVG data
  final String? thumbnail;
  final int position;

  VisualNote({
    required this.id,
    required this.type,
    required this.content,
    this.thumbnail,
    required this.position,
  });

  factory VisualNote.fromJson(Map<String, dynamic> json) => VisualNote(
        id: json['id'] as String,
        type: VisualNoteType.values.firstWhere(
          (e) => e.name == json['type'],
          orElse: () => VisualNoteType.sketch,
        ),
        content: json['content'] as String,
        thumbnail: json['thumbnail'] as String?,
        position: json['position'] as int,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'type': type.name,
        'content': content,
        if (thumbnail != null) 'thumbnail': thumbnail,
        'position': position,
      };
}

enum GridType { none, dots, lines, graph }

class VisualNotebook {
  final String id;
  final String userId;
  final String title;
  final String description;
  final String? subject;
  final List<VisualNote> notes;
  final String backgroundColor;
  final GridType gridType;
  final DateTime createdAt;
  final DateTime updatedAt;
  final List<String> tags;

  VisualNotebook({
    required this.id,
    required this.userId,
    required this.title,
    required this.description,
    this.subject,
    required this.notes,
    required this.backgroundColor,
    required this.gridType,
    required this.createdAt,
    required this.updatedAt,
    required this.tags,
  });

  factory VisualNotebook.fromJson(Map<String, dynamic> json) => VisualNotebook(
        id: json['id'] as String,
        userId: json['userId'] as String,
        title: json['title'] as String,
        description: json['description'] as String? ?? '',
        subject: json['subject'] as String?,
        notes: (json['notes'] as List<dynamic>?)
                ?.map((e) => VisualNote.fromJson(e as Map<String, dynamic>))
                .toList() ??
            [],
        backgroundColor: json['backgroundColor'] as String? ?? '#FFFFFF',
        gridType: GridType.values.firstWhere(
          (e) => e.name == json['gridType'],
          orElse: () => GridType.none,
        ),
        createdAt: DateTime.parse(json['createdAt'] as String),
        updatedAt: DateTime.parse(json['updatedAt'] as String),
        tags: (json['tags'] as List<dynamic>?)?.cast<String>() ?? [],
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'userId': userId,
        'title': title,
        'description': description,
        if (subject != null) 'subject': subject,
        'notes': notes.map((n) => n.toJson()).toList(),
        'backgroundColor': backgroundColor,
        'gridType': gridType.name,
        'createdAt': createdAt.toIso8601String(),
        'updatedAt': updatedAt.toIso8601String(),
        'tags': tags,
      };
}
