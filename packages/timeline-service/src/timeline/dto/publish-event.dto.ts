import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsString, IsNotEmpty, IsOptional, IsObject, IsDateString } from 'class-validator';
import { SourceEngine, ActorType } from '../interfaces/timeline-event.interface';

export class PublishEventDto {
  @ApiProperty({ description: 'UUID of the workflow', example: '11111111-2222-3333-4444-555555555555' })
  @IsUUID()
  @IsNotEmpty()
  workflowId: string;

  @ApiProperty({ description: 'UUID of the lead', example: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' })
  @IsUUID()
  @IsNotEmpty()
  leadId: string;

  @ApiProperty({ description: 'Event type identifier', example: 'LEAD_CREATED' })
  @IsString()
  @IsNotEmpty()
  eventType: string;

  @ApiProperty({ description: 'Source Engine that produced the event', enum: SourceEngine, example: 'LEAD_CAPTURE' })
  @IsString()
  @IsNotEmpty()
  sourceEngine: string;

  @ApiPropertyOptional({ description: 'Actor type', enum: ActorType, example: 'System', default: 'System' })
  @IsOptional()
  @IsString()
  actorType?: string;

  @ApiPropertyOptional({ description: 'Actor UUID if user/admin', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsOptional()
  @IsUUID()
  actorId?: string;

  @ApiPropertyOptional({ description: 'Event title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Event detailed description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Engine-specific metadata (JSON object)' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Idempotency key to prevent duplicate event ingestion' })
  @IsOptional()
  @IsString()
  deduplicationKey?: string;

  @ApiPropertyOptional({ description: 'Timestamp when event occurred' })
  @IsOptional()
  @IsDateString()
  occurredAt?: string;
}
