# /env-setup

Wire up environment variables for the ScriptRipper Daily Rip pipeline.

## What this skill does

Checks for an existing `.env` file at the project root, validates all required variables against the spec below, and either creates or updates the file — prompting for any secrets it cannot infer. Confirms `.env` is covered by `.gitignore`.

## When to use

- First-time setup on a new machine
- After adding a new service that needs credentials
- A service is failing with "missing key" or "not configured" errors
- After running `docs/Daily Rip Credential Setup Guide.md` to generate new keys

## Variable registry

| Variable | Required? | Source |
|----------|-----------|--------|
| `ENVIRONMENT` | YES | Set to `production` or `development` |
| `DATABASE_URL` | YES | Neon PostgreSQL connection string (`postgresql://...`) |
| `REDIS_URL` | YES | Upstash Redis connection string (`rediss://...`) |
| `GROQ_API_KEY` | YES | GroqCloud API key (`gsk_...`) |
| `R2_ACCESS_KEY_ID` | YES | Cloudflare R2 access key |
| `R2_SECRET_ACCESS_KEY` | YES | Cloudflare R2 secret key |
| `R2_ENDPOINT_URL` | YES | Cloudflare R2 S3-compatible endpoint |
| `R2_BUCKET_NAME` | YES | Default: `scriptripper-artifacts` |
| `RESEND_API_KEY` | YES | Resend email API key (`re_...`) |
| `FROM_EMAIL` | YES | Verified sender address (e.g. `reports@yourdomain.com`) |
| `CRON_SECRET_KEY` | YES | Random hex string — secures `/api/cron/daily-rip` endpoint |

## Steps

1. Check for `.env` at the project root — if missing, create it from the template below.
2. For each required variable with an empty value, prompt the user to provide it.
3. Confirm `.env` is listed in `.gitignore` — add it if not.
4. Run `cd api && pip install -r requirements.txt` to confirm the environment is installable.
5. Print a summary: which variables are set, which are still empty, and what to run next.

## `.env` template

```env
# Application
ENVIRONMENT=development
CRON_SECRET_KEY=

# Database & Queue
DATABASE_URL=
REDIS_URL=

# LLM & Transcription
GROQ_API_KEY=

# Storage (Cloudflare R2)
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_ENDPOINT_URL=
R2_BUCKET_NAME=scriptripper-artifacts

# Email (Resend)
RESEND_API_KEY=
FROM_EMAIL=
```

## Architecture notes

- All credentials are loaded via `api/app/config/settings.py` using Pydantic `BaseSettings`.
- The Groq key covers both the Llama 3.3 70B LLM and Whisper Large V3 transcription — one key, two services.
- R2 is accessed via boto3 with a custom `endpoint_url` — it is S3-compatible.
- The cron endpoint is secured by comparing `Authorization: Bearer <token>` against `CRON_SECRET_KEY`.
- Generate `CRON_SECRET_KEY` with: `openssl rand -hex 32`

## Reference

Full credential setup walkthrough: `docs/ScriptRipper_Daily-Rip(pivot)/Daily Rip Credential Setup Guide.md`
