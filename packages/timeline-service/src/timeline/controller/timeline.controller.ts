import { Controller, Post, Get, Param, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { TimelineService } from '../service/timeline.service';
import { PublishEventDto } from '../dto/publish-event.dto';
import { TimelineQueryDto } from '../dto/timeline-query.dto';
import { CreateNoteDto } from '../dto/create-note.dto';

@ApiTags('Conversation Timeline Engine')
@Controller('api/v1')
export class TimelineController {
  constructor(private readonly timelineService: TimelineService) {}

  @Post('events/publish')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Publish an event to Timeline Engine' })
  async publishEvent(@Body() dto: PublishEventDto) {
    const record = await this.timelineService.publishEvent(dto);
    return { success: true, message: 'Event published to timeline', data: record };
  }

  @Get('workflows/:workflowId/timeline')
  @ApiOperation({ summary: 'Get workflow conversation timeline' })
  async getWorkflowTimeline(@Param('workflowId') workflowId: string, @Query() query: TimelineQueryDto) {
    const result = await this.timelineService.getWorkflowTimeline(workflowId, query);
    return { success: true, workflowId, ...result };
  }

  @Get('leads/:leadId/timeline')
  @ApiOperation({ summary: 'Get lead conversation history across workflows' })
  async getLeadTimeline(@Param('leadId') leadId: string, @Query() query: TimelineQueryDto) {
    const result = await this.timelineService.getLeadTimeline(leadId, query);
    return { success: true, leadId, ...result };
  }

  @Get('timeline/search')
  @ApiOperation({ summary: 'Search timeline events across platform' })
  async searchTimeline(@Query() query: TimelineQueryDto) {
    const result = await this.timelineService.searchTimeline(query);
    return { success: true, ...result };
  }

  @Get('timeline/:eventId')
  @ApiOperation({ summary: 'Get details of specific timeline event' })
  async getEventDetails(@Param('eventId') eventId: string) {
    const record = await this.timelineService.getEventDetails(eventId);
    return { success: true, data: record };
  }

  @Post('workflows/:workflowId/notes')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add internal note to workflow timeline' })
  async addInternalNote(@Param('workflowId') workflowId: string, @Body() dto: CreateNoteDto) {
    const record = await this.timelineService.addInternalNote(workflowId, dto);
    return { success: true, message: 'Internal note appended to timeline', data: record };
  }

  @Get('engines/stats')
  @ApiOperation({ summary: 'Get timeline engine analytics breakdown' })
  async getStats() {
    const stats = await this.timelineService.getStats();
    return { success: true, data: stats };
  }
}
