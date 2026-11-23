import {expect, test, type Page} from "@playwright/test";

/*
 * Main user journeys, end to end through the real UI, server actions and SQLite.
 * Tests run serially against one fresh database and build on each other's state.
 */
test.describe.configure({mode: "serial"});

const STAFF = {
  admin: ["admin", "Admin@2026"],
  reception: ["reception", "Reception@2026"],
  itdesk: ["itdesk", "ITDesk@2026"],
} as const;

async function staffLogin(page: Page, role: keyof typeof STAFF) {
  const [username, password] = STAFF[role];
  await page.goto("/staff/login");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", {name: "Sign in"}).click();
  await expect(page).not.toHaveURL(/\/staff\/login/);
}

async function guestLogin(page: Page, identifier: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Guest ID, mobile or email").fill(identifier);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", {name: "Sign in"}).click();
}

const toast = (page: Page) => page.getByRole("status").or(page.getByRole("alert"));

let walkInCode = "";

test("a visitor registers a family online; it stays pending until an administrator approves it", async ({page}) => {
  await page.goto("/");
  await page.getByRole("main").getByRole("link", {name: "Create an account"}).click();
  await expect(page).toHaveURL(/\/register$/);
  await page.getByRole("button", {name: /^Visitor/}).click();

  await page.getByLabel("Full name").fill("Khalid Al Mannai");
  await page.getByRole("combobox", {name: "Country"}).selectOption("SA"); // international number
  await page.getByLabel("Mobile number").fill("50 123 4567");
  await page.getByLabel("Email").fill("khalid@example.com");
  await page.getByLabel("Create a password").fill("FamilyPass26");
  await page.getByLabel("Confirm password").fill("FamilyPass26");
  await page.getByLabel(/Register as a family/).check();
  await page.getByLabel("Child 1 — full name").fill("Noor Al Mannai");
  await page.getByRole("button", {name: "Add child"}).click();
  await page.getByLabel("Child 2 — full name").fill("Hamad Al Mannai");
  await page.getByRole("button", {name: "Add child"}).click();
  await page.getByLabel("Child 3 — full name").fill("Removed Child");
  await page.getByRole("button", {name: "Remove child 3"}).click();
  await page.getByRole("button", {name: "Submit application"}).click();

  await expect(page.getByRole("heading", {name: "Application received"})).toBeVisible();
  await expect(page.getByText("Your family application includes 3 people")).toBeVisible();

  // Pending: the account doesn't exist yet, and sign-in says why.
  await guestLogin(page, "+966501234567", "FamilyPass26");
  await expect(page.getByText("Your application is still waiting for approval.")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);

  // The same phone can't apply twice.
  await page.goto("/register?type=visitor");
  await page.getByLabel("Full name").fill("Someone Else");
  await page.getByRole("combobox", {name: "Country"}).selectOption("SA");
  await page.getByLabel("Mobile number").fill("501234567");
  await page.getByLabel("Create a password").fill("Another123");
  await page.getByLabel("Confirm password").fill("Another123");
  await page.getByRole("button", {name: "Submit application"}).click();
  await expect(page.getByText("This mobile number is already registered.")).toBeVisible();

  // The administrator reviews the family application and approves it.
  await staffLogin(page, "admin");
  await expect(page.getByRole("link", {name: /Registrations\s*1/})).toBeVisible();
  await page.goto("/staff/registrations");
  await page.getByRole("link", {name: "Khalid Al Mannai"}).first().click();
  await expect(page.getByText("Family of 3").first()).toBeVisible();
  await expect(page.getByText("Noor Al Mannai")).toBeVisible();
  await expect(page.getByText("Hamad Al Mannai")).toBeVisible();
  await expect(page.getByText("Removed Child")).toHaveCount(0);
  await page.getByRole("button", {name: "Approve"}).click();
  await page.getByRole("dialog").getByRole("button", {name: "Approve"}).click();
  await expect(toast(page).filter({hasText: /Approved — Guest IDs: G-\d+, G-\d+, G-\d+/})).toBeVisible();
  await expect(page.getByText(/^G-\d+$/)).toHaveCount(3);

  // Statistics count every family member as a visitor (3 demo visitors + this family of 3).
  await page.goto("/staff?category=visitor#stats");
  await expect(page.getByTestId("stat-visitor")).toHaveText("6");
  await expect(page.getByText("Family accounts")).toBeVisible();

  // The parent signs in and sees each family member's own Guest ID.
  await page.context().clearCookies();
  await guestLogin(page, "+966501234567", "FamilyPass26");
  await expect(page).toHaveURL(/\/guest$/);
  const family = page.locator("section", {has: page.getByRole("heading", {name: "My family"})});
  // The parent is always shown; the children are behind a show/hide button.
  await expect(family.getByText("Khalid Al Mannai")).toBeVisible();
  await expect(family.getByText("Hamad Al Mannai")).toBeHidden();
  await family.getByText("Show children (2)").click();
  await expect(family.getByText("Hamad Al Mannai")).toBeVisible();
  await expect(family.getByText(/^G-\d+$/)).toHaveCount(3);
  await family.getByText("Hide children").click();
  await expect(family.getByText("Hamad Al Mannai")).toBeHidden();
});

test("student and staff sign-ups need a university email; a rejected applicant can't sign in", async ({page}) => {
  // The sign-in page offers the four registration types right beside the form.
  await page.goto("/login");
  const choices = page.getByRole("region", {name: "New here? Create an account"});
  for (const name of ["Student", "Visitor", "Graduate", "University staff"]) await expect(choices.getByRole("link", {name: new RegExp(`^${name}`)})).toBeVisible();
  await choices.getByRole("link", {name: /^Graduate/}).click();
  await expect(page).toHaveURL(/\/register\?type=graduate$/);
  await expect(page.getByLabel("Previous student ID")).toBeVisible();

  await page.goto("/register");
  await page.getByRole("button", {name: /^Student/}).click();
  await page.getByLabel("Full name").fill("Sara Ahmed");
  await page.getByLabel("University email").fill("sara@gmail.com");
  await page.getByLabel("Create a password").fill("StudentPass1");
  await page.getByLabel("Confirm password").fill("StudentPass1");
  await page.getByRole("button", {name: "Submit application"}).click();
  await expect(page.getByText("Use your Kingdom University email address.")).toBeVisible();
  await page.getByLabel("University email").fill("sara@student.ku.edu.bh");
  await page.getByRole("button", {name: "Submit application"}).click();
  await expect(page.getByRole("heading", {name: "Application received"})).toBeVisible();

  // University staff: job title required.
  await page.goto("/register?type=staff");
  await page.getByLabel("Full name").fill("Dr. Ahmed Saleh");
  await page.getByLabel("University email").fill("ahmed@ku.edu.bh");
  await page.getByLabel("Create a password").fill("StaffPass12");
  await page.getByLabel("Confirm password").fill("StaffPass12");
  await page.getByRole("button", {name: "Submit application"}).click();
  await expect(page.getByText("Required").first()).toBeVisible();
  await page.getByLabel("Job title").fill("Lecturer");
  await page.getByRole("button", {name: "Submit application"}).click();
  await expect(page.getByRole("heading", {name: "Application received"})).toBeVisible();

  // The administrator filters by type and rejects the student with a reason.
  await staffLogin(page, "admin");
  await page.goto("/staff/registrations?type=student");
  await expect(page.getByRole("link", {name: "Dr. Ahmed Saleh"})).toHaveCount(0);
  await page.getByRole("link", {name: "Sara Ahmed"}).first().click();
  await page.getByRole("button", {name: "Reject"}).click();
  await page.getByRole("dialog").getByLabel(/Reason/).fill("Not enrolled this year");
  await page.getByRole("dialog").getByRole("button", {name: "Reject"}).click();
  await expect(toast(page).filter({hasText: "Application rejected."})).toBeVisible();
  await expect(page.getByText("Reason: Not enrolled this year")).toBeVisible();
  await page.goto("/staff/registrations?status=rejected");
  await expect(page.getByRole("link", {name: "Sara Ahmed"}).first()).toBeVisible();

  await page.context().clearCookies();
  await guestLogin(page, "sara@student.ku.edu.bh", "StudentPass1");
  await expect(page.getByText("Your application wasn't approved.")).toBeVisible();
  await page.goto("/guest");
  await expect(page).toHaveURL(/\/login/); // no access to guest pages

  // Guests can't call the approval action: the page itself is admin-only.
  await page.goto("/staff/registrations");
  await expect(page).toHaveURL(/\/staff\/login/);
});

test("the desk registration form shows translated validation errors", async ({page}) => {
  await staffLogin(page, "reception");
  await page.getByLabel("Full name").fill("Short Phone");
  await page.getByLabel("Mobile number").fill("12");
  await page.getByRole("button", {name: "Register guest"}).click();
  await expect(page.getByText("Enter a valid mobile number")).toBeVisible();
});

test("reception registers a walk-in guest who then signs in and changes password", async ({page}) => {
  await staffLogin(page, "reception");
  await expect(page).toHaveURL(/\/staff\/reception/);

  await page.getByLabel("Full name").fill("Hamad Al Doseri");
  await page.getByLabel("Mobile number").fill("39887766");
  await page.getByRole("button", {name: "Register guest"}).click();
  await expect(page.getByText("Hamad Al Doseri is registered")).toBeVisible();
  const tempPassword = (await page.getByTestId("temp-password").textContent())!.trim();
  walkInCode = (await page.locator("dd").first().textContent())!.trim();
  expect(walkInCode).toMatch(/^G-\d{4}$/);

  // The new guest shows as checked in under recent registrations.
  await page.getByRole("button", {name: "Register another guest"}).click();
  await expect(page.getByText(walkInCode).first()).toBeVisible();

  await page.context().clearCookies();
  await guestLogin(page, walkInCode, tempPassword);
  await expect(page).toHaveURL(/\/guest$/);
  await expect(page.getByText(/Checked in/).first()).toBeVisible();

  await page.goto("/guest/profile");
  await page.getByLabel("Current password").fill(tempPassword);
  await page.getByLabel("Create a password").fill("MyOwnPass99");
  await page.getByLabel("Confirm password").fill("MyOwnPass99");
  await page.getByRole("button", {name: "Change password"}).click();
  await expect(toast(page).filter({hasText: "Password changed"})).toBeVisible();

  await page.context().clearCookies();
  await guestLogin(page, walkInCode, "MyOwnPass99");
  await expect(page).toHaveURL(/\/guest$/);
});

test("the IT Desk records a guest's totals; win rate and teddy eligibility are calculated", async ({page}) => {
  await staffLogin(page, "itdesk");
  await expect(page).toHaveURL(/\/staff\/prizes\/results/);

  await page.getByLabel("Find a guest").fill(walkInCode);
  await page.getByRole("button", {name: "Search"}).first().click();
  await page.getByRole("link", {name: new RegExp("Hamad Al Doseri")}).first().click();
  await expect(page).toHaveURL(new RegExp("guest=" + walkInCode));
  await expect(page.getByText("Hamad Al Doseri").first()).toBeVisible();

  // Impossible totals are refused before saving.
  await page.getByLabel("Games played", {exact: true}).fill("2");
  await page.getByLabel("Games won", {exact: true}).fill("3");
  await expect(page.getByText("Can't be more than games played")).toBeVisible();
  await expect(page.getByRole("button", {name: "Save results"})).toBeDisabled();

  // 3 of 4 = 75% → qualifies for the teddy bear.
  await page.getByLabel("Games played", {exact: true}).fill("4");
  await expect(page.getByText("75%").first()).toBeVisible();
  await expect(page.getByText("Qualified", {exact: true}).first()).toBeVisible();
  await page.getByRole("button", {name: "Save results"}).click();
  await expect(toast(page).filter({hasText: walkInCode + ": 3 of 4 games won — saved."})).toBeVisible();

  const records = page.locator("section", {has: page.getByRole("heading", {name: "Recorded results"})});
  await expect(records.getByRole("row", {name: new RegExp(walkInCode)})).toContainText("3/4");

  // 7 of 10 = 70% for another guest → not qualified.
  await page.getByLabel("Find a guest").fill("G-1003");
  await page.getByRole("button", {name: "Search"}).first().click();
  await page.getByRole("link", {name: /Maryam Al Sayed/}).first().click();
  await expect(page).toHaveURL(/guest=G-1003/);
  await expect(page.getByRole("button", {name: "Save results"})).toBeVisible(); // recorder loaded for Maryam (no results yet)
  await page.getByLabel("Games played", {exact: true}).fill("10");
  await page.getByLabel("Games won", {exact: true}).fill("7");
  await expect(page.getByText("70%").first()).toBeVisible();
  await expect(page.getByText("Not qualified", {exact: true}).first()).toBeVisible();
  await page.getByRole("button", {name: "Save results"}).click();
  await expect(toast(page).filter({hasText: "G-1003: 7 of 10 games won — saved."})).toBeVisible();

  // The guest sees their own results, read-only.
  await page.context().clearCookies();
  await guestLogin(page, walkInCode, "MyOwnPass99");
  await expect(page).toHaveURL(/\/guest$/);
  const mine = page.locator("section", {has: page.getByRole("heading", {name: "My Games & Rewards"})});
  await expect(mine).toContainText(walkInCode);
  await expect(mine).toContainText("75%");
  await expect(mine.getByText("Qualified", {exact: true})).toBeVisible();
  await expect(mine.getByText("Ready to collect")).toBeVisible();
  await expect(mine.getByRole("button")).toHaveCount(0);
  await expect(mine.locator("input")).toHaveCount(0);
});

test("a teddy bear is handed out once, after which the IT Desk can't change that guest's results", async ({page}) => {
  await staffLogin(page, "itdesk");
  await page.goto("/staff/prizes/teddy");
  const row = page.getByRole("row", {name: new RegExp(walkInCode)});
  await expect(row).toBeVisible();
  await expect(page.getByRole("row", {name: /G-1002/})).toHaveCount(0); // Yousef: 2/4 = 50%

  await row.getByRole("button", {name: "Mark as collected"}).click();
  await page.getByRole("dialog").getByRole("button", {name: "Mark as collected"}).click();
  await expect(toast(page).filter({hasText: "Teddy bear collected by Hamad Al Doseri."})).toBeVisible();
  await expect(page.getByRole("row", {name: new RegExp(walkInCode)})).toHaveCount(0);

  await page.getByRole("link", {name: "Collected", exact: true}).click();
  await expect(page.getByRole("row", {name: new RegExp(walkInCode)})).toContainText("Collected");
  await expect(page.getByRole("button", {name: "Mark as collected"})).toHaveCount(0);

  await page.goto("/staff/prizes/results?guest=" + walkInCode);
  await expect(page.getByText("The teddy bear has been collected, so these results are locked.")).toBeVisible();
  await expect(page.getByRole("button", {name: "Update results"})).toBeDisabled();
});

test("the administrator runs the grand prize draw with a full-screen announcement and history", async ({page}) => {
  await staffLogin(page, "admin");
  await page.goto("/staff/prizes/draw");
  await expect(page.getByRole("heading", {name: /Eligible Guest IDs/})).toBeVisible();

  await page.getByRole("button", {name: "Start the draw"}).click();
  const stage = page.getByRole("dialog", {name: "Grand Prize"});
  await expect(stage).toBeVisible();
  const code = page.getByTestId("draw-winner-code");
  await expect(code).toHaveText(/^G-\d{4}$/, {timeout: 15_000});
  const first = (await code.textContent())!;
  await expect(page.getByTestId("draw-winner-name")).not.toBeEmpty();
  await stage.getByRole("button", {name: "Confirm winner"}).click();
  await expect(toast(page).filter({hasText: first + " is confirmed as the grand prize winner."})).toBeVisible();

  // A second draw never repeats a Guest ID; cancelling keeps it in the history.
  await page.getByRole("button", {name: "Start the draw"}).click();
  await expect(code).toHaveText(/^G-\d{4}$/, {timeout: 15_000});
  const second = (await code.textContent())!;
  expect(second).not.toBe(first);
  await page.getByRole("dialog", {name: "Grand Prize"}).getByRole("button", {name: "Cancel draw (winner absent)"}).click();
  await expect(toast(page).filter({hasText: "Draw cancelled."})).toBeVisible();

  const history = page.locator("section", {has: page.getByRole("heading", {name: "Draw history"})});
  await expect(history.getByRole("row", {name: new RegExp(first)})).toContainText("Winner");
  await expect(history.getByRole("row", {name: new RegExp(second)})).toContainText("Cancelled");
  await expect(page.getByRole("listitem").filter({hasText: new RegExp("^" + first + "$")})).toHaveCount(0); // no longer an entry
});

test("roles are enforced on pages and sign-in redirects keep the destination", async ({page}) => {
  await page.goto("/staff/guests");
  await expect(page).toHaveURL(/\/staff\/login\?next=%2Fstaff%2Fguests/);

  await page.goto("/guest/photos");
  await expect(page).toHaveURL(/\/login\?next=%2Fguest%2Fphotos/);

  // IT Desk staff: registration, results and teddy bears — not guest management, not the grand prize draw.
  await staffLogin(page, "itdesk");
  await page.goto("/staff/reception");
  await expect(page).toHaveURL(/\/staff\/reception$/);
  await expect(page.getByRole("button", {name: "Register guest"})).toBeVisible();
  for (const path of ["/staff/guests", "/staff/prizes/draw"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/staff\/prizes\/results$/);
  }
  await expect(page.getByRole("link", {name: "Grand prize draw"})).toHaveCount(0);

  await page.context().clearCookies();
  await staffLogin(page, "reception");
  await page.goto("/staff/prizes/results");
  await expect(page).toHaveURL(/\/staff\/reception$/);
});

test("admin manages programme, announcements and gallery, visible on the public site", async ({page}) => {
  await staffLogin(page, "admin");

  await page.goto("/staff/programme");
  await page.getByRole("button", {name: "Add activity"}).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Title (English)").fill("Drone Light Show");
  await dialog.getByLabel("Title (Arabic)").fill("عرض الطائرات المسيّرة");
  await dialog.getByLabel("Location (English)").fill("Football Field");
  await dialog.getByLabel("Starts").fill("19:00");
  await dialog.getByLabel("Ends").fill("18:00");
  await dialog.getByRole("button", {name: "Save"}).click();
  await expect(dialog.getByText("Must be after the start time")).toBeVisible();
  await dialog.getByLabel("Ends").fill("19:30");
  await dialog.getByRole("button", {name: "Save"}).click();
  await expect(toast(page).filter({hasText: "Activity saved."})).toBeVisible();

  await page.goto("/staff/announcements");
  await page.getByRole("button", {name: "New announcement"}).click();
  await page.getByRole("dialog").getByLabel("Title").fill("Fireworks at 19:45");
  await page.getByRole("dialog").getByLabel("Message").fill("Join us on the football field for fireworks after the drone show.");
  await page.getByRole("dialog").getByRole("button", {name: "Save"}).click();
  await expect(toast(page).filter({hasText: "Announcement saved."})).toBeVisible();

  // 1x1 red PNG.
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==", "base64");
  await page.goto("/staff/gallery");
  // Bulk upload: several photos, one album and title, one button.
  await page.getByRole("button", {name: "Upload photos"}).first().click();
  const uploader = page.getByRole("dialog");
  await uploader.getByLabel("Choose photos").setInputFiles([
    {name: "crowd-1.png", mimeType: "image/png", buffer: png},
    {name: "crowd-2.png", mimeType: "image/png", buffer: png},
    {name: "crowd-3.png", mimeType: "image/png", buffer: png},
  ]);
  await expect(uploader.getByText("3 photos selected")).toBeVisible();
  await uploader.getByLabel(/Title for these photos/).fill("Crowd at the Courtyard");
  await uploader.getByRole("button", {name: "Upload 3 photos"}).click();
  await expect(toast(page).filter({hasText: "3 photos uploaded."})).toBeVisible();
  await expect(uploader).toBeHidden(); // closes when everything succeeded

  // A file that isn't really an image is refused and stays listed for another try; the others still upload.
  await page.getByRole("button", {name: "Upload photos"}).first().click();
  await uploader.getByLabel("Choose photos").setInputFiles([
    {name: "evil.png", mimeType: "image/png", buffer: Buffer.from("<script>alert(1)</script>")},
    {name: "fine.png", mimeType: "image/png", buffer: png},
  ]);
  await uploader.getByLabel(/Title for these photos/).fill("Second batch");
  await uploader.getByRole("button", {name: "Upload 2 photos"}).click();
  await expect(uploader.getByText("1 couldn't be uploaded:")).toBeVisible();
  await expect(uploader.getByText("evil.png")).toBeVisible();
  await expect(uploader.getByText("1 photos selected")).toBeVisible();
  await uploader.getByRole("button", {name: "Cancel"}).click();

  // Bilingual: the English title with its Arabic translation underneath, like the event posters.
  await page.goto("/programme");
  await expect(page.getByText("Drone Light Show")).toBeVisible();
  await expect(page.getByText("عرض الطائرات المسيّرة")).toBeVisible();
  await expect(page.getByRole("heading", {name: "All evening"})).toBeVisible();
  await page.goto("/");
  await expect(page.getByText("Fireworks at 19:45")).toBeVisible();
  // Uploaded into this year's album (the event year by default), not the guest folder.
  await page.goto("/gallery");
  await expect(page.getByRole("main").getByRole("link", {name: /^National Day 2026/})).toBeVisible();
  await page.goto("/gallery/2026");
  await expect(page.getByText("Crowd at the Courtyard").first()).toBeVisible();
  await expect(page.getByRole("button", {name: "Open Crowd at the Courtyard"})).toHaveCount(3);
  const src = await page.getByRole("button", {name: "Open Crowd at the Courtyard"}).first().locator("img").getAttribute("src");
  const image = await page.request.get(src!);
  expect(image.headers()["content-type"]).toBe("image/jpeg"); // resized and re-encoded in the browser before upload
});

test("admin can deactivate a guest", async ({page}) => {
  await staffLogin(page, "admin");
  await page.goto("/staff/guests?q=Yousef");
  await page.getByRole("link", {name: /Yousef Nasser/}).click();
  await page.getByRole("button", {name: "Deactivate"}).click();
  await expect(toast(page).filter({hasText: "Guest deactivated."})).toBeVisible();
  await page.goto("/staff/activity");
  await expect(page.getByRole("cell", {name: "guest.deactivated"}).first()).toBeVisible();

  await page.context().clearCookies();
  await guestLogin(page, "G-1002", "Guest@2026");
  await expect(page.getByText("This account is inactive")).toBeVisible();
});

test("admin edits the home-page countdown from event settings", async ({page}) => {
  await staffLogin(page, "admin");
  await page.goto("/staff/settings");
  // A date before National Day, more than a year ahead so the timer is still running.
  const year = new Date().getFullYear() + 2;
  await page.getByLabel("Countdown to").fill(`${year}-12-10`);
  await page.getByLabel("Heading (English)").fill("Doors open in");
  await page.getByRole("button", {name: "Save"}).click();
  await expect(toast(page).filter({hasText: "Settings saved."})).toBeVisible();

  await page.goto("/");
  await expect(page.getByText("Doors open in")).toBeVisible();
  await expect(page.getByRole("timer")).toBeVisible();
  await expect(page.getByRole("timer").getByText(/^\d+$/).first()).toHaveText(/^\d{3,}$/); // days: over a year away

  await page.goto("/staff/settings");
  await page.getByText("Show the countdown on the home page").click();
  await page.getByRole("button", {name: "Save"}).click();
  await expect(toast(page).filter({hasText: "Settings saved."})).toBeVisible();
  await page.goto("/");
  await expect(page.getByRole("timer")).toHaveCount(0);
});

test("on a phone: no sideways scrolling, a menu drawer, and a working guest tab bar", async ({page}) => {
  await page.setViewportSize({width: 375, height: 800});
  const noOverflow = async (path: string) => {
    await page.goto(path);
    const widths = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    expect(widths[0], `${path} scrolls sideways`).toBeLessThanOrEqual(widths[1]);
  };
  for (const path of ["/", "/programme", "/gallery", "/login", "/register", "/register?type=visitor"]) await noOverflow(path);

  // Header: one row with a menu button; the drawer holds the navigation.
  await page.goto("/");
  await page.getByRole("button", {name: "Menu"}).click();
  const drawer = page.getByRole("dialog", {name: "Menu"});
  await expect(drawer.getByRole("link", {name: "Programme"})).toBeVisible();
  await drawer.getByRole("link", {name: "Programme"}).click();
  await expect(page).toHaveURL(/\/programme$/);
  await expect(drawer).toHaveCount(0); // navigating closes it

  // Signed-in guests get a bottom tab bar; every tab opens a real page.
  await guestLogin(page, "G-1001", "Guest@2026");
  await expect(page).toHaveURL(/\/guest$/);
  const tabs = page.getByRole("navigation", {name: "My pass"});
  for (const [name, url, heading] of [
    ["Rewards", /\/guest\/rewards$/, "My Games & Rewards"],
    ["My photos", /\/guest\/photos$/, null],
    ["Profile", /\/guest\/profile$/, null],
  ] as const) {
    await tabs.getByRole("link", {name}).click();
    await expect(page).toHaveURL(url);
    if (heading) await expect(page.getByRole("heading", {level: 1, name: heading})).toBeVisible();
    await noOverflow(page.url().replace(/^https?:\/\/[^/]+/, ""));
  }

  // Staff: the IT Desk results become cards instead of a wide table.
  await page.context().clearCookies();
  await staffLogin(page, "itdesk");
  await noOverflow("/staff/prizes/results");
  await noOverflow("/staff/prizes/teddy");
});

test("an administrator announces a winner; the guest sees the pop-up once and keeps it in their history", async ({page, browser}) => {
  await staffLogin(page, "admin");
  await page.goto("/staff/winners");
  await page.getByLabel("Guest ID").fill("G-1001");
  await page.getByLabel("Prize").fill("Best National Day outfit");
  await page.getByLabel(/Personal message/).fill("Your sadu thobe stole the show!");
  await page.getByRole("button", {name: "Announce winner"}).click();
  // Confirmation step shows who it is before anything is sent.
  const confirm = page.getByRole("dialog");
  await expect(confirm.getByText("Fatima Al Khalifa (G-1001) will be told they won: Best National Day outfit.")).toBeVisible();
  await confirm.getByRole("button", {name: "Yes, announce"}).click();
  await expect(toast(page).filter({hasText: "Winner announced: Fatima Al Khalifa."})).toBeVisible();
  await expect(page.getByText("Not seen yet")).toBeVisible();

  // The same prize can't be announced twice to the same guest.
  await page.getByLabel("Guest ID").fill("G-1001");
  await page.getByLabel("Prize").fill("best national day OUTFIT");
  await page.getByRole("button", {name: "Announce winner"}).click();
  await page.getByRole("dialog").getByRole("button", {name: "Yes, announce"}).click();
  await expect(page.getByRole("dialog").or(page.locator("form")).getByText(/already been announced as a winner/).first()).toBeVisible();

  // Past attendance raises the rank: the administrator adds two earlier years.
  await page.goto("/staff/guests?q=G-1001");
  await page.getByRole("link", {name: /Fatima Al Khalifa/}).first().click();
  for (const year of ["2024", "2025"]) {
    await page.getByLabel("Year").fill(year);
    await page.getByRole("button", {name: "Add year"}).click();
    await expect(page.getByRole("button", {name: `Remove ${year}`})).toBeAttached();
  }
  await page.getByLabel("Year").fill("2025");
  await page.getByRole("button", {name: "Add year"}).click();
  await expect(page.getByText("2025 is already recorded for this guest.")).toBeVisible();

  // The guest (signed in on another device) sees the pop-up — only once.
  const guestContext = await browser.newContext({baseURL: "http://localhost:3200"});
  const guest = await guestContext.newPage();
  await guestLogin(guest, "G-1001", "Guest@2026");
  const popup = guest.getByRole("dialog", {name: "Congratulations!"});
  await expect(popup.getByTestId("award-prize")).toHaveText("Best National Day outfit");
  await expect(popup.getByText("Your sadu thobe stole the show!")).toBeVisible();
  await popup.getByRole("button", {name: "Awesome!"}).click();
  await expect(popup).toBeHidden();
  await guest.reload();
  await expect(guest.getByRole("dialog", {name: "Congratulations!"})).toHaveCount(0);
  // The pass shows the guest's rank where the QR code used to be.
  const pass = guest.getByRole("article", {name: "Guest pass"});
  await expect(pass.getByText(/^(Gold|Platinum) rank$/)).toBeVisible();
  await expect(pass.locator("svg title")).toHaveCount(0); // no QR code

  // Rewards page: rank section and award history.
  await guest.goto("/guest/rewards");
  await expect(guest.getByTestId("current-rank")).toHaveText(/^(Gold|Platinum) rank$/); // 2025 + 2024 (+ this year's check-in, if any)
  await expect(guest.getByRole("article", {name: /Rank card/})).toBeVisible();
  await expect(guest.locator("section", {has: guest.getByRole("heading", {name: "My awards"})}).getByText("Best National Day outfit")).toBeVisible();
  await guestContext.close();

  // The administrator sees it was seen, and the ranks page counts the guest.
  await page.goto("/staff/winners");
  await expect(page.getByText("Seen by the guest").first()).toBeVisible();
  await page.goto("/staff/ranks?q=G-1001");
  await expect(page.getByRole("link", {name: /Fatima Al Khalifa/})).toContainText(/2025, 2024/);

  // Phones: the new admin pages and the rank section fit the screen.
  await page.setViewportSize({width: 375, height: 800});
  for (const path of ["/staff/winners", "/staff/ranks"]) {
    await page.goto(path);
    const [scroll, client] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    expect(scroll, path).toBeLessThanOrEqual(client);
  }
});

test("Arabic switches the whole interface to right-to-left", async ({page}) => {
  await page.goto("/");
  await page.getByRole("button", {name: "Switch language"}).first().click();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await expect(page.getByRole("heading", {level: 1})).toContainText("اليوم الوطني البحريني");
  await page.goto("/staff/login");
  await expect(page.getByRole("heading", {name: "بوابة الموظفين"})).toBeVisible();
});

test("repeated failed sign-ins lock the account, and media paths can't escape the upload folder", async ({page}) => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await guestLogin(page, "G-1003", "wrong-password");
    await expect(page.getByText("Those details don't match our records.")).toBeVisible();
  }
  await guestLogin(page, "G-1003", "Guest@2026");
  await expect(page.getByText(/Too many attempts/)).toBeVisible();

  for (const probe of ["/media/..%2Fnationalday.db", "/media/nationalday.db", "/media/x.html"]) {
    expect((await page.request.get(probe)).status()).toBe(404);
  }
});

test.describe("guest photo submissions with admin approval", () => {
  // Two distinct 1x1 PNGs (red, blue) — the browser resizes/re-encodes them to JPEG before upload.
  const red = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==", "base64");
  const blue = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg==", "base64");
  let photoUrls: string[] = [];

  test("a guest uploads photos: pending, private, and deletable while pending", async ({page, browser}) => {
    await guestLogin(page, "G-1001", "Guest@2026");
    await expect(page).toHaveURL(/\/guest$/);
    await page.goto("/gallery");
    await page.getByRole("link", {name: "Share your photos"}).click();
    await expect(page).toHaveURL(/\/guest\/photos/);

    await page.getByLabel("Choose photos").setInputFiles([
      {name: "majlis.png", mimeType: "image/png", buffer: red},
      {name: "stage.png", mimeType: "image/png", buffer: blue},
    ]);
    await page.getByLabel("Title").first().fill("Majlis moment");
    await page.getByRole("button", {name: "Submit 2 for review"}).click();
    await expect(page.getByText("2 photos have been submitted successfully and are waiting for administrator approval.")).toBeVisible();

    const list = page.locator("section", {has: page.getByRole("heading", {name: "My submissions"})});
    await expect(list.getByText("Pending", {exact: true})).toHaveCount(2);
    photoUrls = await list.locator("li img").evaluateAll((imgs) => imgs.map((img) => img.getAttribute("src")!));
    expect(photoUrls).toHaveLength(2);
    for (const url of photoUrls) expect((await page.request.get(url)).status()).toBe(200); // the owner can see them

    // Strangers and other guests can't, and the public gallery doesn't list them.
    const anonymous = await browser.newContext();
    for (const url of photoUrls) expect((await anonymous.request.get(`http://localhost:3200${url}`)).status()).toBe(404);
    const anonPage = await anonymous.newPage();
    await anonPage.goto("http://localhost:3200/gallery/guests");
    await expect(anonPage.getByText("Majlis moment")).toHaveCount(0);

    const otherGuest = await browser.newContext({baseURL: "http://localhost:3200"});
    const other = await otherGuest.newPage();
    await guestLogin(other, walkInCode, "MyOwnPass99");
    await expect(other).toHaveURL(/\/guest$/);
    for (const url of photoUrls) expect((await other.request.get(url)).status()).toBe(404);
    await other.goto("/guest/photos");
    await expect(other.getByText("You haven't shared any photos yet.")).toBeVisible();
    await anonymous.close();
    await otherGuest.close();

    // A third photo, withdrawn while still pending.
    await page.getByLabel("Choose photos").setInputFiles([{name: "oops.png", mimeType: "image/png", buffer: red}]);
    await page.getByRole("button", {name: "Submit 1 for review"}).click();
    await expect(page.getByText("Your photo has been submitted successfully and is waiting for administrator approval.")).toBeVisible();
    await expect(list.getByText("Pending", {exact: true})).toHaveCount(3);
    await list.getByRole("button", {name: "Delete"}).first().click();
    await page.getByRole("dialog").getByRole("button", {name: "Yes, delete"}).click();
    await expect(page.getByText("Photo deleted.")).toBeVisible();
    await expect(list.getByText("Pending", {exact: true})).toHaveCount(2);

    // Guests can't reach the moderation screen.
    await page.goto("/staff/photos");
    await expect(page).toHaveURL(/\/staff\/login/);
  });

  test("an administrator approves one photo and rejects the other with a reason", async ({page}) => {
    await staffLogin(page, "admin");
    await expect(page.getByRole("link", {name: /Photo approval\s*2/})).toBeVisible();
    await page.goto("/staff/photos");
    await expect(page.getByRole("link", {name: /Pending photos\s*2/})).toBeVisible();

    const majlis = page.getByRole("listitem").filter({hasText: "Majlis moment"});
    await expect(majlis.getByText("Fatima Al Khalifa")).toBeVisible();
    await expect(majlis.getByText("G-1001")).toBeVisible();
    await majlis.getByRole("button", {name: "Approve"}).click();
    await expect(page.getByText("Photo approved and published in the gallery.")).toBeVisible();

    const untitled = page.getByRole("listitem").filter({hasText: "Untitled photo"});
    await untitled.getByRole("button", {name: "Reject"}).click();
    await page.getByRole("dialog").getByLabel(/Reason/).fill("Not from the event");
    await page.getByRole("dialog").getByRole("button", {name: "Reject"}).click();
    await expect(page.getByText("Photo rejected.")).toBeVisible();
    await expect(page.getByText("No photos are waiting for review.")).toBeVisible();

    await page.getByRole("link", {name: /Rejected photos/}).click();
    await expect(page.getByText("Reason: Not from the event")).toBeVisible();
  });

  test("only the approved photo is published; the guest sees statuses and one-time notices", async ({page, browser}) => {
    const anonymous = await browser.newContext({baseURL: "http://localhost:3200"});
    const visitor = await anonymous.newPage();
    // Guest photos have their own folder, separate from the yearly albums.
    await visitor.goto("/gallery");
    await visitor.getByRole("link", {name: /Guest photos/}).click();
    await expect(visitor).toHaveURL(/\/gallery\/guests$/);
    await expect(visitor.getByText("Majlis moment")).toBeVisible();
    // Visitors never learn who shared a photo — not on the page, not in the page data.
    await expect(visitor.getByText(/Fatima|Khalifa|G-1001/)).toHaveCount(0);
    // (Page data is checked for the name only: "G-1001" legitimately appears in the sign-in hint text.)
    expect(await visitor.content()).not.toMatch(/Fatima|Khalifa/);

    const statuses = await Promise.all(photoUrls.map(async (url) => (await visitor.request.get(url)).status()));
    expect(statuses.sort()).toEqual([200, 404]); // approved is public, rejected stays private
    await anonymous.close();

    await guestLogin(page, "G-1001", "Guest@2026");
    await expect(page).toHaveURL(/\/guest$/);
    await page.goto("/guest/photos");
    await expect(page.getByText("Your photo has been approved and is now visible in the gallery.")).toBeVisible();
    await expect(page.getByText("Your photo was not approved.")).toBeVisible();
    const list = page.locator("section", {has: page.getByRole("heading", {name: "My submissions"})});
    await expect(list.getByText("Approved", {exact: true})).toBeVisible();
    await expect(list.getByText("Rejected", {exact: true})).toBeVisible();
    await expect(list.getByText("Reason: Not from the event")).toBeVisible();
    await expect(list.getByRole("button", {name: "Delete"})).toHaveCount(0); // reviewed photos can't be withdrawn

    await page.reload();
    await expect(page.getByText("Your photo has been approved and is now visible in the gallery.")).toHaveCount(0);
  });
});
