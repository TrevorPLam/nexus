# .devin

Devin AI assistant workflow definitions for automating development tasks in the Personal Command Center monorepo.

## Table of Contents

- [Overview](#overview)
- [Available Workflows](#available-workflows)
- [Usage](#usage)
- [Workflow Format](#workflow-format)
- [Adding Workflows](#adding-workflows)

## Overview

The `.devin` directory contains workflow definitions that the Devin AI assistant uses to automate repetitive development tasks. These workflows are triggered via slash commands and follow a systematic approach to task execution, including research, best practices application, quality assurance, and version control.

## Available Workflows

| Workflow | Slash Command | Description |
|----------|---------------|-------------|
| `tasks.md` | `/tasks` | Executes the first open task from TODO.md with research, best practices, QA, and commit |
| `todo.md` | `/todo` | Executes the first open task from TODO.md with research, best practices, QA, and commit |

## Usage

Workflows are triggered via slash commands in the Devin AI assistant interface:

```bash
/tasks    # Execute next task from TODO.md
/todo     # Execute next task from TODO.md
```

The workflow will:
1. Read the first incomplete task from TODO.md
2. Assess the repository structure and related file paths
3. Research best practices and industry standards
4. Validate task relevance
5. Implement the task following DDD, TDD, and BDD principles
6. Run quality assurance (typecheck, lint, tests)
7. Mark the task complete in TODO.md
8. Verify any discovered issues exist in TODO.md, adding them if missing
9. Commit and push changes

## Workflow Format

Workflow files use YAML frontmatter for metadata and markdown for content:

```yaml
---
description: Brief description of what the workflow does
---

# Workflow Title

Detailed description of the workflow purpose.

## Steps

1. **Step Name**
   - Detailed instructions
   - Sub-bullets as needed

## Notes

Additional context or caveats
```

The `description` field in the frontmatter is used by the slash command system to display workflow information.

## Adding Workflows

To add a new workflow:

1. Create a new `.md` file in the `.devin/workflows/` directory
2. Add YAML frontmatter with a `description` field
3. Document the workflow steps in markdown
4. The filename becomes the slash command (e.g., `deploy.md` → `/deploy`)

Example workflow file:

```yaml
---
description: Deploys the application to production
---

# Deploy to Production

This workflow builds and deploys the application to production.

## Steps

1. Run tests
2. Build the application
3. Deploy to production
4. Verify deployment
```
