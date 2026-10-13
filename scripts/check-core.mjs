// Meaningful storage, money, authorization and concurrency checks without a browser.
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import ts from "typescript";
const root = resolve(".");
const work = resolve(".sites-runtime/core-check");
await mkdir(work, { recursive: true });
for (const name of ["model", "validation", "store"]) {
  let source = await readFile(resolve("lib", name + ".ts"), "utf8");
  if (name === "model") source = source.replace('import photos from "./initial-photos.json";', "const photos = " + await readFile("lib/initial-photos.json", "utf8") + ";");
  source = source.replace(/from "\.\/(model|validation)"/g, 'from "./$1.mjs"');
  const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
  await writeFile(resolve(work, name + ".mjs"), code);
}
let route = await readFile("app/api/[...path]/route.ts", "utf8");
route = route.replace('import { env } from "cloudflare:workers";', "const env = globalThis.__reinoTestEnv;").replace(/from "@\/lib\/(\w+)"/g, 'from "./$1.mjs"');
await writeFile(resolve(work, "route.mjs"), ts.transpileModule(route, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText);
const model = await import(resolve(work, "model.mjs"));
const { cleanSettings, cleanItem, assertRequest } = await import(resolve(work, "validation.mjs"));
const { readState, seedDefaults, putItem, deleteItem, putSettings } = await import(resolve(work, "store.mjs"));
const sqlite = new DatabaseSync(":memory:");
sqlite.exec(await readFile("drizzle/0000_productive_juggernaut.sql", "utf8"));
const db = { prepare(sql) {
  let args = [];
  return {
    bind(...values) { args = values; return this; },
    async first() { return sqlite.prepare(sql).get(...args) ?? null; },
    async all() { return { results: sqlite.prepare(sql).all(...args) }; },
    async run() { const r = sqlite.prepare(sql).run(...args); return { meta: { changes: Number(r.changes) } }; }
  };
}, async batch(queries) { return Promise.all(queries.map(q => q.run())); } };
let checks = 0;
function check(name, fn) { fn(); checks++; console.log("PASS", name); }
check("BRL cents and countdown", () => {
  assert.equal(model.parseMoney("1.000,50"), 100050);
  assert.equal(model.parseMoney("50,00"), 5000);
  assert.ok(Number.isNaN(model.parseMoney("abc")));
  assert.equal(model.countdown("2028-07-08", Date.parse("2028-07-08T00:00:00-03:00")).finished, true);
  assert.equal(model.countdown("2028-07-08", Date.parse("2028-07-07T00:00:00-03:00")).days, 1);
});
check("real calendar dates and safe music URLs", () => {
  assert.equal(model.validDate("2028-02-29", true), true);
  assert.equal(model.validDate("2027-02-29", true), false);
  assert.equal(model.youtubeId("https://www.youtube.com/watch?v=U41KPUfOSFk"), "U41KPUfOSFk");
  assert.equal(model.musicUrl("https://youtube.com.evil.test/watch?v=U41KPUfOSFk"), false);
  assert.equal(model.musicUrl("javascript:alert(1)"), false);
});
check("identity required and cross-site writes rejected", () => {
  assert.throws(() => assertRequest(new Request("https://site.test/api/state")), /Entre/);
  assert.throws(() => assertRequest(new Request("https://site.test/api/items", { method: "POST", headers: { "oai-authenticated-user-id": "test", "oai-authenticated-user-email": "test@example.test", "sec-fetch-site": "cross-site", "x-nosso-reino": "1" } })), /Origem/);
});
check("invalid amounts, malformed photo paths and music blocked", () => {
  const base = { id: "test", collection: "transactions", type: "income", title: "Aporte", date: "2026-10-13" };
  for (const n of [-1, 0, 1.5, NaN]) assert.throws(() => cleanItem({ ...base, amountCents: n }));
  assert.throws(() => cleanItem({ id:"photo", collection:"memories", url:"https://evil.test/image.svg" }));
  assert.throws(() => cleanItem({ id:"song", collection:"songs", title:"Music", url:"javascript:alert(1)" }));
});
let state = await readState(db);
check("confirmed initial values and forty photographs", () => {
  assert.equal(model.balance(state), 36200);
  assert.equal(state.settings.targetCents, 1000000);
  assert.equal(state.settings.weddingDate, "2028-07-08");
  assert.equal(state.items.filter(i=>i.collection==="memories").length, 40);
});
await seedDefaults(db, "test");
await seedDefaults(db, "test-two");
const goal = cleanItem({ id: "goal-a", collection: "goals", title: "Apartamento", targetCents: 100000, category: "Apartamento" });
await putItem(db, goal, "test", false);
const income = cleanItem({ id:"income-a", collection:"transactions", type:"income", title:"Aporte", amountCents:15000, date:"2026-10-13", goalId:"goal-a" });
await putItem(db, income, "test", false);
await putItem(db, income, "test", false);
await putItem(db, cleanItem({ id:"expense-a", collection:"transactions", type:"expense", title:"Saída", amountCents:5000, date:"2026-10-13", goalId:"goal-a" }), "test", false);
state = await readState(db);
check("no duplicate contributions and money counted once", () => {
  assert.equal(model.balance(state), 46200);
  assert.equal(model.goalBalance(state, "goal-a"), 10000);
  assert.equal(state.items.filter(i=>i.id==="income-a").length, 1);
});
await putItem(db, { ...income, title: "Atualizado" }, "test", true);
await assert.rejects(() => putItem(db, { ...income, title: "Edição antiga" }, "test-two", true), e=>e.status===409);
state = await readState(db);
check("stale updates preserve the first edit", () => assert.equal(state.items.find(i=>i.id==="income-a").title, "Atualizado"));
const firstPhoto = state.items.find(i=>i.collection==="memories");
await deleteItem(db, firstPhoto.id, 0);
await seedDefaults(db, "test");
state = await readState(db);
check("removed seed photos stay removed after subsequent writes", () => assert.equal(state.items.filter(i=>i.collection==="memories").length, 39));
await putSettings(db, cleanSettings({...state.settings, title:"Nosso Reino de teste"}), 0);
await assert.rejects(() => putSettings(db, cleanSettings({...state.settings,title:"Antigo"}),0),e=>e.status===409);
check("settings also reject stale edits", () => {});
const bucket = new Map();
globalThis.__reinoTestEnv = { DB: db, BUCKET: {
  async put(key, bytes, options) { bucket.set(key,{bytes,options}); },
  async get(key) { const o=bucket.get(key); return o?{body:o.bytes,httpMetadata:o.options.httpMetadata}:null; },
  async delete(key) { bucket.delete(key); },
} };
const api = await import(resolve(work, "route.mjs"));
const headers = { "oai-authenticated-user-id":"test", "oai-authenticated-user-email":"test@example.test", "x-nosso-reino":"1" };
assert.equal((await api.GET(new Request("https://site.test/api/state"))).status, 401);
const form = new FormData();
form.append("file",new File([new Uint8Array([255,216,255,224,0,0,0,0])],"photo.jpg",{type:"image/jpeg"}));
form.append("caption","Um momento"); form.append("date","2026-10-13");
const uploaded = await api.POST(new Request("https://site.test/api/photos",{method:"POST",headers,body:form}));
assert.equal(uploaded.status,201);
const next = await uploaded.json();
const photo = next.items.find(i=>i.caption==="Um momento");
assert.ok(photo);
assert.equal((await api.GET(new Request("https://site.test"+photo.url))).status,401);
const image = await api.GET(new Request("https://site.test"+photo.url,{headers}));
assert.equal(image.status,200); assert.equal(image.headers.get("Content-Type"),"image/jpeg");
const invalid = new FormData();invalid.append("file",new File(["<svg><script/></svg>"],"image.svg",{type:"image/svg+xml"}));
assert.equal((await api.POST(new Request("https://site.test/api/photos",{method:"POST",headers,body:invalid}))).status,400);
check("upload, private media and SVG rejection",()=>{});
const backup=await api.GET(new Request("https://site.test/api/export",{headers}));
assert.equal(backup.status,200);assert.match(backup.headers.get("Content-Disposition"),/nosso-reino-dados/);
check("authenticated export",()=>{});
sqlite.close();
await rm(work,{recursive:true,force:true});
console.log(checks+" checks passed.");
