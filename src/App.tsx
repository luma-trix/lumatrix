import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Search, MoreVertical, Video, Phone, Smile, Send, Mic, Plus,
  MessageCircle, Users, Radio, PhoneCall, Archive, CheckCheck,
  Image, FileText, MapPin, Contact, X, ChevronLeft, Moon, Sun, Palette,
  BellOff, Pin, ShieldCheck, Camera, Play, Download, Hash, LockKeyhole,
  Sparkles, Volume2, PanelLeftClose, CirclePlus
} from './icons'
import { LumaMark } from './Brand'
import './App.css'
import { isSupabaseConfigured, supabase } from './lib/supabase'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type Message = { id:number; from:'me'|'them'; text:string; time:string; read?:boolean; type?:'text'|'voice'|'file'; duration?:string }
type Chat = { id:number; name:string; avatar:string; color:string; preview:string; time:string; unread:number; online?:boolean; pinned?:boolean; muted?:boolean; kind?:'direct'|'group'|'channel'; members?:string; messages:Message[] }

const initialChats: Chat[] = [
  { id:1, name:'Amara Okafor', avatar:'AO', color:'#e65a7a', preview:'Perfect — see you then! ✨', time:'10:42', unread:2, online:true, pinned:true, kind:'direct', messages:[
    {id:1,from:'them',text:'Hey! Are we still on for the product review today?',time:'10:35'},
    {id:2,from:'me',text:'Absolutely. I shared the updated screens in the project folder.',time:'10:37',read:true},
    {id:3,from:'them',text:'Just saw them — the new chat layout feels so clean!',time:'10:39'},
    {id:4,from:'me',text:'Glad you like it! Let’s meet at 2 PM and run through the flows.',time:'10:40',read:true},
    {id:5,from:'them',text:'Perfect — see you then! ✨',time:'10:42'} ]},
  { id:2, name:'Design Crew', avatar:'DC', color:'#7c5cff', preview:'Kelechi: New icons are ready', time:'09:18', unread:5, pinned:true, kind:'group', members:'12 members', messages:[
    {id:1,from:'them',text:'The new icon set is ready for review 🎨',time:'09:12'},
    {id:2,from:'me',text:'Fantastic. Drop the link here and I’ll take a look.',time:'09:14',read:true},
    {id:3,from:'them',text:'New icons are ready — uploading the source file now.',time:'09:18',type:'file'} ]},
  { id:3, name:'Luma Announcements', avatar:'N', color:'#16a39a', preview:'Introducing encrypted cloud backup', time:'Yesterday', unread:0, kind:'channel', members:'24.8K subscribers', muted:true, messages:[
    {id:1,from:'them',text:'Introducing encrypted cloud backup 🔐\n\nYour conversations can now be backed up securely and restored on any device. You stay in control of your keys.',time:'Yesterday'} ]},
  { id:4, name:'David Mensah', avatar:'DM', color:'#f59f38', preview:'🎙 Voice message · 0:24', time:'Yesterday', unread:0, kind:'direct', messages:[
    {id:1,from:'them',text:'',time:'18:22',type:'voice',duration:'0:24'},
    {id:2,from:'me',text:'That sounds like a solid plan. Let’s do it!',time:'18:26',read:true} ]},
  { id:5, name:'Abuja Tech Community', avatar:'AT', color:'#3186e8', preview:'Event starts Saturday at 10 AM', time:'Mon', unread:0, kind:'group', members:'1,284 members', muted:true, messages:[
    {id:1,from:'them',text:'Our monthly meetup starts Saturday at 10 AM. RSVP is now open!',time:'Mon'} ]},
  { id:6, name:'Mum ❤️', avatar:'M', color:'#da548c', preview:'Call me when you get home', time:'Sun', unread:0, kind:'direct', messages:[
    {id:1,from:'them',text:'Call me when you get home ❤️',time:'Sun'},
    {id:2,from:'me',text:'I will, Mum!',time:'Sun',read:true} ]},
  { id:7, name:'Saved Messages', avatar:'★', color:'#5d72e8', preview:'Ideas for launch day', time:'Fri', unread:0, kind:'direct', messages:[
    {id:1,from:'me',text:'Ideas for launch day:\n• Community AMA\n• Early adopter badges\n• Theme design contest',time:'Fri',read:true} ]}
]

const themes = [
  {id:'ocean', name:'Ocean', colors:['#16a39a','#7c5cff']},
  {id:'emerald', name:'Emerald', colors:['#21a366','#77c66e']},
  {id:'sunset', name:'Sunset', colors:['#ed6f57','#a855f7']},
  {id:'midnight', name:'Midnight', colors:['#5965d8','#2ab5ad']},
  {id:'mono', name:'Mono', colors:['#27272a','#71717a']},
]

const now = () => new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})

function App() {
  const [chats, setChats] = useState<Chat[]>(() => {
    try { return JSON.parse(localStorage.getItem('nexa-chats') || '') } catch { return initialChats }
  })
  const [activeId, setActiveId] = useState(1)
  const [section, setSection] = useState<'chats'|'updates'|'calls'>('chats')
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState('')
  const [dark, setDark] = useState(false)
  const [theme, setTheme] = useState('ocean')
  const [showThemes, setShowThemes] = useState(false)
  const [showAttach, setShowAttach] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [showCall, setShowCall] = useState<'audio'|'video'|null>(null)
  const [mobileChat, setMobileChat] = useState(false)
  const [recording, setRecording] = useState(false)
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const messagesRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const capture = (event: Event) => { event.preventDefault(); setInstallPrompt(event as BeforeInstallPromptEvent) }
    window.addEventListener('beforeinstallprompt', capture)
    return () => window.removeEventListener('beforeinstallprompt', capture)
  }, [])
  useEffect(() => localStorage.setItem('nexa-chats', JSON.stringify(chats)), [chats])
  useEffect(() => messagesRef.current?.scrollTo({top: messagesRef.current.scrollHeight}), [activeId, chats])

  const active = chats.find(c => c.id === activeId) || chats[0]
  const filtered = useMemo(() => chats.filter(c => c.name.toLowerCase().includes(query.toLowerCase())), [chats, query])

  function sendMessage(text=draft) {
    if (!text.trim()) return
    const message: Message = {id:Date.now(), from:'me', text:text.trim(), time:now(), read:true}
    setChats(list => list.map(c => c.id === activeId ? {...c, preview:text.trim(), time:now(), messages:[...c.messages,message]} : c))
    setDraft(''); setShowEmoji(false)
  }

  function sendVoice() {
    if (!recording) { setRecording(true); return }
    setRecording(false)
    const message: Message = {id:Date.now(), from:'me', text:'', time:now(), read:true, type:'voice', duration:'0:08'}
    setChats(list => list.map(c => c.id === activeId ? {...c, preview:'🎙 Voice message · 0:08', time:now(), messages:[...c.messages,message]} : c))
  }

  function openChat(id:number) { setActiveId(id); setMobileChat(true); setChats(cs=>cs.map(c=>c.id===id?{...c,unread:0}:c)) }
  async function installApp() {
    if (!installPrompt) return
    await installPrompt.prompt()
    const result = await installPrompt.userChoice
    if (result.outcome === 'accepted') setInstallPrompt(null)
  }

  return (
    <div className={`app theme-${theme} ${dark ? 'dark' : ''}`}>
      {installPrompt && <div className="install-banner"><LumaMark className="mini-logo"/><span><strong>Install Luma</strong><small>Get the full-screen app on this device</small></span><button onClick={installApp}><Download/> Install</button><button className="dismiss" onClick={()=>setInstallPrompt(null)}><X/></button></div>}
      <nav className="rail">
        <LumaMark className="brand-mark"/>
        <div className="rail-main">
          <NavIcon active={section==='chats'} label="Chats" badge={chats.reduce((a,c)=>a+c.unread,0)} onClick={()=>setSection('chats')}><MessageCircle/></NavIcon>
          <NavIcon active={section==='updates'} label="Updates" onClick={()=>setSection('updates')}><Radio/></NavIcon>
          <NavIcon active={section==='calls'} label="Calls" onClick={()=>setSection('calls')}><PhoneCall/></NavIcon>
          <NavIcon label="Communities"><Users/></NavIcon>
        </div>
        <div className="rail-bottom">
          <button className="icon-button" aria-label="Toggle dark mode" onClick={()=>setDark(!dark)}>{dark?<Sun/>:<Moon/>}</button>
          <button className={`icon-button ${showThemes?'active':''}`} aria-label="Themes" onClick={()=>setShowThemes(!showThemes)}><Palette/></button>
          <div className="my-avatar">YO<span/></div>
        </div>
      </nav>

      {showThemes && <ThemePanel theme={theme} setTheme={setTheme} dark={dark} setDark={setDark} onClose={()=>setShowThemes(false)}/>}

      <aside className={`sidebar ${mobileChat?'mobile-hidden':''}`}>
        <header className="sidebar-head">
          <div><p className="eyebrow">YOUR MESSAGES</p><h1>{section==='chats'?'Chats':section==='updates'?'Updates':'Calls'}</h1></div>
          <button className="new-chat" title="New conversation"><CirclePlus/></button>
        </header>
        <div className="search"><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search conversations"/><kbd>⌘ K</kbd></div>

        {section==='chats' && <>
          <div className="filter-row"><button className="pill active">All</button><button className="pill">Unread</button><button className="pill">Groups</button><button className="archive"><Archive/> Archived</button></div>
          <div className="chat-list">
            {filtered.map(chat=><button key={chat.id} className={`chat-item ${activeId===chat.id?'selected':''}`} onClick={()=>openChat(chat.id)}>
              <Avatar chat={chat}/>
              <div className="chat-copy"><div className="chat-line"><strong>{chat.name}</strong><time>{chat.time}</time></div><div className="chat-line preview"><span>{chat.kind==='channel'&&<Hash/>}{chat.preview}</span><span className="chat-flags">{chat.pinned&&<Pin/>}{chat.muted&&<BellOff/>}{chat.unread>0&&<b>{chat.unread}</b>}</span></div></div>
            </button>)}
          </div>
        </>}
        {section==='updates' && <Updates/>}
        {section==='calls' && <Calls onCall={(type)=>setShowCall(type)}/>}
      </aside>

      <main className={`conversation ${mobileChat?'mobile-show':''}`}>
        <header className="conversation-head">
          <button className="back" onClick={()=>setMobileChat(false)}><ChevronLeft/></button>
          <button className="contact-title" onClick={()=>setShowInfo(!showInfo)}><Avatar chat={active}/><span><strong>{active.name}</strong><small>{active.kind==='channel'?active.members:active.kind==='group'?active.members:active.online?'online':'last seen recently'}</small></span></button>
          <div className="head-actions">
            <button onClick={()=>setShowCall('video')}><Video/></button><button onClick={()=>setShowCall('audio')}><Phone/></button><button onClick={()=>setShowInfo(!showInfo)}><PanelLeftClose/></button><button><MoreVertical/></button>
          </div>
        </header>

        <div className="messages" ref={messagesRef}>
          <div className="encryption-note"><LockKeyhole/> Messages and calls are end-to-end encrypted. No one outside this chat can read or listen to them.</div>
          <div className="date-separator"><span>Today</span></div>
          {active.messages.map((m,i)=><MessageBubble key={m.id} message={m} showTail={i===active.messages.length-1 || active.messages[i+1]?.from!==m.from}/>) }
          {recording && <div className="recording-hint"><span/> Recording voice message… tap the microphone to send</div>}
        </div>

        <footer className="composer">
          {showAttach && <AttachMenu onClose={()=>setShowAttach(false)}/>} 
          {showEmoji && <EmojiPanel onPick={e=>setDraft(draft+e)}/>} 
          <button className={showAttach?'active':''} onClick={()=>{setShowAttach(!showAttach);setShowEmoji(false)}}><Plus/></button>
          <button className={showEmoji?'active':''} onClick={()=>{setShowEmoji(!showEmoji);setShowAttach(false)}}><Smile/></button>
          <textarea rows={1} value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage()}}} placeholder={recording?'Recording…':'Write a message'} />
          {draft.trim()?<button className="send" onClick={()=>sendMessage()}><Send/></button>:<button className={`mic ${recording?'recording':''}`} onClick={sendVoice}><Mic/></button>}
        </footer>
      </main>

      {showInfo && <InfoPanel chat={active} onClose={()=>setShowInfo(false)}/>} 
      {showCall && <CallModal chat={active} type={showCall} onClose={()=>setShowCall(null)}/>} 
    </div>
  )
}

function NavIcon({children,label,active,badge,onClick}:{children:React.ReactNode,label:string,active?:boolean,badge?:number,onClick?:()=>void}) { return <button className={`rail-item ${active?'active':''}`} onClick={onClick} data-label={label}>{children}{!!badge&&<b>{badge}</b>}</button> }
function Avatar({chat,large=false}:{chat:Chat,large?:boolean}) { return <div className={`avatar ${large?'large':''}`} style={{background:`linear-gradient(145deg, ${chat.color}, color-mix(in srgb, ${chat.color} 55%, #101828))`}}>{chat.avatar}{chat.online&&<i/>}</div> }

function MessageBubble({message,showTail}:{message:Message,showTail:boolean}) {
  if(message.type==='voice') return <div className={`bubble ${message.from==='me'?'mine':'theirs'} ${showTail?'tail':''}`}><div className="voice"><button><Play/></button><div className="wave">{Array.from({length:29},(_,i)=><i key={i} style={{height:5+((i*7)%17)}}/> )}</div><small>{message.duration}</small></div><Meta m={message}/></div>
  if(message.type==='file') return <div className={`bubble ${message.from==='me'?'mine':'theirs'} ${showTail?'tail':''}`}><div className="file-card"><div><FileText/></div><span><strong>Luma icon library.fig</strong><small>18.4 MB · Figma file</small></span><button><Download/></button></div><p>{message.text}</p><Meta m={message}/></div>
  return <div className={`bubble ${message.from==='me'?'mine':'theirs'} ${showTail?'tail':''}`}><p>{message.text}</p><Meta m={message}/></div>
}
function Meta({m}:{m:Message}) { return <span className="meta">{m.time}{m.from==='me'&&<CheckCheck className={m.read?'read':''}/>}</span> }

function EmojiPanel({onPick}:{onPick:(x:string)=>void}) { const emojis='😀 😃 😄 😁 😆 🥹 😂 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 🤩 🥳 😎 🤓 🧐 🤔 🫡 🤗 🫢 🤭 🤫 🫠 😴 🤤 😋 😜 🤪 👍 👏 🙌 ❤️ ✨ 🔥 🎉 💯 🚀'.split(' '); return <div className="emoji-panel"><div className="emoji-search">Frequently used</div><div>{emojis.map(e=><button key={e} onClick={()=>onPick(e)}>{e}</button>)}</div></div> }
function AttachMenu({onClose}:{onClose:()=>void}) { const items=[[Image,'Photos & videos'],[Camera,'Camera'],[FileText,'Document'],[Contact,'Contact'],[MapPin,'Location'] ] as const; return <div className="attach-menu">{items.map(([Icon,label],i)=><button key={label} onClick={onClose}><span className={`attach-icon a${i}`}><Icon/></span>{label}</button>)}</div> }

function ThemePanel({theme,setTheme,dark,setDark,onClose}:{theme:string,setTheme:(x:string)=>void,dark:boolean,setDark:(x:boolean)=>void,onClose:()=>void}) { return <div className="theme-panel"><div className="panel-title"><span><Palette/> Appearance</span><button onClick={onClose}><X/></button></div><p>MODE</p><div className="mode-toggle"><button className={!dark?'active':''} onClick={()=>setDark(false)}><Sun/> Light</button><button className={dark?'active':''} onClick={()=>setDark(true)}><Moon/> Dark</button></div><p>COLOR THEME</p><div className="theme-grid">{themes.map(t=><button key={t.id} className={theme===t.id?'active':''} onClick={()=>setTheme(t.id)}><span style={{background:`linear-gradient(135deg,${t.colors[0]},${t.colors[1]})`}}>{theme===t.id&&'✓'}</span>{t.name}</button>)}</div><div className="wallpaper-preview"><Sparkles/><span><strong>Make it yours</strong><small>More wallpapers coming soon</small></span></div>{isSupabaseConfigured&&<button className="sign-out" onClick={()=>{sessionStorage.removeItem('nexa-demo');void supabase.auth.signOut();window.location.reload()}}>Exit demo / sign out</button>}</div> }

function InfoPanel({chat,onClose}:{chat:Chat,onClose:()=>void}) { return <aside className="info-panel"><header><strong>Contact info</strong><button onClick={onClose}><X/></button></header><div className="profile-card"><Avatar chat={chat} large/><h2>{chat.name}</h2><p>{chat.members||'+234 800 123 4567'}</p><div className="profile-actions"><button><Phone/><small>Audio</small></button><button><Video/><small>Video</small></button><button><Search/><small>Search</small></button></div></div><div className="info-section"><p>ABOUT</p><span>Building thoughtful things, one day at a time. ✨</span></div><div className="info-section media"><p>MEDIA, LINKS AND DOCS <b>24 ›</b></p><div><span>🌅</span><span>🏙️</span><span>🎨</span></div></div><div className="info-section options"><button><BellOff/> Mute notifications</button><button><Pin/> Pin conversation</button><button><ShieldCheck/> Encryption <small>Messages are end-to-end encrypted</small></button></div></aside> }

function CallModal({chat,type,onClose}:{chat:Chat,type:'audio'|'video',onClose:()=>void}) { return <div className="modal-backdrop"><div className="call-modal"><div className="call-blur" style={{background:chat.color}}/><button className="call-close" onClick={onClose}><X/></button><Avatar chat={chat} large/><h2>{chat.name}</h2><p>{type==='video'?'Starting video call…':'Calling…'}</p><div className="call-pulse p1"/><div className="call-pulse p2"/><div className="call-controls"><button><Volume2/></button><button><Video/></button><button onClick={onClose} className="hangup"><Phone/></button><button><Mic/></button></div></div></div> }

function Updates(){ return <div className="updates"><p className="list-label">STATUS</p><button className="status-item"><div className="status-ring mine"><div className="my-avatar">YO</div><b>+</b></div><span><strong>My status</strong><small>Tap to add an update</small></span></button><p className="list-label">RECENT UPDATES</p>{initialChats.slice(0,4).map((c,i)=><button className="status-item" key={c.id}><div className="status-ring"><Avatar chat={c}/></div><span><strong>{c.name}</strong><small>{i+2}m ago</small></span></button>)}<p className="list-label">CHANNELS</p><div className="discover-card"><Radio/><strong>Find channels to follow</strong><small>News, creators, sports and more</small><button>Explore channels</button></div></div> }
function Calls({onCall}:{onCall:(x:'audio'|'video')=>void}) { return <div className="calls"><button className="call-link"><span><PhoneCall/></span><div><strong>Create call link</strong><small>Share a link for your Luma call</small></div></button><p className="list-label">RECENT</p>{initialChats.slice(0,4).map((c,i)=><div className="call-item" key={c.id}><Avatar chat={c}/><span><strong>{c.name}</strong><small className={i===2?'missed':''}>↗ {i===0?'Today, 11:24':'Yesterday, 18:04'}</small></span><button onClick={()=>onCall(i%2?'video':'audio')}>{i%2?<Video/>:<Phone/>}</button></div>)}</div> }

export default App
