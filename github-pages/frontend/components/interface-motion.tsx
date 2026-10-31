import {useEffect} from "react";

// A short entrance per element, including newly saved cards. Nothing is hidden
// while waiting for JavaScript, and leaving a route cancels unfinished work.
const surfaces=[".page-title",".hero-copy",".hero-portrait",".countdown",".overview-card",".home-grid>section",".home-bottom>section",".home-insights>section",".main-goal",".goal-card",".task-card",".album-root",".album-upload-strip",".album-prologue",".photo",".timeline-label",".playlist-cover",".song-row",".playlist-album-player",".couple-room",".settings-card",".settings-note",".biz-page-heading",".biz-summaries article",".biz-task",".biz-supplier",".biz-table-wrap",".checklist-progress-card",".checklist-group"].join(",");

export default function InterfaceMotion({route}:{route:string}){
 useEffect(()=>{
  const root=document.querySelector("#content,#business-content");
  if(!root||typeof IntersectionObserver==="undefined"||typeof Element.prototype.animate!=="function")return;
  const preference=window.matchMedia("(prefers-reduced-motion: reduce)");
  let stop=()=>{};
  function start(){
   stop();
   if(preference.matches)return;
   const seen=new WeakSet<Element>(),animations=new Set<Animation>();
   const observer=new IntersectionObserver(entries=>{
    let index=0;
    for(const entry of entries){
     if(!entry.isIntersecting)continue;
     observer.unobserve(entry.target);
     const animation=entry.target.animate([{opacity:0,translate:"0 8px"},{opacity:1,translate:"0 0"}],{duration:360,delay:Math.min(index++,3)*32,easing:"cubic-bezier(.2,.65,.35,1)",fill:"backwards"});
     animations.add(animation);
     animation.onfinish=animation.oncancel=()=>animations.delete(animation);
    }
   },{threshold:.06});
   const observe=(element:Element)=>{if(!seen.has(element)){seen.add(element);observer.observe(element);}};
   root!.querySelectorAll(surfaces).forEach(observe);
   const changes=new MutationObserver(records=>{
    for(const record of records){
     for(const node of record.removedNodes){
      if(!(node instanceof HTMLElement))continue;
      observer.unobserve(node);
      node.querySelectorAll(surfaces).forEach(element=>observer.unobserve(element));
     }
     for(const node of record.addedNodes){
      if(!(node instanceof HTMLElement))continue;
      if(node.matches(surfaces))observe(node);
      node.querySelectorAll(surfaces).forEach(observe);
     }
    }
   });
   changes.observe(root!,{childList:true,subtree:true});
   stop=()=>{observer.disconnect();changes.disconnect();animations.forEach(animation=>animation.cancel());animations.clear();};
  }
  start();
  preference.addEventListener("change",start);
  return()=>{stop();preference.removeEventListener("change",start);};
 },[route]);
 return null;
}
