# PERC Admission Operations Engine

A robust, enterprise-grade NestJS microservices platform for multi-channel lead capture, intelligent category classification, automated WhatsApp routing, promise-based follow-up scheduling, centralized conversation timeline auditing, counselor notifications, and real-time operational analytics.

---

## 1. System Architecture & Ecosystem Map

```
                     ┌──────────────────────────────────────────────────────────┐
                     │                    INBOUND CHANNELS                      │
                     │  (WhatsApp Cloud API, Instagram, FB Messenger, Web Form) │
                     └────────────────────────────┬─────────────────────────────┘
                                                  │
                                                  ▼
                     ┌──────────────────────────────────────────────────────────┐
                     │              API GATEWAY (Port 3000)                     │
                     │     • Inbound Webhooks & Lead Ingestion                  │
                     │     • Intent Classification & Phone Extraction           │
                     └───────┬───────────────────────┬──────────────────────────┘
                             │                       │
           Publish Event     │                       │ Send Outbound
                  ┌──────────┘                       ▼
                  │                  ┌──────────────────────────────────────────┐
                  │                  │    COMMUNICATION SERVICE (Port 3001)     │
                  │                  │     • WhatsApp, Email, Instagram, FB     │
                  │                  └───────┬──────────────────────────────────┘
                  │                          │
                  │                          │ Emits MESSAGE_SENT
                  │                          ▼
┌─────────────────▼─────────────────────────────────────────────────────────────────────────┐
│                           EVENT PRODUCERS & ORCHESTRATION                                  │
│                                                                                           │
│  ┌───────────────────────────────┐     ┌────────────────────────────────────────────────┐ │
│  │ WORKFLOW SERVICE (Port 3002)  │     │ COUNSELOR / ADMIN ACTIONS & CRON               │ │
│  │ • State Machine Engine        │     │ • 1-on-1 Counseling Calls & Meetings           │ │
│  │ • Promise & Follow-up Cron    │     │ • Manual Notes & Assignment                    │ │
│  └──────────────┬────────────────┘     └───────────────────────┬────────────────────────┘ │
└─────────────────┼──────────────────────────────────────────────┼──────────────────────────┘
                  │                                              │
                  ├───────────────────────┬──────────────────────┤
                  │                       │                      │
                  ▼                       ▼                      ▼
┌───────────────────────────────┐ ┌───────────────────────────────┐ ┌──────────────────────┐
│  TIMELINE ENGINE (Port 3003)  │ │ NOTIFICATION ENGINE(Port 3004)│ │  ANALYTICS ENGINE    │
│  [Engine 5]                   │ │ [Engine 8]                    │ │  [Engine 9 - P3005]  │
│  • Event Consumer             │ │ • Notification Consumer       │ │ • Live KPI Dash      │
│  • Event Validator (UUID/Dedup│ │ • Rule & Preference Evaluator │ │ • 13-Stage Funnel    │
│  • Event Transformer          │ │ • Priority Normalizer         │ │ • Speed-to-Lead SLA  │
│  • Prisma / Supabase Repo     │ │ • Prisma / Supabase Repo      │ │ • Counselor Scores   │
│  • Interactive Visual UI      │ │ • Counselor Inbox Feed & Read │ │ • CSV Export         │
└───────────────┬───────────────┘ └───────────────┬───────────────┘ └──────────────────────┘
                │                                 │
                ▼                                 ▼
┌───────────────────────────────┐ ┌───────────────────────────────┐
│     PostgreSQL Supabase       │ │      PostgreSQL Supabase      │
│   Table: `timeline_events`    │ │     Table: `notifications`    │
└───────────────────────────────┘ └───────────────────────────────┘
```

---

## 2. Microservice Packages & Ports

| Package | Port | Role / Primary Responsibilities | Swagger / Docs |
|---|---|---|---|
| `packages/api-gateway` | `3000` | Inbound webhooks, REST controllers for leads/messages/promises, routing service, lead management | `/api/docs` |
| `packages/communication-service` | `3001` | Channel provider abstraction (WhatsApp API, Nodemailer Email, Instagram, Facebook Messenger) | N/A |
| `packages/workflow-service` | `3002` | Lead state machine engine, background promise runner & cron scheduler (30s interval) | N/A |
| `packages/timeline-service` | `3003` | **Engine 5**: Central Conversation Timeline Engine (Ingestion, validation, deduplication, Prisma Supabase repository, search, visual dashboard) | `/api/docs` & root `/` |
| `packages/notification-service` | `3004` | **Engine 8**: Central Notification Engine (Administrative notifications, counselor inbox feeds, daily summary digests, read status) | `/api/docs` |
| `packages/analytics-service` | `3005` | **Engine 9**: Central Analytics Engine (Real-time operational KPIs, 13-stage funnel metrics, channel ROI, counselor scorecards, speed-to-lead SLAs, CSV export) | `/api/docs` |
| `packages/shared` | N/A | Monorepo shared library: TypeORM/Prisma entities, enums, constants, database seeder, and HTTP SDK clients (`EventBusOrchestrator`, `NotificationClient`, `AnalyticsClient`) | N/A |

---

## 3. Conversation Timeline Engine (Engine 5 — Port 3003)

The **Conversation Timeline Engine** serves as the immutable, centralized history and audit microservice for all events occurring across the admission lifecycle.

### 3.1 Key Responsibilities
- **Decoupled Ingestion**: Ingests events synchronously via REST API (`POST /api/v1/events/publish`) or asynchronously via NestJS Event Emitter (`orchestrator.event.published`).
- **Validation & Idempotency**: Validates RFC UUIDs for `workflowId` and `leadId`, ISO timestamps, and enforces unique `deduplicationKey` constraints to prevent duplicate writes during network retries.
- **Event Transformation**: Normalizes heterogeneous engine payloads into a unified data contract (`workflowId`, `leadId`, `eventType`, `sourceEngine`, `actorType`, `actorId`, `title`, `description`, `metadata`, `deduplicationKey`, `occurredAt`).
- **Zero Business Logic**: Contains no business decision logic (does not send messages, change workflow states, or schedule meetings).
- **Search & Pagination**: Rich query APIs supporting keyword search, filtering by engine/event type/actor, and ascending/descending pagination.
- **Visual Dashboard**: Interactive UI dashboard served on `http://localhost:3003` with a real-time event simulator.

### 3.2 Database Schema (`timeline_events`)
```prisma
model TimelineEvent {
  id               String   @id @default(uuid()) @db.Uuid
  workflowId       String   @map("workflow_id") @db.Uuid
  leadId           String   @map("lead_id") @db.Uuid
  eventType        String   @map("event_type") @db.VarChar(100)
  sourceEngine     String   @map("source_engine") @db.VarChar(100)
  actorType        String   @map("actor_type") @db.VarChar(50)
  actorId          String?  @map("actor_id") @db.Uuid
  title            String   @db.Text
  description      String   @db.Text
  metadata         Json     @default("{}") @db.JsonB
  deduplicationKey String?  @unique @map("deduplication_key") @db.VarChar(255)
  occurredAt       DateTime @default(now()) @map("occurred_at") @db.Timestamptz
  createdAt        DateTime @default(now()) @map("created_at") @db.Timestamptz

  @@index([workflowId, occurredAt])
  @@index([leadId, occurredAt])
  @@index([eventType])
  @@index([sourceEngine])
  @@map("timeline_events")
}
```

### 3.3 Kafka Architecture & Event Contracts

Engine 5 is fully Kafka-native, providing decoupled asynchronous event streaming, partition ordering, and DLQ routing:

#### Input Topics (Domain Services ➔ Engine 5)
- **`perc.timeline.events`**: Main event ingestion stream for all domain engines. Partitioned by `leadId` / `workflowId` for strict sequential ordering per lead.
- **`perc.timeline.append-note-requested`**: Command topic for counselor & admin internal notes.
- **`perc.timeline.events.dlq`**: Dead Letter Queue capturing unparseable/malformed payloads without halting stream consumption.

#### Output Topic (Engine 5 ➔ Downstream Engines)
- **`perc.timeline.event-recorded`**: Emits `TIMELINE_EVENT_RECORDED` payload upon successful persistence to Supabase PostgreSQL. Consumed by **Engine 6 (Follow-up)**, **Engine 9 (Analytics)**, **Engine 10 (Recommendation)**, and **Engine 8 (Notification)**.

#### Kafka Event Schema
```json
{
  "eventId": "evt-7a91b2c3-d4e5-4a1b-8c2d-3e4f5a6b7c8d",
  "workflowId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "leadId": "1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed",
  "eventType": "MESSAGE_SENT",
  "sourceEngine": "RESPONSE",
  "actorType": "Bot",
  "actorId": "bot-whatsapp-01",
  "title": "WhatsApp Fee Brochure Sent",
  "description": "Delivered B.Tech fee structure via WhatsApp",
  "metadata": { "channel": "whatsapp", "template": "btech_fees" },
  "deduplicationKey": "dedup_resp_msg_101",
  "occurredAt": "2026-08-14T15:30:00.000Z"
}
```

### 3.4 REST Endpoints

| Method | Endpoint Path | Summary | Description / Parameters |
|---|---|---|---|
| `POST` | `/api/v1/events/publish` | Publish Timeline Event | Ingests event with UUID validation & idempotency checks (`PublishEventDto`) |
| `GET` | `/api/v1/workflows/:workflowId/timeline` | Workflow Timeline | Chronological timeline for a specific workflow (`TimelineQueryDto`) |
| `GET` | `/api/v1/leads/:leadId/timeline` | Lead Timeline | Timeline for a lead across all workflow instances (`TimelineQueryDto`) |
| `GET` | `/api/v1/timeline/search` | Search Timeline | Search events across platform by query, type, engine, actor |
| `GET` | `/api/v1/timeline/:eventId` | Get Event Details | Fetches single event with full `JSONB` metadata |
| `POST` | `/api/v1/workflows/:workflowId/notes` | Add Internal Note | Appends counselor internal note (`CreateNoteDto`) with `ADMIN` attribution |
| `GET` | `/api/v1/engines/stats` | Engine Stats | Aggregated event counts grouped by engine, event type, and active workflows |


---

## 4. Notification Engine (Engine 8 — Port 3004)

The **Notification Engine** acts as the central administrative notification and operational alert hub for admissions counselors, staff, and team leads.

### 4.1 Key Responsibilities
- **Alert Dispatching**: Dispatches targeted operational alerts to counselor inbox feeds.
- **Rule & Preference Evaluation (`PreferenceService`)**:
  - Normalizes external event types into database constraints (`normalizeNotificationType`).
  - Automatically escalates high-urgency triggers (`CALL_MISSED`, `ESCALATION_TRIGGERED`, `meeting_missed`) to **`CRITICAL`** priority.
- **Priority Management (`normalizePriority`)**: Coerces priority levels to database enum constraints (`low`, `normal`, `high`, `critical`).
- **Counselor Inbox Feed**: Serves paginated feeds filtered by user ID, read/unread state, and priority.
- **Read State Tracking**: Updates `isRead` and `readAt` timestamps individually or in bulk (`read-all`).
- **Daily Operations Digest**: Automatically compiles and issues daily operational activity digests for counselors.

### 4.2 Database Schema (`notifications`)
```prisma
model Notification {
  id               String    @id @default(uuid()) @db.Uuid
  userId           String    @map("user_id") @db.Uuid
  leadId           String?   @map("lead_id") @db.Uuid
  notificationType String    @map("notification_type") @db.VarChar(100)
  title            String    @db.Text
  message          String    @db.Text
  isRead           Boolean   @default(false) @map("is_read")
  readAt           DateTime? @map("read_at") @db.Timestamptz
  actionUrl        String?   @map("action_url") @db.Text
  priority         String    @default("MEDIUM") @db.VarChar(20)
  metadata         Json      @default("{}") @db.JsonB
  createdAt        DateTime  @default(now()) @map("created_at") @db.Timestamptz

  @@index([userId, isRead])
  @@index([priority])
  @@index([notificationType])
  @@map("notifications")
}
```

### 4.3 REST Endpoints

| Method | Endpoint Path | Summary | Description / Parameters |
|---|---|---|---|
| `POST` | `/api/v1/notifications/send` | Send Notification | Dispatches alert to user inbox (`SendNotificationDto`) |
| `GET` | `/api/v1/notifications/user/:userId` | User Notifications Feed | Paginated inbox filtered by `unreadOnly`, `priority`, `notificationType` |
| `PATCH` | `/api/v1/notifications/:id/read` | Mark Notification Read | Marks single notification as read and sets `readAt` timestamp |
| `POST` | `/api/v1/notifications/read-all` | Mark All Read | Marks all unread notifications read for a specified user |
| `POST` | `/api/v1/notifications/digest` | Daily Digest | Creates daily operations summary digest for counselor |
| `GET` | `/api/v1/notifications/stats` | Notification Stats | Priority and notification type volume breakdown |
| `GET` | `/health` | Health Check | Service status and version information |

---

## 5. Inter-Service Communication & SDK Clients

The `@perc/shared` package provides typed HTTP SDK clients to simplify and standardize cross-service calls:

### 5.1 Publishing Events to Timeline Engine (`EventBusOrchestrator`)
```typescript
import { EventBusOrchestrator, KnownEventType, SourceEngine, ActorType } from '@perc/shared';

const timelineClient = new EventBusOrchestrator(process.env.TIMELINE_SERVICE_URL || 'http://localhost:3003');

await timelineClient.publishEvent({
  workflowId: '11111111-2222-3333-4444-555555555555',
  leadId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  eventType: KnownEventType.LEAD_CREATED,
  sourceEngine: SourceEngine.LEAD_CAPTURE,
  actorType: ActorType.SYSTEM,
  title: 'Lead Ingested',
  description: 'Inquiry captured from WhatsApp with fee enquiry intent',
  metadata: { channel: 'whatsapp', category: 'fee_enquiry' },
});
```

### 5.2 Sending Alerts to Notification Engine (`NotificationClient`)
```typescript
import { NotificationClient } from '@perc/shared';

const notifClient = new NotificationClient(process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004');

await notifClient.sendNotification({
  userId: '550e8400-e29b-41d4-a716-446655440000',
  leadId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  notificationType: 'CALL_MISSED',
  title: 'Urgent: Missed Counseling Call Alert',
  message: 'Counselor missed scheduled demo call with prospect Aarav Sharma.',
  priority: 'CRITICAL',
  actionUrl: '/leads/detail/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
});
```

### 5.3 Communication Matrix

| Producer Service | Consumer Service | Trigger / Event | Protocol & Route | Data Exchanged |
|---|---|---|---|---|
| **API Gateway (3000)** | **Timeline (3003)** | Lead captured / Phone extracted | `POST /api/v1/events/publish` | `leadId`, `workflowId`, `LEAD_CREATED`, source channel, metadata |
| **API Gateway (3000)** | **Notification (3004)** | New high-priority lead assigned | `POST /api/v1/notifications/send` | `userId`, `leadId`, `NEW_LEAD`, lead details, deep link URL |
| **Communication (3001)** | **Timeline (3003)** | Outbound message sent (WhatsApp, Email) | `POST /api/v1/events/publish` | `MESSAGE_SENT`, `BROCHURE_SHARED`, recipient phone, channel |
| **Workflow (3002)** | **Timeline (3003)** | State machine transition | `POST /api/v1/events/publish` | `STATE_CHANGED`, old state, new state, trigger event |
| **Workflow (3002)** | **Timeline (3003)** | Follow-up reminder scheduled/executed | `POST /api/v1/events/publish` | `REMINDER_SCHEDULED`, `REMINDER_EXECUTED`, due time |
| **Workflow (3002)** | **Notification (3004)** | Follow-up overdue / SLA breached | `POST /api/v1/notifications/send` | `userId`, `ESCALATION`, overdue minutes, lead ID |
| **Counseling / CRM** | **Timeline (3003)** | Counselor appends internal note | `POST /api/v1/workflows/:id/notes` | `workflowId`, `leadId`, note content, `actorId` |
| **Counseling / CRM** | **Notification (3004)** | Scheduled meeting missed | `POST /api/v1/notifications/send` | `userId`, `CALL_MISSED`, missed call duration |

---

## 6. Quick Start & Running Locally

### 6.1 Prerequisites
- Node.js 18+
- npm 9+
- Supabase PostgreSQL account / credentials (or use automatic in-memory fallback for local dev)

### 6.2 Installation & Build
```bash
# Clone the repository
git clone https://github.com/Involynk/PERC-Automation.git
cd PERC-Automation

# Install all monorepo dependencies
npm install

# Build shared package first
npm run build -w packages/shared
```

### 6.3 Starting Microservices Individually
```bash
# Terminal 1: API Gateway (Port 3000)
npm run start:dev -w packages/api-gateway

# Terminal 2: Communication Service (Port 3001)
npm run start:dev -w packages/communication-service

# Terminal 3: Workflow Service (Port 3002)
npm run start:dev -w packages/workflow-service

# Terminal 4: Timeline Service (Port 3003)
npm run start:dev -w packages/timeline-service

# Terminal 5: Notification Service (Port 3004)
npm run start:dev -w packages/notification-service

# Terminal 6: Analytics Service (Port 3005)
npm run start:dev -w packages/analytics-service
```

### 6.4 Starting via Docker Compose
```bash
docker compose up --build
```

---

## 7. Environment Configuration (`.env`)

```ini
# Supabase PostgreSQL Database Credentials
DATABASE_URL="postgresql://postgres.[PROJECT]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[PROJECT]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
SUPABASE_URL="https://[PROJECT].supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6..."

# Service Ports & Base URLs
API_GATEWAY_PORT=3000
COMMUNICATION_SERVICE_PORT=3001
WORKFLOW_SERVICE_PORT=3002
TIMELINE_SERVICE_PORT=3003
NOTIFICATION_SERVICE_PORT=3004
ANALYTICS_SERVICE_PORT=3005

TIMELINE_SERVICE_URL="http://localhost:3003"
NOTIFICATION_SERVICE_URL="http://localhost:3004"
ANALYTICS_SERVICE_URL="http://localhost:3005"
COMMUNICATION_SERVICE_URL="http://localhost:3001"
WORKFLOW_SERVICE_URL="http://localhost:3002"

# Channel Integration Keys
WHATSAPP_PHONE_NUMBER_ID=""
WHATSAPP_ACCESS_TOKEN=""
INSTAGRAM_ACCESS_TOKEN=""
FACEBOOK_PAGE_ACCESS_TOKEN=""
```
