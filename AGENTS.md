# AI Insight Tugas UUT Agent Instructions

This file applies only to this repository: `ai-insight-tugas-uut`.

Before starting any project task or making any repository change, including documentation-only work:

1. Read `docs/PROJECT_WORKFLOW.md` completely.
2. Inspect the current repository state and technology stack.
3. Fetch the latest `origin` state and check for remote changes, local changes, and branch divergence before editing or committing.

The project runs locally by default. Vercel is the frontend deployment target, and Cloudflare Workers is the backend/API runtime. Do not apply hosting instructions from unrelated projects.

When the user requests a new product feature, create a dedicated worktree from the latest clean `main`. Keep the feature isolated there until the user explicitly approves integration. After approval, verify `main` is current and clean, merge the feature successfully, run relevant checks, verify both worktrees are clean, and then remove the worktree and local feature branch. Never force-remove uncommitted work.

Never deploy to Vercel production or Cloudflare production, rotate credentials, delete resources, or make irreversible infrastructure changes without explicit user approval.

User instructions and this repository’s instructions take precedence over copied workflow material when they conflict.
