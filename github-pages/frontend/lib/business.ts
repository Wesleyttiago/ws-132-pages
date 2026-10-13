import type {Item} from "./model";

export const taskStages = [{id:"todo",label:"A Fazer"},{id:"doing",label:"Em Andamento"},{id:"done",label:"Concluído"},{id:"cancelled",label:"Cancelado"}] as const;
export const taskPeriods = [{id:"12",label:"Faltam 12 meses"},{id:"6",label:"Faltam 6 meses"},{id:"3",label:"Faltam 3 meses"},{id:"1",label:"Último Mês"}] as const;
export const paymentStages = [{id:"unpaid",label:"Não Pago"},{id:"partial",label:"Parcelado"},{id:"paid",label:"Pago Integral"}] as const;
export const rsvpStages = [{id:"pending",label:"Pendente"},{id:"confirmed",label:"Confirmado"},{id:"declined",label:"Não Vai"}] as const;
export type BusinessTab = "cronograma" | "financeiro" | "fornecedores" | "convidados";
export type WeddingTask = Item & {title:string;date:string;note:string;status:string;period:string};
export type WeddingCost = Item & {title:string;category:string;estimatedCents:number;realCents:number|null;paymentStatus:string;nextDate:string;note:string};
export type Supplier = Item & {title:string;service:string;phone:string;email:string;contractUrl:string;contractName:string;note:string};
export type Guest = Item & {title:string;group:string;isSponsor:boolean;rsvp:string;restriction:string};
export function weddingTotals(items:Item[],budgetCents:number){
 const costs=items.filter(i=>i.collection==="weddingCosts");
 const estimated=costs.reduce((sum,i)=>sum+Number(i.estimatedCents??0),0);
 const contracted=costs.reduce((sum,i)=>sum+(i.realCents===null?0:Number(i.realCents??0)),0);
 return {budget:budgetCents,estimated,contracted,remaining:budgetCents-contracted};
}
export function guestTotals(items:Item[]){
 const guests=items.filter(i=>i.collection==="guests");
 return {total:guests.length,confirmed:guests.filter(i=>i.rsvp==="confirmed").length,declined:guests.filter(i=>i.rsvp==="declined").length,pending:guests.filter(i=>i.rsvp==="pending").length};
}
export function currencyCents(value:string){
 const text=value.trim().replace(/^R\$\s*/,"");
 let normalized="";
 if(/^\d+(?:\.\d{3})*(?:,\d{1,2})?$/.test(text))normalized=text.replace(/\./g,"").replace(",",".");
 else if(/^\d+\.\d{1,2}$/.test(text))normalized=text;
 const n=normalized?Number(normalized):NaN;
 return Number.isFinite(n)&&Number.isSafeInteger(Math.round(n*100))&&n>=0?Math.round(n*100):NaN;
}
export function periodDeadline(weddingDate:string,period:string){
 const [year,month,day]=weddingDate.split("-").map(Number),months=Number(period);
 if(!year||!month||!day||![1,3,6,12].includes(months))return "";
 const first=new Date(Date.UTC(year,month-1-months,1));
 const lastDay=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0)).getUTCDate();
 first.setUTCDate(Math.min(day,lastDay));return first.toISOString().slice(0,10);
}
export function whatsappUrl(phone:string){
 let digits=phone.replace(/\D/g,"");
 if(!phone.trim().startsWith("+")&&(digits.length===10||digits.length===11))digits="55"+digits;
 return digits.length>=10&&digits.length<=15?"https://wa.me/"+digits:"";
}
export function contractUrlAllowed(value:string){
 if(!value)return true;
 if(/^\/api\/contracts\/[a-zA-Z0-9-]+$/.test(value))return true;
 try{const url=new URL(value);return url.protocol==="https:"&&!url.username&&!url.password&&!!url.hostname;}catch{return false;}
}
