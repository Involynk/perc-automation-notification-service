import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity({ name: 'timeline_events' })
export class TimelineEvent {
  @PrimaryColumn({ type: 'text' })
  id: string;

  @Column({ type: 'text', nullable: true })
  workflow_id?: string;

  @Column({ type: 'text' })
  lead_id: string;

  @Column({ type: 'text' })
  event_type: string;

  @Column({ type: 'text', nullable: true })
  event_type_id?: string;

  @Column({ type: 'text', nullable: true })
  source_engine?: string;

  @Column({ type: 'text' })
  actor_type: string;

  @Column({ type: 'text', nullable: true })
  actor_id?: string;

  @Column({ type: 'text', nullable: true })
  title?: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text' })
  metadata: Record<string, any> | string;

  @Column({ type: 'text', nullable: true })
  deduplication_key?: string;

  @Column({ type: 'text', nullable: true })
  occurred_at?: string;

  @Column({ type: 'text' })
  created_at: string;
}
