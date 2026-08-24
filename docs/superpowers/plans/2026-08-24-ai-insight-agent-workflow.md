# AI Insight Tugas UUT Agent Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add repository instructions that require every AI agent to use a project-only workflow for local hosting, Vercel frontend deployment, and Cloudflare Workers backend APIs.

**Architecture:** Put the agent entry point in root `AGENTS.md` and keep the detailed operational policy in `docs/PROJECT_WORKFLOW.md`. The entry point establishes mandatory reading and scope; the workflow defines synchronization, worktree, deployment, secrets, preview, and verification rules.

**Tech Stack:** Markdown repository instructions, Git, Vercel, Cloudflare Workers.

**Spec:** `docs/superpowers/specs/2026-08-24-ai-insight-agent-workflow-design.md`

## Global Constraints

- Local development and local hosting are the default.
- Vercel is the frontend preview and production deployment target.
- Cloudflare Workers is the backend/API runtime.
- Before any edit or commit, fetch `origin` and check for remote changes, local changes, and branch divergence.
- New product features must use a dedicated worktree created from the latest clean `main`.
- Merge a feature worktree only after explicit user approval, verify the merge, then remove the clean worktree and local feature branch.
- Never force-remove a worktree containing uncommitted changes.
- Production deployment requires explicit user approval.
- Secrets must remain outside source control.
- Do not include Oracle Linux, `/home/opc`, `/var/www`, Nginx, server-IP routing, or Discord administration procedures.

---

### Task 1: Create the repository agent entry point

**Files:**
- Create: `AGENTS.md`

**Interfaces:**
- Consumes: `docs/PROJECT_WORKFLOW.md`
- Produces: A root-level instruction entry point that any repository-aware AI agent can discover.

- [ ] **Step 1: Synchronize before editing**

Run:

```powershell
git fetch origin
git status --short --branch
git rev-list --left-right --count HEAD...origin/main
```

Expected: the worktree is clean, and the branch relationship is understood before writing the file. Stop and reconcile safely if `origin/main` advanced or the branches diverged.

- [ ] **Step 2: Write `AGENTS.md`**

Include these exact policy points:

```markdown
# AI Insight Tugas UUT Agent Instructions

This file applies only to this repository: `ai-insight-tugas-uut`.

Before changing code, configuration, infrastructure, or deployment settings:

1. Read `docs/PROJECT_WORKFLOW.md` completely.
2. Inspect the current repository state and technology stack.
3. Fetch the latest `origin` state and check for remote changes, local changes, and branch divergence before editing or committing.

The project runs locally by default. Vercel is the frontend deployment target, and Cloudflare Workers is the backend/API runtime. Do not apply hosting instructions from unrelated projects.

When the user requests a new product feature, create a dedicated worktree from the latest clean `main`. Keep the feature isolated there until the user explicitly approves integration. After approval, verify `main` is current and clean, merge the feature successfully, run relevant checks, verify both worktrees are clean, and then remove the worktree and local feature branch. Never force-remove uncommitted work.

Never deploy to Vercel production or Cloudflare production, rotate credentials, delete resources, or make irreversible infrastructure changes without explicit user approval.

User instructions and this repository’s instructions take precedence over copied workflow material when they conflict.
```

- [ ] **Step 3: Check the entry point**

Run:

```powershell
Get-Content -Raw AGENTS.md
Select-String -Path AGENTS.md -Pattern 'PROJECT_WORKFLOW|fetch origin|worktree|Vercel|Cloudflare Workers|explicitly approves'
git diff --check
```

Expected: all required policy terms are present and `git diff --check` reports no whitespace errors.

- [ ] **Step 4: Commit the entry point**

Before committing, fetch and re-check the branch:

```powershell
git fetch origin
git status --short --branch
git rev-list --left-right --count HEAD...origin/main
git add AGENTS.md
git commit -m "docs: add repository agent instructions"
```

Expected: the commit succeeds only after confirming that the remote has not introduced an unhandled change.

### Task 2: Create the project-scoped workflow

**Files:**
- Create: `docs/PROJECT_WORKFLOW.md`

**Interfaces:**
- Consumes: the source workflow context in `VALASUCCI_PROJECT_WORKFLOW.md` and the scope in the design spec.
- Produces: The detailed workflow referenced by `AGENTS.md`.

- [ ] **Step 1: Synchronize before editing**

Run:

```powershell
git fetch origin
git status --short --branch
git rev-list --left-right --count HEAD...origin/main
```

Expected: the worktree is clean and the branch is safe to edit.

- [ ] **Step 2: Write the workflow sections**

Create `docs/PROJECT_WORKFLOW.md` with these sections and requirements:

1. **Purpose and scope** — apply only to `ai-insight-tugas-uut`; local hosting is the default; supported deployment path is Vercel frontend plus Cloudflare Workers API.
2. **Instruction priority** — user requests and repository instructions take precedence; copied global workflow text never expands this project’s scope.
3. **Repository inspection** — inspect files, package scripts, environment templates, Vercel configuration, and Wrangler configuration before guessing commands.
4. **Remote synchronization** — run `git fetch origin` before every edit and before every commit; inspect `git status --short --branch` and `git rev-list --left-right --count HEAD...origin/main`; stop to reconcile safely when the remote advances or branches diverge.
5. **Feature worktrees** — create a dedicated branch/worktree from the latest clean `main` for every new product feature; do not develop features directly on `main`.
6. **Approval and merge** — obtain explicit approval before integrating; fetch again; verify clean/current `main`; merge; run relevant checks; verify the merge; remove the worktree and local feature branch only after both are clean; never force-remove dirty work.
7. **Local development** — document and use the repository’s discovered local install, development, test, and build commands; keep local secrets in ignored environment files.
8. **Vercel frontend deployment** — use Vercel previews for review; configure only frontend environment variables in Vercel; do not claim production success without a verified deployment URL and explicit approval.
9. **Cloudflare Workers backend** — keep API code and bindings in the Worker project; use Wrangler and current official Cloudflare documentation; keep Worker secrets in Cloudflare secret storage; verify API routes and CORS/auth behavior where applicable.
10. **Safety and secrets** — never commit `.env` files, tokens, private keys, or generated dependencies/build output unless the repository explicitly requires them; do not delete remote resources or rotate credentials without approval.
11. **Verification and handoff** — report commands/checks run, deployment URLs when applicable, remaining external setup, and clean Git/worktree status; do not claim completion without evidence.
12. **Explicit exclusions** — Oracle Linux server deployment, `/home/opc`, `/var/www`, Nginx, server-IP routing, server-managed domains, Discord administration, and generic instructions for unrelated projects.

- [ ] **Step 3: Validate the workflow boundaries**

Run:

```powershell
Get-Content -Raw docs/PROJECT_WORKFLOW.md
Select-String -Path docs/PROJECT_WORKFLOW.md -Pattern 'local|Vercel|Cloudflare Workers|git fetch origin|worktree|explicit approval|Oracle Linux|/home/opc|/var/www|Nginx|Discord'
git diff --check
```

Expected: required supported paths and safety rules are present, excluded legacy paths are explicitly identified as exclusions rather than active procedures, and there are no whitespace errors.

- [ ] **Step 4: Commit the workflow**

Before committing, fetch and re-check the branch:

```powershell
git fetch origin
git status --short --branch
git rev-list --left-right --count HEAD...origin/main
git add docs/PROJECT_WORKFLOW.md
git commit -m "docs: add project workflow"
```

Expected: the workflow is committed only after the latest remote state is checked.

### Task 3: Run repository-level verification

**Files:**
- Test: `AGENTS.md`
- Test: `docs/PROJECT_WORKFLOW.md`
- Test: `docs/superpowers/specs/2026-08-24-ai-insight-agent-workflow-design.md`

**Interfaces:**
- Consumes: the completed policy files and design requirements.
- Produces: Evidence that the policy is discoverable, internally consistent, and cleanly integrated.

- [ ] **Step 1: Verify required files and references**

Run:

```powershell
Test-Path AGENTS.md
Test-Path docs/PROJECT_WORKFLOW.md
Select-String -Path AGENTS.md,docs/superpowers/specs/2026-08-24-ai-insight-agent-workflow-design.md -Pattern 'docs/PROJECT_WORKFLOW.md'
```

Expected: both files exist and every repository-policy reference uses `docs/PROJECT_WORKFLOW.md`.

- [ ] **Step 2: Verify no stale active workflow path remains**

Run:

```powershell
Select-String -Path AGENTS.md,docs/PROJECT_WORKFLOW.md,docs/superpowers/specs/2026-08-24-ai-insight-agent-workflow-design.md -Pattern 'docs/VALASUCCI_PROJECT_WORKFLOW.md'
```

Expected: no output.

- [ ] **Step 3: Verify Git cleanliness and history**

Run:

```powershell
git fetch origin
git status --short --branch
git diff --check
git log --oneline --decorate -5
```

Expected: no uncommitted changes, no whitespace errors, and the new policy commits are present. If the project is intentionally ahead of `origin/main`, report that fact rather than claiming it has been pushed.

- [ ] **Step 4: Commit any final validation-only correction**

If validation identifies a correction, make it only after another `git fetch origin` and repeat the relevant checks before committing. If no correction is needed, leave the clean worktree unchanged.
