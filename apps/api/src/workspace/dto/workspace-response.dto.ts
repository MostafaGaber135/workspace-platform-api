import { ApiProperty } from '@nestjs/swagger';
import { type Workspace } from '@developeros/shared-types';

/**
 * OpenAPI-annotated representation of the public {@link Workspace} contract.
 * Structurally satisfies the shared interface; the internal `normalizedName` is
 * intentionally absent and never serialized.
 */
export class WorkspaceResponseDto implements Workspace {
  @ApiProperty({ example: 'clx0workspaceid', description: 'Workspace id (cuid)' })
  id!: string;

  @ApiProperty({ example: 'My Workspace', description: 'User-facing workspace name' })
  name!: string;

  @ApiProperty({ example: 'clx0ownerid', description: 'Owner user id' })
  ownerId!: string;

  @ApiProperty({ example: '2026-07-13T12:00:00.000Z', description: 'UTC ISO-8601 timestamp' })
  createdAt!: string;

  @ApiProperty({ example: '2026-07-13T12:00:00.000Z', description: 'UTC ISO-8601 timestamp' })
  updatedAt!: string;
}
