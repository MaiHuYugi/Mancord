import { MicOff, Plus } from 'lucide-react';
import Avatar from './Avatar.jsx';
import DesignIcon, { Glyph } from './DesignIcon.jsx';

export function ServerRail({ servers, selected, onSelect, onHome, onCreate, profile, onSettings }) {
  return <aside className="server-rail" aria-label="Groups">
    <button type="button" className="design-home" aria-label="Direct messages" title="Direct messages" onClick={onHome}><DesignIcon name="logo"/><DesignIcon name="bolt" className="home-bolt"/></button>
    <nav className="design-servers" aria-label="Your groups">
      {servers.map((server,index)=><button type="button" key={server.id} className={`design-server ${selected===index+1?'selected':''}`} style={{backgroundColor:server.color}} aria-label={server.name} title={server.name} aria-pressed={selected===index+1} onClick={()=>onSelect(index+1)}><Glyph>{server.glyph}</Glyph>{selected===index+1 && <><i className="server-selection"/><i className="server-unread"/></>}</button>)}
      <button type="button" className="design-server design-add-server" aria-label="Create a group" title="Create a group" onClick={onCreate}><DesignIcon name="addServer"/></button>
    </nav>
    <div className="rail-spacer"/><button type="button" className="rail-profile" aria-label="Open profile settings" onClick={onSettings}><Avatar person={{mediaUrl:profile.avatar_url,mediaType:profile.avatar_media_type,avatar:profile.username?.[0]?.toUpperCase() || 'Y',color:'blue'}}/></button>
  </aside>;
}

export default function CommunityNavigation({ visible, server, showWelcome, channels, activeChannelId, onSelectChannel, onDirectMessages, onCreateChannel, onCreateGroup, onServerSettings, onSettings, onNotice, profile, muted, onMute, deafened, onDeafen }) {
  return <aside className={`channel-sidebar ${visible?'show':''}`} aria-label={server ? `${server.name} channels` : 'Groups'}>
    {server && <div className="design-server-heading"><button type="button" className="server-heading" onClick={onServerSettings}>{server.name}<DesignIcon name="down"/></button><button type="button" aria-label="Server notifications" onClick={()=>onNotice('You are all caught up!')}><DesignIcon name="bell"/></button></div>}
    <button type="button" className="mobile-create-group" aria-label="Create a group" title="Create a group" onClick={onCreateGroup}><DesignIcon name="addServer"/></button>
    <button type="button" className="mobile-dm-button" onClick={onDirectMessages}>Direct Messages</button>
    {server && <div className="channel-scroll">
      <section className="channel-group"><div className="group-heading">TEXT CHANNELS<button type="button" aria-label="Add text channel" title="Add text channel" onClick={()=>onCreateChannel('text')}><Plus size={15}/></button></div><div className="design-channel-list">{channels.text.map(item=><button type="button" className={`channel-row ${activeChannelId===item.id?'active':''}`} key={item.id} onClick={()=>onSelectChannel(item.id)}><span className="channel-glyph">#</span><span>{item.name}</span></button>)}</div></section>
      <section className="channel-group"><div className="group-heading">VOICE CHANNELS<button type="button" aria-label="Add voice channel" title="Add voice channel" onClick={()=>onCreateChannel('voice')}><Plus size={15}/></button></div><div className="design-voice-list">{channels.voice.map(item=><button type="button" className={`channel-row voice-row ${activeChannelId===item.id?'active':''}`} key={item.id} onClick={()=>onSelectChannel(item.id)}><DesignIcon name="voice"/><span>{item.name}</span></button>)}</div></section>
    </div>}
    {showWelcome && <div className="mobile-mancord-welcome">Welcome to Mancord</div>}
    <div className="user-panel"><Avatar person={{mediaUrl:profile.avatar_url,mediaType:profile.avatar_media_type,avatar:profile.username?.[0]?.toUpperCase() || 'Y',color:'blue'}}/><div className="user-meta"><strong>{profile.display_name || profile.username}</strong><span>Online</span></div><div className="user-controls"><button type="button" aria-label={muted?'Unmute microphone':'Mute microphone'} aria-pressed={muted} onClick={onMute}>{muted?<MicOff size={16}/>:<DesignIcon name="mic"/>}</button><button type="button" aria-label={deafened?'Enable audio':'Deafen'} aria-pressed={deafened} onClick={onDeafen}><DesignIcon name="headphones"/></button><button type="button" aria-label="Open settings" onClick={onSettings}><DesignIcon name="settings"/></button></div></div>
  </aside>;
}
