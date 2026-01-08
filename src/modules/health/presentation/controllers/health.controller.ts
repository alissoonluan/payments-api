import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  HealthCheckService,
  HealthCheck,
  MemoryHealthIndicator,
  DiskHealthIndicator,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { PrismaService } from '@infra/database/prisma/prisma.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: PrismaHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
    private prismaService: PrismaService,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Check API and dependencies health status' })
  @ApiResponse({
    status: 200,
    description: 'API and all dependencies are healthy',
  })
  @ApiResponse({
    status: 503,
    description: 'One or more dependencies are unhealthy',
  })
  check() {
    return this.health.check([
      () => this.db.pingCheck('database', this.prismaService),
    ]);
  }
}
