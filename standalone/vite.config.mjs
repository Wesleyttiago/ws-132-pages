import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
export default defineConfig({
  root: resolve("standalone"),
  publicDir: resolve("public"),
  plugins: [react()],
  resolve: { alias: { "@": resolve(".") } },
  build: { outDir: resolve("standalone-dist/web"), emptyOutDir: true, target: "es2022" },
});
