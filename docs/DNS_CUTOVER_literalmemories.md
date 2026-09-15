# DNS cutover — literalmemories.com → Cloudflare

**Opened:** 2026-09-14 · **Status:** ✅ **COMPLETE 2026-09-15.** `https://literalmemories.com` is live with a valid certificate. Mail intact throughout.
**Goal:** `https://literalmemories.com` serves the live LM app (currently only reachable at
`literalmemories.onrender.com`). Dark since the Manus migration, 2026-05-28.

> **⚠ THIS DOMAIN CARRIES LIVE MAIL WITH `p=reject`.**
> Every mail record below must exist in Cloudflare **before** the nameservers change. A reject
> policy with missing SPF/DKIM does not send mail to junk — receivers refuse it. Missing MX stops
> inbound entirely. This is the one failure here that is silent and expensive.

## Verified state, 2026-09-14 (live DNS, not from notes)

**Delegation:** `ns29.domaincontrol.com` · `ns30.domaincontrol.com` → **GoDaddy**
**Apex A:** `104.18.27.246` · `104.18.26.246` → old host, returns **404**

### Mail records — ALL must be carried

| Name | Type | Value |
|---|---|---|
| `@` | MX | `1 mailserver.purelymail.com` |
| `@` | TXT | `v=spf1 include:_spf.purelymail.com ~all` |
| `@` | TXT | `purelymail_ownership_proof=1b4eb21c65cd121788c1d5d6a89e8cc1ed087ba1726…` (full value from the GoDaddy export — truncated here by the resolver) |
| `_dmarc` | TXT | `v=DMARC1; p=reject; ruf=mailto:dmarc@purelymail.com` |
| `purelymail1._domainkey` | CNAME | `key1.dkimroot.purelymail.com` |
| `purelymail2._domainkey` | CNAME | `key2.dkimroot.purelymail.com` |
| `purelymail3._domainkey` | CNAME | `key3.dkimroot.purelymail.com` |

**Not yet inventoried:** anything I did not know to query. A resolver can confirm a name you guess;
it cannot enumerate a zone. **The GoDaddy zone-file export is the authoritative inventory** and is
the gate on proceeding.

## COMPLETE ZONE — 13 records, from the GoDaddy panel 2026-09-14

Authoritative inventory. The resolver-only view above was **incomplete and in one place wrong**.

### CARRY — 7 records. All of these must exist in Cloudflare BEFORE the nameservers move.

| Name | Type | Value |
|---|---|---|
| `@` | **MX** | `mailserver.purelymail.com.` priority **1** |
| `@` | **TXT** | `v=spf1 include:_spf.purelymail.com ~all` |
| `@` | **TXT** | `purelymail_ownership_proof=1b4eb21c65cd121788c1d5d6a89e8cc1ed087ba17269125664c7b8787fceba1793e503c63704827599bcd9dc833efe0d7cc3a18ae667af82444cd03bba287ed6` |
| `_dmarc` | **CNAME** | `dmarcroot.purelymail.com.` |
| `purelymail1._domainkey` | CNAME | `key1.dkimroot.purelymail.com.` |
| `purelymail2._domainkey` | CNAME | `key2.dkimroot.purelymail.com.` |
| `purelymail3._domainkey` | CNAME | `key3.dkimroot.purelymail.com.` |

> **`_dmarc` is a CNAME, not a TXT.** A resolver query for `_dmarc` returns
> `v=DMARC1; p=reject; ruf=mailto:dmarc@purelymail.com` because it follows the chain to PurelyMail's
> managed policy. Creating that TXT by hand in Cloudflare would be **wrong** and would conflict with
> the delegation. *A resolver's answer is not the record* — caught here only because the registrar
> panel was read directly.

### DROP — 6 records

| Name | Type | Value | Why |
|---|---|---|---|
| `@` | A | `104.18.26.246` | dead Manus host — Render replaces it |
| `@` | A | `104.18.27.246` | same |
| `www` | CNAME | `cname.manus.space.` | **dead Manus** — Render replaces it |
| `@` | NS ×2 | `ns29`/`ns30.domaincontrol.com.` | Cloudflare writes its own |
| `@` | SOA | `ns29.domaincontrol.com.` | Cloudflare writes its own |

### ADD — 2 records, per Render's own Cloudflare guidance

| Name | Type | Value | Proxy |
|---|---|---|---|
| `@` | CNAME | `literalmemories.onrender.com` | **DNS only (grey)** |
| `www` | CNAME | `literalmemories.onrender.com` | **DNS only (grey)** |

Cloudflare's **CNAME flattening** makes the apex CNAME legal — the reason this had to be a
nameserver move rather than records added at GoDaddy.

**Proxy must start OFF.** Render: *"This ensures that requests go to Render instead of Cloudflare, so
that we can verify the domain and issue a certificate."* Turn it on later if wanted, never before the
cert exists. **Cloudflare SSL/TLS mode must be `Full`.** No `AAAA` records exist here — Render does
not support IPv6 on custom domains, so keep it that way.

### DNSSEC — **NOT enabled.** Verified by `DS` lookup at the registry, 2026-09-14.

No `DS` record exists, so nameserver delegation can change without the domain going unresolvable.
This is the check that was never run on the first two cutovers and happened to be fine both times.

### Authoritative export archived

GoDaddy's own zone export, taken 2026-09-14 14:28:13 immediately before the delegation change,
is committed at **`docs/dns/literalmemories.com_godaddy-zone_2026-09-14.txt`**.

**It confirms the 13-record inventory above exactly** — reconstructed first from the registrar
panel, then validated against the export. The `purelymail_ownership_proof` value matches
character for character. Nothing was missed, and the three DKIM CNAMEs the Cloudflare import
scan silently dropped are present in the export, which is what proves the import was incomplete
rather than the source being wrong.

*Cloudflare nameservers assigned:* `clayton.ns.cloudflare.com` · `elisa.ns.cloudflare.com` —
both confirmed resolvable before use.

## Decisions taken

- **Zone moves to Cloudflare**, not "add records at GoDaddy." The apex cannot be a CNAME (DNS
  standard); Cloudflare's CNAME flattening is the fix and it only works when Cloudflare answers the
  queries. GoDaddy domain *forwarding* is rejected — it makes `www` canonical and adds a TLS hop.
- **App stays on Render.** Cloudflare Pages was tried in May and abandoned: `nodemailer` drags 53
  Node-only modules into the Workers bundle. Nothing has changed that.
- **`literalmemories.com` gets added as a Render custom domain.** Render routes by Host header, so
  proxying without registering the domain would 404. Render's current docs: Hobby includes 2 custom
  domains, **additional domains $0.25/month** — the May-era belief that this needed a $20/mo team
  plan appears to be wrong. *(Verify at the point of purchase.)*
- **Registrar stays at GoDaddy.** Only delegation moves. Nothing about ownership changes.
- **This does not pre-empt the HSA gate.** That gate asks whether `literalmemories.com` is a PRODUCT
  domain or becomes `literalmemories.literalcreative.com`. Moving the zone demotes nothing and is
  required by either outcome — it is the no-regrets step.

## Order of operations

1. **Export the zone at GoDaddy.** Every record, not the ones that look relevant.
2. Cloudflare → Add a Site → `literalmemories.com` → Free plan. Let the scan import.
3. **Diff the import against the export.** Add anything missing by hand — mail records first.
4. Add `literalmemories.com` (and `www`) as custom domains on the Render service; take the records
   Render specifies.
5. **Only then:** replace the nameservers at GoDaddy with Cloudflare's two.
6. Verify (below). Propagation is 24–48h; report *pending*, never *failed*, inside that window.

## Verification — four things, not "the site loads"

1. `dig NS literalmemories.com` shows Cloudflare's nameservers — the delegation itself, not a
   dashboard's claim about it.
2. Every record above present and **byte-identical**, TXT strings especially.
3. Apex **and** `www` serve the app over HTTPS with a valid cert.
4. **Send and receive a test email on the domain.** The site loading proves nothing about mail, and
   mail is the part that fails silently under `p=reject`.

## Carried lessons — this is the third cutover in five days

From `literalcreative.com` (2026-09-10) and `dadamark.com` (2026-09-12):

- Settle the registrar by **authoritative NS lookup**, not memory. On DADA that corrected a
  first-hand belief that was wrong.
- **Check DNSSEC before switching nameservers.** It was never enabled on DADA, which is why that
  went smoothly. Enabled-and-forgotten is how a domain goes dark mid-move. **Check it here.**
- **MX, SPF and DKIM go in together**, never one at a time.
- **"A dashboard's rendering of a record is not the record."**

---

# EXECUTION RECORD — 2026-09-14

## What was done, in order

1. Cloudflare → Add a Site → `literalmemories.com`, Free plan. Import scan run.
2. **Import diffed against the GoDaddy inventory. It was incomplete.** See below.
3. Missing records added by hand; `_dmarc` proxy corrected; dead Manus records deleted.
4. Two Render CNAMEs added, both **DNS only**.
5. Cloudflare SSL/TLS encryption mode set to **Full**.
6. Render → Custom Domains → added `literalmemories.com`; Render auto-added `www` with a
   redirect **to the apex** (adding the apex first is what produced that direction — the
   canonical form Joel settled on for `dadamark.com`).
7. GoDaddy zone exported and archived at `docs/dns/`.
8. Nameservers replaced at GoDaddy with `clayton.ns.cloudflare.com` / `elisa.ns.cloudflare.com`.
   **First attempt failed** with GoDaddy's generic "attempt to update nameservers has failed."
   A plain retry succeeded — no lock change was needed.

## ⚠ The finding: Cloudflare's import scan silently dropped the DKIM records

The scan imported 7 of the 11 non-NS/SOA records. **All three PurelyMail DKIM CNAMEs
(`purelymail1/2/3._domainkey`) were absent** from the imported zone, and the GoDaddy export later
proved they exist in the source — so this was a genuine import gap, not a misread.

It also imported **`_dmarc` as proxied**, which would have broken the DMARC delegation by answering
with Cloudflare addresses instead of following the chain to `dmarcroot.purelymail.com`.

Had delegation moved on the import as-scanned, the domain would have gone live with **no published
DKIM keys and a broken DMARC lookup, under a `p=reject` policy.** Outbound mail would have been
resting entirely on SPF, which breaks the first time a message is forwarded — and then messages are
**refused**, not junked.

*This is why the procedure says to diff the import against an export and verify every record
individually. The scan "catches most records" and that is not the same as all of them.*

## A second trap, avoided

A resolver query for `_dmarc.literalmemories.com` returns
`v=DMARC1; p=reject; ruf=mailto:dmarc@purelymail.com` — because it follows the CNAME to PurelyMail's
managed policy. **The record itself is a CNAME, not that TXT.** Creating the TXT by hand in Cloudflare
would have been wrong. Only reading the registrar panel directly caught it.
**A resolver's answer is not the record.**

## Verification after the flip

| Check | Result |
|---|---|
| `www` CNAME | `literalmemories.onrender.com` — **the new zone answering** (old zone had `cname.manus.space`) |
| Apex resolution | chains via CNAME flattening → `216.24.57.15` / `216.24.57.7` (Render), proxy off |
| MX | `1 mailserver.purelymail.com` ✓ |
| SPF TXT | `v=spf1 include:_spf.purelymail.com ~all` ✓ |
| Ownership proof TXT | full string to `…287ed6`, **byte-identical** to the export ✓ |
| `_dmarc` | chains correctly, returns `p=reject` ✓ |
| DKIM `purelymail1._domainkey` | `key1.dkimroot.purelymail.com` ✓ |
| **CAA** | **none** — nothing blocking Let's Encrypt |
| DNSSEC | confirmed **not enabled** before the move (DS lookup at the registry) |
| Render verification | **Verified** on both apex and `www` |
| Custom domain quota | **2 / 2 included** in the plan — the $0.25/domain charge was never needed, and the May-era "$20/mo team plan" belief was wrong |

**Mail survived the cutover intact.** That was the only failure mode here that is silent and
expensive, and it was cleared before anything irreversible happened.

## Open at close of session

**TLS certificates not yet issued.** Render shows the apex as *Certificate Pending* and `www` as
*Certificate Error*; both hostnames currently fail the TLS handshake in a browser. The site loaded
correctly for a window during propagation, then stopped once the apex cache expired and requests
began reaching Render directly.

**This is the expected gap between "DNS points here" and "cert issued," not a broken site.** The app
is healthy — verified working during that window, and still live at
`https://literalmemories.onrender.com`.

**Do not turn on the Cloudflare proxy to try to fix it.** Orange-clouding would break issuance,
because Render must answer validation requests directly.

**Next action:** give it 15–30 minutes. If `www` still shows *Certificate Error*, retry issuance from
the `…` menu on that row. If both are still failing an hour out, that is a real fault worth
investigating rather than waiting on.

---

# STATE AT STOP — 2026-09-15, late *(SUPERSEDED — see RESOLUTION below)*

**Stopped deliberately, not blocked.** Long session; the remaining item is not urgent and not risky.

## Done and verified — do not redo any of this

| | |
|---|---|
| Delegation | Cloudflare (`clayton`/`elisa.ns.cloudflare.com`) |
| **Mail** | **MX, SPF, ownership TXT, `_dmarc` CNAME, all 3 DKIM CNAMEs — verified byte-identical AFTER the flip.** Intact |
| Apex record | **`A` → `216.24.57.1`** (Render's documented apex target), DNS only — confirmed live via Cloudflare's resolver, TTL 300 |
| `www` | CNAME → `literalmemories.onrender.com`, DNS only — chain verified to `216.24.57.7/.15` |
| AAAA | none, on the domain or on the Render target |
| CAA | none |
| DNSSEC | off |
| SSL/TLS mode | Full |
| **The app** | **Healthy.** `literalmemories.onrender.com` serves the full pricing calculator |

## The one open item

**Render will not issue a certificate for the apex.** Status at stop: apex *Verified* + *Certificate
Error*; `www` *Waiting for DNS* / *Waiting for Verification* (normal — it had just been re-added).

### What was tried

1. Waited through propagation — apex failed, `www` succeeded and got a cert.
2. Deleted and re-added both custom domains — Render removes the pair together.
3. **Replaced the flattened apex CNAME with a plain `A` record at Render's documented target.** The
   working theory was that CNAME flattening handed the challenge `216.24.57.15/.7` (edge addresses)
   rather than `216.24.57.1`. **The apex still errored after the change** — so that theory is
   **not confirmed**, and the A record is kept because it is Render's own documented form, not
   because it fixed anything.

### What is ruled out, with evidence

Not DNS · not AAAA · not CAA · not DNSSEC · not Cloudflare proxying (off throughout) ·
not the app · not the free-tier spin-down (the edge answers instantly; a cold start is a slow
*success*, not a handshake failure).

**Render's own error text names AAAA and CAA. Both were checked. Neither exists.** That message is
boilerplate attached to a failed issuance, not a diagnosis — it will send the next person hunting
for records that are not there.

### Measured behaviour worth keeping

- `www` with a cert returned **HTTP 404** — TLS succeeded, Render did not route the host. Cert and
  routing are separate provisioning steps and can complete independently.
- Apex with no cert fails at the handshake: `ERR_SSL_VERSION_OR_CIPHER_MISMATCH`. **That error means
  no certificate for the hostname — it is not a protocol or cipher misconfiguration.**
- `literalmemories.onrender.com` serving a page titled **"Render - Application loading"** is the
  free-tier cold start, not an error page. It was mistaken for one during this session.

## Tomorrow, in order

1. **Look before touching.** If the certificates issued overnight — common — it is done. Confirm with
   `https://literalmemories.com` **and** a real email send/receive on the domain.
2. If the apex still errors: **open a Render support ticket.** Everything on the customer side is
   verifiably correct, which is exactly the case their support exists for. Their own error message
   offers it. Do not keep cycling the domain — that risks Let's Encrypt duplicate-certificate rate
   limits for no diagnostic gain.
3. **Do not enable the Cloudflare proxy** as a workaround. It breaks Render's validation.
4. Nothing here blocks anything else. LM's app, its mail, and the rest of the portfolio are unaffected.

---

# ✅ RESOLUTION — 2026-09-15

**`https://literalmemories.com` serves the live pricing calculator over a valid certificate.**
Verified in a real browser: HTTPS to the apex completes, `/assets/index-*.js` and `/assets/index-*.css`
load over it, and a nonexistent path returns the app's own styled 404 — i.e. the application is
answering, not an edge placeholder. **Dark since 2026-05-28. Live again 2026-09-15.**

## What actually fixed it — stated honestly

**Unknown, and the record should say so.** Three things happened close together:

1. The apex was changed from a flattened CNAME to `A → 216.24.57.1`.
2. Both custom domains were removed and re-added in Render.
3. Time passed — roughly ten more minutes.

The certificate appeared after all three. **No test isolated which mattered**, and Render gives no
issuance log to consult. Anyone reading this later should treat the A-record change as *plausible*
and *unproven* — it is kept because it is Render's own documented apex form, not because it was
demonstrated to be the fix.

## The process failure worth recording

**The session declared this a Render-side fault requiring a support ticket while it was already
resolving.** The last verification had been run several minutes earlier; the conclusion was formed
from accumulated reasoning rather than a fresh check, and then the checking stopped because the
conclusion felt settled.

Joel pushed back — *"I just don't think you're right… somewhere along the line an assumption was
made"* — and on re-checking, it was already working.

**The rule this earns:** *before declaring something unfixable, re-run the test.* A verdict of
"broken, escalate" is a claim about the present, and it decays exactly as fast as any other observed
fact. The whole repo's discipline is "verify at the point of use"; a conclusion is a point of use.

Two related misses in the same stretch, both from reasoning instead of reading:

- Render's Cloudflare page specifies **two CNAMEs**; the apex was overridden with an `A` record on a
  theory. The deviation may have been the fix or may have been noise — it was introduced without
  saying clearly that it departed from the vendor's documented configuration.
- Render's `_acme-challenge` / `_cf-custom-hostname` mention was dismissed as "wildcard only"
  without checking. *(Checked eventually: neither record exists, and neither was needed.)*

## Final verified state

| | |
|---|---|
| `https://literalmemories.com` | **LIVE** — valid cert, app serving |
| `www.literalmemories.com` | redirects to apex (Render-managed) |
| Apex DNS | `A → 216.24.57.1`, DNS only |
| `www` DNS | CNAME → `literalmemories.onrender.com`, DNS only |
| Mail | MX · SPF · ownership TXT · `_dmarc` CNAME · 3 DKIM CNAMEs — **all intact, verified after the flip** |
| CAA / AAAA / DNSSEC | none / none / off |
| Cloudflare proxy | off (required — proxying breaks Render's validation) |

## Still owed

- **Send and receive a real email on the domain.** Every mail record verifies in DNS, but under
  `p=reject` only an actual message proves the chain end to end. **This remains unproven.**
