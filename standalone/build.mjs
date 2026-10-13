import { build } from "vite";
import ts from "typescript";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
await build({ configFile: resolve("standalone/vite.config.mjs") });
const out=resolve("standalone-dist/server");
await mkdir(out,{recursive:true});
for(const name of ["model","validation","store"]){
  let source=await readFile(resolve("lib",name+".ts"),"utf8");
  if(name==="model")source=source.replace('import photos from "./initial-photos.json";',"const photos = "+await readFile("lib/initial-photos.json","utf8")+";");
  source=source.replace(/from "\.\/(model|validation)"/g,'from "./$1.mjs"');
  await writeFile(resolve(out,name+".mjs"),ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText);
}
let route=await readFile("app/api/[...path]/route.ts","utf8");
route=route.replace('import { env } from "cloudflare:workers";',"const env = globalThis.__reinoEnv;").replace(/from "@\/lib\/(\w+)"/g,'from "./$1.mjs"');
await writeFile(resolve(out,"api.mjs"),ts.transpileModule(route,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText);
await writeFile(resolve(out,"schema.sql"),await readFile("drizzle/0000_productive_juggernaut.sql"));
await writeFile(resolve(out,"runtime.mjs"),await readFile("standalone/runtime.mjs"));
await writeFile(resolve("standalone-dist/package.json"),JSON.stringify({type:"module",private:true,scripts:{start:"node server/runtime.mjs"},engines:{node:">=24"}}));
console.log("Standalone ready: standalone-dist/ (Node 24, no ChatGPT dependency)");
