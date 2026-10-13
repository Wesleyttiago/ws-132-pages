import type {Item} from "./model";
export const inspirationCategories=[{id:"apartment",label:"Apartamento e casa"},{id:"wedding",label:"Casamento"},{id:"general",label:"Decoração geral"}] as const;
// Public board links are rendered by Pinterest's official image mural widget.
// These are topic references, not the signed-in account's recommendations.
export const publicInspirationBoards=[
 {id:"public-apartment",title:"Apartamento e interiores",category:"apartment",url:"https://www.pinterest.com/djzepin/decora%C3%A7%C3%A3o-apartamento/"},
 {id:"public-wedding",title:"Casamento em lilás",category:"wedding",url:"https://www.pinterest.com/hadassasilva268/casamento/"},
 {id:"public-decoration",title:"Ideias para a casa",category:"general",url:"https://www.pinterest.com/carinahdra/ideias-para-a-casa/"}
] as const;
function pinterestHost(host:string){return host==="pinterest.com"||host.endsWith(".pinterest.com")||["pinterest.co.uk","www.pinterest.co.uk","pinterest.fr","www.pinterest.fr","pinterest.es","www.pinterest.es","pinterest.de","www.pinterest.de"].includes(host);}
export function pinterestPinUrl(value:unknown){
 if(typeof value!=="string"||value.length>600)return null;
 try{const url=new URL(value.trim());if(url.protocol!=="https:"||!pinterestHost(url.hostname)||url.username||url.password)return null;const match=url.pathname.match(/^\/pin\/(?:[^/]*--)?(\d{5,30})\/?$/);return match?"https://www.pinterest.com/pin/"+match[1]+"/":null;}catch{return null;}
}
export function pinterestBoardUrl(value:unknown){
 if(typeof value!=="string"||value.length>600)return null;
 try{const url=new URL(value.trim());if(url.protocol!=="https:"||!pinterestHost(url.hostname)||url.username||url.password)return null;const paths=url.pathname.split("/").filter(Boolean);if(paths.length!==2||["pin","ideas","search","settings","oauth"].includes(paths[0])||paths.some(part=>!/^[-\w%.]+$/.test(part)))return null;return "https://www.pinterest.com/"+paths.join("/")+"/";}catch{return null;}
}
export function isPinterestReference(item:Item){return item.collection==="memories"&&!!pinterestPinUrl(item.url);}
export function inspirationSearch(query:string){return "https://www.pinterest.com/search/pins/?q="+encodeURIComponent(query);}
export const recommendedIdeas=[
 {id:"lilac-room",title:"Um quarto em branco e lilás",category:"apartment",albumId:"apartment-3",url:"https://www.pinterest.com/pin/408842472442243036/",detail:"Uma referência para combinar suavidade e madeira no quarto."},
 {id:"white-kitchen",title:"Cozinha clara com madeira",category:"apartment",albumId:"apartment-1",url:"https://www.pinterest.com/pin/359443614001976777/",detail:"Uma ideia para o nosso lar, com tons claros e aconchego."},
 {id:"small-kitchen",title:"Ideias para uma cozinha pequena",category:"apartment",albumId:"apartment-1",url:"https://www.pinterest.com/pin/461970874281216128/",detail:"Referência para organizar um ambiente compacto."},
 {id:"lilac-gold",title:"Lilás e dourado no grande dia",category:"wedding",albumId:"wedding-0",url:"https://www.pinterest.com/pin/958492733196927061/",detail:"Uma combinação que conversa com as nossas cores."},
 {id:"white-lilac",title:"Branco e lilás na decoração",category:"wedding",albumId:"wedding-1",url:"https://www.pinterest.com/pin/598204763040742126/",detail:"Uma referência para os detalhes da celebração."},
 {id:"tulips",title:"Tulipas e toques de rosa",category:"wedding",albumId:"wedding-2",url:"https://www.pinterest.com/pin/92112754874626004/",detail:"Flores e cores para inspirar o nosso casamento."},
 {id:"lilac-palette",title:"Toques de lilás pela casa",category:"general",albumId:"apartment-0",url:"https://www.pinterest.com/pin/140806228708334/",detail:"Uma paleta para experimentar em diferentes ambientes."}
] as const;
