import { useMemo, useState } from 'react';
import { Activity, Bell, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Gift, Hash, Headphones, Image, Inbox, LogOut, Mic, MicOff, MoreHorizontal, Plus, Search, Send, Smile, Sparkles, Sticker, Users, Video, Volume2, Wifi, X } from 'lucide-react';

const initialMessages = [
  { name: 'Mira', tag: 'mira.wav', time: 'Today at 10:42 AM', color: 'lavender', avatar: 'M', text: 'Morning, everyone! I pushed the new visual direction into the board ✨' },
  { name: 'Kai', tag: 'kaicode', time: 'Today at 10:45 AM', color: 'mint', avatar: 'K', text: 'This is coming together so nicely. The colors feel much calmer now.' },
  { name: 'Noah', tag: 'noah.jpg', time: 'Today at 10:47 AM', color: 'peach', avatar: 'N', text: 'Agreed! I can take a look at the mobile flow after lunch.' },
  { name: 'Mira', tag: 'mira.wav', time: 'Today at 10:51 AM', color: 'lavender', avatar: 'M', text: 'Perfect. I left a few notes in #design-corner for the spacing.' },
];

const channelGroups = [
  { title: 'START HERE', channels: [['welcome', '✳'], ['introductions', '♧'], ['announcements', '◉']] },
  { title: 'THE LOUNGE', channels: [['general', '#'], ['design-corner', '#'], ['share-your-work', '#'], ['resources', '#']] },
];
const people = [ ['Mira', 'Online', 'lavender', 'M'], ['Kai', 'Online · Listening to music', 'mint', 'K'], ['Noah', 'Idle', 'peach', 'N'], ['June', 'Do not disturb', 'rose', 'J'] ];

function Avatar({ person, small = false }) {
  const isVideo = person.mediaType?.startsWith('video/');
  return <div className={`avatar ${person.color || 'blue'} ${small ? 'small' : ''} ${person.mediaUrl ? 'media-avatar' : ''}`}>
    {person.mediaUrl ? (isVideo ? <video src={person.mediaUrl} autoPlay muted loop playsInline /> : <img src={person.mediaUrl} alt="" />) : person.avatar}
    <i />
  </div>;
}

export default function Mancord({ profile, onSignOut }) {
  const [channel, setChannel] = useState('general');
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState('');
  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [inVoice, setInVoice] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [notice, setNotice] = useState('');
  const visibleMessages = useMemo(() => messages, [messages]);

  function submit(event) {
    event.preventDefault();
    if (!draft.trim()) return;
    setMessages([...messages, { name: 'You', tag: 'you', time: 'Just now', color: 'blue', avatar: 'Y', text: draft.trim() }]);
    setDraft('');
  }
  function toast(text) { setNotice(text); window.setTimeout(() => setNotice(''), 2800); }

  return <main className="app-shell">
    <aside className={`server-rail ${mobileNav ? 'show' : ''}`}>
      <button className="server-logo" aria-label="Mancord home">m<span>.</span></button>
      <div className="rail-divider" />
      <button className="server-icon selected" aria-label="The little corner"><span>✿</span><i /></button>
      <button className="server-icon add-server" onClick={() => toast('Server creation is coming soon.')} aria-label="Add a server"><Plus size={21} /></button>
      <div className="rail-spacer" />
      <button className="server-icon" aria-label="Inbox"><Inbox size={19} /></button>
      <button className="server-icon" aria-label="Help"><CircleHelp size={19} /></button>
      <Avatar person={{ color: 'blue', avatar: profile?.username?.[0]?.toUpperCase() || 'Y', mediaUrl: profile?.avatar_url, mediaType: profile?.avatar_media_type }} small />
    </aside>

    <aside className={`channel-sidebar ${mobileNav ? 'show' : ''}`}>
      <button className="server-heading" onClick={() => toast('Server settings are coming soon.')}><span>The little corner</span><ChevronDown size={17} /></button>
      <div className="channel-scroll">
        {channelGroups.map(group => <section className="channel-group" key={group.title}>
          <div className="group-heading">{group.title}<button aria-label={`Add to ${group.title}`} onClick={() => toast('Channel creation is coming soon.')}><Plus size={15} /></button></div>
          {group.channels.map(([name, icon]) => <button key={name} className={`channel-row ${channel === name ? 'active' : ''}`} onClick={() => { setChannel(name); setMobileNav(false); }}><span className="channel-glyph">{icon === '#' ? <Hash size={17} /> : icon}</span><span>{name}</span>{name === 'general' && <span className="unread-dot" />}</button>)}
        </section>)}
        <section className="channel-group"><div className="group-heading">VOICE HANGOUT<button aria-label="Add voice channel" onClick={() => toast('Voice channels are coming soon.')}><Plus size={15} /></button></div>
          <button className="channel-row voice-row" onClick={() => setInVoice(!inVoice)}><Volume2 size={17} /><span>the cozy room</span></button>
          {inVoice && <div className="voice-presence"><span>●</span> You joined the room</div>}
          <button className="channel-row voice-row" onClick={() => toast('Voice connection will be available when the audio service is connected.')}><Volume2 size={17} /><span>late night talks</span></button>
        </section>
        <section className="channel-group dm-group"><div className="group-heading">DIRECT MESSAGES<button aria-label="New message" onClick={() => toast('Direct messages are coming soon.')}><Plus size={15} /></button></div>
          {[['June', 'rose', 'J'], ['Ari', 'yellow', 'A'], ['Sage', 'mint', 'S']].map(([name, color, avatar]) => <button key={name} className="dm-row" onClick={() => toast(`DMs with ${name} are coming soon.`)}><Avatar person={{ name, color, avatar }} small /><span>{name}</span><MoreHorizontal size={16} /></button>)}
        </section>
      </div>
      <div className="user-panel"><Avatar person={{ color: 'blue', avatar: profile?.username?.[0]?.toUpperCase() || 'Y', mediaUrl: profile?.avatar_url, mediaType: profile?.avatar_media_type }} small /><div className="user-meta"><strong>{profile?.username || 'member'}</strong><span>online</span></div><button aria-label="Mute" onClick={() => setMuted(!muted)}>{muted ? <MicOff size={17} /> : <Mic size={17} />}</button><button aria-label="Sign out" title="Sign out" onClick={onSignOut}><LogOut size={17} /></button></div>
    </aside>

    <section className="chat-column">
      <header className="topbar"><button className="mobile-menu" aria-label="Open channels" onClick={() => setMobileNav(!mobileNav)}><ChevronLeft size={20} /></button><div className="top-channel"><Hash size={19} /><strong>{channel}</strong></div><div className="topbar-divider" /><span className="channel-topic">a little place to make things together</span><div className="topbar-actions"><button aria-label="Notifications" onClick={() => toast('You’re all caught up!')}><Bell size={19} /></button><button aria-label="Pinned messages" onClick={() => toast('No pinned messages yet.')}><Sparkles size={19} /></button><button className="member-toggle" aria-label="Members"><Users size={19} /></button><button aria-label="Search"><Search size={19} /></button><button className="inbox-top" aria-label="Inbox"><Inbox size={19} /></button><button aria-label="Help"><CircleHelp size={19} /></button></div></header>
      <div className="message-list">
        <div className="channel-welcome"><div className="welcome-icon"><Hash size={25} /></div><h1>Welcome to #{channel}!</h1><p>This is the beginning of the <strong>#{channel}</strong> channel.</p><button onClick={() => toast('Channel details are coming soon.')}><Sparkles size={15} /> Make it yours</button></div>
        <div className="date-divider"><span>Today</span></div>
        {visibleMessages.map((message, index) => <article className="message" key={`${message.name}-${index}`}><Avatar person={message} /><div className="message-content"><div className="message-byline"><strong>{message.name}</strong>{message.name === 'Mira' && <span className="role-tag">MOD</span>}<span>{message.time}</span></div><p>{message.text}</p>{index === 0 && <div className="attachment"><div className="attachment-art"><div /><div /><div /><Sparkles size={17} /></div><div className="attachment-caption"><Image size={15} /><span>moodboard-v3.png</span><span>2.4 MB</span></div></div>}</div></article>)}
      </div>
      <form className="composer" onSubmit={submit}><button type="button" className="attach-button" aria-label="Attach file" onClick={() => toast('File uploads will be available when storage is connected.')}><Plus size={21} /></button><input value={draft} onChange={event => setDraft(event.target.value)} placeholder={`Message #${channel}`} aria-label={`Message ${channel}`} /><button type="button" aria-label="Gift Nitro feature" onClick={() => toast('All Mancord perks are free ✨')}><Gift size={20} /></button><button type="button" aria-label="GIF" onClick={() => toast('GIF picker is coming soon.')}><Sticker size={20} /></button><button type="button" aria-label="Emoji" onClick={() => setDraft(draft + ' ✨')}><Smile size={20} /></button><button type="submit" className="send-button" aria-label="Send message"><Send size={18} /></button></form>
      <footer className="voice-bar"><div className={`voice-status ${inVoice ? 'connected' : ''}`}><span className="voice-indicator"><Wifi size={16} /></span><div><strong>{inVoice ? 'Voice connected' : 'Voice activity'}</strong><span>{inVoice ? 'The cozy room' : 'Voice is ready when you are'}</span></div></div><div className="voice-controls"><button className={muted ? 'control-on' : ''} aria-label={muted ? 'Unmute microphone' : 'Mute microphone'} onClick={() => setMuted(!muted)}>{muted ? <MicOff size={18} /> : <Mic size={18} />}</button><button className={deafened ? 'control-on' : ''} aria-label={deafened ? 'Enable audio' : 'Deafen'} onClick={() => setDeafened(!deafened)}><Headphones size={18} /></button><button aria-label="Start video" onClick={() => toast('Camera calls will be available when voice services are connected.')}><Video size={18} /></button><button className="screen-button" onClick={() => toast('Screen sharing will be available when voice services are connected.')}><Activity size={17} /><span>Share screen</span></button></div></footer>
    </section>

    <aside className="member-sidebar"><div className="member-heading"><span>MEMBERS — 4</span><button aria-label="Member options"><MoreHorizontal size={18} /></button></div><div className="member-section"><span className="member-section-title">AROUND</span>{people.map(person => <div className="member-row" key={person[0]}><Avatar person={{ color: person[2], avatar: person[3] }} /><div><strong>{person[0]}</strong><span>{person[1]}</span></div></div>)}</div><div className="free-perks"><div className="perks-icon"><Sparkles size={18} /></div><strong>Good things, free.</strong><p>Make your space yours. Every Mancord perk is here for everyone.</p><button onClick={() => toast('More customization is on its way.')}>Explore perks <ChevronRight size={14} /></button></div></aside>
    {notice && <div className="toast"><Sparkles size={15} />{notice}<button onClick={() => setNotice('')} aria-label="Dismiss"><X size={14} /></button></div>}
    {mobileNav && <button className="nav-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
  </main>;
}
