# API Endpoints & Webhook Specification

This document details all REST controllers, endpoints, query filters, and webhook contracts across the monorepo microservices.

---

## 1. Timeline Engine Service (`packages/timeline-service` — Port 3003)

Interactive Swagger API documentation available at `http://localhost:3003/api/docs`.

### REST Endpoints Summary

| Method | Endpoint Path | Summary | Query / Body Parameters |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/events/publish` | Publish an event from any producer engine | `PublishEventDto` (workflowId, leadId, eventType, sourceEngine, actorType, title, description, metadata, deduplicationKey) |
| `GET` | `/api/v1/workflows/:workflowId/timeline` | Get full chronological timeline for a workflow | `TimelineQueryDto` (`type`, `sourceEngine`, `search`, `page`, `limit`, `sort`) |
| `GET` | `/api/v1/leads/:leadId/timeline` | Get timeline for a lead across workflows | `TimelineQueryDto` (`type`, `sourceEngine`, `search`, `page`, `limit`, `sort`) |
| `GET` | `/api/v1/timeline/search` | Platform-wide timeline search and filter | `TimelineQueryDto` (`type`, `sourceEngine`, `search`, `page`, `limit`, `sort`) |
| `GET` | `/api/v1/timeline/:eventId` | Get event details & JSONB metadata | `eventId` (UUID) |
| `POST` | `/api/v1/workflows/:workflowId/notes` | Add an internal note to workflow timeline | `CreateNoteDto` (leadId, title, description, actorId) |
| `GET` | `/api/v1/engines/stats` | Get engine analytics & event counters | N/A |

### Sample Payload: Publishing an Event
`POST /api/v1/events/publish`
```json
{
  "workflowId": "11111111-2222-3333-4444-555555555555",
  "leadId": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  "eventType": "MEETING_COMPLETED",
  "sourceEngine": "MEETING",
  "actorType": "Admin",
  "title": "Meeting Completed",
  "description": "Counseling session completed with positive outcome",
  "metadata": {
    "durationMinutes": 30,
    "counselor": "Sarah Jenkins",
    "recordingUrl": "https://storage.supabase.co/recordings/meeting_998.mp4"
  },
  "deduplicationKey": "evt_meeting_comp_998"
}
```

---

## 2. API Gateway (`packages/api-gateway` — Port 3000)

- `GET /health`: Gateway status check
- `POST /webhooks/whatsapp`: WhatsApp Cloud API webhook receiver
- `POST /webhooks/instagram`: Instagram messaging webhook receiver
- `POST /webhooks/facebook`: Facebook Messenger webhook receiver
- `GET /api/leads`: Query lead list and state
- `POST /api/leads/capture`: Custom web form lead capture

---

## 3. Communication Service (`packages/communication-service` — Port 3001)

- `POST /api/communication/send`: Send outbound message via specified channel (`whatsapp`, `email`, `instagram`, `facebook`)

---

## 4. Workflow Service (`packages/workflow-service` — Port 3002)

- `GET /health`: Health status
- `POST /api/workflows/trigger`: Trigger state transition
