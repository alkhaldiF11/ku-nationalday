import {randomUUID} from "node:crypto";

import {hashPassword} from "@/lib/auth/password";
import {EVENING_PROGRAMME} from "@/lib/db/programme";
import {one, run, transaction} from "@/lib/db";
import {putFile} from "@/lib/storage";

export const DEMO_STAFF = [
  {username: "admin", fullName: "Event Administrator", role: "admin", password: "Admin@2026"},
  {username: "reception", fullName: "Reception Desk", role: "reception", password: "Reception@2026"},
  {username: "itdesk", fullName: "IT Desk", role: "itdesk", password: "ITDesk@2026"},
] as const;

export const DEMO_GUEST_PASSWORD = "Guest@2026";

/** Seeds an empty database. Runs once: skipped as soon as any staff account exists. */
export async function seedDatabase() {
  const existing = await one<{n: number}>("SELECT COUNT(*) AS n FROM staff_users");
  if ((existing?.n ?? 0) > 0) {
    return;
  }

  // Real by default: a new database gets only the administrator account. Demo guests, staff,
  // announcements and gallery art are opt-in (SEED_DEMO_DATA=true) — the automated tests use them
  // in their own throwaway databases.
  const demo = process.env.SEED_DEMO_DATA === "true";
  const now = new Date().toISOString();
  // Demo gallery art is stored before the transaction (storage is a separate system).
  const gallery = demo ? await storeSeedGallery() : [];

  await transaction(async () => {
    const settings: Record<string, string> = {
      event_name: "Kingdom University National Day",
      event_date: "2026-12-16",
      event_venue: "Kingdom University Campus, Riffa",
      contact_email: "events@ku.edu.bh",
      contact_phone: "+973 1700 0000",
    };
    for (const [key, value] of Object.entries(settings)) {
      await run("INSERT INTO settings (key, value) VALUES (:key, :value)", {key, value});
    }

    const staff = demo ? DEMO_STAFF : DEMO_STAFF.filter((item) => item.role === "admin");
    for (const member of staff) {
      const password = member.role === "admin" && process.env.ADMIN_INITIAL_PASSWORD ? process.env.ADMIN_INITIAL_PASSWORD : member.password;
      await run(
        `INSERT INTO staff_users (id, username, full_name, role, password_hash, is_active, created_at, updated_at)
         VALUES (:id, :username, :fullName, :role, :hash, 1, :now, :now)`,
        {id: randomUUID(), username: member.username, fullName: member.fullName, role: member.role, hash: hashPassword(password), now},
      );
    }

    if (!demo) {
      return;
    }

    await insertProgramme("2026-12-16", now);

    const guestHash = hashPassword(DEMO_GUEST_PASSWORD);
    const guests = [
      ["G-1001", "Fatima Al Khalifa", "+97333000001", "fatima@example.com", "VIP guest"],
      ["G-1002", "Yousef Nasser", "+97333000002", "yousef@example.com", null],
      ["G-1003", "Maryam Al Sayed", "+97333000003", null, null],
    ] as const;
    const guestIds: string[] = [];
    for (const [code, fullName, phone, email, notes] of guests) {
      const id = randomUUID();
      guestIds.push(id);
      await run(
        `INSERT INTO guests (id, code, full_name, phone, email, notes, password_hash, is_active, source, created_at, updated_at)
         VALUES (:id, :code, :fullName, :phone, :email, :notes, :hash, 1, 'seed', :now, :now)`,
        {id, code, fullName, phone, email, notes, hash: guestHash, now},
      );
    }

    // Results recorded at the IT Desk: Fatima 3/4 = 75% (qualifies for the teddy bear), Yousef 2/4 = 50%.
    for (const [index, played, won] of [[0, 4, 3], [1, 4, 2]] as const) {
      await run(
        `INSERT INTO game_results (guest_id, games_played, games_won, recorded_by, created_at, updated_at) VALUES (:guestId, :played, :won, 'IT Desk', :now, :now)`,
        {guestId: guestIds[index], played, won, now},
      );
    }

    const announce = (title: string, body: string, at: string) =>
      run(
        `INSERT INTO announcements (id, title, body, is_published, created_by, created_at) VALUES (:id, :title, :body, 1, 'Event Administrator', :now)`,
        {id: randomUUID(), title, body, now: at},
      );
    await announce(
      "Welcome to National Day 2026",
      "Play the National Day games, then bring your Guest ID to the IT Desk to record your results. Win at least 75% of your games to take home a teddy bear — and every registered guest is entered in the Grand Prize draw at 21:30.",
      now,
    );
    await announce(
      "Parking & arrival",
      "Visitor parking is available at the north car park. Shuttle carts run to the Main Gate Plaza every 10 minutes from 15:30.",
      new Date(Date.now() - 60_000).toISOString(),
    );

    for (const [index, item] of gallery.entries()) {
      await run(
        `INSERT INTO gallery_images (id, title, caption, category, album_year, file_name, uploaded_by, created_at)
         VALUES (:id, :title, :caption, :category, 2026, :fileName, 'Event Administrator', :createdAt)`,
        {id: randomUUID(), title: item.title, caption: item.caption, category: item.category, fileName: item.fileName, createdAt: new Date(Date.parse(now) - index * 60_000).toISOString()},
      );
    }
    await run(
      `INSERT INTO audit_log (actor_type, actor_id, actor_name, action, details, created_at) VALUES ('system', NULL, 'System', 'event.seeded', :details, :now)`,
      {details: "Demo event data created: programme, gallery, 3 sample guests and their game results", now},
    );
  });
}

/** Inserts the bilingual evening programme (see programme.ts) for `date`. */
export async function insertProgramme(date: string, now: string) {
  for (const item of EVENING_PROGRAMME) {
    await run(
      `INSERT INTO activities (id, title, title_ar, description, description_ar, location, location_ar, date, start_time, end_time, category, is_active, created_at, updated_at)
       VALUES (:id, :title, :titleAr, :description, :descriptionAr, :location, :locationAr, :date, :start, :end, :category, 1, :now, :now)`,
      {id: randomUUID(), ...item, date, now},
    );
  }
}

async function storeSeedGallery() {
  const items = [
    {title: "Flag Raising at Dawn", caption: "The Bahrain flag rises over the main campus.", category: "Ceremony", art: artFlag()},
    {title: "Sounds of Al-Ardah", caption: "Drummers lead the traditional sword dance.", category: "Culture", art: artRhythm()},
    {title: "Pearls of the Gulf", caption: "A tribute to Bahrain's pearling heritage.", category: "Heritage", art: artPearls()},
    {title: "Evening Celebrations", caption: "Lights over the courtyard after the closing ceremony.", category: "Celebration", art: artLights()},
  ];
  const stored = [];
  for (const [index, item] of items.entries()) {
    const fileName = `seed-${index + 1}-${randomUUID().slice(0, 8)}.svg`;
    await putFile(`uploads/${fileName}`, item.art);
    stored.push({title: item.title, caption: item.caption, category: item.category, fileName});
  }
  return stored;
}

const svg = (body: string, bg: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="1200" height="800"><rect width="1200" height="800" fill="${bg}"/>${body}</svg>`;

function serration(x: number, teeth: number, depth: number, height: number) {
  const step = height / (teeth * 2);
  let points = `0,0 ${x},0`;
  for (let index = 0; index < teeth; index += 1) {
    points += ` ${x + depth},${step * (index * 2 + 1)} ${x},${step * (index * 2 + 2)}`;
  }
  return `${points} 0,${height}`;
}

function artFlag() {
  return svg(
    `<polygon points="${serration(420, 5, 120, 800)}" fill="#ffffff"/>
     <circle cx="900" cy="230" r="90" fill="#f7c873" opacity="0.9"/>
     <path d="M0 690 Q300 640 600 690 T1200 690 V800 H0Z" fill="#8f0c1c" opacity="0.6"/>`,
    "#ce1126",
  );
}

function artRhythm() {
  const rings = Array.from({length: 7}, (_, index) => `<circle cx="600" cy="400" r="${60 + index * 55}" fill="none" stroke="#ce1126" stroke-width="${index % 2 ? 6 : 14}" opacity="${0.9 - index * 0.1}"/>`).join("");
  return svg(`${rings}<circle cx="600" cy="400" r="38" fill="#ce1126"/>`, "#fbf3ea");
}

function artPearls() {
  const pearls = Array.from({length: 18}, (_, index) => {
    const x = 120 + (index % 6) * 190;
    const y = 180 + Math.floor(index / 6) * 220 + (index % 2) * 40;
    const r = 34 + ((index * 7) % 5) * 8;
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#p)"/>`;
  }).join("");
  return svg(
    `<defs><radialGradient id="p" cx="35%" cy="35%"><stop offset="0" stop-color="#ffffff"/><stop offset="0.6" stop-color="#efe6dc"/><stop offset="1" stop-color="#c9b8a6"/></radialGradient></defs>${pearls}`,
    "#16324f",
  );
}

function artLights() {
  const bursts = [
    [300, 260, "#f7c873"],
    [780, 200, "#ffffff"],
    [980, 420, "#ce1126"],
    [520, 480, "#f7c873"],
  ]
    .map(([cx, cy, color]) =>
      Array.from({length: 16}, (_, index) => {
        const angle = (index / 16) * Math.PI * 2;
        const x2 = Number(cx) + Math.cos(angle) * 120;
        const y2 = Number(cy) + Math.sin(angle) * 120;
        return `<line x1="${cx}" y1="${cy}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${color}" stroke-width="5" stroke-linecap="round" opacity="0.85"/>`;
      }).join(""),
    )
    .join("");
  return svg(`${bursts}<rect y="640" width="1200" height="160" fill="#0d0d16"/>`, "#1b1830");
}
