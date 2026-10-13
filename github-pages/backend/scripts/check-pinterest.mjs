import assert from "node:assert/strict";
import {randomBytes,pbkdf2Sync} from "node:crypto";
import {DatabaseSync} from "node:sqlite";
import {readFile,readdir} from "node:fs/promises";
const worker=(await import("../dist/server/index.js")).default;
const sqlite=new DatabaseSync(":memory:");
for(const file of (await readdir("drizzle")).filter(f=>f.endsWith(".sql")).sort())sqlite.exec(await readFile("drizzle/"+file,"utf8"));
const DB={prepare(sql){let values=[];return{bind(...v){values=v;return this},async first(){return sqlite.prepare(sql).get(...values)??null},async all(){return{results:sqlite.prepare(sql).all(...values)}},async run(){const r=sqlite.prepare(sql).run(...values);return{meta:{changes:Number(r.changes)}}}}},async batch(list){sqlite.exec("BEGIN");try{const results=[];for(const q of list)results.push(await q.run());sqlite.exec("COMMIT");return results}catch(e){sqlite.exec("ROLLBACK");throw e}}};
const images=new Map(),BUCKET={async put(id,body,options){images.set(id,{body,httpMetadata:options.httpMetadata,customMetadata:options.customMetadata})},async get(id){return images.get(id)??null},async delete(id){images.delete(id)}};
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

const addRecord=async(record,expected=200)=>{const response=await worker.fetch(req("/api/items","POST",{revision:0,...record},token),bindings);assert.equal(response.status,expected);return response.json();};
const patchRecord=async(record,expected=200)=>{const response=await worker.fetch(req("/api/items","PATCH",record,token),bindings);assert.equal(response.status,expected);return response.json();};
let planning=await addRecord({id:"wedding-plan",collection:"weddingPlan",budgetCents:1000000});
assert.equal(planning.items.find(i=>i.id==="wedding-plan").budgetCents,1000000);
await addRecord({id:"wedding-plan",collection:"weddingPlan",budgetCents:500000},409);
let taskState=await addRecord({id:"business-task",collection:"weddingTasks",title:"Reservar cerimônia",date:"2027-07-08",status:"todo",period:"12",note:"Conferir os horários."});
let task=taskState.items.find(i=>i.id==="business-task");
for(const status of ["doing","done","cancelled"]){taskState=await patchRecord({...task,status});task=taskState.items.find(i=>i.id===task.id);assert.equal(task.status,status);}
await patchRecord({...task,status:"unknown"},400);await patchRecord({...task,date:"2027-02-31"},400);
const cost={id:"business-cost",collection:"weddingCosts",title:"Buffet de teste",category:"Alimentos",estimatedCents:400000,realCents:null,paymentStatus:"unpaid",nextDate:"",note:""};
let costState=await addRecord(cost),storedCost=costState.items.find(i=>i.id===cost.id);
await patchRecord({...storedCost,paymentStatus:"paid"},400);
costState=await patchRecord({...storedCost,realCents:350000,paymentStatus:"partial",nextDate:"2027-08-10"});storedCost=costState.items.find(i=>i.id===cost.id);
assert.equal(storedCost.nextDate,"2027-08-10");
const oldCost={...storedCost};costState=await patchRecord({...storedCost,paymentStatus:"paid"});storedCost=costState.items.find(i=>i.id===cost.id);assert.equal(storedCost.nextDate,"");await patchRecord(oldCost,409);
const supplier={id:"business-supplier",collection:"suppliers",title:"Fornecedor de teste",service:"Fotografia",phone:"(81) 99999-0000",email:"contato@example.test",contractUrl:"",contractName:"",note:"Inclui lanche para a equipe."};
let supplierState=await addRecord(supplier),storedSupplier=supplierState.items.find(i=>i.id===supplier.id);
await patchRecord({...storedSupplier,contractUrl:"javascript:alert(1)"},400);await patchRecord({...storedSupplier,email:"wrong"},400);
const pdf=new TextEncoder().encode("%PDF-1.4\n1 0 obj\n<</Type /Catalog>>\nendobj\ntrailer\n<</Root 1 0 R>>\n%%EOF");
const attachment=(bytes,revision=storedSupplier.revision)=>{const form=new FormData();form.append("file",new File([bytes],"contrato-teste.pdf",{type:"application/pdf"}));form.append("supplierId",supplier.id);form.append("revision",String(revision));return new Request("https://ws132-api.wesleytiago470.chatgpt.site/api/contracts",{method:"POST",headers:{origin,authorization:"Bearer "+token,"x-nosso-reino":"1"},body:form});};
assert.equal((await worker.fetch(attachment(imageBytes),bindings)).status,400);
const pdfResponse=await worker.fetch(attachment(pdf),bindings);assert.equal(pdfResponse.status,201);supplierState=await pdfResponse.json();storedSupplier=supplierState.items.find(i=>i.id===supplier.id);assert.equal(storedSupplier.contractName,"contrato-teste.pdf");
assert.equal((await worker.fetch(attachment(pdf,0),bindings)).status,409);
const fetchedPdf=await worker.fetch(req(storedSupplier.contractUrl,"GET",undefined,token2),bindings);assert.equal(fetchedPdf.status,200);assert.equal(fetchedPdf.headers.get("content-type"),"application/pdf");assert.match(fetchedPdf.headers.get("content-disposition"),/^attachment/);assert.deepEqual(new Uint8Array(await fetchedPdf.arrayBuffer()),pdf);
assert.equal((await worker.fetch(req(storedSupplier.contractUrl),bindings)).status,401);
for(const [index,rsvp] of ["pending","confirmed","declined"].entries())await addRecord({id:"business-guest-"+index,collection:"guests",title:"Convidado de teste "+index,group:"Grupo de teste",isSponsor:index===1,rsvp,restriction:index===1?"Alergia a amendoim":""});
let latest=(await(await worker.fetch(req("/api/state","GET",undefined,token2),bindings)).json());assert.equal(latest.items.filter(i=>i.collection==="guests").length,3);
const guest=latest.items.find(i=>i.id==="business-guest-0");latest=await patchRecord({...guest,rsvp:"confirmed",isSponsor:true});assert.equal(latest.items.filter(i=>i.collection==="guests"&&i.rsvp==="confirmed").length,2);await patchRecord({...latest.items.find(i=>i.id===guest.id),rsvp:"maybe"},400);
assert.equal(latest.settings.openingCents,36200);assert.ok(latest.items.some(i=>i.id==="shared-check"));
assert.equal((await worker.fetch(req("/api/items","DELETE",{id:storedCost.id,revision:storedCost.revision},token),bindings)).status,200);
assert.ok(!(await(await worker.fetch(req("/api/state","GET",undefined,token2),bindings)).json()).items.some(i=>i.id===storedCost.id));
console.log("PASS separate wedding records, four task stages, budget revision conflicts, estimates/closed costs, payment rules, supplier contacts, protected PDF upload/download, RSVP changes and shared persistence; original funds preserved.");

const reference={id:"pin-reference-check",collection:"memories",url:"https://br.pinterest.com/pin/casamento-lilas--598204763040742126/?tracking=removed",albumId:"wedding-2",caption:"Gostamos das cores e das flores.",date:"2026-10-13",favorite:false};
let pinState=await addRecord(reference),pinRecord=pinState.items.find(i=>i.id===reference.id);assert.equal(pinRecord.url,"https://www.pinterest.com/pin/598204763040742126/");assert.equal(pinRecord.sourceType,"pinterest");assert.equal(pinRecord.albumId,"wedding-2");
await addRecord({...reference,id:"duplicate-pin-check"},409);await addRecord({...reference,id:"invalid-destination-check",albumId:"missing-album"},400);await addRecord({...reference,id:"unsafe-pin-check",url:"https://pinterest.com.evil.test/pin/598204763040742126/"},400);
pinState=await patchRecord({...pinRecord,albumId:"apartment-0",caption:"Uma ideia para a sala.",favorite:true});pinRecord=pinState.items.find(i=>i.id===reference.id);assert.equal(pinRecord.favorite,true);assert.equal(pinRecord.caption,"Uma ideia para a sala.");assert.equal(pinRecord.albumId,"apartment-0");
let boardState=await addRecord({id:"pin-board-check",collection:"inspirationBoards",url:"https://br.pinterest.com/casal/sala/?tracking=removed",title:"Nossa pasta de sala",category:"apartment",note:""});const board=boardState.items.find(i=>i.id==="pin-board-check");assert.equal(board.url,"https://www.pinterest.com/casal/sala/");await addRecord({...board,id:"invalid-board",url:"https://www.pinterest.com/search/pins/?q=sala"},400);
const final=(await(await worker.fetch(req("/api/state","GET",undefined,token2),bindings)).json());assert.ok(final.items.some(i=>i.id===reference.id&&i.albumId==="apartment-0"));assert.ok(final.items.some(i=>i.id==="pin-board-check"));assert.equal(final.settings.openingCents,36200);
console.log("PASS Pinterest references saved/moved with captions, dates and favorites; shared public board bookmarks; duplicate/destination/host validation; existing records preserved.");
assert.equal((await worker.fetch(req("/auth/logout","POST",undefined,token),bindings)).status,200);assert.equal((await worker.fetch(req("/api/state","GET",undefined,token),bindings)).status,401);assert.equal((await worker.fetch(req("/api/state","GET",undefined,token2),bindings)).status,200);
for(let i=0;i<6;i++)assert.equal((await worker.fetch(req("/auth/login","POST",{user:"suelaine132",password:"invalid"},"",{"cf-connecting-ip":"test-attacker"}),bindings)).status,401);
assert.equal((await worker.fetch(req("/auth/login","POST",{user:"suelaine132",password:"invalid"},"",{"cf-connecting-ip":"test-attacker"}),bindings)).status,429);
assert.equal((await worker.fetch(req("/api/state"),{DB,BUCKET})).status,503);
console.log("PASS requested login, protected photos, forged headers, CORS, two sessions, shared records, export, logout, rate limits and fail-closed configuration.");sqlite.close();process.exit(0);
}catch(error){console.error(error instanceof Error?error.message:"Test failure");process.exit(1)}
