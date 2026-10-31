import {Check,Heart,Music2} from "lucide-react";
import {PrivateImage} from "../transport";

type Scene="memories"|"plans"|"music";
export default function PageCompanion({scene,activity="idle"}:{scene:Scene;activity?:"idle"|"saving"|"saved"}){
 return <div className={"page-companion companion-"+scene} data-activity={activity} aria-hidden="true">
  <span className="companion-halo"/>
  <PrivateImage className="companion-person companion-wesley" src="/characters/wesley-full.webp" alt="" width={720} height={1080} loading="lazy"/>
  {scene!=="plans"&&<PrivateImage className="companion-person companion-suelaine" src="/characters/suelaine-full.webp" alt="" width={720} height={1080} loading="lazy"/>}
  {scene==="memories"?<><span className="companion-photos"><i/><i><Heart size={10} fill="currentColor"/></i></span><span className="companion-pocket"><Heart size={11}/></span></>:scene==="plans"?<span className="companion-plan"><Check size={12}/><i/><Check size={12}/><i/><span/></span>:<><span className="companion-record"><Heart size={10} fill="currentColor"/></span><Music2 className="companion-note" size={15}/></>}
  {activity==="saved"&&<span className="companion-saved"><Check size={12}/></span>}
 </div>;
}
