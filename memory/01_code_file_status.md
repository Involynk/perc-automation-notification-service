# Code File Status Registry

This document lists every code file in the repository, its role, exports, dependencies, and current status.

---

## Root Configurations & Scripts

| File Path            | Status | Purpose / Description                                      | Key Dependencies / Exports                                 |
| -------------------- | ------ | ---------------------------------------------------------- | ---------------------------------------------------------- |
| `package.json`       | Active | Workspace definition (`packages/*`), build & start scripts | NestJS 11, Supabase (`@supabase/supabase-js`), RxJS, axios    |
| `.env`               | Active | Supabase credentials (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`) | Live project credentials |
| `nest-cli.json`      | Active | NestJS CLI monorepo setup mapping projects                 | `api-gateway`, `communication-service`, `workflow-service`, `timeline-service` |
| `tsconfig.base.json` | Active | Base TypeScript compiler options                           | ES2022, target ES2021, decorator flags                     |
| `tsconfig.json`      | Active | Root TypeScript entry referencing base config              | Extends `tsconfig.base.json`                               |
| `docker-compose.yml` | Active | Container orchestrator mapping ports 3000, 3001, 3002, 3003 | `api-gateway`, `communication-service`, `workflow-service`, `timeline-service` |

---

## 1. `packages/shared` (Shared Library)

| File Path              | Status | Purpose / Description                                               | Key Exports                                                                                      |
| ---------------------- | ------ | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `src/index.ts`         | Active | Main barrel export file for shared package                          | Export all from entities, enums, interfaces, constants, supabase client, database-seed           |
| `src/enums.ts`         | Active | Master enumerations for channel, lead state, workflow, timeline     | `ChannelType`, `LeadStatus`, `WorkflowState`, `PromiseType`, `SourceEngine`, `ActorType`, `KnownEventType` |
| `src/interfaces.ts`    | Active | TypeScript interfaces for lead capture payload & category maps      | `LeadCapturePayload`, `CategoryResult`, `SendMessagePayload`                                     |
| `src/constants.ts`     | Active | Constants for system messages, category keywords, defaults          | `CATEGORY_KEYWORDS`, `CATEGORY_MESSAGES`, `DEFAULT_SYSTEM_SETTINGS`                              |
| `src/supabase.ts`      | Active | Supabase client singleton (`@supabase/supabase-js`) using service-role key | `getSupabaseClient()`                                                                      |
| `src/database-seed.ts` | Active | Database seeder populating channels, event types, settings via Supabase | `seedDatabase(supabase: SupabaseClient)`                                                     |

### Shared Entities (`packages/shared/src/entities/`)

| File Path                | Status | Interface(s)                        | Table Name                               | Purpose                                                             |
| ------------------------ | ------ | ----------------------------------- | ---------------------------------------- | ------------------------------------------------------------------- |
| `lead.entity.ts`         | Active | `Lead`                              | `leads`                                  | Lead master record (name, phone, email, source, status, categories) |
| `workflow.entity.ts`     | Active | `WorkflowInstance`, `WorkflowHistory` | `workflow_instances`, `workflow_history` | State machine tracking state, variables, state change history       |
| `promise.entity.ts`      | Active | `PromiseEntity`                     | `promises`                               | Scheduled background promises (followup, reminder, escalation)      |
| `message.entity.ts`      | Active | `Message`                           | `messages`                               | Inbound & outbound messages across all channels                     |
| `conversation.entity.ts` | Active | `Conversation`                      | `conversations`                          | Conversation thread per channel per lead                            |
| `timeline.entity.ts`     | Active | `TimelineEvent`                     | `timeline_events`                        | Immutable audit log of all system & lead actions                    |
| `notification.entity.ts` | Active | `Notification`                      | `notifications`                          | Admin notification inbox entries                                    |
| `channel.entity.ts`      | Active | `Channel`                           | `channels`                               | Registered integration channels & configuration                     |
| `event-type.entity.ts`   | Active | `EventType`                         | `event_types`                            | Master taxonomy of timeline event types                             |

---

## 2. `packages/api-gateway` (Port 3000)

| File Path                              | Status | Purpose / Description                                                          | Key Components / Services                 |
| -------------------------------------- | ------ | ------------------------------------------------------------------------------ | ----------------------------------------- |
| `src/main.ts`                          | Active | API Gateway entrypoint starting NestJS on port 3000                            | `bootstrap()`                             |
| `src/api-gateway.module.ts`            | Active | Gateway root module initializing Supabase & importing engine                   | `ApiGatewayModule`                        |
| `src/webhooks/lead.service.ts`         | Active | Core service for lead capture, phone extraction, status management             | `LeadService`                             |
| `src/webhooks/routing.service.ts`      | Active | Lead routing, category matching, composes+stores outbound replies              | `RoutingService`                          |

---

## 3. `packages/communication-service` (Port 3001)

| File Path                           | Status | Purpose / Description                                          | Key Components / Services                                  |
| ----------------------------------- | ------ | -------------------------------------------------------------- | ---------------------------------------------------------- |
| `src/main.ts`                       | Active | Communication service entrypoint running on port 3001          | `bootstrap()`                                              |
| `src/handlers/whatsapp.service.ts`  | Active | Outbound WhatsApp message dispatcher using WhatsApp Cloud API  | `WhatsAppService`                                          |

---

## 4. `packages/workflow-service` (Port 3002)

| File Path                      | Status | Purpose / Description                                           | Key Components / Services                   |
| ------------------------------ | ------ | --------------------------------------------------------------- | ------------------------------------------- |
| `src/main.ts`                  | Active | Workflow service entrypoint running on port 3002                | `bootstrap()`                               |
| `src/engine/routing.engine.ts` | Active | Workflow state machine engine (handles transitions & history)   | `RoutingEngine`                             |
| `src/engine/promise.engine.ts` | Active | Cron-driven scheduler running every 30s to process due promises | `PromiseEngine`                             |

---

## 5. `packages/timeline-service` (Port 3003) — Engine 5: Conversation Timeline Engine

| File Path                                        | Status | Purpose / Description                                                                          | Key Components / Exports |
| ------------------------------------------------ | ------ | ---------------------------------------------------------------------------------------------- | ------------------------ |
| `src/main.ts`                                    | Active | Timeline Engine service entrypoint running on port 3003 with Swagger & static UI dashboard     | `bootstrap()` |
| `src/app.module.ts`                              | Active | App root module configuring ConfigModule, EventEmitterModule, PrismaModule, TimelineModule     | `AppModule` |
| `src/prisma/prisma.service.ts`                   | Active | Prisma Client database wrapper targeting Supabase PostgreSQL with in-memory fallback          | `PrismaService` |
| `src/timeline/consumer/event-consumer.service.ts` | Active | Ingests events from Orchestrator/API and triggers validation, transformation, and storage      | `EventConsumerService` |
| `src/timeline/validator/event-validator.service.ts` | Active | Validates UUIDs, required fields, ISO timestamps, and enforces idempotency deduplication keys   | `EventValidatorService` |
| `src/timeline/transformer/event-transformer.service.ts` | Active | Standardizes events from all 7 producer engines into uniform TimelineEvent format              | `EventTransformerService` |
| `src/timeline/service/timeline.service.ts`      | Active | Core domain service for timeline creation, workflow/lead queries, search, pagination, stats | `TimelineService` |
| `src/timeline/repository/timeline.repository.ts` | Active | Encapsulates Prisma database queries for `timeline_events` table with memory store fallback     | `TimelineRepository` |
| `src/timeline/controller/timeline.controller.ts` | Active | REST endpoints (`/api/v1/events/publish`, `/api/v1/workflows/:id/timeline`, `/api/v1/notes`)  | `TimelineController` |
| `src/timeline/timeline.module.ts`               | Active | NestJS module assembling controllers, consumers, validators, transformers, and repository     | `TimelineModule` |
| `prisma/schema.prisma`                           | Active | Prisma ORM schema definition for Supabase PostgreSQL `timeline_events` table                   | `TimelineEvent` model |
| `public/index.html`, `styles.css`, `app.js`       | Active | Light-theme interactive web dashboard & event simulator UI served on `http://localhost:3003`   | Visual Dashboard UI |
