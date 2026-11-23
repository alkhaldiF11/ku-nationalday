import type {Client} from "@libsql/client";

/**
 * Ordered schema migrations. Each entry runs once, inside a transaction,
 * and its index (1-based) is recorded in `schema_migrations`.
 * Never edit a migration that has shipped — append a new one instead.
 */
const MIGRATIONS: string[] = [
  `
  CREATE TABLE staff_users (
    id            TEXT PRIMARY KEY,
    username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
    full_name     TEXT NOT NULL,
    role          TEXT NOT NULL CHECK (role IN ('admin','reception','games','tickets','rewards')),
    password_hash TEXT NOT NULL,
    is_active     INTEGER NOT NULL DEFAULT 1,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
  );

  CREATE TABLE guests (
    id              TEXT PRIMARY KEY,
    code            TEXT NOT NULL UNIQUE COLLATE NOCASE,
    full_name       TEXT NOT NULL,
    phone           TEXT NOT NULL UNIQUE,
    email           TEXT,
    notes           TEXT,
    password_hash   TEXT NOT NULL,
    is_active       INTEGER NOT NULL DEFAULT 1,
    points          INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0),
    source          TEXT NOT NULL CHECK (source IN ('self','reception','admin','seed')),
    checked_in_at   TEXT,
    checked_in_by   TEXT,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
  );

  CREATE TABLE sessions (
    token_hash   TEXT PRIMARY KEY,
    subject_type TEXT NOT NULL CHECK (subject_type IN ('staff','guest')),
    subject_id   TEXT NOT NULL,
    expires_at   TEXT NOT NULL,
    created_at   TEXT NOT NULL
  );
  CREATE INDEX idx_sessions_subject ON sessions(subject_type, subject_id);

  CREATE TABLE login_attempts (
    key          TEXT PRIMARY KEY,
    failures     INTEGER NOT NULL,
    window_start TEXT NOT NULL
  );

  CREATE TABLE activities (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    location    TEXT NOT NULL,
    date        TEXT NOT NULL,
    start_time  TEXT NOT NULL,
    end_time    TEXT NOT NULL,
    category    TEXT NOT NULL DEFAULT 'general',
    is_active   INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
  );

  CREATE TABLE gallery_images (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    caption     TEXT,
    category    TEXT NOT NULL DEFAULT 'General',
    file_name   TEXT NOT NULL,
    uploaded_by TEXT NOT NULL,
    created_at  TEXT NOT NULL
  );

  CREATE TABLE announcements (
    id           TEXT PRIMARY KEY,
    title        TEXT NOT NULL,
    body         TEXT NOT NULL,
    is_published INTEGER NOT NULL DEFAULT 1,
    created_by   TEXT NOT NULL,
    created_at   TEXT NOT NULL
  );

  CREATE TABLE games (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    points      INTEGER NOT NULL CHECK (points >= 0),
    is_active   INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL
  );

  CREATE TABLE tickets (
    id         TEXT PRIMARY KEY,
    number     INTEGER NOT NULL UNIQUE,
    guest_id   TEXT NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    source     TEXT NOT NULL CHECK (source IN ('game','desk')),
    issued_by  TEXT NOT NULL,
    is_winner  INTEGER NOT NULL DEFAULT 0,
    drawn_at   TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX idx_tickets_guest ON tickets(guest_id);

  CREATE TABLE game_plays (
    id             TEXT PRIMARY KEY,
    request_id     TEXT NOT NULL UNIQUE,
    guest_id       TEXT NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    game_id        TEXT NOT NULL REFERENCES games(id),
    result         TEXT NOT NULL CHECK (result IN ('win','loss')),
    points_awarded INTEGER NOT NULL,
    ticket_id      TEXT REFERENCES tickets(id) ON DELETE SET NULL,
    recorded_by    TEXT NOT NULL,
    created_at     TEXT NOT NULL
  );
  CREATE INDEX idx_game_plays_guest ON game_plays(guest_id);

  CREATE TABLE rewards (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    cost        INTEGER NOT NULL CHECK (cost >= 0),
    stock       INTEGER NOT NULL CHECK (stock >= 0),
    is_active   INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL
  );

  CREATE TABLE reward_claims (
    id          TEXT PRIMARY KEY,
    guest_id    TEXT NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    reward_id   TEXT NOT NULL REFERENCES rewards(id),
    points_spent INTEGER NOT NULL,
    claimed_by  TEXT NOT NULL,
    created_at  TEXT NOT NULL,
    UNIQUE (guest_id, reward_id)
  );

  CREATE TABLE audit_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_type TEXT NOT NULL,
    actor_id   TEXT,
    actor_name TEXT NOT NULL,
    action     TEXT NOT NULL,
    details    TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  `,
  // 2 — bilingual programme: Arabic title, location and description per activity.
  `
  ALTER TABLE activities ADD COLUMN title_ar TEXT;
  ALTER TABLE activities ADD COLUMN location_ar TEXT;
  ALTER TABLE activities ADD COLUMN description_ar TEXT;
  `,
  // 3 — guest photo submissions with admin moderation. Files live in private storage
  // (data/private/submissions) and are only served through an access-checked route.
  `
  CREATE TABLE photo_submissions (
    id               TEXT PRIMARY KEY,
    guest_id         TEXT NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    storage_path     TEXT NOT NULL UNIQUE,
    title            TEXT,
    caption          TEXT,
    status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
    rejection_reason TEXT,
    reviewed_by      TEXT REFERENCES staff_users(id) ON DELETE SET NULL,
    reviewed_by_name TEXT,
    reviewed_at      TEXT,
    guest_notified   INTEGER NOT NULL DEFAULT 1,
    created_at       TEXT NOT NULL,
    CHECK (status = 'rejected' OR rejection_reason IS NULL)
  );
  CREATE INDEX idx_photo_submissions_guest ON photo_submissions(guest_id, created_at);
  CREATE INDEX idx_photo_submissions_status ON photo_submissions(status, created_at);
  `,
  // 4 — official gallery photos are organised in yearly albums (National Day 2024, 2025, 2026…).
  `
  ALTER TABLE gallery_images ADD COLUMN album_year INTEGER;
  UPDATE gallery_images SET album_year = CAST(strftime('%Y', created_at) AS INTEGER);
  CREATE INDEX idx_gallery_album ON gallery_images(album_year, created_at);
  `,
  // 5 — albums are first-class, so a folder exists (and can be prepared) before it has photos.
  // Starts with the 2025 and 2026 albums plus any year already used by a photo.
  `
  CREATE TABLE gallery_albums (
    year       INTEGER PRIMARY KEY CHECK (year BETWEEN 2000 AND 2100),
    created_at TEXT NOT NULL
  );
  INSERT OR IGNORE INTO gallery_albums (year, created_at)
    SELECT DISTINCT album_year, strftime('%Y-%m-%dT%H:%M:%fZ', 'now') FROM gallery_images WHERE album_year IS NOT NULL;
  INSERT OR IGNORE INTO gallery_albums (year, created_at) VALUES (2025, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
  INSERT OR IGNORE INTO gallery_albums (year, created_at) VALUES (2026, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
  `,
  // 6 — games are physical; results are recorded centrally at the IT Desk.
  //     Replaces per-game plays, raffle tickets, points and the rewards catalogue with:
  //       • game_results: one row per guest (games played / won, teddy-bear collection)
  //       • grand_prize_draws: random draws over registered Guest IDs, with history
  //     Staff roles become admin / reception / itdesk (the old games/tickets/rewards desks → itdesk).
  `
  CREATE TABLE staff_users_new (
    id            TEXT PRIMARY KEY,
    username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
    full_name     TEXT NOT NULL,
    role          TEXT NOT NULL CHECK (role IN ('admin','reception','itdesk')),
    password_hash TEXT NOT NULL,
    is_active     INTEGER NOT NULL DEFAULT 1,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
  );
  INSERT INTO staff_users_new (id, username, full_name, role, password_hash, is_active, created_at, updated_at)
    SELECT id, username, full_name, CASE WHEN role IN ('games','tickets','rewards') THEN 'itdesk' ELSE role END,
           password_hash, is_active, created_at, updated_at
    FROM staff_users;
  DROP TABLE staff_users;
  ALTER TABLE staff_users_new RENAME TO staff_users;

  CREATE TABLE game_results (
    guest_id           TEXT PRIMARY KEY REFERENCES guests(id) ON DELETE CASCADE,
    games_played       INTEGER NOT NULL CHECK (games_played >= 0),
    games_won          INTEGER NOT NULL CHECK (games_won >= 0),
    teddy_collected_at TEXT,
    teddy_collected_by TEXT,
    recorded_by        TEXT NOT NULL,
    created_at         TEXT NOT NULL,
    updated_at         TEXT NOT NULL,
    CHECK (games_won <= games_played)
  );

  CREATE TABLE grand_prize_draws (
    id           TEXT PRIMARY KEY,
    guest_id     TEXT REFERENCES guests(id) ON DELETE SET NULL,
    guest_code   TEXT NOT NULL,
    guest_name   TEXT NOT NULL,
    entries      INTEGER NOT NULL,
    status       TEXT NOT NULL CHECK (status IN ('drawn','final','void')),
    drawn_by     TEXT NOT NULL,
    drawn_at     TEXT NOT NULL,
    finalized_by TEXT,
    finalized_at TEXT
  );
  CREATE INDEX idx_grand_prize_draws_drawn ON grand_prize_draws(drawn_at);

  DROP TABLE IF EXISTS reward_claims;
  DROP TABLE IF EXISTS game_plays;
  DROP TABLE IF EXISTS tickets;
  DROP TABLE IF EXISTS rewards;
  DROP TABLE IF EXISTS games;
  ALTER TABLE guests DROP COLUMN points;
  `,
  // 7 — Online registration (students, visitors & families, graduates, university staff) with
  // admin approval. Guests gain a category and a link to their application; phone and password
  // become optional (children in a family have neither), which SQLite can only do by rebuilding
  // the table — so this migration runs with foreign keys paused (see FOREIGN_KEYS_OFF below).
  `
  CREATE TABLE registrations (
    id               TEXT PRIMARY KEY,
    type             TEXT NOT NULL CHECK (type IN ('student','visitor','graduate','staff')),
    status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
    full_name        TEXT NOT NULL,
    email            TEXT,
    phone            TEXT,
    student_id       TEXT,
    job_title        TEXT,
    is_family        INTEGER NOT NULL DEFAULT 0 CHECK (is_family IN (0,1)),
    password_hash    TEXT NOT NULL,
    rejection_reason TEXT,
    created_at       TEXT NOT NULL,
    reviewed_by      TEXT,
    reviewed_by_name TEXT,
    reviewed_at      TEXT
  );
  CREATE INDEX idx_registrations_status ON registrations(status, created_at);
  -- One open or approved application per email / phone / previous student ID (a rejected one may re-apply).
  CREATE UNIQUE INDEX idx_registrations_email ON registrations(lower(email)) WHERE email IS NOT NULL AND status <> 'rejected';
  CREATE UNIQUE INDEX idx_registrations_phone ON registrations(phone) WHERE phone IS NOT NULL AND status <> 'rejected';
  CREATE UNIQUE INDEX idx_registrations_student_id ON registrations(upper(student_id)) WHERE student_id IS NOT NULL AND status <> 'rejected';

  -- Children in a family application (the parent is the registration itself).
  CREATE TABLE registration_members (
    id              TEXT PRIMARY KEY,
    registration_id TEXT NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
    full_name       TEXT NOT NULL,
    position        INTEGER NOT NULL,
    guest_id        TEXT REFERENCES guests(id) ON DELETE SET NULL,
    UNIQUE (registration_id, position)
  );

  CREATE TABLE guests_new (
    id                TEXT PRIMARY KEY,
    code              TEXT NOT NULL UNIQUE COLLATE NOCASE,
    full_name         TEXT NOT NULL,
    phone             TEXT UNIQUE,
    email             TEXT,
    notes             TEXT,
    password_hash     TEXT,
    is_active         INTEGER NOT NULL DEFAULT 1,
    source            TEXT NOT NULL CHECK (source IN ('self','reception','admin','seed','online')),
    category          TEXT NOT NULL DEFAULT 'visitor' CHECK (category IN ('student','visitor','graduate','staff')),
    registration_id   TEXT REFERENCES registrations(id) ON DELETE SET NULL,
    is_account_holder INTEGER NOT NULL DEFAULT 1 CHECK (is_account_holder IN (0,1)),
    checked_in_at     TEXT,
    checked_in_by     TEXT,
    created_at        TEXT NOT NULL,
    updated_at        TEXT NOT NULL
  );
  INSERT INTO guests_new (id, code, full_name, phone, email, notes, password_hash, is_active, source, category, registration_id, is_account_holder, checked_in_at, checked_in_by, created_at, updated_at)
    SELECT id, code, full_name, phone, NULLIF(trim(email), ''), notes, password_hash, is_active, source, 'visitor', NULL, 1, checked_in_at, checked_in_by, created_at, updated_at FROM guests;
  DROP TABLE guests;
  ALTER TABLE guests_new RENAME TO guests;
  CREATE UNIQUE INDEX idx_guests_email ON guests(lower(email)) WHERE email IS NOT NULL;
  CREATE INDEX idx_guests_category ON guests(category, is_active);
  CREATE INDEX idx_guests_registration ON guests(registration_id);

  INSERT OR IGNORE INTO settings (key, value) VALUES ('university_email_domains', 'ku.edu.bh');
  `,
  // 8 — Annual attendance (ranks) and admin-announced winners. Additive only.
  `
  -- One row per guest per National Day year; the key makes a second record for the same year impossible.
  CREATE TABLE attendance (
    guest_id    TEXT NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    event_year  INTEGER NOT NULL CHECK (event_year BETWEEN 2000 AND 2100),
    source      TEXT NOT NULL CHECK (source IN ('checkin','admin')),
    recorded_by TEXT NOT NULL,
    recorded_at TEXT NOT NULL,
    PRIMARY KEY (guest_id, event_year)
  );
  CREATE INDEX idx_attendance_year ON attendance(event_year);

  -- Check-ins already made this year count as this year's attendance.
  INSERT OR IGNORE INTO attendance (guest_id, event_year, source, recorded_by, recorded_at)
    SELECT id, CAST(COALESCE((SELECT substr(value, 1, 4) FROM settings WHERE key = 'event_date'), '2026') AS INTEGER),
           'checkin', COALESCE(checked_in_by, 'System'), checked_in_at
    FROM guests WHERE checked_in_at IS NOT NULL;

  -- Winners are chosen by an administrator (never at random). seen_at: when the guest dismissed the pop-up.
  CREATE TABLE winner_announcements (
    id                TEXT PRIMARY KEY,
    guest_id          TEXT NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    prize             TEXT NOT NULL,
    message           TEXT,
    announced_by      TEXT,
    announced_by_name TEXT NOT NULL,
    announced_at      TEXT NOT NULL,
    seen_at           TEXT
  );
  -- The same prize can't be announced to the same guest twice.
  CREATE UNIQUE INDEX idx_winner_announcements_unique ON winner_announcements(guest_id, lower(trim(prize)));
  CREATE INDEX idx_winner_announcements_guest ON winner_announcements(guest_id, seen_at);

  INSERT OR IGNORE INTO settings (key, value) VALUES ('rank_thresholds', '{"silver":1,"gold":2,"platinum":3,"crystal":5}');
  `,
];

/**
 * Migrations (1-based) that rebuild a table other tables point at. With foreign keys on, dropping
 * the old table would cascade-delete its children, so these run with foreign keys paused. Turso
 * keeps a PRAGMA only for the request it's sent in, so pause + transaction + migration + record
 * all go out as ONE request (a failure rolls the whole thing back). Verified on Turso.
 */
const FOREIGN_KEYS_OFF = new Set([7]);

export async function migrate(client: Client) {
  await client.execute(`CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)`);
  const current = Number((await client.execute(`SELECT COALESCE(MAX(version), 0) AS v FROM schema_migrations`)).rows[0][0]);

  // Each migration commits on its own, with every foreign-key relationship verified first.
  // (Table rebuilds on a database that already holds rows need foreign keys paused; the
  // existing rebuilds ran long ago, so new migrations should avoid them.)
  for (let index = current; index < MIGRATIONS.length; index += 1) {
    if (FOREIGN_KEYS_OFF.has(index + 1)) {
      await runWithForeignKeysPaused(client, index + 1, MIGRATIONS[index]);
      continue;
    }
    const tx = await client.transaction("write");
    try {
      await tx.executeMultiple(MIGRATIONS[index]);
      const broken = await tx.execute("PRAGMA foreign_key_check");
      if (broken.rows.length) {
        throw new Error(`Migration ${index + 1} left ${broken.rows.length} broken foreign key reference(s)`);
      }
      await tx.execute({sql: `INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)`, args: [index + 1, new Date().toISOString()]});
      await tx.commit();
    } catch (error) {
      await tx.rollback().catch(() => undefined);
      throw error;
    } finally {
      tx.close();
    }
  }
}

async function runWithForeignKeysPaused(client: Client, version: number, sql: string) {
  const record = `INSERT INTO schema_migrations (version, applied_at) VALUES (${version}, '${new Date().toISOString()}');`;
  try {
    await client.executeMultiple(`PRAGMA foreign_keys = OFF;\nBEGIN IMMEDIATE;\n${sql}\n${record}\nCOMMIT;\nPRAGMA foreign_keys = ON;`);
  } catch (error) {
    // A local file connection may still hold the open transaction; a remote one is already rolled back.
    await client.executeMultiple("ROLLBACK; PRAGMA foreign_keys = ON;").catch(() => undefined);
    throw error;
  }
  // Rows were copied unchanged, so every reference must still resolve.
  const broken = await client.execute("PRAGMA foreign_key_check");
  if (broken.rows.length) {
    throw new Error(`Migration ${version} left ${broken.rows.length} broken foreign key reference(s)`);
  }
}
