# PERC NOTIFICATION ENGINE – ARCHITECTURE & CONTRACTS

> **Domain-agnostic operational notification and alert engine that ingests system, workflow, and scheduler events, evaluates priority and preferences, stores notifications reliably, and broadcasts delivered alerts to counselor inbox feeds and channels. No business logic.**

---

## High-Level Architecture & Contracts Map

```
┌────────────────────────────────────────────────────────┐                     ┌────────────────────────────────────────────────────────┐
│  1. INPUTS TO NOTIFICATION (From Domain Services/Kafka)│                     │   2. OUTPUT FROM NOTIFICATION (To Domain Services/Kafka│
├────────────────────────────────────────────────────────┤                     ├────────────────────────────────────────────────────────┤
│                                                        │                     │                                                        │
│  ┌──────────────┐                                      │                     │  Topic: perc.notification.notification-delivered       │
│  │ 🔔 SEND      │  Topic:                              │                     │  Event: NOTIFICATION_DELIVERED                         │
│  │   COMMAND    │  perc.notification.send-requested    │                     │                                                        │
│  └──────────────┘                                      │                     │  {                                                     │
│      {                                                 │                     │    "eventId": "evt-notif-7a91b2c3-...",                │
│        "eventId": "evt-notif-7a91b2c3-...",            │                     │    "eventType": "NOTIFICATION_DELIVERED",              │
│        "userId": "usr-counselor-priya",                │                     │    "notificationId": "notif-9c8b7a6f-...",             │
│        "leadId": "1b9d6bcd-bbfd-...",                  │                     │    "userId": "usr-counselor-priya",                    │
│        "notificationType": "ESCALATION_TRIGGERED",     │                     │    "leadId": "1b9d6bcd-bbfd-...",                      │
│        "priority": "CRITICAL",                         │                     │    "notificationType": "ESCALATION_TRIGGERED",         │
│        "title": "Lead SLA Breached - Escalation",      │                     │    "priority": "critical",                             │
│        "message": "Rahul Kumar waiting > 2 hours",     │                     │    "title": "Lead SLA Breached - Escalation",          │
│        "actionUrl": "/leads/1b9d6bcd-bbfd-...",        │                     │    "message": "Rahul Kumar waiting > 2 hours",         │
│        "metadata": { "slaMinutes": 120 },              │                     │    "isRead": false,                                    │
│        "deduplicationKey": "dedup_esc_lead_101",       │                     │    "deliveredAt": "2026-08-14T15:45:00.035Z",          │
│        "occurredAt": "2026-08-14T15:45:00.000Z"        │                     │    "occurredAt": "2026-08-14T15:45:00.000Z"            │
│      }                                                 │                     │  }                                                     │
│                                                        │                     │                                                        │
│  ┌──────────────┐                                      │                     │                 ┌─────────────────────────┐            │
│  │ 📢 BROADCAST │  Topic:                              │                     │                 │ perc.notification.      │            │
│  │   COMMAND    │  perc.notification.broadcast-        │                     │                 │ notification-delivered  │            │
│  │              │  requested                           │                     │                 └───────────┬─────────────┘            │
│  └──────────────┘                                      │                     │                             │                          │
│      {                                                 │                     │         ┌───────────────────┼─────────────────┐        │
│        "eventId": "evt-broad-101",                     │                     │         ▼                   ▼                 ▼        │
│        "targetRole": "counselor",                      │                     │  ┌───────────────┐  ┌──────────────┐  ┌─────────────┐  │
│        "title": "Admissions Webinar Starting",         │                     │  │ Timeline      │  │ Analytics    │  │ Counselor   │  │
│        "message": "Batch orientation begins in 15 mins"│                     │  │ Engine (Eng 5)│  │ Engine (Eng 9)│  │ Inbox Feed  │  │
│      }                                                 │                     │  │ (Logs alert   │  │ (Calculates  │  │ (Real-time  │  │
│                                                        │                     │  │ in timeline)  │  │ alert SLA)   │  │ toast / SSE) │  │
│  ┌──────────────┐                                      │                     │  └───────────────┘  └──────────────┘  └─────────────┘  │
│  │ ⚠️ DEAD      │  Topic:                              │                     │                                                        │
│  │   LETTER     │  perc.notification.commands.dlq      │                     │  Notification engine delivers alerts reliably. Each    │
│  │   QUEUE      │                                      │                     │  domain service decides how to react.                  │
│  └──────────────┘                                      │                     │                                                        │
└──────────────────────────┬─────────────────────────────┘                     └────────────────────────────────────────────────────────┘
                           │
                           ▼
┌───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                NOTIFICATION ENGINE (INTERNAL PIPELINE)                                                │
├───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                                                       │
│  1. 📥 Kafka Consumer          ──► Consumes from `perc.notification.send-requested` & `broadcast-requested`                           │
│  2. 🔍 Check eventId           ──► Checks idempotency & deduplication (`deduplicationKey` in PostgreSQL)                             │
│  3. 🛡️ Validate Schema / UUID   ──► Validates `userId`, `leadId`, required title/message. Bad payloads ──► Route to DLQ                │
│  4. ⚙️ Preference Evaluator    ──► Normalizes priority (`low`, `normal`, `high`, `critical`) and auto-escalates critical alerts        │
│  5. 💾 Persist in PostgreSQL   ──► Inserts record into `notifications` table (Status = `DELIVERED`, `is_read = false`)                │
│  6. 📬 Counselor Inbox Cache   ──► Updates counselor unread counts and SSE / WebSocket push feed                                      │
│  7. 🔒 PostgreSQL Transaction  ──► Notification = `CREATED`, Outbox = `PENDING`                                                       │
│  8. 🚀 Outbox Publisher        ──► Reliably publishes `NOTIFICATION_DELIVERED` to topic `perc.notification.notification-delivered`    │
│                                                                                                                                       │
└───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Who Communicates with Notification Engine?

| Service | Sends to Notification Engine | Receives from Notification Engine |
|---|---|---|
| **Workflow Engine (Engine 3)** | `LEAD_ASSIGNED`, `ESCALATION_TRIGGERED` | — |
| **Scheduler Engine (Engine 4)** | `REMINDER_DUE`, `FOLLOWUP_OVERDUE` | — |
| **Follow-up Engine (Engine 6)** | `NO_REPLY_24H`, `RECOVERY_CAMPAIGN_READY` | — |
| **Call & Meeting Engine (Engine 7)**| `MEETING_SCHEDULED`, `MEETING_MISSED` | — |
| **Timeline Engine (Engine 5)** | — | `NOTIFICATION_DELIVERED` (Logs in timeline audit trail) |
| **Analytics Engine (Engine 9)** | — | `NOTIFICATION_DELIVERED` (Calculates notification response SLAs) |
| **Communication Service (Engine 2)**| — | `NOTIFICATION_DELIVERED` (For optional SMS/Email channel relay) |
| **Admin / Counselor Dashboard** | `PATCH /read`, `PATCH /read-all` | Real-time Inbox Feed & Alerts |

---

## 4. Key Guarantees

- **Idempotency**: Checked via `eventId` and `deduplicationKey`. Duplicate alerts from network retries are acknowledged without re-inserting.
- **At-Least-Once Delivery**: Guaranteed via Outbox pattern to topic `perc.notification.notification-delivered`.
- **Auto-Escalation Engine**: Automatically escalates high-urgency operational events (`CALL_MISSED`, `ESCALATION_TRIGGERED`, `SLA_BREACHED`) to **`CRITICAL`** priority.
- **Non-Blocking DLQ**: Bad payloads route to `perc.notification.commands.dlq` without stalling the stream.
- **REST & Kafka Dual Access**: Supports both Kafka streaming and Swagger REST APIs on Port `3004`.

---

## 5. Kafka Topics Reference

### Input Topics (Domain Services ➔ Notification Engine)
* **`perc.notification.send-requested`** *(Targeted Alert Command)*
* **`perc.notification.broadcast-requested`** *(Role-based Broadcast Command)*
* **`perc.notification.commands.dlq`** *(Dead Letter Queue)*

### Output Topic (Notification Engine ➔ Domain Services)
* **`perc.notification.notification-delivered`** *(Notification Delivered Broadcast)*

---

## 6. One Line Summary

> **"Notification engine evaluates preferences and priorities reliably, delivers operational alerts across counselor channels, and tells the world 'notification delivered' – domain services decide what to do."**
