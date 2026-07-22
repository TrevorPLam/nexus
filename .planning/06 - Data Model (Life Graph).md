# 6. Data Model (Life Graph)

## The Core Idea: A Unified Graph, Not Isolated Tables

Life OS does not store data in separate, feature‑specific databases. There is no “tasks table” that belongs to a tasks module and a “contacts table” that belongs to a CRM module, connected only by foreign keys that developers remember but users never see. Instead, every piece of information—every task, event, note, contact, financial transaction, health metric, goal, and project—is a **node** in a single, interconnected **Life Graph**.

This graph is the foundation that makes the “super app that doesn’t feel like one” possible. When a user looks at a task, they can see its linked project, the contact it involves, the note attached to it, the goal it serves, and (eventually) the budget category it affects—all without the data being duplicated or the user switching modules. The graph **dissolves module boundaries** at the data layer, so the UI never has to impose them.

---

## Core Design Principles

1. **Every entity is linkable.** Any node can be connected to any other node through a generic, typed linking table. This avoids creating a combinatorial explosion of bespoke foreign keys.

2. **No data duplication.** A task that is also relevant to a financial goal is *linked* to that goal, not copied. A contact associated with a calendar event is referenced, not embedded. The source of truth for each piece of information remains singular.

3. **The graph belongs to a workspace.** All entities are scoped to a workspace (a personal or, in the future, shared organizational container). Authorization flows from workspace membership.

4. **Privacy is modeled at the storage level.** The graph is split into two zones—Open and Vault—with different encryption, sync, and access patterns. This is not a UI distinction; it is a fundamental property of where and how data is stored.

5. **The graph is queryable for planning.** A dedicated set of pre‑computed projections (materialized by the transactional outbox) ensures that the daily planning engine can aggregate across the entire graph without complex, slow joins.

---

## Core Entities (Open Zone)

The following entities form the initial, server‑processable portion of the Life Graph. They power the MVP daily‑planning loop and will be extended as new domains are added.

### Users & Workspaces
- **`users`** – The fundamental identity record, linked to the authentication provider (Clerk or Supabase Auth). Contains only the minimum necessary profile information.
- **`workspaces`** – A top‑level organizational container. In V1, every user has one personal workspace. The schema supports multiple workspaces per user for future use (personal, family, business). All other entities are scoped to a workspace. Row Level Security policies enforce this scoping by deriving the workspace context from the authenticated session.

### Strategic Context
- **`areas`** – High‑level life domains (e.g., Health, Career, Finances, Relationships). Areas provide a loose categorization layer for projects and goals and help the planning engine understand the user’s declared life balance.
- **`goals`** – Long‑term aspirations or measurable objectives. A goal can be linked to multiple projects and tasks, and can track progress through associated key results (future entity). Goals give the capacity engine a signal for prioritization: tasks that advance an active goal may be ranked higher.

### Work Management
- **`projects`** – A named, outcome‑oriented container for tasks and notes. Projects can nest (via entity links) and are associated with areas or goals. A project has a status (active, archived, completed) and can hold metadata such as desired weekly effort.
- **`tasks`** – The atomic unit of action. A task carries:
  - Priority level
  - Estimated duration (in minutes, or a bucket identifier)
  - Due date and/or deadline
  - Recurrence rule (RRULE or similar)
  - Status (active, completed, deferred, dropped)
  - Commitment level (`must‑do`, `should‑do`, `nice‑to‑do`) for the planning engine
  - Splittable flag (boolean) indicating whether it can be broken into chunks
  - Energy/context tags (optional, to support future scheduling intelligence)
- **`task_occurrences`** – For recurring tasks, the concrete instances generated for a specific date. This separates the template from the daily reality, allowing individual occurrences to be rescheduled, completed, or annotated without affecting the recurrence pattern.

### Time & Scheduling
- **`calendar_connections`** – Represents a user’s OAuth connection to an external calendar provider (Google Calendar in V1). Stores encrypted refresh tokens and sync metadata (last sync token, last successful sync timestamp).
- **`calendar_sources`** – Individual calendars (primary, shared, secondary) within a connection that the user has chosen to sync.
- **`calendar_events`** – Read‑only copies of external calendar events, synced incrementally. Includes a unique constraint on the provider‑assigned `eventId` to prevent duplication during sync races.
- **`native_time_blocks`** – Internal, Life OS‑owned blocks of time that the user creates for focus work, deep work, or other non‑event commitments. These are not written back to external calendars in V1. They participate in the capacity calculation alongside external events.

### Knowledge
- **`notes`** – Lightweight rich‑text documents that can be linked to any other entity (tasks, projects, contacts, events). Notes support markdown or rich text and are searchable through the universal search layer. In V1, notes are simple; in the future, they may gain backlinks, transclusion, and more advanced knowledge‑management features.

### Relationships
- **`contacts`** – A unified address book entry. A contact can store names, email addresses, phone numbers, relationship tags, and interaction history. It can be linked to tasks, events, notes, and projects, making it the hub for personal CRM functionality.

### System & Infrastructure
- **`entity_links`** – A polymorphic junction table that enables the graph. Each row records a `source_type`, `source_id`, `target_type`, `target_id`, and a link type (e.g., “related”, “blocks”, “supports”). This table is the connective tissue of the Life Graph; queries traverse it to discover the full context of any entity.
- **`reminders`** – User‑configured or system‑generated prompts tied to specific entities (tasks, events, bill due dates). Contains delivery preferences (push, email) and timing.
- **`notifications`** – A log of notifications generated, delivered, and acknowledged, supporting a unified notification center.
- **`attachments`** – References to files stored in object storage (Supabase Storage or Cloudflare R2), linked to any entity.
- **`integration_accounts`** – Metadata about connected third‑party services beyond calendar (future: Plaid for banking, HealthKit bridge, etc.), including connection status and scopes.
- **`audit_logs`** – An append‑only record of sensitive operations (data access, deletions, permission changes, export requests). Immutable and used for security monitoring and user transparency.
- **`outbox_events`** – The foundation of the transactional outbox pattern. Every significant state change writes an event into this table within the same database transaction. A separate process (or Inngest) reads from it and reliably dispatches side effects: search index updates, plan recalculations, notification delivery, and webhook calls.
- **`idempotency_keys`** – Used to guarantee exactly‑once processing for critical operations (e.g., payment processing, calendar sync writes) by storing a unique key per operation and checking for duplicates.

---

## Entity Linking: The Graph in Practice

The `entity_links` table is the mechanism that makes the Life Graph navigable. It replaces dozens of purpose‑built foreign keys with a single, extensible pattern.

**Example links:**
- A task “Call accountant” is linked to a contact (the accountant), a project (“Tax Preparation”), and a goal (“Financial Clarity”).
- A calendar event “Doctor’s appointment” is linked to a contact (the doctor) and a note (“Questions to ask”).
- A project “Kitchen Renovation” is linked to an area (“Home”), a budget category (future), and several contacts (contractor, designer).

When the user views any of these entities, the system can traverse `entity_links` to display all related context. The planning engine can use these links to surface relevant tasks when a contact is viewed, or to prioritize tasks that advance a goal with an approaching deadline.

---

## The Dual-Zone Privacy Architecture

The Life Graph is physically and logically split into two zones to protect the most sensitive data without sacrificing the unified experience.

### Open Zone
- Contains all entities listed above (tasks, events, projects, notes, contacts, etc.).
- Stored in standard PostgreSQL tables, encrypted at rest.
- Fully server‑processable: the planning engine, search indexer, and sync layer can read and operate on this data.
- Synced to mobile devices via PowerSync in full.

### Vault Zone (Future)
- Contains highly sensitive domains: health metrics, lab results, financial transactions, private journal entries, password hints.
- Stored in separate database tables or even a separate schema.
- **Client‑side encrypted**: data is encrypted on the device before it ever reaches the server. The server stores ciphertext and cannot decrypt it. The encryption key is derived from a user‑held secret (password or biometric‑protected key) and stored in the device’s secure enclave (Expo SecureStore on mobile).
- Not synced in plaintext by PowerSync. Instead, a **dual‑table pattern** is used:
  - A `localOnly` table (PowerSync flag) stores plaintext values and never leaves the device.
  - A corresponding sync table stores the same records with sensitive fields already encrypted. PowerSync moves this ciphertext between the device and server as opaque rows; the server never possesses the key.
- The Vault Zone can still participate in the daily plan through **anonymized metadata**: e.g., a financial obligation of a certain priority is present, without revealing the amount. This metadata is generated client‑side and placed in the Open Zone as a non‑sensitive hint for the planning engine.

### Separation Enforcement
- The Open Zone and Vault Zone tables reside in separate database schemas or naming conventions.
- API routes for Vault data are prefixed with `/vault/` and require additional key verification.
- `entity_links` can cross zones only through explicit, user‑confirmed references, and Vault‑to‑Open links carry a `data_zone` marker to ensure they are handled with appropriate caution in queries and exports.

This architecture is production‑validated by real‑world implementations (e.g., Finsight) and allows Life OS to eventually hold a user’s entire life—including its most intimate details—without the server ever having the ability to read the most sensitive information.

---

## Planning Projections: Materialized Daily Plan

The Life Graph, when queried naively, is too complex for the sub‑second responsiveness required by the Today screen. A query like “find all tasks due today, their linked projects, their linked contacts, and any calendar events that conflict” involves multiple joins across large tables. This problem grows as more domains are added.

The solution is a set of **pre‑computed planning projections** that are maintained by the transactional outbox.

- **`daily_plan_events`** (or similar projection tables) – A flattened, optimized representation of everything relevant to a user’s plan for a given day. This table is refreshed whenever any linked entity changes: a task is added or modified, a calendar event is synced, a project’s priority shifts, a financial deadline approaches.
- The outbox emits an event for each relevant change. A background job (via Inngest) picks up the event and recalculates the affected user’s daily plan projection, writing the result to the projection table. The mobile and web clients read from this flat, fast table rather than performing live graph traversals.
- This introduces **eventual consistency**—a plan may lag a few seconds behind the latest change—but this is an acceptable tradeoff for the instant responsiveness that a calm, dependable planning surface requires.

The planning engine (`packages/calendar-engine`) operates as a pure function, consuming a set of tasks and events and returning a plan. The projection layer is how the backend feeds that engine efficiently.

---

## Task Flexibility Metadata

To avoid the rigidity that can make a capacity‑aware planner feel oppressive, every task carries two additional fields that govern how the engine treats it:

| Field | Values | Meaning |
|-------|--------|---------|
| `commitment_level` | `must-do`, `should-do`, `nice-to-do` | How essential the task is today. The engine uses this to generate different plan profiles (Focused, Balanced, Stretch) and to decide what to defer when the day derails. |
| `splittable` | `boolean` | Whether the task can be broken into chunks. If `true`, a `minimum_chunk_minutes` can be specified. The engine may split a large task across multiple sessions if it improves the plan. |

These fields are user‑settable but can also be influenced by the system: a task linked to a goal with an approaching deadline may automatically escalate to `must-do` unless the user overrides it.

---

## Offline Sync and Command-Based Operations

The mobile client, powered by PowerSync, holds a local copy of the Open Zone data in a SQLite database. To maintain the integrity of the Life Graph during offline writes, all mutations from the mobile app are modeled as **commands** rather than direct database writes.

- A command is an intent‑preserving operation: `CompleteTaskCommand`, `RescheduleTaskCommand`, `LinkEntityCommand`, `CreateNoteCommand`, etc.
- Commands are stored in a local command log table (SQLite) and executed optimistically against the local database.
- When the device comes online, PowerSync uploads the command log to the server.
- The server processes each command within a database transaction, applying the cascading updates that maintain the graph (e.g., completing a task updates the parent project’s progress, triggers an outbox event, and writes an audit log entry). It returns a result set with any conflicts.
- If a conflict is detected (e.g., the task was already completed on another device), the server resolves it using a last‑write‑wins strategy with server‑side validation, and the mobile client receives the authoritative state.

This pattern ensures that even when a user makes changes offline, the Life Graph remains consistent and the daily plan projection stays accurate across all devices.

---

## Extensibility for Future Modules

The Life Graph is designed to absorb every module in the long‑term vision without structural change. When Finance is added:

- New tables (e.g., `financial_accounts`, `transactions`, `budget_categories`) are created in the Vault Zone.
- `entity_links` rows connect transactions to contacts, projects, and tasks.
- Anonymized financial metadata flows into the Open Zone to participate in the daily plan.
- The planning projection tables gain columns to include financial deadlines.
- The command bar understands financial entities, and the timeline displays them alongside tasks and events.

No existing table is modified in a breaking way. The same applies to Health, Home, Learning, and every other Space. The graph absorbs them, and the daily plan grows richer without the interface becoming more complex.