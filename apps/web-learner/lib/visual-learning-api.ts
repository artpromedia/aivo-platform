// Visual Learning API
// API client for visual learning tools and features

const VISUAL_LEARNING_API_URL = process.env.NEXT_PUBLIC_VISUAL_LEARNING_API_URL || 'http://localhost:8089/api/visual-learning';

// Mind Map Types

export interface MindMapNode {
  id: string;
  label: string;
  color: string;
  x: number;
  y: number;
  parentId: string | null;
  notes?: string;
  images?: string[];
  links?: string[];
}

export interface MindMapConnection {
  id: string;
  sourceId: string;
  targetId: string;
  label?: string;
  style: 'solid' | 'dashed' | 'dotted';
}

export interface MindMap {
  id: string;
  userId: string;
  title: string;
  description: string;
  nodes: MindMapNode[];
  connections: MindMapConnection[];
  theme: 'light' | 'dark' | 'colorful';
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
  tags: string[];
}

export async function getMindMaps(userId: string): Promise<MindMap[]> {
  const response = await fetch(`${VISUAL_LEARNING_API_URL}/mind-maps?userId=${userId}`);
  if (!response.ok) throw new Error('Failed to fetch mind maps');
  return response.json();
}

export async function getMindMap(mapId: string): Promise<MindMap> {
  const response = await fetch(`${VISUAL_LEARNING_API_URL}/mind-maps/${mapId}`);
  if (!response.ok) throw new Error('Failed to fetch mind map');
  return response.json();
}

export async function createMindMap(data: {
  userId: string;
  title: string;
  description: string;
  theme?: string;
}): Promise<MindMap> {
  const response = await fetch(`${VISUAL_LEARNING_API_URL}/mind-maps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create mind map');
  return response.json();
}

export async function updateMindMap(mapId: string, data: Partial<MindMap>): Promise<MindMap> {
  const response = await fetch(`${VISUAL_LEARNING_API_URL}/mind-maps/${mapId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update mind map');
  return response.json();
}

export async function deleteMindMap(mapId: string): Promise<void> {
  const response = await fetch(`${VISUAL_LEARNING_API_URL}/mind-maps/${mapId}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete mind map');
}

export async function exportMindMap(mapId: string, format: 'png' | 'pdf' | 'json'): Promise<Blob> {
  const response = await fetch(`${VISUAL_LEARNING_API_URL}/mind-maps/${mapId}/export?format=${format}`);
  if (!response.ok) throw new Error('Failed to export mind map');
  return response.blob();
}

// Diagram Types

export interface DiagramShape {
  id: string;
  type: 'rectangle' | 'circle' | 'triangle' | 'diamond' | 'arrow' | 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  text?: string;
  fontSize?: number;
  rotation?: number;
}

export interface DiagramConnector {
  id: string;
  sourceId: string;
  targetId: string;
  type: 'straight' | 'curved' | 'stepped';
  label?: string;
  arrowStart: boolean;
  arrowEnd: boolean;
}

export interface Diagram {
  id: string;
  userId: string;
  title: string;
  description: string;
  type: 'flowchart' | 'sequence' | 'class' | 'entity-relationship' | 'network' | 'custom';
  shapes: DiagramShape[];
  connectors: DiagramConnector[];
  canvas: {
    width: number;
    height: number;
    backgroundColor: string;
    gridEnabled: boolean;
  };
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

export async function getDiagrams(userId: string): Promise<Diagram[]> {
  const response = await fetch(`${VISUAL_LEARNING_API_URL}/diagrams?userId=${userId}`);
  if (!response.ok) throw new Error('Failed to fetch diagrams');
  return response.json();
}

export async function getDiagram(diagramId: string): Promise<Diagram> {
  const response = await fetch(`${VISUAL_LEARNING_API_URL}/diagrams/${diagramId}`);
  if (!response.ok) throw new Error('Failed to fetch diagram');
  return response.json();
}

export async function createDiagram(data: {
  userId: string;
  title: string;
  description: string;
  type: string;
}): Promise<Diagram> {
  const response = await fetch(`${VISUAL_LEARNING_API_URL}/diagrams`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create diagram');
  return response.json();
}

export async function updateDiagram(diagramId: string, data: Partial<Diagram>): Promise<Diagram> {
  const response = await fetch(`${VISUAL_LEARNING_API_URL}/diagrams/${diagramId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update diagram');
  return response.json();
}

export async function deleteDiagram(diagramId: string): Promise<void> {
  const response = await fetch(`${VISUAL_LEARNING_API_URL}/diagrams/${diagramId}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete diagram');
}

export async function exportDiagram(diagramId: string, format: 'png' | 'svg' | 'pdf'): Promise<Blob> {
  const response = await fetch(`${VISUAL_LEARNING_API_URL}/diagrams/${diagramId}/export?format=${format}`);
  if (!response.ok) throw new Error('Failed to export diagram');
  return response.blob();
}

// Video Annotation Types

export interface VideoAnnotation {
  id: string;
  timestamp: number; // seconds
  type: 'note' | 'highlight' | 'question' | 'bookmark';
  content: string;
  color: string;
  x?: number; // for positional annotations
  y?: number;
  width?: number;
  height?: number;
}

export interface AnnotatedVideo {
  id: string;
  userId: string;
  title: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration: number; // seconds
  annotations: VideoAnnotation[];
  chapters: {
    id: string;
    title: string;
    startTime: number;
    endTime: number;
  }[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export async function getAnnotatedVideos(userId: string): Promise<AnnotatedVideo[]> {
  const response = await fetch(`${VISUAL_LEARNING_API_URL}/videos?userId=${userId}`);
  if (!response.ok) throw new Error('Failed to fetch annotated videos');
  return response.json();
}

export async function getAnnotatedVideo(videoId: string): Promise<AnnotatedVideo> {
  const response = await fetch(`${VISUAL_LEARNING_API_URL}/videos/${videoId}`);
  if (!response.ok) throw new Error('Failed to fetch annotated video');
  return response.json();
}

export async function createAnnotatedVideo(data: {
  userId: string;
  title: string;
  videoUrl: string;
  duration: number;
}): Promise<AnnotatedVideo> {
  const response = await fetch(`${VISUAL_LEARNING_API_URL}/videos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create annotated video');
  return response.json();
}

export async function addVideoAnnotation(
  videoId: string,
  annotation: Omit<VideoAnnotation, 'id'>
): Promise<AnnotatedVideo> {
  const response = await fetch(`${VISUAL_LEARNING_API_URL}/videos/${videoId}/annotations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(annotation),
  });
  if (!response.ok) throw new Error('Failed to add annotation');
  return response.json();
}

export async function updateVideoAnnotation(
  videoId: string,
  annotationId: string,
  data: Partial<VideoAnnotation>
): Promise<AnnotatedVideo> {
  const response = await fetch(
    `${VISUAL_LEARNING_API_URL}/videos/${videoId}/annotations/${annotationId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }
  );
  if (!response.ok) throw new Error('Failed to update annotation');
  return response.json();
}

export async function deleteVideoAnnotation(videoId: string, annotationId: string): Promise<AnnotatedVideo> {
  const response = await fetch(
    `${VISUAL_LEARNING_API_URL}/videos/${videoId}/annotations/${annotationId}`,
    {
      method: 'DELETE',
    }
  );
  if (!response.ok) throw new Error('Failed to delete annotation');
  return response.json();
}

export async function deleteAnnotatedVideo(videoId: string): Promise<void> {
  const response = await fetch(`${VISUAL_LEARNING_API_URL}/videos/${videoId}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete video');
}

// Visual Notes Types

export interface VisualNote {
  id: string;
  type: 'sketch' | 'diagram' | 'table' | 'chart' | 'mixed';
  content: string; // JSON or SVG data
  thumbnail?: string;
  position: number; // order in the notebook
}

export interface VisualNotebook {
  id: string;
  userId: string;
  title: string;
  description: string;
  subject?: string;
  notes: VisualNote[];
  backgroundColor: string;
  gridType: 'none' | 'dots' | 'lines' | 'graph';
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

export async function getVisualNotebooks(userId: string): Promise<VisualNotebook[]> {
  const response = await fetch(`${VISUAL_LEARNING_API_URL}/notebooks?userId=${userId}`);
  if (!response.ok) throw new Error('Failed to fetch visual notebooks');
  return response.json();
}

export async function getVisualNotebook(notebookId: string): Promise<VisualNotebook> {
  const response = await fetch(`${VISUAL_LEARNING_API_URL}/notebooks/${notebookId}`);
  if (!response.ok) throw new Error('Failed to fetch visual notebook');
  return response.json();
}

export async function createVisualNotebook(data: {
  userId: string;
  title: string;
  description: string;
  subject?: string;
}): Promise<VisualNotebook> {
  const response = await fetch(`${VISUAL_LEARNING_API_URL}/notebooks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create visual notebook');
  return response.json();
}

export async function updateVisualNotebook(
  notebookId: string,
  data: Partial<VisualNotebook>
): Promise<VisualNotebook> {
  const response = await fetch(`${VISUAL_LEARNING_API_URL}/notebooks/${notebookId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update visual notebook');
  return response.json();
}

export async function deleteVisualNotebook(notebookId: string): Promise<void> {
  const response = await fetch(`${VISUAL_LEARNING_API_URL}/notebooks/${notebookId}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete visual notebook');
}

export async function addVisualNote(
  notebookId: string,
  note: Omit<VisualNote, 'id'>
): Promise<VisualNotebook> {
  const response = await fetch(`${VISUAL_LEARNING_API_URL}/notebooks/${notebookId}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(note),
  });
  if (!response.ok) throw new Error('Failed to add visual note');
  return response.json();
}

export async function updateVisualNote(
  notebookId: string,
  noteId: string,
  data: Partial<VisualNote>
): Promise<VisualNotebook> {
  const response = await fetch(`${VISUAL_LEARNING_API_URL}/notebooks/${notebookId}/notes/${noteId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update visual note');
  return response.json();
}

export async function deleteVisualNote(notebookId: string, noteId: string): Promise<VisualNotebook> {
  const response = await fetch(`${VISUAL_LEARNING_API_URL}/notebooks/${notebookId}/notes/${noteId}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete visual note');
  return response.json();
}

export async function exportVisualNotebook(notebookId: string, format: 'pdf' | 'png'): Promise<Blob> {
  const response = await fetch(
    `${VISUAL_LEARNING_API_URL}/notebooks/${notebookId}/export?format=${format}`
  );
  if (!response.ok) throw new Error('Failed to export visual notebook');
  return response.blob();
}
