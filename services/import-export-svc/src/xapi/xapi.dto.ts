// ══════════════════════════════════════════════════════════════════════════════
// xAPI DTOs
// Data Transfer Objects for xAPI endpoints
// ══════════════════════════════════════════════════════════════════════════════

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsArray,
  IsEnum,
  IsOptional,
  IsObject,
  IsNumber,
  IsBoolean,
  ValidateNested,
  IsUUID,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

// ============================================================================
// STATEMENT DTOs
// ============================================================================

export class XAPIActorDto {
  @ApiPropertyOptional({ enum: ['Agent', 'Group'] })
  @IsOptional()
  @IsEnum(['Agent', 'Group'])
  objectType?: 'Agent' | 'Group';

  @ApiPropertyOptional({ description: 'Agent name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Email (mailto:)' })
  @IsOptional()
  @IsString()
  mbox?: string;

  @ApiPropertyOptional({ description: 'SHA1 hash of email' })
  @IsOptional()
  @IsString()
  mbox_sha1sum?: string;

  @ApiPropertyOptional({ description: 'OpenID' })
  @IsOptional()
  @IsString()
  openid?: string;

  @ApiPropertyOptional({ description: 'Account information' })
  @IsOptional()
  @IsObject()
  account?: { homePage: string; name: string };

  @ApiPropertyOptional({ description: 'Group members', type: [XAPIActorDto] })
  @IsOptional()
  @IsArray()
  member?: XAPIActorDto[];
}

export class XAPIVerbDto {
  @ApiProperty({ description: 'Verb IRI' })
  @IsString()
  id!: string;

  @ApiPropertyOptional({ description: 'Display names by language' })
  @IsOptional()
  @IsObject()
  display?: Record<string, string>;
}

export class XAPIObjectDto {
  @ApiPropertyOptional({ enum: ['Activity', 'Agent', 'Group', 'SubStatement', 'StatementRef'] })
  @IsOptional()
  @IsEnum(['Activity', 'Agent', 'Group', 'SubStatement', 'StatementRef'])
  objectType?: string;

  @ApiProperty({ description: 'Object ID/IRI' })
  @IsString()
  id!: string;

  @ApiPropertyOptional({ description: 'Activity definition' })
  @IsOptional()
  @IsObject()
  definition?: {
    type?: string;
    name?: Record<string, string>;
    description?: Record<string, string>;
    moreInfo?: string;
    interactionType?: string;
    correctResponsesPattern?: string[];
    choices?: any[];
    scale?: any[];
    source?: any[];
    target?: any[];
    steps?: any[];
    extensions?: Record<string, any>;
  };
}

export class XAPIResultDto {
  @ApiPropertyOptional({ description: 'Score' })
  @IsOptional()
  @IsObject()
  score?: {
    scaled?: number;
    raw?: number;
    min?: number;
    max?: number;
  };

  @ApiPropertyOptional({ description: 'Success' })
  @IsOptional()
  @IsBoolean()
  success?: boolean;

  @ApiPropertyOptional({ description: 'Completion' })
  @IsOptional()
  @IsBoolean()
  completion?: boolean;

  @ApiPropertyOptional({ description: 'Response' })
  @IsOptional()
  @IsString()
  response?: string;

  @ApiPropertyOptional({ description: 'Duration (ISO 8601)' })
  @IsOptional()
  @IsString()
  duration?: string;

  @ApiPropertyOptional({ description: 'Extensions' })
  @IsOptional()
  @IsObject()
  extensions?: Record<string, any>;
}

export class XAPIContextDto {
  @ApiPropertyOptional({ description: 'Registration UUID' })
  @IsOptional()
  @IsUUID()
  registration?: string;

  @ApiPropertyOptional({ description: 'Instructor' })
  @IsOptional()
  @ValidateNested()
  @Type(() => XAPIActorDto)
  instructor?: XAPIActorDto;

  @ApiPropertyOptional({ description: 'Team' })
  @IsOptional()
  @ValidateNested()
  @Type(() => XAPIActorDto)
  team?: XAPIActorDto;

  @ApiPropertyOptional({ description: 'Context activities' })
  @IsOptional()
  @IsObject()
  contextActivities?: {
    parent?: XAPIObjectDto[];
    grouping?: XAPIObjectDto[];
    category?: XAPIObjectDto[];
    other?: XAPIObjectDto[];
  };

  @ApiPropertyOptional({ description: 'Revision' })
  @IsOptional()
  @IsString()
  revision?: string;

  @ApiPropertyOptional({ description: 'Platform' })
  @IsOptional()
  @IsString()
  platform?: string;

  @ApiPropertyOptional({ description: 'Language' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ description: 'Extensions' })
  @IsOptional()
  @IsObject()
  extensions?: Record<string, any>;
}

export class XAPIStatementDto {
  @ApiPropertyOptional({ description: 'Statement UUID' })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty({ description: 'Actor', type: XAPIActorDto })
  @ValidateNested()
  @Type(() => XAPIActorDto)
  actor!: XAPIActorDto;

  @ApiProperty({ description: 'Verb', type: XAPIVerbDto })
  @ValidateNested()
  @Type(() => XAPIVerbDto)
  verb!: XAPIVerbDto;

  @ApiProperty({ description: 'Object', type: XAPIObjectDto })
  @ValidateNested()
  @Type(() => XAPIObjectDto)
  object!: XAPIObjectDto;

  @ApiPropertyOptional({ description: 'Result', type: XAPIResultDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => XAPIResultDto)
  result?: XAPIResultDto;

  @ApiPropertyOptional({ description: 'Context', type: XAPIContextDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => XAPIContextDto)
  context?: XAPIContextDto;

  @ApiPropertyOptional({ description: 'Timestamp (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  timestamp?: string;

  @ApiPropertyOptional({ description: 'Authority', type: XAPIActorDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => XAPIActorDto)
  authority?: XAPIActorDto;

  @ApiPropertyOptional({ description: 'Version' })
  @IsOptional()
  @IsString()
  version?: string;

  @ApiPropertyOptional({ description: 'Attachments' })
  @IsOptional()
  @IsArray()
  attachments?: any[];
}

// ============================================================================
// QUERY DTOs
// ============================================================================

export class XAPIStatementsQueryDto {
  @ApiPropertyOptional({ description: 'Statement ID' })
  @IsOptional()
  @IsUUID()
  statementId?: string;

  @ApiPropertyOptional({ description: 'Voided statement ID' })
  @IsOptional()
  @IsUUID()
  voidedStatementId?: string;

  @ApiPropertyOptional({ description: 'Agent (JSON)' })
  @IsOptional()
  @IsString()
  agent?: string;

  @ApiPropertyOptional({ description: 'Verb IRI' })
  @IsOptional()
  @IsString()
  verb?: string;

  @ApiPropertyOptional({ description: 'Activity IRI' })
  @IsOptional()
  @IsString()
  activity?: string;

  @ApiPropertyOptional({ description: 'Registration UUID' })
  @IsOptional()
  @IsUUID()
  registration?: string;

  @ApiPropertyOptional({ description: 'Include related activities' })
  @IsOptional()
  @IsString()
  related_activities?: string;

  @ApiPropertyOptional({ description: 'Include related agents' })
  @IsOptional()
  @IsString()
  related_agents?: string;

  @ApiPropertyOptional({ description: 'Since timestamp' })
  @IsOptional()
  @IsString()
  since?: string;

  @ApiPropertyOptional({ description: 'Until timestamp' })
  @IsOptional()
  @IsString()
  until?: string;

  @ApiPropertyOptional({ description: 'Result limit' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional({ description: 'Format (ids, exact, canonical)' })
  @IsOptional()
  @IsEnum(['ids', 'exact', 'canonical'])
  format?: string;

  @ApiPropertyOptional({ description: 'Include attachments' })
  @IsOptional()
  @IsString()
  attachments?: string;

  @ApiPropertyOptional({ description: 'Ascending order' })
  @IsOptional()
  @IsString()
  ascending?: string;
}

export class XAPIExportQueryDto {
  @ApiProperty({ description: 'Content IDs to export statements for' })
  @IsArray()
  @IsString({ each: true })
  contentIds!: string[];

  @ApiPropertyOptional({ description: 'Start date filter' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date filter' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Filter by actor ID' })
  @IsOptional()
  @IsString()
  actorId?: string;

  @ApiPropertyOptional({ description: 'Output format', enum: ['json', 'json-lines'] })
  @IsOptional()
  @IsEnum(['json', 'json-lines'])
  format?: 'json' | 'json-lines';
}

// ============================================================================
// RESPONSE DTOs
// ============================================================================

export class XAPIStatementResultDto {
  @ApiProperty({ description: 'Statements', type: [XAPIStatementDto] })
  statements!: XAPIStatementDto[];

  @ApiPropertyOptional({ description: 'More URL for pagination' })
  more?: string;
}
