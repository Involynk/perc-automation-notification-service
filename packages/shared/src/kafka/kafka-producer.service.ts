import { Kafka, Producer, ProducerRecord } from 'kafkajs';
import {
  KAFKA_TOPIC_TIMELINE_EVENTS,
  KAFKA_TOPIC_TIMELINE_APPEND_NOTE,
  KAFKA_TOPIC_TIMELINE_EVENT_RECORDED,
  KAFKA_TOPIC_TIMELINE_DLQ,
} from './kafka.topics';
import {
  KafkaTimelineEventInput,
  KafkaAppendNoteInput,
  KafkaTimelineEventRecordedOutput,
  KafkaTimelineDlqMessage,
} from './kafka.contracts';

export interface KafkaProducerConfig {
  brokers?: string[];
  clientId?: string;
  enabled?: boolean;
}

export class KafkaProducerService {
  private kafka: Kafka | null = null;
  private producer: Producer | null = null;
  private isConnected = false;
  private inMemoryBus: Array<{ topic: string; key: string; value: any; timestamp: string }> = [];

  constructor(private readonly config: KafkaProducerConfig = {}) {
    const brokersEnv = process.env.KAFKA_BROKERS;
    const brokers = this.config.brokers || (brokersEnv ? brokersEnv.split(',') : ['localhost:9092']);
    const clientId = this.config.clientId || process.env.KAFKA_CLIENT_ID || 'perc-kafka-producer';
    const enabled = this.config.enabled ?? (process.env.KAFKA_ENABLED === 'true' || !!brokersEnv);

    if (enabled) {
      try {
        this.kafka = new Kafka({
          clientId,
          brokers,
          retry: { initialRetryTime: 100, retries: 3 },
        });
        this.producer = this.kafka.producer();
      } catch (err: any) {
        console.warn(`[KafkaProducer] Failed to initialize Kafka client: ${err.message}. Falling back to in-memory mode.`);
      }
    }
  }

  async connect(): Promise<void> {
    if (this.producer && !this.isConnected) {
      try {
        await this.producer.connect();
        this.isConnected = true;
        console.log('[KafkaProducer] Successfully connected to Kafka broker.');
      } catch (error: any) {
        console.warn(`[KafkaProducer] Broker connection failed: ${error.message}. Running in in-memory event bus mode.`);
        this.isConnected = false;
      }
    }
  }

  async disconnect(): Promise<void> {
    if (this.producer && this.isConnected) {
      try {
        await this.producer.disconnect();
        this.isConnected = false;
      } catch (err: any) {
        console.error(`[KafkaProducer] Error disconnecting: ${err.message}`);
      }
    }
  }

  /**
   * Send a generic message to Kafka with partition keying
   */
  async sendMessage(topic: string, key: string, payload: any): Promise<{ success: boolean; topic: string; offset?: string; error?: string }> {
    const timestamp = new Date().toISOString();
    this.inMemoryBus.push({ topic, key, value: payload, timestamp });

    if (this.producer && this.isConnected) {
      try {
        const record: ProducerRecord = {
          topic,
          messages: [
            {
              key,
              value: JSON.stringify(payload),
              timestamp: Date.now().toString(),
            },
          ],
        };
        const result = await this.producer.send(record);
        return { success: true, topic, offset: result[0]?.baseOffset };
      } catch (error: any) {
        console.error(`[KafkaProducer] Failed to produce to topic ${topic}: ${error.message}`);
        return { success: false, topic, error: error.message };
      }
    }

    return { success: true, topic, offset: 'in-memory-offset' };
  }

  /**
   * Publish an engine event to trigger Timeline Engine (Engine 5)
   * Topic: perc.timeline.events
   */
  async publishTimelineEvent(event: KafkaTimelineEventInput): Promise<{ success: boolean; eventId: string; error?: string }> {
    const partitionKey = event.leadId || event.workflowId || 'global';
    const result = await this.sendMessage(KAFKA_TOPIC_TIMELINE_EVENTS, partitionKey, event);
    return {
      success: result.success,
      eventId: event.eventId,
      error: result.error,
    };
  }

  /**
   * Publish an internal note creation command
   * Topic: perc.timeline.append-note-requested
   */
  async publishAppendNoteCommand(command: KafkaAppendNoteInput): Promise<{ success: boolean; eventId: string; error?: string }> {
    const partitionKey = command.leadId || command.workflowId;
    const result = await this.sendMessage(KAFKA_TOPIC_TIMELINE_APPEND_NOTE, partitionKey, command);
    return {
      success: result.success,
      eventId: command.eventId,
      error: result.error,
    };
  }

  /**
   * Publish output recorded event from Engine 5 to downstream engines
   * Topic: perc.timeline.event-recorded
   */
  async publishTimelineRecordedOutput(output: KafkaTimelineEventRecordedOutput): Promise<{ success: boolean; timelineId: string; error?: string }> {
    const partitionKey = output.leadId || output.workflowId;
    const result = await this.sendMessage(KAFKA_TOPIC_TIMELINE_EVENT_RECORDED, partitionKey, output);
    return {
      success: result.success,
      timelineId: output.timelineId,
      error: result.error,
    };
  }

  /**
   * Publish unparseable or failed messages to DLQ
   * Topic: perc.timeline.events.dlq
   */
  async publishToDlq(dlqMessage: KafkaTimelineDlqMessage): Promise<{ success: boolean; error?: string }> {
    const partitionKey = dlqMessage.rawPayload?.leadId || 'dlq';
    return this.sendMessage(KAFKA_TOPIC_TIMELINE_DLQ, partitionKey, dlqMessage);
  }

  getInMemoryEvents(topic?: string) {
    if (!topic) return this.inMemoryBus;
    return this.inMemoryBus.filter((m) => m.topic === topic);
  }

  clearInMemoryEvents() {
    this.inMemoryBus = [];
  }
}
