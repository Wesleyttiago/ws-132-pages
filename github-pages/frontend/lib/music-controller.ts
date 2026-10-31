import {youtubeId,type Item,type Settings} from "./model";

export type MusicStatus="idle"|"loading"|"playing"|"paused"|"blocked"|"needs-audio"|"error"|"ended";
export type MusicSnapshot={songId:string;status:MusicStatus;mode:"audio"|"video";volume:number;repeat:"all"|"one";message:string};
export type VideoAdapter={play:()=>void;pause:()=>void;time:()=>number;duration?:()=>number;seek:(seconds:number)=>void;volume:(value:number)=>void};
type Dependencies={createAudio:()=>HTMLAudioElement;getBlob:(path:string,signal:AbortSignal)=>Promise<Blob>;objectURL:(blob:Blob)=>string;revokeURL:(url:string)=>void;pausedInitially?:boolean;initialVolume?:number;savePaused?:(paused:boolean)=>void;saveVolume?:(volume:number)=>void};

// The session owns the media. Routes never stop, replace or recreate a player.
export class MusicController{
 private snapshot:MusicSnapshot={songId:"",status:"idle",mode:"audio",volume:.12,repeat:"all",message:""};
 private listeners=new Set<()=>void>();
 private songs:Item[]=[];private settings:Settings|null=null;
 private audio:HTMLAudioElement|null=null;private video:VideoAdapter|null=null;private videoSongId="";private audioSongId="";
 private source="";private objectURL="";private request:AbortController|null=null;
 private wanted=false;private userPaused=false;private attempted=false;
 private positions=new Map<string,number>();private destroyed=false;private lastPauseAt=0;private playAttempt=0;
 constructor(private dependencies:Dependencies){this.userPaused=!!dependencies.pausedInitially;if(Number.isFinite(dependencies.initialVolume))this.snapshot.volume=Math.max(0,Math.min(1,dependencies.initialVolume!));}
 getSnapshot=()=>this.snapshot;
 subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener);};};
 private emit(patch:Partial<MusicSnapshot>){if(this.destroyed)return;this.snapshot={...this.snapshot,...patch};this.listeners.forEach(fn=>fn());}
 getSong=()=>this.songs.find(song=>song.id===this.snapshot.songId)||this.entrySong();
 getSongs=()=>this.songs;
 getAudio=()=>this.audio;
 getPosition=()=>this.snapshot.mode==="video"?(this.videoSongId===this.snapshot.songId?this.video?.time()??0:this.positions.get(this.snapshot.songId)??0):(this.audioSongId===this.snapshot.songId?this.audio?.currentTime??0:this.positions.get(this.snapshot.songId)??0);
 getDuration=()=>this.snapshot.mode==="video"?(this.videoSongId===this.snapshot.songId?this.video?.duration?.()??0:0):(this.audioSongId===this.snapshot.songId&&Number.isFinite(this.audio?.duration)?this.audio!.duration:0);
 wantsPlayback=()=>this.wanted&&!this.userPaused;
 private entrySong(){return this.songs.find(song=>song.id===this.settings?.entrySongId)||this.songs.find(song=>song.id==="mirrors")||this.songs.find(song=>/^mirr?ors$/i.test(String(song.title).trim()))||this.songs.find(song=>song.id===this.settings?.entrySongId)||this.songs[0];}
 setLibrary(items:Item[],settings:Settings){
  this.songs=items.filter(item=>item.collection==="songs");this.settings=settings;
  if(this.snapshot.songId&&!this.songs.some(song=>song.id===this.snapshot.songId)){this.pause(false);this.emit({songId:"",status:"idle"});}
  if(this.snapshot.status==="needs-audio"&&this.getSong()?.audioUrl)this.emit({status:"paused",message:"Áudio pronto para ouvir."});
  this.emit({});
 }
 navigate(_screen:string){
  if(this.attempted||this.userPaused||!this.settings)return;
  this.attempted=true;
  if(this.settings.entryAutoplay&&this.settings.entrySongId&&this.entrySong()){this.setVolume(.12);void this.play(this.entrySong()!.id,false);}
 }
 resumeAfterGesture(){if(this.snapshot.status==="blocked"&&!this.userPaused)void this.play(this.snapshot.songId,false);}
 private ensureAudio(){
  if(this.audio)return this.audio;
  const audio=this.dependencies.createAudio();this.audio=audio;audio.preload="metadata";audio.volume=this.snapshot.volume;
  audio.addEventListener("playing",()=>{if(!this.wanted||this.userPaused||this.audioSongId!==this.snapshot.songId){audio.pause();return;}this.emit({status:"playing",message:""});});
  audio.addEventListener("pause",()=>{if(this.snapshot.mode==="audio"&&this.snapshot.status==="playing")this.emit({status:"paused"});});
  audio.addEventListener("ended",()=>{if(this.snapshot.mode==="audio"&&this.audioSongId===this.snapshot.songId){audio.currentTime=0;this.finished();}});
  audio.addEventListener("error",()=>{if(this.source&&this.snapshot.mode==="audio")this.emit({status:"error",message:"Não foi possível abrir este áudio. Tente novamente ou envie outro arquivo."});});
  return audio;
 }
 async play(id=this.snapshot.songId||this.getSong()?.id,manual=true){
  if(this.destroyed||!id)return;
  const song=this.songs.find(item=>item.id===id);if(!song)return;
  if(manual){this.userPaused=false;this.dependencies.savePaused?.(false);}this.attempted=true;this.wanted=true;
  const changing=this.snapshot.songId!==id;
  if(changing){this.playAttempt++;this.remember();this.request?.abort();this.audio?.pause();this.video?.pause();this.video=null;this.videoSongId="";this.source="";this.emit({songId:id,status:"idle"});}
  if(!song.audioUrl){
   const hasVideo=!!youtubeId(String(song.url??""));this.audio?.pause();
   this.emit({songId:id,mode:hasVideo?"video":"audio",status:hasVideo?"loading":"needs-audio",message:hasVideo?"":"Anexe um áudio à faixa para ouvir dentro do site."});
   if(hasVideo){if(this.video&&this.videoSongId===id){this.video.volume(this.snapshot.volume);this.video.play();}}
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
   this.objectURL=this.dependencies.objectURL(blob);this.source=path;this.audioSongId=id;audio.src=this.objectURL;
   const position=this.positions.get(id)??0;
   if(position){const restore=()=>{if(this.snapshot.songId===id)audio.currentTime=Math.min(position,Number.isFinite(audio.duration)?audio.duration:position);};audio.addEventListener("loadedmetadata",restore,{once:true});}
   if(this.wanted&&!this.userPaused)await this.startAudio(audio);else this.emit({status:"paused"});
  }catch(error){if(request.signal.aborted||this.destroyed)return;this.wanted=false;this.emit({status:"error",message:"Não foi possível carregar o áudio. Confira a conexão e tente novamente."});}
 }
 private async startAudio(audio:HTMLAudioElement){
  if(!this.wanted||this.userPaused)return;
  const attempt=++this.playAttempt;
  try{await audio.play();if(attempt!==this.playAttempt)return;if(!this.wanted||this.userPaused)audio.pause();}
  catch(error){if(attempt!==this.playAttempt||!this.wanted||this.destroyed)return;this.wanted=false;this.emit({status:"blocked",message:"Toque em reproduzir para ouvir."});}
 }
 private remember(){if(this.snapshot.songId){const position=this.getPosition();if(Number.isFinite(position))this.positions.set(this.snapshot.songId,position);}}
 pause(manual=true){
  this.playAttempt++;this.remember();this.wanted=false;this.lastPauseAt=Date.now();
  if(manual){this.userPaused=true;this.dependencies.savePaused?.(true);}
  this.audio?.pause();this.video?.pause();this.emit({status:"paused",message:""});
 }
 toggle(){if(this.snapshot.status==="playing"||this.snapshot.status==="loading")this.pause();else void this.play();}
 openVideo(id:string){void this.play(id,true);}
 async next(){await this.advance(1,true);}
 async previous(){if(this.getPosition()>3){this.seek(0);await this.play();}else await this.advance(-1,true);}
 private async advance(direction:number,manual:boolean){
  const queue=this.songs.filter(song=>song.audioUrl||youtubeId(String(song.url??"")));if(!queue.length)return;
  const index=queue.findIndex(song=>song.id===this.snapshot.songId),next=queue[(index+direction+queue.length)%queue.length];
  if(next.id===this.snapshot.songId)this.seek(0);this.positions.set(next.id,0);await this.play(next.id,manual);
 }
 private finished(){
  this.positions.set(this.snapshot.songId,0);if(!this.wantsPlayback()){this.emit({status:"ended"});return;}
  if(this.snapshot.repeat==="one"){this.seek(0);void this.play(this.snapshot.songId,false);}else void this.advance(1,false);
 }
 setRepeat(value:"all"|"one"){this.emit({repeat:value});}
 attachVideo(adapter:VideoAdapter,id=this.snapshot.songId){
  if(this.destroyed||this.snapshot.mode!=="video"||id!==this.snapshot.songId){adapter.pause();return;}
  this.video=adapter;this.videoSongId=id;adapter.volume(this.snapshot.volume);if(this.wantsPlayback())adapter.play();else adapter.pause();
 }
 detachVideo(id=this.videoSongId){if(id!==this.videoSongId)return;if(id===this.snapshot.songId)this.remember();this.video=null;this.videoSongId="";}
 videoState(state:number,id=this.snapshot.songId){
  if(this.destroyed||this.snapshot.mode!=="video"||id!==this.snapshot.songId)return;
  if(state===1){if(!this.wanted&&Date.now()-this.lastPauseAt<350){this.video?.pause();return;}if(!this.wanted){this.wanted=true;this.userPaused=false;this.dependencies.savePaused?.(false);}this.emit({status:"playing",message:""});}
  if(state===2&&this.snapshot.status==="playing"){this.remember();if(this.wanted)this.pause(true);else this.emit({status:"paused"});}
  if(state===0)this.finished();
 }
 videoBlocked(){this.wanted=false;this.emit({status:"blocked",message:"Toque em reproduzir para ouvir."});}
 videoError(){this.wanted=false;this.emit({status:"error",message:"O vídeo não carregou. Use o link da música ou anexe o áudio."});}
 setVolume(value:number){const volume=Math.max(0,Math.min(1,value));if(this.audio)this.audio.volume=volume;this.video?.volume(volume);this.dependencies.saveVolume?.(volume);this.emit({volume});}
 seek(seconds:number){if(!Number.isFinite(seconds))return;const time=Math.max(0,seconds);if(this.snapshot.mode==="audio"&&this.audio&&Number.isFinite(this.audio.duration))this.audio.currentTime=Math.min(time,this.audio.duration);else this.video?.seek(time);this.positions.set(this.snapshot.songId,time);}
 destroy(){this.destroyed=true;this.wanted=false;this.request?.abort();this.audio?.pause();this.video?.pause();if(this.audio){this.audio.removeAttribute("src");this.audio.load();}if(this.objectURL)this.dependencies.revokeURL(this.objectURL);this.listeners.clear();}
}
