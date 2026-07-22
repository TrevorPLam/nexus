---
name: execute-todo
description: Execute the first ready AGENT task in TODO.md. Reads AGENTS.md for rules, performs initial analysis, asks for confirmation, runs subtasks sequentially with validation, commits and pushes to main, then marks the task done. Safe for solo‑dev, push‑to‑main workflows.
---

## 1. Read context
- Read the root `AGENTS.md` (or `agents.md`) to understand project conventions, rules, and patterns.
- Read `TODO.md` at the project root. If it does not exist, stop and tell me: “No TODO.md found. Run /create-todo first.”
- Parse all tasks. Identify the first parent task with:
  - `Status: ready` (or `Status: in_progress` – see step 2 for handling)
  - At least one subtask assigned to `AGENT`
- If no such task exists, list any remaining `HUMAN` tasks and exit.

## 2. Handle in‑progress tasks
- If the first candidate task has `Status: in_progress`, it may be from a previous interrupted run.
- Ask me: “Task T‑XXX is marked `in_progress`. Should I resume it, reset it to `ready` and start fresh, or skip it?”
  - **Resume**: attempt to pick up from the first unchecked subtask.
  - **Reset**: change status back to `ready` and treat as new.
  - **Skip**: move to the next `ready` task.
- If I choose to resume, continue with step 3; otherwise return to step 1 to find the next task.

## 3. Initial analysis
- Read all files listed in the task’s `Related files` field. If any file does not exist, note it and ask me how to proceed.
- Execute the steps under the task’s `### Initial Analysis` section, if present. This may involve:
  - Researching best practices for the technology involved (perform targeted web searches if needed).
  - Identifying the exact lines that need to change.
  - Verifying that any required dependencies are already installed.
- If the analysis suggests the task description is wrong or incomplete, report the findings and suggest updates to `TODO.md` before proceeding.

## 4. Present the execution plan
- Based on the analysis, construct a clear plan:
  - What will change (files and rationale)
  - Order of subtasks
  - Validation steps after each subtask
  - Final validation commands
- Print the plan in plain, concise language (no emojis).
- Ask: **“Shall I proceed with this plan? (yes / no / edit)”**
  - **yes** → continue.
  - **no** → stop.
  - **edit** → let me provide corrections, then re‑present the plan.

## 5. Execute subtasks sequentially
- Process subtasks in order. For each subtask:
  1. **Announce**: “Executing T‑XXX‑N: [description]”
  2. **Make the change** as described. Use precise edits; only modify files mentioned in the subtask.
  3. **Validate immediately** if the subtask description includes a validation step. For example, after writing a test, run that specific test file (`npm test -- path/to/test`). If validation fails:
     - Attempt **one** fix based on the error.
     - Re‑run validation.
     - If it still fails, **stop** and report the failure. Do NOT continue to the next subtask.
  4. If the subtask is marked `HUMAN`, print “Subtasks T‑XXX‑N is assigned to HUMAN; please complete it manually, then re‑run /execute-todo.” and stop.

## 6. Final validation
- After all AGENT subtasks are complete, run the parent task’s **Validation Commands** (from the task template). Run them exactly as specified.
- If any command fails, attempt one fix, re‑run, and if still failing, stop and ask for guidance.

## 7. Commit and push
- Stage **only** the files listed in `Related files`, plus any newly created files that are part of the task. Review `git status` to ensure no unrelated changes are staged.
- Commit with message: `T‑XXX: [task title]`
- Push to main: `git push origin main`
- If push fails (e.g., non‑fast‑forward), report the error and stop. Do not force push.

## 8. Update TODO.md
- Mark the parent task’s checkbox as `[x]` and change its `Status` to `done`.
- If any subtasks were already checked off from a prior run, leave them; ensure all AGENT subtasks now show `[x]`.
- Save `TODO.md`.

## 9. Summary and continuation
- Print: “Task T‑XXX completed and pushed to main.”
- Show the next `ready` task (if any) and ask: “Would you like to execute the next task? (yes / no)”
  - **yes** → loop back to step 1 (the next task is now the first ready).
  - **no** → exit.