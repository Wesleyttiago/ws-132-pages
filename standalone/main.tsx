import React from "react";
import { createRoot } from "react-dom/client";
import Reino from "../app/reino";
import "../app/globals.css";
fetch("/auth/me", { cache: "no-store" }).then(async r => {
  if (!r.ok) { window.location.assign("/login"); return; }
  const user = await r.json() as { name: string };
  createRoot(document.getElementById("root")!).render(<Reino displayName={user.name} />);
}).catch(() => { document.getElementById("root")!.textContent = "Não foi possível abrir nosso espaço. Atualize para tentar novamente."; });
