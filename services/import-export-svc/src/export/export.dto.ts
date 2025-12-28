// ══════════════════════════════════════════════════════════════════════════════
// EXPORT DTOs
// Data Transfer Objects for export endpoints
// ══════════════════════════════════════════════════════════════════════════════

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsArray,
  IsEnum,
  IsOptional,
  IsObject,
  IsNumber,
  Min,
  Max,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ExportFormat, ExportStatus, ContentType } from './export.types';

// ============================================================================
// REQUEST DTOs
// ============================================================================

export class CreateExportDto {
  @ApiProperty({
    description: 'Type of content to export',
    enum: ['lesson', 'assessment', 'question', 'course'],
  })
  @IsEnum(['lesson', 'assessment', 'question', 'course'])
  contentType!: ContentType;

  @ApiProperty({
    description: 'IDs of content items to export',
    example: ['uuid-1', 'uuid-2'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  contentIds!: string[];

  @ApiProperty({
    description: 'Export format',
    enum: ['scorm_1.2', 'scorm_2004', 'qti_2.1', 'qti_3.0', 'common_cartridge', 'xapi'],
  })
  @IsEnum(['scorm_1.2', 'scorm_2004', 'qti_2.1', 'qti_3.0', 'common_cartridge', 'xapi'])
  format!: ExportFormat;

  @ApiPropertyOptional({
    description: 'Format-specific options',
    example: { includeMetadata: true, version: '1.3' },
  })
  @IsOptional()
  @IsObject()
  options?: Record<string, any>;
}

export class ListExportsQueryDto {
  @ApiPropertyOptional({ description: 'Number of results to return', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Offset for pagination', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number = 0;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
  })
  @IsOptional()
  @IsEnum(['pending', 'processing', 'completed', 'failed', 'cancelled'])
  status?: ExportStatus;

  @ApiPropertyOptional({
    description: 'Filter by format',
    enum: ['scorm_1.2', 'scorm_2004', 'qti_2.1', 'qti_3.0', 'common_cartridge', 'xapi'],
  })
  @IsOptional()
  @IsEnum(['scorm_1.2', 'scorm_2004', 'qti_2.1', 'qti_3.0', 'common_cartridge', 'xapi'])
  format?: ExportFormat;
}

// ============================================================================
// RESPONSE DTOs
// ============================================================================

export class ExportJobDto {
  @ApiProperty({ description: 'Export job ID' })
  id!: string;

  @ApiProperty({ description: 'Content type' })
  contentType!: ContentType;

  @ApiProperty({ description: 'Content IDs' })
  contentIds!: string[];

  @ApiProperty({ description: 'Export format' })
  format!: ExportFormat;

  @ApiProperty({ description: 'Job status' })
  status!: ExportStatus;

  @ApiPropertyOptional({ description: 'Progress percentage (0-100)' })
  progress?: number;

  @ApiPropertyOptional({ description: 'Current progress message' })
  progressMessage?: string;

  @ApiPropertyOptional({ description: 'Output file name' })
  fileName?: string;

  @ApiPropertyOptional({ description: 'Output file size in bytes' })
  fileSize?: number;

  @ApiPropertyOptional({ description: 'Download URL (presigned)' })
  downloadUrl?: string;

  @ApiPropertyOptional({ description: 'Download URL expiration' })
  expiresAt?: Date;

  @ApiPropertyOptional({ description: 'Error message if failed' })
  error?: string;

  @ApiProperty({ description: 'Job creation time' })
  createdAt!: Date;

  @ApiPropertyOptional({ description: 'Job completion time' })
  completedAt?: Date;
}

export class ExportListResponseDto {
  @ApiProperty({ description: 'List of export jobs', type: [ExportJobDto] })
  jobs!: ExportJobDto[];

  @ApiProperty({ description: 'Total count of matching jobs' })
  total!: number;

  @ApiProperty({ description: 'Current limit' })
  limit!: number;

  @ApiProperty({ description: 'Current offset' })
  offset!: number;
}
