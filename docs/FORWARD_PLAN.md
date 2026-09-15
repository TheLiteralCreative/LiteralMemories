# LiteralMemories.com — Forward Plan

**Last updated:** 2026-09-15 (status fields; dated sections below keep their original dates)
**Current version:** 1.1.0 (off-Manus, live on Render + Neon)
**Live URL:** https://literalmemories.com — live over HTTPS since 2026-09-15 (DNS on Cloudflare, served by Render). `https://literalmemories.onrender.com` still answers directly.
**Branch:** `main` — Render production branch since 2026-09-14 (`migration/cloudflare` was fast-forwarded into it)

---

## UPDATE — 2026-09-10: the branded domain is confirmed dead, and the Node_01 rule below is superseded

**Verified today:** `https://literalmemories.onrender.com` is **alive and fully working** — calculator,
service catalogue, live estimate summary. `https://literalmemories.com` returns **404**: its DNS is at
GoDaddy (`ns29/ns30.domaincontrol.com`) and still points at the Manus IP pair, which now serves nothing.
So LM has been publicly unreachable under its own name since the Manus origin rotted — the app was
never the problem.

Also observed: the Render free tier's 15-minute idle spin-down produced a **~20-second cold start**
before the page appeared. For a public quote calculator that is a conversion problem in its own right,
independent of DNS.

**Decision taken 2026-09-10: LM moves to NODE-01**, served at `literalmemories.literalcreative.com`
with `literalmemories.com` as an alias. This resolves the cutover that has been blocked since
2026-05-28 on Render's 2-slot custom-domain cap — without the $20/mo tier, and without the cold start.

> **Status note 2026-09-15 — read before acting on the decision above.** The move to NODE-01 has
> **not** happened. On 2026-09-14 `literalmemories.com` was pointed at **Render** as a no-regrets step,
> and the "blocked on the 2-slot cap" premise turned out to be a misread price (see item 3 below).
> Which address is canonical is **unruled** in the Hub-Spoke Addressing gate
> (`LC_MANDEL-BOT/_briefs/gates/hub-spoke-addressing/00_HSA-OPEN.md`). Whether LM still moves to
> NODE-01 is an **open decision for Joel**, not a settled one. The cold-start problem above remains.

**This supersedes the rule in §Stack below** that *"LM specifically does not fit Node_01 because the
audience is public."* That was written 2026-05-28. On **2026-08-14** the LC client portal was deployed
to NODE-01 behind a Cloudflare Tunnel **precisely because** its users are clients who cannot be added
to the tailnet. A public audience stopped being a disqualifier the moment that pattern was proven.

**Prerequisites, in order:**
1. ~~**Rotate the Neon credential**~~ — **DONE 2026-09-14.** See open item #2 below.
2. Move `literalmemories.com` DNS to Cloudflare — the tunnel can only route zones Cloudflare controls.
3. Deploy to `~/srv/apps/literalmemories`. **Claim a port outside 3001–3010**: the portal's
   `findAvailablePort()` walks upward from 3000, and the tunnel ingress points at a fixed 3000.
   Suggested: **3100**.

Wider context: `literalcreative-strategy/LC_NEST_PLATFORM_ARCHITECTURE_2026-09-10.md` — LM is the
inaugural spoke of the hub-and-spoke model.

---

---

## Architecture Contract (locked decisions)

### Stack (post-Manus, as of 2026-05-28)

| Layer | Choice | Notes |
|---|---|---|
| Frontend | React 19 + Vite 7 + Tailwind 4 + shadcn/ui + Wouter | Unchanged from Manus build |
| Backend | Express 4 + tRPC 11 | Unchanged. The `functions/api/trpc/[trpc].ts` Cloudflare Pages Function and `wrangler.toml` in the repo are dead code (Cloudflare path was attempted and abandoned — see session log 2026-05-28). |
| Database | Neon Postgres 17 (serverless, free tier) | `us-east-1`, scales to zero, ~1 sec cold start |
| ORM | Drizzle (pg-core) | Was MySQL/Drizzle on Manus; converted 2026-05-28 |
| Hosting | Render Web Service (Node, free tier) | 15-min idle spin-down. Branch: `main` (switched 2026-09-14). |
| Auth (admin) | ADMIN_PASSWORD via `x-admin-token` header | `requireAdminToken()` in `server/routers.ts`. No OAuth in the path. |
| Email | **Stubbed** — `email.ts` throws | Pending Resend swap. Existing try/catch in `quotes.save` handles the failure gracefully (`emailSent: 'failed'`). |
| Brand domain | `literalmemories.com` — DNS on Cloudflare, pointed at Render | **Live 2026-09-15.** Proxy (orange cloud) must stay off — see `docs/DNS_CUTOVER_literalmemories.md` |

### Deviations from the May 14 LC Kit plan

- **Hosted on Render, not Cloudflare Pages + Workers.** Attempted Cloudflare Pages first; Workers Functions bundling cannot host the `nodemailer` import chain (53 Node-only modules) reliably even with `nodejs_compat`. Compounded by Cloudflare's setup-wizard "Retry" pinning to the original SHA. Render runs Express natively, so the problem disappears. The May 14 plan's "sync web apps go on Cloudflare" rule was wrong for LM specifically — should be amended in the next pass on `literalcreative-strategy/LC_KIT_NODE_EVALUATION_*.md`.

### Node_01 reference

For decision criteria on when to host on Cloudflare vs Render vs Node_01, see `MANUS_Document_Repository/_docs/specs/node_01_overview.md`. ~~LM specifically does *not* fit Node_01 because the audience is public (clients submitting quote requests).~~ **Superseded 2026-09-10 — see the banner at the top of this file.**

---

## Open items (UP NEXT, priority order)

### Phase A — Stabilize and cut over

1. **[YOU]** Smoke-test live Render URL. Calculator UI loads, submit a test quote, admin login at `/admin`.
2. ~~**[YOU]** Rotate Neon Postgres password.~~ **COMPLETED 2026-09-14** — 109 days after it was flagged.
   - `neondb_owner` password reset in the Neon console. Endpoint unchanged (`ep-soft-haze-ap0o2zyp…`) — a role
     password reset does not move the compute endpoint.
   - **Consumers updated and verified by a database *write*, not by a green deploy:** Render `DATABASE_URL`
     (saved with "Save and deploy"; note "Save only" would have left the running service on the old value), and
     the local `.env`. A test quote was submitted and confirmed in `/admin` on **both** local and Render.
   - **Exposure scope, verified 2026-09-14:** the leak was a **chat transcript only**. `.env` is untracked and
     covered by `.gitignore`; the only other connection-string match in the repo is the literal placeholder
     `postgresql://...` in `.claude/commands/env-setup.md`. **Nothing to purge from git history.**
   - **Third consumer checked and clear:** the abandoned Cloudflare Pages project `literalmemories` has an
     **empty** Variables-and-secrets table — the credential was never stored there.
   - `ADMIN_PASSWORD` shares this file and was **not** part of the flagged exposure, so it was left alone.
     Note the app fails closed if it is ever lost: `server/routers.ts:136` and `:57` both reject when it is empty.
3. ~~**[TOGETHER]** Decide DNS cutover path~~ — **DECIDED AND EXECUTED 2026-09-14: option (b).**
   The premise of option (a) was wrong: Render's current docs say the Hobby plan **includes 2 custom
   domains** and extra ones are **$0.25/month**, not a $20/mo team plan. In the event, `literalmemories.com`
   and `www` fit inside the included 2 at no cost. **Nothing was ever blocking this but a misread price.**
   Full record: `docs/DNS_CUTOVER_literalmemories.md`. Original options as written:
   - (a) Current DNS provider + Render paid tier ($20/mo team plan; LM is the 3rd custom URL — see task #15 of session task list)
   - (b) Move `literalmemories.com` to Cloudflare DNS first, then CNAME-proxy to the Render URL (stays on free tier)
4. ~~**[YOU]** Execute DNS cutover.~~ **DONE 2026-09-14** — delegation on Cloudflare, all seven mail
   records verified byte-identical post-flip, Render verified both hostnames. **REMAINING: TLS
   certificates not yet issued** (apex *Pending*, `www` *Certificate Error*). Retry from Render's `…`
   menu if not self-healed. **Do not enable the Cloudflare proxy** — it breaks issuance.
   *Update 2026-09-15:* certificates issued; `https://literalmemories.com` is live, verified in a real
   browser. Which change fixed issuance was never isolated (cutover record, F14).

### Phase B — Restore email + clean up

5. **[CLAUDE]** Replace `email.ts` stub with Resend HTTP API. ~30 min. Adds `RESEND_API_KEY` env var; type exports unchanged.
6. ~~**[CLAUDE]** Merge `migration/cloudflare` → `main`.~~ **DONE 2026-09-14** (`839353b`); ~~switch Render production branch to `main`~~ **DONE 2026-09-14**. **Still open:** rename or delete the `migration/cloudflare` branch — Joel's call.
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
| Smoke test live Render URL | **✓ 2026-09-14** — quote submitted and confirmed in `/admin` |
| Rotate Neon credentials | **✓ 2026-09-14** — rotated, both consumers verified by a write |
| DNS cutover decision | **✓ 2026-09-14** — option (b): zone to Cloudflare, records pointed at Render **DNS-only (not proxied)** — apex `A`, per the cutover record. Stays on free tier; prejudges nothing in the HSA gate |
| DNS cutover execution | **✓ 2026-09-14** — delegation moved to Cloudflare, mail verified intact. **TLS issued, site live 2026-09-15.** Real send/receive mail test still open. See `docs/DNS_CUTOVER_literalmemories.md` |
| Resend email swap | ⏳ scoped, ready when prioritized |
| Branch merge to `main` | **✓ 2026-09-14** — fast-forwarded (`839353b`), pushed, and Render's production branch flipped to `main`. Deploy verified green |
| Manus decommission | ⏳ blocked on ~1 week stability window |
| Cloudflare Access for admin | **UNBLOCKED 2026-09-14** — the zone is now on Cloudflare |

---

## Related docs

- `MANUS_Document_Repository/_docs/specs/node_01_overview.md` — 3-lane hosting framework
- `MANUS_Document_Repository/VSCode_Projects/literalcreative-strategy/LC_KIT_NODE_EVALUATION_2026-05-14.md` — original studio-wide hosting plan (now partially superseded for LM)
- `docs/session-log/2026-05-28.md` — full record of the Manus → Render migration session

---

## Note added 2026-09-14 — the abandoned Cloudflare Pages project is still wired to this repo

Found while verifying the credential rotation had no third consumer. The Pages project
`literalmemories` — from the attempts abandoned on 2026-05-28 when `nodemailer` would not bundle for
Workers — is **still connected to `TheLiteralCreative/LiteralMemories` with automatic deployments
ENABLED, production branch `migration/cloudflare`.**

- **Not a security issue.** Its Variables-and-secrets table is empty; it never held `DATABASE_URL`.
- **It is a live trigger.** Every push to `migration/cloudflare` starts a Cloudflare build that
  cannot succeed, and `migration/cloudflare` is both Render's production branch and the branch
  queued to merge into `main`.
- **Minimal fix:** Settings → Branch control → disable automatic deployments. Reversible.
- **Deleting the project** is a separate call, deliberately not taken while closing a security item.

*Update 2026-09-14:* Joel disabled automatic deployments on the Pages project (NODE-01 log F12). It is
no longer a live trigger. Deleting it remains a separate, open decision.
