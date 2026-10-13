let activeEnv;
let apiQueue = Promise.resolve();
const encoder = new TextEncoder();
const hex = bytes => Array.from(new Uint8Array(bytes), b=>b.toString(16).padStart(2,"0")).join("");
const unhex = value => Uint8Array.from(value.match(/../g), x=>parseInt(x,16));
async function digest(value){ return hex(await crypto.subtle.digest("SHA-256",encoder.encode(value))); }
async function checkPassword(password,encoded){
 const match=encoded?.match(/^pbkdf2:([0-9]+):([a-f0-9]{32}):([a-f0-9]{64})$/);
 if(!match) throw new Error("Access is not configured.");
 const key=await crypto.subtle.importKey("raw",encoder.encode(password),"PBKDF2",false,["deriveBits"]);
 const bytes=await crypto.subtle.deriveBits({name:"PBKDF2",salt:unhex(match[2]),iterations:Number(match[1]),hash:"SHA-256"},key,256);
 const actual=new Uint8Array(bytes),expected=unhex(match[3]);let different=0;
 for(let i=0;i<32;i++)different|=actual[i]^expected[i];
 return different===0;
}
function decorate(response,origin,allowed){
 const headers=new Headers(response.headers);
 headers.set("Cache-Control","private, no-store");headers.set("X-Content-Type-Options","nosniff");headers.set("Referrer-Policy","no-referrer");headers.set("X-Frame-Options","DENY");
 if(origin===allowed){headers.set("Access-Control-Allow-Origin",allowed);headers.set("Vary","Origin");headers.set("Access-Control-Allow-Methods","GET, POST, PATCH, DELETE, OPTIONS");headers.set("Access-Control-Allow-Headers","Authorization, Content-Type, X-Nosso-Reino");headers.set("Access-Control-Expose-Headers","Content-Type, Content-Disposition");}
 return new Response(response.body,{status:response.status,headers});
}
export default { async fetch(request,bindings){
 activeEnv=bindings;env=bindings;
 const path=new URL(request.url).pathname,origin=request.headers.get("origin"),allowed=bindings.PAGES_ORIGIN;
 const reply=(value,status=200)=>decorate(Response.json(value,{status}),origin,allowed);
 try{
  if(!allowed||!bindings.LOGIN_HASH||!bindings.DB||!bindings.BUCKET)return reply({error:"O acesso está sendo preparado."},503);
  if(request.method==="OPTIONS")return origin===allowed?decorate(new Response(null,{status:204}),origin,allowed):reply({error:"Origem inválida."},403);
  if(origin&&origin!==allowed)return reply({error:"Origem inválida."},403);
  if(path==="/health")return reply({status:"ok"});
  if(path==="/auth/login"&&request.method==="POST"){
   if(origin!==allowed)return reply({error:"Origem inválida."},403);
   if(Number(request.headers.get("content-length")??0)>4096)return reply({error:"Solicitação inválida."},413);
   const raw=await request.text();if(raw.length>4096)return reply({error:"Solicitação inválida."},413);
   let form;try{form=JSON.parse(raw)}catch{return reply({error:"Confira os dados."},400)}
   const address=request.headers.get("cf-connecting-ip")??"unknown",limitId=await digest(address);
   const limit=await bindings.DB.prepare("SELECT failures, reset_at FROM auth_limits WHERE id=?").bind(limitId).first();
   if(limit&&limit.reset_at>Date.now()&&limit.failures>=6)return reply({error:"Aguarde alguns minutos antes de tentar novamente."},429);
   const valid=typeof form.password==="string"&&form.password.length>0&&form.password.length<=200&&await checkPassword(form.password,bindings.LOGIN_HASH);
   if(form.user!=="suelaine132"||!valid){
    const count=limit&&limit.reset_at>Date.now()?limit.failures+1:1;
    await bindings.DB.prepare("INSERT INTO auth_limits(id,failures,reset_at) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET failures=excluded.failures,reset_at=excluded.reset_at").bind(limitId,count,Date.now()+900000).run();
    return reply({error:"Confira o login e a senha."},401);
   }
   await bindings.DB.prepare("DELETE FROM auth_limits WHERE id=?").bind(limitId).run();
   await bindings.DB.prepare("DELETE FROM auth_sessions WHERE expires<?").bind(Date.now()).run();
   const token=hex(crypto.getRandomValues(new Uint8Array(32)));
   await bindings.DB.prepare("INSERT INTO auth_sessions(token_hash,expires) VALUES(?,?)").bind(await digest(token),Date.now()+7*86400000).run();
   return reply({token,name:"Wesley & Suelaine"});
  }
  const match=(request.headers.get("authorization")??"").match(/^Bearer ([a-f0-9]{64})$/);
  const session=match?await bindings.DB.prepare("SELECT token_hash FROM auth_sessions WHERE token_hash=? AND expires>?").bind(await digest(match[1]),Date.now()).first():null;
  if(!session)return reply({error:"Entre no nosso cantinho."},401);
  if(path==="/auth/logout"&&request.method==="POST"){
   if(origin!==allowed)return reply({error:"Origem inválida."},403);
   await bindings.DB.prepare("DELETE FROM auth_sessions WHERE token_hash=?").bind(session.token_hash).run();return reply({ok:true});
  }
  if(path==="/auth/me")return reply({name:"Wesley & Suelaine"});
  if(initialAssets[path]&&request.method==="GET"){
   const binary=atob(initialAssets[path]);const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
   return decorate(new Response(bytes,{headers:{"Content-Type":"image/webp"}}),origin,allowed);
  }
  if(!path.startsWith("/api/"))return reply({error:"Página não encontrada."},404);
  if(!["GET","HEAD"].includes(request.method)&&origin!==allowed)return reply({error:"Origem inválida."},403);
  if(Number(request.headers.get("content-length")??0)>12*1024*1024)return reply({error:"Solicitação muito grande."},413);
  const headers=new Headers(request.headers);
  for(const key of Array.from(headers.keys()))if(key.startsWith("oai-authenticated-"))headers.delete(key);
  headers.set("oai-authenticated-user-id","shared-couple");headers.set("oai-authenticated-user-email","couple@ws132.local");headers.set("sec-fetch-site","same-origin");
  const forwarded=new Request(request,{headers});
  const action=apiQueue.then(()=>handle(forwarded));apiQueue=action.catch(()=>{});
  return decorate(await action,origin,allowed);
 }catch(error){console.error("W&S access",error instanceof Error?error.message:"Unknown error");return reply({error:"Não foi possível abrir nosso espaço. Tente novamente."},500);}
}};
