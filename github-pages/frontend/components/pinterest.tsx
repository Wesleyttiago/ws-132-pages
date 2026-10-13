/// <reference types="vite/client" />
import {useEffect,useRef,useState} from "react";
import {ExternalLink} from "lucide-react";
import {pinterestPinUrl,pinterestBoardUrl} from "../lib/pinterest";
export function PinterestEmbed({url,kind="pin"}:{url:string;kind?:"pin"|"board"}){
 const canonical=kind==="pin"?pinterestPinUrl(url):pinterestBoardUrl(url),ref=useRef<HTMLIFrameElement>(null),[height,setHeight]=useState(kind==="pin"?480:540);
 useEffect(()=>{setHeight(kind==="pin"?480:540);const update=(event:MessageEvent)=>{if(event.source!==ref.current?.contentWindow||event.data?.type!=="ws132-pinterest-height"||typeof event.data.height!=="number"||!Number.isFinite(event.data.height))return;setHeight(Math.max(150,Math.min(10000,Math.ceil(event.data.height))));};window.addEventListener("message",update);return()=>window.removeEventListener("message",update);},[canonical,kind]);
 if(!canonical)return null;
 const source=import.meta.env.BASE_URL+"pinterest-embed.html#"+new URLSearchParams({kind,url:canonical}).toString();
 return <div className="pinterest-embed"><iframe ref={ref} src={source} title={kind==="pin"?"Referência do Pinterest":"Pasta pública do Pinterest"} loading="lazy" sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox" referrerPolicy="no-referrer" style={{height,width:"100%",border:0}}/><a className="pin-origin" href={canonical} target="_blank" rel="noopener noreferrer">Ver origem no Pinterest <ExternalLink size={12}/></a></div>;
}
