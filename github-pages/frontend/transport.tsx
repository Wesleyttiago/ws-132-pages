import {useEffect,useState,type ImgHTMLAttributes} from "react";
export const BACKEND="https://ws132-api.wesleytiago470.chatgpt.site";
let token=sessionStorage.getItem("ws132-access")??"";
export function setToken(value:string){token=value;if(value)sessionStorage.setItem("ws132-access",value);else sessionStorage.removeItem("ws132-access");}
export async function appFetch(path:string,options:RequestInit={}){
 const headers=new Headers(options.headers);if(token)headers.set("Authorization","Bearer "+token);
 const result=await fetch(BACKEND+path,{...options,headers,cache:"no-store",credentials:"omit"});
 if(result.status===401&&path!=="/auth/login"){setToken("");window.dispatchEvent(new Event("ws132-expired"));}
 return result;
}
export function PrivateImage({src,...props}:ImgHTMLAttributes<HTMLImageElement>){
 const [url,setUrl]=useState("");
 useEffect(()=>{let gone=false,objectURL="";setUrl("");if(typeof src!=="string"||!/^\/(?:photos\/|api\/media\/|avatars\.webp$|logo-ws132\.webp$)/.test(src))return;
 appFetch(src).then(async result=>{if(!result.ok)return;const blob=await result.blob();if(gone)return;objectURL=URL.createObjectURL(blob);setUrl(objectURL);}).catch(()=>{});
 return()=>{gone=true;if(objectURL)URL.revokeObjectURL(objectURL);};},[src]);
 return <img {...props} src={url||undefined}/>;
}
export async function downloadExport(event:React.MouseEvent){event.preventDefault();const result=await appFetch("/api/export");if(!result.ok)return;const url=URL.createObjectURL(await result.blob());const link=document.createElement("a");link.href=url;link.download="ws132-registros.json";link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export async function logout(event:React.MouseEvent){event.preventDefault();try{await appFetch("/auth/logout",{method:"POST"});}finally{setToken("");window.dispatchEvent(new Event("ws132-expired"));}}
