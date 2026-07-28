# PERC Admission Operations Engine — System Memory & Context

Welcome to the AI Context & Memory Knowledge Base for **PERC Admission Operations Engine**. This directory serves as a persistent context store for AI agents and human developers working on, maintaining, or expanding this codebase.

---

## 1. System Overview

**PERC Admission Operations Engine** is a NestJS-based microservices monorepo for multi-channel lead capture, intelligent category classification, automated WhatsApp routing, promise-based follow-up scheduling, lead state machine management, and centralized conversation history auditing.

### Key Capabilities

- **Multi-Channel Inbound Webhooks**: Receives leads and messages via WhatsApp Cloud API, Instagram Messaging, Facebook Messenger, Email polling, and custom web capture forms.
- **Categorization Engine**: Classifies incoming messages into key domain categories (`fee_enquiry`, `course_enquiry`, `admission_enquiry`, `branch_enquiry`, `faculty_enquiry`, `hostel_enquiry`).
- **Automated Routing & Phone Extraction**: Automatically detects whether a lead has a valid phone number. Requests WhatsApp number across supported two-way channels.
- **Promise & Follow-up Scheduler**: Background promise engine that schedules, executes, and retries follow-ups, reminders, and escalations.
- **Conversation Timeline Engine (Engine 5)**: Central history & event auditing microservice (`packages/timeline-service`). Ingests, validates, transforms, and stores timeline events from all producer engines (Lead Capture, Response, Workflow, Scheduler, Follow-up, Meeting, Admin) into a Supabase PostgreSQL database with `JSONB` metadata support and idempotency key checks.

---

## 2. Directory & Workspace Structure

```
PERC-Automation/
├── .env                       # Environment configuration (API keys, ports, secrets)
├── .gitignore                 # Monorepo gitignore rules
├── README.md                  # Quickstart & architectural summary
├── docker-compose.yml         # Container orchestrator for microservices
├── nest-cli.json              # NestJS CLI configuration mapping projects
├── package.json               # Root monorepo dependencies & scripts
├── tsconfig.json / tsconfig.base.json # TypeScript configuration
├── memory/                    # Persistent Context Memory for AI Agents & Developers
│   ├── 00_overview.md         # System summary and index
│   ├── 01_code_file_status.md # Complete code file status registry
│   ├── 02_architecture_and_dataflow.md # Lead routing, state machine & timeline flow
│   ├── 03_database_and_entities.md     # TypeORM / Prisma entities & database details
│   ├── 04_api_endpoints_and_webhooks.md # API endpoints & webhook specifications
│   └── 05_developer_and_agent_guidelines.md # Guardrails & execution guidelines
├── docs/                      # Technical specifications & architecture diagrams
├── packages/
│   ├── api-gateway/           # Webhooks, lead management, REST API (Port 3000)
│   ├── communication-service/ # Outbound messaging providers (Port 3001)
│   ├── workflow-service/      # State machine & Promise scheduler (Port 3002)
│   ├── timeline-service/      # Engine 5 - Central Timeline Engine (Port 3003)
│   └── shared/                # Shared Types, Entities, Enums, Constants & Seeds
└── web/                       # Web integration & widget scripts
```

---

## 3. Microservice Ports & Roles

| Package / Service                | Port   | Primary Responsibility                                                                            |
| -------------------------------- | ------ | ------------------------------------------------------------------------------------------------- |
| `packages/api-gateway`           | `3000` | Inbound webhooks, REST controllers for leads/messages/promises, routing service, lead management  |
| `packages/communication-service` | `3001` | Channel provider abstraction (WhatsApp API, Email Nodemailer, Instagram, Facebook)                |
| `packages/workflow-service`      | `3002` | State machine engine, background promise runner & cron scheduler                                  |
| `packages/timeline-service`      | `3003` | **Engine 5**: Central Conversation Timeline Engine (Ingestion, validation, transformation, Prisma Supabase repository, timeline APIs, visual dashboard) |
| `packages/shared`                | N/A    | Shared library compiled to `dist/`, shared TypeORM/Prisma entities, DTOs, constants, and database seeder |

---

## 4. Quick Context Index for AI Agents

When invoked for tasks in this repository, reference the memory files as follows:

- To check file responsibilities & status: read `memory/01_code_file_status.md`
- To understand data flow, lead routing, or state transitions: read `memory/02_architecture_and_dataflow.md`
- To review database schema or entity relationships: read `memory/03_database_and_entities.md`
- To inspect API contracts or Webhook payloads: read `memory/04_api_endpoints_and_webhooks.md`
- To review agent guardrails: read `memory/05_developer_and_agent_guidelines.md`
