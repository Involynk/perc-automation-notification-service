import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryNotificationDto {
  @ApiPropertyOptional({ description: 'Filter unread notifications only', default: false })
  @IsOptional()
  @Type(() => Boolean)
  unreadOnly?: boolean;

  @ApiPropertyOptional({ description: 'Filter by priority level (LOW, MEDIUM, HIGH, CRITICAL)' })
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiPropertyOptional({ description: 'Filter by notification type' })
  @IsOptional()
  @IsString()
  notificationType?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Limit per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  limit?: number = 20;
}
