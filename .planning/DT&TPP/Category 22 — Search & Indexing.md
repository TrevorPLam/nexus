<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

## Category 22 — Search \& Indexing

**Recommendation: start with PostgreSQL full-text search plus `pg_trgm`, exposed only through Hono search endpoints and protected by workspace authorization/RLS. Build a denormalized, server-maintained `search_documents` projection rather than querying every domain table directly.** Add Meilisearch only when measured search quality, scale, or feature needs—such as typo tolerance, instant-as-you-type search across large note collections, or richer faceting—outgrow PostgreSQL.[^1][^2][^3]

For mobile, **do not promise full offline global search in MVP.** Provide local scoped search for selected replicated lists where useful, but keep canonical cross-entity search server-side initially. This avoids replicating all historical note/body text and building a second client search index before the core offline planner is proven.

## Core Decision

```text
MVP canonical search:           PostgreSQL Full Text Search (FTS) + pg_trgm
Search projection:              search_documents table in PostgreSQL
Index maintenance:              Transactional outbox + pg-boss worker, with repair/rebuild path
Search API:                     Hono /v1/search endpoint
Authorization:                  Hono workspace check + RLS/defense-in-depth query scope
Web client:                     TanStack Query with debounced input and cancellation
Mobile client:                  Server search when online; local scoped SQLite search only where practical
PowerSync replication:          No full global search index; only safe entity data already selected for replica
External search engine:         Meilisearch deferred
Semantic/vector search:         Deferred
Search analytics:               Aggregated, privacy-minimized; raw query capture disabled by default
```

PostgreSQL full-text search stores optimized document representations in `tsvector` and matches them with `tsquery` using the `@@` operator.  The `pg_trgm` extension provides trigram similarity capabilities that complement full-text matching for partial names, misspellings, and short queries.[^2][^3][^1]

## Requirements

Life OS search must eventually support:

- Tasks, projects, areas, goals, notes, contacts, and calendar-event projections.
- Workspace isolation and entity-level authorization.
- Search result ranking that favors likely relevant, recent, active, and title matches.
- Partial/short query handling for task/project names.
- Fast enough command-palette and search-page interactions.
- Safe result snippets without leaking private text or inaccessible entities.
- Search after task/note edits, imports, deletions, connection changes, and membership changes.
- A path to typo tolerance and richer faceting later.
- Safe handling of sensitive personal content, including notes and calendar text.
- Limited offline usability without bloating the PowerSync replica.


## Options

| Option | Advantages | Disadvantages | Decision |
| :-- | :-- | :-- | :-- |
| **PostgreSQL FTS + `pg_trgm` + search projection** | No new vendor; transactional source alignment; solid ranking/highlighting; row/workspace scoping; suitable MVP scale; supports exact/prefix/trigram paths; pg_textsearch v1.0 (2026) offers modern BM25 if needed; pgvector mature for future hybrid search | More manual relevance tuning than purpose-built search; typo tolerance less turnkey; heavy full-text workloads can burden primary DB | **Select** |
| Meilisearch (v1.39+) | Fast instant search; built-in typo tolerance, prefix matching, filters, facets, multi-criteria ranking; distributed sharding (v1.37); HNSW vector store; Fragments API for multi-modal; MIT license | Additional service/vendor and indexing pipeline; duplicate sensitive data; authorization filtering must be designed; eventual consistency; more complex than Postgres-native | Defer |
| Typesense (v30.0+) | Strong search UX, typo tolerance, faceting; Natural Language Search with LLMs; JOINs for relationships; built-in RAG; Image/Voice search | GPL v3 license (more restrictive than Meilisearch MIT); same extra-service/indexing/privacy burden as Meilisearch; more complex feature set | Defer |
| Algolia | Excellent hosted relevance, analytics, frontend tooling | Cost and third-party personal-data indexing; vendor lock-in; complex ACL/filter model | Reject for MVP |
| Elasticsearch/OpenSearch | Powerful, scalable full-text/vector/faceting capabilities | Heavy operational burden, mapping/index lifecycle complexity, cost | Reject |
| pg_textsearch extension (PostgreSQL) | Modern BM25 ranked keyword search; performance advantages over ParadeDB; Postgres-native; MIT license | Additional extension to manage; not needed for standard FTS MVP; evaluate if BM25 tuning becomes critical | Evaluate later |
| Supabase `pg_search` / managed extension | Potential managed Postgres-native search features | Availability/maturity/operational behavior must be separately verified; not needed for standard FTS MVP | Evaluate later |
| Plain `ILIKE` | Very simple, good for tiny lists | Poor relevance and performance at scale; insufficient for notes/global search | Use only for narrow local/mobile scoped search |
| Client-side fuzzy index (MiniSearch/Fuse) | Works offline, instant local results | Requires full content replication/indexing, memory/storage cost, separate ranking/privacy model | Defer |
| pgvector (PostgreSQL extension) | Native vector search in Postgres; HNSW/IVFFlat indexes; halfvec/binary quantization; iterative scan (0.8.0+) solves over-filtering; mature and production-ready | Adds embedding generation complexity; privacy concerns with external embedding providers; not needed for MVP lexical search | Defer |
| Edge/Serverless search (Cloudflare Workers, etc.) | Low latency, auto-scaling, no server management | Not relevant for personal OS search; adds provider dependency; privacy concerns with edge processing; overkill for MVP scale | Reject |
| Embeddings/vector search (external) | Semantic retrieval and natural-language discovery | Cost, privacy/model-provider data path, indexing complexity, weak deterministic filtering without hybrid approach | Defer |

Meilisearch provides built-in typo tolerance, prefix matching, and multi-criteria ranking for full-text search.  Those capabilities are attractive but not worth duplicating personal search data into a separate system until PostgreSQL-based search is demonstrably inadequate.[^4][^5]

## 2026 Updates: New PostgreSQL Capabilities

### pg_textsearch v1.0 (June 2026)

PostgreSQL released pg_textsearch v1.0 in June 2026, an open-source extension (MIT license) providing modern BM25 ranked keyword search with fast indexing and state-of-the-art query performance. It demonstrates substantial performance advantages over ParadeDB and offers a Postgres-native path to advanced lexical search if standard FTS proves insufficient.

Key capabilities:
- Modern BM25 ranking algorithm
- Fast indexing performance
- State-of-the-art query performance on large-scale IR datasets
- MIT license (more permissive than ParadeDB's AGPL)
- Postgres-native integration

**Recommendation**: Monitor pg_textsearch maturity. If standard PostgreSQL FTS ranking proves inadequate for Life OS relevance needs, evaluate pg_textsearch before adding a separate search service. It maintains the single-database advantage while providing more sophisticated ranking.

### pgvector Maturity (2026)

pgvector has matured significantly and is now production-ready for vector search within PostgreSQL:

**Key improvements (2024-2026)**:
- HNSW index type is now the default for production workloads
- Iterative scan (v0.8.0+) solves "over-filtering" when combining vector search with strong WHERE clauses
- Half-precision vectors (halfvec) cut storage by ~50%
- Binary quantization reduces storage to ~1/30 with re-ranking
- Support for up to 2,000 dimensions (vector), 4,000 dimensions (halfvec)
- Multiple distance metrics: L2, cosine, inner product, L1, Hamming, Jaccard

**When to consider pgvector**:
- For semantic search ("find notes about annual planning")
- For natural-language retrieval across notes and tasks
- When hybrid lexical + semantic search is needed
- Only after lexical search is proven, fast, and well-instrumented

**Privacy considerations**:
- Embedding generation requires external model providers (OpenAI, etc.) or self-hosted models
- External providers may process personal content during embedding generation
- Local embedding models increase infrastructure complexity
- Defer until explicit privacy review and clear user value

## Why PostgreSQL Wins

### Source-of-truth proximity

Tasks, notes, calendar projections, project metadata, access controls, deletion state, and workspace membership already live in PostgreSQL. Keeping the first search implementation there means:

```text
Authoritative mutation
  -> transaction/outbox
  -> search projection update
  -> Hono query with current workspace scope
  -> result
```

This avoids a second database that can be stale, improperly filtered, or accidentally retain deleted personal content.

### Good enough capability for MVP

PostgreSQL FTS provides normalized lexeme search, ranking, and highlight/snippet features.  `pg_trgm` adds similarity-oriented matching useful for human-entered names and partial text.[^6][^3][^7]

A combined approach can provide:

- Exact title match for command-palette quality.
- Prefix/name matching for short input.
- Full-text match for longer queries and notes.
- Recency/status/type boosts.
- Lightweight typo-ish fallback through trigram similarity.
- Filterable workspace/entity/date/status constraints.


### Lower privacy surface

Every external search index duplicates potentially highly sensitive text:

```text
Task titles
Notes
Calendar event titles/descriptions
Project/goal names
Contacts
Search queries themselves
```

Keeping the index in Supabase PostgreSQL reduces the number of processors and deletion/reconciliation paths during MVP. It does not eliminate security requirements, but it avoids adding one more sensitive data store before its benefit is proven.

## Search Scope

### MVP entity coverage

| Entity | Search fields | Default inclusion | Notes |
| :-- | :-- | :-- | :-- |
| Tasks | Title, safe text/description, project/area names, tags | Yes | Boost active and incomplete tasks |
| Projects | Name, description, linked area/goal names | Yes | Strong title boost |
| Areas | Name, description | Yes | Low volume, title-focused |
| Goals | Name, description | Yes | Low volume, title-focused |
| Notes | Title and body, if user enables note search | Yes, policy-controlled | Most sensitive/high-volume content |
| Contacts | Display name, organization, safe metadata | Later / optional | Do not infer from external address books without consent |
| Calendar event projections | Title only initially; description/location opt-in | Yes, limited | Never index raw provider payload by default |
| Attachments | Display name and metadata only | Later | Do not OCR/index contents in MVP |
| Audit logs | No | No | Separate support/history UI |
| OAuth tokens/provider payloads | Never | Never | Server-only secrets |
| Billing/security records | No | No | Not product-search content |

### Default privacy policy

- Index only fields necessary for the user-facing search result.
- Calendar descriptions, locations, attendee names, conferencing links, and private notes require explicit product policy before indexing.
- Never index refresh tokens, access tokens, raw provider payloads, webhook data, user credentials, billing data, or internal error messages.
- Store only minimal snippet/source fields needed to produce a result; reload the authoritative entity for detail display.
- If search-query analytics exists later, hash/aggregate categories and lengths; do not store raw queries by default.


## Search Projection Design

### `search_documents`

Do not join every domain table dynamically for every query. Maintain a dedicated projection:

```text
search_documents
  id                      UUID primary key
  workspace_id            UUID not null
  entity_type             task | project | area | goal | note | calendar_event | contact
  entity_id               UUID not null
  title                   text not null
  body                    text null
  metadata                jsonb not null default '{}'
  language_config         regconfig not null default 'english'
  document                tsvector not null
  searchable_at           timestamptz not null
  updated_at              timestamptz not null
  deleted_at              timestamptz null
  visibility_state        active | hidden | deleted
  source_revision         bigint/integer not null
```

Indexes:

```text
GIN(document)
B-tree(workspace_id, entity_type, deleted_at, updated_at DESC)
GIN(title gin_trgm_ops)
GIN(body gin_trgm_ops) only if measured need justifies index size
Unique(workspace_id, entity_type, entity_id)
```

PostgreSQL describes `tsvector` as a document representation optimized for text search and `tsquery` as an optimized query representation.[^1]

### Projection content

Example task document:

```text
title:
  "Prepare quarterly plan"

body:
  task description + safe project name + safe area name + tags

metadata:
  {
    "status": "active",
    "projectId": "...",
    "areaId": "...",
    "dueDate": "2026-07-25",
    "isCompleted": false
  }
```

Do not put the entire normalized entity JSON into `metadata` just because JSONB is convenient. Projection rows are purpose-built search documents, not replicas of domain tables.

## Index Maintenance

### Select outbox-driven asynchronous projection

```text
Domain mutation transaction
  -> domain table update
  -> audit event
  -> outbox event: task.changed.v1
  -> commit

Worker
  -> consumes event
  -> reloads current authoritative task + searchable relations
  -> upserts/deletes search_documents row
  -> records projection version/outcome
```

Use a deterministic projection version and idempotent upsert. A search result can be briefly stale after a change; the detail screen always reloads/validates the authoritative entity before presenting actionable data.

### Why not triggers for all indexing

Database triggers can update `tsvector` fields automatically; PostgreSQL documents trigger functions for maintaining text-search vectors.  They are useful for simple same-row title/body indexing.[^8]

However, Life OS search documents combine relations and product rules:

```text
Task title + project name + tags
Project rename affects task search context
Calendar connection removal affects projected events
Workspace membership/entity visibility affects inclusion
Note privacy setting changes index inclusion
```

These are better handled by application-level outbox jobs. Use a generated `tsvector`/trigger only inside the projection table if it simplifies maintenance; do not scatter complex cross-domain indexing triggers through every source table.

### Repair and rebuild

Eventual indexing requires recovery tools:

- `search_documents` has `source_revision`.
- Worker detects outdated/missing projection after a domain event.
- Nightly/weekly reconciliation identifies active entities without current projection.
- Admin-only/restricted job can rebuild one workspace/entity type or full index.
- Rebuild is chunked, rate-limited, resumable, and audited.
- Deletion/tombstone reconciliation ensures removed or privacy-hidden content leaves the index.

Do not rely on “the queue never fails” as the indexing strategy.

## Query Design

### API

```text
GET /v1/search?q=<query>&types=task,note&workspaceId=<id>&cursor=<opaque>&limit=20
```

The API validates:

- Current Clerk identity.
- Current/explicit workspace membership.
- Query length and normalization.
- Allowed entity types and filters.
- Cursor integrity and sort version.
- Search entitlement/feature flag if applicable.
- Rate limit and abuse controls.

The client-provided `workspaceId` is a requested scope only; Hono resolves and verifies membership. The query must always constrain `workspace_id` server-side.

### Query stages

| Query length/type | Strategy |
| :-- | :-- |
| Empty | Do not run global search; show recent/pinned/suggested items |
| 1–2 characters | Title prefix/trigram only, rate-limited/debounced |
| 3+ words/normal phrase | `websearch_to_tsquery`-style FTS plus title boosts |
| Quoted phrase | Phrase-aware FTS if supported in selected parser |
| Identifier-like query | Exact matching path for task/project IDs only if product exposes it |
| No FTS results | Controlled `pg_trgm` similarity fallback for title/name fields |
| Filters selected | Apply entity/status/date/project constraints before rank/cursor |

PostgreSQL provides query controls, ranking, and highlighting facilities as part of its full-text search system.[^6]

### Ranking

Use a documented, testable ranking formula:

```text
rank =
  title_exact_boost
  + title_fts_rank * 4
  + body_fts_rank
  + active_entity_boost
  + incomplete_task_boost
  + recency_decay
  + user-pinned/recent interaction boost (later, privacy reviewed)
```

Never return raw `ts_rank` as an unexplained product rank. Keep ranking implementation server-side, version it as behavior evolves, and use cursor pagination based on stable `(rank_bucket, updated_at, id)` ordering or a deliberately materialized sort key.

### Highlighting

Generate snippets server-side from approved indexed fields:

```text
Title: Prepare <mark>quarterly</mark> plan
Snippet: …review goals for the <mark>quarterly</mark> planning session…
```

Rules:

- Escape/sanitize all HTML before rendering.
- Use a controlled mark token or structured match ranges rather than trusting text fragments as safe HTML.
- Omit snippet for sensitive fields if lock-screen/privacy/display policy requires it.
- Limit result/snippet size.
- Do not expose bodies of private/deleted/unavailable entities.


## Authorization

### Defense in depth

Search is a high-risk aggregation surface: a single query can reveal that a sensitive item exists even when normal navigation does not expose it.

Apply all of:

1. Hono verifies Clerk session.
2. Hono resolves active user and workspace membership.
3. SQL query filters `workspace_id`.
4. RLS applies as a defense-in-depth control where the query runs under user-scoped database identity.
5. Projection builder includes only active/visible entities.
6. Result mapper reloads or validates relevant authorization/visibility when necessary.
7. Deleted, hidden, or revocation-affected entities are removed promptly and excluded from results.

Supabase/PostgreSQL RLS is designed to secure database rows, but application-level scope checks remain necessary for a server-owned search endpoint.[^9]

### Search result safety

A result DTO should contain only:

```text
entityType
entityId
title
safeSnippet
optional safe metadata: status/due date/icon
updatedAt
route hint
```

Do not return:

```text
raw document/body
all metadata JSON
provider identifiers
storage object keys
unredacted calendar descriptions/location/attendees
note body beyond bounded approved snippet
authorization/membership details
internal ranking/debug fields
```

Every result-click deep link revalidates access through normal API/local-replica loading. Search success is not a permanent authorization grant.

## Web Search UX

### Command palette vs full search

Treat them as related but distinct:


| Surface | Purpose | Query scope |
| :-- | :-- | :-- |
| Command palette | Fast navigation and actions | Recent items, task/project/note title search, commands |
| Search page | Thorough discovery | Full FTS across selected entity types and filters |
| Task list filter | Narrow current list | Local list/server list filter, not global search |
| Calendar search | Calendar-scoped lookup | Calendar projection title search, bounded date scope |

For web:

```text
User input
  -> 150–250 ms debounce
  -> Abort previous request
  -> TanStack Query with query key excluding sensitive analytics data
  -> render categorized, accessible results
  -> keyboard navigation
```

Do not query after every keystroke for blank/one-character input. Require a minimum length appropriate to query type and return recent items/commands before that.

### Accessibility

- Use a combobox/dialog pattern with correct focus management.
- Keyboard: open, type, arrow navigation, enter, escape, and focus return.
- Announce result count/loading state without excessive screen-reader chatter.
- Show entity type/status/date context textually, not by icon/color alone.
- Avoid exposing sensitive result text in browser document title, URL, analytics, screenshots, or error reporting.
- Ensure no results state distinguishes “unauthorized” from “does not exist.”


## Mobile Search UX

### MVP scope

On mobile:

```text
Global search:
  Online -> Hono /v1/search
  Offline -> show unavailable/offline state plus locally searchable sections

Local scoped search:
  Search within current task/project/note list from PowerSync SQLite
```

Examples:

- Today: filter visible replicated tasks locally.
- Plan: search replicated active task titles locally.
- Notes: optionally search titles/local replicated note content if the offline replication policy already includes it.
- Calendar: filter current replicated date window.

Do not build an additional client fuzzy-search index for all personal data in MVP. It increases binary/DB size, indexing complexity, sync/revocation cleanup burden, and privacy exposure.

### Future offline global search

Reconsider only when:

- Product research proves offline discovery is a core user expectation.
- Replication policy has an explicit bounded text corpus.
- Device storage/performance budget is measured on lower-end devices.
- Account switching/deletion cleanup is tested.
- A local FTS/SQLite search index can be built and updated transactionally with replicated data.
- Note/calendar privacy policy permits that local data footprint.


## Meilisearch Reassessment

Meilisearch should become the next option if the team measures persistent shortcomings in PostgreSQL search:

- Latency exceeds target at realistic workspace/document size.
- Relevance tuning becomes difficult or insufficient.
- Users expect reliable typo tolerance and prefix/as-you-type search.
- Faceted filters and ranking rules grow substantially.
- Search load threatens primary database capacity.
- Search needs dedicated scaling and monitoring.

### 2026 Meilisearch Enhancements

Meilisearch has significantly evolved in 2026 with several important features:

**Distributed Search (v1.37+)**:
- Replicated sharding directly in the engine
- High availability via replication
- Breaking the single-machine limit
- Serverless indexes planned (Q3 2026) for multi-tenant SaaS with millions of tenants

**AI & Vector Search**:
- Stabilized HNSW-backed vector store (Hannoy)
- Improved embedding indexing performance (v1.38)
- Fragments API for multi-modal search (text + image)
- Hybrid search (keyword + semantic) with tunable ratio
- AI-generated document templates in Cloud UI

**Ranking & Relevance**:
- New ranking rules: `attributeRank` and `wordPosition` (v1.36)
- Search performance logs via `showPerformanceDetails` parameter
- Foreign keys feature for cross-index relationships (v1.39)
- Better Chinese segmentation via improved Charabia tokenizer

**Operations**:
- Index statistics visible in Cloud UI
- Exports API for data transfer without dumps/snapshots
- Prompt generator in Cloud UI for AI-powered search workflows

Meilisearch supports typo tolerance configuration, prefix search, and multi-criteria ranking.  Its default typo behavior can match misspelled words, but typo tolerance must be carefully configured for short names, identifiers, dates, and numbers to avoid false positives.[^10][^11][^12][^4]

### If adopting Meilisearch later

Use this architecture:

```text
PostgreSQL mutation
  -> transactional outbox
  -> search-index worker
  -> sanitized document upsert/delete to Meilisearch
  -> Hono search endpoint
  -> Meilisearch query restricted by trusted workspace filter
  -> Hono result validation/mapping
  -> client
```

Never expose an admin/master Meilisearch key to web or Expo clients. Use per-user/tenant search keys or proxy search through Hono. Maintain deletion reconciliation and index versioning, because external indexes are eventually consistent replicas.

## Semantic Search

Defer embeddings/vector search.

Potential future use cases:

- “Find my notes about annual planning.”
- “Show related past projects.”
- Natural-language retrieval across notes and tasks.

But it introduces:

- Embedding-provider data processing/privacy questions.
- Additional index/storage cost.
- Re-embedding/reconciliation lifecycle.
- Prompt-injection/content-safety concerns if used with AI features.
- Less transparent results than lexical search.
- More difficult deletion guarantees.

### 2026 Update: pgvector Path

If semantic search becomes necessary, **prefer pgvector over external vector databases** for Life OS:

**Why pgvector first**:
- Keeps embeddings in the same PostgreSQL database as all other data
- Maintains transactional consistency and single backup strategy
- No additional service to operate or monitor
- HNSW indexes provide production-ready ANN search
- Iterative scan (v0.8.0+) solves over-filtering with WHERE clauses
- Half-precision and binary quantization reduce storage costs
- Single authorization model (PostgreSQL RLS) applies to vectors

**Hybrid search approach**:
When semantic search is needed, implement hybrid lexical + semantic search:
1. Use PostgreSQL FTS for keyword matching (fast, deterministic)
2. Use pgvector for semantic similarity (captures intent)
3. Combine results with Reciprocal Rank Fusion (RRF) or weighted scoring
4. Apply workspace filtering at the SQL level

**Privacy-first embedding**:
- Evaluate self-hosted embedding models (e.g., via Ollama) before external providers
- If using external providers, ensure they don't train on personal content
- Consider client-side embedding generation for maximum privacy
- Maintain clear documentation of where embeddings are processed

First make lexical search fast, safe, relevant, and well-instrumented. Then evaluate hybrid lexical + semantic retrieval through pgvector with a privacy review before considering external vector databases.

## Performance Targets

Set measurable MVP targets:


| Metric | Initial target |
| :-- | :-- |
| Search endpoint p95, normal workspace | Under 300 ms server response |
| Command-palette perceived result time | Under 200 ms after debounce for title results |
| Full search result limit | 20 default, 50 maximum |
| Minimum global query length | 2–3 characters, depending on mode |
| Projection freshness after edit | Under 10 seconds normally; repair/reconciliation path for exceptions |
| Search API rate limit | Conservative per-user/workspace burst and sustained cap |
| Index growth monitoring | Track document count, GIN index size, query plans, slow query rate |

These are targets to validate with representative generated data, not assurances derived from a library choice.

## Observability

Track without logging raw user content:

```text
Search request count and latency
Query length bucket, not raw query
Entity-type/filter usage
Zero-result rate
Result-click rate only with privacy review
Projection lag and failed index jobs
Search document count by workspace/entity type
GIN/trigram index size and bloat
Slow-query plans and database resource use
Authorization denial/error rate
Rebuild/reconciliation outcomes
```

For debugging a user-reported result issue, use tightly controlled support tooling and explicit authorization; do not turn on broad raw-query or note-content logging.

## Testing

| Scenario | Required result |
| :-- | :-- |
| User searches workspace A | Results never include workspace B entity existence/title/snippet |
| Membership revoked | Search immediately excludes inaccessible workspace content after authorization update |
| Task/note update | Projection updates within target window; old terms no longer match after reconciliation |
| Delete/privacy hide | Document removed; no stale title/snippet remains |
| Queue failure | Repair job identifies and fixes missing/stale projection |
| Short/typo query | Controlled title/trigram behavior, no excessive result explosion |
| Special characters/quotes | Safe parsed query; no SQL/tsquery injection or crash |
| HTML/markdown note content | Snippets escaped; no XSS |
| Calendar sensitive fields | Only policy-approved content indexed/returned |
| Duplicate/out-of-order events | Idempotent version-based projection ends at authoritative state |
| Mobile offline | Scoped local search works; global search explains unavailable state |
| Account deletion | Search documents removed with workspace/account data |
| High-volume data | Query plan uses indexes; cursor pagination stable and performant |

## Trade-Offs

| Choice | Gain | Cost |
| :-- | :-- | :-- |
| PostgreSQL FTS + trigrams | One system, current authorization, low vendor/data exposure | More manual relevance/typo tuning |
| Search projection table | Fast, controlled query shape and safe result DTO | Eventual consistency and worker/rebuild work |
| Hono-only search endpoint | Stable API, centralized authorization, no exposed search credentials | No direct client search SDK convenience |
| Server global search | Smaller mobile replica/privacy footprint | No full offline global search initially |
| Local scoped mobile search | Useful offline filtering | Limited cross-entity discovery |
| Meilisearch deferred | Avoids premature infrastructure | May need migration if search grows rapidly |
| No raw query analytics | Protects personal intent/content | Less product-search tuning data |
| Semantic search deferred | Lower privacy/complexity risk | No natural-language discovery initially |

## Final Decision

Lock the following search architecture:

```text
MVP engine:                    PostgreSQL Full Text Search plus pg_trgm
Canonical index:               search_documents PostgreSQL projection table
Indexing path:                 Transactional outbox -> pg-boss worker -> idempotent projection upsert/delete
Search API:                    Hono GET /v1/search with validated query, filters, cursor, and workspace scope
Authorization:                 Hono membership enforcement plus database/RLS defense in depth
Ranking:                       Title/exact/FTS relevance with active-status and recency boosts
Snippets:                      Server-generated, escaped, bounded, and privacy-filtered
Indexed content:               Approved task/project/goal/area/note text; limited calendar titles initially
Excluded content:              Tokens, provider payloads, audit/billing/security data, attachment contents, sensitive calendar fields by default
Mobile:                        PowerSync-backed scoped local search; global search only online in MVP
Web:                           Debounced/cancelled Hono search through TanStack Query; accessible command palette and search page
Meilisearch:                   Deferred until measured quality/latency/scale need justifies a second index
pg_textsearch:                 Evaluate if standard FTS ranking proves inadequate (Postgres-native BM25)
pgvector:                       Prefer over external vector databases when semantic search is needed
Vector/semantic search:        Defer until lexical search is proven and privacy review complete
Analytics:                     Aggregated/redacted; raw search query logging disabled by default
```

### 2026 Decision Rationale

The PostgreSQL-first approach remains optimal for Life OS MVP because:

1. **Single database advantage**: All data (tasks, notes, calendar, search index) in PostgreSQL with transactional consistency and unified authorization
2. **Privacy by design**: No external indexing of personal content until proven necessary
3. **Mature ecosystem**: pg_trgm provides solid typo tolerance; pgvector offers a path to semantic search without leaving PostgreSQL
4. **Operational simplicity**: No additional services to monitor, scale, or secure
5. **Clear upgrade paths**: pg_textsearch for advanced BM25 ranking, Meilisearch for distributed search, pgvector for semantic search

The 2026 landscape confirms that PostgreSQL-native search capabilities have matured significantly, making the single-database approach even more compelling for a privacy-focused personal OS.

The next category in dependency order is **Observability, Logging \& Error Tracking**.
<span style="display:none">[^13][^14][^15][^16]</span>

<div align="center">⁂</div>

[^1]: https://www.postgresql.org/docs/current/datatype-textsearch.html

[^2]: https://www.postgresql.org/docs/current/textsearch-intro.html

[^3]: https://www.postgresql.org/docs/current/pgtrgm.html

[^4]: https://www.meilisearch.com/docs/capabilities/full_text_search/overview

[^5]: https://www.meilisearch.com/docs/capabilities/full_text_search/getting_started/basic_search

[^6]: https://www.postgresql.org/docs/current/textsearch-controls.html

[^7]: https://www.postgresql.org/docs/current/textsearch.html

[^8]: https://postgrespro.com/docs/postgresql/9.4/functions-textsearch

[^9]: https://supabase.com/docs/guides/database/postgres/row-level-security

[^10]: https://www.meilisearch.com/docs/resources/internals/typo_tolerance

[^11]: https://www.meilisearch.com/docs/capabilities/full_text_search/relevancy/typo_tolerance_settings

[^12]: https://www.meilisearch.com/blog/typo-tolerance

[^13]: https://www.meilisearch.com/docs/resources/demos/typo_tolerance

[^14]: https://www.pgcon.org/2007/schedule/attachments/12-fts.pdf

[^15]: https://meilisearch.org.cn/docs/learn/relevancy/typo_tolerance_settings

[^16]: https://www.meilisearch.com/docs/reference/api/settings/update-typotolerance

[^17]: https://www.postgresql.org/about/news/pg_textsearch-v10-3264/

[^18]: https://github.com/pgvector/pgvector

[^19]: https://pgxn.org/dist/vector/

[^20]: https://github.com/typesense/typesense/releases/tag/v30.0

[^21]: https://www.meilisearch.com/blog/March-2026-updates

