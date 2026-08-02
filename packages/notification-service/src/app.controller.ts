import { Controller, Get, Res } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';

@ApiTags('Health Check')
@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: 'Microservice Root Health Check & Redirect' })
  getRoot(@Res() res: Response) {
    return res.redirect('/api/docs');
  }

  @Get('health')
  @ApiOperation({ summary: 'Microservice Status Endpoint' })
  getHealth() {
    return {
      service: 'PERC Notification Engine (Engine 8)',
      status: 'online',
      version: '1.0',
      docsUrl: '/api/docs',
      timestamp: new Date().toISOString(),
    };
  }
}
