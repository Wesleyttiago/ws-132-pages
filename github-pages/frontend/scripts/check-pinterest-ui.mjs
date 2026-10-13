import assert from "node:assert/strict";
import {readFile,writeFile,mkdtemp,rm} from "node:fs/promises";
import {pathToFileURL} from "node:url";
import ts from "typescript";
import React from "react";
import {renderToStaticMarkup} from "react-dom/server";

const root=new URL("../",import.meta.url).pathname;
const folder=await mkdtemp(root+".pinterest-check-");
async function compile(input,output,replacements=[]){
 let code=ts.transpileModule(await readFile(root+input,"utf8"),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 for(const [from,to] of replacements)code=code.replace(from,to);
 await writeFile(folder+"/"+output,code);
}
try{
 await compile("lib/model.ts","model.mjs");
 await compile("lib/pinterest.ts","pinterest.mjs");
 await compile("components/pinterest.tsx","embed.mjs",[['"../lib/pinterest"','"./pinterest.mjs"'],['import.meta.env.BASE_URL','"/ws-132-pages/"']]);
 await compile("app/inspirations.tsx","page.mjs",[['"../lib/pinterest"','"./pinterest.mjs"'],['"../lib/model"','"./model.mjs"'],['"../components/pinterest"','"./embed.mjs"'],['import "./inspirations.css";',""]]);
 const helpers=await import(pathToFileURL(folder+"/pinterest.mjs"));
 const model=await import(pathToFileURL(folder+"/model.mjs"));
 const {PinterestEmbed}=await import(pathToFileURL(folder+"/embed.mjs"));
 const {default:Inspirations}=await import(pathToFileURL(folder+"/page.mjs"));
 assert.equal(helpers.pinterestPinUrl("https://br.pinterest.com/pin/ideia--123456789/?utm_source=teste"),"https://www.pinterest.com/pin/123456789/");
 assert.equal(helpers.pinterestBoardUrl("https://br.pinterest.com/nosso-perfil/nossa-sala/?utm_source=teste"),"https://www.pinterest.com/nosso-perfil/nossa-sala/");
 for(const bad of ["javascript:alert(1)","https://pinterest.com.fake.test/pin/123456789/","https://fake.test/pin/123456789/","https://secret:password@www.pinterest.com/pin/123456789/","https://pin.it/example","https://www.pinterest.com/search/pins/?q=teste"]){assert.equal(helpers.pinterestPinUrl(bad),null);assert.equal(helpers.pinterestBoardUrl(bad),null);}
 for(const idea of helpers.recommendedIdeas){assert.equal(helpers.pinterestPinUrl(idea.url),idea.url);assert.ok(model.INITIAL_ALBUMS.some(album=>album.id===idea.albumId));}
 for(const kind of ["pin","board"]){
  const url=kind==="pin"?helpers.recommendedIdeas[0].url:"https://www.pinterest.com/nosso-perfil/nossa-sala/";
  const html=renderToStaticMarkup(React.createElement(PinterestEmbed,{url,kind}));
  assert.ok(html.includes('/ws-132-pages/pinterest-embed.html#'));
  assert.ok(html.includes('sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"'));
  assert.ok(!html.includes("allow-same-origin"));
  assert.ok(html.includes('referrerPolicy="no-referrer"'));
  assert.ok(html.includes("Ver origem no Pinterest"));
  assert.ok(html.includes('rel="noopener noreferrer"'));
 }
 assert.equal(renderToStaticMarkup(React.createElement(PinterestEmbed,{url:"javascript:alert(1)"})),"");
 const state={settings:{...model.DEFAULT_SETTINGS},items:[...model.INITIAL_ALBUMS,{id:"saved-test",collection:"memories",revision:0,albumId:"apartment-0",url:helpers.recommendedIdeas[0].url,caption:"Nossa sala",date:"2026-10-13",favorite:false},{id:"board-test",collection:"inspirationBoards",revision:0,title:"Pasta de teste",url:"https://www.pinterest.com/nosso-perfil/nossa-sala/",category:"apartment",note:""}]};
 const html=renderToStaticMarkup(React.createElement(Inspirations,{state,loaded:true,busy:false,save:()=>{throw new Error("Rendering must not save data.");},openAlbum:()=>{}}));
 for(const text of ["Nossas inspirações.","Apartamento e casa","Casamento","Decoração geral","Adicionar um Pin","Salvar no álbum","Guardadas (1)","Adicionar pasta","Pasta de teste","Guardar um Pin desta pasta","Explorar no Pinterest"]){assert.ok(html.includes(text),text);}
 assert.equal((html.match(/<iframe /g)||[]).length,helpers.recommendedIdeas.length+1);
 const embedPage=await readFile(root+"public/pinterest-embed.html","utf8"),embedScript=await readFile(root+"public/pinterest-embed.js","utf8");
 assert.ok(embedPage.includes("Content-Security-Policy"));
 assert.ok(embedScript.includes("https://assets.pinterest.com/js/pinit.js"));
 assert.ok(!embedScript.includes("sessionStorage")&&!embedScript.includes("localStorage"));
 console.log("PASS valid Pinterest destinations, URL normalization, isolated previews, source attribution, and rendering of the inspiration tab with shared board bookmarks.");
}finally{await rm(folder,{recursive:true,force:true});}
