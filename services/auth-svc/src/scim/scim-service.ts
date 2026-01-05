/**
 * SCIM 2.0 Provisioning Service
 *
 * Handles automated user provisioning via SCIM protocol.
 * Supports Users and Groups resources.
 */

import type {
  ScimUser,
  ScimListResponse,
  ScimPatchRequest,
  ScimError,
  ScimMeta,
  ScimBulkRequest,
  ScimBulkResponse,
} from './types';
import { SCIM_SCHEMAS } from './types';

// Aivo user type (simplified)
export interface AivoUser {
  id: string;
  tenantId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  role: 'LEARNER' | 'PARENT' | 'TEACHER' | 'SCHOOL_ADMIN' | 'DISTRICT_ADMIN' | 'PLATFORM_ADMIN';
  active: boolean;
  externalId?: string;
  schoolId?: string;
  gradeLevel?: string;
  studentId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRepository {
  findById(tenantId: string, id: string): Promise<AivoUser | null>;
  findByExternalId(tenantId: string, externalId: string): Promise<AivoUser | null>;
  findByEmail(tenantId: string, email: string): Promise<AivoUser | null>;
  findMany(
    tenantId: string,
    options: {
      filter?: string;
      startIndex?: number;
      count?: number;
      sortBy?: string;
      sortOrder?: 'ascending' | 'descending';
    }
  ): Promise<{ users: AivoUser[]; totalCount: number }>;
  create(
    tenantId: string,
    user: Omit<AivoUser, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<AivoUser>;
  update(tenantId: string, id: string, user: Partial<AivoUser>): Promise<AivoUser>;
  delete(tenantId: string, id: string): Promise<void>;
}

export interface ScimConfig {
  baseUrl: string;
  maxResults: number;
  maxBulkOperations: number;
}

const DEFAULT_CONFIG: ScimConfig = {
  baseUrl: '/scim/v2',
  maxResults: 100,
  maxBulkOperations: 1000,
};

export class ScimService {
  private config: ScimConfig;

  constructor(
    private userRepository: UserRepository,
    config: Partial<ScimConfig> = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // USER OPERATIONS
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Get a user by ID
   */
  async getUser(tenantId: string, id: string): Promise<ScimUser | ScimError> {
    const user = await this.userRepository.findById(tenantId, id);

    if (!user) {
      return this.createError('404', 'User not found');
    }

    return this.toScimUser(user);
  }

  /**
   * List users with filtering and pagination
   */
  async listUsers(
    tenantId: string,
    options: {
      filter?: string;
      startIndex?: number;
      count?: number;
      sortBy?: string;
      sortOrder?: 'ascending' | 'descending';
    }
  ): Promise<ScimListResponse<ScimUser>> {
    const startIndex = Math.max(1, options.startIndex || 1);
    const count = Math.min(this.config.maxResults, options.count || 100);

    const { users, totalCount } = await this.userRepository.findMany(tenantId, {
      filter: options.filter,
      startIndex,
      count,
      sortBy: options.sortBy,
      sortOrder: options.sortOrder,
    });

    return {
      schemas: [SCIM_SCHEMAS.LIST_RESPONSE],
      totalResults: totalCount,
      startIndex,
      itemsPerPage: users.length,
      Resources: users.map((u) => this.toScimUser(u)),
    };
  }

  /**
   * Create a new user
   */
  async createUser(tenantId: string, scimUser: ScimUser): Promise<ScimUser | ScimError> {
    // Check for existing user by externalId or userName
    if (scimUser.externalId) {
      const existing = await this.userRepository.findByExternalId(tenantId, scimUser.externalId);
      if (existing) {
        return this.createError('409', 'User with this externalId already exists', 'uniqueness');
      }
    }

    const existingByEmail = await this.userRepository.findByEmail(tenantId, scimUser.userName);
    if (existingByEmail) {
      return this.createError(
        '409',
        'User with this userName (email) already exists',
        'uniqueness'
      );
    }

    // Map SCIM user to Aivo user
    const aivoUser = this.fromScimUser(scimUser, tenantId);

    const created = await this.userRepository.create(tenantId, aivoUser);

    return this.toScimUser(created);
  }

  /**
   * Replace a user (full update)
   */
  async replaceUser(
    tenantId: string,
    id: string,
    scimUser: ScimUser
  ): Promise<ScimUser | ScimError> {
    const existing = await this.userRepository.findById(tenantId, id);

    if (!existing) {
      return this.createError('404', 'User not found');
    }

    // Map and update
    const updates = this.fromScimUser(scimUser, tenantId);
    const updated = await this.userRepository.update(tenantId, id, updates);

    return this.toScimUser(updated);
  }

  /**
   * Patch a user (partial update)
   */
  async patchUser(
    tenantId: string,
    id: string,
    patchRequest: ScimPatchRequest
  ): Promise<ScimUser | ScimError> {
    const existing = await this.userRepository.findById(tenantId, id);

    if (!existing) {
      return this.createError('404', 'User not found');
    }

    // Apply patch operations
    const updates: Partial<AivoUser> = {};

    for (const op of patchRequest.Operations) {
      const result = this.applyPatchOperation(existing, op, updates);
      if ('status' in result) {
        return result; // Return error
      }
    }

    const updated = await this.userRepository.update(tenantId, id, updates);

    return this.toScimUser(updated);
  }

  /**
   * Delete a user
   */
  async deleteUser(tenantId: string, id: string): Promise<ScimError | undefined> {
    const existing = await this.userRepository.findById(tenantId, id);

    if (!existing) {
      return this.createError('404', 'User not found');
    }

    await this.userRepository.delete(tenantId, id);
    return undefined;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // BULK OPERATIONS
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Process bulk request
   */
  async processBulkRequest(tenantId: string, request: ScimBulkRequest): Promise<ScimBulkResponse> {
    const results: ScimBulkResponse['Operations'] = [];
    let errorCount = 0;
    const failOnErrors = request.failOnErrors || 0;

    for (const op of request.Operations) {
      // Check if we should stop on errors
      if (failOnErrors > 0 && errorCount >= failOnErrors) {
        break;
      }

      try {
        const result = await this.processBulkOperation(tenantId, op);
        results.push(result);

        if (result.status.startsWith('4') || result.status.startsWith('5')) {
          errorCount++;
        }
      } catch (error) {
        errorCount++;
        results.push({
          method: op.method,
          bulkId: op.bulkId,
          status: '500',
          response: this.createError(
            '500',
            error instanceof Error ? error.message : 'Unknown error'
          ),
        });
      }
    }

    return {
      schemas: [SCIM_SCHEMAS.BULK_RESPONSE],
      Operations: results,
    };
  }

  private async processBulkOperation(
    tenantId: string,
    op: ScimBulkRequest['Operations'][0]
  ): Promise<ScimBulkResponse['Operations'][0]> {
    const pathMatch = /\/Users(\/([^/]+))?/.exec(op.path);

    if (!pathMatch) {
      return {
        method: op.method,
        bulkId: op.bulkId,
        status: '400',
        response: this.createError('400', 'Invalid path'),
      };
    }

    const userId = pathMatch[2];

    switch (op.method) {
      case 'POST': {
        const result = await this.createUser(tenantId, op.data as ScimUser);
        if ('status' in result) {
          return { method: op.method, bulkId: op.bulkId, status: result.status, response: result };
        }
        return {
          method: op.method,
          bulkId: op.bulkId,
          status: '201',
          location: `${this.config.baseUrl}/Users/${result.id}`,
          response: result,
        };
      }

      case 'PUT': {
        if (!userId) {
          return {
            method: op.method,
            bulkId: op.bulkId,
            status: '400',
            response: this.createError('400', 'User ID required'),
          };
        }
        const result = await this.replaceUser(tenantId, userId, op.data as ScimUser);
        if ('status' in result) {
          return { method: op.method, bulkId: op.bulkId, status: result.status, response: result };
        }
        return { method: op.method, bulkId: op.bulkId, status: '200', response: result };
      }

      case 'PATCH': {
        if (!userId) {
          return {
            method: op.method,
            bulkId: op.bulkId,
            status: '400',
            response: this.createError('400', 'User ID required'),
          };
        }
        const result = await this.patchUser(tenantId, userId, op.data as ScimPatchRequest);
        if ('status' in result) {
          return { method: op.method, bulkId: op.bulkId, status: result.status, response: result };
        }
        return { method: op.method, bulkId: op.bulkId, status: '200', response: result };
      }

      case 'DELETE': {
        if (!userId) {
          return {
            method: op.method,
            bulkId: op.bulkId,
            status: '400',
            response: this.createError('400', 'User ID required'),
          };
        }
        const result = await this.deleteUser(tenantId, userId);
        if (result && 'status' in result) {
          return { method: op.method, bulkId: op.bulkId, status: result.status, response: result };
        }
        return { method: op.method, bulkId: op.bulkId, status: '204' };
      }

      default:
        return {
          method: op.method,
          bulkId: op.bulkId,
          status: '400',
          response: this.createError('400', 'Invalid method'),
        };
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SERVICE PROVIDER CONFIG
  // ══════════════════════════════════════════════════════════════════════════

  getServiceProviderConfig() {
    return {
      schemas: [SCIM_SCHEMAS.SERVICE_PROVIDER_CONFIG],
      documentationUri: 'https://docs.aivo.com/scim',
      patch: { supported: true },
      bulk: {
        supported: true,
        maxOperations: this.config.maxBulkOperations,
        maxPayloadSize: 1048576, // 1MB
      },
      filter: {
        supported: true,
        maxResults: this.config.maxResults,
      },
      changePassword: { supported: false },
      sort: { supported: true },
      etag: { supported: false },
      authenticationSchemes: [
        {
          type: 'oauthbearertoken' as const,
          name: 'OAuth Bearer Token',
          description: 'Authentication using OAuth 2.0 Bearer Token',
          specUri: 'https://tools.ietf.org/html/rfc6750',
          primary: true,
        },
      ],
      meta: {
        resourceType: 'ServiceProviderConfig' as const,
        location: `${this.config.baseUrl}/ServiceProviderConfig`,
      },
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MAPPING HELPERS
  // ══════════════════════════════════════════════════════════════════════════

  private toScimUser(user: AivoUser): ScimUser {
    const meta: ScimMeta = {
      resourceType: 'User',
      created: user.createdAt.toISOString(),
      lastModified: user.updatedAt.toISOString(),
      location: `${this.config.baseUrl}/Users/${user.id}`,
    };

    const scimUser: ScimUser = {
      schemas: [SCIM_SCHEMAS.USER, SCIM_SCHEMAS.ENTERPRISE_USER, SCIM_SCHEMAS.AIVO_USER],
      id: user.id,
      externalId: user.externalId,
      meta,
      userName: user.email,
      name: {
        givenName: user.firstName,
        familyName: user.lastName,
        formatted: [user.firstName, user.lastName].filter(Boolean).join(' '),
      },
      displayName: user.displayName || [user.firstName, user.lastName].filter(Boolean).join(' '),
      active: user.active,
      emails: [
        {
          value: user.email,
          type: 'work',
          primary: true,
        },
      ],
      'urn:aivo:scim:schemas:extension:1.0:User': {
        role: user.role as any,
        schoolId: user.schoolId,
        gradeLevel: user.gradeLevel,
        studentId: user.studentId,
      },
    };

    return scimUser;
  }

  private fromScimUser(
    scimUser: ScimUser,
    tenantId: string
  ): Omit<AivoUser, 'id' | 'createdAt' | 'updatedAt'> {
    const aivoExtension = scimUser['urn:aivo:scim:schemas:extension:1.0:User'];
    const primaryEmail = scimUser.emails?.find((e) => e.primary)?.value || scimUser.userName;

    return {
      tenantId,
      email: primaryEmail,
      firstName: scimUser.name?.givenName,
      lastName: scimUser.name?.familyName,
      displayName: scimUser.displayName,
      role: aivoExtension?.role || 'LEARNER',
      active: scimUser.active ?? true,
      externalId: scimUser.externalId,
      schoolId: aivoExtension?.schoolId,
      gradeLevel: aivoExtension?.gradeLevel,
      studentId: aivoExtension?.studentId,
    };
  }

  private applyPatchOperation(
    existing: AivoUser,
    op: ScimPatchRequest['Operations'][0],
    updates: Partial<AivoUser>
  ): Partial<AivoUser> | ScimError {
    const path = op.path?.toLowerCase();

    switch (op.op) {
      case 'replace':
        if (!path || path === '') {
          // Replace entire resource
          if (typeof op.value === 'object' && op.value !== null) {
            Object.assign(updates, this.mapPatchValue(op.value));
          }
        } else if (path === 'active') {
          updates.active = op.value as boolean;
        } else if (path === 'name.givenname') {
          updates.firstName = op.value as string;
        } else if (path === 'name.familyname') {
          updates.lastName = op.value as string;
        } else if (path === 'displayname') {
          updates.displayName = op.value as string;
        } else if (path === 'username') {
          updates.email = op.value as string;
        }
        break;

      case 'add':
        // Handle add operations similarly
        if (path === 'emails') {
          const emails = op.value as { value: string }[];
          if (emails?.[0]?.value) {
            updates.email = emails[0].value;
          }
        }
        break;

      case 'remove':
        // Handle remove by setting to null/undefined
        if (path === 'name.givenname') {
          updates.firstName = undefined;
        } else if (path === 'name.familyname') {
          updates.lastName = undefined;
        }
        break;

      default:
        return this.createError('400', `Unknown operation: ${op.op}`, 'invalidSyntax');
    }

    return updates;
  }

  private mapPatchValue(value: Record<string, unknown>): Partial<AivoUser> {
    const updates: Partial<AivoUser> = {};

    if ('active' in value) updates.active = value.active as boolean;
    if ('displayName' in value) updates.displayName = value.displayName as string;
    if ('name' in value && typeof value.name === 'object' && value.name !== null) {
      const name = value.name as { givenName?: string; familyName?: string };
      if (name.givenName) updates.firstName = name.givenName;
      if (name.familyName) updates.lastName = name.familyName;
    }

    return updates;
  }

  private createError(status: string, detail: string, scimType?: ScimError['scimType']): ScimError {
    return {
      schemas: [SCIM_SCHEMAS.ERROR],
      status,
      detail,
      scimType,
    };
  }
}

export default ScimService;
