import { IsString, IsNotEmpty, IsOptional, IsEnum, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationPriority } from '../interfaces/notification.interface';

export class CreateNotificationDto {
  @ApiProperty({ description: 'Target Counselor / User ID', example: 'usr-counselor-01' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiPropertyOptional({ description: 'Associated Lead UUID', example: '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed' })
  @IsOptional()
  @IsString()
  leadId?: string;

  @ApiProperty({ description: 'Notification Event Type', example: 'ESCALATION_TRIGGERED' })
  @IsString()
  @IsNotEmpty()
  notificationType: string;

  @ApiProperty({ description: 'Notification Title', example: 'Lead SLA Breached - Escalation' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Notification Message Body', example: 'Lead Rahul Kumar has received no response for > 2 hours.' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ description: 'Priority level', enum: NotificationPriority, default: NotificationPriority.NORMAL })
  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @ApiPropertyOptional({ description: 'Deep link URL to lead record', example: '/leads/1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed' })
  @IsOptional()
  @IsString()
  actionUrl?: string;

  @ApiPropertyOptional({ description: 'Custom JSON metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Idempotency Deduplication Key', example: 'dedup_notif_esc_101' })
  @IsOptional()
  @IsString()
  deduplicationKey?: string;
}

export class BroadcastNotificationDto {
  @ApiProperty({ description: 'Target User Role', example: 'counselor' })
  @IsString()
  @IsNotEmpty()
  targetRole: string;

  @ApiProperty({ description: 'Notification Event Type', example: 'SYSTEM_ALERT' })
  @IsString()
  @IsNotEmpty()
  notificationType: string;

  @ApiProperty({ description: 'Notification Title', example: 'Admissions Webinar Starting' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Notification Message Body', example: 'Batch orientation demo begins in 15 minutes.' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ description: 'Priority level', enum: NotificationPriority, default: NotificationPriority.NORMAL })
  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @ApiPropertyOptional({ description: 'Deep link URL', example: '/webinars/today' })
  @IsOptional()
  @IsString()
  actionUrl?: string;

  @ApiPropertyOptional({ description: 'Custom JSON metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
