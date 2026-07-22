# 11. Operational & Compliance Considerations

## 11.1 Security Architecture

Life OS will store the most intimate details of a person’s daily existence—their schedule, tasks, relationships, health, and finances. Security is therefore not a feature to be bolted on; it is a structural property of the system, built into every layer from the database to the deployment pipeline.

### Encryption
- **In transit:** All communication between clients (web, mobile) and the server, as well as between backend services and external APIs, is encrypted using TLS 1.3.
- **At rest:** The PostgreSQL database and all object storage buckets use AES‑256 encryption. Backup snapshots are encrypted with separate keys and stored in access‑controlled environments.
- **OAuth tokens:** Refresh tokens for third‑party integrations (Google Calendar, future Plaid, etc.) are encrypted with server‑managed keys before being written to the database. They are never exposed to client‑side code, stored in logs, or included in analytics payloads. Encryption keys are managed via Supabase Vault or a dedicated key management service.

### Row Level Security (RLS)
Every database query is filtered by PostgreSQL Row Level Security policies. These policies ensure that a user can only access data within their own workspace, and that even within a workspace, sensitive operations (deletion, export) are gated by the user’s role. RLS policies are defined in SQL migration files and are tested automatically in CI—every policy is verified with both positive (authorized access succeeds) and negative (unauthorized access is denied) assertions.

### Least‑Privilege Integration Scopes
All third‑party integrations request the narrowest possible OAuth scopes. For Google Calendar in V1, the scope is strictly read‑only. When future integrations (e.g., Plaid for banking) are added, they will request only the data permissions necessary, and users will be informed of exactly what data is being accessed and why.

### Soft Delete and Recovery
User content is never hard‑deleted immediately. When a user deletes a task, project, note, or any other entity, it is **soft‑deleted**—marked as deleted in the database and hidden from the UI, but retained for a configurable recovery period (default 30 days). During this window, users can restore accidentally deleted items. After the recovery period, data is permanently removed by a scheduled job, including from database backups. Account deletion follows a similar staged process: deactivation, recovery window, then permanent erasure.

### Audit Logs
The `audit_logs` table records every sensitive operation: data access (for sensitive entities), modifications, deletions, permission changes, integration connections and disconnections, export requests, and account deletion initiations. Each entry includes the user ID, workspace ID, operation type, entity affected, timestamp, and IP address. The audit log is append‑only and immutable by application code. It serves both as a security monitoring tool and as a transparency mechanism—users will eventually be able to view their own audit trail.

---

## 11.2 Privacy as a Product Feature

Privacy is not a compliance checkbox; it is a core differentiator and a promise to users that their data will never be exploited.

### No Personal Content in Telemetry
A strict data‑scrubbing layer sits between the application and all external telemetry systems (Sentry, PostHog, logs). This layer redacts any field tagged as containing personal content—task titles, note bodies, event descriptions, contact names, financial amounts, health metrics—before the data leaves the server. For PostHog, auto‑capture is completely disabled. Only explicitly defined, sanitized events are sent, and each event payload is validated with a Zod schema that forbids free‑text fields. For backend logs, a custom Pino serializer replaces sensitive fields with `[REDACTED]`. Sentry error reports are similarly scrubbed, with stack traces preserved but surrounding context data removed. No session replay is ever recorded.

### Account Export and Deletion
Users own their data and can take it with them at any time. The account export feature generates a complete, machine‑readable archive of all user content (tasks, projects, notes, events, contacts, etc.) in a standard format (JSON and/or CSV). Exports are generated asynchronously, with the user notified when the download is ready. The export includes all Open Zone data; Vault Zone data, being client‑side encrypted, is the user’s responsibility to back up separately. Account deletion is a first‑class in‑app flow, initiated by the user without requiring contact with support. As described above, it follows a soft‑delete and recovery period before permanent erasure.

### No Sale of Personal Data, No Advertising Model
Life OS’s business model is exclusively subscription‑based. The company will never sell, rent, or share personal data with third parties for advertising or any other purpose. Data is not used to train machine learning models unless the user explicitly opts in, and even then, any model training will use privacy‑preserving techniques and be confined to the user’s own instance. The terms of service and privacy policy will be written in plain, accessible language, not legalese.

### Data Residency and Sovereignty
For the initial launch, data will be stored in Supabase’s US‑based infrastructure. As the product matures, a data‑residency option will be offered to meet the requirements of users in jurisdictions with strict data sovereignty laws (e.g., GDPR in the EU). The architecture’s reliance on a single PostgreSQL database simplifies this migration.

---

## 11.3 Future Regulatory Compliance

While the MVP handles only tasks, calendar events, and notes—data that falls outside the strictest regulatory frameworks—the long‑term module map includes health and financial data. The architecture is designed to accommodate these regulated domains without a complete rebuild.

### Health Data (HIPAA Considerations)
When health modules (symptoms, medications, lab results, HealthKit integration) are added, they will be subject to heightened privacy expectations and, for users in the United States, potential HIPAA compliance requirements. The dual‑zone architecture (Open Zone vs. Vault Zone) is the primary mechanism for managing this:
- Health data resides in the Vault Zone, encrypted client‑side with keys the server cannot access.
- The server stores only encrypted blobs and anonymized metadata for planning purposes.
- This architecture means that even if the database were breached, health data would be unreadable. The system is designed to place the data controller responsibility as close to the user as possible, minimizing the compliance surface for the company.
- Should the product later require HIPAA compliance (e.g., through integration with healthcare providers), the Vault Zone’s isolation makes it possible to host that data in a dedicated, HIPAA‑eligible environment while keeping the rest of the system separate.

### Financial Data (PSD2 and Open Banking)
Financial data from bank aggregation (Plaid, etc.) is similarly sensitive and subject to regulations like PSD2 in Europe. The same dual‑zone approach applies: raw transaction data is client‑side encrypted, while anonymized, planning‑relevant metadata (e.g., “bill due today”) is derived client‑side and placed in the Open Zone. The company will not store user banking credentials; all aggregation will use token‑based, read‑only access through regulated providers.

### GDPR, CCPA, and Global Privacy Laws
The product is designed to meet the core requirements of global privacy regulations from day one:
- **Right of access:** Fulfilled by the account export feature.
- **Right of erasure:** Fulfilled by in‑app account deletion with recovery period.
- **Data minimization:** Only the minimum necessary data is collected, and users control which integrations and modules they activate.
- **Consent:** Analytics and optional features are opt‑in; privacy consent is not bundled into a single “accept all” flow.
- **Data processing transparency:** The privacy policy will clearly enumerate all sub‑processors (Supabase, Clerk, Sentry, PostHog, etc.) and their roles.
- **Apple’s account deletion requirement:** The mobile app includes in‑app account deletion, satisfying App Store guidelines.

---

## 11.4 Accessibility Commitment

Life OS is built to be usable by as many people as possible. The interface targets **WCAG 2.2 Level AA** compliance across both web and mobile platforms. This is not a separate “accessible mode” but an intrinsic property of the design system and development process.

Specific requirements include:
- **Color contrast:** All text and interactive elements meet minimum contrast ratios (4.5:1 for normal text, 3:1 for large text). The color palette has been designed with these constraints from the start.
- **Keyboard navigation:** The web application is fully navigable by keyboard. Focus indicators are visible and logical. The command bar is accessible via `Cmd+K` and fully operable with arrow keys and Enter/Escape.
- **Screen reader support:** Semantic HTML and ARIA labels are used throughout the web app. React Native’s accessibility APIs (`accessibilityLabel`, `accessibilityRole`) are applied to all interactive elements on mobile.
- **Touch targets:** All interactive elements on mobile are at least 44×44 points, following Apple’s Human Interface Guidelines and Android’s Material Design recommendations.
- **Motion reduction:** All animations and transitions respect the user’s system‑level “Reduce Motion” setting. When enabled, animations are replaced with instant transitions.
- **Dynamic type:** The UI responds to system font‑size settings, with layouts that reflow gracefully at larger text sizes.

Accessibility testing is integrated into the CI pipeline. Visual regression tests include accessibility assertions, and manual screen‑reader testing is part of the release checklist for every significant UI change.

---

## 11.5 Calendar Sync Reliability

The Google Calendar integration is the most critical external dependency in the MVP. Its reliability directly impacts the user’s ability to plan their day. The system is designed with multiple layers of resilience to ensure the user always sees an accurate, up‑to‑date calendar.

### Visible Sync Status
The UI displays a prominent “last synced” timestamp on the calendar settings screen and a subtle indicator on the Today view (e.g., a small dot or text that appears only when sync is delayed). This transparency lets users know whether their calendar data is current, and if not, why.

### Handling Sync Failures
- **Expired credentials:** When Google’s OAuth refresh token expires or the user revokes access, the system detects the failure and surfaces a clear, non‑intrusive notification in the app: “Calendar connection needs attention—tap to reconnect.” The user is guided through a re‑authorization flow without losing their previously synced data.
- **Sync token invalidation (410 Gone):** Google’s Calendar API can return a `410` response, indicating that the sync token is no longer valid and a full re‑sync is required. The sync service handles this automatically by clearing the stored token and performing a full sync of all events. This process is logged and monitored, as frequent full syncs can indicate a configuration problem.
- **Network errors and rate limits:** The sync service implements exponential backoff for transient failures. Rate limit responses are respected, and sync jobs are queued per user to avoid overwhelming the API during recovery scenarios.
- **Reconciliation:** A periodic reconciliation job (weekly, via Inngest) compares the events in Life OS’s database with a full list from Google Calendar to detect any drift that incremental sync may have missed. Discrepancies are logged and automatically corrected.

### Push Notification Reliability
Google’s push notifications are a best‑effort mechanism; they are not guaranteed to be delivered. The system therefore runs a **periodic polling fallback** (initially every hour, adjustable) that performs an incremental sync using the stored `syncToken`. This ensures that even if all push notifications are missed, the user’s calendar is at most one hour out of date. The polling interval can be tightened post‑launch based on observed notification reliability.

### Webhook Subscription Renewal
Google Calendar push notification channels expire after 7 days. A scheduled Inngest job renews every active channel at the 6‑day mark, ensuring continuous coverage. If renewal fails, the system falls back to polling and alerts the operations team.

### Race Condition Protection
A unique database constraint on Google’s `eventId` (combined with the calendar source ID) prevents duplicate events from being created during sync races (e.g., a push notification and a polling sync arriving simultaneously). The `idempotency_keys` table further protects event processing operations against double‑processing.

---

## 11.6 Operational Security Practices

Beyond the technical safeguards, the team’s operational practices must maintain the trust users place in the system.

- **Access control:** Production database access is restricted to a minimum set of personnel and requires multi‑factor authentication. All access is logged and audited.
- **Secret management:** No secrets (API keys, tokens, passwords) are ever committed to the repository. All secrets are injected via CI/CD environment variables or a secrets manager (Supabase Vault, Doppler, or similar).
- **Dependency monitoring:** Dependabot or Renovate is configured to automatically open pull requests for security patches. A `pnpm audit` step in CI fails the build if a critical or high‑severity vulnerability is present without a resolution.
- **Incident response runbook:** Before the product accepts real user data, a documented incident‑response plan must be in place. This plan covers: detection (monitoring alerts, user reports), containment (revoking tokens, disabling compromised services), investigation (audit log analysis), notification (informing affected users within regulatory timeframes), and remediation (root cause analysis and post‑mortem).
- **Backup and restore testing:** Database backups are performed automatically by Supabase. The team will conduct quarterly restore tests to verify that backups are usable and that the recovery procedure is well understood.
- **Penetration testing:** Before public launch, an external security assessment (penetration test) will be conducted on the application and its API. Findings will be addressed before any user data beyond the beta group is stored.

---

## 11.7 Summary

Operational and compliance readiness is not a launch‑day activity; it is a continuous discipline that begins with the first line of code. The measures described here—encryption, RLS, audit logging, privacy‑safe telemetry, accessibility, and resilient integration design—form a baseline of trust. As the product grows into new domains (health, finance), the dual‑zone architecture and established security practices will ensure that compliance obligations are met without retroactive, destabilizing changes. The ultimate measure of success is simple: a user should be able to trust Life OS with their entire life, knowing that the system is built to protect it.