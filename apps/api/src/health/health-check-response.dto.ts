import { ApiProperty } from '@nestjs/swagger';
import {
  DependencyStatus,
  HealthStatus,
  type HealthCheckResponse,
  type ReadinessCheckResponse,
} from '@developeros/shared-types';

/**
 * OpenAPI-annotated representation of {@link HealthCheckResponse} (liveness).
 *
 * The shared type is a plain interface (no runtime metadata), so this class
 * exists purely to give `@nestjs/swagger` accurate schema information for the
 * `/docs` output. It structurally satisfies the shared interface.
 */
export class HealthCheckResponseDto implements HealthCheckResponse {
  @ApiProperty({ enum: Object.values(HealthStatus), example: HealthStatus.OK })
  status!: HealthStatus;

  @ApiProperty({ example: '0.1.0', description: 'Service semantic version' })
  version!: string;

  @ApiProperty({ example: '2026-07-12T17:00:00.000Z', description: 'UTC ISO-8601 timestamp' })
  timestamp!: string;

  @ApiProperty({ example: 42, description: 'Process uptime in whole seconds' })
  uptimeSeconds!: number;
}

/**
 * OpenAPI-annotated representation of {@link ReadinessCheckResponse}.
 */
export class ReadinessCheckResponseDto implements ReadinessCheckResponse {
  @ApiProperty({ enum: ['ok', 'error'], example: 'ok' })
  status!: 'ok' | 'error';

  @ApiProperty({ enum: Object.values(DependencyStatus), example: DependencyStatus.UP })
  database!: DependencyStatus;

  @ApiProperty({ example: '2026-07-12T17:00:00.000Z', description: 'UTC ISO-8601 timestamp' })
  timestamp!: string;
}
