/**
 * Incidents Module Exports
 *
 * Centralizes AI safety incident logging and management.
 */

export {
  AiIncidentService,
  AiIncidentService as IncidentService,
  createIncidentService,
  type AiIncidentRecord,
  type IncidentFilters,
  type IncidentListResult,
  type ReviewIncidentInput,
} from './incidentService.js';

export type { IncidentCategory, IncidentSeverity, IncidentInput } from '../types/aiRequest.js';
