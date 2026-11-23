# Kingdom University · Bahrain National Day

Event website and operations system for the Kingdom University National Day celebration (16 December). One Next.js app serves the public site, the guest portal, and the staff desks, all backed by a single SQLite database. Everything is bilingual (English / Arabic, with full right-to-left layout).

## What it does

**Public site:** the event home page with a live countdown, programme timeline, photo gallery (yearly albums plus a guest-photo folder), how the prizes work, announcements and venue details.

**Registration** happens online at `/register` (or at a desk). Four types: **Student** (university email), **Visitor** (phone; optionally a whole **family** — the parent plus any number of children on one application), **Graduate** (phone + previous student ID) and **University staff** (university email + job title). Phone numbers from every country are accepted (country picker, validated with libphonenumber). An application creates **no account**: it waits in **Registration Management** until an administrator approves or rejects it. On approval every person — each child too — becomes a guest with their own permanent Guest ID, linked to the same application. Pending or rejected applicants can't sign in (sign-in tells them their application is pending / wasn't approved). Duplicates (same email, phone or previous student ID on an open or approved application, or on an existing guest) are refused, also by unique indexes in the database.

**Guests** sign in with their Guest ID, mobile number or email. Desk staff can still create accounts on the spot (temporary password + personal QR pass). From the guest portal guests can:
- see their family members' Guest IDs (family accounts)
- see **My Games & Rewards** (read-only): Guest ID, games played and won, winning rate, teddy-bear eligibility and collection status
- update their contact details and password
- share their own photos from the event: each photo waits for administrator approval before it appears in the gallery, and the guest can follow its status (pending, approved, or rejected with a reason)

**Annual attendance ranks.** Every verified attendance — one per National Day year, recorded automatically by a check-in at a desk or added by an administrator (registering never counts) — moves a guest up the ranks **Silver → Gold → Platinum → Crystal**. Thresholds are configurable in **Staff → Ranks & attendance** (initially 1 / 2 / 3 / 5 attendances; each rank must need more than the one before; defined in `src/lib/ranks.ts`). Guests see their rank card, progress to the next rank and their yearly history under **Rewards**; administrators see rank statistics, attendance per year, every guest's rank (filterable), and edit a guest's attendance on the guest page.

**Winner announcements.** In **Staff → Winners** an administrator picks the guest and prize (plus an optional message) and confirms; winners are never chosen automatically. The guest gets a congratulations pop-up the next time they open their pass (even if they were offline), once — it stays in their awards history afterwards. The same prize can't be announced twice to the same guest.

**Games are physical.** Staff run each game and decide who wins; there is no device at the game stations. Guests take their results to the **IT Desk**, the only digital point for games.

**Staff areas** (role-based):

| Area | Role | What happens there |
|---|---|---|
| Reception | `reception` | Register walk-in guests with a category (temporary password + printable QR), check guests in. IT Desk staff can register guests too |
| IT Desk: game results | `itdesk` | Find a guest by Guest ID or name, record games played and won. The winning rate (won ÷ played × 100) and teddy-bear eligibility are calculated automatically |
| Teddy bear prizes | `itdesk` | Guests with a winning rate of **75% or more** qualify. Mark each bear as collected; it can't be collected twice |
| Grand prize draw | `admin` | A random draw over registered Guest IDs with a full-screen winner announcement. Confirm or cancel each draw; a drawn ID is never drawn again; full history is kept |

**Administrators** can open every desk, review **online registrations** (search, filter by type and status, view family members, approve or reject with a reason), see **Registration Statistics** on the dashboard (approved individuals per category from the database — every family member counts; pending/rejected don't), and also manage guests, the programme, announcements, the gallery (photo upload), guest photo approval, games & prizes, staff accounts, event settings, and a full activity log.

## Running it

Requires **Node.js 22 or newer** (developed on Node 25).

```bash
npm install
npm run dev          # http://localhost:3000
```

Locally, the first request creates `data/nationalday.db` (SQLite), runs the schema migrations and seeds demo data. Photos go to `data/uploads` and `data/private/submissions`.

### Production on Vercel (free tiers)

In production the same code uses two hosted services instead of the local folder:

| What | Service | Environment variables |
|---|---|---|
| Database | **Turso** (hosted SQLite / libSQL) | `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` |
| Photos | **Vercel Blob**, private store | `BLOB_READ_WRITE_TOKEN` |

1. Push the project to a GitHub repository and import it in Vercel (**Add New → Project**).
2. In the Vercel project: **Storage → Create → Blob**, access **Private**, and connect it to the project. This adds `BLOB_READ_WRITE_TOKEN`.
3. Create a Turso database (Turso dashboard, or **Storage → Marketplace → Turso** in Vercel, which adds both Turso variables). Put it in the region closest to the Vercel functions, and set the function region in **Settings → Functions** to match.
4. Set `ADMIN_INITIAL_PASSWORD` (and `SEED_DEMO_DATA=false` for a clean event) before the first visit, then deploy.
5. To bring over existing local data: `vercel env pull .env.vercel`, then `node --env-file=.env.vercel scripts/migrate-to-cloud.mjs --replace`. Keep the keys in `.env.vercel`, not `.env.local`: Next.js loads `.env.local` automatically, so local runs and tests would write to the live database. It copies every table to Turso (checking row counts) and every photo to Blob. Sign-in sessions aren't copied.

Photo uploads are shrunk in the browser first (Vercel accepts at most 4.5 MB per request), and every Blob file is private: the site's own routes decide who may see each photo.

Self-hosting also works: `npm run build && npm start` on any Node server, with or without the variables above.

### Demo accounts (seeded)

| Who | Sign in at | Username / ID | Password |
|---|---|---|---|
| Administrator | `/staff/login` | `admin` | `Admin@2026` |
| Reception | `/staff/login` | `reception` | `Reception@2026` |
| IT Desk | `/staff/login` | `itdesk` | `ITDesk@2026` |
| Guests | `/login` | `G-1001`, `G-1002`, `G-1003` | `Guest@2026` |

Change these before a real event, or start with `SEED_DEMO_DATA=false` and `ADMIN_INITIAL_PASSWORD` set.

## Tests

```bash
npm test             # unit tests: business rules against an in-memory database (includes a 500-guest draw)
npm run build
npm run test:e2e     # Playwright: main user journeys against the production build
```

The end-to-end suite wipes and recreates `.e2e-data/` on every run. It covers the blocked self-registration, desk sign-up and check-in, IT Desk results, teddy-bear collection, the grand prize draw, role enforcement, admin content management (including upload validation), the home-page countdown, deactivating guests, Arabic/RTL, login lockout, and media path safety.

> On Windows, run the test commands from a shell whose working directory uses an uppercase drive letter (`C:\...`). Vitest loads twice and fails with "failed to find the runner" if the path starts with `c:\`.

## Architecture

```
src/
  app/
    (site)/            public pages + guest portal (/guest/*)
    staff/login        staff sign-in
    staff/(portal)/    staff desks and admin screens
    actions/           server actions — every one re-checks session and role
    media/[file]       serves gallery photos from storage
    photos/[id]        serves guest photos after an access check
  lib/
    db/                database client (Turso or local SQLite), migrations, seed
    storage.ts         photo storage (private Vercel Blob or local folders)
    data/              domain logic (guests, prizes, photos, content, staff, audit)
    auth/              password hashing, DB-backed sessions, rate limiting, guards
    i18n/              typed EN/AR dictionaries and formatters
    validation.ts      zod schemas for all inputs
  components/          UI (site, guest, staff, shared primitives)
tests/unit             domain tests (Vitest)
tests/e2e              journey tests (Playwright)
```

### Data integrity
- Game results, teddy-bear collection and draws are written inside write transactions. Collection is a conditional update (`teddy_collected_at IS NULL`), so two desks can't hand out the same bear. Once a bear is collected, only an administrator can change that guest's results.
- Teddy-bear eligibility uses exact integer math (won × 100 ≥ 75 × played), so 3/4 is exactly 75%.
- The grand prize draw picks uniformly with a cryptographic RNG over active registered Guest IDs (optionally checked-in only). A drawn ID — confirmed or cancelled — is never drawn again.
- Every change is recorded in the activity log.

### Security
- Passwords are hashed with scrypt.
- Sessions are random tokens in httpOnly, SameSite=Lax cookies, and only their SHA-256 hash is stored. Deactivating an account or resetting a password revokes its sessions.
- Authorization runs on the server for every page and server action; the proxy only redirects to the right sign-in page.
- Each account locks after 5 failed sign-ins in 15 minutes. The per-IP limit is deliberately loose (50), because a whole venue can share one address.
- Guest photo submissions are stored privately (private Vercel Blob in production, `data/private/submissions` locally) and served only through `/photos/[id]`, which checks on every request: approved photos are public, while pending and rejected ones are visible only to the guest who uploaded them and to administrators. Anyone else gets 404. Guests can delete only their own photos, and only while pending; only administrators can approve or reject. Photos are resized in the browser before upload, which also strips location (GPS) metadata.
- Uploads are capped at 4 MB and checked by file signature (JPG, PNG or WebP only), not by the name or MIME type the browser sends. They get server-generated names and are served with `nosniff`.
- Response headers set a Content Security Policy, frame denial, a referrer policy, and a permissions policy that allows only the camera (for the QR scanner).
- All inputs are validated with zod on the server.

### Backups
- **Vercel:** Turso keeps point-in-time restore for the database (free plan: about a day). For a copy you keep, run `turso db shell <db> .dump > backup.sql` (Turso CLI). Photos stay in Blob until deleted.
- **Local:** copy the `data/` folder while the app is stopped, or run `sqlite3 data/nationalday.db ".backup backup.db"` while it runs.

See [docs/OPERATIONS.md](docs/OPERATIONS.md) for the event-day runbook.
