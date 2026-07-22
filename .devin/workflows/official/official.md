> ## Documentation Index
> Fetch the complete documentation index at: https://docs.devin.ai/llms.txt
> Use this file to discover all available pages before exploring further.

# Workflows

> Automate repetitive tasks in Cascade with reusable workflows defined as markdown files. Create PR review, deployment, testing, and code formatting workflows.

Workflows enable users to define a series of steps to guide Cascade through a repetitive set of tasks, such as deploying a service or responding to PR comments.

These Workflows are saved as markdown files, allowing users and their teams an easy repeatable way to run key processes.

Once saved, Workflows can be invoked in Cascade via a slash command with the format of `/[name-of-workflow]`.

<Note>
  Workflows are **manual-only** — Cascade will never invoke a workflow automatically. If you want Cascade to pick up a procedure on its own, use a [Skill](/desktop/cascade/skills) instead.
</Note>

## How it works

Rules generally provide large language models with guidance by providing persistent, reusable context at the prompt level.

Workflows extend this concept by providing a structured sequence of steps or prompts at the trajectory level, guiding the model through a series of interconnected tasks or actions.

<Frame>
  <img style={{ maxHeight: "400px" }} src="https://mintcdn.com/cognitionai/hxeMffzXgF_RWx-U/desktop/assets/windsurf/cascade/use-workflow-pr.png?fit=max&auto=format&n=hxeMffzXgF_RWx-U&q=85&s=92b4125d6d17f2a25ffea890592331fc" width="718" height="510" data-path="desktop/assets/windsurf/cascade/use-workflow-pr.png" />
</Frame>

To execute a Workflow, users simply invoke it in Cascade using the `/[workflow-name]` command.

<Tip>You can call other Workflows from within a Workflow! <br /><br />For example, /workflow-1 can include instructions like "Call /workflow-2" and "Call /workflow-3".</Tip>

Upon invocation, Cascade sequentially processes each step defined in the Workflow, performing actions or generating responses as specified.

## How to create a Workflow

To get started with Workflows, click on the `Customizations` icon in the top right slider menu in Cascade, then navigate to the `Workflows` panel. Here, you can click on the `+ Workflow` button to create a new Workflow.

Workflows are saved as markdown files within `.windsurf/workflows/` directories and contain a title, description, and a series of steps with specific instructions for Cascade to follow.

## Workflow Discovery

Devin Desktop automatically discovers workflows from multiple locations to provide flexible organization:

* **Current workspace and sub-directories**: All `.windsurf/workflows/` directories within your current workspace and its sub-directories
* **Git repository structure**: For git repositories, Devin Desktop also searches up to the git root directory to find workflows in parent directories
* **Multiple workspace support**: When multiple folders are open in the same workspace, workflows are deduplicated and displayed with the shortest relative path

### Workflow Storage Locations

| Scope                                                     | Location                                      | Notes                                                                                                               |
| --------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Workspace                                                 | `.windsurf/workflows/*.md`                    | In your current workspace, any sub-directory, or any parent directory up to the git root. Committed with your repo. |
| Global                                                    | `~/.codeium/windsurf/global_workflows/*.md`   | Available in every workspace on your machine. Not committed.                                                        |
| Built-in                                                  | Managed by Devin Desktop                      | Templates shipped with Devin Desktop (e.g. `/plan`).                                                                |
| [System (Enterprise)](#system-level-workflows-enterprise) | OS-specific (e.g. `/etc/windsurf/workflows/`) | Deployed by IT, read-only for end users.                                                                            |

When you create a new workflow through the UI, it will be saved in the `.windsurf/workflows/` directory of your current workspace, not necessarily at the git root. To create a global workflow, use the `+ Global` button in the Workflows panel or create the file directly in `~/.codeium/windsurf/global_workflows/`.

Workflow files are limited to 12000 characters each.

<video autoPlay controls muted loop playsInline className="w-full aspect-video" src="https://mintcdn.com/cognitionai/hxeMffzXgF_RWx-U/desktop/assets/windsurf/cascade/create-workflow.mp4?fit=max&auto=format&n=hxeMffzXgF_RWx-U&q=85&s=b0f3d54a0d24966384a91042468f72bf" data-path="desktop/assets/windsurf/cascade/create-workflow.mp4" />

### Generate a Workflow with Cascade

You can also ask Cascade to generate Workflows for you! This works particularly well for Workflows involving a series of steps in a particular CLI tool.

<video autoPlay controls muted loop playsInline className="w-full aspect-video" src="https://mintcdn.com/cognitionai/hxeMffzXgF_RWx-U/desktop/assets/windsurf/cascade/create-workflow-with-cascade.mp4?fit=max&auto=format&n=hxeMffzXgF_RWx-U&q=85&s=f14c9012ab0e92d631b808072c439f60" data-path="desktop/assets/windsurf/cascade/create-workflow-with-cascade.mp4" />

## Example Workflows

There are a myriad of use cases for Workflows, such as:

<Card title="/address-pr-comments">
  This is a Workflow our team uses internally to address PR comments:

  ```
  1. Check out the PR branch: `gh pr checkout [id]`

  2. Get comments on PR

   bash
   gh api --paginate repos/[owner]/[repo]/pulls/[id]/comments | jq '.[] | {user: .user.login, body, path, line, original_line, created_at, in_reply_to_id, pull_request_review_id, commit_id}'

  3. For EACH comment, do the following. Remember to address one comment at a time.
   a. Print out the following: "(index). From [user] on [file]:[lines] — [body]"
   b. Analyze the file and the line range.
   c. If you don't understand the comment, do not make a change. Just ask me for clarification, or to implement it myself.
   d. If you think you can make the change, make the change BEFORE moving onto the next comment.

  4. After all comments are processed, summarize what you did, and which comments need the USER's attention.
  ```
</Card>

<Card title="/git-workflows">
  Commit using predefined formats and create pull requests with standardized title and descriptions using the appropriate CLI commands.
</Card>

<Card title="/dependency-management">
  Automate the installation or updating of project dependencies based on a configuration file (e.g., requirements.txt, package.json).
</Card>

<Card title="/code-formatting">
  Automatically run code formatters (like Prettier, Black) and linters (like ESLint, Flake8) on file save or before committing to maintain code style and catch errors early.
</Card>

<Card title="/run-tests-and-fix">
  Run or add unit or end-to-end tests and fix the errors automatically to ensure code quality before committing, merging, or deploying.
</Card>

<Card title="/deployment">
  Automate the steps to deploy your application to various environments (development, staging, production), including any necessary pre-deployment checks or post-deployment verifications.
</Card>

<Card title="/security-scan">
  Integrate and trigger security vulnerability scans on your codebase as part of the CI/CD pipeline or on demand.
</Card>

## System-Level Workflows (Enterprise)

Enterprise organizations can deploy system-level workflows that are available globally across all workspaces and cannot be modified by end users without administrator permissions. This is ideal for enforcing organization-wide development processes, deployment procedures, and compliance workflows.

System-level workflows are loaded from OS-specific directories:

**macOS:**

```
/Library/Application Support/Windsurf/workflows/*.md
```

**Linux/WSL:**

```
/etc/windsurf/workflows/*.md
```

**Windows:**

```
C:\ProgramData\Windsurf\workflows\*.md
```

Place your workflow files (as `.md` files) in the appropriate directory for your operating system. The system will automatically load all `.md` files from these directories.

### Workflow Precedence

When workflows with the same name exist at multiple levels, system-level workflows take the highest precedence:

1. **System** (highest priority) - Organization-wide workflows deployed by IT
2. **Workspace** - Project-specific workflows in `.windsurf/workflows/`
3. **Global** - User-defined workflows in `~/.codeium/windsurf/global_workflows/`
4. **Built-in** - Default workflows provided by Devin Desktop

This means that if an organization deploys a system-level workflow with a specific name, it will override any workspace, global, or built-in workflow with the same name.

In the Devin Desktop UI, system-level workflows are displayed with a "System" label and cannot be deleted by end users.

<Note>
  **Important**: System-level workflows should be managed by your IT or security team. Ensure your internal teams handle deployment, updates, and compliance according to your organization's policies. You can use standard tools and workflows such as Mobile Device Management (MDM) or Configuration Management to do so.
</Note>

> ## Documentation Index
> Fetch the complete documentation index at: https://docs.devin.ai/llms.txt
> Use this file to discover all available pages before exploring further.

# Skills

> Skills help Cascade handle complex, multi-step tasks.

The hardest engineering tasks often take more than just good prompts. They might require reference scripts, templates, checklists, and other supporting files. Skills let you bundle all of these together into folders that Cascade can invoke (read and use).

Skills are a great way to teach Cascade how to execute multi-step workflows consistently.

Cascade uses [**progressive disclosure**](https://agentskills.io/what-are-skills#how-skills-work): only the skill's `name` and `description` are shown to the model by default. The full `SKILL.md` content and supporting files are loaded **only when Cascade decides to invoke the skill** (or when you `@mention` it). This keeps your context window lean even with many skills defined.

For more details on the Skills specification, visit [agentskills.io](https://agentskills.io/home).

## How to Create a Skill

### Using the UI (easiest)

1. Open the Cascade panel
2. Click the three dots in the top right of the panel to open up the customizations menu
3. Click on the `Skills` section
4. Click `+ Workspace` to create a workspace (project-specific) skill, or `+ Global` to create a global skill
5. Name the skill (lowercase letters, numbers, and hyphens only)

### Manual Creation

**Workspace Skill (project-specific):**

1. Create a directory: `.windsurf/skills/<skill-name>/`
2. Add a `SKILL.md` file with YAML frontmatter

**Global Skill (available in all workspaces):**

1. Create a directory: `~/.codeium/windsurf/skills/<skill-name>/`
2. Add a `SKILL.md` file with YAML frontmatter

## SKILL.md File Format

Each skill requires a `SKILL.md` file with YAML frontmatter containing the skill's metadata:

### Example skill

```markdown theme={null}
---
name: deploy-to-production
description: Guides the deployment process to production with safety checks
---

## Pre-deployment Checklist
1. Run all tests
2. Check for uncommitted changes
3. Verify environment variables

## Deployment Steps
Follow these steps to deploy safely...

[Reference supporting files in this directory as needed]
```

### Required Frontmatter Fields

* **name**: Unique identifier for the skill (displayed in UI and used for @-mentions)
* **description**: Brief explanation shown to the model to help it decide when to invoke the skill

Examples of valid names: `deploy-to-staging`, `code-review`, `setup-dev-environment`

## Adding Supporting Resources

Place any supporting files in the skill folder alongside `SKILL.md`. These files become available to Cascade when the skill is invoked:

```
.windsurf/skills/deploy-to-production/
├── SKILL.md
├── deployment-checklist.md
├── rollback-procedure.md
└── config-template.yaml
```

## Invoking Skills

### Automatic Invocation

When your request matches a skill's description, Cascade automatically invokes the skill and uses its instructions and resources to complete the task. This is the most common way skills are used—you simply describe what you want to do, and Cascade determines which skills are relevant.

The `description` field in your skill's frontmatter is key: it helps Cascade understand when to invoke the skill. Write descriptions that clearly explain what the skill does and when it should be used.

### Manual Invocation

You can always explicitly activate a skill by typing `@skill-name` in the Cascade input. This is useful when you want to ensure a specific skill is used, or when you want to invoke a skill that might not be automatically triggered by your request.

## Skill Scopes

| Scope               | Location                      | Availability                                      |
| ------------------- | ----------------------------- | ------------------------------------------------- |
| Workspace           | `.windsurf/skills/`           | Current workspace only. Committed with your repo. |
| Global              | `~/.codeium/windsurf/skills/` | All workspaces on your machine. Not committed.    |
| System (Enterprise) | OS-specific (see below)       | All workspaces, deployed by IT. Read-only.        |

<Note>
  For cross-agent compatibility, Devin Desktop also discovers skills in `.agents/skills/` and `~/.agents/skills/`. If you have enabled Claude Code config reading, `.claude/skills/` and `~/.claude/skills/` are scanned as well.
</Note>

### System-Level Skills (Enterprise)

Enterprise organizations can deploy skills that are available across all workspaces and cannot be modified by end users:

| OS        | Path                                            |
| --------- | ----------------------------------------------- |
| macOS     | `/Library/Application Support/Windsurf/skills/` |
| Linux/WSL | `/etc/windsurf/skills/`                         |
| Windows   | `C:\ProgramData\Windsurf\skills\`               |

Each skill is a subdirectory containing a `SKILL.md` file, just like workspace skills.

## Example Use Cases

### Deployment Workflow

Create a skill with deployment scripts, environment configs, and rollback procedures:

```
.windsurf/skills/deploy-staging/
├── SKILL.md
├── pre-deploy-checks.sh
├── environment-template.env
└── rollback-steps.md
```

### Code Review Guidelines

Include style guides, security checklists, and review templates:

```
.windsurf/skills/code-review/
├── SKILL.md
├── style-guide.md
├── security-checklist.md
└── review-template.md
```

### Testing Procedures

Bundle test templates, coverage requirements, and CI/CD configs:

```
.windsurf/skills/run-tests/
├── SKILL.md
├── test-template.py
├── coverage-config.json
└── ci-workflow.yaml
```

## Best Practices

1. **Write clear descriptions**: The description helps Cascade decide when to invoke the skill. Be specific about what the skill does and when it should be used.

2. **Include relevant resources**: Templates, checklists, and examples make skills more useful. Think about what files would help someone complete the task.

3. **Use descriptive names**: `deploy-to-staging` is better than `deploy1`. Names should clearly indicate what the skill does.

## Skills vs Rules vs Workflows

All three customize Cascade, but they differ in **structure**, **invocation**, and **context cost**:

|                       | Skills                                                                   | Rules                                              | Workflows                                |
| --------------------- | ------------------------------------------------------------------------ | -------------------------------------------------- | ---------------------------------------- |
| **Purpose**           | Multi-step procedures with supporting files                              | Behavioral guidelines ("how to behave")            | Prompt templates for repeatable tasks    |
| **Structure**         | Folder with `SKILL.md` + any resource files                              | Single `.md` file with frontmatter                 | Single `.md` file                        |
| **Invocation**        | Model decides (progressive disclosure) or `@mention`                     | `always_on` / `glob` / `model_decision` / `manual` | **Manual only** via `/slash-command`     |
| **In system prompt?** | No — only name + description until invoked                               | Depends on activation mode                         | No — listed as available commands        |
| **Best for**          | Deployments, code review, testing procedures that need scripts/templates | Coding style, project conventions, constraints     | One-shot runbooks you trigger explicitly |

**Rule of thumb:** if Cascade should pick it up automatically *and* it needs supporting files, use a Skill. If it's a short behavioral constraint, use a Rule. If you always want to trigger it yourself, use a Workflow.

## Related Documentation

If Skills aren't what you're looking for, check out these other Cascade features:

* **[Workflows](./workflows)** - Automate repetitive tasks with reusable markdown workflows invoked via slash commands
* **[AGENTS.md](./agents-md)** - Provide directory-scoped instructions that automatically apply based on file location
* **[Memories & Rules](./memories)** - Persist context across conversations with auto-generated memories and user-defined rules

> ## Documentation Index
> Fetch the complete documentation index at: https://docs.devin.ai/llms.txt
> Use this file to discover all available pages before exploring further.

# AGENTS.md

> Create AGENTS.md files to provide directory-scoped instructions to Cascade. Instructions automatically apply based on file location in your project.

`AGENTS.md` files provide a simple way to give Cascade context-aware instructions that automatically apply based on where the file is located in your project. This is particularly useful for providing directory-specific coding guidelines, architectural decisions, or project conventions.

## How It Works

When you create an `AGENTS.md` file (or `agents.md`), Devin Desktop automatically discovers it and feeds it into the same [Rules](/desktop/cascade/memories#rules) engine that powers `.devin/rules/` (and the legacy `.windsurf/rules/`) — just with the activation mode inferred from the file's location instead of frontmatter:

* **Root directory**: Treated as an **always-on** rule — the full content is included in Cascade's system prompt on every message.
* **Subdirectories**: Treated as a **glob** rule with an auto-generated pattern of `<directory>/**` — the content is applied only when Cascade reads or edits files inside that directory.

This location-based scoping makes `AGENTS.md` ideal for providing targeted guidance without cluttering a single global configuration file.

## Creating an AGENTS.md File

Simply create a file named `AGENTS.md` or `agents.md` in the desired directory. The file uses plain markdown with no special frontmatter required.

### Example Structure

```
my-project/
├── AGENTS.md                    # Global instructions for the entire project
├── frontend/
│   ├── AGENTS.md                # Instructions specific to frontend code
│   └── src/
│       └── components/
│           └── AGENTS.md        # Instructions specific to components
├── backend/
│   └── AGENTS.md                # Instructions specific to backend code
└── docs/
    └── AGENTS.md                # Instructions for documentation
```

### Example Content

Here's an example `AGENTS.md` file for a React components directory:

```markdown theme={null}
# Component Guidelines

When working with components in this directory:

- Use functional components with hooks
- Follow the naming convention: ComponentName.tsx for components, useHookName.ts for hooks
- Each component should have a corresponding test file: ComponentName.test.tsx
- Use CSS modules for styling: ComponentName.module.css
- Export components as named exports, not default exports

## File Structure

Each component folder should contain:
- The main component file
- A test file
- A styles file (if needed)
- An index.ts for re-exports
```

## Discovery and Scoping

Devin Desktop automatically discovers `AGENTS.md` files throughout your workspace:

* **Workspace scanning**: All `AGENTS.md` files within your workspace and its subdirectories are discovered
* **Git repository support**: For git repositories, Devin Desktop also searches parent directories up to the git root
* **Case insensitive**: Both `AGENTS.md` and `agents.md` are recognized

### Automatic Scoping

The key benefit of `AGENTS.md` is automatic scoping based on file location:

| File Location           | Scope                                                        |
| ----------------------- | ------------------------------------------------------------ |
| Workspace root          | Applies to all files (always on)                             |
| `/frontend/`            | Applies when working with files in `/frontend/**`            |
| `/frontend/components/` | Applies when working with files in `/frontend/components/**` |

This means you can have multiple `AGENTS.md` files at different levels, each providing increasingly specific guidance for their respective directories.

## Best Practices

To get the most out of `AGENTS.md` files:

* **Keep instructions focused**: Each `AGENTS.md` should contain instructions relevant to its directory's purpose
* **Use clear formatting**: Bullet points, headers, and code blocks make instructions easier for Cascade to follow
* **Be specific**: Concrete examples and explicit conventions work better than vague guidelines
* **Avoid redundancy**: Don't repeat global instructions in subdirectory files; they inherit from parent directories

### Content Guidelines

```markdown theme={null}
# Good Example
- Use TypeScript strict mode
- All API responses must include error handling
- Follow REST naming conventions for endpoints

# Less Effective Example
- Write good code
- Be careful with errors
- Use best practices
```

## Comparison with Rules

While both `AGENTS.md` and [Rules](/desktop/cascade/memories#rules) provide instructions to Cascade, they serve different purposes:

| Feature  | AGENTS.md                        | Rules                                                    |
| -------- | -------------------------------- | -------------------------------------------------------- |
| Location | In project directories           | `.devin/rules/` (or legacy `.windsurf/rules/`) or global |
| Scoping  | Automatic based on file location | Manual (glob, always on, model decision, manual)         |
| Format   | Plain markdown                   | Markdown with frontmatter                                |
| Best for | Directory-specific conventions   | Cross-cutting concerns, complex activation logic         |

Use `AGENTS.md` when you want simple, location-based instructions. Use Rules when you need more control over when and how instructions are applied.

> ## Documentation Index
> Fetch the complete documentation index at: https://docs.devin.ai/llms.txt
> Use this file to discover all available pages before exploring further.

# Memories & Rules

> Persist context across Cascade conversations with auto-generated memories and user-defined rules at global, workspace, and system levels for enterprise teams.

`Memories` is the system for sharing and persisting context across conversations.

There are two mechanisms for this in Devin Desktop: **Memories**, which are automatically generated by Cascade, and **Rules**, which are manually defined by the user at the global, workspace, or system level.

## Memories, Rules, Workflows, or Skills?

Devin Desktop offers several ways to customize Cascade. Use this table to pick the right one:

| Feature                                     | What it does                                                             | How it's activated                                                                  | When to use it                                                                       |
| ------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **[Rules](#rules)**                         | Tell Cascade *how to behave* (e.g. "use bun, not npm")                   | `always_on`, `glob`, `model_decision`, or `manual` ([see below](#activation-modes)) | Coding conventions, style guides, project constraints                                |
| **[AGENTS.md](/desktop/cascade/agents-md)** | Location-scoped rules with zero config                                   | Automatic — root = always-on, subdirectory = glob                                   | Directory-specific conventions without frontmatter                                   |
| **[Workflows](/desktop/cascade/workflows)** | Prompt templates for repeatable multi-step tasks                         | **Manual only** via `/[workflow-name]` slash command                                | Deployments, PR reviews, release checklists                                          |
| **[Skills](/desktop/cascade/skills)**       | Multi-step procedures bundled with supporting files (scripts, templates) | Dynamically invoked by the model, or `@mention`                                     | Complex tasks where Cascade needs reference files — **invest here**                  |
| **[Memories](#memories)**                   | Context Cascade auto-generates during conversations                      | Automatic retrieval when relevant                                                   | Let Cascade remember one-off facts; for durable knowledge, prefer Rules or AGENTS.md |

<Tip>
  **Recommendation:** For knowledge you want Cascade to reliably reuse, write it as a Rule or add it to `AGENTS.md` in your repo rather than relying on auto-generated Memories. Rules are version-controlled, shareable with your team, and give you explicit control over activation.
</Tip>

## How to Manage Memories

Memories and Rules can be accessed and configured at any time by clicking on the `Customizations` icon in the top right slider menu in Cascade, or via “Devin - Settings” in the bottom-right hand corner. To edit an existing memory, simply click into it and then click the `Edit` button.

<video autoPlay controls muted loop playsInline className="aspect-video" src="https://mintcdn.com/cognitionai/hxeMffzXgF_RWx-U/desktop/assets/windsurf/cascade/memories-rules.mp4?fit=max&auto=format&n=hxeMffzXgF_RWx-U&q=85&s=f264942bd2e40966555454624f1958b4" data-path="desktop/assets/windsurf/cascade/memories-rules.mp4" />

## Memories

During conversation, Cascade can automatically generate and store memories if it encounters context that it believes is useful to remember.

Additionally, you can ask Cascade to create a memory at any time. Just prompt Cascade to "create a memory of ...".

Cascade's autogenerated memories are associated with the workspace they were created in and are stored locally in `~/.codeium/windsurf/memories/`. Cascade retrieves them when it believes they're relevant. Memories generated in one workspace are not available in another, and they are not committed to your repository.

<Tip>Creating and using auto-generated memories do NOT consume credits.</Tip>

<Note>
  Auto-generated memories live only on your machine. If you want Cascade to remember something durably — and share it with your team — ask Cascade to write it to a [Rule](#rules) in `.devin/rules/` (or the legacy `.windsurf/rules/`) or to your repo's `AGENTS.md` instead.
</Note>

## Rules

Users can explicitly define their own rules for Cascade to follow.

Rules can be defined at the global, workspace, or system level, and can also be inferred from [AGENTS.md](/desktop/cascade/agents-md) files.

| Scope                                                 | Location                                                              | Notes                                                                                                                                                                                               |
| ----------------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Global                                                | `~/.codeium/windsurf/memories/global_rules.md`                        | Single file, applied across all workspaces. Always on. Limited to 6,000 characters.                                                                                                                 |
| Workspace                                             | `.devin/rules/*.md` (preferred) or `.windsurf/rules/*.md` (fallback)  | One file per rule, each with its own [activation mode](#activation-modes). Limited to 12,000 characters per file. The legacy single-file `.windsurfrules` at the workspace root is also still read. |
| [AGENTS.md](/desktop/cascade/agents-md)               | Any directory in your workspace                                       | Processed by the same Rules engine — root-level = always-on, subdirectory = auto-glob for that directory.                                                                                           |
| [System (Enterprise)](#system-level-rules-enterprise) | OS-specific (e.g. `/etc/devin/rules/`, legacy `/etc/windsurf/rules/`) | Deployed by IT, read-only for end users.                                                                                                                                                            |

## Rules Discovery

Devin Desktop automatically discovers rules from multiple locations to provide flexible organization. The `.devin/` directory is the preferred location and takes precedence, with `.windsurf/` kept as a fallback for backward compatibility:

* **Current workspace and sub-directories**: All `.devin/rules` (and legacy `.windsurf/rules`) directories within your current workspace and its sub-directories
* **Git repository structure**: For git repositories, Devin Desktop also searches up to the git root directory to find rules in parent directories
* **Multiple workspace support**: When multiple folders are open in the same workspace, rules are deduplicated and displayed with the shortest relative path

### Rules Storage Locations

Rules can be stored in any of these locations (`.devin/` is preferred and takes precedence over `.windsurf/`):

* `.devin/rules` or `.windsurf/rules` in your current workspace directory
* `.devin/rules` or `.windsurf/rules` in any sub-directory of your workspace
* `.devin/rules` or `.windsurf/rules` in parent directories up to the git root (for git repositories)

When you create a new rule, it will be saved in the `.devin/rules` directory of your current workspace, not necessarily at the git root.

To get started with Rules, click on the `Customizations` icon in the top right slider menu in Cascade, then navigate to the `Rules` panel. Here, you can click on the `+ Global` or `+ Workspace` button to create new rules at either the global or workspace level, respectively.

<Tip>You can find example rule templates curated by the Devin Desktop team at [https://windsurf.com/editor/directory](https://windsurf.com/editor/directory) to help you get started.</Tip>

Workspace rule files are limited to 12,000 characters each. The global rules file is limited to 6,000 characters.

### Activation Modes

Each workspace rule declares an activation mode in its frontmatter via the `trigger` field. This controls **when** the rule's content is given to Cascade and **how much context window it consumes**:

| Mode               | `trigger:` value | How it reaches Cascade                                                                                                              | Context cost                               |
| ------------------ | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| **Always On**      | `always_on`      | Full rule content is included in the system prompt on every message.                                                                | Every message                              |
| **Model Decision** | `model_decision` | Only the `description` is shown in the system prompt. Cascade reads the full rule file when it decides the description is relevant. | Description always; full content on demand |
| **Glob**           | `glob`           | Rule is applied when Cascade reads or edits a file matching the `globs` pattern (e.g. `*.js`, `src/**/*.ts`).                       | Only when matching files are touched       |
| **Manual**         | `manual`         | Rule is **not** in the system prompt. You activate it by typing `@rule-name` in the Cascade input box.                              | Only when @mentioned                       |

<Note>
  The global rules file (`global_rules.md`) and root-level `AGENTS.md` files don't use frontmatter — they are always on.
</Note>

Example workspace rule with frontmatter:

```markdown theme={null}
---
trigger: glob
globs: **/*.test.ts
---

All test files must use `describe`/`it` blocks and mock external API calls.
```

### Best Practices

To help Cascade follow your rules effectively, follow these best practices:

* Keep rules simple, concise, and specific. Rules that are too long or vague may confuse Cascade.
* There's no need to add generic rules (e.g. "write good code"), as these are already baked into Cascade's training data.
* Format your rules using bullet points, numbered lists, and markdown. These are easier for Cascade to follow compared to a long paragraph. For example:

```
# Coding Guidelines 
- My project's programming language is python
- Use early returns when possible
- Always add documentation when creating new functions and classes
```

* XML tags can be an effective way to communicate and group similar rules together. For example:

```
<coding_guidelines>
- My project's programming language is python
- Use early returns when possible
- Always add documentation when creating new functions and classes
</coding_guidelines>
```

## System-Level Rules (Enterprise)

Enterprise organizations can deploy system-level rules that apply globally across all workspaces and cannot be modified by end users without administrator permissions. This is ideal for enforcing organization-wide coding standards, security policies, and compliance requirements.

System-level rules are loaded from OS-specific directories. The `Devin` directory is preferred and takes precedence, with the legacy `Windsurf` directory kept as a fallback:

**macOS:**

```
/Library/Application Support/Devin/rules/*.md
/Library/Application Support/Windsurf/rules/*.md   # legacy fallback
```

**Linux/WSL:**

```
/etc/devin/rules/*.md
/etc/windsurf/rules/*.md   # legacy fallback
```

**Windows:**

```
C:\ProgramData\Devin\rules\*.md
C:\ProgramData\Windsurf\rules\*.md   # legacy fallback
```

Place your rule files (as `.md` files) in the appropriate directory for your operating system. The system will automatically load all `.md` files from these directories.

### How System Rules Work

System-level rules are merged with workspace and global rules, providing additional context to Cascade without overriding user-defined rules. This allows organizations to establish baseline standards while still permitting teams to add project-specific customizations.

In the Devin Desktop UI, system-level rules are displayed with a "System" label and cannot be deleted by end users.

<Note>
  **Important**: System-level rules should be managed by your IT or security team. Ensure your internal teams handle deployment, updates, and compliance according to your organization's policies. You can use standard tools and workflows such as Mobile Device Management (MDM) or Configuration Management to do so.
</Note>

> ## Documentation Index
> Fetch the complete documentation index at: https://docs.devin.ai/llms.txt
> Use this file to discover all available pages before exploring further.

# Context Awareness for Devin Desktop

> Devin Desktop's RAG-based context engine indexes your codebase for intelligent code suggestions. Supports remote repositories for Teams and Enterprise.

Devin Desktop's context engine builds a deep understanding of your codebase, past actions, and next intent.

Historically, code-generation approaches focused on fine-tuning large language models (LLMs) on a codebase,
which is difficult to scale to the needs of every individual user.
A more recent and popular approach leverages retrieval-augmented generation (RAG),
which focuses on techniques to construct highly relevant, context-rich prompts
to elicit accurate answers from an LLM.

We've implemented an optimized RAG approach to codebase context,
which produces higher quality suggestions and fewer hallucinations.

<Note>
  Devin Desktop offers full fine-tuning for enterprises, and the best solution
  combines fine-tuning with RAG.
</Note>

## Default Context

Out of the box, Devin Desktop takes multiple relevant sources of context into consideration.

* The current file and other open files in your IDE, which are often very relevant to the code you are currently writing.
* The entire local codebase is then indexed (including files that are not open),
  and relevant code snippets are sourced by Devin Desktop's retrieval engine as you write code, ask questions, or invoke commands.
* For Pro users, we offer expanded context lengths, increased indexing limits, and higher limits on custom context and pinned context items.
* For Teams and Enterprise users, Devin Desktop can also index remote repositories.
  This is useful for companies whose development organization works across multiple repositories.

## Chat-Specific Context Features

When conversing with Devin Desktop Chat, you have various ways of leveraging codebase context,
like [@-mentions](/desktop/chat/overview#mentions) or custom guidelines.
See the [Chat page](/desktop/chat/overview) for more information.

<video autoPlay muted loop playsInline className="w-full aspect-video" src="https://exafunction.github.io/public/videos/chat/inline-mention.mp4" />

## Frequently Asked Questions (FAQs)

### Does Devin Desktop index my codebase?

Yes, Devin Desktop does index your codebase. It also uses LLMs to perform retrieval-augmented generation (RAG) on your codebase using our own [M-Query](https://youtu.be/DuZXbinJ4Uc?feature=shared\&t=606) techniques.

Indexing performance and features vary based on your workflow and your Devin Desktop plan. For more information, please visit our [context awareness page](https://windsurf.com/context).

> ## Documentation Index
> Fetch the complete documentation index at: https://docs.devin.ai/llms.txt
> Use this file to discover all available pages before exploring further.

# Fast Context

> Fast Context is a specialized subagent that retrieves relevant code from your codebase up to 20x faster using SWE-grep models for rapid code retrieval.

Fast Context is a specialized subagent in Devin Desktop that retrieves relevant code from your codebase up to 20x faster than traditional agentic search. It powers Cascade's ability to quickly understand large codebases while maintaining the intelligence of frontier models.

<video autoPlay controls muted loop playsInline className="w-full aspect-video" src="https://mintcdn.com/cognitionai/hxeMffzXgF_RWx-U/desktop/assets/windsurf/cascade/fastcontext.mp4?fit=max&auto=format&n=hxeMffzXgF_RWx-U&q=85&s=195c69b309d0278c8d0e3fe3be4b2d88" data-path="desktop/assets/windsurf/cascade/fastcontext.mp4" />

## Using Fast Context

When Cascade receives a query that requires code search, Fast Context will trigger automatically.

You'll notice Fast Context is working when:

* Cascade quickly identifies relevant files across your codebase
* Large codebase queries complete faster than before
* Cascade spends less time reading irrelevant code

## How It Works

Fast Context uses `SWE-grep` and `SWE-grep-mini`, custom models trained specifically for rapid code retrieval. These models combine the speed of traditional embedding search with the intelligence of agentic exploration.

When you make a query to Cascade that requires searching through your codebase, Fast Context automatically activates to:

1. Identify relevant files and code sections using parallel tool calls
2. Execute multiple searches simultaneously
3. Return targeted results in seconds rather than minutes

This approach prevents context pollution and aims to mitigate the traditional speed-accuracy tradeoff. By delegating retrieval to a specialized subagent, Cascade conserves its context budget and intelligence for the actual task at hand.

## SWE-grep Models

Fast Context is powered by the SWE-grep model family:

* **SWE-grep**: High-intelligence variant optimized for complex retrieval tasks
* **SWE-grep-mini**: Ultra-fast variant serving at over 2,800 tokens per second

Both models are trained using reinforcement learning to excel at parallel tool calling and efficient codebase navigation. They execute up to 8 parallel tool calls per turn over a maximum of 4 turns, allowing them to explore different parts of your codebase simultaneously.

The models use a restricted set of cross-platform compatible tools (grep, read, glob) to ensure consistent performance across different operating systems and development environments.
