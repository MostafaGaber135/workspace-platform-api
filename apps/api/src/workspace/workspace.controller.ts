import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  type CreateWorkspaceInput,
  type UpdateWorkspaceInput,
  createWorkspaceSchema,
  updateWorkspaceSchema,
} from '@developeros/validation';
import { type Workspace } from '@developeros/shared-types';
import { CurrentUserId } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { WorkspaceService } from './workspace.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { WorkspaceResponseDto } from './dto/workspace-response.dto';

/**
 * Workspace endpoints. Controllers are thin: they resolve the current user,
 * validate input with the shared Zod schemas via {@link ZodValidationPipe}, and
 * delegate all business logic to {@link WorkspaceService}. Every route is scoped
 * to the current user; unauthenticated requests fail closed with 401.
 */
@ApiTags('workspaces')
@ApiUnauthorizedResponse({ description: 'No authenticated user' })
@Controller('workspaces')
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Post()
  @ApiBody({ type: CreateWorkspaceDto })
  @ApiCreatedResponse({ type: WorkspaceResponseDto })
  @ApiConflictResponse({ description: 'A workspace with this name already exists' })
  create(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(createWorkspaceSchema)) body: CreateWorkspaceInput,
  ): Promise<Workspace> {
    return this.workspaceService.create(userId, body);
  }

  @Get()
  @ApiOkResponse({ type: WorkspaceResponseDto, isArray: true })
  list(@CurrentUserId() userId: string): Promise<Workspace[]> {
    return this.workspaceService.listOwnedBy(userId);
  }

  @Get(':id')
  @ApiOkResponse({ type: WorkspaceResponseDto })
  @ApiNotFoundResponse({ description: 'Workspace not found or not owned by the current user' })
  get(@CurrentUserId() userId: string, @Param('id') id: string): Promise<Workspace> {
    return this.workspaceService.getOwned(userId, id);
  }

  @Patch(':id')
  @ApiBody({ type: UpdateWorkspaceDto })
  @ApiOkResponse({ type: WorkspaceResponseDto })
  @ApiNotFoundResponse({ description: 'Workspace not found or not owned by the current user' })
  @ApiConflictResponse({ description: 'A workspace with this name already exists' })
  rename(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateWorkspaceSchema)) body: UpdateWorkspaceInput,
  ): Promise<Workspace> {
    return this.workspaceService.rename(userId, id, body);
  }
}
