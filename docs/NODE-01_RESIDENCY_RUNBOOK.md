# LiteralMemories — move from Render to NODE-01

**Written:** 2026-09-15 · **Decision:** Joel, 2026-09-15 (`LC_NODE_01/docs/session-log/2026-09-15.md` §8)
**Target:** LaunchAgent `com.literalcreative.literalmemories` on NODE-01, **port 3001 on 127.0.0.1**,
reached through the existing Cloudflare tunnel at `literalmemories.literalcreative.com`, then
`literalmemories.com` and `www`.
**Why:** order emails go through PurelyMail SMTP (465), which Render's free tier blocks. LC Portal and
ScriptRipper already send this way from the node.
**Model:** `literalcreative-platform/docs/20260814_Phase-4_NODE-01-Residency-Runbook.md`.

> **Nothing here has been run on the node yet.** The assistant cannot reach NODE-01. Code changes
> were tested in a sandbox (mail built and escaped correctly; failure paths correct; production
> refuses a busy port). Step 0 reads the values that must not be guessed.

**Rules for the whole run.** One step at a time; stop on any surprise and paste the output.
Secrets (database URL, admin password, mail password) are typed on the node only — **never pasted
into chat**. Nothing is deleted: Render is suspended, not removed, until the node has run clean.
Mail DNS records (MX, SPF, DKIM, `_dmarc`, ownership TXT) are **not touched at any step**.

---

## Step 0 — Preflight on the node (read-only)

```
which node; node --version; pnpm --version
lsof -nP -iTCP:3001 -sTCP:LISTEN || echo "3001 free"
git -C ~/srv/apps/literalcreative-platform remote -v
cat ~/.cloudflared/config.yml
cloudflared tunnel list
```

Needed from it: the node path (for the plist), that 3001 is free, the GitHub remote form the
portal uses (reuse it), the current ingress rules, and the **tunnel ID** (for Step 8).

## Step 1 — Laptop: publish the code and the port claim

Commit `server/email.ts`, `server/_core/index.ts`, this runbook; push. Copy the Quick-Reference to
the node's Desktop (Deployment Protocol §3 doc 1).

## Step 2 — Node: clone

```
cd ~/srv/apps
git clone <remote form from Step 0, repo TheLiteralCreative/LiteralMemories> literalmemories
git -C ~/srv/apps/literalmemories log --oneline -1
```

## Step 3 — Node: `.env` (gitignored; `chmod 600`)

| Key | Value |
|---|---|
| `DATABASE_URL` | the **same** Neon string Render uses (copy from Render → Environment) |
| `ADMIN_PASSWORD` | the same value Render uses — the app fails closed without it |
| `SMTP_HOST` | `smtp.purelymail.com` |
| `SMTP_PORT` | `465` |
| `SMTP_USER` | `joel@literalmemories.com` (also the From address; must be this domain for DMARC) |
| `SMTP_PASS` | that mailbox's password, or an App Password if 2FA is on |
| `PORT` | `3001` |
| `HOST` | `127.0.0.1` |
| `NODE_ENV` | `production` |

Render and the node share one database, so both can run during the switch without losing quotes.

## Step 4 — Node: install, build, run by hand

```
cd ~/srv/apps/literalmemories && pnpm install && pnpm build
```
Approve build scripts if asked (`pnpm approve-builds`; esbuild needs it). Then `pnpm start` — expect
exactly `Server running on http://127.0.0.1:3001/`. In a second window:
```
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3001/
```
Expect `200`. `Ctrl+C` the manual run.

## Step 5 — Node: LaunchAgent

Same shape as `com.literalcreative.portal.plist` (RunAtLoad, KeepAlive, ThrottleInterval 10,
explicit PATH with `/usr/local/bin`, `NODE_ENV=production`), with Label
`com.literalcreative.literalmemories`, program `<node path> /Users/literalcreative/srv/apps/literalmemories/dist/index.js`,
WorkingDirectory `/Users/literalcreative/srv/apps/literalmemories`, logs
`~/srv/logs/literalmemories.out.log` / `.err.log`. `plutil -lint` before `launchctl load`.
If port 3001 is ever taken, the app now exits and the error log says so (launchd retries every 10 s).

## Step 6 — Node: tunnel ingress for the preview hostname (back up first)

`cp ~/.cloudflared/config.yml ~/.cloudflared/config.yml.bak-20260915`, then add **above the
catch-all**:
```
  - hostname: literalmemories.literalcreative.com
    service: http://127.0.0.1:3001
```
`cloudflared tunnel ingress validate` → `cloudflared tunnel route dns <tunnel> literalmemories.literalcreative.com`
(correct here — it is in the `literalcreative.com` zone) → kickstart cloudflared.

## Step 7 — Prove it on the preview hostname

1. `https://literalmemories.literalcreative.com` loads the calculator.
2. Submit a test quote with Joel's Gmail as the customer.
3. **Both** emails arrive: `[New Estimate]` at `joel@literalmemories.com` (BCC `joel@literalcreative.com`),
   and the customer copy at Gmail with the "we've received your request" line.
4. Gmail → Show original → SPF, DKIM, DMARC all PASS.
5. `/admin` shows the quote with Email = **Sent**.

**Do not continue until all five pass.**

## Step 8 — Cut `literalmemories.com` over to the node

1. Add ingress rules above the catch-all for `literalmemories.com` and `www.literalmemories.com`
   → `http://127.0.0.1:3001`; validate; kickstart.
2. **Do not use `cloudflared tunnel route dns` for these.** It creates records in the zone chosen at
   `cloudflared tunnel login` (`literalcreative.com`), and for another zone's hostname it can produce
   `literalmemories.com.literalcreative.com`. Edit the **literalmemories.com** zone in the dashboard:
   - replace the apex `A 216.24.57.1` with `CNAME @ → <tunnel-ID>.cfargotunnel.com`, **Proxied**
   - replace `www CNAME literalmemories.onrender.com` with `CNAME www → <tunnel-ID>.cfargotunnel.com`, **Proxied**
   - touch nothing else. Proxied is required for tunnel records; the "DNS only" rule applies to the
     mail records, which stay as they are.
3. Re-run Step 7 on `https://literalmemories.com`.

## Step 9 — Retire Render (reversible)

Remove the two custom domains from the Render service, then **suspend** it. Do not delete it until
the node has served cleanly for a week. Rollback: resume Render, restore the two DNS records from
`docs/DNS_CUTOVER_literalmemories.md`.

## Step 10 — Docs (Deployment Protocol §3)

Quick-Reference: LiteralMemories row PLANNED → LIVE, cloudflared hostname count, health check, logs,
troubleshooting, update recipe; copy to the node Desktop. Node session log. As-Built banner and
Roadmap. This repo's `FORWARD_PLAN.md` (hosting, live URL, email row). Cross-register through this
project's own `PORTFOLIO.md` row (host: NODE-01).

**Update recipe once live:** laptop `git push` → node
`cd ~/srv/apps/literalmemories && git pull && pnpm install && pnpm build && launchctl kickstart -k gui/$(id -u)/com.literalcreative.literalmemories`.
