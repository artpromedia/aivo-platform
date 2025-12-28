// ══════════════════════════════════════════════════════════════════════════════
// LTI DTOs
// Data Transfer Objects for LTI endpoints
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
  IsUrl,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// ============================================================================
// OIDC / LAUNCH DTOs
// ============================================================================

export class LTILoginInitiationDto {
  @ApiProperty({ description: 'Platform issuer' })
  @IsString()
  iss!: string;

  @ApiProperty({ description: 'Login hint from platform' })
  @IsString()
  login_hint!: string;

  @ApiProperty({ description: 'Target link URI' })
  @IsString()
  target_link_uri!: string;

  @ApiPropertyOptional({ description: 'LTI message hint' })
  @IsOptional()
  @IsString()
  lti_message_hint?: string;

  @ApiPropertyOptional({ description: 'Client ID' })
  @IsOptional()
  @IsString()
  client_id?: string;

  @ApiPropertyOptional({ description: 'Deployment ID' })
  @IsOptional()
  @IsString()
  lti_deployment_id?: string;
}

export class LTILaunchCallbackDto {
  @ApiProperty({ description: 'ID token from platform' })
  @IsString()
  id_token!: string;

  @ApiProperty({ description: 'State from login initiation' })
  @IsString()
  state!: string;
}

// ============================================================================
// PLATFORM/TOOL REGISTRATION DTOs
// ============================================================================

export class LTIRegisterPlatformDto {
  @ApiProperty({ description: 'Platform name' })
  @IsString()
  name!: string;

  @ApiProperty({ description: 'Platform issuer URL' })
  @IsUrl()
  issuer!: string;

  @ApiProperty({ description: 'Client ID' })
  @IsString()
  clientId!: string;

  @ApiProperty({ description: 'Deployment ID' })
  @IsString()
  deploymentId!: string;

  @ApiProperty({ description: 'Authorization endpoint' })
  @IsUrl()
  authorizationEndpoint!: string;

  @ApiProperty({ description: 'Token endpoint' })
  @IsUrl()
  tokenEndpoint!: string;

  @ApiProperty({ description: 'JWKS endpoint' })
  @IsUrl()
  jwksEndpoint!: string;

  @ApiPropertyOptional({ description: 'Public key (if not using JWKS)' })
  @IsOptional()
  @IsString()
  publicKey?: string;
}

export class LTIRegisterToolDto {
  @ApiProperty({ description: 'Tool name' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: 'Tool description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Client ID' })
  @IsString()
  clientId!: string;

  @ApiProperty({ description: 'Login initiation URL' })
  @IsUrl()
  loginUrl!: string;

  @ApiProperty({ description: 'Launch URL' })
  @IsUrl()
  launchUrl!: string;

  @ApiProperty({ description: 'Redirect URIs' })
  @IsArray()
  @IsUrl({}, { each: true })
  redirectUris!: string[];

  @ApiProperty({ description: 'JWKS endpoint' })
  @IsUrl()
  jwksEndpoint!: string;

  @ApiProperty({ description: 'Tool public key' })
  @IsString()
  publicKey!: string;

  @ApiPropertyOptional({ description: 'Tool private key' })
  @IsOptional()
  @IsString()
  privateKey?: string;

  @ApiPropertyOptional({ description: 'Supports deep linking' })
  @IsOptional()
  @IsBoolean()
  supportsDeepLinking?: boolean;
}

// ============================================================================
// DEEP LINKING DTOs
// ============================================================================

export class LTIContentItemDto {
  @ApiProperty({ description: 'Content item type', enum: ['ltiResourceLink', 'link', 'file', 'html', 'image'] })
  @IsEnum(['ltiResourceLink', 'link', 'file', 'html', 'image'])
  type!: string;

  @ApiPropertyOptional({ description: 'Title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Text/description' })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiPropertyOptional({ description: 'URL' })
  @IsOptional()
  @IsUrl()
  url?: string;

  @ApiPropertyOptional({ description: 'Custom parameters' })
  @IsOptional()
  @IsObject()
  custom?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Line item for grading' })
  @IsOptional()
  @IsObject()
  lineItem?: {
    scoreMaximum: number;
    label?: string;
    resourceId?: string;
    tag?: string;
  };
}

export class LTIDeepLinkingResponseDto {
  @ApiProperty({ description: 'Platform ID' })
  @IsString()
  platformId!: string;

  @ApiProperty({ description: 'Content items to return', type: [LTIContentItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LTIContentItemDto)
  contentItems!: LTIContentItemDto[];

  @ApiPropertyOptional({ description: 'Data to echo back' })
  @IsOptional()
  @IsString()
  data?: string;
}

// ============================================================================
// AGS DTOs
// ============================================================================

export class LTICreateLineItemDto {
  @ApiProperty({ description: 'Label for the line item' })
  @IsString()
  label!: string;

  @ApiProperty({ description: 'Maximum score' })
  @IsNumber()
  @Min(0)
  scoreMaximum!: number;

  @ApiPropertyOptional({ description: 'Resource ID' })
  @IsOptional()
  @IsString()
  resourceId?: string;

  @ApiPropertyOptional({ description: 'Resource link ID' })
  @IsOptional()
  @IsString()
  resourceLinkId?: string;

  @ApiPropertyOptional({ description: 'Tag' })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({ description: 'Start date/time' })
  @IsOptional()
  @IsString()
  startDateTime?: string;

  @ApiPropertyOptional({ description: 'End date/time' })
  @IsOptional()
  @IsString()
  endDateTime?: string;
}

export class LTISubmitScoreDto {
  @ApiProperty({ description: 'User ID' })
  @IsString()
  userId!: string;

  @ApiProperty({
    description: 'Activity progress',
    enum: ['Initialized', 'Started', 'InProgress', 'Submitted', 'Completed'],
  })
  @IsEnum(['Initialized', 'Started', 'InProgress', 'Submitted', 'Completed'])
  activityProgress!: string;

  @ApiProperty({
    description: 'Grading progress',
    enum: ['FullyGraded', 'Pending', 'PendingManual', 'Failed', 'NotReady'],
  })
  @IsEnum(['FullyGraded', 'Pending', 'PendingManual', 'Failed', 'NotReady'])
  gradingProgress!: string;

  @ApiProperty({ description: 'Timestamp' })
  @IsString()
  timestamp!: string;

  @ApiPropertyOptional({ description: 'Score given' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  scoreGiven?: number;

  @ApiPropertyOptional({ description: 'Score maximum' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  scoreMaximum?: number;

  @ApiPropertyOptional({ description: 'Comment' })
  @IsOptional()
  @IsString()
  comment?: string;
}
