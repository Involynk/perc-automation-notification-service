import axios from 'axios';
import { SourceEngine, KnownEventType, ActorType } from './enums';

export interface PublishEngineEventOptions {
  workflowId: string;
  leadId: string;
  eventType: string | KnownEventType;
  sourceEngine: string | SourceEngine;
  actorType: string | ActorType;
  title: string;
  description: string;
  metadata?: Record<string, any>;
  deduplicationKey?: string;
  occurredAt?: string;
  baseUrl?: string;
}

export interface PublishEventResponse {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

export class EventBusOrchestrator {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.TIMELINE_SERVICE_URL || 'http://localhost:3003';
  }

  /**
   * Publishes an engine event from any producer engine to the central Timeline Engine Bus
   */
  async publishEvent(options: PublishEngineEventOptions): Promise<PublishEventResponse> {
    const payload = {
      workflowId: options.workflowId,
      leadId: options.leadId,
      eventType: options.eventType,
      sourceEngine: options.sourceEngine,
      actorType: options.actorType,
      title: options.title,
      description: options.description,
      metadata: options.metadata || {},
      deduplicationKey:
        options.deduplicationKey ||
        `dedup_${options.sourceEngine.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      occurredAt: options.occurredAt || new Date().toISOString(),
    };

    try {
      const response = await axios.post(`${this.baseUrl}/api/v1/events/publish`, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000,
      });

      return response.data;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message || 'Unknown network error';
      return {
        success: false,
        error: Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg,
      };
    }
  }

  /**
   * Helper to fetch timeline events for a workflow
   */
  async getWorkflowTimeline(workflowId: string, options: { page?: number; limit?: number; sourceEngine?: string } = {}) {
    try {
      const response = await axios.get(`${this.baseUrl}/api/v1/workflows/${workflowId}/timeline`, {
        params: options,
      });
      return response.data;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Helper to fetch engine analytics breakdown stats
   */
  async getEngineStats() {
    try {
      const response = await axios.get(`${this.baseUrl}/api/v1/engines/stats`);
      return response.data;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
