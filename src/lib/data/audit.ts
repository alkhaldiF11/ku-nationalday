import {many, nowIso, one, run, type Params} from "@/lib/db";

export type Actor = {type: "staff" | "guest" | "system"; id: string | null; name: string};

export const SYSTEM_ACTOR: Actor = {type: "system", id: null, name: "System"};

export type AuditEntry = {
  id: number;
  actorType: Actor["type"];
  actorName: string;
  action: string;
  details: string;
  createdAt: string;
};

export async function audit(actor: Actor, action: string, details: string) {
  await run(
    `INSERT INTO audit_log (actor_type, actor_id, actor_name, action, details, created_at)
     VALUES (:type, :id, :name, :action, :details, :now)`,
    {type: actor.type, id: actor.id, name: actor.name, action, details, now: nowIso()},
  );
}

export async function listAudit({limit = 50, offset = 0, action}: {limit?: number; offset?: number; action?: string} = {}) {
  const where = action ? "WHERE action = :action" : "";
  const params: Params = action ? {action, limit, offset} : {limit, offset};
  const rows = await many<{id: number; actor_type: Actor["type"]; actor_name: string; action: string; details: string; created_at: string}>(
    `SELECT id, actor_type, actor_name, action, details, created_at FROM audit_log ${where} ORDER BY id DESC LIMIT :limit OFFSET :offset`,
    params,
  );
  const total = (await one<{n: number}>(`SELECT COUNT(*) AS n FROM audit_log ${where}`, action ? {action} : {}))?.n ?? 0;
  return {
    total,
    entries: rows.map<AuditEntry>((row) => ({
      id: row.id,
      actorType: row.actor_type,
      actorName: row.actor_name,
      action: row.action,
      details: row.details,
      createdAt: row.created_at,
    })),
  };
}

export async function listAuditActions() {
  return (await many<{action: string}>(`SELECT DISTINCT action FROM audit_log ORDER BY action`)).map((row) => row.action);
}
