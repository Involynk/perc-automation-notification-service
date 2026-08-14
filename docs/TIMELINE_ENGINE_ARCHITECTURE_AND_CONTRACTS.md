# PERC CONVERSATION TIMELINE ENGINE – ARCHITECTURE & CONTRACTS

> **Domain-agnostic audit & conversation history engine that ingests, validates, deduplicates, and stores all lead lifecycle events reliably, and broadcasts timeline events to downstream services. No business logic.**

---

## High-Level Architecture & Contracts Map

```
┌────────────────────────────────────────────────────────┐                     ┌────────────────────────────────────────────────────────┐
│   1. INPUTS TO TIMELINE (From Domain Services via Kafka)│                     │    2. OUTPUT FROM TIMELINE (To Domain Services via Kafka│
├────────────────────────────────────────────────────────┤                     ├────────────────────────────────────────────────────────┤
│                                                        │                     │                                                        │
│  ┌──────────────┐                                      │                     │  Topic: perc.timeline.event-recorded                   │
│  │ 📅 EVENT     │  Topic:                              │                     │  Event: TIMELINE_EVENT_RECORDED                        │
│  │   INGEST     │  perc.timeline.events                │                     │                                                        │
│  │   COMMAND    │  (or event-ingest-requested)         │                     │  {                                                     │
│  └──────────────┘                                      │                     │    "eventId": "evt-7a91b2c3-d4e5-...",                 │
│      {                                                 │                     │    "eventType": "TIMELINE_EVENT_RECORDED",             │
│        "eventId": "evt-7a91b2c3-d4e5-...",             │                     │    "timelineId": "tl-8f1e2d3c-4b5a-...",               │
│        "workflowId": "9b1deb4d-3b7d-...",              │                     │    "workflowId": "9b1deb4d-3b7d-...",                  │
│        "leadId": "1b9d6bcd-bbfd-...",                  │                     │    "leadId": "1b9d6bcd-bbfd-...",                      │
│        "eventType": "MESSAGE_SENT",                    │                     │    "originalEventType": "MESSAGE_SENT",                │
│        "sourceEngine": "response-engine",              │                     │    "sourceEngine": "RESPONSE",                         │
│        "actorType": "Bot",                             │                     │    "actorType": "Bot",                                 │
│        "actorId": "bot-whatsapp-01",                   │                     │    "title": "WhatsApp Fee Brochure Sent",              │
│        "title": "WhatsApp Fee Brochure Sent",          │                     │    "description": "Delivered B.Tech fee schedule",     │
│        "description": "Delivered B.Tech fee schedule", │                     │    "metadata": {                                       │
│        "metadata": {                                   │                     │      "leadId": "1b9d6bcd-bbfd-...",                    │
│          "channel": "WHATSAPP",                        │                     │      "template": "fee_structure_btech",                │
│          "template": "fee_structure_btech"             │                     │      "channel": "WHATSAPP"                             │
│        },                                              │                     │    },                                                  │
│        "deduplicationKey": "dedup_resp_msg_101",       │                     │    "occurredAt": "2026-08-14T15:30:00.000Z",           │
│        "occurredAt": "2026-08-14T15:30:00.000Z"        │                     │    "recordedAt": "2026-08-14T15:30:00.045Z"            │
│      }                                                 │                     │  }                                                     │
│                                                        │                     │                                                        │
│  ┌──────────────┐                                      │                     │                 ┌─────────────────────────┐            │
│  │ 📝 APPEND    │  Topic:                              │                     │                 │ perc.timeline.          │            │
│  │   NOTE       │  perc.timeline.append-note-requested │                     │                 │ event-recorded          │            │
│  │   COMMAND    │                                      │                     │                 └───────────┬─────────────┘            │
│  └──────────────┘                                      │                     │                             │                          │
│      {                                                 │                     │         ┌───────────────────┼─────────────────┐        │
│        "eventId": "evt-note-101",                      │                     │         ▼                   ▼                 ▼        │
│        "workflowId": "9b1deb4d-3b7d-...",              │                     │  ┌───────────────┐  ┌──────────────┐  ┌─────────────┐  │
│        "leadId": "1b9d6bcd-bbfd-...",                  │                     │  │ Follow-up    │  │ Analytics    │  │ Recommend-  │  │
│        "actorId": "counselor-priya",                   │                     │  │ Engine       │  │ Engine       │  │ ation Engine│  │
│        "title": "Counseling Call Scheduled",           │                     │  │ (Consumes    │  │ (Consumes    │  │ (Consumes   │  │
│        "note": "Prefers evening demo at 4 PM"          │                     │  │ event-       │  │ event-       │  │ event-      │  │
│      }                                                 │                     │  │ recorded)    │  │ recorded)    │  │ recorded)   │  │
│                                                        │                     │  └───────────────┘  └──────────────┘  └─────────────┘  │
│  ┌──────────────┐                                      │                     │                                                        │
│  │ ⚠️ DEAD      │  Topic:                              │                     │  Timeline does not interpret metadata or business logic│
│  │   LETTER     │  perc.timeline.commands.dlq          │                     │  Each domain service interprets and performs its own   │
│  │   QUEUE      │  (perc.timeline.events.dlq)          │                     │  business operations.                                  │
│  └──────────────┘                                      │                     │                                                        │
└──────────────────────────┬─────────────────────────────┘                     └────────────────────────────────────────────────────────┘
                           │
                           ▼
┌───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                  TIMELINE ENGINE (INTERNAL PIPELINE)                                                  │
├───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                                                       │
│  1. 📥 Kafka Consumer          ──► Consumes event commands from `perc.timeline.events` (Parallel partitions by `leadId`)              │
│  2. 🔍 Check eventId           ──► Checks idempotency & deduplication (`deduplicationKey` in PostgreSQL / cache)                       │
│  3. 🛡️ Validate Schema / UUID   ──► Validates RFC-4122 UUIDs (`workflowId`, `leadId`), ISO timestamps. Bad messages ──► Route to DLQ   │
│  4. 🔄 Event Transformer       ──► Standardizes heterogeneous engine payloads into unified `TimelineEventRecord`                      │
│  5. 💾 Persist in PostgreSQL   ──► Inserts record into `timeline_events` table (Status = `RECORDED`)                                  │
│  6. ⚡ Cache / Search Index     ──► Updates in-memory lookup cache and query indexes                                                  │
│  7. 🔒 PostgreSQL Transaction  ──► Event = `RECORDED`, Outbox = `PENDING`                                                             │
│  8. 🚀 Outbox Publisher        ──► Reliably publishes `TIMELINE_EVENT_RECORDED` to Kafka topic `perc.timeline.event-recorded`         │
│                                                                                                                                       │
└───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Who Communicates with Timeline Engine?

| Service / Engine | Sends to Timeline Engine (Commands / Events) | Receives from Timeline Engine (Outbox Events / APIs) |
|---|---|---|
| **Lead Capture Engine (Engine 1)** | `LEAD_CREATED`, `LEAD_UPDATED`, `LEAD_SOURCE_IDENTIFIED` | — |
| **Response Template Engine (Engine 2)**| `MESSAGE_SENT`, `BROCHURE_SHARED`, `FEE_STRUCTURE_SHARED` | — |
| **Workflow Engine (Engine 3)** | `STATE_CHANGED`, `WORKFLOW_STARTED`, `WORKFLOW_CLOSED` | `TIMELINE_EVENT_RECORDED` |
| **Scheduler Engine (Engine 4)** | `REMINDER_SCHEDULED`, `REMINDER_CANCELLED`, `REMINDER_EXECUTED` | — |
| **Follow-up Engine (Engine 6)** | `FOLLOWUP_SENT`, `RECOVERY_INITIATED` | `TIMELINE_EVENT_RECORDED` (Auto-cancels follow-up if lead replies) |
| **Call & Meeting Engine (Engine 7)** | `CALL_COMPLETED`, `MEETING_SCHEDULED`, `MEETING_COMPLETED` | — |
| **Notification Engine (Engine 8)** | `NOTIFICATION_SENT`, `ESCALATION_TRIGGERED` | `TIMELINE_EVENT_RECORDED` (Dispatches counselor push alerts) |
| **Analytics Engine (Engine 9)** | — | `TIMELINE_EVENT_RECORDED` (Calculates SLA, Speed-to-Lead, Funnel) |
| **Recommendation Engine (Engine 10)** | — | `TIMELINE_EVENT_RECORDED` (Computes Next Best Action) |
| **Admin / Counselor Dashboard** | `INTERNAL_NOTE_ADDED`, `LEAD_ASSIGNED` | Real-time Chronological Visual Feed (`GET /timeline`) |

---

## 4. Internal Flow (High Level)

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│    PostgreSQL    │ ──► │  Kafka Consumer  │ ──► │ Event Validator  │ ──► │    PostgreSQL    │ ──► │ Outbox Publisher │ ──► │      Kafka       │
│ (Source of Truth)│     │    (Execution)   │     │  & Deduplication │     │  (Transaction)   │     │(Reliable Publish)│     │ (event-recorded) │
└──────────────────┘     └──────────────────┘     └──────────────────┘     └──────────────────┘     └──────────────────┘     └──────────────────┘
                               └───────────────────────────────────────────────────────────┘
                                                Outbox Pattern ensures at-least-once delivery
```

---

## 5. Key Guarantees

- **Idempotency**: Enforced via `eventId` + `deduplicationKey` checking against existing records. Duplicate events are acknowledged and skipped without re-inserting.
- **At-Least-Once Delivery**: Outbox pattern guarantees event publication to downstream services even during intermittent network failures.
- **Durability**: Supabase PostgreSQL `timeline_events` serves as the single source of truth for the entire organization.
- **Partition Ordering**: Kafka messages are keyed by `leadId` / `workflowId`, guaranteeing strict in-order processing of all events for any given prospect.
- **Resiliency & Non-Blocking**: Malformed or unparseable messages are redirected to `perc.timeline.commands.dlq` without stalling the consumer stream.

---

## 6. Kafka Topics Reference

### Input Topics (Domain Services ➔ Timeline Engine)
* **`perc.timeline.events`** / **`perc.timeline.event-ingest-requested`** *(Event Ingestion)*
* **`perc.timeline.append-note-requested`** *(Admin Note Command)*
* **`perc.timeline.commands.dlq`** / **`perc.timeline.events.dlq`** *(Dead Letter Queue)*

### Output Topic (Timeline Engine ➔ Domain Services)
* **`perc.timeline.event-recorded`** *(Timeline Event Recorded Broadcast)*

---

## 7. One Line Summary

> **"Timeline engine stores interaction history reliably, maintains chronological audit trail, and broadcasts 'new event recorded' – domain services decide what to do."**
