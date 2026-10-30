import {balance,today,validDate,type State} from "./model";
export function overview(state:State,date=today()){
 const month=date.slice(0,7),transactions=state.items.filter(item=>item.collection==="transactions"&&String(item.date).startsWith(month));
 const incoming=transactions.filter(item=>item.type==="income").reduce((sum,item)=>sum+Number(item.amountCents),0);
 const outgoing=transactions.filter(item=>item.type==="expense").reduce((sum,item)=>sum+Number(item.amountCents),0);
 const tasks=state.items.filter(item=>["tasks","weddingTasks"].includes(item.collection)&&!["done","cancelled","canceled"].includes(String(item.status)));
 const due=tasks.filter(item=>validDate(item.date,true)).map(item=>({id:item.id,title:String(item.title),date:String(item.date),kind:"Tarefa",href:item.collection==="tasks"?"#tasks":"#gestao/cronograma"}));
 for(const item of state.items.filter(item=>item.collection==="weddingCosts"&&item.paymentStatus!=="paid"&&validDate(item.nextDate,true)))due.push({id:item.id,title:String(item.title),date:String(item.nextDate),kind:"Vencimento",href:"#gestao/financeiro"});
 due.sort((a,b)=>a.date.localeCompare(b.date)||a.title.localeCompare(b.title,"pt-BR"));
 return {total:balance(state),incoming,outgoing,net:incoming-outgoing,openTasks:tasks.length,memories:state.items.filter(item=>item.collection==="memories").length,confirmed:state.items.filter(item=>item.collection==="guests"&&item.rsvp==="confirmed").length,guests:state.items.filter(item=>item.collection==="guests").length,due:due.map(item=>({...item,overdue:item.date<date})),overdue:due.filter(item=>item.date<date).length};
}
