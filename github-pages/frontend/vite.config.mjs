import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";
import {resolve} from "node:path";
export default defineConfig({root:resolve("."),base:"/ws-132-pages/",plugins:[react()],resolve:{alias:{"@":resolve(".")}},build:{outDir:"dist",emptyOutDir:true}});
