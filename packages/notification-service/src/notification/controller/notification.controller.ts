import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { NotificationService } from '../service/notification.service';
import { CreateNotificationDto, BroadcastNotificationDto } from '../dto/create-notification.dto';
import { NotificationQueryDto } from '../dto/query-notification.dto';

@ApiTags('Notifications')
@Controller('api/v1/notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('send')
  @ApiOperation({ summary: 'Send targeted notification to counselor/user' })
  @ApiResponse({ status: 201, description: 'Notification created and dispatched' })
  async sendNotification(@Body() dto: CreateNotificationDto) {
    const data = await this.notificationService.createNotification(dto);
    return { success: true, message: 'Notification delivered', data };
  }

  @Post('broadcast')
  @ApiOperation({ summary: 'Broadcast notification to an entire role' })
  @ApiResponse({ status: 201, description: 'Broadcast notifications dispatched' })
  async broadcastNotification(@Body() dto: BroadcastNotificationDto) {
    const data = await this.notificationService.broadcastNotification(dto);
    return { success: true, message: `Dispatched to ${data.length} users`, data };
  }

  @Get()
  @ApiOperation({ summary: 'Get counselor inbox notification feed' })
  async getInbox(@Query() query: NotificationQueryDto) {
    return this.notificationService.getInbox(query);
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark single notification as read' })
  async markAsRead(@Param('id') id: string) {
    const data = await this.notificationService.markAsRead(id);
    return { success: true, message: 'Notification marked as read', data };
  }

  @Patch('users/:userId/read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read for a user' })
  async markAllAsRead(@Param('userId') userId: string) {
    return this.notificationService.markAllAsRead(userId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get notification engine analytics & unread counts' })
  async getStats(@Query('userId') userId?: string) {
    const stats = await this.notificationService.getStats(userId);
    return { success: true, data: stats };
  }

  @Get('digest/:userId')
  @ApiOperation({ summary: 'Get daily summary digest for counselor' })
  async getDailyDigest(@Param('userId') userId: string) {
    const digest = await this.notificationService.getDailyDigest(userId);
    return { success: true, data: digest };
  }
}
