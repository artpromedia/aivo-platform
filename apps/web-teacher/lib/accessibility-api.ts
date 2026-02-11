import { getEnvUrl } from '../src/lib/utils';

const API_BASE = getEnvUrl('NEXT_PUBLIC_ACCESSIBILITY_SVC_URL', 'http://localhost:8092', { serviceName: 'accessibility-svc' });

// ============================================================================
// Types - Accommodation Management
// ============================================================================

export interface Accommodation {
  id: string;
  studentId: string;
  type: 'visual' | 'auditory' | 'physical' | 'cognitive' | 'behavioral' | 'testing' | 'other';
  category: string;
  title: string;
  description: string;
  implementation: string;
  frequency: 'always' | 'asNeeded' | 'scheduled';
  status: 'active' | 'inactive' | 'trial' | 'discontinued';
  effectiveness: 1 | 2 | 3 | 4 | 5;
  startDate: string;
  endDate?: string;
  reviewDate?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  lastModified: string;
}

export interface AccommodationTemplate {
  id: string;
  name: string;
  type: Accommodation['type'];
  category: string;
  description: string;
  implementation: string;
  commonFor: string[];
  tags: string[];
}

// ============================================================================
// Types - Progress Monitoring
// ============================================================================

export interface ProgressGoal {
  id: string;
  studentId: string;
  domain: 'academic' | 'behavioral' | 'social' | 'communication' | 'motor' | 'adaptive';
  subject?: string;
  goal: string;
  baseline: string;
  target: string;
  targetDate: string;
  measurementMethod: string;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  status: 'notStarted' | 'inProgress' | 'achieved' | 'discontinued';
  progress: number;
  createdAt: string;
  lastUpdated: string;
}

export interface ProgressDataPoint {
  id: string;
  goalId: string;
  studentId: string;
  date: string;
  value: number;
  notes?: string;
  recordedBy: string;
  createdAt: string;
}

export interface ProgressReport {
  goalId: string;
  goal: ProgressGoal;
  dataPoints: ProgressDataPoint[];
  trend: 'improving' | 'stable' | 'declining';
  projectedAchievement?: string;
  insights: string[];
  recommendations: string[];
}

// ============================================================================
// Types - IEP Integration
// ============================================================================

export interface IEPGoal {
  id: string;
  studentId: string;
  iepId: string;
  domain: string;
  annualGoal: string;
  shortTermObjectives: IEPObjective[];
  accommodations: string[];
  services: string[];
  progressReporting: 'quarterly' | 'trimester' | 'semester';
  status: 'active' | 'achieved' | 'modified' | 'discontinued';
  startDate: string;
  endDate: string;
  createdAt: string;
  lastModified: string;
}

export interface IEPObjective {
  id: string;
  objective: string;
  criteria: string;
  method: string;
  schedule: string;
  status: 'notStarted' | 'inProgress' | 'achieved';
  progress: number;
  lastAssessed?: string;
}

export interface IEPDocument {
  id: string;
  studentId: string;
  meetingDate: string;
  effectiveDate: string;
  expirationDate: string;
  status: 'draft' | 'active' | 'expired' | 'amended';
  goals: string[];
  accommodations: string[];
  services: IEPService[];
  team: IEPTeamMember[];
  documents: IEPAttachment[];
  createdAt: string;
  lastModified: string;
}

export interface IEPService {
  type: string;
  frequency: string;
  duration: number;
  location: string;
  provider: string;
}

export interface IEPTeamMember {
  name: string;
  role: string;
  email: string;
}

export interface IEPAttachment {
  id: string;
  name: string;
  type: string;
  url: string;
  uploadedAt: string;
}

// ============================================================================
// Types - Resource Library
// ============================================================================

export interface AccessibilityResource {
  id: string;
  title: string;
  category: 'strategy' | 'tool' | 'lesson' | 'video' | 'article' | 'template' | 'checklist';
  type: 'visual' | 'auditory' | 'physical' | 'cognitive' | 'behavioral' | 'general';
  description: string;
  content?: string;
  url?: string;
  fileUrl?: string;
  thumbnailUrl?: string;
  gradeLevel: string[];
  subjects: string[];
  disabilities: string[];
  tags: string[];
  rating: number;
  downloads: number;
  createdBy: string;
  createdAt: string;
  lastModified: string;
}

export interface ResourceCollection {
  id: string;
  name: string;
  description: string;
  teacherId: string;
  resources: string[];
  isPublic: boolean;
  createdAt: string;
  lastModified: string;
}

// ============================================================================
// API Functions - Accommodation Management
// ============================================================================

export async function getAccommodations(studentId: string): Promise<Accommodation[]> {
  const response = await fetch(`${API_BASE}/accommodations?studentId=${studentId}`);
  return response.json();
}

export async function createAccommodation(data: Omit<Accommodation, 'id' | 'createdAt' | 'lastModified'>): Promise<Accommodation> {
  const response = await fetch(`${API_BASE}/accommodations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function updateAccommodation(id: string, data: Partial<Accommodation>): Promise<Accommodation> {
  const response = await fetch(`${API_BASE}/accommodations/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function deleteAccommodation(id: string): Promise<void> {
  await fetch(`${API_BASE}/accommodations/${id}`, { method: 'DELETE' });
}

export async function getAccommodationTemplates(): Promise<AccommodationTemplate[]> {
  const response = await fetch(`${API_BASE}/accommodations/templates`);
  return response.json();
}

// ============================================================================
// API Functions - Progress Monitoring
// ============================================================================

export async function getProgressGoals(studentId: string): Promise<ProgressGoal[]> {
  const response = await fetch(`${API_BASE}/progress/goals?studentId=${studentId}`);
  return response.json();
}

export async function createProgressGoal(data: Omit<ProgressGoal, 'id' | 'createdAt' | 'lastUpdated'>): Promise<ProgressGoal> {
  const response = await fetch(`${API_BASE}/progress/goals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function updateProgressGoal(id: string, data: Partial<ProgressGoal>): Promise<ProgressGoal> {
  const response = await fetch(`${API_BASE}/progress/goals/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function deleteProgressGoal(id: string): Promise<void> {
  await fetch(`${API_BASE}/progress/goals/${id}`, { method: 'DELETE' });
}

export async function getProgressData(goalId: string): Promise<ProgressDataPoint[]> {
  const response = await fetch(`${API_BASE}/progress/data?goalId=${goalId}`);
  return response.json();
}

export async function recordProgress(data: Omit<ProgressDataPoint, 'id' | 'createdAt'>): Promise<ProgressDataPoint> {
  const response = await fetch(`${API_BASE}/progress/data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function getProgressReport(goalId: string): Promise<ProgressReport> {
  const response = await fetch(`${API_BASE}/progress/reports/${goalId}`);
  return response.json();
}

// ============================================================================
// API Functions - IEP Integration
// ============================================================================

export async function getIEPDocuments(studentId: string): Promise<IEPDocument[]> {
  const response = await fetch(`${API_BASE}/iep/documents?studentId=${studentId}`);
  return response.json();
}

export async function getIEPGoals(studentId: string): Promise<IEPGoal[]> {
  const response = await fetch(`${API_BASE}/iep/goals?studentId=${studentId}`);
  return response.json();
}

export async function createIEPGoal(data: Omit<IEPGoal, 'id' | 'createdAt' | 'lastModified'>): Promise<IEPGoal> {
  const response = await fetch(`${API_BASE}/iep/goals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function updateIEPGoal(id: string, data: Partial<IEPGoal>): Promise<IEPGoal> {
  const response = await fetch(`${API_BASE}/iep/goals/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function updateObjectiveProgress(goalId: string, objectiveId: string, progress: number, status: IEPObjective['status']): Promise<IEPGoal> {
  const response = await fetch(`${API_BASE}/iep/goals/${goalId}/objectives/${objectiveId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ progress, status }),
  });
  return response.json();
}

export async function createIEPDocument(data: Omit<IEPDocument, 'id' | 'createdAt' | 'lastModified'>): Promise<IEPDocument> {
  const response = await fetch(`${API_BASE}/iep/documents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
}

// ============================================================================
// API Functions - Resource Library
// ============================================================================

export async function getResources(filters?: {
  category?: AccessibilityResource['category'];
  type?: AccessibilityResource['type'];
  subject?: string;
  disability?: string;
}): Promise<AccessibilityResource[]> {
  const params = new URLSearchParams();
  if (filters?.category) params.append('category', filters.category);
  if (filters?.type) params.append('type', filters.type);
  if (filters?.subject) params.append('subject', filters.subject);
  if (filters?.disability) params.append('disability', filters.disability);
  
  const response = await fetch(`${API_BASE}/resources?${params.toString()}`);
  return response.json();
}

export async function createResource(data: Omit<AccessibilityResource, 'id' | 'rating' | 'downloads' | 'createdAt' | 'lastModified'>): Promise<AccessibilityResource> {
  const response = await fetch(`${API_BASE}/resources`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function updateResource(id: string, data: Partial<AccessibilityResource>): Promise<AccessibilityResource> {
  const response = await fetch(`${API_BASE}/resources/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function deleteResource(id: string): Promise<void> {
  await fetch(`${API_BASE}/resources/${id}`, { method: 'DELETE' });
}

export async function getCollections(teacherId: string): Promise<ResourceCollection[]> {
  const response = await fetch(`${API_BASE}/resources/collections?teacherId=${teacherId}`);
  return response.json();
}

export async function createCollection(data: Omit<ResourceCollection, 'id' | 'createdAt' | 'lastModified'>): Promise<ResourceCollection> {
  const response = await fetch(`${API_BASE}/resources/collections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function addToCollection(collectionId: string, resourceId: string): Promise<ResourceCollection> {
  const response = await fetch(`${API_BASE}/resources/collections/${collectionId}/resources`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resourceId }),
  });
  return response.json();
}

export async function removeFromCollection(collectionId: string, resourceId: string): Promise<ResourceCollection> {
  const response = await fetch(`${API_BASE}/resources/collections/${collectionId}/resources/${resourceId}`, {
    method: 'DELETE',
  });
  return response.json();
}
