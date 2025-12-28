// ══════════════════════════════════════════════════════════════════════════════
// xAPI CONTROLLER
// REST endpoints for xAPI statement handling and Learning Record Store
// ══════════════════════════════════════════════════════════════════════════════

import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
  ValidationPipe,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { TenantId, UserId } from '../auth/auth.decorators';
import { XAPIExporter } from './xapi-statement.exporter';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4, validate as uuidValidate } from 'uuid';
import {
  XAPIStatementDto,
  XAPIStatementsQueryDto,
  XAPIExportQueryDto,
  XAPIStatementResultDto,
} from './xapi.dto';

@ApiTags('xAPI')
@Controller('xapi')
export class XAPIController {
  constructor(
    private readonly xapiExporter: XAPIExporter,
    private readonly prisma: PrismaService,
  ) {}

  // ============================================================================
  // STATEMENTS API (LRS-compatible)
  // ============================================================================

  @Post('statements')
  @UseGuards(AuthGuard('xapi'))
  @ApiHeader({ name: 'X-Experience-API-Version', required: true })
  @ApiOperation({ summary: 'Store xAPI statements' })
  @ApiResponse({ status: 200, description: 'Statement IDs' })
  @ApiResponse({ status: 400, description: 'Invalid statement' })
  async storeStatements(
    @Body(ValidationPipe) body: XAPIStatementDto | XAPIStatementDto[],
    @Headers('X-Experience-API-Version') version: string,
    @Req() req: Request,
  ): Promise<string[]> {
    this.validateXAPIVersion(version);

    const statements = Array.isArray(body) ? body : [body];
    const storedIds: string[] = [];
    const tenantId = (req as any).tenantId;

    for (const statement of statements) {
      const id = statement.id || uuidv4();
      
      // Validate statement ID if provided
      if (statement.id && !uuidValidate(statement.id)) {
        throw new BadRequestException('Invalid statement ID format');
      }

      await this.prisma.xapiStatement.create({
        data: {
          id,
          tenantId,
          statementId: id,
          actor: statement.actor as any,
          verb: statement.verb as any,
          object: statement.object as any,
          result: statement.result as any,
          context: statement.context as any,
          timestamp: statement.timestamp ? new Date(statement.timestamp) : new Date(),
          stored: new Date(),
          authority: (req as any).authority,
          version: version || '1.0.3',
          voided: false,
        },
      });

      storedIds.push(id);
    }

    return storedIds;
  }

  @Put('statements')
  @UseGuards(AuthGuard('xapi'))
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiHeader({ name: 'X-Experience-API-Version', required: true })
  @ApiOperation({ summary: 'Store a single xAPI statement by ID' })
  @ApiResponse({ status: 204, description: 'Statement stored' })
  @ApiResponse({ status: 409, description: 'Statement ID conflict' })
  async storeStatementById(
    @Query('statementId') statementId: string,
    @Body(ValidationPipe) statement: XAPIStatementDto,
    @Headers('X-Experience-API-Version') version: string,
    @Req() req: Request,
  ): Promise<void> {
    this.validateXAPIVersion(version);

    if (!statementId || !uuidValidate(statementId)) {
      throw new BadRequestException('Valid statementId query parameter required');
    }

    // Check for existing statement
    const existing = await this.prisma.xapiStatement.findUnique({
      where: { statementId },
    });

    if (existing) {
      throw new BadRequestException('Statement already exists');
    }

    const tenantId = (req as any).tenantId;

    await this.prisma.xapiStatement.create({
      data: {
        id: uuidv4(),
        tenantId,
        statementId,
        actor: statement.actor as any,
        verb: statement.verb as any,
        object: statement.object as any,
        result: statement.result as any,
        context: statement.context as any,
        timestamp: statement.timestamp ? new Date(statement.timestamp) : new Date(),
        stored: new Date(),
        authority: (req as any).authority,
        version: version || '1.0.3',
        voided: false,
      },
    });
  }

  @Get('statements')
  @UseGuards(AuthGuard('xapi'))
  @ApiHeader({ name: 'X-Experience-API-Version', required: true })
  @ApiOperation({ summary: 'Query xAPI statements' })
  @ApiResponse({ status: 200, description: 'Statements result' })
  async getStatements(
    @Query(ValidationPipe) query: XAPIStatementsQueryDto,
    @Headers('X-Experience-API-Version') version: string,
    @Req() req: Request,
  ): Promise<XAPIStatementResultDto> {
    this.validateXAPIVersion(version);

    const tenantId = (req as any).tenantId;

    // Build query filters
    const where: any = { tenantId, voided: false };

    if (query.statementId) {
      where.statementId = query.statementId;
    }

    if (query.agent) {
      const agent = JSON.parse(query.agent);
      if (agent.mbox) {
        where.actor = { path: ['mbox'], equals: agent.mbox };
      } else if (agent.account) {
        where.actor = { 
          path: ['account', 'name'], 
          equals: agent.account.name 
        };
      }
    }

    if (query.verb) {
      where.verb = { path: ['id'], equals: query.verb };
    }

    if (query.activity) {
      where.object = { path: ['id'], equals: query.activity };
    }

    if (query.since) {
      where.stored = { ...where.stored, gte: new Date(query.since) };
    }

    if (query.until) {
      where.stored = { ...where.stored, lte: new Date(query.until) };
    }

    const limit = Math.min(query.limit || 100, 1000);
    const ascending = query.ascending === 'true';

    const statements = await this.prisma.xapiStatement.findMany({
      where,
      orderBy: { stored: ascending ? 'asc' : 'desc' },
      take: limit + 1, // Fetch one extra to check for more
    });

    const hasMore = statements.length > limit;
    if (hasMore) statements.pop();

    return {
      statements: statements.map(s => this.formatStatement(s)),
      more: hasMore ? `/xapi/statements?since=${statements[statements.length - 1]?.stored?.toISOString()}` : undefined,
    };
  }

  // ============================================================================
  // VOIDING
  // ============================================================================

  @Post('statements/void')
  @UseGuards(AuthGuard('xapi'))
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Void a statement' })
  @ApiResponse({ status: 204, description: 'Statement voided' })
  async voidStatement(
    @Body() body: { statementId: string },
    @Req() req: Request,
  ): Promise<void> {
    const tenantId = (req as any).tenantId;

    // Create voiding statement
    await this.prisma.xapiStatement.create({
      data: {
        id: uuidv4(),
        tenantId,
        statementId: uuidv4(),
        actor: (req as any).actor,
        verb: {
          id: 'http://adlnet.gov/expapi/verbs/voided',
          display: { 'en-US': 'voided' },
        },
        object: {
          objectType: 'StatementRef',
          id: body.statementId,
        },
        timestamp: new Date(),
        stored: new Date(),
        voided: false,
      },
    });

    // Mark original as voided
    await this.prisma.xapiStatement.updateMany({
      where: { statementId: body.statementId, tenantId },
      data: { voided: true },
    });
  }

  // ============================================================================
  // EXPORT (AIVO-specific)
  // ============================================================================

  @Post('export')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'teacher')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Export xAPI statements for content' })
  @ApiResponse({ status: 200, description: 'Export result' })
  async exportStatements(
    @Body(ValidationPipe) query: XAPIExportQueryDto,
    @TenantId() tenantId: string,
  ): Promise<any> {
    return this.xapiExporter.export(tenantId, query.contentIds, {
      startDate: query.startDate,
      endDate: query.endDate,
      actorId: query.actorId,
      format: query.format,
    });
  }

  // ============================================================================
  // ABOUT ENDPOINT
  // ============================================================================

  @Get('about')
  @ApiOperation({ summary: 'Get LRS information' })
  @ApiResponse({ status: 200, description: 'LRS about information' })
  getAbout(): any {
    return {
      version: ['1.0.3', '1.0.2', '1.0.1', '1.0.0'],
      extensions: {
        'https://aivo.education/xapi/extensions': {
          name: 'AIVO Learning Record Store',
          version: '1.0.0',
        },
      },
    };
  }

  // ============================================================================
  // ACTIVITIES STATE API
  // ============================================================================

  @Get('activities/state')
  @UseGuards(AuthGuard('xapi'))
  @ApiOperation({ summary: 'Get activity state' })
  async getActivityState(
    @Query('activityId') activityId: string,
    @Query('agent') agent: string,
    @Query('stateId') stateId: string,
    @Query('registration') registration?: string,
    @Req() req?: Request,
  ): Promise<any> {
    const tenantId = (req as any).tenantId;
    const parsedAgent = JSON.parse(agent);

    const state = await this.prisma.xapiState.findFirst({
      where: {
        tenantId,
        activityId,
        agentId: parsedAgent.account?.name || parsedAgent.mbox,
        stateId,
        registration: registration || null,
      },
    });

    return state?.stateData || null;
  }

  @Put('activities/state')
  @UseGuards(AuthGuard('xapi'))
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Set activity state' })
  async setActivityState(
    @Query('activityId') activityId: string,
    @Query('agent') agent: string,
    @Query('stateId') stateId: string,
    @Query('registration') registration: string,
    @Body() stateData: any,
    @Req() req: Request,
  ): Promise<void> {
    const tenantId = (req as any).tenantId;
    const parsedAgent = JSON.parse(agent);
    const agentId = parsedAgent.account?.name || parsedAgent.mbox;

    await this.prisma.xapiState.upsert({
      where: {
        tenantId_activityId_agentId_stateId: {
          tenantId,
          activityId,
          agentId,
          stateId,
        },
      },
      create: {
        id: uuidv4(),
        tenantId,
        activityId,
        agentId,
        stateId,
        registration,
        stateData,
        updatedAt: new Date(),
      },
      update: {
        stateData,
        registration,
        updatedAt: new Date(),
      },
    });
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private validateXAPIVersion(version: string): void {
    const validVersions = ['1.0.0', '1.0.1', '1.0.2', '1.0.3'];
    if (!version || !validVersions.includes(version)) {
      throw new BadRequestException(`Invalid xAPI version. Supported: ${validVersions.join(', ')}`);
    }
  }

  private formatStatement(s: any): any {
    return {
      id: s.statementId,
      actor: s.actor,
      verb: s.verb,
      object: s.object,
      result: s.result,
      context: s.context,
      timestamp: s.timestamp?.toISOString(),
      stored: s.stored?.toISOString(),
      authority: s.authority,
      version: s.version,
    };
  }
}
