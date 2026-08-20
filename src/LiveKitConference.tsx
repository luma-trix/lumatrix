import { useEffect, useMemo, useRef, useState } from 'react'
import { ConnectionQuality, Room, RoomEvent, Track, type Participant } from 'livekit-client'
import { Camera, ChevronLeft, ChevronRight, LoaderCircle, Mic, Phone, RefreshCw, UserPlus, Video } from './icons'
import { supabase } from './lib/supabase'

type Props={roomId:string;kind:'voice'|'video';onAddPeople:()=>void;onLeave:()=>void}

export default function LiveKitConference({roomId,kind,onAddPeople,onLeave}:Props){
 const roomRef=useRef<Room|null>(null)
 const [participants,setParticipants]=useState<Participant[]>([]),[activeIds,setActiveIds]=useState<Set<string>>(new Set()),[status,setStatus]=useState('Securing conference…'),[error,setError]=useState('')
 const [mic,setMic]=useState(true),[camera,setCamera]=useState(kind==='video'),[screen,setScreen]=useState(false),[page,setPage]=useState(0)
 const pageSize=typeof window!=='undefined'&&window.innerWidth<768?6:9,pages=Math.max(1,Math.ceil(participants.length/pageSize)),visibleParticipants=participants.slice(page*pageSize,(page+1)*pageSize)
 useEffect(()=>{if(page>=pages)setPage(Math.max(0,pages-1))},[page,pages])
 useEffect(()=>{let cancelled=false;const room=new Room({adaptiveStream:true,dynacast:true,disconnectOnPageLeave:true});roomRef.current=room;const sync=()=>setParticipants([room.localParticipant,...room.remoteParticipants.values()]);room.on(RoomEvent.ParticipantConnected,sync).on(RoomEvent.ParticipantDisconnected,sync).on(RoomEvent.TrackSubscribed,sync).on(RoomEvent.TrackUnsubscribed,sync).on(RoomEvent.ConnectionQualityChanged,sync).on(RoomEvent.ActiveSpeakersChanged,speakers=>setActiveIds(new Set(speakers.map(p=>p.identity)))).on(RoomEvent.Disconnected,()=>setStatus('Conference ended'));(async()=>{const {data,error}=await supabase.functions.invoke('livekit-token',{body:{roomId}});if(cancelled)return;if(error||data?.error){setError(data?.error||error?.message||'Could not obtain a conference token');return}try{setStatus('Connecting…');await room.connect(data.url,data.token);if(cancelled)return;await room.localParticipant.setMicrophoneEnabled(true);if(kind==='video')await room.localParticipant.setCameraEnabled(true);sync();setStatus('Connected')}catch(e){const raw=e instanceof Error?e.message:'Could not connect to the conference';setError(/invalid token/i.test(raw)?'LiveKit rejected the token. The API key or secret does not match the LIVEKIT_URL project. Recreate the key in that same LiveKit project, update all three Supabase secrets without quotes or spaces, and redeploy livekit-token.':raw)}})();return()=>{cancelled=true;room.disconnect();roomRef.current=null}},[roomId,kind])
 async function toggleMic(){const next=!mic;await roomRef.current?.localParticipant.setMicrophoneEnabled(next);setMic(next)}
 async function toggleCamera(){const next=!camera;await roomRef.current?.localParticipant.setCameraEnabled(next);setCamera(next)}
 async function toggleScreen(){const next=!screen;await roomRef.current?.localParticipant.setScreenShareEnabled(next);setScreen(next)}
 function leave(){roomRef.current?.disconnect();onLeave()}
 if(error)return <div className="lk-error"><Video/><h2>Conference unavailable</h2><p>{error}</p><small>Configure the LiveKit Edge Function and project secrets, then try again.</small><button onClick={onLeave}>Close</button></div>
 return <div className="lk-stage"><div className={`lk-grid count-${Math.min(visibleParticipants.length,9)}`}>{visibleParticipants.map(p=><ParticipantTile key={p.identity} participant={p} active={activeIds.has(p.identity)} audioOnly={kind==='voice'}/>) }{!participants.length&&<div className="lk-connecting"><LoaderCircle className="spin"/><span>{status}</span></div>}</div><div className="lk-status"><span className={status==='Connected'?'online':''}/>{status} · {participants.length} participant{participants.length===1?'':'s'}</div>{pages>1&&<div className="lk-pages"><button disabled={page===0} onClick={()=>setPage(x=>x-1)}><ChevronLeft/></button><span>{page+1} / {pages}</span><button disabled={page===pages-1} onClick={()=>setPage(x=>x+1)}><ChevronRight/></button></div>}<div className="lk-controls"><button className={!mic?'off':''} onClick={toggleMic} title={mic?'Mute':'Unmute'}><Mic/></button><button className={!camera?'off':''} onClick={toggleCamera} title={camera?'Camera off':'Camera on'}><Camera/></button><button className={screen?'active':''} onClick={toggleScreen} title="Share screen"><RefreshCw/></button><button onClick={onAddPeople} title="Add people"><UserPlus/></button><button className="hang" onClick={leave} title="Leave conference"><Phone/></button></div></div>
}

function ParticipantTile({participant,active,audioOnly}:{participant:Participant;active:boolean;audioOnly:boolean}){
 const videoRef=useRef<HTMLVideoElement>(null),audioRef=useRef<HTMLAudioElement>(null)
 const videoTrack=participant.getTrackPublication(Track.Source.Camera)?.track
 const audioTrack=participant.getTrackPublication(Track.Source.Microphone)?.track
 useEffect(()=>{const el=videoRef.current;if(videoTrack&&el)videoTrack.attach(el);return()=>{if(videoTrack&&el)videoTrack.detach(el)}},[videoTrack])
 useEffect(()=>{const el=audioRef.current;if(audioTrack&&el)audioTrack.attach(el);return()=>{if(audioTrack&&el)audioTrack.detach(el)}},[audioTrack])
 const name=participant.name||participant.identity,initials=useMemo(()=>name.split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase(),[name])
 return <div className={`lk-tile ${active?'speaking':''} ${!videoTrack||audioOnly?'audio-only':''}`}><video ref={videoRef} autoPlay playsInline muted={participant.isLocal}/><audio ref={audioRef} autoPlay/><div className="lk-avatar">{initials}</div><div className="lk-name"><span>{name}{participant.isLocal?' (You)':''}</span><NetworkStrength quality={participant.connectionQuality}/></div>{!participant.isMicrophoneEnabled&&<div className="lk-muted"><Mic/></div>}</div>
}
function NetworkStrength({quality}:{quality:ConnectionQuality}){const level=quality===ConnectionQuality.Excellent?4:quality===ConnectionQuality.Good?3:quality===ConnectionQuality.Poor?1:0;return <div className={`network-strength level-${level}`} title={`Network: ${quality}`}><i/><i/><i/><i/></div>}
