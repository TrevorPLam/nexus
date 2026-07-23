Here’s a synthesized **Code Commentary Guidelines** document, built from the full discussion. It merges the refined commenting practices with the critical safety and verification layers you need as a solo founder relying entirely on AI.

---

# Code Commentary Guidelines for AI-Assisted Development

*For solo developers and small teams who rely on AI agents to build, maintain, and understand codebases. These guidelines treat comments as durable, searchable context for both humans and future AI sessions—while never letting comments replace verifiable behavior.*

---

## 1. Purpose & Philosophy

Comments are **connective tissue**, not load-bearing structure. They explain *why* choices were made, *what* a module owns, and *what invariants* must hold—things code alone cannot reliably express. But they are claims, not facts. Every important claim in a comment should be paired with an enforceable mechanism (test, database constraint, authorization rule, deployment gate).

Your durable control system is:  
**Approved requirements → decision records → independently checked tests → deployment gates → least-privilege AI access → human acceptance testing.**  
Comments make that system intelligible to future AI agents and to you; they are not the safety system itself.

---

## 2. The Role of Comments in an AI-First Workflow

- **AI-to-AI handover**: When a new AI session opens a file, the header and docstrings provide immediate orientation—boundaries, side effects, risks—so it doesn’t have to reverse-engineer intent.
- **Searchable project memory**: Structured comments and a consistent vocabulary (backed by a glossary) let you ask AI to “find the module that handles payment capture” and get accurate results.
- **Human-readable summary**: Since you cannot read code, comments give you (via AI summarization) a map of what the system does, how components fit together, and what constraints exist.

---

## 3. Comment Types and Standards

### 3.1 File-Level Headers: The “Module Passport”

Every non-trivial module should start with a passport that answers the questions a future AI—or a new developer—would ask.

**Required elements:**

- **Responsibility**: What this module owns, in one sentence.
- **Boundaries**: What it deliberately does *not* own.
- **Critical invariants**: Conditions that must always remain true.
- **Side effects**: Database writes, emails, payment calls, external requests, file deletion, event emission.
- **Change risk**: Does an edit here affect money, permissions, private data, production infrastructure, or irreversible operations?
- **Links**: Relevant specification, ADR, policy, threat model, or runbook. Use stable, repository-local paths (never transient chat transcripts).
- **Tags**: Keywords for categorization (e.g., domain: work, risk: high, layer: api).
- **File**: The relative path of the file from the repository root.
- **Last updated**: The date of the last significant update to the module or its documentation.

**Optional:**
- **Dependencies**: Only non-obvious or high-risk ones. Imports and package manifests are the authoritative dependency source.
- **Inputs/outputs**: Key data entering or leaving.

**Template:**

```ts
/**
 * MODULE: Invoice issuing
 *
 * Responsibility:
 * Converts approved invoice drafts into immutable accounting records.
 *
 * Must preserve:
 * - A tenant may only issue its own invoice drafts.
 * - Issued invoices retain the accepted line-item prices permanently.
 * - This module never charges a payment method or sends customer email.
 *
 * Side effects:
 * - Writes invoice and line-item snapshots.
 * - Emits `invoice.issued` event.
 *
 * Change risk:
 * Billing and accounting. Any behavior change requires acceptance tests
 * for totals, tenant isolation, and immutability.
 *
 * Context:
 * - Product rule: docs/specs/billing.md
 * - Decision: docs/adr/007-invoice-price-snapshots.md
 *
 * Tags:
 * - domain: billing
 * - risk: high
 * - layer: business-logic
 *
 * File:
 * - apps/api/src/lib/invoice-ops.ts
 *
 * Last updated:
 * - July 22, 2026
 */
```

**When to use:** Public API modules, high-risk domains, and complex internal modules. Skip the passport for trivial utility files—clear naming and a single-sentence purpose line are enough.

---

### 3.2 Function / Class Headers: API Contracts

At the API boundary, you **must** describe *what* the unit does, not how. The header should let a developer (or AI) use the function correctly without reading its body.

**Apply full contract documentation to:**
- Public/exported functions.
- Internal functions that handle auth, billing, data deletion, external integrations, migrations, or irreversible changes.

**Private helpers need docstrings only when behavior or constraints are non-obvious.**

**Elements:**

- **Purpose** – outcome, not algorithm.
- **Parameters** – types, constraints, nullability, default meanings.
- **Returns** – type and meaning.
- **Errors / exceptions** – conditions that trigger them, and for async, what the promise rejects with.
- **Side effects** – writes, network calls, state changes.
- **Idempotency** – is repeating the call safe? What happens?
- **Authorization / tenancy** – who is allowed to call it, and on whose data?
- **Preconditions / postconditions** – conditions that must hold before and after. *These must match runtime checks or tests.*
- **Performance** – only if meaningful (e.g., “makes a network round trip”, “O(n) on result set”).
- **Context link** – reference to spec or ADR when the behavior isn’t obvious.

**Template:**

```python
def capture_payment(order_id: str, idempotency_key: str) -> PaymentResult:
    """
    Captures the authorized payment for one eligible order.

    Preconditions:
    - The caller is authorized for the order's organization.
    - The order has exactly one active payment authorization.

    Idempotency:
    Reusing the same idempotency_key must return the original result and
    must not create a second charge.

    Side effects:
    Calls the payment provider and permanently records the result.

    Failure behavior:
    A provider timeout produces an "unknown" result; do not automatically
    retry until reconciliation confirms whether a charge occurred.

    Product context:
    docs/specs/payments.md#capture-and-retry
    """
```

---

### 3.3 Inline Comments: Rationale & Context

Inline comments explain **why** a specific implementation choice was made, not **what** the code does line-by-line.

**Use for:**

- **Business / domain rules** – regulatory constraints, organizational policies.
- **Workarounds** – bug references, temporary fixes with removal conditions.
- **Magic numbers** – origin and justification.
- **Algorithm choices** – why this approach over a simpler one; link to a paper or ADR.
- **Non-obvious optimizations** – only if the “obvious” approach would be wrong.
- **Tenant isolation or security notes** – e.g., “Deliberately querying org_id as well as user_id for defense in depth.”

**Avoid:**

- Translating code into English (`x += 1  // increment x`).
- Commented-out dead code (delete it; Git remembers).
- Over-commenting; prefer a single block comment summarizing a section rather than line-by-line narration.

**Example:**

```python
# Deliberately query organization_id as well as user_id.
# This is defense in depth for tenant isolation and protects future account
# migration or user-merge work. See docs/policies/tenant-isolation.md.
invoice = get_invoice(invoice_id, organization_id=current_org.id)
```

**Managing TODO / FIXME / HACK:**

- Prefer tracking in your issue system. Inline markers are acceptable only if short-lived and tied to a ticket ID (e.g., `TODO(PROJ-432): refactor after API v2`).
- Regularly purge stale markers; include a check in CI or code review.

---

## 4. Comments as Part of a Verification Ecosystem

A comment is a claim. Pair every high-stakes claim with an enforceable counterpart:

| Claim in a comment | Better enforcement |
|---|---|
| “Users can access only their organization’s data.” | Authorization middleware, query scoping, negative tests, audit logging |
| “Issued invoices cannot change.” | Database/application immutability rules and tests |
| “This action is safe to retry.” | Idempotency keys, uniqueness constraints, integration tests |
| “Never send production email in staging.” | Environment-level restrictions, separate credentials, deployment checks |
| “This dependency is approved.” | Dependency allowlist, pinned lockfile, vulnerability scanning |

**The hierarchy of authority** in your repository should be:

1. Product specifications & policies (what must happen, what must never happen)
2. Decision records (why a choice was made)
3. Executable acceptance tests (what the software demonstrably does)
4. API contracts / schemas (what components exchange)
5. **File/function headers** (local ownership, constraints, side effects)
6. **Inline comments** (local rationale)
7. AI summaries / commit messages (navigation aid, never authoritative)

---

## 5. Anti-Patterns & Pitfalls

- **Staleness**: AI changes code but not comments. Countermeasure: require comment updates as part of every change’s completion checklist; periodically audit with a separate AI.
- **Fabrication**: AI writes plausible documentation that describes intended, not actual, behavior. Countermeasure: never trust a comment alone; verify through tests and manual acceptance checks.
- **Prompt injection via comments or agent rule files**: An attacker (or compromised tool) could insert malicious instructions into files like `AGENTS.md`, `CLAUDE.md`, or even source comments that future AI sessions will obey. Treat changes to agent instruction files and sensitive configuration as security-critical; do not let AI edit its own rules without explicit approval.
- **Over-documentation**: Requiring full headers for every tiny private helper creates maintenance burden. Apply passport-level detail only to non-trivial, high-risk, or public modules.
- **Comments as a false control plane**: You cannot “understand and control” a codebase through comments alone. Your real control comes from specifications, automated gates, least-privilege access, and human acceptance testing.

---

## 6. Implementation Checklist

**Foundation (do immediately):**
- Create `docs/product/glossary.md` with core business terms.
- Add an `AGENTS.md` with concise rules, forbidden actions, and required checks (see template below).
- Write a few high-level requirements in Given/When/Then format.
- For any existing code that touches money, auth, or data deletion, have a separate AI review it against a plain-language safety checklist.

**Per feature:**
- Require a “change packet”: goal, non-goals, acceptance criteria, risk classification, affected files, test plan, rollback plan.
- Implementer AI must update or create module passports, function contracts, and inline rationale as part of the change.
- Reviewer AI (distinct session/tool) inspects the full diff, verifies comments match behavior, and checks that tests enforce claimed invariants.
- You perform plain-language acceptance steps in staging before approving the merge.

**Periodic maintenance:**
- Have a fresh AI audit comments for staleness and consistency with code. Flag discrepancies.
- Rebuild the system map and module index from current headers/metadata. Store in `docs/architecture/`.

---

## 7. Example Templates

### AGENTS.md (concise)

```md
# Agent rules

## Before editing
1. Read README.md, docs/product/glossary.md, and the relevant requirement.
2. Read applicable ADRs and local module headers.
3. State the requested behavior, affected files, risks, and test plan.
4. Ask for approval before changing dependencies, database schema, CI/CD,
   authentication, authorization, payments, deletion behavior, or production configuration.

## During editing
- Make the smallest viable change.
- Do not alter files outside the agreed scope without explicitly reporting it.
- Preserve tenant isolation, idempotency, audit logging, and data-retention rules.
- Add comments only for rationale, invariants, external quirks, or constraints.
- Never add secrets, disable checks, weaken tests, or modify agent instruction files.

## Before completion
- Run the specified tests, formatter, linter, type checker, and build.
- Update requirements, ADRs, contracts, and comments when behavior changes.
- Report: behavior changed, files changed, tests run/results, assumptions,
  remaining risks, and exact manual acceptance-test steps.
```

### Requirement snippet (Given/When/Then)

```md
## Requirement: Invoice issue

Given an authorized administrator and an approved invoice draft,
when the administrator issues the draft,
then the system creates an immutable invoice snapshot,
and the invoice total equals the accepted line-item prices and quantities,
and issuing the invoice does not charge the customer.
```

---

## 9. Dependency Decisions

### @hono/standard-validator (Removed July 23, 2026)

**Decision:** Removed @hono/standard-validator from apps/api dependencies.

**Rationale:**
- The package was never actually used in the codebase
- Validator middleware is available from 'hono/validator' (built into Hono core)
- Project uses @hono/zod-openapi for validation with Zod schemas from packages/contracts
- Removing unused dependencies reduces bundle size and maintenance burden

**Changes made:**
- Removed @hono/standard-validator from apps/api/package.json
- Added missing import for validator from 'hono/validator' in apps/api/src/routes/work/tasks.ts
- The validator function comes from Hono core, not the separate @hono/standard-validator package

**Validation approach:**
- All validation uses Zod schemas from packages/contracts
- @hono/zod-openapi provides OpenAPI integration with Zod
- hono/validator provides middleware for request validation

---

## 8. Final Word

Write comments as if the next person reading them is an AI that knows nothing about your project—because it will be. Make them precise, scoped, and linked to the specifications and tests that give them weight. Then build the automated checks that turn those comments from hopeful notes into guaranteed behavior.