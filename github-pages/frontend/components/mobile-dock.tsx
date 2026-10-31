import {Crown,Wallet,Images,ClipboardCheck} from "lucide-react";

export default function MobileDock({active}:{active:string}){
 const links=[{id:"home",label:"Início",href:"#inicio",Icon:Crown},{id:"money",label:"Caixa",href:"#money",Icon:Wallet},{id:"album",label:"Álbum",href:"#album",Icon:Images},{id:"business",label:"Gestão",href:"#gestao/checklist",Icon:ClipboardCheck}];
 return <nav className="mobile-dock" aria-label="Atalhos do nosso espaço">{links.map(({id,label,href,Icon})=><a key={id} href={href} className={active===id?"active":""} aria-current={active===id?"page":undefined}><span><Icon size={20} strokeWidth={1.6}/></span><small>{label}</small></a>)}</nav>;
}
