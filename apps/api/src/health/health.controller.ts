import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiOkResponse, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import { type Response } from 'express';
import type { HealthCheckResponse, ReadinessCheckResponse } from '@developeros/shared-types';
import { HealthService } from './health.service';
import { HealthCheckResponseDto, ReadinessCheckResponseDto } from './health-check-response.dto';

/**
 * Health endpoints.
 *
 * `/health/live` — liveness: process is up and serving HTTP. Never probes the
 * database, so it succeeds even when PostgreSQL is down. Used by the web
 * client's foundational connectivity check and by uptime monitors.
 *
 * `/health/ready` — readiness: returns 200 when the database is reachable and
 * 503 when it is not, so load balancers can gate traffic without affecting
 * liveness.
 */
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('live')
  @ApiOkResponse({ type: HealthCheckResponseDto, description: 'Process liveness status' })
  checkLiveness(): HealthCheckResponse {
    return this.healthService.checkLiveness();
  }

  @Get('ready')
  @ApiOkResponse({ type: ReadinessCheckResponseDto, description: 'Database is reachable' })
  @ApiServiceUnavailableResponse({ description: 'Database is not reachable' })
  async checkReadiness(@Res({ passthrough: true }) res: Response): Promise<ReadinessCheckResponse> {
    const body = await this.healthService.checkReadiness();
    res.status(body.status === 'ok' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);
    return body;
  }
}
