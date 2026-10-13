import { DatabaseSync } from "node:sqlite";
import { createServer } from "node:http";
import { randomBytes, createHash, scryptSync, timingSafeEqual } from "node:crypto";
import { readFile, writeFile, mkdir, unlink } from "node:fs/promises";
import { resolve, dirname, extname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE=dirname(fileURLToPath(import.meta.url)), ROOT=resolve(HERE,"..");
const PAGE = '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>W&S 132 · Wesley & Suelaine</title><style>body{margin:0;background:#f7f2fa;color:#694475;min-height:100vh;display:grid;place-items:center;font:14px Georgia}main{width:min(360px,calc(100vw - 64px));padding:35px;background:white;border:1px solid #d8c3e0;text-align:center}h1{font-size:39px;font-weight:400}p{line-height:1.8;color:#a181af}label{display:block;text-align:left;margin:17px 0;font:12px Arial}input,select{box-sizing:border-box;width:100%;margin-top:8px;padding:12px;border:1px solid #d8c3e0;font-size:16px;color:#694475;background:white}button{width:100%;padding:14px;background:#694475;color:white;border:0;cursor:pointer}small{display:block;margin-top:25px;color:#ae92b7}.error{color:#ab5a77}</style><main><div>🤍 132 💜</div><h1>W&S 132</h1><p>Wesley & Suelaine</p><p>Um lugar para guardar o nosso amor<br>e construir o nosso amanhã.</p>ERROR<form method="post" action="/auth/login"><label>Quem está chegando?<input name="user" type="text" required autocomplete="username" placeholder="Seu login"></label><label>Nossa chave de entrada<input name="password" type="password" required autocomplete="current-password"></label><button>Entrar no nosso cantinho</button></form><small>Só para nós dois. Deus à frente.</small></main></html>';
const sha = v=>createHash("sha256").update(v).digest("hex");
const headers={"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","Referrer-Policy":"strict-origin-when-cross-origin","X-Frame-Options":"DENY"};
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".svg":"image/svg+xml",".jpg":"image/jpeg",".jpeg":"image/jpeg",".png":"image/png",".webp":"image/webp",".otf":"font/otf",".woff2":"font/woff2",".txt":"text/plain; charset=utf-8"};
export async function makeApp({dataDir,accounts,secure=true,webRoot=resolve(ROOT,"web")}){
 for(const user of (accounts.suelaine132?["suelaine132"]:["wesley","suelaine"]))if(!/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(accounts[user]??""))throw new Error("Configure o hash de acesso no ambiente antes de iniciar.");
 await mkdir(dataDir,{recursive:true});
 const sqlite=new DatabaseSync(resolve(dataDir,"nosso-reino.sqlite"));
 sqlite.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;");
 sqlite.exec(await readFile(resolve(HERE,"schema.sql"),"utf8").then(s=>s.replace(/CREATE TABLE /g,"CREATE TABLE IF NOT EXISTS ").replace(/CREATE INDEX /g,"CREATE INDEX IF NOT EXISTS ")));
 sqlite.exec("CREATE TABLE IF NOT EXISTS runtime_sessions (token_hash TEXT PRIMARY KEY, user TEXT NOT NULL, expires INTEGER NOT NULL);");
 const db={prepare(sql){let args=[];return{bind(...values){args=values;return this},async first(){return sqlite.prepare(sql).get(...args)??null},async all(){return{results:sqlite.prepare(sql).all(...args)}},async run(){const r=sqlite.prepare(sql).run(...args);return{meta:{changes:Number(r.changes)}}}}},async batch(q){sqlite.exec("BEGIN");try{const r=[];for(const x of q)r.push(await x.run());sqlite.exec("COMMIT");return r}catch(e){sqlite.exec("ROLLBACK");throw e}}};
 const bucketRoot=resolve(dataDir,"photos");await mkdir(bucketRoot,{recursive:true});
 const bucket={async put(key,bytes,options){const id=key.replace(/^photos\//,"");if(!/^[\w-]+$/.test(id))throw new Error("Bad key");await writeFile(resolve(bucketRoot,id),bytes);await writeFile(resolve(bucketRoot,id+".json"),JSON.stringify(options.httpMetadata))},async get(key){const id=key.replace(/^photos\//,"");if(!/^[\w-]+$/.test(id))return null;try{return{body:await readFile(resolve(bucketRoot,id)),httpMetadata:JSON.parse(await readFile(resolve(bucketRoot,id+".json"),"utf8"))}}catch{return null}},async delete(key){const id=key.replace(/^photos\//,"");if(!/^[\w-]+$/.test(id))return;await unlink(resolve(bucketRoot,id)).catch(()=>{});await unlink(resolve(bucketRoot,id+".json")).catch(()=>{})}};
 globalThis.__reinoEnv={DB:db,BUCKET:bucket};
 const api=await import("./api.mjs");
 const attempts=new Map(); let apiQueue=Promise.resolve();
 function response(body,status=200,extra={}){return new Response(body,{status,headers:{...headers,...extra}})}
 function session(request){const match=(request.headers.get("cookie")??"").match(/(?:^|;\s*)reino_session=([a-f0-9]{64})(?:;|$)/);if(!match)return null;return sqlite.prepare("SELECT user FROM runtime_sessions WHERE token_hash=? AND expires>?").get(sha(match[1]),Date.now())?.user??null}
 function originOK(r){try{const origin=r.headers.get("origin");return !!origin&&new URL(origin).origin===new URL(r.url).origin}catch{return false}}
 return {sqlite,async handle(request){
  const path=new URL(request.url).pathname;
  if(path==="/health")return response("ok",200,{"Content-Type":"text/plain"});
  if(path==="/login"&&request.method==="GET")return response(PAGE.replace("ERROR",""),200,{"Content-Type":"text/html; charset=utf-8"});
  if(path==="/auth/login"&&request.method==="POST"){
   if(!originOK(request))return response("Origem inválida",403);
   if(Number(request.headers.get("content-length")??0)>4096)return response("Solicitação muito grande",413);
   const address=request.headers.get("x-real-client")??"unknown",previous=attempts.get(address);
   if(previous&&previous.expires>Date.now()&&previous.count>=6)return response(PAGE.replace("ERROR",'<p class="error">Aguarde alguns minutos antes de tentar novamente.</p>'),429,{"Content-Type":"text/html; charset=utf-8"});
   const form=await request.formData(),user=String(form.get("user")??""),password=String(form.get("password")??"");
   const encoded=accounts[user]??Object.values(accounts).find(Boolean);const [,salt,expected]=encoded.split(":");
   const actual=scryptSync(password.slice(0,1024),salt,64);
   if(!accounts[user]||!password||password.length>1024||!timingSafeEqual(actual,Buffer.from(expected,"hex"))){
    attempts.set(address,{count:previous&&previous.expires>Date.now()?previous.count+1:1,expires:Date.now()+15*60*1000});
    return response(PAGE.replace("ERROR",'<p class="error">Confira a chave de entrada e tente novamente.</p>'),401,{"Content-Type":"text/html; charset=utf-8"});
   }
   attempts.delete(address);sqlite.prepare("DELETE FROM runtime_sessions WHERE expires < ?").run(Date.now());
   const token=randomBytes(32).toString("hex");sqlite.prepare("INSERT INTO runtime_sessions VALUES (?,?,?)").run(sha(token),user,Date.now()+7*86400000);
   return response("",303,{"Location":"/","Set-Cookie":"reino_session="+token+"; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800"+(secure?"; Secure":"")});
  }
  const user=session(request);
  if(!user)return path.startsWith("/api/")||path==="/auth/me"?response('{"error":"Entre na sua conta."}',401,{"Content-Type":"application/json"}):response("",303,{"Location":"/login"});
  if(path==="/auth/me")return response(JSON.stringify({name:user==="suelaine132"?"Wesley & Suelaine":user==="wesley"?"Wesley":"Suelaine · Eevangeline"}),200,{"Content-Type":"application/json"});
  if(path==="/auth/logout"){const match=(request.headers.get("cookie")??"").match(/reino_session=([a-f0-9]{64})/);if(match)sqlite.prepare("DELETE FROM runtime_sessions WHERE token_hash=?").run(sha(match[1]));return response("",303,{"Location":"/login","Set-Cookie":"reino_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0"+(secure?"; Secure":"")})}
  if(path.startsWith("/api/")){
   if(!["GET","HEAD"].includes(request.method)&&!originOK(request))return response('{"error":"Origem inválida"}',403,{"Content-Type":"application/json"});
   const h=new Headers(request.headers);h.delete("oai-authenticated-user-id");h.delete("oai-authenticated-user-email");h.set("oai-authenticated-user-id",user);h.set("oai-authenticated-user-email",user+"@nosso-reino.local");
   const forwarded=new Request(request,{headers:h});const method=api[request.method];if(!method)return response("",405);
   const task=apiQueue.then(()=>method(forwarded));apiQueue=task.catch(()=>{});return task;
  }
  if(request.method!=="GET"&&request.method!=="HEAD")return response("",405);
  let decoded;try{decoded=decodeURIComponent(path)}catch{return response("",400)}
  const file=resolve(webRoot,"."+decoded),index=resolve(webRoot,"index.html");
  if(file!==webRoot&&!file.startsWith(webRoot+"/"))return response("",403);
  try{const p=extname(file)?file:index;const bytes=await readFile(p);return response(request.method==="HEAD"?null:bytes,200,{"Content-Type":mime[extname(p)]??"application/octet-stream"})}catch{return response("Não encontrado",404)}
 }};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const app=await makeApp({dataDir:process.env.REINO_DATA_DIR??resolve(ROOT,"data"),accounts:{suelaine132:process.env.AUTH_SUELAINE132_HASH,wesley:process.env.AUTH_WESLEY_HASH,suelaine:process.env.AUTH_SUELAINE_HASH},secure:process.env.NODE_ENV!=="development"});
 const port=Number(process.env.PORT??3000);
 createServer(async(req,res)=>{try{
  const body=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>12*1024*1024){res.writeHead(413);res.end("Arquivo muito grande");return}body.push(chunk)}
  const h=new Headers();for(const[key,value]of Object.entries(req.headers))if(value)h.set(key,Array.isArray(value)?value.join(","):value);
  h.set("x-real-client",req.socket.remoteAddress??"unknown");
  const proto=process.env.NODE_ENV==="development"?"http":"https";
  const request=new Request(proto+"://"+(req.headers.host??"localhost")+req.url,{method:req.method,headers:h,...(size?{body:Buffer.concat(body)}:{})});
  const r=await app.handle(request);res.writeHead(r.status,Object.fromEntries(r.headers.entries()));res.end(Buffer.from(await r.arrayBuffer()));
 }catch(e){console.error(e.message);res.writeHead(500);res.end("Não foi possível abrir nosso espaço.")}}).listen(port,"0.0.0.0",()=>console.log("W&S 132 pronto na porta "+port));
}
