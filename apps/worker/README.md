# @life-os/worker

The background job worker for Life OS. It handles asynchronous tasks such as notification dispatch, database maintenance, and third-party integrations.

## 🚀 Features (Planned)

- **Job Processing**: Reliable background task execution using **pg-boss**.
- **Notifications**: Automated dispatch of push, email, and system notifications.
- **Sync Jobs**: Periodic synchronization tasks for calendar and external services.
- **Data Maintenance**: Transactional cleanups and aggregation tasks.

## 🛠️ Technology Stack

- **Queue Engine**: [pg-boss](https://github.com/timgit/pg-boss)
- **Database**: PostgreSQL with Drizzle ORM
- **Runtime**: Node.js 24 (LTS)

## 🏁 Getting Started

### Prerequisites

- Node.js 24+
- pnpm 11+
- PostgreSQL database

### Development

```bash
pnpm dev
```

## 🧪 Testing

```bash
pnpm test
```
