import assert from "node:assert/strict";
import {randomBytes,pbkdf2Sync} from "node:crypto";
import {DatabaseSync} from "node:sqlite";
import {readFile,readdir} from "node:fs/promises";
const worker=(await import("../dist/server/index.js")).default;
const sqlite=new DatabaseSync(":memory:");
for(const file of (await readdir("drizzle")).filter(f=>f.endsWith(".sql")).sort())sqlite.exec(await readFile("drizzle/"+file,"utf8"));
const DB={prepare(sql){let values=[];return{bind(...v){values=v;return this},async first(){return sqlite.prepare(sql).get(...values)??null},async all(){return{results:sqlite.prepare(sql).all(...values)}},async run(){const r=sqlite.prepare(sql).run(...values);return{meta:{changes:Number(r.changes)}}}}},async batch(list){sqlite.exec("BEGIN");try{const results=[];for(const q of list)results.push(await q.run());sqlite.exec("COMMIT");return results}catch(e){sqlite.exec("ROLLBACK");throw e}}};
const images=new Map(),BUCKET={async put(id,body,options){images.set(id,{body,httpMetadata:options.httpMetadata})},async get(id){return images.get(id)??null},async delete(id){images.delete(id)}};
try {
const password=randomBytes(24).toString("hex"),salt=randomBytes(16),config={password,hash:"pbkdf2:100000:"+salt.toString("hex")+":"+pbkdf2Sync(password,salt,100000,32,"sha256").toString("hex")},origin="https://wesleyttiago.github.io";
const bindings={DB,BUCKET,LOGIN_HASH:config.hash,PAGES_ORIGIN:origin};
const req=(path,method="GET",body,token="",extra={})=>new Request("https://ws132-api.wesleytiago470.chatgpt.site"+path,{method,headers:{origin,"cf-connecting-ip":"test-owner","x-nosso-reino":"1",...(token?{authorization:"Bearer "+token}:{}),...(body?{"Content-Type":"application/json"}:{}),...extra},...(body?{body:JSON.stringify(body)}:{})});
assert.equal((await worker.fetch(req("/api/state"),bindings)).status,401);
assert.equal((await worker.fetch(req("/photos/515b6167c3cecf.webp"),bindings)).status,401);
assert.equal((await worker.fetch(req("/avatars.webp","GET",undefined,"",{"oai-authenticated-user-id":"fake","oai-authenticated-user-email":"fake@example.test"}),bindings)).status,401);
assert.equal((await worker.fetch(req("/auth/login","POST",{user:"suelaine132",password:config.password},"",{origin:"https://evil.example"}),bindings)).status,403);
const first=await worker.fetch(req("/auth/login","POST",{user:"suelaine132",password:config.password}),bindings);assert.equal(first.status,200);const token=(await first.json()).token;assert.match(token,/^[a-f0-9]{64}$/);
const response=await worker.fetch(req("/api/state","GET",undefined,token),bindings);assert.equal(response.status,200);assert.equal(response.headers.get("access-control-allow-origin"),origin);const state=await response.json();assert.equal(state.settings.title,"W&S 132");assert.equal(state.settings.openingCents,36200);assert.equal(state.items.filter(i=>i.collection==="memories").length,40);
const photo=await worker.fetch(req("/photos/515b6167c3cecf.webp","GET",undefined,token),bindings);assert.equal(photo.status,200);assert.equal(photo.headers.get("content-type"),"image/webp");assert.ok((await photo.clone().arrayBuffer()).byteLength>1000);
assert.equal((await worker.fetch(req("/api/items","POST",{id:"shared-check",collection:"transactions",revision:0,title:"Teste",amountCents:100,type:"income",date:"2026-10-13",person:"Nós",note:"",goalId:""},token),bindings)).status,200);
const second=await worker.fetch(req("/auth/login","POST",{user:"suelaine132",password:config.password}),bindings);const token2=(await second.json()).token;assert.notEqual(token,token2);assert.ok((await(await worker.fetch(req("/api/state","GET",undefined,token2),bindings)).json()).items.some(i=>i.id==="shared-check"));
assert.equal((await worker.fetch(req("/api/items","DELETE",{id:"shared-check",revision:0},token,{origin:"https://evil.example"}),bindings)).status,403);
assert.equal((await worker.fetch(req("/api/export","GET",undefined,token),bindings)).status,200);

const imageBytes=new Uint8Array(await photo.arrayBuffer());
const roots=state.items.filter(i=>i.collection==="albums"&&!i.parentId);
const destinations=[...roots,...roots.flatMap(root=>state.items.filter(i=>i.collection==="albums"&&i.parentId===root.id).slice(0,1))];
for(const destination of destinations){
 const form=new FormData();form.append("file",new File([imageBytes],"upload-check.webp",{type:"image/webp"}));form.append("albumId",destination.id);form.append("caption","Teste de foto em "+destination.title);form.append("date","2026-10-13");
 const upload=await worker.fetch(new Request("https://ws132-api.wesleytiago470.chatgpt.site/api/photos",{method:"POST",headers:{origin,authorization:"Bearer "+token,"x-nosso-reino":"1"},body:form}),bindings);
 assert.equal(upload.status,201,JSON.stringify(await upload.clone().json()));
 const record=(await upload.json()).items.find(i=>i.collection==="memories"&&i.albumId===destination.id&&i.caption==="Teste de foto em "+destination.title);
 assert.ok(record);assert.equal(record.date,"2026-10-13");
 const retrieved=await worker.fetch(req(record.url,"GET",undefined,token2),bindings);assert.equal(retrieved.status,200);assert.deepEqual(new Uint8Array(await retrieved.arrayBuffer()),new Uint8Array(imageBytes));
 assert.equal((await worker.fetch(req(record.url),bindings)).status,401);
}
console.log("PASS photo uploads with caption/date to all three albums and apartment/wedding mini-albums; second login can retrieve each photo.");
assert.equal((await worker.fetch(req("/auth/logout","POST",undefined,token),bindings)).status,200);assert.equal((await worker.fetch(req("/api/state","GET",undefined,token),bindings)).status,401);assert.equal((await worker.fetch(req("/api/state","GET",undefined,token2),bindings)).status,200);
for(let i=0;i<6;i++)assert.equal((await worker.fetch(req("/auth/login","POST",{user:"suelaine132",password:"invalid"},"",{"cf-connecting-ip":"test-attacker"}),bindings)).status,401);
assert.equal((await worker.fetch(req("/auth/login","POST",{user:"suelaine132",password:"invalid"},"",{"cf-connecting-ip":"test-attacker"}),bindings)).status,429);
assert.equal((await worker.fetch(req("/api/state"),{DB,BUCKET})).status,503);
console.log("PASS requested login, protected photos, forged headers, CORS, two sessions, shared records, export, logout, rate limits and fail-closed configuration.");sqlite.close();process.exit(0);
}catch(error){console.error(error instanceof Error?error.message:"Test failure");process.exit(1)}
