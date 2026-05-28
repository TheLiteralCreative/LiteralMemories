# LiteralMemories.com — Forward Plan

**Last updated:** 2026-05-28
**Current version:** 1.1.0 (off-Manus, live on Render + Neon)
**Live URL:** https://literalmemories.onrender.com (Render `*.onrender.com` subdomain — branded `literalmemories.com` still on Manus until DNS cutover)
**Branch:** `migration/cloudflare` (misleading name — actually on Render; rename at merge)

---

## Architecture Contract (locked decisions)

### Stack (post-Manus, as of 2026-05-28)

| Layer | Choice | Notes |
|---|---|---|
| Frontend | React 19 + Vite 7 + Tailwind 4 + shadcn/ui + Wouter | Unchanged from Manus build |
| Backend | Express 4 + tRPC 11 | Unchanged. The `functions/api/trpc/[trpc].ts` Cloudflare Pages Function and `wrangler.toml` in the repo are dead code (Cloudflare path was attempted and abandoned — see session log 2026-05-28). |
| Database | Neon Postgres 17 (serverless, free tier) | `us-east-1`, scales to zero, ~1 sec cold start |
| ORM | Drizzle (pg-core) | Was MySQL/Drizzle on Manus; converted 2026-05-28 |
| Hosting | Render Web Service (Node, free tier) | 15-min idle spin-down. Branch: `migration/cloudflare` for now, switch to `main` at merge. |
| Auth (admin) | ADMIN_PASSWORD via `x-admin-token` header | `requireAdminToken()` in `server/routers.ts`. No OAuth in the path. |
| Email | **Stubbed** — `email.ts` throws | Pending Resend swap. Existing try/catch in `quotes.save` handles the failure gracefully (`emailSent: 'failed'`). |
| Brand domain | `literalmemories.com` — still on Manus DNS | Pending DNS cutover (open item) |

### Deviations from the May 14 LC Kit plan

- **Hosted on Render, not Cloudflare Pages + Workers.** Attempted Cloudflare Pages first; Workers Functions bundling cannot host the `nodemailer` import chain (53 Node-only modules) reliably even with `nodejs_compat`. Compounded by Cloudflare's setup-wizard "Retry" pinning to the original SHA. Render runs Express natively, so the problem disappears. The May 14 plan's "sync web apps go on Cloudflare" rule was wrong for LM specifically — should be amended in the next pass on `literalcreative-strategy/LC_KIT_NODE_EVALUATION_*.md`.

### Node_01 reference

For decision criteria on when to host on Cloudflare vs Render vs Node_01, see `MANUS_Document_Repository/_docs/specs/node_01_overview.md`. LM specifically does *not* fit Node_01 because the audience is public (clients submitting quote requests).

---

## Open items (UP NEXT, priority order)

### Phase A — Stabilize and cut over

1. **[YOU]** Smoke-test live Render URL. Calculator UI loads, submit a test quote, admin login at `/admin`.
2. **[YOU]** Rotate Neon Postgres password. Connection string was exposed in chat transcript on 2026-05-28; rotate before merging to `main`. Update `.env` locally and Render env var.
3. **[TOGETHER]** Decide DNS cutover path for `literalmemories.com`:
   - (a) Current DNS provider + Render paid tier ($20/mo team plan; LM is the 3rd custom URL — see task #15 of session task list)
   - (b) Move `literalmemories.com` to Cloudflare DNS first, then CNAME-proxy to the Render URL (stays on free tier)
4. **[YOU]** Once decision is made: execute DNS cutover. Verify TLS, verify calculator works on branded domain.

### Phase B — Restore email + clean up

5. **[CLAUDE]** Replace `email.ts` stub with Resend HTTP API. ~30 min. Adds `RESEND_API_KEY` env var; type exports unchanged.
6. **[CLAUDE]** Merge `migration/cloudflare` → `main`. Rename branch to something accurate or delete. Switch Render production branch from `migration/cloudflare` to `main`.
7. **[CLAUDE]** Delete dead Cloudflare scaffolding from the repo: `functions/`, `wrangler.toml`. (Or document why kept.)
8. **[CLAUDE]** Optional cleanup commit: delete `server/_core/cookies.ts` (now unused after Phase 3), delete or repair `server/auth.logout.test.ts` (asserts cookie-clearing behavior that no longer exists).

### Phase C — Decommission Manus

9. **[YOU]** After ~1 week of clean Render operation: confirm no data loss, then cancel LM's Manus subscription.

### Phase D — Operational quality (medium term)

10. Move admin auth from raw password to Cloudflare Access (per May 14 plan) as defense-in-depth, once Cloudflare DNS is in place for `literalmemories.com`.
11. Add a simple health check endpoint (`/api/trpc/system.health` already exists — wire Render's health check to it).
12. Add a basic backup posture for Neon (PITR is on by default on Neon free, but document the recovery steps).

---

## Phase status

| Phase | Status |
|---|---|
| Manus migration (platform layer) | ✓ 2026-05-28 |
| Smoke test live Render URL | ⏳ pending user |
| Rotate Neon credentials | ⏳ pending user (security gate) |
| DNS cutover decision | ⏳ pending decision |
| DNS cutover execution | ⏳ blocked on decision above |
| Resend email swap | ⏳ scoped, ready when prioritized |
| Branch merge to `main` | ⏳ blocked on credential rotation |
| Manus decommission | ⏳ blocked on ~1 week stability window |
| Cloudflare Access for admin | ⏳ blocked on Cloudflare DNS step |

---

## Related docs

- `MANUS_Document_Repository/_docs/specs/node_01_overview.md` — 3-lane hosting framework
- `MANUS_Document_Repository/VSCode_Projects/literalcreative-strategy/LC_KIT_NODE_EVALUATION_2026-05-14.md` — original studio-wide hosting plan (now partially superseded for LM)
- `docs/session-log/2026-05-28.md` — full record of the Manus → Render migration session
