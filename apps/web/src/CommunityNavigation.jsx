import { MicOff } from 'lucide-react';
import Avatar from './Avatar.jsx';
import DesignIcon, { Glyph } from './DesignIcon.jsx';

export const servers = [
  { name:'Gaming Hub', glyph:'🎮', color:'#1f3b2d' },
  { name:'Music Room', glyph:'🎵', color:'#3a2140' },
  { name:'Tech Space', glyph:'💻', color:'#1f2f4a' },
  { name:'AI & Science', glyph:'🤖', color:'#4a2f1f' },
  { name:'Art Studio', glyph:'🎨', color:'#1f4a46' },
];

export function ServerRail({ selected, onSelect, onNotice, profile, onSettings }) {
  return <aside className="server-rail" aria-label="Servers"><button type="button" className="design-home" aria-label="Mancord home" onClick={()=>onSelect(0)}><DesignIcon name="logo"/><DesignIcon name="bolt" className="home-bolt"/></button>
    <nav className="design-servers">{servers.map((server,index)=><button type="button" key={server.name} className={`design-server ${selected===index?'selected':''}`} style={{backgroundColor:server.color}} aria-label={server.name} aria-pressed={selected===index} onClick={()=>onSelect(index)}><Glyph>{server.glyph}</Glyph>{selected===index && <><i className="server-selection"/><i className="server-unread"/></>}</button>)}</nav>
    <div className="rail-spacer"/><button type="button" className="design-server design-add-server" aria-label="Add a server" onClick={()=>onNotice('Server creation is coming soon.')}><DesignIcon name="addServer"/></button><button type="button" className="rail-profile" aria-label="Open profile settings" onClick={onSettings}><Avatar person={{mediaUrl:profile.avatar_url,mediaType:profile.avatar_media_type,avatar:profile.username?.[0]?.toUpperCase() || 'Y',color:'blue'}}/></button>
  </aside>;
}

export default function CommunityNavigation({ visible, server, channel, onChannel, onServerSettings, onSettings, onNotice, profile, muted, onMute, deafened, onDeafen, inVoice, onVoice }) {
  return <aside className={`channel-sidebar ${visible?'show':''}`} aria-label={`${server.name} channels`}>
    <div className="design-server-heading"><button type="button" className="server-heading" onClick={onServerSettings}>{server.name}<DesignIcon name="down"/></button><button type="button" aria-label="Server notifications" onClick={()=>onNotice('You’re all caught up!')}><DesignIcon name="bell"/></button></div>
    <div className="channel-scroll">
      <section className="channel-group"><div className="group-heading">TEXT CHANNELS<button type="button" aria-label="Add text channel" onClick={()=>onNotice('Channel creation is coming soon.')}><DesignIcon name="plus"/></button></div><div className="design-channel-list">{['general','announcements','memes','clips'].map(name=><button type="button" className={`channel-row ${channel===name?'active':''}`} key={name} onClick={()=>onChannel(name)}><span className="channel-glyph">#</span><span>{name}</span></button>)}</div></section>
      <section className="channel-group"><div className="group-heading">VOICE CHANNELS<button type="button" aria-label="Add voice channel" onClick={()=>onNotice('Voice channel creation is coming soon.')}><DesignIcon name="plus"/></button></div><div className="design-voice-list">
        <button type="button" className="channel-row voice-row lounge-row" onClick={onVoice} aria-pressed={inVoice}><DesignIcon name="voice"/><span>Lounge</span><span className="voice-participants" aria-hidden="true"><i/><i/><i/></span></button>
        {inVoice && <div className="voice-presence">You joined Lounge</div>}
        <button type="button" className="channel-row voice-row" onClick={()=>onNotice('Voice calls are coming soon.')}><DesignIcon name="voice"/><span>Gaming Room</span><span className="voice-participant" aria-hidden="true"/></button>
        <button type="button" className="channel-row voice-row" onClick={()=>onNotice('Voice calls are coming soon.')}><DesignIcon name="voice"/><span>AFK</span><span className="voice-idle" aria-hidden="true"/></button>
      </div></section>
    </div>
    <div className="user-panel"><Avatar person={{mediaUrl:profile.avatar_url,mediaType:profile.avatar_media_type,avatar:profile.username?.[0]?.toUpperCase() || 'Y',color:'blue'}}/><div className="user-meta"><strong>{profile.display_name || profile.username}</strong><span>Online</span></div><div className="user-controls"><button type="button" aria-label={muted?'Unmute microphone':'Mute microphone'} aria-pressed={muted} onClick={onMute}>{muted?<MicOff size={16}/>:<DesignIcon name="mic"/>}</button><button type="button" aria-label={deafened?'Enable audio':'Deafen'} aria-pressed={deafened} onClick={onDeafen}><DesignIcon name="headphones"/></button><button type="button" aria-label="Open settings" onClick={onSettings}><DesignIcon name="settings"/></button></div></div>
  </aside>;
}
