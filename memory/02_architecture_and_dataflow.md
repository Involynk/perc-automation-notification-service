# Architecture & Data Flow Specification

This document details the system architecture, component interactions, lead routing rules, state machine transitions, and event flow pipelines.

---

## 1. System Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                                EVENT PRODUCERS                                    |
| (Lead Capture, Response, Workflow, Scheduler, Follow-up, Meeting, Admin Portal)   |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v (Events)
+-----------------------------------------+-----------------------------------------+
|                        AUTOMATION ORCHESTRATOR / REST BUS                         |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------+-----------------------------------------+
|             ENGINE 5: CONVERSATION TIMELINE ENGINE (Port 3003)                    |
|                                                                                   |
|  +---------------------+   +---------------------+   +-------------------------+  |
|  |   Event Consumer    | ->|   Event Validator   | ->|   Event Transformer     |  |
|  +---------------------+   +---------------------+   +-------------------------+  |
|                                                                   |               |
|  +---------------------+   +---------------------+                v               |
|  |  Timeline Dashboard | <-|  Timeline Service   | <-+-------------------------+  |
|  |  (http://locahost)  |   |    & REST APIs      |   |  PostgreSQL Repository  |  |
|  +---------------------+   +---------------------+   +-------------------------+  |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------+-----------------------------------------+
|                    TIMELINE DATABASE (Supabase PostgreSQL)                        |
|                            `timeline_events` Table                                |
+-----------------------------------------------------------------------------------+
```

---

## 2. Conversation Timeline Engine Architecture (Engine 5)

The **Conversation Timeline Engine** is a central history microservice. Instead of every engine storing its own history independently, every producer engine publishes events to the Orchestrator/Timeline Engine.

### Layer Responsibilities

1. **Event Consumer (`EventConsumerService`)**:
   - Ingests event payloads from REST endpoint (`POST /api/v1/events/publish`) or NestJS Event Emitter (`orchestrator.event.published`).
   - Completely decoupled from producer engines; only receives raw payload.

2. **Event Validator (`EventValidatorService`)**:
   - Validates `workflowId` (UUID format) and `leadId` (UUID format).
   - Validates non-empty `eventType` and `sourceEngine`.
   - Validates `occurredAt` timestamp.
   - Enforces **idempotency & deduplication** via `deduplicationKey` to prevent duplicate writes during retries.

3. **Event Transformer (`EventTransformerService`)**:
   - Standardizes engine-specific payloads into a uniform model: `{ type, title, description, actorType, sourceEngine, metadata }`.

4. **Timeline Service (`TimelineService`)**:
   - Provides functions for timeline creation, retrieval (`getWorkflowTimeline`, `getLeadTimeline`), keyword search, engine filtering, pagination, chronological sorting, and internal note creation.
   - Contains NO business decision logic (does not send messages, schedule calls, or change state).

5. **PostgreSQL Repository (`TimelineRepository`)**:
   - Handles database persistence to Supabase PostgreSQL `timeline_events` table using Prisma ORM.
   - Features indexed fields (`workflow_id`, `lead_id`, `occurred_at`) and `JSONB` metadata storage.
   - Includes automatic in-memory fallback store when database connection is pending.

---

## 3. Producer Engine Events Taxonomy

- **Lead Capture Engine**: `LEAD_CREATED`, `LEAD_UPDATED`, `LEAD_SOURCE_IDENTIFIED`
- **Response Engine**: `MESSAGE_SENT`, `BROCHURE_SHARED`, `FEE_STRUCTURE_SHARED`, `COURSE_DETAILS_SHARED`
- **Workflow Engine**: `WORKFLOW_STARTED`, `WORKFLOW_PAUSED`, `WORKFLOW_RESUMED`, `WORKFLOW_CLOSED`, `STATE_CHANGED`
- **Scheduler Engine**: `REMINDER_SCHEDULED`, `REMINDER_CANCELLED`, `REMINDER_EXECUTED`
- **Follow-up Engine**: `FOLLOWUP_SENT`, `RECOVERY_INITIATED`
- **Meeting Engine**: `CALL_COMPLETED`, `MEETING_SCHEDULED`, `MEETING_UPDATED`, `MEETING_COMPLETED`
- **Admin Portal**: `INTERNAL_NOTE_ADDED`, `LEAD_ASSIGNED`, `DOCUMENT_UPLOADED`

---

## 4. End-to-End Event Sequences

### Scenario 1: New Lead Ingestion Sequence
```
Website Form / Google Ads
    │
    ▼
Lead Capture Engine (Creates Lead)
    │
    ▼ Lead Created Event
Automation Orchestrator
    │
    ▼ Publish Event
Timeline Engine
    ├─► 1. Event Consumer Ingests
    ├─► 2. Event Validator Checks UUID & Deduplication Key
    ├─► 3. Event Transformer Standardizes to Common Model
    └─► 4. Save to PostgreSQL `timeline_events` Table
```

### Scenario 2: Counseling Meeting Completion
```
Meeting Engine (Call Finished)
    │
    ▼ Meeting Completed Event
Automation Orchestrator
    │
    ▼ Ingest Event
Timeline Engine ──► Store in Database ──► Real-Time Dashboard UI Updated
```
