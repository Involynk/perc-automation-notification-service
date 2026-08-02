import { Controller, Post, Get, Patch, Param, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { NotificationService } from '../service/notification.service';
import { SendNotificationDto } from '../dto/send-notification.dto';
import { QueryNotificationDto } from '../dto/query-notification.dto';

@ApiTags('Notification Engine (Engine 8)')
@Controller('api/v1/notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('send')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send administrative notification (Engine 8)' })
  async sendNotification(@Body() dto: SendNotificationDto) {
    const record = await this.notificationService.sendNotification(dto);
    return { success: true, message: 'Notification dispatched to user inbox', data: record };
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get user notification inbox feed' })
  async getUserNotifications(@Param('userId') userId: string, @Query() query: QueryNotificationDto) {
    const result = await this.notificationService.getUserNotifications(userId, query);
    return { success: true, userId, ...result };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark specific notification as read' })
  async markAsRead(@Param('id') id: string) {
    const record = await this.notificationService.markAsRead(id);
    return { success: true, message: 'Notification marked as read', data: record };
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all unread notifications as read for user' })
  async markAllAsRead(@Body('userId') userId: string) {
    const result = await this.notificationService.markAllAsRead(userId);
    return { ...result, message: 'All notifications marked as read' };
  }

  @Post('digest')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate daily operation summary digest for counselor' })
  async generateDailyDigest(@Body('userId') userId: string) {
    const record = await this.notificationService.generateDailyDigest(userId || '550e8400-e29b-41d4-a716-446655440000');
    return { success: true, message: 'Daily digest notification created', data: record };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get notification priority & type analytics breakdown' })
  async getStats(@Query('userId') userId?: string) {
    const stats = await this.notificationService.getStats(userId);
    return { success: true, data: stats };
  }
}
