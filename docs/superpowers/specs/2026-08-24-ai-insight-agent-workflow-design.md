# AI Insight Tugas UUT Agent Workflow Design

## Status

Approved in chat on 2026-08-24.

## Goal

Make the project’s development and deployment workflow persistent for every AI agent working in this repository, while limiting the workflow to local hosting, Vercel frontend deployments, and Cloudflare Workers backend APIs.

## Context

The source material is `VALASUCCI_PROJECT_WORKFLOW.md`, a global Valasucci runbook intended for Oracle Linux hosting. It includes project-agnostic triggers, Oracle server paths, Nginx configuration, Discord administration, and public URL management. Those global/server-specific instructions are not appropriate for this repository’s current hosting model.

The repository currently contains only `README.md`, so it has no existing agent-instruction convention to preserve.

## Scope

The project policy applies only to the `ai-insight-tugas-uut` repository:

- Local development and local hosting are the default.
- Vercel is the frontend preview and production deployment target.
- Cloudflare Workers is the backend/API runtime.
- Cloudflare products such as D1, KV, R2, Workers AI, or other bindings may be used only when required by the project.
- Agents must use current official Cloudflare documentation when implementing or changing Cloudflare functionality.
- Production deployment requires explicit user approval.
- Secrets must remain outside source control and be configured through local, Vercel, or Cloudflare environment settings as appropriate.
- Preview-first validation is required for meaningful frontend or backend changes when the relevant preview path exists.
- Before any edit or commit, agents must fetch the latest `origin` state and check for remote changes, local changes, and branch divergence.
- New product features must be developed in a dedicated Git worktree created from the latest `main`.
- A feature worktree may be merged only after explicit user approval; after a verified successful merge, the worktree must be removed and both the worktree and `main` must be clean.

The policy explicitly excludes:

- Oracle Linux server deployment.
- `/home/opc`, `/var/www`, Nginx, server IP routing, and server-managed domains.
- Discord category/channel creation or gateway configuration.
- Generic workflow behavior for unrelated repositories.

## Repository Artifacts

### `AGENTS.md`

The root instruction file is the entry point for AI agents. It requires agents to read and follow the project workflow before making project changes, defines the project boundaries, and states that user instructions and repository policy take precedence over copied source material when they conflict.

### `docs/PROJECT_WORKFLOW.md`

This is the project-scoped operational workflow. It preserves the useful safety and verification principles from the source runbook, but replaces global values and Oracle-hosting procedures with fixed project targets for local, Vercel, and Cloudflare Workers work.

### `docs/superpowers/specs/2026-08-24-ai-insight-agent-workflow-design.md`

This design record explains the adaptation and its exclusions.

### `docs/superpowers/plans/2026-08-24-ai-insight-agent-workflow.md`

The implementation plan will describe the exact file contents, validation checks, and commit sequence.

## Agent Behavior

Before changing code, configuration, infrastructure, or deployment settings, an agent must:

1. Read `AGENTS.md`.
2. Read `docs/PROJECT_WORKFLOW.md`.
3. Inspect the current repository state and stack rather than guessing commands.
4. Keep frontend and backend responsibilities separated between Vercel and Cloudflare Workers.
5. Validate local behavior and relevant preview/deployment behavior before claiming completion.

An agent must not deploy to Vercel or Cloudflare production, rotate credentials, delete resources, or make irreversible infrastructure changes without explicit user approval.

## Git Synchronization and Feature Worktrees

Before editing or committing, an agent must run `git fetch origin`, inspect `git status`, and compare the current branch with its upstream branch. If the remote has advanced or the branches have diverged, the agent must stop and reconcile the branch safely before continuing; it must not overwrite remote commits or use destructive reset operations.

When the user requests a new product feature, the agent must create a dedicated feature branch and worktree from the latest clean `main`. The agent must keep feature changes isolated there, verify the feature worktree is clean before integration, and request explicit user approval before merging it into `main`.

After approval, the agent must fetch `origin` again, verify that `main` is clean and current, merge the feature branch, run the relevant checks, and verify the merge succeeded. Only after the merged `main` and feature worktree are confirmed clean may the agent remove the worktree and delete its local feature branch. The agent must not force-remove a worktree containing uncommitted changes.

## Success Criteria

- A new AI agent entering the repository has one obvious instruction entry point.
- The entry point requires the project-scoped workflow for every project task.
- The workflow contains no active Oracle/Nginx/Discord/server-hosting instructions.
- The workflow names local hosting, Vercel, and Cloudflare Workers as the only supported execution/deployment paths.
- The workflow prevents accidental production deployment and secret exposure.
- The workflow requires remote synchronization checks before edits and commits.
- The workflow requires isolated worktrees for new product features and clean verified cleanup after merging.
- Repository checks confirm the required files exist, contain the required boundaries, and do not contain excluded server-specific paths or procedures.
