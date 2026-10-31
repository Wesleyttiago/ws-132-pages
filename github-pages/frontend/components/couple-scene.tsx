import {useEffect,useRef,useState,type CSSProperties} from "react";
import {Heart,Pause,Play,Sparkles} from "lucide-react";
import {PrivateImage} from "../transport";

const bursts=[[-68,-68,-24],[-43,-102,18],[-8,-123,-8],[28,-111,18],[65,-77,-20],[84,-35,22],[-82,-29,-14]];
export default function CoupleScene({person1="Wesley",person2="Suelaine",variant="room"}:{person1?:string;person2?:string;variant?:"room"|"settings"}){
 const [paused,setPaused]=useState(false),[reaction,setReaction]=useState(0),[celebrating,setCelebrating]=useState(false),[loaded,setLoaded]=useState({wesley:false,suelaine:false});
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
 function celebrate(){if(timer.current)clearTimeout(timer.current);setReaction(value=>value+1);setCelebrating(true);timer.current=setTimeout(()=>setCelebrating(false),1500);}
 const ready=loaded.wesley&&loaded.suelaine;
 return <section className={"couple-scene couple-scene-"+variant+(celebrating?" celebrating":"")} data-motion={paused?"paused":"active"} aria-label="Os nossos avatares de corpo inteiro">
  <div className="couple-canvas" aria-busy={!ready}><div className="couple-arch" aria-hidden="true"><span>W<span>&</span>S</span></div><div className="couple-floor" aria-hidden="true"/>
   <Heart className="couple-ambient-heart ambient-one" size={18} aria-hidden="true"/><Heart className="couple-ambient-heart ambient-two" size={13} fill="currentColor" aria-hidden="true"/><Sparkles className="couple-sparkle" size={19} strokeWidth={1.2} aria-hidden="true"/>
   {([{id:"wesley",name:person1},{id:"suelaine",name:person2}] as const).map(person=><button key={person.id} type="button" className={"body-avatar figure-"+person.id+(loaded[person.id]?" is-loaded":"")} onClick={celebrate} aria-label={"Celebrar nosso 132 com "+person.name} title="Toque para um carinho"><span className="body-avatar-shadow" aria-hidden="true"/><span className="body-avatar-illustration"><PrivateImage src={"/characters/"+person.id+"-full.webp"} width={720} height={1080} alt={"Avatar de corpo inteiro de "+person.name} fetchPriority={variant==="room"?"high":undefined} onLoad={()=>setLoaded(current=>({...current,[person.id]:true}))}/></span><span className="body-avatar-name">{person.name}</span></button>)}
   <span className="couple-together" aria-hidden="true"><Heart size={12} fill="currentColor"/>132<Heart size={12} fill="currentColor"/></span>
   {celebrating&&<span className="couple-reaction" key={reaction} aria-hidden="true"><span className="reaction-code">132</span>{bursts.map(([x,y,rotation],index)=><Heart className="reaction-heart" key={index} fill="currentColor" style={{"--heart-x":x+"px","--heart-y":y+"px","--heart-rotation":rotation+"deg","--heart-delay":index*35+"ms"} as CSSProperties}/>)}</span>}

  </div>
  <div className="couple-scene-actions"><button type="button" className="couple-love-button" onClick={celebrate}><Heart size={14} fill={celebrating?"currentColor":"none"}/><span>{celebrating?"Eu te amo. 🤍💜":"O nosso 132"}</span></button><button type="button" className="couple-motion-toggle" onClick={()=>setPaused(value=>!value)} aria-pressed={paused} aria-label={paused?"Ativar movimentos dos avatares":"Pausar movimentos dos avatares"} title={paused?"Ativar movimentos":"Pausar movimentos"}>{paused?<Play size={12}/>:<Pause size={12}/>}<span>Movimento</span></button></div>
  <span className="visually-hidden" role="status">{celebrating?"132 · Nosso jeito de dizer eu te amo.":""}</span>
 </section>;
}
