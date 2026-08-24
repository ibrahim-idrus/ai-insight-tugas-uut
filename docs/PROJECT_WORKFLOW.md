# Project Workflow for `ai-insight-tugas-uut`

## 1. Purpose and scope

This workflow applies only to the `ai-insight-tugas-uut` repository.

Local development and local hosting are the default. The supported deployment path is Vercel for the frontend and Cloudflare Workers for the backend/API.

## 2. Instruction priority

User requests and repository instructions take precedence over copied global workflow material.

Copied workflow text from other projects never expands this repository’s scope or hosting model.

## 3. Repository inspection

Before guessing commands or changing behavior, inspect the repository’s actual files and conventions.

Check the relevant source of truth for:

- files and folders in the repository
- package scripts and lockfiles
- environment templates and ignored secret files
- Vercel configuration
- Wrangler configuration

Use the discovered repository state instead of assuming a stack from another project.

## 4. Remote synchronization

Before every edit and before every commit, run:

```powershell
git fetch origin
git status --short --branch
git rev-list --left-right --count HEAD...origin/main
```

If the remote advances or the branches diverge, stop and reconcile safely before continuing.

Do not overwrite remote commits or use destructive reset operations to “fix” divergence.

## 5. Feature worktrees

Create a dedicated branch and worktree from the latest clean `main` for every new product feature.

Do not develop new features directly on `main`.

Keep feature work isolated until it is ready for review and integration.

## 6. Approval and merge

Obtain explicit user approval before integrating a feature worktree.

After approval, fetch again, verify that `main` is current and clean, merge the feature successfully, run the relevant checks, and verify the merge.

Remove the worktree and local feature branch only after both are confirmed clean.

Never force-remove a worktree that contains uncommitted changes.

## 7. Local development

Use the repository’s discovered local install, development, test, and build commands.

Keep local secrets in ignored environment files.

If the repository does not yet define package scripts or helper commands, document that gap rather than inventing commands.

## 8. Vercel frontend deployment

Use Vercel previews for review.

For meaningful frontend changes, validate in a Vercel preview before claiming the work is ready.

Configure only frontend environment variables in Vercel.

Do not claim production success without a verified deployment URL and explicit user approval.

## 9. Cloudflare Workers backend

Keep API code and bindings in the Cloudflare Workers project.

Use Wrangler and current official Cloudflare documentation when implementing or changing Worker behavior.

For meaningful backend/API changes, use the relevant preview path when available before claiming the work is ready.

Keep Worker secrets in Cloudflare secret storage.

Verify API routes and CORS/auth behavior where applicable.

## 10. Safety and secrets

Never commit any of the following unless the repository explicitly requires it:

- `.env` files
- tokens
- private keys
- generated dependencies
- build output

Do not delete remote resources or rotate credentials without approval.

## 11. Verification and handoff

When handing work back, report:

- the commands and checks that were run
- deployment URLs, when applicable
- any remaining external setup
- clean Git and worktree status

Do not claim completion without evidence.

## 12. Explicit exclusions

These are exclusions, not active project procedures:

- Oracle Linux server deployment
- `/home/opc`
- `/var/www`
- Nginx
- server-IP routing
- server-managed domains
- Discord administration
- generic instructions for unrelated projects

If any copied workflow text mentions these topics, treat them as out of scope for this repository.
