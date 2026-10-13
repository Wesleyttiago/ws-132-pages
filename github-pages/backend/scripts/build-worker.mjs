import ts from "typescript";
import {readFile,writeFile,mkdir,cp} from "node:fs/promises";
const root=new URL("../core",import.meta.url).pathname;
let source="let env;\n";
for(const name of ["model","validation","store"]){
 let text=await readFile(root+"/lib/"+name+".ts","utf8");
 if(name==="model")text=text.replace('import photos from "./initial-photos.json";',"const photos="+await readFile(root+"/lib/initial-photos.json","utf8")+";");
 text=text.replace(/^import .*from .*;\s*$/gm,"");
 source+=ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText.replace(/\bexport\s+(?=(?:const|let|class|function|async))/g,"")+"\n";
}
let api=await readFile(root+"/app/api/[...path]/route.ts","utf8");api=api.replace(/^import .*;\s*$/gm,"");
source+=ts.transpileModule(api,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText.replace(/\bexport\s+(?=(?:const|let|class|function|async))/g,"");
source+="\nconst initialAssets="+await readFile("worker/assets.json","utf8")+";\n"+await readFile("worker/gateway.js","utf8");
await writeFile("worker/index.js",source);
await mkdir("dist/server",{recursive:true});await mkdir("dist/.openai",{recursive:true});
await writeFile("dist/server/index.js",source);await cp(".openai/hosting.json","dist/.openai/hosting.json");await cp("drizzle","dist/drizzle",{recursive:true});
console.log("Protected Worker built: "+Buffer.byteLength(source)+" bytes");
