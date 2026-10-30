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
  if (path.startsWith("contracts/") && request.method === "GET") {
   const key=path.slice(10);if(!/^[a-zA-Z0-9-]+$/.test(key))throw new InputError("Contrato não encontrado.",404);
   const file=await env.BUCKET?.get("contracts/"+key);if(!file)throw new InputError("Contrato não encontrado.",404);
   const filename=file.customMetadata?.filename??"contrato.pdf";
   return new Response(file.body,{headers:{...privateHeaders,"Content-Type":"application/pdf","Content-Disposition":"attachment; filename*=UTF-8''"+encodeURIComponent(filename).replace(/'/g,"%27")}});
  }
  if(path.startsWith("audio/")&&request.method==="GET"){
   const key=path.slice(6);if(!/^[a-zA-Z0-9-]+$/.test(key))throw new InputError("Áudio não encontrado.",404);
   const file=await env.BUCKET?.get("audio/"+key);if(!file)throw new InputError("Áudio não encontrado.",404);
   return new Response(file.body,{headers:{...privateHeaders,"Content-Type":file.httpMetadata?.contentType??"audio/mpeg","Content-Disposition":"inline"}});
  }
  if (request.method === "GET") throw new InputError("Página não encontrada.", 404);
  await seedDefaults(db, user.id);
  if(path==="audio"&&request.method==="POST"){
   if(!env.BUCKET)throw new InputError("O envio de áudio está temporariamente indisponível.",503);
   if(Number(request.headers.get("content-length")??0)>21*1024*1024)throw new InputError("Envie um áudio de até 20 MB.",413);
   const form=await request.formData(),file=form.get("file"),songId=String(form.get("songId")??""),revision=Number(form.get("revision"));
   if(!/^[a-zA-Z0-9-]+$/.test(songId)||!Number.isSafeInteger(revision)||revision<0)throw new InputError("Música inválida.");
   const song=(await readState(db)).items.find(item=>item.id===songId&&item.collection==="songs");
   if(!song)throw new InputError("Salve a música na playlist antes de anexar o áudio.",404);
   if(song.revision!==revision)throw new InputError("A música mudou em outro aparelho. Atualize antes de anexar o áudio.",409);
   if(!(file instanceof File)||file.size<12||file.size>20*1024*1024)throw new InputError("Escolha um arquivo MP3, M4A, OGG ou WAV de até 20 MB.");
   const bytes=new Uint8Array(await file.arrayBuffer()),text=(start:number,end:number)=>String.fromCharCode(...bytes.slice(start,end));let type="";
   if(text(0,3)==="ID3"||bytes[0]===255&&(bytes[1]&224)===224&&(bytes[1]&6)!==0)type="audio/mpeg";
   else if(text(0,4)==="OggS")type="audio/ogg";
   else if(text(0,4)==="RIFF"&&text(8,12)==="WAVE")type="audio/wav";
   else if(text(4,8)==="ftyp"&&["M4A ","M4B ","isom","mp42"].includes(text(8,12)))type="audio/mp4";
   if(!type)throw new InputError("O arquivo precisa ser um áudio MP3, M4A, OGG ou WAV válido.");
   const id=crypto.randomUUID(),name=file.name.split(/[\\/]/).pop()?.replace(/[\x00-\x1f\x7f]/g,"").slice(0,170)||"audio";
   const updated=cleanItem({...song,audioUrl:"/api/audio/"+id,audioName:name});
   await env.BUCKET.put("audio/"+id,bytes,{httpMetadata:{contentType:type},customMetadata:{filename:name}});
   try{await putItem(db,updated,user.id,true);}catch(error){await env.BUCKET.delete("audio/"+id);throw error;}
   return json(await readState(db),201);
  }
  if (path === "contracts" && request.method === "POST") {
   if(!env.BUCKET)throw new InputError("O envio de contratos está temporariamente indisponível.",503);
   const form=await request.formData(),file=form.get("file"),supplierId=String(form.get("supplierId")??""),revision=Number(form.get("revision"));
   if(!/^[a-zA-Z0-9-]+$/.test(supplierId)||!Number.isSafeInteger(revision)||revision<0)throw new InputError("Fornecedor inválido.");
   const supplier=(await readState(db)).items.find(i=>i.id===supplierId&&i.collection==="suppliers");
   if(!supplier)throw new InputError("Salve o fornecedor antes de anexar o contrato.",404);
   if(supplier.revision!==revision)throw new InputError("O fornecedor mudou em outro aparelho. Atualize antes de anexar o contrato.",409);
   if(!(file instanceof File)||!file.size||file.size>10*1024*1024)throw new InputError("Escolha um contrato PDF de até 10 MB.");
   const bytes=new Uint8Array(await file.arrayBuffer());
   if(String.fromCharCode(...bytes.slice(0,5))!=="%PDF-")throw new InputError("O arquivo precisa ser um PDF válido.");
   const id=crypto.randomUUID();let name=file.name.split(/[\\/]/).pop()?.replace(/[\x00-\x1f\x7f]/g,"").slice(0,170)||"contrato.pdf";if(!name.toLowerCase().endsWith(".pdf"))name+=".pdf";
   const updated=cleanItem({...supplier,contractUrl:"/api/contracts/"+id,contractName:name});
   await env.BUCKET.put("contracts/"+id,bytes,{httpMetadata:{contentType:"application/pdf"},customMetadata:{filename:name}});
   try{await putItem(db,updated,user.id,true);}catch(e){await env.BUCKET.delete("contracts/"+id);throw e;}
   return json(await readState(db),201);
  }
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
   const dimension=(value:FormDataEntryValue|null)=>{const n=Number(value);return Number.isSafeInteger(n)&&n>0&&n<=30000?n:0;};
   const id = crypto.randomUUID(), item = cleanItem({ id, collection: "memories", url: "/api/media/" + id, albumId: String(form.get("albumId") ?? "album-love"), caption: String(form.get("caption") ?? ""), date: String(form.get("date") ?? ""), favorite: false,width:dimension(form.get("width")),height:dimension(form.get("height")) });
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
