# @life-os/contracts

The source of truth for the Life OS domain model. This package contains **Zod**
schemas and TypeScript types shared across all applications (API, Web, Mobile,
and Worker).

## 🚀 Purpose

- **Shared Validation**: Use the same validation logic on the client and server.
- **API Contracts**: Define the exact structure of request payloads and response
  bodies.
- **Type Safety**: Provide authoritative TypeScript types derived directly from
  Zod schemas.

## 📂 Project Structure

- `src/common.ts`: Shared base schemas (UUIDs, timestamps, error responses).
- `src/work.ts`: Schemas for projects, tasks, dependencies, time entries, and
  comments.
- `src/calendar.ts`: Schemas for calendars, events, attendees, and scheduling
  links.

## 🛠️ Technology Stack

- **Validation**: [Zod](https://zod.dev/)
- **Recurrence**: [rrule](https://github.com/jakubroztocil/rrule) for recurring
  event/task logic.

## 🏁 Usage

Import schemas or types in any application:

```typescript
import { CreateTaskRequest, type TaskResponse } from '@life-os/contracts';
```

## 🧪 Testing

```bash
pnpm test
```
