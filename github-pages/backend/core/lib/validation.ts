import { collections, validDate, musicUrl, type Item, type Settings } from "./model";
import { taskStages, taskPeriods, paymentStages, rsvpStages, contractUrlAllowed } from "./business";
import { pinterestPinUrl, pinterestBoardUrl, inspirationCategories } from "./pinterest";
export class InputError extends Error { constructor(message: string, public status = 400) { super(message); } }
function str(v: unknown, label: string, max: number, required = false): string { if (typeof v !== "string" || v.length > max || (required && !v.trim())) throw new InputError("Confira o campo " + label + "."); return v.trim(); }
function cents(v: unknown, label: string, positive = false): number { if (typeof v !== "number" || !Number.isSafeInteger(v) || v < (positive ? 1 : 0) || v > 10000000000) throw new InputError("Informe um valor válido em " + label + "."); return v; }
export function cleanSettings(v: Record<string, unknown>): Settings {
  if (!validDate(v.weddingDate, true)) throw new InputError("Confira a data do casamento.");
  return { title: str(v.title, "nome do espaço", 70, true), person1: str(v.person1, "primeiro nome", 45, true), person2: str(v.person2, "segundo nome", 45, true), weddingDate: String(v.weddingDate), openingCents: cents(v.openingCents, "saldo inicial"), targetCents: cents(v.targetCents, "meta", true), monthlyCents: cents(v.monthlyCents, "contribuição mensal"), entryAutoplay: v.entryAutoplay === true, entrySongId: str(v.entrySongId ?? "mirrors", "música da entrada", 100), albumAutoplay: v.albumAutoplay === true, albumSongId: str(v.albumSongId ?? "", "música do álbum", 100), revision: 0 };
}
export function cleanItem(v: Record<string, unknown>): Item {
  if (!collections.includes(v.collection as never)) throw new InputError("Seção inválida.");
  const i: Item = { id: str(v.id, "identificador", 100, true), collection: v.collection as Item["collection"], revision: Number(v.revision ?? 0) };
  if (!/^[a-zA-Z0-9-]+$/.test(i.id) || !Number.isSafeInteger(i.revision) || i.revision < 0) throw new InputError("Registro inválido.");
  const note = str(v.note ?? "", "observação", 1000);
  if (i.collection !== "songs" && !validDate(v.date ?? "", i.collection === "transactions")) throw new InputError("Confira a data.");
  if (i.collection === "inspirationBoards") {
    const url=pinterestBoardUrl(v.url);if(!url)throw new InputError("Use o link completo de uma pasta pública do Pinterest.");
    if(!inspirationCategories.some(category=>category.id===v.category))throw new InputError("Escolha o tema desta pasta.");
    Object.assign(i,{title:str(v.title,"nome da pasta",100,true),url,category:v.category,note});
  } else if (i.collection === "weddingPlan") {
    if (i.id !== "wedding-plan") throw new InputError("Planejamento inválido.");
    Object.assign(i, {budgetCents:cents(v.budgetCents,"orçamento total"),note});
  } else if (i.collection === "weddingTasks") {
    if (!taskStages.some(stage=>stage.id===v.status) || !taskPeriods.some(period=>period.id===v.period)) throw new InputError("Escolha a etapa e o prazo da tarefa.");
    if (!validDate(v.date,true)) throw new InputError("Informe uma data de entrega válida.");
    Object.assign(i,{title:str(v.title,"tarefa",180,true),date:v.date,status:v.status,period:v.period,note});
  } else if (i.collection === "weddingCosts") {
    if (!paymentStages.some(stage=>stage.id===v.paymentStatus)) throw new InputError("Escolha o status de pagamento.");
    if (!validDate(v.nextDate??"")) throw new InputError("Confira o vencimento da próxima parcela.");
    const realCents=v.realCents===null||v.realCents===undefined?null:cents(v.realCents,"valor fechado");
    if(v.paymentStatus!=="unpaid"&&realCents===null)throw new InputError("Informe o valor fechado antes de registrar o pagamento.");
    Object.assign(i,{title:str(v.title,"item ou serviço",160,true),category:str(v.category,"categoria",60,true),estimatedCents:cents(v.estimatedCents,"valor estimado"),realCents,paymentStatus:v.paymentStatus,nextDate:v.paymentStatus==="paid"?"":v.nextDate??"",note});
  } else if (i.collection === "suppliers") {
    const phone=str(v.phone??"","telefone",40),email=str(v.email??"","e-mail",254),contractUrl=str(v.contractUrl??"","contrato",600);
    if(phone&&(!/^[+\d\s().-]+$/.test(phone)||phone.replace(/\D/g,"").length<10||phone.replace(/\D/g,"").length>15))throw new InputError("Informe o telefone com DDD, ou com código do país.");
    if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new InputError("Confira o e-mail do fornecedor.");
    if(!contractUrlAllowed(contractUrl))throw new InputError("Use um link HTTPS para o contrato.");
    Object.assign(i,{title:str(v.title,"empresa ou profissional",160,true),service:str(v.service,"serviço prestado",160,true),phone,email,contractUrl,contractName:str(v.contractName??"","arquivo do contrato",180),note});
  } else if (i.collection === "guests") {
    if(!rsvpStages.some(stage=>stage.id===v.rsvp))throw new InputError("Escolha o status da confirmação.");
    Object.assign(i,{title:str(v.title,"nome completo",160,true),group:str(v.group??"","grupo ou família",100),isSponsor:v.isSponsor===true,rsvp:v.rsvp,restriction:str(v.restriction??"","restrição alimentar",1000)});
  } else if (i.collection === "albums") {
    const parentId = str(v.parentId ?? "", "álbum principal", 100);
    Object.assign(i, { title: str(v.title, "nome do álbum", 100, true), parentId, note });
  } else if (i.collection === "transactions") {
    if (!["income", "expense"].includes(String(v.type))) throw new InputError("Escolha entrada ou saída.");
    Object.assign(i, { title: str(v.title, "descrição", 160, true), type: v.type, amountCents: cents(v.amountCents, "valor", true), date: v.date, person: str(v.person ?? "Nós", "responsável", 45, true), goalId: str(v.goalId ?? "", "destino", 100), note });
  } else if (i.collection === "goals") Object.assign(i, { title: str(v.title, "meta", 100, true), targetCents: cents(v.targetCents, "meta", true), category: str(v.category ?? "Apartamento", "categoria", 40), date: v.date ?? "", note });
  else if (i.collection === "tasks") {
    if (!["todo", "doing", "done"].includes(String(v.status))) throw new InputError("Escolha uma etapa.");
    Object.assign(i, { title: str(v.title, "tarefa", 180, true), date: v.date ?? "", status: v.status, person: str(v.person ?? "Nós", "responsável", 45, true), category: str(v.category ?? "Apartamento", "categoria", 40), note });
  } else if (i.collection === "memories") {
    const raw = str(v.url, "foto ou referência", 600, true),pin=pinterestPinUrl(raw),url=pin??raw;
    if (!pin&&!/^\/(?:photos\/[a-f0-9]+\.(?:jpg|webp)|api\/media\/[a-zA-Z0-9-]+)$/.test(url)) throw new InputError("Use uma foto enviada ou um link completo de Pin do Pinterest.");
    Object.assign(i, { albumId: str(v.albumId ?? "album-love", "álbum", 100, true), url, sourceType:pin?"pinterest":"photo", caption: str(v.caption ?? "", "legenda", 1000), date: v.date ?? "", favorite: v.favorite === true, width: pin?0:Number(v.width ?? 0), height: pin?0:Number(v.height ?? 0) });
  } else {
    if (!musicUrl(v.url)) throw new InputError("Use um link de música ou playlist do YouTube ou Spotify.");
    Object.assign(i, { title: str(v.title, "música", 140, true), artist: str(v.artist ?? "", "artista", 100), url: v.url, note });
  }
  return i;
}
export function assertRequest(r: Request) {
  const id = r.headers.get("oai-authenticated-user-id"), email = r.headers.get("oai-authenticated-user-email");
  if (!id || !email) throw new InputError("Entre na sua conta para abrir nosso espaço.", 401);
  if (r.method !== "GET" && r.method !== "HEAD" && (r.headers.get("x-nosso-reino") !== "1" || r.headers.get("sec-fetch-site") === "cross-site")) throw new InputError("Origem da solicitação não confirmada.", 403);
  return { id, email };
}

export function validatePlacement(items: Item[], item: Item) {
  if (item.collection === "albums" && item.parentId) {
    const parent = items.find(a => a.id === item.parentId && a.collection === "albums");
    if (!parent || parent.parentId || parent.id === item.id) throw new InputError("Escolha um álbum principal válido.");
  }
  if (item.collection === "memories" && !items.some(a => a.id === item.albumId && a.collection === "albums")) throw new InputError("Escolha um álbum válido para essa foto.");
  if(item.collection==="memories"&&pinterestPinUrl(item.url)&&items.some(existing=>existing.collection==="memories"&&existing.id!==item.id&&existing.albumId===item.albumId&&pinterestPinUrl(existing.url)===item.url))throw new InputError("Esta referência já está guardada neste álbum. Escolha outro destino ou edite a legenda existente.",409);
}
