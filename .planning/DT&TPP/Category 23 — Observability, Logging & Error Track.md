<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

## Category 23 — Observability, Logging \& Error Tracking

**Recommendation: use a three-part observability stack: Sentry for application errors, crash reporting, releases, and user-impact triage; OpenTelemetry for backend/worker traces and metrics exported through OTLP; and structured JSON logs written to stdout and collected by the selected hosting platform or a log service.** Start with Sentry Cloud plus an OTLP-compatible managed backend such as Grafana Cloud, while keeping telemetry adapters vendor-neutral.[^1][^2][^3]

The highest priority is **privacy-safe diagnosis**. Life OS handles calendar, note, task, account, and OAuth data, so telemetry must be designed as a minimal operational dataset—not a shadow copy of user activity or content.

## Core Decision

```text
Error/crash monitoring:          Sentry Cloud
Mobile SDK:                      @sentry/react-native, Expo development/production builds
Web SDK:                         Sentry Next.js SDK
Backend/worker errors:           Sentry Node SDK
Tracing/metrics standard:        OpenTelemetry (OTLP)
Backend/worker telemetry:        OTel Node SDK + selected auto-instrumentation + manual spans
Metrics/traces backend:          Grafana Cloud initially, or host-provided OTLP-compatible backend
Logs:                            Structured JSON to stdout
Log collection:                  Hosting platform initially; optional Better Stack/Grafana Loki later
Correlation:                     Request ID + W3C trace context + command/outbox/job correlation IDs
Client session replay:           Disabled by default
Raw PII/content capture:         Prohibited by default
Production debug logging:        Disabled by default, temporary scoped enablement only
```

Sentry provides platform support for React Native and Next.js, while Expo documents an integration path for crash reporting in Expo applications.  OpenTelemetry JavaScript supports generating telemetry for traces, metrics, and logs in Node.js and browser environments, though browser instrumentation remains more experimental than Node instrumentation.[^4][^2][^3][^1]

## Requirements

The observability system must let the team answer:

- Is the API, worker, database, PowerSync token endpoint, Calendar integration, and notification pipeline healthy?
- Did a user-facing command fail, stall, or get rejected—and at which stage?
- Is an issue isolated to web, iOS, Android, a release, a workspace, an integration, or a provider?
- Are outbox and job queues delayed?
- Are search indexing, planning projections, calendar sync, and notifications within freshness targets?
- Can a support investigation correlate a user-provided safe reference ID with a request/job without exposing personal data?
- Can the team deploy safely, detect regressions, and roll back?
- Can the organization meet privacy/deletion/retention commitments?

It must **not** collect task titles, note bodies, calendar descriptions, OAuth tokens, authorization headers, raw webhook payloads, signed URLs, attachment names by default, or full raw search queries.

## Options

| Option | Advantages | Disadvantages | Decision |
| :-- | :-- | :-- | :-- |
| **Sentry + OTel + structured logs** | Strong error triage and release context; open telemetry standard for traces/metrics; flexible backend choice; avoids one tool pretending to solve every signal; OTel achieved CNCF graduation May 2026, validating production readiness | Three integrated concerns; requires disciplined correlation/redaction/configuration; OTel JavaScript logs still in Development (traces/metrics Stable) | **Select** |
| Sentry only | Fastest initial setup; errors/performance/release health in one product; widest SDK ecosystem (100+ platforms) | Weaker metrics/logs portability and queue/infrastructure observability; vendor concentration; event-based pricing unpredictable at scale | Use as initial milestone, but not final architecture |
| GlitchTip (self-hosted) + OTel | Sentry-compatible drop-in replacement; open-source MIT-licensed; self-hostable for data sovereignty; $15/month for 100k events hosted; unlimited projects/team members | Less mature ecosystem than Sentry; smaller community; requires ops overhead for self-hosting; fewer integrations | **Consider** for teams prioritizing cost control and self-hosting |
| Better Stack all-in-one | Modern developer-friendly UI; ~10x cheaper than Datadog; bundles logs/metrics/traces/uptime/incidents; predictable volume-based pricing; no cardinality/indexing fees; starting $29/month | Younger platform than Datadog/Sentry; less mature mobile crash triage; smaller integration ecosystem | **Strong alternative** for cost-conscious teams wanting unified platform |
| Datadog all-in-one | Mature logs/APM/metrics/RUM/security ecosystem; 700+ integrations; enterprise compliance (FedRAMP, HIPAA, PCI DSS); Watchdog AI anomaly detection | Cost and vendor lock-in; data-volume/privacy controls require careful management; multi-dimensional pricing compounds ($15/host infra + $31/host APM + log indexing); mid-size teams routinely see $5K-20K/month bills | Defer for enterprise scale |
| Grafana Cloud + OTel + Loki, no Sentry | Open standards and strong metrics/logs/traces; generous free tier (10k series, 50GB logs/traces); no vendor lock-in; OTel-native via Grafana Alloy | More setup and less polished React Native crash/release triage; requires Grafana expertise; dashboards powerful but complex | Reject as sole solution for MVP |
| SigNoz OTel-native | Single backend for traces/logs/metrics; built on OpenTelemetry and ClickHouse; no per-host or per-seat pricing; cloud from $49/month; strong for cost-conscious startups | Younger platform; smaller community; less mature mobile SDK ecosystem; fewer enterprise features | Consider for OTel-first teams prioritizing cost |
| Privacy-first (LuminaLog/Nonym) + Sentry | PII redaction at ingestion edge; GDPR/HIPAA-ready architecture; compliance audit trails; protects against liability from leaked personal data | Additional vendor/complexity; newer platforms with smaller ecosystems; may duplicate Sentry's built-in scrubbing | **Consider** for regulated industries or extreme privacy posture |
| Self-hosted Grafana/Loki/Tempo/Prometheus | Full control and data locality; zero licensing cost for OSS stack; complete data sovereignty | Significant operational burden for small team; requires storage expertise; no managed support | Reject for MVP |
| Console logs only | No setup | No alerting, retention, correlation, crash visibility, or reliable production diagnosis | Reject |
| Firebase Crashlytics only | Good mobile crash reporting; free tier generous | Weak unified web/backend/worker observability; adds Firebase-specific path; limited to mobile | Reject |
| OpenTelemetry only | Portable standard across services; CNCF graduated status validates production readiness | Does not provide a complete product experience for client crash triage/release management by itself; JavaScript logs still Development | Reject as sole solution |

OpenTelemetry provides a JavaScript implementation for Node.js and browser telemetry. As of July 2026, OpenTelemetry achieved CNCF graduated status, validating its production readiness for enterprise use. JavaScript traces and metrics are Stable, while logs remain in Development. This is why OTel is selected primarily for Node API/worker telemetry, while Sentry is the primary frontend/mobile error and crash system. Browser/client instrumentation is maturing but still less complete than server-side instrumentation.[^2]

## Why This Combination Wins

### Sentry is strongest for user-impact failures

Sentry is the fastest way to detect and group:

- JavaScript exceptions in Next.js.
- Native/React Native crashes.
- Unhandled promise rejections.
- Release regressions.
- Stack traces and source-mapped code locations.
- User-impact trends by app version, device/OS, route, API operation, and release.

Expo documents use of Sentry for crash reporting, and `sentry-expo` itself is deprecated in favor of the official Sentry React Native SDK path.[^5][^4]

### OpenTelemetry prevents observability lock-in

The backend and worker need traces/metrics across:

```text
Hono request
  -> authentication
  -> command handler
  -> PostgreSQL transaction
  -> outbox record
  -> pg-boss dispatch
  -> worker job
  -> Google/Stripe/Expo Push/PowerSync call
```

OpenTelemetry provides the standard propagation model and exporter ecosystem to represent that chain without tying application instrumentation to one backend. Node can use automatic instrumentation for many common libraries, but it must be reviewed and configured rather than enabled blindly. With CNCF graduation achieved in May 2026, OTel is now the de facto industry standard for telemetry instrumentation, supported by all major vendors including Datadog, Grafana, New Relic, and Splunk.[^6][^7]

### Structured logs remain the audit trail for operations

Metrics tell the team **how much**; traces show **where time went**; errors show **what failed**; structured logs preserve **the contextual operational event**.

Example safe structured log:

```json
{
  "timestamp": "2026-07-21T23:22:00.000Z",
  "level": "info",
  "service": "api",
  "environment": "production",
  "release": "api-2026.07.21-abc123",
  "event": "command.accepted",
  "request_id": "req_...",
  "trace_id": "…",
  "correlation_id": "cmd_...",
  "actor_kind": "user",
  "actor_ref": "usr_hmac_...",
  "workspace_ref": "ws_hmac_...",
  "command_type": "task.complete",
  "duration_ms": 18
}
```

It includes operational identifiers but no task title, note text, calendar content, token, raw email, or raw UUID unless controlled support policy explicitly permits it.

## Signal Ownership

| Signal | Primary tool | Secondary correlation |
| :-- | :-- | :-- |
| Web JS errors | Sentry Next.js | Request/trace/release ID |
| Mobile JS/native crashes | Sentry React Native | App version, OS, device class, release |
| Hono request errors | Sentry Node + JSON log | Request/trace/correlation ID |
| Worker job errors | Sentry Node + JSON log | Job/outbox/correlation ID |
| API latency | OTel traces/metrics | Logs for sampled slow requests |
| DB query latency/pool pressure | OTel metrics/traces; provider metrics | Safe slow-query metadata |
| Queue depth/oldest-job age | OTel metrics | Structured operational logs |
| Calendar sync health | Custom OTel metrics + Sentry errors | Connection reference, not provider payload |
| PowerSync token failures | OTel/Sentry/logs | User/workspace hash, reason code |
| Push provider receipts/errors | OTel metrics + logs | Device/token hash, not token |
| Search projection lag | OTel metrics | Projection event/job reference |
| User-facing command status | Database/audit/command records | Telemetry is supplementary, not canonical |
| Security/audit events | Audit tables/security logging | Do not rely on Sentry as audit log |

## Telemetry Data Classification

### Explicitly permitted

| Field | Policy |
| :-- | :-- |
| Service/app name | Allowed |
| Environment | Allowed |
| Release/version/git SHA | Allowed |
| Route template, not raw path where IDs may be sensitive | Allowed |
| HTTP method/status | Allowed |
| Latency/counts/queue depth | Allowed |
| Error class/code | Allowed |
| Provider name and normalized safe error code | Allowed |
| Hashed/pseudonymous actor/workspace/device/connection reference | Allowed with key rotation policy |
| Command type | Allowed |
| Entity type | Allowed |
| File size/type bucket | Allowed |
| Search query length bucket / zero-result boolean | Allowed |
| OS/app version/device class | Allowed |
| Correlation/request/trace/job/outbox IDs | Allowed, controlled retention |

### Prohibited by default

| Field | Reason |
| :-- | :-- |
| Authorization, cookie, Clerk JWT, PowerSync JWT | Secrets |
| OAuth access/refresh tokens, Google auth codes | Secrets |
| Stripe signatures, webhook payloads, payment data | Security/financial sensitivity |
| Database URLs/credentials/API keys | Secrets |
| Task/project/note titles or descriptions | Personal content |
| Calendar title, description, location, attendees, conferencing links | Highly sensitive personal/work data |
| Note body, attachment content, original filename | Sensitive content |
| Search query text | Reveals user intent/content |
| Full request/response body | Unbounded sensitive data |
| Signed upload/download URL | Bearer credential |
| IP address, precise location, advertising identifiers | Privacy-sensitive; collect only under explicit policy |
| Full email/name | PII; use an opaque internal support reference instead |
| Raw SQL with bound values | Can leak personal data |

### Redaction must happen before export

Do not rely on a dashboard vendor’s UI-level masking after raw values leave the application. Apply redaction in:

```text
Hono logging middleware
API-client request/response instrumentation
Sentry beforeSend / event processors
OTel span attribute helpers
Worker job wrapper
Webhook parser
Database error mapper
Client error breadcrumbs
```

Implement an allowlist-based telemetry schema rather than trying to redact every possible sensitive field after arbitrary objects are logged.

## Identity and Correlation

### IDs

Use these identifiers deliberately:


| Identifier | Scope | Purpose |
| :-- | :-- | :-- |
| `request_id` | One API request | Support reference and log correlation |
| `trace_id` | Cross-service request/job chain | OTel distributed tracing |
| `span_id` | One operation | Trace detail |
| `correlation_id` | User command/business workflow | Links API, outbox, job, provider operation |
| `causation_id` | Triggering prior event/job | Event lineage |
| `command_id` | Idempotent user action | Canonical command/audit relationship |
| `outbox_event_id` | Durable side-effect intent | Worker dispatch correlation |
| `job_id` | Queue execution | Retry and worker diagnostics |
| `release` | Deployable version | Regression/release analysis |
| `actor_ref` | Pseudonymous actor reference | Aggregation without raw user identity |
| `workspace_ref` | Pseudonymous workspace reference | Scope diagnosis without exposing ID publicly |

Propagate W3C trace context through HTTP requests and worker job payloads. Store correlation/causation IDs in outbox/job records. Do not put trace headers into user-visible URLs or notification payloads.

### Pseudonymous references

Derive telemetry references using an environment-specific HMAC key:

```text
actor_ref = HMAC-SHA-256(telemetry_key, app_user_id)
workspace_ref = HMAC-SHA-256(telemetry_key, workspace_id)
```

This supports grouping while reducing accidental exposure of raw database identifiers. Rotate carefully: preserve old-key lookup only for the defined retention/support window.

The HMAC key is a secret and must never be included in client code. On client telemetry, prefer Sentry’s user ID set to an opaque app-generated installation/user reference only if the privacy policy and deletion path support it.

## Sentry Configuration

### Web

Use the official Sentry Next.js SDK:

- Capture unhandled client and server exceptions.
- Upload source maps during CI/build; do not publish source maps publicly.
- Set `release` and `environment` on every event.
- Tag only safe context: route template, renderer, app version, coarse feature flag state.
- Apply a `beforeSend` scrubber and disable request body capture.
- Disable session replay by default.
- Use sampled performance tracing only after privacy review and route filtering.
- Suppress expected user errors such as ordinary validation failures, 401 after explicit sign-out, and controlled offline failures.

Sentry provides a Next.js-specific platform integration.[^3]

### Expo/React Native

Use `@sentry/react-native` with Expo development/preview/production builds:

- Initialize before app UI mounts.
- Upload source maps for matching EAS build/runtime release identifiers.
- Capture fatal JS/native crashes and unhandled errors.
- Record safe tags: platform, app version, runtime version, build channel, route name, replica connection state category.
- Do not attach PowerSync SQL, task data, notification payload, deep-link query values, Clerk tokens, or local database paths containing user identity.
- Disable session replay unless an explicit consent and masking review approves it.
- Use a privacy-safe user context that can be removed on sign-out/deletion.

Expo’s Sentry guide covers installation/configuration for crash reporting, and the former `sentry-expo` package is deprecated.[^4][^5]

### Backend and worker

Use Sentry Node SDK for unhandled application exceptions and normalized fatal provider/job failures:

- Capture errors at Hono top-level middleware after mapping safe error response.
- Capture worker job final failures, not every retry as a new ungrouped issue.
- Tag service, job type, queue, retry attempt bucket, provider, normalized error code, release, environment.
- Do not attach raw request bodies, SQL parameters, provider response bodies, job payloads, database records, or secrets.
- Mark expected domain validation/authorization outcomes as handled/non-error metrics/logs rather than Sentry exceptions.
- Configure sampling/quotas to prevent outage storms from overwhelming budget and signal quality.


## OpenTelemetry Design

### Node API and worker only at MVP

Instrument:

```text
apps/backend:
  Incoming Hono HTTP requests
  Outgoing HTTP calls to Clerk, Google, Stripe, Expo, PowerSync, storage
  PostgreSQL/Drizzle/postgres.js operations where supported
  Command handler spans
  Transaction spans
  Outbox insertion
  Response status/error classification

apps/worker:
  Worker polling/claiming
  Each job execution
  Outbox dispatch
  Provider calls
  Scheduling delay and retry reason
  Planning projection/indexing work
  Notification delivery and receipt processing
```

OpenTelemetry’s Node SDK and automatic instrumentation can capture common library telemetry; auto-instrumentation is loaded early through Node startup configuration.  Start with minimal approved instrumentation, then add manual spans around the business-critical operations above.[^8][^7]

### Resource attributes

Every backend/worker signal includes:

```text
service.name:
  lifeos-api | lifeos-worker

service.namespace:
  lifeos

deployment.environment:
  development | preview | production

service.version:
  release identifier / git SHA

cloud.region:
  hosting region where available
```

OpenTelemetry resource attributes associate environment/application details with telemetry signals.[^9]

### Span attribute policy

Allowed:

```text
http.request.method
http.route                 # templated, not raw parameterized URL
http.response.status_code
db.system
db.operation                # normalized
rpc.service / rpc.method
job.name
job.queue
job.attempt
provider.name
error.type
error.code
workspace_ref
actor_ref
command.type
outbox.event_type
```

Prohibited:

```text
http.request.header.authorization
http.request.body
http.response.body
db.statement with values
db.query parameters
full URL query string
task/note/calendar text
raw user ID/email
token/provider payload
storage signed URL
```


### Sampling

Use head sampling initially with an explicit policy:


| Traffic type | Initial sampling |
| :-- | --: |
| Errors and final job failures | 100 percent, redacted |
| Slow requests/jobs over threshold | 100 percent, redacted |
| Command writes | 10–25 percent, adjusted by volume |
| Normal reads | 1–5 percent |
| Health checks | 0 percent |
| High-frequency polling/queue loops | 0–1 percent |
| Security-sensitive flows | Sample safe metadata only; never content |

Use tail-based sampling later if the telemetry backend/collector supports it and the operational benefit justifies complexity. Sampling decisions must not make error coverage dependent on random chance.

## Metrics

### Golden signals

Track:

```text
Request rate
Request error rate
Request latency p50/p95/p99
Worker job throughput
Job failure/retry/dead-letter rate
Queue depth and oldest job age
Database connection pool saturation
Database query latency/error rate
Dependency call rate/latency/error rate
Resource CPU/memory/restarts from host platform
```


### Product-critical technical metrics

| Domain | Metrics |
| :-- | :-- |
| Commands | Accepted/rejected/idempotent replay count by command type and normalized reason |
| PowerSync | Token issuance rate/failure, token refresh failure, sync connection health category |
| Outbox | Pending count, oldest-undispatched age, dispatch success/failure |
| Planning | Projection lag, rebuild duration, coalescing rate, failed recomputes |
| Calendar | Sync latency, webhook rate, token-refresh failures, rate limits, connection-degraded count |
| Notifications | Scheduled/delivered-provider-accepted/rejected/skipped count, lateness, invalid tokens |
| Storage | Upload initiation/completion/scan latency/failure/orphan count; size/type buckets |
| Search | Projection lag, query latency, zero-result rate, index job failure |
| Authentication | Auth verification failure class, membership-resolution failure, rate-limited attempts |
| Realtime | Subscription/auth failure, invalidation events emitted, reconnect rate |

Metrics must use bounded-cardinality labels. Do **not** label metrics with user ID, workspace ID, task ID, raw URL, search query, device ID, or exception message.

## Logging Design

### Log levels

| Level | Use |
| :-- | :-- |
| `debug` | Local/development diagnostics only; disabled in production by default |
| `info` | Lifecycle and expected significant operations: request completion, command accepted, job success |
| `warn` | Recoverable/unusual condition: retry, provider throttle, stale integration, slow request |
| `error` | Failed operation needing review: final job failure, unhandled exception, unexpected dependency failure |
| `fatal` | Process cannot continue safely: unrecoverable startup/configuration error |

Do not log every normal local query, PowerSync update, HTTP request body, route parameter, or client render. High-volume logs cost money and create privacy risk without necessarily adding diagnostic value.

### Standard event names

```text
http.request.completed
auth.token_verified
auth.membership_denied
command.received
command.accepted
command.rejected
outbox.created
outbox.dispatched
job.started
job.retry_scheduled
job.succeeded
job.failed
calendar.sync.started
calendar.sync.completed
calendar.sync.degraded
notification.send.accepted
notification.send.rejected
storage.upload.initiated
storage.scan.completed
search.query.completed
realtime.event.emitted
security.webhook.rejected
```

Use stable, documented event names. Avoid logs like `"something went wrong"` without structured fields.

### Logging libraries

Use a fast structured logger such as Pino in Node services. It should emit JSON to stdout; the container platform or collector handles transport. Do not make outbound synchronous HTTP log calls on every request.

Better Stack can ingest structured log context, including properties attached to log records.  It is a reasonable later hosted log destination, but the application must remain vendor-neutral by emitting standard JSON to stdout.[^10]

## Alerts and SLOs

### Initial service-level objectives

| Capability | Initial target |
| :-- | :-- |
| Hono API availability | 99.9 percent monthly, excluding scheduled maintenance |
| API command acceptance p95 | Under 500 ms, excluding provider-dependent async work |
| Outbox dispatch freshness | 99 percent under 60 seconds |
| Critical worker job start delay | 99 percent under 2 minutes |
| Planning projection freshness | 99 percent under 10 seconds in normal operation |
| Calendar webhook processing | 99 percent acknowledged quickly, durable follow-up queued |
| Search projection freshness | 99 percent under 10 seconds |
| Notification job lateness | Measure first; establish target after platform baseline |
| Mobile crash-free sessions | Establish beta baseline, then set target |

### Alert only on actionable conditions

Page/urgent alert:

- API unavailable or elevated 5xx rate.
- Worker has no heartbeat or critical queue cannot progress.
- Oldest critical outbox event exceeds threshold.
- Account deletion, billing, security webhook, or calendar failure dead-letters above threshold.
- Database unavailable/pool exhausted.
- Secrets/configuration failure at deployment.

Ticket/business-hours alert:

- Search projection lag rising.
- Notification invalid-token rate above threshold.
- Calendar provider throttling/authorization trend.
- Increased crash rate for a release.
- Repeated storage scan failure.
- High permission denial rate after notification UX change.

Do not page for an individual user validation error, one offline request, or a noncritical job retry.

## Dashboards

Create a small initial dashboard set:

1. **API health:** request rate, p95/p99 latency, errors, dependency failures, releases.
2. **Worker/outbox:** queue depth, oldest job/outbox age, retries, dead letters, worker health.
3. **Life-critical flows:** command acceptance, Today projection freshness, calendar sync health, notification pipeline.
4. **Client quality:** web/mobile errors by release, crash-free sessions, source-map health.
5. **Security/identity:** auth failure classes, rate limits, webhook verification failures, membership denials.
6. **Data operations:** storage processing, search index lag, export/deletion workflow state.

Dashboards should link via correlation IDs to safe logs/traces/Sentry issues, but never expose raw personal content.

## Release and Source-Map Policy

Every deploy/build must set a consistent release identifier:

```text
Web:
  web-<semver-or-date>-<git-sha>

API:
  api-<date>-<git-sha>

Worker:
  worker-<date>-<git-sha>

Mobile:
  ios/android-<store-version>-<build-number>-<git-sha>
```

CI must:

1. Build the artifact.
2. Upload private source maps to Sentry for the matching release.
3. Associate deployment environment/version.
4. Verify source maps are not publicly served.
5. Mark release/deploy only after artifact promotion.
6. Support rollback/redeploy with a new or correctly reused release mapping.

Do not send unminified production source maps to a public CDN. Source maps can reveal implementation details even if they do not contain user data.

## Retention and Deletion

Set explicit retention before production telemetry begins:


| Data type | Initial retention policy |
| :-- | :-- |
| Production error events | 30 days, extend only with justified need |
| Performance traces | 7–14 days sampled |
| Structured application logs | 14–30 days |
| Security/audit logs | Separate policy, longer only if legally/operationally justified |
| Metrics | 13 months aggregated; short high-resolution retention |
| Mobile/web crash diagnostics | 30–90 days, privacy reviewed |
| Session replay | Disabled; no retention |
| Debug logs | Development only / short retention |

The privacy policy and data-processing agreements must identify telemetry processors, categories, retention, and deletion approach. Because third-party telemetry systems may retain pseudonymous user references, account deletion workflows must send deletion requests or otherwise remove/link-disable user telemetry where provider capabilities and legal policy require.

## Testing

### Redaction tests

Maintain automated tests that send representative sensitive values through every telemetry path and assert none appear in exported/logged payloads:

```text
Authorization header
Clerk/PowerSync JWT
OAuth code/access/refresh token
Task/note/calendar text
Search query
Signed URL
Webhook signature/payload
Email/name
Database URL
Attachment filename/content
```


### Operational tests

| Scenario | Required outcome |
| :-- | :-- |
| API exception | Sentry issue has stack/release/request ID but no request body/token |
| Mobile crash | Correct release/source map/platform tags; no local data dump |
| Worker final failure | Sentry/log/trace/job record correlate safely |
| Slow command | Trace includes safe command/DB/outbox spans |
| Calendar provider outage | Metrics/alerts show provider failure and retries; no raw response logged |
| Outbox backlog | Dashboard/alert detects age/depth before user impact becomes broad |
| Sign-out/account deletion | User context cleared; deletion path handles telemetry identity |
| New release regression | Error rate grouped by release; rollback evidence visible |
| Telemetry backend outage | Application continues; bounded buffering/drop policy prevents resource exhaustion |
| High-cardinality input | Metrics do not create user/query/ID label explosion |

## Trade-Offs

| Choice | Gain | Cost |
| :-- | :-- | :-- |
| Sentry + OTel + JSON logs | Right tool for errors, traces/metrics, and operational events; OTel CNCF graduation validates long-term viability | More integration than a single vendor tool; OTel JavaScript logs still in Development |
| Sentry Cloud | Fast crash/release diagnosis across web/mobile/backend; widest SDK ecosystem (100+ platforms) | Third-party processor and cost/data-governance review; event-based pricing unpredictable at scale |
| GlitchTip (self-hosted) alternative | Sentry-compatible drop-in; open-source MIT-licensed; data sovereignty; $15/month for 100k events | Less mature ecosystem; smaller community; self-hosting ops burden; fewer integrations |
| Better Stack alternative | ~10x cheaper than Datadog; unified logs/metrics/traces/uptime/incidents; predictable volume pricing | Younger platform; less mature mobile crash triage; smaller integration ecosystem |
| OTel standard | Vendor portability and end-to-end trace model; CNCF graduated status validates enterprise readiness | Exporter/backend/collector configuration; JavaScript browser instrumentation still maturing |
| Node-focused OTel first | Mature server/worker instrumentation; traces/metrics Stable in JavaScript | Less complete browser/mobile OTel scope; logs still Development |
| Structured stdout logs | Portable, efficient, host-friendly; avoids vendor-specific log agents | Requires host/collector selection and schema governance |
| Allowlist telemetry | Strong privacy posture; GDPR/HIPAA-aligned by design | Less raw detail during incident triage; requires disciplined redaction testing |
| Privacy-first layer (LuminaLog/Nonym) | PII redaction at ingestion edge; compliance audit trails; protects against liability | Additional vendor/complexity; newer platforms with smaller ecosystems |
| Sampling | Cost and volume control; prevents runaway bills | Some ordinary traces absent; must ensure error coverage not dependent on sampling |
| No replay by default | Avoids visual/content capture risk; privacy-first by default | Less client UX reproduction detail; harder to debug complex user flows |

## Final Decision

Lock the following observability architecture:

```text
Error tracking:                Sentry Cloud (primary recommendation)
Alternative for cost control:  GlitchTip (self-hosted or hosted) or Better Stack all-in-one
Web/mobile SDKs:               Sentry Next.js and @sentry/react-native
Backend/worker errors:         Sentry Node SDK with normalized, redacted error capture
Traces and metrics:            OpenTelemetry over OTLP, primarily for Node API and worker
Telemetry backend:             Grafana Cloud or another OTLP-compatible managed service;
                               keep exporter configuration vendor-neutral
Application logs:              Pino-style structured JSON to stdout
Log destination:               Hosting provider initially; Better Stack/Loki optional later
Correlation:                   request_id, W3C trace_id, correlation_id, command_id,
                               outbox_event_id, job_id, release
Privacy:                       Allowlist fields, pre-export redaction, no bodies/tokens/content/query text,
                               session replay disabled by default
Privacy enhancement option:    LuminaLog or Nonym for PII redaction at ingestion edge if regulated
Metrics:                       Bounded-cardinality labels only
Alerts:                        Actionable API, worker/outbox, queue, provider, and release-regression conditions
Retention:                     Short, explicit, environment-specific policies with deletion handling
Testing:                       Automated secret/PII redaction tests plus failure, backlog, and release observability tests
```

### 2026 Update Notes

- **OpenTelemetry CNCF Graduation**: OTel achieved CNCF graduated status in May 2026, validating production readiness for enterprise use. JavaScript traces and metrics are Stable; logs remain in Development.
- **Cost-Effective Alternatives**: Better Stack (~10x cheaper than Datadog, starting $29/month) and GlitchTip ($15/month for 100k events) provide strong alternatives for cost-conscious teams.
- **Privacy-First Options**: New platforms like LuminaLog and Nonym offer PII redaction at ingestion edge, providing GDPR/HIPAA-ready architecture for regulated industries.
- **Pricing Reality**: Datadog's multi-dimensional pricing ($15/host infra + $31/host APM + log indexing) routinely produces $5K-20K/month bills for mid-size teams; defer until enterprise scale.
- **Mobile Error Tracking**: Sentry remains the brand reference with widest SDK coverage, but Bugsnag excels for mobile-first teams with stability score dashboards.

The next category in dependency order is **Testing Strategy \& Quality Assurance**.
<span style="display:none">[^11][^12][^13][^14][^15]</span>

<div align="center">⁂</div>

[^1]: https://docs.sentry.io/platforms/react-native/

[^2]: https://opentelemetry.io/docs/languages/js/

[^3]: https://docs.sentry.io/platforms/javascript/guides/nextjs/

[^4]: https://docs.expo.dev/guides/using-sentry/

[^5]: https://github.com/expo/sentry-expo/blob/main/README.md

[^6]: https://opentelemetry.io/docs/languages/js/libraries/

[^7]: https://opentelemetry.io/docs/zero-code/js/

[^8]: https://opentelemetry.io/docs/languages/js/getting-started/nodejs/

[^9]: https://opentelemetry.io/docs/languages/js/resources/

[^10]: https://betterstack.com/docs/logs/net-c/

[^11]: https://opentelemetry.io/docs/demo/services/frontend/

[^12]: https://github.com/getsentry/sentry-react-native

[^13]: https://grafana.com/docs/opentelemetry/instrument/node/

[^14]: https://opentelemetry.io/docs/languages/js/getting-started/

[^15]: https://opentelemetry.io/docs/languages/

