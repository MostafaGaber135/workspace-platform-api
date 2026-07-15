import { ApiProperty } from '@nestjs/swagger';

/**
 * OpenAPI documentation for the `PATCH /workspaces/:id` body. Name is the only
 * mutable field. Runtime validation is performed by `updateWorkspaceSchema` via
 * `ZodValidationPipe`.
 */
export class UpdateWorkspaceDto {
  @ApiProperty({ example: 'Renamed Workspace', maxLength: 100, description: 'New workspace name' })
  name!: string;
}
