/**
 * Sensory Incident Service - STUB
 *
 * Original file backed up to ../sensory.bak/
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

import type { CreateSensoryIncidentInput } from './sensory-compat-types.js';

export interface SensoryIncident {
  id: string;
  learnerId: string;
  [key: string]: any;
}

export class SensoryIncidentService {
  async create(input: CreateSensoryIncidentInput): Promise<SensoryIncident> {
    // Stub implementation
    return {
      id: 'stub-id',
      learnerId: input.learnerId,
    };
  }

  async getByLearnerId(learnerId: string): Promise<SensoryIncident[]> {
    // Stub implementation
    return [];
  }
}

export const sensoryIncidentService = new SensoryIncidentService();
