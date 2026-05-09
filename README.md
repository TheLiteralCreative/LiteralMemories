# Literal Memories — Service Pricing Calculator

**Literal Memories Legacy Media Digitization** is a public-facing React web application that allows clients to build a custom service estimate, save their quote, and receive a branded email confirmation — all without requiring an account or login.

Live site: [literalmemories.com](https://literalmemories.com)

---

## Overview

The application is a full-stack web app built on a React 19 + Tailwind CSS 4 + Express + tRPC stack. It replicates the logic of the original Google Sheets pricing matrix as an interactive calculator, adds volume-discount tiers, and connects to a MySQL database and Purelymail SMTP server for quote persistence and email delivery.

---

## Features

### Public Calculator
- Interactive pricing calculator covering all four service categories: **Media Digitization**, **Transcription**, **Video & Image Enhancement**, and **Audio Enhancement**
- **Volume discount tiers** (Standard → 10+ → 25+ → 50+ items) applied automatically with a live progress bar
- **Media Delivery** options: 8GB Thumb Drive, Dropbox Link (30-day), 1TB Archive (monthly or yearly)
- **Adjustments panel**: Account Credit, Shipping Rate, Service Adjustments
- **Sticky Estimate Summary** sidebar with real-time itemized breakdown, subtotal, 50% deposit, and balance due

### Save & Email My Quote
- Prominent **"Save & Email My Quote"** button in the summary sidebar — always visible, works on all devices including mobile
- **Exit-intent modal** as a secondary trigger — fires when the user moves to close the tab
- On submission: quote is saved to the database and three notifications are sent simultaneously:
  - Branded HTML estimate email to the **client**
  - HTML copy to **Joel@literalmemories.com**
  - Silent BCC to **Joel@literalcreative.com**
  - Plain-text SMS to **615-364-0630** via T-Mobile email-to-SMS gateway

### Admin Dashboard
- Password-protected admin panel at `/admin`
- Searchable, paginated quotes table (20 per page) sorted newest first
- Columns: client name, email, phone, total, pricing tier, submission date, status
- Quote detail modal with full line-item breakdown and one-click **"Email Client"** link
- Status management: **New → Contacted → Archived**
- Discreet **Admin** link in the site footer for easy navigation

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Tailwind CSS 4, shadcn/ui, Wouter |
| Backend | Express 4, tRPC 11, Superjson |
| Database | MySQL / TiDB (via Drizzle ORM) |
| Email | Nodemailer + Purelymail SMTP (smtp.purelymail.com:465) |
| SMS | T-Mobile email-to-SMS gateway (6153640630@tmomail.net) |
| Auth | Session token via `x-admin-token` header (admin); Manus OAuth (user) |
| Testing | Vitest (14 tests, 1 skipped — live SMTP blocked in sandbox) |
| Hosting | Manus managed hosting with custom domain |

---

## Project Structure

```
literal-memories-pricing/
├── client/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.tsx              # Main calculator page
│   │   │   ├── AdminLogin.tsx        # Admin login page (/admin/login)
│   │   │   └── AdminDashboard.tsx    # Admin quotes dashboard (/admin)
│   │   ├── components/
│   │   │   └── SaveQuoteModal.tsx    # Exit-intent + button-triggered save modal
│   │   ├── lib/
│   │   │   ├── pricingData.ts        # All service categories, prices, and tier logic
│   │   │   ├── trpc.ts               # Main tRPC client
│   │   │   └── adminTrpc.ts          # Admin tRPC client (injects x-admin-token header)
│   │   ├── App.tsx                   # Routes: /, /admin, /admin/login
│   │   └── index.css                 # Global design tokens (Memory Lane theme)
├── server/
│   ├── routers.ts                    # tRPC procedures: quotes.save, admin.*
│   ├── db.ts                         # User db helpers
│   ├── quotesDb.ts                   # Quote db helpers (save, list, get, update status)
│   ├── email.ts                      # Nodemailer: client email, owner email, SMS gateway
│   ├── quotes.save.test.ts           # Vitest: quote save procedure
│   ├── admin.test.ts                 # Vitest: admin login and listQuotes procedures
│   └── smtp.connection.test.ts       # Vitest: SMTP connection (skipped in sandbox)
├── drizzle/
│   └── schema.ts                     # users + savedQuotes tables
├── shared/
│   └── const.ts                      # Shared constants
├── todo.md                           # Feature checklist (all items completed)
└── README.md                         # This file
```

---

## Environment Variables

The following secrets must be set in the Manus project secrets panel (or a `.env` file for local development). **Never commit secrets to this repository.**

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | MySQL/TiDB connection string |
| `JWT_SECRET` | Session cookie signing secret |
| `SMTP_HOST` | `smtp.purelymail.com` |
| `SMTP_PORT` | `465` |
| `SMTP_USER` | `Joel@literalmemories.com` |
| `SMTP_PASS` | Purelymail account password |
| `ADMIN_PASSWORD` | Password for the `/admin` dashboard |
| `VITE_APP_ID` | Manus OAuth application ID |
| `OAUTH_SERVER_URL` | Manus OAuth backend base URL |
| `VITE_OAUTH_PORTAL_URL` | Manus login portal URL |

---

## Local Development

### Prerequisites
- Node.js 22+
- pnpm 10+
- A MySQL-compatible database (local or remote)

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/TheLiteralCreative/LiteralMemories.git
cd LiteralMemories

# 2. Install dependencies
pnpm install

# 3. Copy and fill in environment variables
cp .env.example .env
# Edit .env with your database URL, SMTP credentials, and admin password

# 4. Push the database schema
pnpm db:push

# 5. Start the development server
pnpm dev
```

The app will be available at `http://localhost:3000`.

### Running Tests

```bash
pnpm test
```

14 tests pass. The live SMTP connection test is skipped automatically in environments where port 465 is blocked (e.g., CI, sandboxes).

---

## Notification Flow

When a client submits a quote via the **"Save & Email My Quote"** button:

```
Client submits quote
        │
        ├─► HTML estimate email → client's email address
        ├─► HTML copy           → Joel@literalmemories.com
        ├─► Silent BCC          → Joel@literalcreative.com
        └─► Plain-text SMS      → 6153640630@tmomail.net (T-Mobile gateway)
```

The Purelymail auto-reply is configured at the mailbox level and fires independently whenever any email arrives at `Joel@literalmemories.com`.

---

## Pricing Data

All service pricing, tier thresholds, and discount logic lives in `client/src/lib/pricingData.ts`. To update prices or add new services, edit that file — no database changes required.

---

## Design

The site uses the **"Memory Lane"** design language:

- **Primary color:** Deep forest green (`oklch(0.35 0.09 155)`)
- **Accent:** Warm gold (`oklch(0.75 0.12 75)`)
- **Background:** Warm cream (`oklch(0.98 0.008 75)`)
- **Display font:** Cormorant Garamond
- **UI font:** Nunito Sans

---

## Deployment

The site is hosted on Manus managed hosting and deployed via the Manus Management UI. To deploy an update:

1. Save a checkpoint in the Manus Management UI
2. Click the **Publish** button

Custom domains `literalmemories.com` and `www.literalmemories.com` are already configured with SSL.

---

## Contact

**Joel Wilson** — Literal Memories Legacy Media Digitization Services
📧 [Joel@literalmemories.com](mailto:Joel@literalmemories.com)
🌐 [literalmemories.com](https://literalmemories.com)
