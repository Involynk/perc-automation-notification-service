export interface TimelineEvent {
  id: string;
  workflow_id: string;
  lead_id: string;
  event_type: string;
  source_engine: string;
  actor_type: string;
  actor_id?: string;
  title: string;
  description: string;
  metadata: Record<string, any> | string;
  deduplication_key?: string;
  occurred_at: string;
  created_at: string;
}
