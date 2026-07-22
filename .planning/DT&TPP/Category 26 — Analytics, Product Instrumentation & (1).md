<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

## Category 26 — Analytics, Product Instrumentation \& Experimentation

**Recommendation: use a privacy-first, server-governed product analytics
architecture: start with a minimal internal event ledger in PostgreSQL for
critical product and operational outcomes, use Plausible for anonymous
public-web acquisition analytics, and defer third-party behavioral analytics,
experiments, and session replay until explicit consent, data-governance
controls, and a validated product need exist.** Keep feature flags in the small
server-controlled system already selected; do not add PostHog or Amplitude
during MVP solely for experimentation.[^1][^2][^3]

This is intentionally conservative. Life OS handles personal tasks, notes,
calendars, reminders, and search intent. Product analytics must help improve the
product without becoming an unbounded second record of a user’s private life.

## Core Decision

```text
Public marketing website analytics:    Plausible, privacy-preserving aggregate analytics
Authenticated product analytics:       Minimal first-party event ledger in PostgreSQL
Operational/product outcome metrics:   OpenTelemetry metrics + aggregated PostgreSQL reporting queries
Feature flags:                         Existing server-controlled feature-flag system
Experiments:                           Deferred; manual staged rollout/feature flags only
Session replay/heatmaps:               Prohibited in MVP
Autocapture:                           Prohibited
Raw event-body capture:                Prohibited
Raw search queries:                    Prohibited
Third-party behavioral analytics:      Deferred
Data warehouse:                        Deferred until reporting volume/use cases justify it
```

Plausible states that it does not use cookies or collect personal data, making
it suitable for anonymous marketing-site traffic measurement rather than
authenticated in-product behavior. Amplitude offers governed tracking plans and
ingest validation, but it would still introduce a new behavioral-data processor
and is unnecessary before Life OS has a deliberate, minimal tracking
plan.[^4][^2][^3][^1]

## Product Questions First

Instrumentation exists to answer decisions, not to collect every interaction.
Before implementing an event, specify:

| Product question                                 | Minimal metric                                                                     |
| :----------------------------------------------- | :--------------------------------------------------------------------------------- |
| Do new users reach a useful first plan?          | Onboarding completion and first-plan-created rate                                  |
| Do users return to use Today?                    | Weekly active planners, based on coarse app-open/Today-view event                  |
| Are reminders helpful or excessive?              | Reminder scheduled, suppressed, provider-accepted, opened; no notification content |
| Is calendar connection worth its complexity?     | Connection start/completed/failed/revoked rate and sync health                     |
| Does offline mode converge reliably?             | Offline command queued/accepted/rejected/reconciled counts                         |
| Are users finding things?                        | Search started/result-selected/zero-result rate, query-length bucket only          |
| Are attachment/search features useful?           | Feature enabled and successful completion counts                                   |
| Does a new feature create errors or abandonment? | Feature exposure plus safe success/failure outcome metrics                         |

If an event does not answer a defined product, reliability, security, or support
question, do not collect it.

## Options

| Option                                                                              | Advantages                                                                                                    | Disadvantages                                                                                                 | Decision                           |
| :---------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------ | :--------------------------------- |
| **First-party minimal event ledger + OTel metrics + Plausible marketing analytics** | Maximum control, minimal privacy surface, aligned with PostgreSQL/RLS/outbox, no extra in-product data vendor | Less turnkey funnel/cohort UI; reporting requires deliberate SQL/dashboard work                               | **Select**                         |
| PostHog Cloud                                                                       | Product analytics, feature flags, experiments, session replay, funnels in one platform                        | Adds third-party behavioral data processor; replay/autocapture risks; feature flags duplicate selected system | Defer                              |
| PostHog self-hosted                                                                 | Greater data control, broad capabilities                                                                      | Meaningful operational complexity; still requires strict content/property governance                          | Defer                              |
| Amplitude                                                                           | Mature taxonomy governance, funnels, retention, experiments                                                   | New vendor/cost and sensitive behavioral-data flow; richer than MVP need                                      | Defer                              |
| Mixpanel                                                                            | Strong product analytics UX                                                                                   | Similar vendor/privacy/identity costs; overlap with minimal needs                                             | Reject initially                   |
| Segment/RudderStack CDP                                                             | Flexible routing to many destinations                                                                         | Encourages data proliferation; not useful before a stable source event model exists                           | Reject                             |
| Plausible for all analytics                                                         | Very privacy-forward and simple                                                                               | Does not provide authenticated user-level product funnels/retention                                           | Use only for public web            |
| Custom event tables only, no metrics tooling                                        | Full control                                                                                                  | Can become ad hoc, slow, and hard to monitor without schema/governance                                        | Use with OTel/reporting discipline |
| Session replay/heatmaps                                                             | Rich UX debugging                                                                                             | Captures visual/content context; high privacy burden for notes/calendar/task product                          | Prohibit in MVP                    |
| Autocapture                                                                         | Fast setup                                                                                                    | Unpredictable collection, weak taxonomy, can capture sensitive UI data                                        | Prohibit                           |
| Data warehouse first                                                                | Powerful analytics foundation                                                                                 | Cost and data-engineering burden before validated questions                                                   | Defer                              |

PostHog feature flags support percentage rollouts, targeting, kill switches,
remote configuration, and experiment integration. Those capabilities are
credible future options, but they overlap with the selected internal
feature-flag design and should not drive premature adoption of broad third-party
user-behavior tracking.[^5]

## Why This Wins

### Privacy is a product requirement

A Life OS user may create tasks, notes, calendar events, and searches that
reveal work, health, family, finances, relationships, or legal matters. Even
event names and page paths can reveal sensitive facts if they contain entity
titles or user-entered content.

The default must be:

```text
Measure feature outcomes, not personal content.
Measure aggregate behavior, not private life.
Collect only what is needed for a defined product decision.
```

### Core outcomes already exist authoritatively

Many crucial product metrics come from authoritative database facts rather than
tracking pixels:

```text
Task created/completed
Plan projection generated
Calendar connection successfully established
Reminder scheduled/suppressed
Export completed
Attachment approved
Search projection current
Offline command reconciled
```

An internal event ledger can record sanitized outcome events in the same
transaction/outbox flow that creates those facts. This avoids losing important
events due to client offline state, ad blockers, app termination, or browser
telemetry restrictions.

### Avoid duplicate flag systems

The CI/CD category selected a small server-controlled feature-flag mechanism for
staged rollout, kill switches, and beta access. Adding PostHog flags would
create competing feature evaluation paths:

```text
Internal server flag says enabled
PostHog client flag says disabled
Mobile is offline
Web is on stale bootstrap state
```

Use one feature-flag authority until experimentation requirements justify a
deliberate migration.

## Signal Separation

| Signal                    | Purpose                                  | Storage/tool                    | Retention                             |
| :------------------------ | :--------------------------------------- | :------------------------------ | :------------------------------------ |
| Audit event               | Durable record of security/domain action | PostgreSQL audit tables         | Per legal/security policy             |
| Command/outbox/job record | Reliability and workflow state           | PostgreSQL                      | Operational/data policy               |
| OTel metric/trace         | Service health/performance               | OTel backend                    | Short operational retention           |
| Error event               | Exception/crash triage                   | Sentry                          | Short error retention                 |
| Product event ledger      | Aggregated product outcome analysis      | PostgreSQL                      | Short, explicit retention             |
| Public web analytics      | Marketing acquisition/site usage         | Plausible                       | Vendor-configured aggregate retention |
| Experiment exposure       | Future causal analysis                   | Feature system + product ledger | Only when experiments approved        |
| Session replay            | UI reproduction                          | Not collected                   | N/A                                   |
| Raw interaction stream    | Behavioral surveillance                  | Not collected                   | N/A                                   |

Do not reuse audit logs as product analytics. Audit records have different
retention, access, legal meaning, completeness expectations, and privacy risks.

## First-Party Event Ledger

### Table design

Use a narrow, allowlisted event record:

```text
product_events
  id                         UUID primary key
  occurred_at                timestamptz not null
  event_name                 text not null
  event_version              integer not null
  environment                development | preview | staging | production
  platform                   web | ios | android | server | worker
  actor_ref                  text nullable
  workspace_ref              text nullable
  session_ref                text nullable
  installation_ref           text nullable
  correlation_id             UUID/text nullable
  feature_flag_snapshot      jsonb nullable, allowlisted
  properties                 jsonb not null
  created_at                 timestamptz not null
```

Use pseudonymous references, consistent with the observability category:

```text
actor_ref = environment-scoped HMAC(app_user_id)
workspace_ref = environment-scoped HMAC(workspace_id)
installation_ref = opaque installation ID or HMAC
```

The ledger must not contain raw user IDs, emails, task IDs, task titles, note
content, calendar content, raw search input, OAuth data, IP addresses, or
provider payloads.

### Allowlisted properties

Example safe event:

```json
{
  "event_name": "task.command_completed",
  "event_version": 1,
  "platform": "ios",
  "properties": {
    "command_type": "complete",
    "origin": "today",
    "offline_at_submit": true,
    "reconciled_outcome": "accepted",
    "latency_bucket": "1_to_5_seconds"
  }
}
```

Unsafe version:

```json
{
  "event_name": "task_completed",
  "properties": {
    "task_id": "raw UUID",
    "task_title": "Call therapist",
    "project_name": "Health",
    "note": "Discuss medication",
    "user_email": "..."
  }
}
```

The unsafe version is prohibited.

### Event schema registry

Define event contracts in a shared package:

```text
packages/analytics/
├── src/
│   ├── event-names.ts
│   ├── schemas/
│   │   ├── onboarding.ts
│   │   ├── tasks.ts
│   │   ├── planning.ts
│   │   ├── calendar.ts
│   │   ├── notifications.ts
│   │   ├── search.ts
│   │   └── settings.ts
│   ├── analytics-client.ts
│   ├── analytics-server.ts
│   ├── property-policy.ts
│   └── index.ts
```

Every event has:

```text
Stable name
Version
Owner
Product question
Schema
Allowed properties and value ranges
Forbidden-property review
Collection point
Retention period
Dashboard/decision it serves
```

Amplitude’s data-governance model demonstrates the value of a tracking plan and
trusted/official event definitions; its “official” designation is specifically
intended to identify reviewed, authoritative events/properties for analysis.
Adopt that governance discipline even without adopting Amplitude.[^6][^4]

## Initial Event Taxonomy

### Onboarding and activation

| Event                                    | Safe properties                                      |
| :--------------------------------------- | :--------------------------------------------------- |
| `onboarding.started.v1`                  | Platform, entry source bucket                        |
| `onboarding.completed.v1`                | Completion duration bucket, enabled capability flags |
| `workspace.created.v1`                   | Workspace type bucket only                           |
| `first_task.created.v1`                  | Origin, offline boolean                              |
| `first_plan.viewed.v1`                   | Platform                                             |
| `first_calendar_connection.completed.v1` | Provider category, duration bucket                   |

### Core planning

| Event                        | Safe properties                                                  |
| :--------------------------- | :--------------------------------------------------------------- |
| `today.viewed.v1`            | Platform, state bucket: populated/empty/offline                  |
| `task.command_submitted.v1`  | Command type, origin, offline boolean                            |
| `task.command_reconciled.v1` | Command type, accepted/rejected/conflict outcome, latency bucket |
| `plan.rebuilt.v1`            | Trigger category, duration bucket, result state                  |
| `time_block.created.v1`      | Origin and duration bucket only                                  |
| `project.created.v1`         | Origin                                                           |
| `note.created.v1`            | Origin; never content or title                                   |

### Integration and sync

| Event                             | Safe properties                                          |
| :-------------------------------- | :------------------------------------------------------- |
| `calendar.connect_started.v1`     | Provider category                                        |
| `calendar.connect_completed.v1`   | Provider category, duration bucket                       |
| `calendar.connect_failed.v1`      | Normalized safe error code                               |
| `calendar.sync_completed.v1`      | Connection health category, duration/event-count buckets |
| `calendar.connection_degraded.v1` | Normalized reason class                                  |
| `sync.issue_created.v1`           | Issue category, not entity/provider payload              |

### Search, files, notifications

| Event                                | Safe properties                                                  |
| :----------------------------------- | :--------------------------------------------------------------- |
| `search.submitted.v1`                | Surface, query-length bucket, selected types                     |
| `search.results_rendered.v1`         | Result-count bucket, latency bucket, zero-result boolean         |
| `search.result_opened.v1`            | Entity type, surface, position bucket; no query or entity ID     |
| `attachment.upload_completed.v1`     | MIME category, size bucket, processing duration bucket           |
| `reminder.scheduled.v1`              | Channel policy, lead-time bucket                                 |
| `reminder.delivery_outcome.v1`       | Local/remote, accepted/suppressed/failed/opened, lateness bucket |
| `notification.permission_changed.v1` | Granted/denied/provisional/unknown                               |

### Account and support

| Event                           | Safe properties                                     |
| :------------------------------ | :-------------------------------------------------- |
| `settings.opened.v1`            | Section identifier                                  |
| `export.requested.v1`           | Export kind                                         |
| `export.completed.v1`           | Duration bucket                                     |
| `account.deletion_requested.v1` | No additional properties                            |
| `support.sync_issue_opened.v1`  | Issue category                                      |
| `feature.exposed.v1`            | Flag name, variant, client/server evaluation source |

Keep total MVP event count small—roughly 30–50 reviewed event types, not
hundreds.

## Collection Model

### Server-first for authoritative outcomes

Emit server-side product events for:

```text
Command accepted/rejected/reconciled
Workspace/account lifecycle
Plan projection completed
Calendar connection/sync result
Reminder schedule/delivery result
Attachment lifecycle result
Search service result
Export/deletion result
Feature evaluation for server-enforced flows
```

Preferred path:

```text
Authoritative transaction
  -> domain state + audit + outbox
  -> committed
  -> analytics projection/worker records safe product event
```

This retains correctness across mobile offline operation and avoids trusting
clients to report critical outcomes.

### Client events for interface-only behavior

Use client-side events only when the server cannot observe the behavior:

```text
Screen/surface viewed
Command palette opened
Onboarding step shown
Local permission state changed
Local notification interaction
Client offline presentation state
UI control used before any server command
```

Client event requirements:

- Queue a bounded number in memory/local safe store.
- Drop safely when offline or queue exceeds size limit; analytics must never
  block core UI.
- Batch opportunistically over HTTPS.
- Validate event schema server-side.
- Discard pending client events on sign-out/account switch.
- Never retry indefinitely or consume meaningful battery/network.
- Do not persist raw data/body fields.
- Respect analytics opt-out before enqueueing.

### Do not send directly to third parties from clients

For authenticated product analytics, web and mobile send to a controlled Hono
endpoint:

```text
POST /v1/analytics/events
```

Hono:

1. Verifies Clerk identity.
2. Applies account-level analytics preference.
3. Validates Zod event schema/version.
4. Enforces allowlisted property keys and bounded values.
5. Derives pseudonymous identity server-side.
6. Rate limits/batches deduplicates as appropriate.
7. Stores safe record or drops invalid events.
8. Never forwards raw client payloads blindly.

This provides a future point to export a cleaned stream to a warehouse or
analytics platform without changing every client.

## Identity and Consent

### No analytics by default for sensitive behavior

Adopt an explicit **product analytics preference**:

```text
Settings -> Privacy -> Help improve Life OS
```

Choices:

```text
Essential operational telemetry:
  Always on, minimal, necessary for security/reliability

Optional product analytics:
  Off by default at MVP unless legal/privacy review supports a different regional policy

Crash diagnostics:
  Separately explained setting where applicable; privacy-minimized regardless

Marketing website analytics:
  Plausible aggregate analytics; no authenticated product identity
```

The exact consent model must be reviewed with legal/privacy requirements by
jurisdiction. The engineering default should make opt-out immediate and
enforceable, not a cosmetic UI switch.

### Opt-out enforcement

When optional analytics is disabled:

- Client stops queueing optional events.
- Hono rejects/drops optional event ingestion.
- Existing user-level product-event records follow retention/deletion policy.
- Do not attempt to use anonymous identifiers to bypass the preference.
- Feature flags required for reliability/security may still evaluate, but are
  not treated as behavioral tracking.
- Operational error logs remain governed by the observability policy, not
  product-analytics opt-in.

## Plausible for Marketing Web

Use Plausible only on the unauthenticated marketing site:

```text
Landing pages
Documentation/public blog
Pricing page
Signup entry source
Campaign/referrer attribution
```

Do not load it in:

```text
Authenticated Next.js app routes
Task/note/calendar screens
Account/billing/settings pages
OAuth callback pages
Export/deletion flows
Support diagnostics
```

Plausible says it uses no cookies and does not collect personal data; its
compliance documentation describes aggregate analytics without persistent
identifiers. Still perform vendor/DPA review, configure only necessary goals,
and avoid custom events that include personal content or account
identifiers.[^2][^3]

## Experiments and Flags

### MVP: staged releases, not A/B tests

Use the selected internal flag system for:

```text
Internal enablement
Named beta allowlist
Workspace-level pilot
Small percentage rollout only if evaluation is deterministic
Kill switch
Migration/read-write compatibility
```

For each flag:

```text
Name
Owner
Purpose
Default
Targeting rules
Start/end date
Rollback action
Metrics to watch
Removal date
```

Do not call a percentage rollout an “experiment” unless all are defined:

1. Hypothesis and primary metric.
2. Eligibility criteria.
3. Assignment unit and deterministic bucketing.
4. Sample-size/duration plan.
5. Guardrail metrics.
6. Exposure event.
7. Analysis method and decision rule.
8. Privacy review.
9. Flag cleanup date.

### Why defer PostHog experimentation

PostHog can combine flags, experiments, analytics, and rollouts. That is useful
once Life OS has enough active users and a stable, consented event stream to
support statistically meaningful decisions. At MVP, it would create:[^5]

- A second feature-flag authority.
- More behavioral data leaving the system.
- Pressure to collect broad event data before governance exists.
- Misleading experiments with insufficient sample size.

Reassess after the product has validated activation/retention questions and a
documented tracking plan.

## Session Replay and Autocapture

### Prohibit both in MVP

Session replay can capture visual content that includes task names, notes,
calendars, attachment previews, profile details, and security context.
Autocapture can collect accidental interactions, DOM attributes, form values,
paths, or UI metadata beyond the reviewed event taxonomy.

Therefore:

```text
Session replay:    Disabled in Sentry, PostHog, and any future analytics SDK by default
Autocapture:       Disabled
DOM text capture:  Disabled
Form capture:      Disabled
Network-body capture: Disabled
Screen recording:  Not collected
```

Use privacy-safe error context, user-reported screenshots under explicit
consent, and targeted synthetic test recordings instead.

## Reporting

### Start with operational/product SQL views

Build reviewed views that produce aggregates, not raw personal event streams:

```text
analytics_daily_activation
analytics_weekly_active_planners
analytics_command_reconciliation
analytics_calendar_connection_funnel
analytics_notification_outcomes
analytics_search_quality
analytics_feature_rollout_health
```

Example output:

```text
day
platform
activation_stage
count
rate
```

Restrict access to raw `product_events`. Most stakeholders should receive
dashboard aggregates only.

### Initial dashboards

| Dashboard               | Decisions it supports                                               |
| :---------------------- | :------------------------------------------------------------------ |
| Activation              | Where onboarding/first-plan flow loses users                        |
| Core planner health     | Whether users return to Today/create/complete tasks                 |
| Offline reliability     | Queued/reconciled/rejected command trends                           |
| Calendar integration    | Connect/sync success, degradation, repair rate                      |
| Notifications           | Permission, scheduling, suppression, provider acceptance/open rates |
| Search                  | Latency, zero-result, result-open rate without query text           |
| Release/feature rollout | Error and success guardrails by version/flag                        |
| Privacy operations      | Analytics opt-out counts, schema rejection, deletion outcomes       |

The dashboard itself must not expose task/note/calendar content or user-level
behavior by default.

## Data Retention and Access

### Initial policy

| Data                                      | Retention                                          |
| :---------------------------------------- | :------------------------------------------------- |
| Optional raw product events               | 30 days                                            |
| Aggregated daily/weekly metrics           | 13 months                                          |
| Feature exposure records                  | 30–90 days, depending on active experiment/rollout |
| Anonymous Plausible public-site analytics | Vendor-configured minimum practical retention      |
| Operational OTel/Sentry data              | Per observability policy                           |
| Audit records                             | Separate legal/security policy                     |

Short raw-event retention keeps the system useful for debugging funnels while
reducing accumulation of behavioral history.

### Access controls

- Raw event data: tightly limited engineering/data owners.
- Aggregated dashboards: product leadership/authorized team.
- No customer support access to raw behavior streams unless a documented support
  investigation requires it and the user’s identity is already authorized.
- No analyst access to production database tables using broad service-role
  credentials.
- Exported reports must be aggregate/minimum-cell-size reviewed to prevent
  singling out a user.
- Product-event deletion/erasure is included in account deletion and privacy
  request workflows.

## Data Quality

### Enforcement

Every event ingestion must:

```text
Validate event name/version.
Validate required/optional properties through Zod.
Reject unknown properties by default.
Enforce enums, length limits, numeric ranges, and bucketed values.
Apply rate limits.
Drop events for disabled analytics preference.
Log only schema-rejection aggregate counters, not rejected raw payload.
Monitor event volume/schema drift.
```

Use a schema registry rather than a generic `track(name, properties: any)`
utility.

### Event versioning

Never silently change event semantics. Use:

```text
task.command_reconciled.v1
task.command_reconciled.v2
```

Deprecate old versions with a deadline, update dashboards, then stop accepting
old client event versions only after the supported mobile-version window.

## Future Reassessment

### Consider PostHog when

- A reviewed, consented event taxonomy is stable.
- Product team needs self-serve funnels, cohorts, and retention analysis beyond
  SQL views.
- Feature flag/experiment requirements exceed the internal system.
- A vendor/privacy/DPA review approves the data categories.
- Client/server identity and deletion workflows are verified.
- Session replay remains disabled or is separately consented and fully masked.
- Data residency and retention requirements are met.

### Consider Amplitude when

- Enterprise-grade tracking-plan governance and analyst workflows are more
  valuable than integrated engineering tools.
- Product analytics is mature enough to justify a dedicated data-governance
  owner.
- The organization needs event transformations, validation, cohort workflows,
  and warehouse export at scale.

Amplitude documents tracking plans, ingestion validation, transformations, and
access controls for event data; these are capabilities to reassess when the
internal schema registry and SQL dashboards cease to be sufficient.[^1][^4]

### Consider a warehouse when

- Reporting queries affect production workload.
- Multi-source analysis joins billing, support, marketing, and product data
  under approved governance.
- Data retention and transformation need independent lifecycle controls.
- The team has resources to own semantic models, access controls, and data
  quality.

## Testing

| Scenario                                     | Required outcome                                                          |
| :------------------------------------------- | :------------------------------------------------------------------------ |
| Event contains task title/note/calendar text | Schema rejects it; no raw payload logged                                  |
| Event contains unknown property              | Rejected/dropped and schema-drift metric increments                       |
| User opts out                                | Optional events stop client-side and server-side immediately              |
| User signs out                               | Pending optional event queue cleared                                      |
| User account deleted                         | Event identity records are erased/anonymized according to policy          |
| Offline client event queue over cap          | Old/optional events safely dropped; app remains responsive                |
| Duplicate client retries                     | Idempotent/deduplicated where outcome counts matter                       |
| Server command completes                     | Safe authoritative product event emitted exactly once or deduped          |
| Feature rollout                              | Flag exposure safely recorded; flag can be disabled quickly               |
| Plausible configuration                      | Loaded only on public pages; no account/entity/custom personal properties |
| Dashboard query                              | Aggregated results only; no raw content or small-cell disclosure          |
| Mobile build                                 | No analytics secret, raw user ID, or server key bundled                   |
| Third-party outage                           | Analytics failure cannot delay command/UI/job execution                   |

## Trade-Offs

| Choice                                  | Gain                                                                 | Cost                                       |
| :-------------------------------------- | :------------------------------------------------------------------- | :----------------------------------------- |
| First-party event ledger                | Privacy control, authoritative outcomes, no new behavior-data vendor | Less turnkey funnel/cohort tooling         |
| Server-first events                     | Correct across offline and app termination                           | Cannot see every UI micro-interaction      |
| Client events only for UI-only behavior | Captures meaningful UX gaps                                          | Requires bounded queue/schema enforcement  |
| Plausible public-web only               | Useful acquisition insights with minimal tracking                    | No authenticated-product funnels           |
| No session replay/autocapture           | Strong protection against content leakage                            | Less visual debugging/context              |
| Internal flags first                    | One rollout authority, minimal vendor exposure                       | Limited experimentation UX                 |
| Opt-in optional analytics               | Strong trust posture                                                 | Smaller sample and slower product analysis |
| SQL aggregate dashboards                | Transparent, controlled reporting                                    | More engineering effort for new analysis   |

## Final Decision

Lock the following analytics and experimentation architecture:

```text
Marketing-site analytics:       Plausible on public, unauthenticated web pages only
Authenticated product analytics: Minimal first-party PostgreSQL product_events ledger
Core outcome events:            Server/outbox/worker generated whenever authoritative state exists
Client-only events:             Small allowlisted schema through Hono ingestion endpoint, bounded/offline-tolerant queue
Identity:                       Environment-scoped HMAC pseudonymous actor/workspace/installation references
Content policy:                 No task/note/calendar/attachment/search text, no raw IDs/emails/tokens/URLs/request bodies
Governance:                     Shared versioned Zod event schema registry; unknown properties rejected
Consent:                        Optional product analytics preference, enforceable client and server side;
                                essential operational telemetry governed separately
Reporting:                      Reviewed PostgreSQL aggregate views/dashboards, raw events tightly restricted
Retention:                      30-day raw optional product events; 13-month aggregates; explicit deletion handling
Feature flags:                  Existing server-controlled flags, one authority only
Experiments:                    Deferred until hypothesis, sample, consent, tracking plan, and privacy review are ready
Session replay/autocapture:     Prohibited in MVP
PostHog/Amplitude:              Deferred until validated product-analytics maturity justifies vendor/data-processing trade-off
Data warehouse:                 Deferred
```

The next category in dependency order is **Security Architecture, Privacy \&
Compliance**.
<span style="display:none">[^10][^11][^12][^13][^14][^15][^7][^8][^9]</span>

<div align="center">⁂</div>

[^1]: https://amplitude.com/docs

[^2]: https://plausible.io/privacy

[^3]: https://plausible.io/compliance

[^4]: https://amplitude.com/docs/data

[^5]: https://posthog.com/docs/feature-flags

[^6]: https://amplitude.com/docs/data/official-events-and-properties

[^7]: https://posthog.com/docs/feature-flags/creating-feature-flags

[^8]: https://posthog.com/feature-flags

[^9]: https://preview.posthog.com/docs/feature-flags

[^10]: https://posthog.com/docs/api/feature-flags

[^11]: https://plausible.io/dpa

[^12]: https://posthog.com/docs/api/flags

[^13]: https://posthog.com/handbook/marketing/positioning/feature-flags

[^14]: https://amplitude.com/resources/behavioral-data-event-tracking

[^15]: https://preview.posthog.com/docs/api/feature-flags
