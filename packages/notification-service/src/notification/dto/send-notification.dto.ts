import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class SendNotificationDto {
  @ApiProperty({ description: 'Target Admin / User UUID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiPropertyOptional({ description: 'Associated Lead UUID', example: 'a0eebc99-9c0b-4ef8-bb6d-8b6d6bb9bd38' })
  @IsOptional()
  @IsUUID()
  leadId?: string;

  @ApiProperty({ description: 'Notification Event Type', example: 'CALL_MISSED' })
  @IsString()
  @IsNotEmpty()
  notificationType: string;

  @ApiProperty({ description: 'Alert Title', example: 'Missed Counseling Call Alert' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Detailed Message', example: 'Counselor missed scheduled demo call with prospect Aarav Sharma.' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ description: 'Priority level', example: 'HIGH', default: 'MEDIUM' })
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiPropertyOptional({ description: 'Action URL redirect for dashboard UI', example: '/leads/detail/123' })
  @IsOptional()
  @IsString()
  actionUrl?: string;

  @ApiPropertyOptional({ description: 'Additional JSON metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
