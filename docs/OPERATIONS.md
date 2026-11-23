# Event-day runbook

For the event team running National Day on the day.

## Before the event (a week ahead)

1. **Fresh start.** Deploy (see README → Production on Vercel) with `SEED_DEMO_DATA=false` and a strong `ADMIN_INITIAL_PASSWORD`, then open the site once so it creates the database tables.
2. **Sign in as admin** at `/staff/login`. Then:
   - **Event settings:** date, venue, contact details, and the **university email domains** accepted for student and staff sign-ups (default `ku.edu.bh`, subdomains included).
   - **Registrations:** guests apply online at `/register`. Check **Staff → Registrations** regularly (the menu shows how many are waiting) and approve or reject each application. Approving gives every person — each child in a family too — their own Guest ID.
   - **Programme:** add every activity, with times in Bahrain time.
   - **Ranks:** check the thresholds in **Staff → Ranks & attendance**. If guests attended earlier National Days, add those years on each guest's page so their rank reflects it. This year's check-ins count automatically.
   - **Prizes:** have the teddy bears ready, and decide whether the grand prize draw is for all registered guests or checked-in guests only.
   - **Staff accounts:** create one account per desk person, with the matching role. Don't share accounts.
   - **Announcements:** publish a welcome message.
3. **Dry run.** On the real devices and network, register a test guest, record results at the IT Desk, mark a teddy bear as collected, and run a test draw (then cancel it). Then deactivate or delete the test guest.
   - **Load test (optional):** `node scripts/test-guests.mjs add 500` creates 500 test students (Guest IDs continue from the last one, password `Test@2026`, marked `[test-data]`, database backed up first) to try the draw at full size. `node scripts/test-guests.mjs status` shows the counts. **Before the event run `node scripts/test-guests.mjs remove`** and cancel/clear any test draws. Add `--env-file=.env.vercel` after `node` to run any of these against the live site (Turso) instead of the local database.
4. **Camera check.** Open each desk on the phone or tablet staff will use and tap **Scan QR**. The browser asks for camera permission once. Cameras only work over HTTPS (or `localhost`).

## On the day

| Desk | Device | Flow |
|---|---|---|
| Reception | Laptop + printer | Register walk-ins → hand over Guest ID and temporary password (or print). Scan arriving guests → **Check in**. |
| Game stations | None — paper or verbal | Staff run each physical game and tell guests whether they won. No device is needed at the stations. |
| IT Desk | Laptop | Guest gives their Guest ID → search → enter **games played** and **games won** → **Save**. The winning rate and teddy-bear eligibility appear automatically. |
| Teddy bears | IT Desk | Open **Teddy bear prizes → To collect**, find the guest, hand over the bear and press **Mark as collected**. A bear can't be collected twice. |
| Grand prize | Admin laptop on the big screen | At the closing ceremony open **Grand prize draw**, choose all registered or checked-in only, press **Start the draw**. The winner appears full-screen; press **Confirm winner**, or **Cancel draw** if the winner isn't present, then draw again. |
| Admin | Laptop | Dashboard shows live totals; the activity log shows every action. |

**Lost password:** reception can't see passwords. An admin opens the guest under **Guests** → **Reset password** and reads out the new temporary one.

**Wrong result recorded:** the IT Desk can correct totals until the teddy bear is collected; after that only an admin can change them (and undo a collection). Every change is in the activity log as the record.

**Locked out:** five wrong passwords lock that account for 15 minutes. An admin can set a new staff password under **Staff accounts**.

## Afterwards

1. Back up the data. On Vercel: `turso db shell <db> .dump > nationalday-final.sql` (Turso CLI). Locally: stop the app and copy `data/`, or run `sqlite3 data/nationalday.db ".backup nationalday-final.db"`.
2. Export what you need, then deactivate staff accounts.
