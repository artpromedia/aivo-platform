/**
 * Curriculum Alignment Routes
 * 
 * API endpoints for international curriculum framework management
 */

import { type FastifyInstance, type FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { CurriculumFrameworkCode, StandardizedSubject } from '../../generated/prisma-client/index.js';
import * as curriculumService from '../services/curriculum.service.js';

// ══════════════════════════════════════════════════════════════════════════════
// Validation Schemas
// ══════════════════════════════════════════════════════════════════════════════

const CurriculumFrameworkCodeSchema = z.nativeEnum(CurriculumFrameworkCode);
const StandardizedSubjectSchema = z.nativeEnum(StandardizedSubject);

const GetFrameworksQuerySchema = z.object({
  countryCode: z.string().length(2).optional(),
  isActive: z.coerce.boolean().optional(),
});

const GradeConversionQuerySchema = z.object({
  sourceFrameworkId: z.string().uuid(),
  gradeLevel: z.coerce.number().int().min(0).max(12),
  targetFrameworkIds: z.string().optional(), // Comma-separated UUIDs
});

const GetStandardsQuerySchema = z.object({
  frameworkId: z.string().uuid(),
  subjectMappingId: z.string().uuid().optional(),
  gradeLevel: z.coerce.number().int().optional(),
  gradeBand: z.string().optional(),
  hierarchyLevel: z.coerce.number().int().optional(),
  parentStandardId: z.string().uuid().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

const SearchStandardsQuerySchema = z.object({
  query: z.string().min(1),
  frameworkIds: z.string().optional(), // Comma-separated UUIDs
  subjects: z.string().optional(), // Comma-separated StandardizedSubject values
  gradeLevels: z.string().optional(), // Comma-separated integers
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

const ContentAlignmentInputSchema = z.object({
  learningObjectId: z.string().uuid(),
  learningObjectVersionId: z.string().uuid().optional(),
  frameworkId: z.string().uuid(),
  alignedGradeLevel: z.number().int().optional(),
  alignedGradeBand: z.string().optional(),
  alignmentScore: z.number().min(0).max(1).optional(),
  isPrimary: z.boolean().optional(),
  standardAlignments: z.array(z.object({
    standardId: z.string().uuid(),
    alignmentStrength: z.enum(['PRIMARY', 'SUPPORTING', 'PREREQUISITE', 'EXTENSION']),
    coveragePercent: z.number().int().min(0).max(100).optional(),
    alignmentNotes: z.string().optional(),
  })).optional(),
});

const StandardEquivalencyInputSchema = z.object({
  sourceStandardId: z.string().uuid(),
  targetStandardId: z.string().uuid(),
  equivalencyType: z.enum(['EXACT', 'PARTIAL', 'BROADER', 'NARROWER', 'RELATED']),
  confidenceScore: z.number().min(0).max(1),
  notes: z.string().optional(),
  mappingSource: z.enum(['MANUAL', 'AI_GENERATED', 'OFFICIAL']),
});

// ══════════════════════════════════════════════════════════════════════════════
// Routes
// ══════════════════════════════════════════════════════════════════════════════

export const curriculumRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // ─────────────────────────────────────────────────────────────────────────────
  // Curriculum Frameworks
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * GET /curricula/frameworks
   * List all curriculum frameworks
   */
  fastify.get('/curricula/frameworks', async (request: any, reply) => {
    try {
      const query = GetFrameworksQuerySchema.parse(request.query);
      const frameworks = await curriculumService.getAllCurriculumFrameworks(query);
      
      return {
        success: true,
        data: frameworks,
        meta: { total: frameworks.length },
      };
    } catch (error: any) {
      request.log.error(error);
      return reply.status(400).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * GET /curricula/frameworks/:code
   * Get curriculum framework by code
   */
  fastify.get('/curricula/frameworks/:code', async (request: any, reply) => {
    try {
      const code = CurriculumFrameworkCodeSchema.parse(request.params.code);
      const framework = await curriculumService.getCurriculumFrameworkByCode(code);
      
      if (!framework) {
        return reply.status(404).send({
          success: false,
          error: 'Curriculum framework not found',
        });
      }
      
      return { success: true, data: framework };
    } catch (error: any) {
      request.log.error(error);
      return reply.status(400).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * GET /curricula/frameworks/:id/details
   * Get curriculum framework by ID with full details
   */
  fastify.get('/curricula/frameworks/:id/details', async (request: any, reply) => {
    try {
      const { id } = request.params;
      const framework = await curriculumService.getCurriculumFrameworkById(id);
      
      if (!framework) {
        return reply.status(404).send({
          success: false,
          error: 'Curriculum framework not found',
        });
      }
      
      return { success: true, data: framework };
    } catch (error: any) {
      request.log.error(error);
      return reply.status(400).send({
        success: false,
        error: error.message,
      });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Grade Equivalencies
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * GET /curricula/grades/equivalencies
   * Get grade equivalencies by standardized level
   */
  fastify.get('/curricula/grades/equivalencies', async (request: any, reply) => {
    try {
      const { level } = request.query;
      if (level === undefined) {
        return reply.status(400).send({
          success: false,
          error: 'level query parameter is required',
        });
      }
      
      const standardizedLevel = parseInt(level, 10);
      const equivalencies = await curriculumService.getGradeEquivalenciesByLevel(standardizedLevel);
      
      return {
        success: true,
        data: {
          standardizedLevel,
          equivalencies,
        },
      };
    } catch (error: any) {
      request.log.error(error);
      return reply.status(400).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * GET /curricula/grades/convert
   * Convert a grade from one framework to equivalents in other frameworks
   */
  fastify.get('/curricula/grades/convert', async (request: any, reply) => {
    try {
      const query = GradeConversionQuerySchema.parse(request.query);
      const targetFrameworkIds = query.targetFrameworkIds?.split(',').filter(Boolean);
      
      const result = await curriculumService.convertGradeAcrossFrameworks(
        query.sourceFrameworkId,
        query.gradeLevel,
        targetFrameworkIds
      );
      
      if (!result) {
        return reply.status(404).send({
          success: false,
          error: 'Source grade not found',
        });
      }
      
      return { success: true, data: result };
    } catch (error: any) {
      request.log.error(error);
      return reply.status(400).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * GET /curricula/frameworks/:frameworkId/grades
   * Get all grade equivalencies for a framework
   */
  fastify.get('/curricula/frameworks/:frameworkId/grades', async (request: any, reply) => {
    try {
      const { frameworkId } = request.params;
      const grades = await curriculumService.getGradeEquivalenciesForFramework(frameworkId);
      
      return {
        success: true,
        data: grades,
        meta: { total: grades.length },
      };
    } catch (error: any) {
      request.log.error(error);
      return reply.status(400).send({
        success: false,
        error: error.message,
      });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Subject Mappings
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * GET /curricula/subjects
   * List standardized subjects
   */
  fastify.get('/curricula/subjects', async (request: any, reply) => {
    const subjects = Object.values(StandardizedSubject).map(s => ({
      code: s,
      name: s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
    }));
    
    return {
      success: true,
      data: subjects,
      meta: { total: subjects.length },
    };
  });

  /**
   * GET /curricula/subjects/:subject/mappings
   * Get subject mappings for a standardized subject across frameworks
   */
  fastify.get('/curricula/subjects/:subject/mappings', async (request: any, reply) => {
    try {
      const subject = StandardizedSubjectSchema.parse(request.params.subject);
      const { frameworkIds } = request.query;
      
      const frameworkIdArray = frameworkIds?.split(',').filter(Boolean);
      const mappings = await curriculumService.getSubjectMappingsForStandardizedSubject(
        subject,
        frameworkIdArray
      );
      
      return {
        success: true,
        data: mappings,
        meta: { total: mappings.length },
      };
    } catch (error: any) {
      request.log.error(error);
      return reply.status(400).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * GET /curricula/frameworks/:frameworkId/subjects
   * Get all subject mappings for a framework
   */
  fastify.get('/curricula/frameworks/:frameworkId/subjects', async (request: any, reply) => {
    try {
      const { frameworkId } = request.params;
      const mappings = await curriculumService.getSubjectMappingsForFramework(frameworkId);
      
      return {
        success: true,
        data: mappings,
        meta: { total: mappings.length },
      };
    } catch (error: any) {
      request.log.error(error);
      return reply.status(400).send({
        success: false,
        error: error.message,
      });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Learning Standards
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * GET /curricula/standards
   * Get learning standards with filtering
   */
  fastify.get('/curricula/standards', async (request: any, reply) => {
    try {
      const query = GetStandardsQuerySchema.parse(request.query);
      const result = await curriculumService.getLearningStandards({
        frameworkId: query.frameworkId,
        subjectMappingId: query.subjectMappingId,
        gradeLevel: query.gradeLevel,
        gradeBand: query.gradeBand,
        hierarchyLevel: query.hierarchyLevel,
        parentStandardId: query.parentStandardId,
        search: query.search,
        limit: query.limit,
        offset: query.offset,
      });
      
      return {
        success: true,
        data: result.standards,
        meta: {
          total: result.total,
          limit: query.limit,
          offset: query.offset,
        },
      };
    } catch (error: any) {
      request.log.error(error);
      return reply.status(400).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * GET /curricula/standards/search
   * Search for standards across frameworks
   */
  fastify.get('/curricula/standards/search', async (request: any, reply) => {
    try {
      const query = SearchStandardsQuerySchema.parse(request.query);
      
      const frameworkIds = query.frameworkIds?.split(',').filter(Boolean);
      const subjects = query.subjects?.split(',').filter(Boolean) as StandardizedSubject[] | undefined;
      const gradeLevels = query.gradeLevels?.split(',').filter(Boolean).map(Number);
      
      const standards = await curriculumService.searchStandards({
        query: query.query,
        frameworkIds,
        standardizedSubjects: subjects,
        gradeLevels,
        limit: query.limit,
      });
      
      return {
        success: true,
        data: standards,
        meta: { total: standards.length },
      };
    } catch (error: any) {
      request.log.error(error);
      return reply.status(400).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * GET /curricula/standards/:id
   * Get a learning standard by ID with full details
   */
  fastify.get('/curricula/standards/:id', async (request: any, reply) => {
    try {
      const { id } = request.params;
      const standard = await curriculumService.getLearningStandardById(id);
      
      if (!standard) {
        return reply.status(404).send({
          success: false,
          error: 'Learning standard not found',
        });
      }
      
      return { success: true, data: standard };
    } catch (error: any) {
      request.log.error(error);
      return reply.status(400).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * GET /curricula/standards/:id/equivalents
   * Get equivalent standards in other frameworks
   */
  fastify.get('/curricula/standards/:id/equivalents', async (request: any, reply) => {
    try {
      const { id } = request.params;
      const equivalents = await curriculumService.getEquivalentStandards(id);
      
      return {
        success: true,
        data: equivalents,
        meta: { total: equivalents.length },
      };
    } catch (error: any) {
      request.log.error(error);
      return reply.status(400).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * POST /curricula/standards/equivalencies
   * Create a standard equivalency mapping
   */
  fastify.post('/curricula/standards/equivalencies', async (request: any, reply) => {
    try {
      const input = StandardEquivalencyInputSchema.parse(request.body);
      const equivalency = await curriculumService.createStandardEquivalency({
        sourceStandardId: input.sourceStandardId,
        targetStandardId: input.targetStandardId,
        equivalencyType: input.equivalencyType,
        confidenceScore: input.confidenceScore,
        notes: input.notes,
        mappingSource: input.mappingSource,
      });
      
      return reply.status(201).send({
        success: true,
        data: equivalency,
      });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(400).send({
        success: false,
        error: error.message,
      });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Content Alignments
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * GET /curricula/content/:learningObjectId/alignments
   * Get curriculum alignments for a learning object
   */
  fastify.get('/curricula/content/:learningObjectId/alignments', async (request: any, reply) => {
    try {
      const { learningObjectId } = request.params;
      const alignments = await curriculumService.getContentAlignments(learningObjectId);
      
      return {
        success: true,
        data: alignments,
        meta: { total: alignments.length },
      };
    } catch (error: any) {
      request.log.error(error);
      return reply.status(400).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * GET /curricula/frameworks/:frameworkId/content
   * Get content aligned to a specific framework
   */
  fastify.get('/curricula/frameworks/:frameworkId/content', async (request: any, reply) => {
    try {
      const { frameworkId } = request.params;
      const { gradeLevel, standardId, limit, offset } = request.query;
      
      const result = await curriculumService.getContentByFramework({
        frameworkId,
        gradeLevel: gradeLevel ? parseInt(gradeLevel, 10) : undefined,
        standardId,
        limit: limit ? parseInt(limit, 10) : 50,
        offset: offset ? parseInt(offset, 10) : 0,
      });
      
      return {
        success: true,
        data: result.alignments,
        meta: {
          total: result.total,
          limit: limit ? parseInt(limit, 10) : 50,
          offset: offset ? parseInt(offset, 10) : 0,
        },
      };
    } catch (error: any) {
      request.log.error(error);
      return reply.status(400).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * POST /curricula/content/align
   * Align content to a curriculum framework with standards
   */
  fastify.post('/curricula/content/align', async (request: any, reply) => {
    try {
      const input = ContentAlignmentInputSchema.parse(request.body);
      
      // Extract user ID from request if available
      const user = (request as any).user as { id?: string; user_id?: string } | undefined;
      const alignedBy = user?.id ?? user?.user_id;
      
      const alignment = await curriculumService.alignContentToCurriculum({
        learningObjectId: input.learningObjectId,
        learningObjectVersionId: input.learningObjectVersionId,
        frameworkId: input.frameworkId,
        alignedGradeLevel: input.alignedGradeLevel,
        alignedGradeBand: input.alignedGradeBand,
        alignmentScore: input.alignmentScore,
        isPrimary: input.isPrimary,
        standardAlignments: input.standardAlignments?.map(sa => ({
          standardId: sa.standardId,
          alignmentStrength: sa.alignmentStrength,
          coveragePercent: sa.coveragePercent,
          alignmentNotes: sa.alignmentNotes,
        })),
        alignedBy,
      });
      
      return reply.status(201).send({
        success: true,
        data: alignment,
      });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(400).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * PUT /curricula/content/alignments/:id/verify
   * Verify a content alignment
   */
  fastify.put('/curricula/content/alignments/:id/verify', async (request: any, reply) => {
    try {
      const { id } = request.params;
      
      // Extract user ID from request
      const user = (request as any).user as { id?: string; user_id?: string } | undefined;
      const verifiedBy = user?.id ?? user?.user_id;
      
      if (!verifiedBy) {
        return reply.status(401).send({
          success: false,
          error: 'Authentication required',
        });
      }
      
      const alignment = await curriculumService.verifyContentAlignment(id, verifiedBy);
      
      return { success: true, data: alignment };
    } catch (error: any) {
      request.log.error(error);
      return reply.status(400).send({
        success: false,
        error: error.message,
      });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Analytics
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * GET /curricula/frameworks/:frameworkId/coverage
   * Get curriculum coverage statistics
   */
  fastify.get('/curricula/frameworks/:frameworkId/coverage', async (request: any, reply) => {
    try {
      const { frameworkId } = request.params;
      const stats = await curriculumService.getCurriculumCoverageStats(frameworkId);
      
      return { success: true, data: stats };
    } catch (error: any) {
      request.log.error(error);
      return reply.status(400).send({
        success: false,
        error: error.message,
      });
    }
  });
};

export default curriculumRoutes;
