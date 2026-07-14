import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Makes {@link PrismaService} available application-wide. Declared global so
 * feature modules can inject the database client without re-importing this
 * module each time.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
