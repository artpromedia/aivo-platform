// ══════════════════════════════════════════════════════════════════════════════
// LTI 1.3 CONTROLLER
// REST endpoints for LTI tool provider and platform functionality
// ══════════════════════════════════════════════════════════════════════════════

import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { TenantId, UserId } from '../auth/auth.decorators';
import { LTIProviderService } from './lti-provider.service';
import { LTIPlatformService } from './lti-platform.service';
import {
  LTILoginInitiationDto,
  LTILaunchCallbackDto,
  LTIRegisterPlatformDto,
  LTIRegisterToolDto,
  LTIDeepLinkingResponseDto,
  LTICreateLineItemDto,
  LTISubmitScoreDto,
} from './lti.dto';

@ApiTags('LTI')
@Controller('lti')
export class LTIController {
  constructor(
    private readonly providerService: LTIProviderService,
    private readonly platformService: LTIPlatformService,
  ) {}

  // ============================================================================
  // OIDC / LAUNCH FLOW (Tool Provider)
  // ============================================================================

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'OIDC login initiation endpoint' })
  @ApiResponse({ status: 200, description: 'Returns authorization redirect URL' })
  async loginInitiation(
    @Body() body: LTILoginInitiationDto,
    @Res() res: Response,
  ): Promise<void> {
    const { redirectUrl } = await this.providerService.handleLoginInitiation({
      iss: body.iss,
      loginHint: body.login_hint,
      targetLinkUri: body.target_link_uri,
      ltiMessageHint: body.lti_message_hint,
      clientId: body.client_id,
      deploymentId: body.lti_deployment_id,
    });

    res.redirect(redirectUrl);
  }

  @Post('launch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'LTI launch callback endpoint' })
  @ApiResponse({ status: 200, description: 'Launch successful, redirects to content' })
  async launchCallback(
    @Body() body: LTILaunchCallbackDto,
    @Res() res: Response,
  ): Promise<void> {
    const { launchData, sessionId } = await this.providerService.handleLaunchCallback({
      idToken: body.id_token,
      state: body.state,
    });

    // Redirect to appropriate content based on message type
    const baseUrl = process.env.APP_URL || 'https://app.aivo.education';
    
    if (launchData.messageType === 'LtiDeepLinkingRequest') {
      res.redirect(`${baseUrl}/lti/deep-linking?session=${sessionId}`);
    } else {
      const targetUri = launchData.targetLinkUri || `${baseUrl}/lti/content`;
      res.redirect(`${targetUri}?session=${sessionId}`);
    }
  }

  @Get('jwks')
  @ApiOperation({ summary: 'Tool JWKS endpoint for platform verification' })
  @ApiResponse({ status: 200, description: 'Returns tool public keys' })
  getToolJWKS(): { keys: any[] } {
    return this.providerService.getJWKS();
  }

  // ============================================================================
  // DEEP LINKING
  // ============================================================================

  @Post('deep-linking/response')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Build deep linking response' })
  @ApiResponse({ status: 200, description: 'Returns JWT for deep linking response' })
  async buildDeepLinkingResponse(
    @Body(ValidationPipe) dto: LTIDeepLinkingResponseDto,
  ): Promise<{ jwt: string; returnUrl: string }> {
    return this.providerService.buildDeepLinkingResponse(
      dto.platformId,
      dto.contentItems,
      dto.data,
    );
  }

  // ============================================================================
  // PLATFORM MANAGEMENT (Admin)
  // ============================================================================

  @Post('platforms')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register a new LTI platform' })
  @ApiResponse({ status: 201, description: 'Platform registered' })
  async registerPlatform(
    @Body(ValidationPipe) dto: LTIRegisterPlatformDto,
    @TenantId() tenantId: string,
  ): Promise<{ id: string }> {
    return this.providerService.registerPlatform(tenantId, dto);
  }

  @Get('platforms')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List registered platforms' })
  @ApiResponse({ status: 200, description: 'List of platforms' })
  async listPlatforms(
    @TenantId() tenantId: string,
  ): Promise<any[]> {
    return this.providerService.listPlatforms(tenantId);
  }

  // ============================================================================
  // TOOL MANAGEMENT (Platform functionality)
  // ============================================================================

  @Post('tools')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register an external LTI tool' })
  @ApiResponse({ status: 201, description: 'Tool registered' })
  async registerTool(
    @Body(ValidationPipe) dto: LTIRegisterToolDto,
    @TenantId() tenantId: string,
  ): Promise<{ id: string; deploymentId: string }> {
    // The service will generate keys internally if not provided
    return this.platformService.registerTool(tenantId, dto as any);
  }

  @Get('tools')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'teacher')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List registered tools' })
  @ApiResponse({ status: 200, description: 'List of tools' })
  async listTools(
    @TenantId() tenantId: string,
  ): Promise<any[]> {
    return this.platformService.getTools(tenantId);
  }

  @Post('tools/:toolId/launch')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate LTI launch to external tool' })
  @ApiResponse({ status: 200, description: 'Launch initiated' })
  async initiateLaunch(
    @Param('toolId') toolId: string,
    @Body() body: any,
    @UserId() userId: string,
    @Req() req: Request,
  ): Promise<{ loginUrl: string; formData: Record<string, string> }> {
    return this.platformService.initiateLaunch(toolId, {
      userId,
      userName: (req as any).user?.name,
      userEmail: (req as any).user?.email,
      roles: body.roles || ['http://purl.imsglobal.org/vocab/lis/v2/membership#Learner'],
      contextId: body.contextId,
      contextTitle: body.contextTitle,
      resourceLinkId: body.resourceLinkId || `aivo-${Date.now()}`,
      resourceTitle: body.resourceTitle,
      custom: body.custom,
      returnUrl: body.returnUrl,
    });
  }

  // ============================================================================
  // ASSIGNMENT AND GRADE SERVICES (AGS)
  // ============================================================================

  @Post('ags/:contextId/lineitems')
  @UseGuards(AuthGuard('lti-token'))
  @ApiOperation({ summary: 'Create a line item' })
  @ApiResponse({ status: 201, description: 'Line item created' })
  async createLineItem(
    @Param('contextId') contextId: string,
    @Body(ValidationPipe) dto: LTICreateLineItemDto,
  ): Promise<any> {
    return this.platformService.createLineItem(contextId, dto);
  }

  @Get('ags/:contextId/lineitems')
  @UseGuards(AuthGuard('lti-token'))
  @ApiOperation({ summary: 'Get line items' })
  @ApiResponse({ status: 200, description: 'List of line items' })
  async getLineItems(
    @Param('contextId') contextId: string,
    @Query('resource_link_id') resourceLinkId?: string,
    @Query('tag') tag?: string,
    @Query('limit') limit?: number,
  ): Promise<any[]> {
    return this.platformService.getLineItems(contextId, { resourceLinkId, tag, limit });
  }

  @Post('ags/:contextId/lineitems/:lineItemId/scores')
  @UseGuards(AuthGuard('lti-token'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit a score' })
  @ApiResponse({ status: 200, description: 'Score submitted' })
  async submitScore(
    @Param('lineItemId') lineItemId: string,
    @Body(ValidationPipe) dto: LTISubmitScoreDto,
  ): Promise<void> {
    await this.platformService.submitScore(lineItemId, dto);
  }

  @Get('ags/:contextId/lineitems/:lineItemId/results')
  @UseGuards(AuthGuard('lti-token'))
  @ApiOperation({ summary: 'Get results for a line item' })
  @ApiResponse({ status: 200, description: 'List of results' })
  async getResults(
    @Param('lineItemId') lineItemId: string,
    @Query('user_id') userId?: string,
    @Query('limit') limit?: number,
  ): Promise<any[]> {
    return this.platformService.getResults(lineItemId, { userId, limit });
  }

  // ============================================================================
  // NAMES AND ROLE PROVISIONING SERVICES (NRPS)
  // ============================================================================

  @Get('nrps/:contextId/memberships')
  @UseGuards(AuthGuard('lti-token'))
  @ApiOperation({ summary: 'Get context membership' })
  @ApiResponse({ status: 200, description: 'Membership container' })
  async getContextMembership(
    @Param('contextId') contextId: string,
    @Query('role') role?: string,
    @Query('limit') limit?: number,
  ): Promise<any> {
    return this.platformService.getContextMembership(contextId, { role, limit });
  }

  // ============================================================================
  // TOKEN ENDPOINT
  // ============================================================================

  @Post('token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'OAuth2 token endpoint for LTI tools' })
  @ApiResponse({ status: 200, description: 'Access token issued' })
  async issueToken(
    @Body() body: any,
  ): Promise<any> {
    if (body.grant_type !== 'client_credentials') {
      return { error: 'unsupported_grant_type' };
    }

    return this.platformService.issueAccessToken(
      body.client_assertion,
      body.scope,
    );
  }

  // ============================================================================
  // PLATFORM JWKS
  // ============================================================================

  @Get('platform/jwks')
  @ApiOperation({ summary: 'Platform JWKS endpoint for tool verification' })
  @ApiResponse({ status: 200, description: 'Returns platform public keys' })
  getPlatformJWKS(): { keys: any[] } {
    return this.platformService.getJWKS();
  }
}
