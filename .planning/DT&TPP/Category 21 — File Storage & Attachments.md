<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

## Category 21 — File Storage \& Attachments

**Recommendation: use Supabase Storage private buckets for MVP attachments, with all upload authorization, object-key creation, metadata finalization, download signing, malware-scanning orchestration, and deletion controlled by the Hono API plus PostgreSQL records.** Use short-lived signed upload/download URLs where practical, but do not allow clients to invent object paths or access storage with a service-role key. Supabase Storage integrates with PostgreSQL Row Level Security, and private objects can be served through authenticated requests or time-limited signed URLs.[^1][^2][^3]

For Life OS, attachment support should be deliberately narrow in V1: images and common documents attached to tasks, projects, notes, or imports. Do **not** automatically replicate attachment binaries through PowerSync; replicate only safe attachment metadata and fetch file bytes on demand.

## Core Decision

```text
Object store, MVP:             Supabase Storage
Buckets:                       Private only
Authorization authority:       Hono API + PostgreSQL workspace/membership checks
Database metadata:             attachments table in Supabase PostgreSQL
Upload transport:              Short-lived, server-authorized signed upload URL
Download transport:            Short-lived, server-authorized signed download URL
Client storage:                Metadata through PowerSync; binary fetched/cached on demand
Security scanning:             Quarantine -> asynchronous scan -> approved/rejected lifecycle
Retention/deletion:            Worker-driven, idempotent, database-recorded deletion
Public buckets:                Prohibited for user attachments
Direct client service key:     Prohibited
S3/R2 migration path:          Abstract object-store port; defer until cost/compliance/egress need
```

Supabase Storage supports private buckets, fine-grained access control through RLS policies on `storage.objects`, and direct serving through authenticated requests or signed URLs.[^2][^3][^1]

## Requirements

The attachment system must support:

- Task, project, note, and future import/export attachments.
- iOS/Android and web file selection/camera/image inputs.
- Private files associated with a user/workspace and entity.
- Authorization independent of a guessed object path or stale client state.
- Large-file upload without routing raw bytes through Hono by default.
- Resumable upload potential for later large files.
- Metadata, upload state, scan state, and deletion lifecycle.
- Secure preview/download with expiration and access checks.
- Malware/content safety controls.
- Storage quota, type, size, and rate limits.
- Account/workspace deletion and retention handling.
- Offline-aware behavior without attempting unsupported binary synchronization.
- A portable abstraction if Supabase Storage stops meeting requirements.


## Storage Options

| Option | Advantages | Disadvantages | Decision |
| :-- | :-- | :-- | :-- |
| **Supabase Storage private buckets** | Same project/region ecosystem as PostgreSQL; RLS-based object access; signed URLs; simple MVP operations; compatible with selected Supabase stack; major 2026 performance improvements (14.8x faster pagination); built-in CDN; Smart CDN auto-invalidation | Storage policies need careful design; signed URL revocation limitations; less portable than pure S3 API; egress costs apply after included limits; not suitable as general-purpose object store at scale | **Select for MVP** |
| Cloudflare R2 | S3-compatible; zero egress fees (major cost advantage at scale); $0.015/GB/month; 10 GB free tier; strong for high-egress workloads; new R2 Data Catalog and R2 SQL features | Separate vendor, auth/metadata integration, lifecycle policy, and observability; must build all authorization bridge; no Glacier-equivalent tiers; limited region selection compared to S3; younger ecosystem | Defer - strong migration path for scale |
| Tigris (Fly.io) | Globally distributed with automatic edge caching; zero egress fees; S3-compatible; unique snapshots/forks for testing; global write capability; SOC 2 Type II certified | Younger service with more limited feature set; smaller free tier (5 GB); higher per-GB pricing than R2/B2; less mature tooling ecosystem | Defer - interesting for global apps but premature for MVP |
| Amazon S3 | Mature, broad compliance/region/tooling ecosystem; presigned uploads/downloads; lifecycle features; new 2026 features (S3 Annotations up to 1GB metadata, S3 Files file system access, removed 30-day IA minimum, S3 Vectors 80% cost reduction) | More IAM, billing, configuration, and operational complexity; separate cloud account/vendor; highest egress costs ($0.09/GB); no free tier on paid accounts | Defer - enterprise-scale consideration |
| Backblaze B2 | Cheapest paid storage ($0.006/GB/month); S3-compatible; free egress through Cloudflare CDN via Bandwidth Alliance; 10 GB free tier; long-standing indie company | Separate integration; 90-day minimum storage duration; less feature-rich than S3; requires CDN configuration for free egress | Defer - backup/archive specialist |
| Wasabi | Flat-rate pricing ($7.99/TB/month as of July 2026); zero egress and API request fees; predictable costs; good for large archives | 90-day minimum storage duration; price increase in 2026 reflects broader infrastructure cost trends; less feature-rich than S3; minimum 1 TB charge | Defer - large-scale archive consideration |
| AWS S3 + CloudFront | Strong performance/control for large-scale file delivery; global CDN integration | Highest setup/operations complexity for MVP; separate billing and configuration | Reject initially |
| UploadThing / similar upload SaaS | Fast developer experience, presigned flow abstraction | Additional vendor and data path; less control over privacy/lifecycle; can be unnecessary on Supabase | Reject |
| Cloudinary | Strong image transformation/CDN/media tooling | Extra vendor, cost, media-first model, less suitable for arbitrary private documents | Defer for future media-heavy needs |
| MinIO (self-hosted) | S3-compatible; complete control; no egress fees; AGPLv3 open source; erasure coding for resilience | Operational overhead; hardware costs; requires TLS/security configuration; management shifted to CLI in 2025 (web console reduced); not suitable for MVP simplicity goal | Reject for MVP |
| Store binary in PostgreSQL | Atomic metadata/file storage, no external storage service | Database bloat, poor backup/replication behavior, performance costs, incorrect use of Postgres | Reject |
| Store in PowerSync SQLite | Offline binary access | Massive device storage/sync cost, privacy/account-switch risk, unsuitable for general attachment replication | Reject |
| Client-only local files | Simple offline capture | No cross-device availability, backup, sharing, or durable reference | Reject except temporary upload staging |

**2026 Market Context**: The era of perpetually declining cloud storage pricing ended in 2025. AI-driven hardware demand has increased infrastructure costs, leading to price increases from Wasabi ($7.99/TB in July 2026) and Backblaze B2 ($6.95/TB in May 2026). Zero-egress pricing is now table stakes, with Cloudflare R2, Tigris, and Wasabi all offering no bandwidth charges. S3-compatible APIs are standard across serious providers, reducing migration friction. For Life OS MVP, Supabase Storage remains the best fit due to ecosystem integration, but R2 and Tigris are strong migration paths if egress costs become material at scale.[^4][^5][^6]

## Why Supabase Storage Wins

### Fewer systems at MVP

Life OS already depends on Supabase PostgreSQL and uses workspace/membership/RLS concepts throughout its data model. Supabase Storage’s object access controls are built around PostgreSQL RLS, with policies applied to the `storage.objects` table.[^2]

That lets the MVP retain one primary persistence platform for:

```text
Attachment metadata
Workspace/entity authorization
Object storage
Database lifecycle records
RLS policy review
Backups/operational ownership
```

The backend remains the decision-maker, but the storage layer is aligned with existing authorization structure.

### Private objects and short-lived access

Supabase private buckets support either an authenticated download request or a short-lived signed URL; signed URLs are generated with a storage-specific key and remain valid until expiry.  Therefore:[^1]

- Use short expiry.
- Treat signed URLs as bearer credentials.
- Do not put signed URLs in persistent database rows, push payloads, logs, analytics, or client caches beyond immediate use.
- Do not assume an already-issued signed URL can be revoked instantly; deny future authorization and keep expiry short.


## Bucket Strategy

### Buckets

Start with a small set of private buckets:

```text
lifeos-attachments-private
lifeos-exports-private
lifeos-quarantine-private
```

| Bucket | Purpose | Client access |
| :-- | :-- | :-- |
| `lifeos-attachments-private` | Approved user-uploaded documents/images | Temporary signed upload/download only |
| `lifeos-exports-private` | Account/workspace export archives | Server-generated; short-lived signed download after authorization |
| `lifeos-quarantine-private` | Newly uploaded unscanned objects | No ordinary client read; worker/scanner only |

Do not use a single public “uploads” bucket. Do not store user attachment bytes beside generated exports. Different lifecycle, retention, scanning, and access behavior justify bucket separation.

### Object-key rules

Use server-generated, non-guessable IDs:

```text
attachments/
  <attachment-id>/
    original
    preview/<derivative-id>
```

or:

```text
workspace/<workspace-id>/attachment/<attachment-id>/original
```

The first variant leaks less semantic hierarchy in storage keys. In either case:

- Object paths are implementation details, not user-controlled identifiers.
- Never use original filenames as object keys.
- Never include email address, task title, note title, provider ID, or arbitrary user input in a key.
- Preserve original filename only as sanitized metadata if product UX requires it.
- Do not use client-generated paths as authorization proof.


## Attachment Data Model

### Authoritative metadata

```text
attachments
  id                          UUID primary key
  workspace_id                UUID not null
  owner_app_user_id           UUID not null
  entity_type                 task | project | note | import | other
  entity_id                   UUID not null
  storage_provider            supabase
  bucket                      text not null
  object_key                  text not null unique
  original_filename           text nullable, sanitized
  display_name                text nullable
  declared_mime_type          text nullable
  detected_mime_type          text nullable
  byte_size                   bigint nullable
  checksum_sha256             text nullable
  upload_status               initiated | uploaded | verifying | approved | rejected | deleted | failed
  scan_status                 pending | clean | suspicious | infected | unavailable | not_required
  preview_status              not_requested | queued | ready | failed
  version                     integer not null
  uploaded_at                 timestamptz nullable
  approved_at                 timestamptz nullable
  deleted_at                  timestamptz nullable
  delete_after                timestamptz nullable
  created_at                  timestamptz not null
  updated_at                  timestamptz not null
```


### Link model

If attachments may later belong to more than one entity, use a link table early:

```text
attachment_links
  id
  attachment_id
  workspace_id
  entity_type
  entity_id
  created_by
  created_at
  deleted_at
```

If MVP guarantees one owner entity, include `entity_type/entity_id` directly on `attachments` initially, but preserve a migration path.

### Replication policy

| Data | PowerSync replication |
| :-- | :-- |
| Attachment ID, owner entity, safe display name, detected MIME type, byte size, status, preview availability | Yes, if owner entity replicates |
| Storage bucket/object key | Prefer no; client should not need it |
| Signed URLs | Never |
| Original raw filename if sensitive | Avoid or only if necessary |
| Binary content | Never by default |
| Checksum/internal scan details | Server only or minimal safe status |
| Quarantine state/internal scanner findings | Server only; expose simple safe status |
| Export object metadata | No by default; API-only status/download action |

A mobile user can see that an attachment exists and whether it is ready, then request a fresh authorized download URL only when opening it.

## Upload Flow

### Select server-authorized direct upload

```text
1. Client chooses/captures a file.
2. Client calls POST /v1/attachments/initiate with:
   entity reference, safe filename, declared MIME type, size, checksum if available.
3. Hono verifies Clerk identity, active workspace, entity access, quotas, file policy.
4. Hono creates attachments row with status=initiated and generated object key.
5. Hono returns a short-lived, constrained upload URL and attachment ID.
6. Client uploads bytes directly to private quarantine bucket.
7. Client calls POST /v1/attachments/:id/complete with upload result/checksum.
8. Hono/worker verifies object metadata and enqueues scan.
9. Scanner/worker moves/copies approved content to attachment bucket or marks status.
10. Client observes metadata status via PowerSync/API and may request download when approved.
```

Direct upload avoids proxying file bytes through Hono, preserving API capacity and reducing timeout/memory risk. S3-style presigned URLs are specifically intended to grant time-limited upload/download access without giving clients provider credentials; the same principle applies to the selected signed-upload design.[^5]

### Initiation rules

The API must enforce before issuing an upload URL:

- Authenticated user and active workspace membership.
- Entity exists and belongs to current workspace.
- User has write permission for that entity.
- Attachment feature entitlement/quota.
- Allowlisted MIME category/type.
- Maximum size per file and per workspace/user.
- Rate limits by user, workspace, and IP.
- Safe normalized filename length/character policy.
- Optional checksum requirement for larger files.
- No upload URL for deleted/archived/unauthorized source entity.

Do not let clients upload arbitrary objects to a writable prefix and “attach” them later.

### Upload completion rules

Completion is not a trust boundary bypass:

- Verify uploaded object exists in expected bucket/path.
- Verify expected size within tolerance.
- Verify content type and checksum if available.
- Reject mismatched key/attachment/workspace.
- Mark upload `verifying`, not `approved`.
- Idempotently handle repeated completion calls.
- Enqueue scan/processing via the transactional outbox/job worker.
- Expire initiated-but-never-uploaded records and orphaned objects through cleanup jobs.


## Download Flow

### Short-lived server-authorized URLs

```text
1. Client asks GET /v1/attachments/:id/download.
2. Hono verifies identity, active workspace membership, source entity authorization,
   attachment status=approved, and deletion status.
3. Hono generates a short-lived download URL.
4. Client streams/downloads directly from Storage.
5. Client optionally stores an encrypted, app-managed local cache according to policy.
```

Use 1–5 minute expiry initially. Supabase documents signed URLs as time-limited access links; they remain usable through their expiration, so they must be treated as sensitive bearer URLs.[^7][^1]

### Content disposition and previews

Set safe response metadata:

```text
Content-Disposition:
  attachment for unknown/document types by default
  inline only for approved, safe image/PDF preview use cases

Content-Type:
  Derived from detected type, not only client-declared MIME type

Content-Security-Policy / sandbox:
  Apply for web preview surfaces where relevant
```

Do not render arbitrary uploaded HTML, SVG, PDF, or office documents inline without a reviewed sanitization/isolation approach. Prefer download for unknown types.

## Malware and Content Safety

### Quarantine is required for nontrivial attachments

For MVP, adopt a pragmatic policy:


| File category | Initial policy |
| :-- | :-- |
| JPEG/PNG/HEIC/WebP images within size cap | Allow, scan/verify asynchronously; preview only after approval |
| PDF | Allow only if scanning/preview policy is in place; download-first initially |
| Plain text/CSV | Allow with size cap; treat content as untrusted |
| Office documents | Defer or allow download-only after scanning |
| Executables, scripts, archives, disk images | Reject |
| SVG | Reject initially or sanitize server-side before any inline use |
| HTML/JS | Reject |
| Unknown/binary MIME | Reject by default |

The worker pipeline:

```text
uploaded quarantine object
  -> detect MIME from file bytes
  -> verify size/checksum
  -> malware scan service/container
  -> optionally strip image metadata / generate preview
  -> move/copy to approved private bucket
  -> update attachment status
  -> emit safe metadata change through outbox/PowerSync
```

Do not claim files are virus-free if scanning is unavailable. In that state, either hold files inaccessible or expose a clear “processing unavailable” state. Do not run untrusted file parsers in the Hono API process.

### MVP scope trade-off

If malware scanning infrastructure cannot be implemented responsibly before launch, limit MVP to small image attachments and defer arbitrary documents. A generic “upload any file” feature without quarantine, policy, and deletion lifecycle is not an acceptable shortcut for a personal-data application.

## Client Caching and Offline Behavior

### Mobile

- Replicate attachment metadata only.
- On user action, download the approved binary using a fresh signed URL.
- Store temporary downloads in app-managed cache storage, not generic shared media gallery by default.
- Track local cache metadata: attachment ID, revision/checksum, local path, byte size, last accessed, cache expiry.
- Encrypt local files if the platform/storage solution can do so reliably; otherwise limit cached sensitive content and disclose behavior.
- Clear cached attachment bytes on sign-out, account switch, workspace revocation, explicit “clear offline files,” and account deletion.
- Enforce cache quota and LRU eviction.
- Do not open stale downloaded content if server metadata says attachment is deleted/revoked when online.


### Web

- Do not persist signed URLs in localStorage, IndexedDB, URLs, rendered HTML, or analytics.
- Fetch a fresh short-lived URL when user clicks download/preview.
- Use `Cache-Control: no-store` or private behavior for sensitive download authorization responses.
- Avoid Service Worker caching of authenticated attachments in MVP.
- Use a sandboxed/isolated viewer for any inline preview considered safe.


### Offline upload

Do not promise arbitrary offline binary uploads in MVP. Support an explicit state:

```text
Selected locally -> waiting for connection -> upload initiated -> processing -> ready
```

For small images, a future mobile upload queue can hold local file references and resume upload after connectivity returns. It must handle OS file lifecycle, storage quota, user sign-out, checksum, and source-file deletion. Defer this until core task/calendar offline command sync is stable.

## Quotas and Limits

Start with conservative, configurable limits:

```text
Per file:
  Images: 10 MB
  Documents: 20 MB if enabled

Per user/workspace:
  250 MB initial soft quota, adjusted by plan/entitlement

Per request:
  File metadata/initiation body small; binary never flows through normal API

Rate:
  Upload initiation/completion rate limit per user/workspace/IP
```

Do not hard-code product quota numbers in mobile/web clients. The backend returns current entitlement/quota information and enforces it authoritatively.

Track:

```text
approved bytes
quarantined bytes
pending deletion bytes
attachment count
failed upload count
upload rate
scan queue depth/latency
orphan-object count
```


## Deletion and Retention

### User deletes attachment

```text
1. Client issues typed DeleteAttachment command.
2. Hono verifies current authorization.
3. PostgreSQL marks attachment deleted/hidden, creates audit/outbox record.
4. PowerSync removes/hides metadata from clients.
5. Worker deletes object/derivatives idempotently after configured grace period.
6. Worker records deletion outcome.
```

Use soft delete at metadata layer first so clients converge promptly and accidental deletions can potentially be undone. Do not make an object permanently accessible during the soft-delete window; future download authorization must deny deleted attachments.

### Entity/account deletion

- Entity deletion cascades to attachment links/metadata through explicit domain logic.
- Account/workspace deletion schedules storage deletion through the established account-deletion worker workflow.
- Retain only what legal/privacy policy requires, and document retention period.
- Keep deletion jobs idempotent: repeated deletion of a missing object is successful.
- Maintain a reconciliation job that detects orphaned approved/quarantine objects and expired initiated records.
- Never rely solely on a client call to remove remote bytes.


## Supabase Storage Security Policy

Supabase Storage blocks uploads by default when no RLS policy permits them, and service keys bypass RLS entirely.  Apply the following:[^2]

- Buckets are private.
- No anonymous read/write policies.
- No service-role key in Next.js browser, Expo app, client bundle, or logs.
- Hono uses server-only storage credentials and issues constrained signed URLs after app-level authorization.
- Storage RLS is defense in depth, not a replacement for Hono’s workspace/entity checks.
- Object access policy checks attachment ownership/workspace semantics where feasible; never authorize based only on a user-controlled folder prefix.
- Restrict bucket MIME types and file sizes at bucket/configuration level where supported, while still enforcing server-side checks.
- Separate development, preview, and production buckets/projects/credentials.
- Audit policies when schema or workspace membership logic changes.


## Object Storage Abstraction

Avoid leaking Supabase SDK types across the codebase:

```text
packages/storage/
├── src/
│   ├── object-store.ts
│   ├── attachment-service.ts
│   ├── signed-url.ts
│   ├── supabase-storage-adapter.ts
│   └── index.ts
```

Example port:

```ts
interface ObjectStore {
  createUploadUrl(input: UploadGrant): Promise<UploadUrl>;
  headObject(input: ObjectRef): Promise<ObjectMetadata | null>;
  createDownloadUrl(input: DownloadGrant): Promise<DownloadUrl>;
  moveObject(input: MoveObject): Promise<void>;
  deleteObject(input: ObjectRef): Promise<void>;
}
```

The domain/application layer uses attachment IDs and logical operations; only the adapter knows bucket names, signed URL formats, and provider APIs. This keeps an eventual move to R2 or S3 bounded.

## R2 and S3 Reassessment

### Move to R2 if

- Attachment downloads become bandwidth-heavy and R2’s zero egress economics materially improve cost (at 50 TB/month egress, R2 saves ~$4,500 vs S3).
- CDN/distribution controls are needed beyond Supabase Storage's built-in Cloudflare CDN.
- The team is comfortable operating S3-compatible policy/signing infrastructure.
- Storage is separated from Supabase for vendor-risk or regional reasons.
- R2 Data Catalog or R2 SQL features become relevant for analytics on stored data.

R2’s storage pricing ($0.015/GB/month) and zero egress fees are attractive for download-heavy usage. The 10 GB free tier and generous operation allowances (10M Class B reads/month) cover most indie projects entirely. R2 has matured significantly in 2026 with Data Catalog and SQL capabilities, but still lacks Glacier-equivalent archival tiers and the deep compliance certifications of AWS.[^6]

### Move to Tigris if

- Global distribution with automatic edge caching is required for latency-sensitive applications.
- The application is deployed on Fly.io, where native integration provides operational simplicity.
- Unique features like snapshots/forks for testing migrations or branching production data are valuable.
- SOC 2 Type II certification is required with HIPAA BAA available on enterprise plans.

Tigris offers zero egress fees, S3-compatible API, and dynamic data placement that replicates hot objects closer to readers. At $0.02/GB/month, it costs slightly more than R2 but includes automatic global distribution. The service is younger with a more limited feature set, making it better suited for global applications rather than MVP simplicity.[^6]

### Move to S3 if

- Enterprise compliance (HIPAA, FedRAMP, IRAP), regional controls, lifecycle/archival tiers, Object Lock, or mature security tooling require AWS.
- Large files, multipart/resumable upload, and advanced media/document processing become central.
- The organization standardizes on AWS operational tooling.
- New 2026 S3 features are needed: S3 Annotations (up to 1GB metadata per object), S3 Files (file system access to buckets), or S3 Vectors (80% cost reduction for large vector indexes).
- S3 Metadata and annotation tables for querying metadata at scale via Athena are required.

S3’s presigned URLs provide temporary object access without distributing AWS credentials. The 2026 removal of the 30-day minimum for transitions to S3 Standard-IA and One Zone-IA makes archival more flexible. However, S3’s egress costs ($0.09/GB) and lack of free tier on paid accounts make it expensive for bandwidth-heavy workloads compared to zero-egress alternatives.[^4][^5]

### Move to Backblaze B2 if

- Lowest storage cost is the primary driver ($0.006/GB/month as of May 2026).
- The application can tolerate the 90-day minimum storage duration.
- Backup/archive workloads dominate over active user-facing delivery.
- Cloudflare CDN integration is acceptable for free egress via Bandwidth Alliance.

B2 is the cheapest per-GB option for backup and archive, but less feature-rich than S3. The 2026 price increase to $6.95/TB reflects broader infrastructure cost trends driven by AI hardware demand.[^6]

### Move to Wasabi if

- Predictable flat-rate pricing is preferred ($7.99/TB/month as of July 2026).
- Large-scale archive workloads with stable storage volumes.
- Zero egress and API request fees are valuable.
- The 90-day minimum storage duration and 1 TB minimum charge are acceptable.

Wasabi's 2026 price increase reflects broader shifts in infrastructure costs. It remains competitive for large archives but less suitable for variable, smaller-scale workloads due to the minimum charge.[^6]

### Move to MinIO if

- Complete control over infrastructure is required (self-hosted).
- Regulatory or data sovereignty requirements mandate on-premises storage.
- The team has operational capacity to manage distributed storage clusters.
- AGPLv3 licensing is acceptable for the use case.

MinIO is the de-facto standard for self-hosted S3-compatible storage, but introduces significant operational overhead. In 2025, MinIO shifted administrative features from the web console to the CLI, increasing operational complexity. Not suitable for MVP simplicity goals.[^6]

None of these conditions justify an extra storage system in MVP. Supabase Storage remains the optimal choice for Life OS MVP due to ecosystem integration, with clear migration paths to R2, Tigris, or S3 if scale or compliance requirements evolve.

## Testing

| Scenario | Required outcome |
| :-- | :-- |
| Authorized upload initiation | URL constrained to one generated attachment/object and expires quickly |
| Cross-workspace upload/download attempt | Denied even with guessed attachment ID/path |
| Client attempts arbitrary object key | Cannot obtain upload authorization |
| Expired signed URL | Upload/download fails safely; client requests a new authorized URL |
| Malicious/unsupported type | Rejected before/after upload; never previewed/served as approved |
| File MIME mismatch | Detected and rejected/quarantined |
| Upload completion retried | Idempotent; one attachment record/scan job |
| Worker retries scan | No duplicate approved object/metadata |
| Attachment deleted before scan completes | No approved object becomes visible |
| Sign-out/account switch | Local downloaded files and metadata/caches are cleared appropriately |
| Account deletion | All active/quarantine/derivative objects are eventually deleted and recorded |
| Signed URL leakage check | No URL appears in logs, analytics, database, screenshots, or app links |
| Large upload failure | Clear recoverable state, no orphaned approved object |
| Concurrent access | Authorization is rechecked for each newly issued download URL |

## Trade-Offs

| Choice | Gain | Cost |
| :-- | :-- | :-- |
| Supabase Storage | Fewer vendors and RLS alignment with existing PostgreSQL platform | Less direct storage/CDN control than S3/R2 |
| Private buckets only | Strong default privacy posture | Every access requires authorization/signing logic |
| Direct signed uploads | Efficient large-file transfer; avoids API proxy bottleneck | Requires careful initiation/completion/expiry lifecycle |
| Quarantine and scanning | Safer file handling | Worker/scanner complexity and delayed availability |
| Metadata-only PowerSync replication | Small, safe offline replica | Attachments require on-demand download to view offline |
| Short-lived download URLs | Limits lasting exposure | Need fresh URL generation and cannot instantly revoke already-issued URL |
| No arbitrary offline uploads | Avoids fragile binary queue behavior | Less seamless capture while offline |
| Storage abstraction | Future R2/S3 portability | Small upfront adapter/design cost |

## Final Decision

Lock the following file-storage and attachment architecture:

```text
Object storage:                Supabase Storage for MVP
Bucket access:                 Private only; public attachment buckets prohibited
Authorization:                 Hono verifies user, workspace, entity, quota, and policy before signing
Upload path:                   Initiate -> short-lived signed direct upload to quarantine -> complete -> verify/scan -> approve
Download path:                 Fresh short-lived signed URL issued only after current authorization
Metadata:                      PostgreSQL attachments/links tables; safe metadata replicated through PowerSync
Binaries:                      Never PowerSync-replicated; downloaded/cached on demand
Security:                      Server-generated opaque keys, allowlisted type/size limits, quarantine, scan/verify, no service keys in clients
Deletion:                      Soft metadata delete then idempotent worker object deletion and retention cleanup
Mobile offline:                Metadata available; binary cache bounded and cleared on sign-out/account switch; offline binary upload deferred
Web preview:                   Download-first for unknown types; sandbox/strict policy for any approved inline previews
MVP file scope:                Small images first; documents only after scanning/preview policy is ready
Future migration:              Object-store port permits R2 or S3 if cost/compliance/scale requires it
```

The next category in dependency order is **Search \& Indexing**.
<span style="display:none">[^10][^11][^12][^13][^14][^15][^8][^9]</span>

<div align="center">⁂</div>

[^1]: https://supabase.com/docs/guides/storage/serving/downloads

[^2]: https://supabase.com/docs/guides/storage/security/access-control

[^3]: https://supabase.com/docs/guides/storage

[^4]: https://docs.aws.amazon.com/AmazonS3/latest/userguide/ShareObjectPreSignedURL.html

[^5]: https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html

[^6]: https://developers.cloudflare.com/r2/pricing/

[^7]: https://supabase.com/docs/reference/python/storage-from-createsignedurl

[^8]: https://docs.aws.amazon.com/pdfs/prescriptive-guidance/latest/presigned-url-best-practices/presigned-url-best-practices.pdf

[^9]: https://supabase.com/docs/guides/database/postgres/row-level-security

[^10]: https://tomodahinata.com/en/blog/supabase-storage-rls-access-control-bucket-folder-policies-guide

[^11]: https://docs.aws.amazon.com/cli/latest/reference/s3/presign.html

[^12]: https://dev.to/kanta13jp1/supabase-storage-deep-dive-bucket-design-signed-urls-image-transforms-and-rls-3b9k

[^13]: https://deepwiki.com/supabase/storage/3.6-authentication-and-authorization

[^14]: https://docs.aws.amazon.com/boto3/latest/guide/s3-presigned-urls.html

[^15]: https://docs.aws.amazon.com/sdk-for-php/v3/developer-guide/s3-presigned-urls.html

[^16]: https://adamarant.com/en/blog/cloudflare-r2-vs-s3-vs-supabase-storage-in-2026-which-to-pick

[^17]: https://agentdeals.dev/storage-comparison-2026

[^18]: https://eastondev.com/blog/en/posts/dev/supabase-storage-guide/

[^19]: https://blog.vibecoder.me/file-upload-storage-s3-r2-supabase

[^20]: https://github.com/supabase/supabase/blob/master/apps/www/_blog/2026-03-05-supabase-storage-performance-security-reliability-updates.mdx

[^21]: https://aws.amazon.com/about-aws/whats-new/2026/06/amazon-s3-annotations-business-context/

[^22]: https://aws.amazon.com/about-aws/whats-new/2026/04/amazon-s3-files/

[^23]: https://aws.amazon.com/about-aws/whats-new/2026/07/s3-removes-30-day-transitions-standard-ia-one-zone-ia/

[^24]: https://aws.amazon.com/about-aws/whats-new/2026/06/s3-vectors-reduces-query-charges-80-percent-large-indexes/

[^25]: https://fly.io/docs/tigris/

[^26]: https://www.tigrisdata.com/docs/overview/

[^27]: https://wasabi.com/pricing

[^28]: https://docs.wasabi.com/docs/may-2026-wasabi-pricing

[^29]: https://akave.com/blog/the-storage-squeeze-why-wasabi-backblaze-and-everpure-are-all-raising-prices-in-2026

[^30]: https://minio.community/community/minio-object-store/operations/deployments/baremetal-deploy-minio-on-ubuntu-linux.html

[^31]: https://dev.to/pickuma/minio-review-self-hosted-s3-compatible-object-storage-in-2026-ep

