/** Activities store Bahrain wall-clock times (UTC+3, no DST). */
const BAHRAIN_OFFSET = "+03:00";

/** Request-time clock for server components (each render is a fresh request). */
export const currentTime = () => Date.now();

export const toInstant = (date: string, time: string) => Date.parse(`${date}T${time}:00${BAHRAIN_OFFSET}`);

type Timed = {date: string; startTime: string; endTime: string};

export function activityStatus(activity: Timed, now = Date.now()): "past" | "now" | "upcoming" {
  if (now >= toInstant(activity.date, activity.endTime)) return "past";
  if (now >= toInstant(activity.date, activity.startTime)) return "now";
  return "upcoming";
}

const minutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

/** Attractions running 3h+ (food trucks, carnival games) are listed separately from stage segments. */
export const ONGOING_MINUTES = 180;
export const isOngoing = (activity: Timed) => minutes(activity.endTime) - minutes(activity.startTime) >= ONGOING_MINUTES;

/** The stage segment happening now, else the next upcoming one; falls back to attractions, else null. */
export function currentOrNext<T extends Timed>(activities: T[], now = Date.now()): T | null {
  const pick = (items: T[]) => items.find((item) => activityStatus(item, now) === "now") ?? items.find((item) => activityStatus(item, now) === "upcoming") ?? null;
  return pick(activities.filter((item) => !isOngoing(item))) ?? pick(activities);
}

/** Event window: from the first activity's start to the last one's end (defaults 08:00–20:00). */
export function eventWindow(eventDate: string, activities: Timed[]) {
  const sameDay = activities.filter((item) => item.date === eventDate);
  const start = sameDay.length ? sameDay.map((item) => item.startTime).sort()[0] : "08:00";
  const end = sameDay.length ? sameDay.map((item) => item.endTime).sort().at(-1)! : "20:00";
  return {start: toInstant(eventDate, start), end: toInstant(eventDate, end)};
}
