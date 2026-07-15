import { ApiProperty } from '@nestjs/swagger';

/**
 * OpenAPI documentation for the `POST /workspaces` body. Runtime validation is
 * performed by `createWorkspaceSchema` via `ZodValidationPipe`; this class only
 * feeds `@nestjs/swagger`.
 */
export class CreateWorkspaceDto {
  @ApiProperty({ example: 'My Workspace', maxLength: 100, description: 'Workspace name' })
  name!: string;
}
