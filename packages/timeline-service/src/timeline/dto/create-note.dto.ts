import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateNoteDto {
  @ApiProperty({ description: 'Lead UUID' })
  @IsUUID()
  @IsNotEmpty()
  leadId: string;

  @ApiProperty({ description: 'Note title or topic' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Content of the internal note' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ description: 'Admin user UUID who added the note' })
  @IsOptional()
  @IsUUID()
  actorId?: string;

  @ApiPropertyOptional({ description: 'Additional tag or priority metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}
