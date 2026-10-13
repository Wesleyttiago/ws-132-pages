const photos: Item[] = [];
export const collections = ["transactions", "goals", "tasks", "memories", "songs", "albums"] as const;
export type Collection = (typeof collections)[number];
export type Item = { id: string; collection: Collection; revision: number; [key: string]: unknown };
export type Settings = { title: string; person1: string; person2: string; weddingDate: string; openingCents: number; targetCents: number; monthlyCents: number; entryAutoplay: boolean; entrySongId: string; albumAutoplay: boolean; albumSongId: string; revision: number };
export type State = { settings: Settings; items: Item[]; syncedAt?: string };
export const DEFAULT_SETTINGS: Settings = { title:"W&S 132", person1:"Wesley", person2:"Suelaine", weddingDate:"2100-01-01", openingCents:0,targetCents:1,monthlyCents:0,entryAutoplay:false,entrySongId:"",albumAutoplay:false,albumSongId:"",revision:0 };
export const INITIAL_ALBUMS: Item[] = [
  { id: "album-love", collection: "albums", revision: 0, title: "Nosso amor", parentId: "", note: "132 · Eu te amo 🤍💜" },
  { id: "album-apartment", collection: "albums", revision: 0, title: "Apartamento", parentId: "", note: "O lar que estamos sonhando juntos." },
  { id: "album-wedding", collection: "albums", revision: 0, title: "Decoração de casamento", parentId: "", note: "Os detalhes do nosso grande dia." },
  ...["Sala", "Cozinha", "Banheiro", "Quarto", "Varanda", "Área de serviço"].map((title,index) => ({ id: "apartment-" + index, collection: "albums" as const, revision: 0, title, parentId: "album-apartment", note: "" })),
  ...["Cerimônia", "Mesa e bolo", "Flores e tulipas", "Recepção", "Iluminação", "Convites e lembranças"].map((title,index) => ({ id: "wedding-" + index, collection: "albums" as const, revision: 0, title, parentId: "album-wedding", note: "" })),
];
export const INITIAL_ITEMS: Item[] = [];
export const HERO_PHOTO = "/photos/515b6167c3cecf.webp";
export const DRAWING_PHOTO = "/photos/56c37c696d6b63.webp";
export function money(cents: number) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100); }
export function parseMoney(value: string) { const clean = value.replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", "."); const n = Number(clean); return clean && Number.isFinite(n) ? Math.round(n * 100) : NaN; }
export function balance(s: State) { return s.settings.openingCents + s.items.filter((i) => i.collection === "transactions").reduce((n, i) => n + (i.type === "expense" ? -1 : 1) * Number(i.amountCents), 0); }
export function goalBalance(s: State, id: string) { return s.items.filter((i) => i.collection === "transactions" && i.goalId === id).reduce((n, i) => n + (i.type === "expense" ? -1 : 1) * Number(i.amountCents), 0); }
export function validDate(v: unknown, required = false): v is string { if (v === "" && !required) return true; if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false; const d = new Date(v + "T12:00:00Z"); return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === v; }
export function dateLabel(v: unknown) { return validDate(v) && v ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric", timeZone: "America/Recife" }).format(new Date(String(v) + "T12:00:00-03:00")) : "Sem data"; }
export function today() { return new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Recife" }).format(new Date()); }
export function countdown(date: string, now: number) { const r = Math.max(0, new Date(date + "T00:00:00-03:00").getTime() - now); const s = Math.floor(r / 1000); return { days: Math.floor(s / 86400), hours: Math.floor(s / 3600) % 24, minutes: Math.floor(s / 60) % 60, seconds: s % 60, finished: r === 0 }; }
export function youtubeId(v: string): string | null { try { const u = new URL(v); if (u.protocol !== "https:") return null; let id: string | null = null; if (u.hostname === "youtu.be") id = u.pathname.slice(1).split("/")[0]; else if (["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com"].includes(u.hostname)) id = u.pathname === "/watch" ? u.searchParams.get("v") : u.pathname.match(/^\/(?:shorts|embed)\/([^/]+)/)?.[1] ?? null; return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null; } catch { return null; } }
export function musicUrl(v: unknown) { if (typeof v !== "string" || v.length > 500) return false; if (youtubeId(v)) return true; try { const u = new URL(v); return u.protocol === "https:" && u.hostname === "open.spotify.com" && /^\/(?:intl-[a-z]{2}\/)?(?:track|playlist|album)\/[a-zA-Z0-9]+/.test(u.pathname); } catch { return false; } }
