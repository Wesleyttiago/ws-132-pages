import { DEFAULT_SETTINGS, INITIAL_ITEMS, type Item, type State, type Settings } from "./model";
import { InputError } from "./validation";
type Row = { id: string; collection: Item["collection"]; payload: string; revision: number; deleted: number };
export async function readState(db: D1Database): Promise<State> {
  const [p, rows] = await Promise.all([db.prepare("SELECT payload, revision FROM preferences WHERE key = ?").bind("couple").first<{payload:string;revision:number}>(), db.prepare("SELECT id, collection, payload, revision, deleted FROM records").all<Row>()]);
  const items = new Map(INITIAL_ITEMS.map((i) => [i.id, i]));
  for (const r of rows.results ?? []) { if (r.deleted) items.delete(r.id); else items.set(r.id, { ...JSON.parse(r.payload), id: r.id, collection: r.collection, revision: r.revision }); }
  return { settings: p ? { ...DEFAULT_SETTINGS, ...JSON.parse(p.payload), revision: p.revision } : DEFAULT_SETTINGS, items: Array.from(items.values()), syncedAt: new Date().toISOString() };
}
export async function seedDefaults(db: D1Database, user: string) {
  const time = new Date().toISOString();
  await db.batch([db.prepare("INSERT OR IGNORE INTO preferences (key, payload, revision, updated_at) VALUES (?, ?, 0, ?)").bind("couple", JSON.stringify(DEFAULT_SETTINGS), time), ...INITIAL_ITEMS.map((i) => db.prepare("INSERT OR IGNORE INTO records (id, collection, payload, revision, deleted, created_by, updated_at) VALUES (?, ?, ?, 0, 0, ?, ?)").bind(i.id, i.collection, JSON.stringify(i), user, time))]);
}
export async function putItem(db: D1Database, i: Item, user: string, existing: boolean) {
  const time = new Date().toISOString();
  const r = existing ? await db.prepare("UPDATE records SET payload = ?, revision = revision + 1, updated_at = ? WHERE id = ? AND collection = ? AND revision = ? AND deleted = 0").bind(JSON.stringify(i), time, i.id, i.collection, i.revision).run() : await db.prepare("INSERT OR IGNORE INTO records (id, collection, payload, revision, deleted, created_by, updated_at) VALUES (?, ?, ?, 0, 0, ?, ?)").bind(i.id, i.collection, JSON.stringify(i), user, time).run();
  if (!r.meta.changes && existing) throw new InputError("Esse registro mudou em outro aparelho. Reabra-o para editar a versão atual.", 409);
  if (!r.meta.changes && !existing && i.collection === "weddingPlan") throw new InputError("O orçamento foi definido em outro aparelho. Atualize antes de editar.", 409);
}
export async function deleteItem(db: D1Database, id: string, revision: number) {
  const r = await db.prepare("UPDATE records SET deleted = 1, revision = revision + 1, updated_at = ? WHERE id = ? AND revision = ? AND deleted = 0").bind(new Date().toISOString(), id, revision).run();
  if (!r.meta.changes) throw new InputError("O registro mudou em outro aparelho. Atualize e tente novamente.", 409);
}
export async function putSettings(db: D1Database, s: Settings, revision: number) {
  const r = await db.prepare("UPDATE preferences SET payload = ?, revision = revision + 1, updated_at = ? WHERE key = ? AND revision = ?").bind(JSON.stringify(s), new Date().toISOString(), "couple", revision).run();
  if (!r.meta.changes) throw new InputError("As preferências mudaram em outro aparelho. Reabra as configurações.", 409);
}
