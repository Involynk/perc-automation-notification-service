# Database & Entity Specification

This document details database tables, TypeORM / Prisma entities, column types, keys, and indexes across the monorepo services.

---

## 1. Database Architecture & Technologies

- **Primary Database**: Supabase PostgreSQL (`JSONB` support, indexed time-series queries).
- **ORM / Query Layers**:
  - **`packages/timeline-service`**: **Prisma ORM** targeting Supabase PostgreSQL (`timeline_events` table).
  - **`packages/api-gateway`**: Supabase Client singleton (`@supabase/supabase-js`) using service role.
- **Development Fallback**: In-memory repository store auto-fallback when `DATABASE_URL` is unconfigured.

---

## 2. Table: `timeline_events` (Conversation Timeline Engine)

| Column Name | SQL Data Type | Prisma Attribute | Description / Constraints |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `@id @default(uuid()) @db.Uuid` | Primary Key UUID |
| `workflow_id` | `UUID` | `@map("workflow_id") @db.Uuid` | Foreign key reference to workflow instance (Indexed) |
| `lead_id` | `UUID` | `@map("lead_id") @db.Uuid` | Foreign key reference to lead (Indexed) |
| `event_type` | `VARCHAR(100)` | `@map("event_type") @db.VarChar(100)` | Taxonomy event type (Indexed) |
| `source_engine` | `VARCHAR(100)` | `@map("source_engine") @db.VarChar(100)` | Producer engine identifier (Indexed) |
| `actor_type` | `VARCHAR(50)` | `@map("actor_type") @db.VarChar(50)` | Actor role: `System`, `Admin`, `User`, `Bot` |
| `actor_id` | `UUID` | `@map("actor_id") @db.Uuid` | Nullable UUID of human user/admin |
| `title` | `TEXT` | `@db.Text` | Standardized readable title |
| `description` | `TEXT` | `@db.Text` | Detailed summary description |
| `metadata` | `JSONB` | `@default("{}") @db.JsonB` | Flexible JSONB store for engine-specific payload |
| `deduplication_key` | `VARCHAR(255)` | `@unique @map("deduplication_key")` | Unique key enforcing event write idempotency |
| `occurred_at` | `TIMESTAMPTZ` | `@default(now()) @map("occurred_at")` | Event occurrence timestamp (Indexed) |
| `created_at` | `TIMESTAMPTZ` | `@default(now()) @map("created_at")` | Event ingestion timestamp |

### Composite Database Indexes
- `@@index([workflowId, occurredAt])`
- `@@index([leadId, occurredAt])`
- `@@index([eventType])`
- `@@index([sourceEngine])`

---

## 3. Core Monorepo Entities Overview

- **Leads Table (`leads`)**: Master record storing lead profile (`id`, `name`, `phone_number`, `email`, `source`, `status`, `categories`).
- **Workflows Table (`workflow_instances`, `workflow_history`)**: Tracks state machine instances and transitions.
- **Messages Table (`messages`)**: Stores inbound and outbound multi-channel messages.
- **Promises Table (`promises`)**: Background scheduled follow-ups, reminders, and escalations.
- **Channels Table (`channels`)**: Integration provider configurations.
