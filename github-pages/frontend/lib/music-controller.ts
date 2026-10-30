import {youtubeId,type Item,type Settings} from "./model";

export type MusicStatus="idle"|"loading"|"playing"|"paused"|"blocked"|"needs-audio"|"error"|"ended";
export type MusicSnapshot={songId:string;status:MusicStatus;mode:"audio"|"video";volume:number;message:string};
export type VideoAdapter={play:()=>void;pause:()=>void;time:()=>number;seek:(seconds:number)=>void;volume:(value:number)=>void};
type Dependencies={createAudio:()=>HTMLAudioElement;getBlob:(path:string,signal:AbortSignal)=>Promise<Blob>;objectURL:(blob:Blob)=>string;revokeURL:(url:string)=>void;pausedInitially?:boolean;savePaused?:(paused:boolean)=>void};

// One session owns the media. Page navigation changes intent, never recreates audio.
export class MusicController{
 private snapshot:MusicSnapshot={songId:"",status:"idle",mode:"audio",volume:.4,message:""};
 private listeners=new Set<()=>void>();
 private songs:Item[]=[];private settings:Settings|null=null;private screen="";
 private audio:HTMLAudioElement|null=null;private video:VideoAdapter|null=null;
 private source="";private objectURL="";private request:AbortController|null=null;
 private wanted=false;private userPaused=false;private intent:"auto"|"manual"="auto";
 private suspended=false;private hasStarted=false;private attempted=false;private manualVideoPending=false;
 private positions=new Map<string,number>();private destroyed=false;private lastPauseAt=0;
 constructor(private dependencies:Dependencies){this.userPaused=!!dependencies.pausedInitially;}
 getSnapshot=()=>this.snapshot;
 subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener);};};
 private emit(patch:Partial<MusicSnapshot>){this.snapshot={...this.snapshot,...patch};this.listeners.forEach(fn=>fn());}
 getSong=()=>this.songs.find(song=>song.id===this.snapshot.songId)||this.songs.find(song=>song.id===this.settings?.entrySongId)||this.songs[0];
 getSongs=()=>this.songs;
 getAudio=()=>this.audio;
 getPosition=()=>this.snapshot.mode==="video"?(this.video?.time()??this.positions.get(this.snapshot.songId)??0):(this.audio?.currentTime??this.positions.get(this.snapshot.songId)??0);
 wantsPlayback=()=>this.wanted&&!this.userPaused;
 setLibrary(items:Item[],settings:Settings){
  this.songs=items.filter(item=>item.collection==="songs");this.settings=settings;
  if(this.snapshot.songId&&!this.songs.some(song=>song.id===this.snapshot.songId)){this.pause(false);this.emit({songId:"",status:"idle"});}
  const current=this.getSong();
  if(this.snapshot.status==="needs-audio"&&current?.audioUrl)this.emit({status:"paused",message:"Áudio pronto para ouvir."});
  this.emit({});
 }
 navigate(screen:string){
  if(this.screen===screen)return;this.screen=screen;
  const eligible=screen==="home"||screen==="album";
  const auto=screen==="home"?this.settings?.entryAutoplay:screen==="album"?this.settings?.albumAutoplay:false;
  if((!eligible&&this.intent==="auto"&&this.wanted)||(screen!=="album"&&this.snapshot.mode==="video"&&this.wanted)){this.pause(false);this.suspended=true;}
  if(screen==="album"&&this.manualVideoPending){this.manualVideoPending=false;void this.play(this.snapshot.songId,true);return;}
  if(!eligible||this.userPaused||!auto)return;
  if(this.suspended){if(this.snapshot.mode==="video"&&screen!=="album")return;this.suspended=false;void this.play(this.snapshot.songId,false);return;}
  if(!this.attempted||screen==="album"&&!this.hasStarted&&this.snapshot.status==="needs-audio"){
   this.attempted=true;
   const preferred=this.hasStarted?this.snapshot.songId:screen==="album"?this.settings?.albumSongId:this.settings?.entrySongId;
   if(preferred)void this.play(preferred,false);
  }
 }
 private ensureAudio(){
  if(this.audio)return this.audio;
  const audio=this.dependencies.createAudio();this.audio=audio;audio.preload="metadata";audio.volume=this.snapshot.volume;
  audio.addEventListener("playing",()=>{if(!this.wanted||this.userPaused){audio.pause();return;}this.hasStarted=true;this.emit({status:"playing",message:""});});
  audio.addEventListener("pause",()=>{if(this.snapshot.mode==="audio"&&this.snapshot.status==="playing")this.emit({status:"paused"});});
  audio.addEventListener("ended",()=>{this.wanted=false;this.positions.set(this.snapshot.songId,0);this.emit({status:"ended"});});
  audio.addEventListener("error",()=>{if(this.source)this.emit({status:"error",message:"Não foi possível abrir este áudio. Tente novamente ou envie outro arquivo."});});
  return audio;
 }
 async play(id=this.snapshot.songId||this.getSong()?.id,manual=true){
  if(this.destroyed||!id)return;
  const song=this.songs.find(item=>item.id===id);if(!song)return;
  if(manual){this.userPaused=false;this.intent="manual";this.dependencies.savePaused?.(false);}else this.intent="auto";
  this.wanted=true;this.suspended=false;
  const changing=this.snapshot.songId!==id;
  if(changing){this.remember();this.request?.abort();this.audio?.pause();this.video?.pause();this.source="";this.emit({songId:id,status:"idle"});}
  if(!song.audioUrl){
   const hasVideo=!!youtubeId(String(song.url??""));
   this.audio?.pause();this.emit({songId:id,mode:hasVideo?"video":"audio",status:this.screen==="album"&&hasVideo?"loading":"needs-audio",message:"Anexe um áudio à faixa para ouvir só o som."});
   if(this.screen==="album"&&hasVideo){if(this.video){this.video.volume(this.snapshot.volume);this.video.play();}}
   else this.wanted=false;
   return;
  }
  this.video?.pause();this.emit({songId:id,mode:"audio",message:""});
  const audio=this.ensureAudio(),path=String(song.audioUrl);
  if(this.source===path&&this.objectURL){await this.startAudio(audio);return;}
  this.request?.abort();const request=new AbortController();this.request=request;this.emit({status:"loading"});
  try{
   const blob=await this.dependencies.getBlob(path,request.signal);
   if(request.signal.aborted||this.destroyed||this.snapshot.songId!==id)return;
   if(this.objectURL)this.dependencies.revokeURL(this.objectURL);
   this.objectURL=this.dependencies.objectURL(blob);this.source=path;audio.src=this.objectURL;
   const position=this.positions.get(id)??0;
   if(position){const restore=()=>{if(this.snapshot.songId===id)audio.currentTime=Math.min(position,Number.isFinite(audio.duration)?audio.duration:position);};audio.addEventListener("loadedmetadata",restore,{once:true});}
   if(this.wanted&&!this.userPaused)await this.startAudio(audio);else this.emit({status:"paused"});
  }catch(error){if(request.signal.aborted||this.destroyed)return;this.wanted=false;this.emit({status:"error",message:"Não foi possível carregar o áudio. Confira a conexão e tente novamente."});}
 }
 private async startAudio(audio:HTMLAudioElement){
  if(!this.wanted||this.userPaused)return;
  try{await audio.play();if(!this.wanted||this.userPaused)audio.pause();}
  catch(error){if(!this.wanted||this.destroyed)return;this.wanted=false;this.emit({status:"blocked",message:"Toque em reproduzir para ouvir."});}
 }
 private remember(){if(this.snapshot.songId){const position=this.getPosition();if(Number.isFinite(position))this.positions.set(this.snapshot.songId,position);}}
 pause(manual=true){
  this.remember();this.wanted=false;this.lastPauseAt=Date.now();
  if(manual){this.userPaused=true;this.suspended=false;this.manualVideoPending=false;this.dependencies.savePaused?.(true);}
  this.audio?.pause();this.video?.pause();this.emit({status:"paused",message:""});
 }
 toggle(){if(this.snapshot.status==="playing"||this.snapshot.status==="loading")this.pause();else void this.play();}
 openVideo(id:string){this.remember();this.request?.abort();this.audio?.pause();this.video?.pause();this.wanted=false;this.source="";this.manualVideoPending=true;this.emit({songId:id,mode:"video",status:"paused"});if(this.screen==="album"){this.manualVideoPending=false;void this.play(id,true);}}
 attachVideo(adapter:VideoAdapter){this.video=adapter;adapter.volume(this.snapshot.volume);if(this.wantsPlayback()&&this.screen==="album")adapter.play();else adapter.pause();}
 detachVideo(){this.remember();this.video=null;if(this.snapshot.mode==="video"&&this.wanted){this.wanted=false;this.suspended=true;this.emit({status:"paused"});}}
 videoState(state:number){
  if(this.snapshot.mode!=="video")return;
  if(state===1){if(this.screen!=="album"||(!this.wanted&&Date.now()-this.lastPauseAt<350)){this.video?.pause();return;}if(!this.wanted){this.wanted=true;this.userPaused=false;this.intent="manual";this.dependencies.savePaused?.(false);}this.hasStarted=true;this.emit({status:"playing",message:""});}
  if(state===2&&this.snapshot.status==="playing"){this.remember();if(this.wanted)this.pause(true);else this.emit({status:"paused"});}
  if(state===0){this.wanted=false;this.positions.set(this.snapshot.songId,0);this.emit({status:"ended"});}
 }
 videoBlocked(){this.wanted=false;this.emit({status:"blocked",message:"Toque em reproduzir para ouvir."});}
 videoError(){this.wanted=false;this.emit({status:"error",message:"O vídeo não carregou. Use o link da música ou anexe o áudio."});}
 setVolume(value:number){const volume=Math.max(0,Math.min(1,value));if(this.audio)this.audio.volume=volume;this.video?.volume(volume);this.emit({volume});}
 seek(seconds:number){if(!Number.isFinite(seconds))return;const time=Math.max(0,seconds);if(this.snapshot.mode==="audio"&&this.audio&&Number.isFinite(this.audio.duration))this.audio.currentTime=Math.min(time,this.audio.duration);else this.video?.seek(time);}
 destroy(){this.destroyed=true;this.wanted=false;this.request?.abort();this.audio?.pause();this.video?.pause();if(this.audio){this.audio.removeAttribute("src");this.audio.load();}if(this.objectURL)this.dependencies.revokeURL(this.objectURL);this.listeners.clear();}
}
