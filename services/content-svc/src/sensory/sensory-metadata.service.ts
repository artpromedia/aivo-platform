/**
 * Sensory Metadata Service - STUB
 *
 * Original file backed up to ../sensory.bak/
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

import type { CreateSensoryMetadataInput, ContentSensoryMetadata } from './sensory-compat-types.js';

export class SensoryMetadataService {
  async create(input: CreateSensoryMetadataInput): Promise<ContentSensoryMetadata> {
    // Stub implementation
    return {
      id: 'stub-id',
      learningObjectVersionId: input.learningObjectVersionId,
    };
  }

  async getByVersionId(versionId: string): Promise<ContentSensoryMetadata | null> {
    // Stub implementation
    return null;
  }

  async update(
    id: string,
    input: Partial<CreateSensoryMetadataInput>
  ): Promise<ContentSensoryMetadata> {
    // Stub implementation
    return {
      id,
      learningObjectVersionId: id,
    };
  }
}

export const sensoryMetadataService = new SensoryMetadataService();
