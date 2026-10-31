import assert from "node:assert/strict";
import {readFile,writeFile,mkdtemp,rm} from "node:fs/promises";
import {pathToFileURL} from "node:url";
import ts from "typescript";
import React from "react";
import {renderToStaticMarkup} from "react-dom/server";

const root=new URL("../",import.meta.url).pathname;
const folder=await mkdtemp(root+".business-check-");
const compile=async(input,output)=>{const code=ts.transpileModule(await readFile(root+input,"utf8"),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;await writeFile(folder+"/"+output,code);};
try{
 await compile("lib/model.ts","model.mjs");await compile("lib/business.ts","business.mjs");await compile("lib/checklist.ts","checklist.mjs");
 const helpers=await import(pathToFileURL(folder+"/business.mjs")),model=await import(pathToFileURL(folder+"/model.mjs"));
 assert.equal(helpers.currencyCents("1.200,50"),120050);assert.equal(helpers.currencyCents("50.25"),5025);assert.equal(helpers.currencyCents("0,00"),0);assert.ok(Number.isNaN(helpers.currencyCents("12,345")));assert.ok(Number.isNaN(helpers.currencyCents("-50")));
 assert.equal(helpers.periodDeadline("2028-03-31","1"),"2028-02-29");assert.equal(helpers.periodDeadline("2028-07-08","12"),"2027-07-08");
 assert.equal(helpers.whatsappUrl("(81) 99999-0000"),"https://wa.me/5581999990000");assert.equal(helpers.whatsappUrl("+351 961 000 000"),"https://wa.me/351961000000");assert.equal(helpers.whatsappUrl("123"),"");
 assert.equal(helpers.contractUrlAllowed("javascript:alert(1)"),false);assert.equal(helpers.contractUrlAllowed("https://user:secret@example.test/contrato.pdf"),false);
 const record=(id,collection,values)=>({id,collection,revision:0,...values});
 const items=[record("wedding-plan","weddingPlan",{budgetCents:1000000}),record("cost-1","weddingCosts",{title:"Buffet de teste",category:"Alimentos",estimatedCents:400000,realCents:350000,paymentStatus:"partial",nextDate:"2027-08-10",note:""}),record("cost-2","weddingCosts",{title:"Decoração de teste",category:"Decoração",estimatedCents:250000,realCents:null,paymentStatus:"unpaid",nextDate:"",note:""}),record("supplier-1","suppliers",{title:"Fornecedor de teste",service:"Fotografia",phone:"(81) 99999-0000",email:"contato@example.test",contractUrl:"/api/contracts/test-pdf",contractName:"contrato.pdf",note:"Inclui lanche para a equipe."}),...helpers.taskStages.map((stage,index)=>record("task-"+index,"weddingTasks",{title:"Tarefa "+index,status:stage.id,period:"12",date:"2027-07-08",note:"Nota da tarefa."})),...helpers.rsvpStages.map((stage,index)=>record("guest-"+index,"guests",{title:"Convidado "+index,group:"Família de teste",isSponsor:index===1,rsvp:stage.id,restriction:index===1?"Alergia a amendoim":""}))];
 assert.deepEqual(helpers.weddingTotals(items,1000000),{budget:1000000,estimated:650000,contracted:350000,remaining:650000});assert.equal(helpers.weddingTotals(items,100000).remaining,-250000);
 assert.deepEqual(helpers.guestTotals(items),{total:3,confirmed:1,declined:1,pending:1});
 const checklist=await import(pathToFileURL(folder+"/checklist.mjs"));items.push(...checklist.WEDDING_CHECKLIST);
 const initialChecklist=checklist.checklistTotals(items);assert.ok(initialChecklist.total>60);assert.equal(initialChecklist.percent,0);assert.ok(initialChecklist.excluded>0);const sample=checklist.WEDDING_CHECKLIST.slice(0,3).map((item,index)=>({...item,status:index===0?"done":index===1?"doing":"not-needed"}));assert.deepEqual(checklist.checklistTotals(sample),{all:3,total:2,done:1,doing:1,pending:0,excluded:1,percent:50});assert.equal(checklist.checklistTotals(sample.map(item=>({...item,status:"not-needed"}))).percent,0);
 assert.equal(checklist.checklistTotals(Array.from({length:300},(_,index)=>({...sample[0],id:"item-"+index,status:index===299?"todo":"done"}))).percent,99);
 const state={settings:{...model.DEFAULT_SETTINGS,weddingDate:"2028-07-08"},items};
 await writeFile(folder+"/music.mjs","export function MusicButton(){return null;}\n");
 await writeFile(folder+"/transport.mjs","export async function appFetch(){throw new Error('Server rendering must not call the API.')}\n");
 let checklistComponent=ts.transpileModule(await readFile(root+"components/wedding-checklist.tsx","utf8"),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;checklistComponent=checklistComponent.replace('"../lib/model"','"./model.mjs"').replace('"../lib/checklist"','"./checklist.mjs"').replace('import "../app/checklist.css";',"");await writeFile(folder+"/wedding-checklist.mjs",checklistComponent);
 let component=ts.transpileModule(await readFile(root+"app/business.tsx","utf8"),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 component=component.replace('"../components/wedding-checklist"','"./wedding-checklist.mjs"').replace('"../components/music"','"./music.mjs"').replace('"../transport"','"./transport.mjs"').replace('"../lib/model"','"./model.mjs"').replace('"../lib/business"','"./business.mjs"').replace('import "./business.css";',"");
 await writeFile(folder+"/component.mjs",component);const Business=(await import(pathToFileURL(folder+"/component.mjs"))).default;
 for(const section of ["checklist","cronograma","financeiro","fornecedores","convidados"]){const html=renderToStaticMarkup(React.createElement(Business,{section,initialState:state,onStateChange:()=>{}}));assert.ok(html.includes('class="business-shell"'));assert.ok(html.includes('href="#inicio"'));assert.ok(html.includes('href="#gestao/'+section+'"'));if(section==="checklist"){assert.ok(html.includes("Escolher o vestido de noiva"));assert.ok(html.includes("Não vamos precisar"));assert.ok(html.includes('aria-valuenow="0"'));assert.ok(html.includes("Adicionar item"));}if(section==="cronograma")for(const stage of helpers.taskStages)assert.ok(html.includes(stage.label));if(section==="financeiro"){assert.ok(html.includes(model.money(650000)));assert.ok(html.includes("Não fechado"));assert.ok(html.includes("Próxima Parcela"));}if(section==="fornecedores"){assert.ok(html.includes("https://wa.me/5581999990000"));assert.ok(html.includes("mailto:contato@example.test"));assert.ok(html.includes("Baixar PDF"));}if(section==="convidados"){assert.ok(html.includes("Alergia a amendoim"));assert.ok(html.includes('checked=""'));assert.ok(html.includes("Confirmados (Sim)"));}}
 console.log("PASS exact budget/RSVP totals, currency parsing, month-end deadlines, safe contact/contract links, and server rendering of five management tabs, curated checklist defaults and progress excluding dispensed items.");
}finally{await rm(folder,{recursive:true,force:true});}
