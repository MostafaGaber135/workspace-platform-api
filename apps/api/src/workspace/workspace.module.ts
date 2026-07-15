import { Module } from '@nestjs/common';
import { WorkspaceController } from './workspace.controller';
import { WorkspaceService } from './workspace.service';

/**
 * Workspace vertical slice. `PrismaService` is provided globally by
 * `PrismaModule`, so this module only declares its controller and service.
 */
@Module({
  controllers: [WorkspaceController],
  providers: [WorkspaceService],
})
export class WorkspaceModule {}
