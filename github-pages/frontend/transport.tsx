import {useEffect,useState,useRef,type ImgHTMLAttributes} from "react";
export const BACKEND="https://ws132-api.wesleytiago470.chatgpt.site";
let token=sessionStorage.getItem("ws132-access")??"";
const imageCache=new Map<string,Promise<Blob>>();
const imageSizes=new Map<string,number>();let cachedBytes=0;
function forgetImage(path:string){cachedBytes-=imageSizes.get(path)??0;imageSizes.delete(path);imageCache.delete(path);}
export function setToken(value:string){if(token!==value){imageCache.clear();imageSizes.clear();cachedBytes=0;}token=value;if(value)sessionStorage.setItem("ws132-access",value);else sessionStorage.removeItem("ws132-access");}
export async function appFetch(path:string,options:RequestInit={}){
 const headers=new Headers(options.headers);if(token)headers.set("Authorization","Bearer "+token);
 const controller=new AbortController(),signal=options.signal?(typeof AbortSignal.any==="function"?AbortSignal.any([options.signal,controller.signal]):options.signal):controller.signal;
 const timeout=setTimeout(()=>controller.abort(),options.body instanceof FormData?120000:25000);
 let result:Response;
 try{result=await fetch(BACKEND+path,{...options,headers,signal,cache:"no-store",credentials:"omit"});}
 finally{clearTimeout(timeout);}
 if(result.status===401&&path!=="/auth/login"){setToken("");window.dispatchEvent(new Event("ws132-expired"));}
 return result;
}
function imageBlob(path:string){
 let cached=imageCache.get(path);if(cached)return cached;
 cached=appFetch(path).then(response=>{if(!response.ok)throw new Error("Imagem indisponível.");return response.blob();}).then(blob=>{if(imageCache.get(path)===cached){imageSizes.set(path,blob.size);cachedBytes+=blob.size;while(cachedBytes>24*1024*1024&&imageCache.size)forgetImage(imageCache.keys().next().value!);}return blob;}).catch(error=>{if(imageCache.get(path)===cached)forgetImage(path);throw error;});
 if(imageCache.size>=48)forgetImage(imageCache.keys().next().value!);
 imageCache.set(path,cached);return cached;
}
export function PrivateImage({src,...props}:ImgHTMLAttributes<HTMLImageElement>){
 const [url,setUrl]=useState(""),image=useRef<HTMLImageElement>(null);
 useEffect(()=>{let gone=false,objectURL="";setUrl("");if(typeof src!=="string"||!/^\/(?:photos\/|api\/media\/|avatars\.webp$|logo-ws132\.webp$)/.test(src))return;
 const load=()=>imageBlob(src).then(blob=>{if(gone)return;objectURL=URL.createObjectURL(blob);setUrl(objectURL);}).catch(()=>{});
 let observer:IntersectionObserver|null=null;
 if(props.loading==="lazy"&&typeof IntersectionObserver!=="undefined"&&image.current){observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){observer?.disconnect();void load();}},{rootMargin:"400px"});observer.observe(image.current);}else void load();
 return()=>{gone=true;observer?.disconnect();if(objectURL)URL.revokeObjectURL(objectURL);};},[src,props.loading]);
 return <img {...props} ref={image} src={url||undefined}/>;
}
export async function downloadExport(event:React.MouseEvent){event.preventDefault();const result=await appFetch("/api/export");if(!result.ok)return;const url=URL.createObjectURL(await result.blob());const link=document.createElement("a");link.href=url;link.download="ws132-registros.json";link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export async function logout(event:React.MouseEvent){event.preventDefault();try{await appFetch("/auth/logout",{method:"POST"});}finally{setToken("");window.dispatchEvent(new Event("ws132-expired"));}}
