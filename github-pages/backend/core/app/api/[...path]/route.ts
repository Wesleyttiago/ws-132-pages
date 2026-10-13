import { env } from "cloudflare:workers";
import { assertRequest, cleanItem, cleanSettings, validatePlacement, InputError } from "@/lib/validation";
import { deleteItem, putItem, putSettings, readState, seedDefaults } from "@/lib/store";
export const dynamic = "force-dynamic";
const privateHeaders = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
function json(v: unknown, status = 200) { return Response.json(v, { status, headers: privateHeaders }); }
async function handle(request: Request) {
 try {
  const user = assertRequest(request), path = new URL(request.url).pathname.replace(/^\/api\//, ""), db = env.DB;
  if (!db) throw new InputError("O caixa está temporariamente indisponível.", 503);
  if (path === "state" && request.method === "GET") return json(await readState(db));
  if (path === "export" && request.method === "GET") return new Response(JSON.stringify(await readState(db), null, 2), { headers: { ...privateHeaders, "Content-Type": "application/json; charset=utf-8", "Content-Disposition": 'attachment; filename="nosso-reino-dados.json"' } });
  if (path.startsWith("media/") && request.method === "GET") {
   const key = path.slice(6); if (!/^[a-zA-Z0-9-]+$/.test(key)) throw new InputError("Foto não encontrada.", 404);
   const o = await env.BUCKET?.get("photos/" + key); if (!o) throw new InputError("Foto não encontrada.", 404);
   return new Response(o.body, { headers: { ...privateHeaders, "Content-Type": o.httpMetadata?.contentType ?? "image/jpeg", "Content-Disposition": "inline" } });
  }
  if (request.method === "GET") throw new InputError("Página não encontrada.", 404);
  await seedDefaults(db, user.id);
  if (path === "photos" && request.method === "POST") {
   if (!env.BUCKET) throw new InputError("O envio de fotos está temporariamente indisponível.", 503);
   if (Number(request.headers.get("content-length") ?? 0) > 12 * 1024 * 1024) throw new InputError("Envie uma foto de até 10 MB.", 413);
   const form = await request.formData(), file = form.get("file");
   if (!(file instanceof File) || !file.size || file.size > 10 * 1024 * 1024) throw new InputError("Escolha uma foto de até 10 MB.");
   const b = new Uint8Array(await file.arrayBuffer()); let type = "";
   if (b[0] === 255 && b[1] === 216 && b[2] === 255) type = "image/jpeg";
   else if ([137,80,78,71,13,10,26,10].every((v,i) => b[i] === v)) type = "image/png";
   else if (String.fromCharCode(...b.slice(0,4)) === "RIFF" && String.fromCharCode(...b.slice(8,12)) === "WEBP") type = "image/webp";
   else if (/^GIF8[79]a$/.test(String.fromCharCode(...b.slice(0,6)))) type = "image/gif";
   if (!type) throw new InputError("Use uma foto JPG, PNG, WebP ou GIF. No iPhone, escolha o formato mais compatível.");
   const id = crypto.randomUUID(), item = cleanItem({ id, collection: "memories", url: "/api/media/" + id, albumId: String(form.get("albumId") ?? "album-love"), caption: String(form.get("caption") ?? ""), date: String(form.get("date") ?? ""), favorite: false });
   validatePlacement((await readState(db)).items, item);
   await env.BUCKET.put("photos/" + id, b, { httpMetadata: { contentType: type } });
   try { await putItem(db, item, user.id, false); } catch (e) { await env.BUCKET.delete("photos/" + id); throw e; }
   return json(await readState(db), 201);
  }
  const body = await request.json() as Record<string, unknown>;
  if (path === "settings" && request.method === "PATCH") {
   const revision = Number(body.revision); if (!Number.isSafeInteger(revision) || revision < 0) throw new InputError("Versão inválida.");
   await putSettings(db, cleanSettings(body), revision);
  } else if (path === "items" && (request.method === "POST" || request.method === "PATCH")) { const item = cleanItem(body); validatePlacement((await readState(db)).items, item); await putItem(db, item, user.id, request.method === "PATCH"); }
  else if (path === "items" && request.method === "DELETE") {
   if (typeof body.id !== "string" || body.id.length > 100 || !Number.isSafeInteger(body.revision) || Number(body.revision) < 0) throw new InputError("Registro inválido.");
   await deleteItem(db, body.id, Number(body.revision));
  } else throw new InputError("Ação não encontrada.", 404);
  return json(await readState(db));
 } catch (e) {
  if (e instanceof InputError) return json({ error: e.message }, e.status);
  if (e instanceof SyntaxError) return json({ error: "Confira os dados e tente novamente." }, 400);
  console.error("Nosso Reino API", e instanceof Error ? e.message : "Unexpected error");
  return json({ error: "Não foi possível salvar agora. Seus dados anteriores estão preservados. Tente novamente." }, 500);
 }
}
export const GET = handle; export const POST = handle; export const PATCH = handle; export const DELETE = handle;
