import React,{useEffect,useState,type FormEvent} from "react";
import {createRoot} from "react-dom/client";
import {Crown,Heart,LockKeyhole,ArrowRight} from "lucide-react";
import Reino from "./app/reino";
import Business from "./app/business";
import type {BusinessTab} from "./lib/business";
import {appFetch,setToken} from "./transport";
import type {State} from "./lib/model";
import "./app/globals.css";
import "./login.css";
function Application(){
 const [state,setState]=useState<State|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 const [route,setRoute]=useState(window.location.hash);
 useEffect(()=>{const change=()=>{setRoute(window.location.hash);if(window.location.hash.startsWith("#gestao")||window.location.hash==="#inicio")window.scrollTo({top:0,behavior:"instant"});};window.addEventListener("hashchange",change);return()=>window.removeEventListener("hashchange",change);},[]);
 async function enter(){try{const r=await appFetch("/api/state");if(r.ok)setState(await r.json());}catch{}finally{setLoading(false);}}
 useEffect(()=>{enter();const reset=()=>{setState(null);setLoading(false)};window.addEventListener("ws132-expired",reset);return()=>window.removeEventListener("ws132-expired",reset);},[]);
 async function login(event:FormEvent<HTMLFormElement>){event.preventDefault();if(busy)return;setBusy(true);setError("");const form=new FormData(event.currentTarget);
 try{const r=await appFetch("/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({user:form.get("user"),password:form.get("password")})});const result=await r.json();if(!r.ok)throw new Error(result.error??"Não foi possível entrar.");setToken(result.token);const data=await appFetch("/api/state");if(!data.ok)throw new Error("Não foi possível abrir nossos registros. Tente novamente.");setState(await data.json());}
 catch(e){setError(e instanceof Error?e.message:"Não foi possível conectar agora.");}finally{setBusy(false);}}
 if(state&&route.startsWith("#gestao")){const name=route.split("/")[1];const section:BusinessTab=["cronograma","financeiro","fornecedores","convidados"].includes(name)?name as BusinessTab:"cronograma";return <Business initialState={state} onStateChange={setState} section={section}/>;}
 if(state)return <Reino displayName="Wesley & Suelaine" initialState={state}/>;
 return <main className="ws-login"><section className="ws-login-story"><div className="ws-monogram"><Crown strokeWidth={1}/><span>W<span className="amp">&</span>S</span><small>1 3 2</small></div><div className="ws-orbit orbit-one"/><div className="ws-orbit orbit-two"/><div className="ws-petal petal-one"/><div className="ws-petal petal-two"/><p className="ws-eyebrow">UM AMOR. UM CAMINHO. UM FUTURO.</p><h1>Nosso amanhã<br/>começa <em>aqui.</em></h1><p className="ws-story-note">Um cantinho para cuidar dos nossos sonhos<br/>e guardar tudo o que estamos construindo juntos.</p><div className="ws-love-code"><Heart fill="currentColor" size={15}/><span>132 · nosso jeito de dizer eu te amo</span><Heart fill="currentColor" size={15}/></div></section><section className="ws-login-form"><header><span className="ws-small-mark">W&S 132</span><span className="ws-private"><LockKeyhole size={13}/> ESPAÇO PARTICULAR</span></header><div className="ws-form-content"><p className="ws-eyebrow">BEM-VINDO AO NOSSO CANTINHO</p><h2>É bom ter<br/><em>você por aqui.</em></h2><p className="ws-form-note">Nossos planos, conquistas e lembranças.<br/>Só para nós dois. 🤍💜</p><form onSubmit={login}><label htmlFor="user">Nosso login</label><input id="user" name="user" placeholder="Seu login" autoComplete="username" required disabled={busy||loading}/><label htmlFor="password">Nossa chave de entrada</label><input id="password" name="password" placeholder="Sua senha" type="password" autoComplete="current-password" required disabled={busy||loading}/>{error&&<p className="ws-error" role="alert">{error}</p>}<button className="ws-enter" type="submit" disabled={busy||loading}>{loading?"Preparando nosso espaço…":busy?"Entrando…":"Entrar no nosso cantinho"}<ArrowRight size={19}/></button></form><div className="ws-lock-note"><LockKeyhole size={15}/><span>Fotos e registros são carregados somente após o login.</span></div></div><footer>Wesley & Suelaine <span>·</span> Deus à frente, nós lado a lado.</footer></section></main>;
}
createRoot(document.getElementById("root")!).render(<Application/>);
