(()=>{
 const args=new URLSearchParams(location.hash.slice(1)),kind=args.get("kind"),raw=args.get("url"),host=document.getElementById("pin"),fallback=document.getElementById("fallback");
 let url;try{url=new URL(raw);if(url.protocol!=="https:"||url.hostname!=="www.pinterest.com"||url.username||url.password)throw new Error();if(kind==="pin"&&!/^\/pin\/\d{5,30}\/$/.test(url.pathname))throw new Error();if(kind==="board"&&!/^\/[-\w%.]+\/[-\w%.]+\/$/.test(url.pathname))throw new Error();if(!["pin","board"].includes(kind))throw new Error();}catch{fallback.textContent="Referência inválida.";return;}
 const anchor=document.createElement("a");anchor.href=url.href;anchor.target="_blank";anchor.rel="noopener noreferrer";anchor.setAttribute("data-pin-do",kind==="pin"?"embedPin":"embedBoard");anchor.textContent="Abrir no Pinterest";
 if(kind==="board"){anchor.setAttribute("data-pin-board-width",String(Math.max(130,document.documentElement.clientWidth-28)));anchor.setAttribute("data-pin-scale-height","380");anchor.setAttribute("data-pin-scale-width","80");}
 host.appendChild(anchor);
 const report=()=>parent.postMessage({type:"ws132-pinterest-height",height:Math.ceil(document.body.getBoundingClientRect().height)+12},"*");
 new ResizeObserver(report).observe(document.body);
 const observer=new MutationObserver(()=>{if(!host.contains(anchor)){fallback.textContent="";report();}});observer.observe(host,{childList:true,subtree:true});
 const script=document.createElement("script");script.src="https://assets.pinterest.com/js/pinit.js";script.async=true;script.defer=true;script.onerror=()=>{fallback.textContent="A prévia não carregou. Abra a referência no Pinterest.";report();};document.head.appendChild(script);
 setTimeout(()=>{if(host.contains(anchor)){fallback.textContent="Se a prévia não aparecer, abra a referência no Pinterest.";report();}},10000);
 report();
})();
