<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

## Category 10 — Authorization \& Row-Level Security

**Recommendation: use a layered authorization model: PostgreSQL Row-Level
Security as the database enforcement layer; workspace membership as the product
authorization source of truth; Hono command handlers as the business-policy
enforcement layer; and Clerk only as the authenticated identity issuer.** RLS
must default to deny, be enabled on every user/workspace-scoped table from its
first migration, and be tested as a primary security boundary rather than
treated as optional filtering.[^1][^2]

This is the correct model for Life OS because it protects data even if a route
omits a `workspace_id` filter, a direct Supabase/PowerSync read path is
introduced, or a future integration uses a different API surface. PostgreSQL RLS
restricts which rows a role may read or change, while Supabase positions it as
defense in depth for data accessed through external tooling.[^2][^1]

## Authorization Model

Authorization must be resolved in this order:

```text
1. Authenticate identity
   Clerk verifies the user and issues a signed session token.

2. Map external identity to product identity
   Clerk `sub` -> app_users.clerk_user_id -> app_users.id.

3. Resolve product membership
   app_users.id -> workspace_memberships -> workspace_id and membership role.

4. Enforce database eligibility
   PostgreSQL RLS permits only rows associated with an active membership.

5. Enforce business policy
   Hono command handler checks operation-specific rules:
   ownership, subscription, action state, limits, consent, and invariants.

6. Commit atomic mutation
   Entity update + idempotency record + audit event + outbox event occur in one transaction.
```

No one layer is sufficient alone. A valid Clerk session proves who a user is,
but it does not prove that they may access a workspace, change a task, reconnect
an integration, export data, or invoke a sensitive operation.

## Responsibility Boundaries

| Layer                   | What it decides                                                       | What it must not decide                                             |
| :---------------------- | :-------------------------------------------------------------------- | :------------------------------------------------------------------ |
| Clerk                   | Identity, session validity, MFA/session context                       | Product workspace ownership, billing entitlement, task-level policy |
| PostgreSQL RLS          | Whether the current database principal may access a row               | Complex workflow transitions, plan feasibility, product quotas      |
| `workspace_memberships` | Active workspace relationship and product-level role                  | Credential authentication                                           |
| Hono backend            | Command authorization, business invariants, idempotency, audit/outbox | Sole protection against cross-tenant database reads                 |
| PowerSync rules         | Which authorized rows replicate to a device                           | Permission to bypass command validation                             |
| UI                      | Hide irrelevant controls and guide user behavior                      | Security enforcement                                                |

The existing architecture already calls for Clerk authentication, Supabase RLS,
workspace scoping, and a server-side command pipeline. The priority is to make
those controls mutually reinforcing rather than duplicative or
contradictory.[^3][^4]

## Authorization Options

| Option                                                                       | Pros                                                                                                                                                                      | Cons                                                                                                                                                                           | Decision                           |
| :--------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------- |
| **PostgreSQL RLS + backend policy checks**                                   | Database-enforced tenant isolation; protects Supabase Data API, Storage, Realtime, and PowerSync paths; strong defense in depth; supported by current Drizzle RLS helpers | Requires careful policies, testing, indexing, and privilege design; leakproof/index interactions need attention at scale                                                       | **Select**                         |
| Backend-only authorization filters                                           | Simple route-level implementation; all policy visible in TypeScript                                                                                                       | One missing predicate can expose another user’s data; direct DB/sync paths become risky                                                                                        | Reject as sole control             |
| RLS only                                                                     | Very strong row-scoping layer                                                                                                                                             | Cannot express all workflow, subscription, rate, consent, and cross-entity business rules cleanly                                                                              | Reject as sole control             |
| Clerk Organizations as authorization source                                  | Convenient organization/role claims; Supabase RLS can read `o.id`/`o.rol` from Clerk JWTs                                                                                 | Product workspace needs lifecycle, billing, ownership transfer, audit, deletion, and sharing semantics beyond identity-provider organization claims; stale org claims possible | Reject for V1                      |
| JWT workspace claims                                                         | Fast policy evaluation without membership join                                                                                                                            | Claims become stale after membership changes; tokens should not carry broad authorization state                                                                                | Reject as primary source           |
| Application-managed ACL table only                                           | Flexible per-entity sharing model                                                                                                                                         | Adds query complexity and does not replace tenant boundary/RLS protections                                                                                                     | Defer until entity sharing exists  |
| External policy engine (Oso, Permit.io, SpiceDB/OpenFGA, OPA, Cerbos, Cedar) | Powerful centralized policies with RBAC/ABAC/ReBAC, audit trails, and future multi-service consistency                                                                    | New service/infrastructure, policy language, operations, latency, and little MVP benefit for a single-user personal workspace                                                  | Reject for MVP                     |
| Supabase Auth-native `auth.uid()` model                                      | Simplest RLS integration if Supabase Auth is provider; `auth.uid()` returns UUID directly                                                                                 | Current auth choice is Clerk; identity mapping differs; would require migrating identity provider                                                                              | Fallback only if Clerk proof fails |

As of 2025, Clerk is an official Supabase third-party authentication provider.
Supabase validates Clerk session tokens via the published JWKS endpoint, and the
Clerk integration automatically injects the `role: authenticated` claim required
by Supabase. RLS policies should therefore read the Clerk user ID with
`auth.jwt() ->> 'sub'`. The legacy Clerk JWT template that signed tokens with
the Supabase project secret is deprecated and should not be used.[^20] This
compatibility applies to Supabase Data API, Storage, and Realtime access;
PowerSync still requires its own JWT verification path (see below).
Compatibility does not make Clerk claims the product authorization
model.[^5][^19]

## Product Authorization Model

### Use workspaces and memberships

Create these tables before any user-generated domain data:

```text
app_users
workspaces
workspace_memberships
```

Minimum membership shape:

```text
workspace_memberships
  id
  workspace_id
  user_id
  role
  status
  created_at
  updated_at
  revoked_at
```

Recommended V1 enums:

```text
workspace role:
  owner
  member

membership status:
  active
  suspended
  revoked
```

For V1, every person receives one personal workspace and one active `owner`
membership. The schema must nevertheless support multiple memberships from the
beginning so Life OS can later add household sharing, partners, assistants,
coaches, or team plans without re-keying every life entity.

### Do not use Clerk Organizations as workspace truth

Clerk Organization claims can be used as supplementary signals later, and
Supabase demonstrates policies that inspect `org_id` and organization roles in
Clerk JWTs. However, Life OS workspaces must remain in PostgreSQL because they
eventually need product-specific ownership transfer, plan eligibility,
subscription responsibility, consent, deletion/export policy, audit history, and
entity-sharing behavior.[^5]

**Rule:** Clerk identity establishes the caller; PostgreSQL membership
establishes their workspace authority.

## Database Role Design

Use distinct database access identities. Do not give the ordinary application
backend a superuser-like role.

| Database identity   | Used by                                                        | RLS expectation                                                 | Permissions                             |
| :------------------ | :------------------------------------------------------------- | :-------------------------------------------------------------- | :-------------------------------------- |
| `anon`              | Unauthenticated Supabase client access                         | No user data visible                                            | No access to personal tables            |
| `authenticated`     | Clerk-authenticated Supabase client or RLS-scoped user queries | RLS enforced                                                    | Minimal table/view permissions          |
| `app_user`          | Hono server processing a user command                          | RLS enforced where possible                                     | Restricted user-data operations         |
| `job_worker`        | Outbox, planning, notifications, calendar synchronization      | RLS bypass only if necessary, with explicit workspace filtering | Narrowly scoped operational permissions |
| `migration_owner`   | CI migration job only                                          | May require DDL ownership                                       | No normal app runtime use               |
| `powersync_service` | PowerSync source/replication service                           | Dedicated and least privilege                                   | Only replication-required access        |
| `break_glass_admin` | Emergency incident procedure                                   | Explicitly privileged                                           | Time-limited, audited use only          |

PostgreSQL superusers and roles granted `BYPASSRLS` bypass row security, and
table owners normally bypass it as well unless `FORCE ROW LEVEL SECURITY` is
applied. Therefore, no normal backend, worker, or PowerSync runtime should
connect as the migration owner, table owner, Supabase service role, superuser,
or another broadly bypassing identity.[^2]

## RLS Policy Strategy

### Default deny

For every table containing user- or workspace-scoped data:

```sql
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks FORCE ROW LEVEL SECURITY;
```

Then add explicit policies. When RLS is enabled but no applicable policy exists,
PostgreSQL uses default deny behavior for non-bypassing roles.[^2]

`FORCE ROW LEVEL SECURITY` should be applied deliberately to user-data tables so
accidental table-owner connections do not silently bypass policy. It is not a
substitute for using a separate non-owner runtime role; it is a second
safeguard.

### Membership predicate

The normal policy condition should check active workspace membership, not
client-supplied workspace IDs:

```sql
CREATE POLICY tasks_workspace_member_select
ON public.tasks
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.workspace_memberships AS wm
    JOIN public.app_users AS u
      ON u.id = wm.user_id
    WHERE wm.workspace_id = tasks.workspace_id
      AND wm.status = 'active'
      AND u.clerk_user_id = (SELECT auth.jwt() ->> 'sub')
  )
);
```

This is illustrative only. The final implementation should centralize the
identity-resolution predicate into reviewed helper functions or a restricted
membership view so every policy does not hand-roll slightly different logic.

### Separate command behavior by operation

Do not write a single broad `FOR ALL` policy for every table by default. Use
distinct policies for reads and mutations where the rules differ:

| Operation | Policy objective                                                                                                |
| :-------- | :-------------------------------------------------------------------------------------------------------------- |
| `SELECT`  | Active member may read workspace rows                                                                           |
| `INSERT`  | Active member may create a row only in a workspace they belong to; immutable ownership/audit fields constrained |
| `UPDATE`  | Active member may update permitted rows but cannot move them to a different workspace or alter protected fields |
| `DELETE`  | Usually restricted; prefer soft deletion for user-facing life data where audit/undo needs exist                 |
| `UPSERT`  | Test both insert and update arms independently; PostgreSQL RLS evaluates both relevant conditions               |

RLS `USING` expressions determine which existing rows are visible/eligible,
while `WITH CHECK` constrains rows created or changed. Both are required for
safe write policies.[^2]

## RLS Helper Functions

Complex membership checks repeated across every table can become verbose and
slow. Use narrowly designed `SECURITY DEFINER` helper functions only after
simpler policies become unwieldy.

In Drizzle, enable RLS on a table with `pgTable.withRLS()` (the older
`.enableRLS()` API is deprecated) and define policies with `pgPolicy` in the
table callback. For Supabase, import the predefined `authenticatedRole` from
`drizzle-orm/supabase` so that Drizzle Kit treats platform roles as existing.
The deployed SQL remains the real security artifact, and generated migrations
must be reviewed.

Recommended shape:

```sql
CREATE SCHEMA IF NOT EXISTS private;

CREATE FUNCTION private.is_active_workspace_member(target_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_memberships wm
    JOIN public.app_users u ON u.id = wm.user_id
    WHERE wm.workspace_id = target_workspace_id
      AND wm.status = 'active'
      AND u.clerk_user_id = (SELECT auth.jwt() ->> 'sub')
  );
$$;
```

Then:

```sql
CREATE POLICY tasks_workspace_member_select
ON public.tasks
FOR SELECT
TO authenticated
USING ((SELECT private.is_active_workspace_member(workspace_id)));
```

### Function safety rules

- Place helpers in a non-exposed schema such as `private`.
- Set `search_path = ''` or an explicit safe schema path.
- Schema-qualify all referenced objects.
- Use `STABLE` only if semantically valid.
- Keep functions small, single-purpose, and independently tested.
- Revoke public execution and grant only to intended database roles.
- Never accept arbitrary SQL, arbitrary table names, arbitrary column names, or
  unsanitized identifiers.
- Never treat `SECURITY DEFINER` as a shortcut for bypassing membership
  verification.

A `SECURITY DEFINER` function runs with its owner’s privileges and can bypass
RLS on referenced tables, which makes it useful for controlled internal
membership checks but dangerous if exposed or over-broad. Supabase’s RLS
guidance recommends a private schema, explicit caller identity checks,
controlled execution grants, and indexed lookup columns.[^6]

## Claim Policy

### Minimal Clerk claims

Use Clerk claims only for identity/session information needed at the RLS edge:

```text
sub       Immutable Clerk user ID
role      authenticated
sid       Session ID for correlation/audit
iss       Clerk issuer
aud       Expected audience where configured
exp/iat   Session validity
fva       Optional recent-MFA signal for narrowly defined sensitive database reads
```

Supabase’s official Clerk integration automatically adds the
`role: authenticated` claim to session tokens, and policies inspect Clerk claims
through `auth.jwt() ->> 'sub'`. Do not rely on the `o` (active organization)
claim as a workspace source of truth; use it only as an identity signal while
PostgreSQL membership remains authoritative.[^5][^19]

### Prohibited authorization claims

Do **not** put these into a normal user JWT as the source of truth:

```text
workspace_id
all workspace memberships
billing plan
paid entitlement
Google Calendar OAuth state
Google account identifiers
health or financial attributes
authorization grants
long-lived integration permissions
```

Memberships can be revoked or changed while a JWT remains valid. Use database
membership checks for normal authorization and keep token contents minimal.

## Server-Side Command Authorization

RLS protects row access; it does not replace business policy. The backend should
enforce domain actions through typed command handlers.

Example:

```text
CompleteTaskCommand
  -> authenticated identity
  -> resolve task through RLS-scoped query
  -> verify task is completable
  -> verify task is not deleted/archived
  -> apply recurrence/occurrence semantics
  -> persist change, audit record, and outbox event atomically
```

Examples of policies that remain backend responsibilities:

| Action                      | Why RLS alone is insufficient                                         |
| :-------------------------- | :-------------------------------------------------------------------- |
| Complete/defer/split a task | Requires state transition and planning semantics                      |
| Create a native time block  | Requires availability/conflict rules                                  |
| Connect Google Calendar     | Requires OAuth state validation and encrypted credential storage      |
| Trigger a calendar write    | Requires consent, provider limits, idempotency, and conflict handling |
| Export account data         | Requires recent authentication, rate limits, asynchronous packaging   |
| Delete account/workspace    | Requires retention, cancellation, and multi-system cleanup workflow   |
| Change membership role      | Requires ownership and anti-lockout rules                             |
| Apply subscription feature  | Requires server-side billing state and entitlement checks             |
| Recompute daily plan        | Requires bounded workload and trusted worker identity                 |

**Rule:** User-facing mutations must use command endpoints or a server-validated
sync command processor. Do not expose generic direct table writes to mobile/web
merely because RLS permits them.

## PowerSync Authorization

This is the most sensitive integration point. The selected offline architecture
must ensure that PowerSync receives only rows the current authenticated user may
replicate.

### Required model

```text
Clerk session token
  -> Hono token-exchange endpoint validates identity and resolves membership
  -> short-lived PowerSync JWT minted by the backend (sub = Clerk user ID, plus resolved app_user_id/workspace_id claims)
  -> PowerSync Sync Streams (edition 3) parameterized by the authenticated identity
  -> only that user’s authorized rows replicate
```

Use PowerSync Sync Streams (the current recommended format) or legacy Sync Rules
to filter rows downloaded to each device. Sync Streams do not apply to uploaded
data; writes from the mobile client must still pass Postgres RLS and the Hono
command pipeline. The PowerSync service account should not simply replicate all
workspace tables and trust the client to filter locally.

Example stream (schema names illustrative):

```yaml
config:
  edition: 3
streams:
  life_graph:
    auto_subscribe: true
    query: |
      SELECT t.*
      FROM tasks t
      WHERE t.workspace_id IN (
        SELECT wm.workspace_id
        FROM workspace_memberships wm
        JOIN app_users u ON u.id = wm.user_id
        WHERE u.clerk_user_id = auth.user_id()
          AND wm.status = 'active'
      )
```

For V1, a backend token exchange is the cleanest path because PowerSync does not
natively list Clerk as a direct JWKS provider. The backend mints a short-lived
PowerSync JWT after validating the Clerk session and resolving the active
workspace membership. That JWT can carry a `workspace_id` claim under
`auth.parameter('workspace_id')` only because it is freshly minted server-side;
it is not a stale user-facing claim.

### Mandatory PoC tests

- User A’s device receives only workspace A records.
- User B’s device receives only workspace B records.
- A token from User A cannot request User B’s sync identity.
- The Hono token-exchange endpoint rejects invalid, expired, or revoked Clerk
  tokens.
- Membership revocation stops future replication promptly.
- Logout clears local replica and prevents offline data from remaining readable
  by the next signed-in user.
- Account switching on one device never leaks old replica rows.
- An offline queued command from a revoked member is rejected server-side.
- Row filtering is validated for every replicated entity, including
  attachments/metadata, entity links, reminders, and derived plan projections.
- A generic link cannot point from an authorized entity to a replicated target
  the user is not permitted to receive.

The underlying Supabase/Clerk configuration can use Clerk session tokens for
RLS-protected database, Storage, and Realtime access. The separate PowerSync
path must be proven independently; an RLS-safe direct Supabase request does not
automatically prove a sync replication configuration is safe.[^21][^22][^23]

## Storage Authorization

Attachments and exports require the same tenant model.

- Every Storage object path starts with a workspace and entity identifier, for
  example: `workspace/{workspace_id}/attachments/{attachment_id}`.
- Maintain an `attachments` metadata table containing `workspace_id`, owner,
  object key, content type, byte size, encryption metadata, and lifecycle
  status.
- Storage read/write policies validate membership through the metadata table or
  an equally strict path-to-membership rule.
- Do not allow a user to choose an arbitrary storage path.
- Issue signed URLs only after backend authorization, with short TTLs and
  content-disposition controls.
- Treat attachment thumbnails and OCR/search derivatives as equally sensitive.
- Account export objects must use one-time/short-lived links and automatic
  expiry.

Supabase’s current Clerk integration supports using RLS policies to protect
database rows, Storage objects, and Realtime channels with Clerk-issued session
tokens.[^5]

## Tables by Sensitivity

| Table category                                                       | RLS approach                                                               | Direct user access                                                   |
| :------------------------------------------------------------------- | :------------------------------------------------------------------------- | :------------------------------------------------------------------- |
| Life Graph entities: tasks, projects, goals, notes, contacts, events | Active workspace membership                                                | Read allowed where product surface requires; writes through commands |
| Entity links                                                         | Require active membership to both source and target within same workspace  | No generic direct client write                                       |
| Planning projections                                                 | Active membership; read-only to client                                     | No direct writes                                                     |
| Audit logs                                                           | Active owner/member access only to carefully selected user-visible history | Server/worker append only                                            |
| Outbox events                                                        | No client access                                                           | Backend/job worker only                                              |
| Idempotency records                                                  | No client access                                                           | Backend only                                                         |
| OAuth credentials                                                    | No client access, no ordinary RLS user reads                               | Integration worker only                                              |
| Calendar provider payloads                                           | No client access unless sanitized projection exists                        | Backend/integration worker only                                      |
| Workspace memberships                                                | Active user may read their own membership and permitted workspace summary  | Membership changes only through protected commands                   |
| Billing/entitlement tables                                           | No direct client access                                                    | Backend/webhook worker only                                          |
| Attachments metadata                                                 | Active membership                                                          | Create/delete through command or controlled upload flow              |
| Push tokens                                                          | User can register/revoke own device token                                  | Backend sends only                                                   |
| Operational logs/metrics                                             | No client access                                                           | Internal systems only                                                |

## Privileged Operations

The backend and workers occasionally need to operate across user data:
processing an outbox event, refreshing calendar data, sending reminders,
backfilling projections, or executing deletion.

### Rules for elevated access

- Use a dedicated database role, never the default all-powerful service
  credential.
- Scope every privileged query by a known `workspace_id` or `app_user_id`.
- Record actor type: `user`, `system`, `integration`, `support`, or `migration`.
- Record correlation IDs for command, job, and provider event.
- Use short-lived credentials where platform supports them.
- Keep privileged modules separate from ordinary API query modules.
- Require code-owner review for any new use of `SECURITY DEFINER`, `BYPASSRLS`,
  broad grant, or service-role credential.
- Alert on direct use of break-glass credentials.
- Never make privileged credentials available in web/mobile bundles, PowerSync
  clients, local screenshots, logs, analytics, or error-reporting payloads.

## Support Access

Do not build broad staff impersonation into V1.

If support access becomes necessary:

1. Require a documented support case.
2. Require explicit, time-limited user consent unless a legal/security incident
   requires otherwise.
3. Use a dedicated support role with read-only, narrowly scoped access.
4. Log support actor, reason, target user/workspace, fields accessed, time, and
   approval.
5. Do not expose OAuth tokens, payment data, private attachment contents, health
   data, or financial data by default.
6. Make the capability revocable and regularly review access logs.

This is more important for Life OS than for a generic SaaS product because a
“life management” workspace may aggregate deeply personal data.

## Performance Rules

RLS policies run as part of query execution, so inefficient membership checks
can become a material performance issue as plan projections, task lists, and
search grow.

### Required indexes

At minimum:

```text
workspace_memberships(workspace_id, user_id)
workspace_memberships(user_id, workspace_id)
workspace_memberships(workspace_id, status)
app_users(clerk_user_id) UNIQUE
every workspace-scoped table(workspace_id)
every common workspace-scoped listing index:
  tasks(workspace_id, status, due_at)
  calendar_events(workspace_id, starts_at)
  daily_plan_events(workspace_id, plan_date)
```

Wrap stable token lookup functions in a scalar subquery, such as
`(SELECT auth.jwt() ->> 'sub')`, rather than repeatedly invoking them per
candidate row. Supabase’s RLS performance guidance notes that this pattern lets
Postgres create an `initPlan` that caches the value for the statement, and
combining it with indexes on policy-filter columns can reduce overhead by 95% or
more. Also be aware that built-in functions not marked `LEAKPROOF` can prevent
index pushdown under RLS; prefer simple indexed column predicates and test with
`EXPLAIN (ANALYZE, BUFFERS)` on representative data. Use Supabase’s Security and
Performance Advisors to catch missing indexes and `auth` helper misuse.[^6][^24]

### Query rules

- Always include `workspace_id` predicates in backend queries even when RLS
  would enforce them; it improves query planning and makes intent reviewable.
- Use an RLS-safe current-user/membership predicate that the planner can index.
- Never create an unbounded cross-workspace search query.
- Paginate all list/search endpoints.
- Run `EXPLAIN (ANALYZE, BUFFERS)` for Today, search, calendar-window, and
  sync-selection queries with representative data.
- Track p95 query duration, rows scanned, rejected RLS queries, and connection
  pool saturation without logging user content.

## RLS Testing

RLS tests are mandatory integration tests, not a manual checklist.

### Minimum matrix

For every protected table and operation, test:

| Scenario                               | Expected result                                                   |
| :------------------------------------- | :---------------------------------------------------------------- |
| Anonymous request                      | No personal data; mutation rejected                               |
| User A reads workspace A row           | Allowed                                                           |
| User A reads workspace B row           | Empty result or authorization failure                             |
| User A inserts into workspace A        | Allowed only through intended path                                |
| User A inserts into workspace B        | Rejected                                                          |
| User A updates workspace A row         | Allowed only for permitted fields/state                           |
| User A updates workspace B row         | Rejected/no rows changed                                          |
| User A changes row `workspace_id` to B | Rejected                                                          |
| User A deletes own permitted row       | Allowed only if policy permits                                    |
| Membership revoked mid-session         | Future access rejected after token/session handling is refreshed  |
| Backend standard role                  | RLS still enforced                                                |
| Worker role                            | Only documented privileged access works                           |
| Table owner/migration role             | Never used by app; `FORCE RLS` behavior verified where applicable |
| PowerSync User A replica               | Does not contain User B rows                                      |
| Storage object request                 | Enforces same workspace boundary                                  |

Use at least two identities and two workspaces in every authorization
integration fixture. A single-user test suite cannot prove tenant isolation.

## Policy Governance

### Migration requirements

A migration that creates a new workspace-scoped table is incomplete unless it
includes:

1. `workspace_id NOT NULL`.
2. Required foreign keys and indexes.
3. RLS enabled.
4. `FORCE ROW LEVEL SECURITY` where applicable.
5. Explicit `SELECT`, `INSERT`, `UPDATE`, and `DELETE` policy decisions.
6. Least-privilege grants.
7. Tests covering cross-workspace access.
8. A PowerSync replication decision: replicated, sanitized replica, or
   server-only.

### Review requirements

Changes involving the following require a designated security/data-layer review:

```text
RLS policies
GRANT/REVOKE
CREATE ROLE / ALTER ROLE
SECURITY DEFINER functions
BYPASSRLS
Supabase service keys
PowerSync sync rules
Storage policies
JWT claim interpretation
workspace membership model
support/admin access
OAuth credential tables
```

Drizzle can declare PostgreSQL RLS policies and roles, but the deployed SQL
remains the real security artifact; generated migrations must be reviewed as
security-sensitive code.[^7]

## Trade-Offs

| Choice                                      | What it gains                                                                                       | What it costs                                                                  |
| :------------------------------------------ | :-------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------- |
| RLS plus backend checks                     | Strong defense in depth across APIs, sync, storage, and future paths                                | More design, testing, and database expertise                                   |
| Membership lookup over JWT workspace claim  | Immediately reflects membership revocation/change                                                   | Extra indexed database lookup                                                  |
| Product workspaces over Clerk Organizations | Product-specific ownership, billing, audit, consent, and portability                                | Initial membership schema/policy work                                          |
| Default deny                                | Safe failure mode for new tables                                                                    | New table migrations require deliberate policy creation                        |
| Separate DB roles                           | Limits blast radius of compromised runtime credentials                                              | More connection/configuration complexity                                       |
| `SECURITY DEFINER` helpers                  | Cleaner, faster reusable policy checks                                                              | Elevated-function security discipline required                                 |
| Command-only writes                         | Centralized invariants, audit, outbox, and idempotency                                              | More backend implementation than generic direct CRUD                           |
| No staff impersonation in V1                | Better privacy posture and lower abuse risk                                                         | Slower support diagnostics                                                     |
| Backend token exchange for PowerSync        | Keeps sync authorization under the same membership source of truth; avoids stale client-side claims | Adds a latency-sensitive endpoint that must mint and validate short-lived JWTs |

## Final Decision

Lock the following authorization architecture:

```text
Identity issuer:                 Clerk (official Supabase third-party auth; role=authenticated injected automatically)
Product authorization truth:     PostgreSQL app_users + workspaces + workspace_memberships
Database enforcement:            PostgreSQL RLS on every user/workspace-scoped table
RLS default:                     Deny unless an explicit policy permits access
RLS owner behavior:              FORCE ROW LEVEL SECURITY for user-data tables where appropriate
Membership source:               Database membership lookup, not JWT workspace claims
JWT use:                         Minimal identity/session claims; role=authenticated for Supabase; no workspace/billing/entitlement claims
Business authorization:          Hono typed command handlers, separate from row filtering
User writes:                     Validated command pipeline; no broad direct CRUD access
Privileged processes:            Dedicated least-privilege worker/service roles with auditable access
PowerSync:                       Backend token exchange mints short-lived JWT; Sync Streams filter per resolved membership; isolation PoC required
Storage:                         Workspace-scoped paths and matching access policy
Policy implementation:           Drizzle pgTable.withRLS()/pgPolicy with drizzle-orm/supabase roles; reviewed SQL for all edge cases
Testing:                         Two-user/two-workspace RLS matrix required for every protected data domain
Support access:                  No broad impersonation in V1
```

The next category in dependency order is **Offline-First Sync Engine**.
<span style="display:none">[^10][^11][^12][^13][^14][^15][^16][^17][^18][^8][^9]</span>

<div align="center">⁂</div>

[^1]: https://supabase.com/docs/guides/database/postgres/row-level-security

[^2]: https://www.postgresql.org/docs/current/ddl-rowsecurity.html

[^3]: 07-Technical-Architecture-Fundamentals.md

[^4]: 06-Data-Model-Life-Graph.md

[^5]: https://supabase.com/docs/guides/auth/third-party/clerk

[^6]:
    https://github.com/supabase/agent-skills/blob/main/skills/supabase-postgres-best-practices/references/security-rls-performance.md

[^7]: https://orm.drizzle.team/docs/rls

[^8]: https://supabase.com/docs/guides/auth/jwts

[^9]: https://supabase.com/docs/guides/auth/oauth-server/token-security

[^10]:
    https://postgresconf.org/system/events/document/000/000/996/pgconf_us_2019.pdf

[^11]: https://queryplane.com/blog/postgres-row-level-security-in-practice/

[^12]: https://www.rockdata.net/tutorial/admin-row-level-security/

[^13]:
    https://dev.to/geekyfox90/postgresql-row-level-security-a-complete-guide-2l4

[^14]:
    https://dev.to/whoffagents/supabase-row-level-security-in-production-patterns-that-actually-work-2l78

[^15]:
    https://www.agilesoftlabs.com/blog/2026/06/supabase-row-level-security-guide-2026

[^16]: https://github.com/orgs/supabase/discussions/14576

[^17]:
    https://stackoverflow.com/questions/73631019/rls-policy-doesnt-applied-for-table-in-postgresql-while-the-rls-has-been-enable

[^18]:
    https://supabase.com/docs/guides/api/custom-claims-and-role-based-access-control-rbac

[^19]: https://clerk.com/docs/guides/development/integrations/databases/supabase

[^20]: https://clerk.com/changelog/2025-03-31-supabase-integration

[^21]: https://docs.powersync.com/sync/streams/overview

[^22]: https://docs.powersync.com/sync/streams/parameters

[^23]: https://docs.powersync.com/integrations/supabase/rls-and-sync-streams

[^24]: https://supabase.com/docs/guides/database/database-advisors
