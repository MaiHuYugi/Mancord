import Avatar from './Avatar.jsx';
import SettingsPanel from './SettingsPanel.jsx';
import CommunityNavigation, { ServerRail } from './CommunityNavigation.jsx';
import { useEffect, useRef, useState } from 'react';
import { Hash, Mic, Send, Settings, Sparkles, X } from 'lucide-react';

export default function Mancord({ profile, email, onSignOut, signingOut = false, authError = null }) {

  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);

  const [mobileNav, setMobileNav] = useState(true);
  const [groups, setGroups] = useState(() => { try { return JSON.parse(localStorage.getItem(`mancord:groups:${profile.id}`)) || []; } catch { return []; } });
  const [serverIndex, setServerIndex] = useState(0);
  const [activeChannelId, setActiveChannelId] = useState('');
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [createChannelType, setCreateChannelType] = useState(null);
  const [channelName, setChannelName] = useState('');
  const [channelDraft, setChannelDraft] = useState('');
  const [channelMessages, setChannelMessages] = useState({});
  const [groupName, setGroupName] = useState('');
  const [groupIcon, setGroupIcon] = useState('');
  const servers = groups.map(group => ({ ...group, textChannels: group.textChannels || [], voiceChannels: group.voiceChannels || [] }));
  const server = serverIndex ? servers[serverIndex - 1] : null;
  const channel = server && [...server.textChannels, ...server.voiceChannels].find(item => item.id === activeChannelId);

  useEffect(() => { localStorage.setItem(`mancord:groups:${profile.id}`, JSON.stringify(groups)); }, [groups, profile.id]);
  const [settingsKind, setSettingsKind] = useState('profile');
  const [notice, setNotice] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsDialog = useRef(null);

  useEffect(() => {
    if (settingsOpen) settingsDialog.current?.showModal();
    else settingsDialog.current?.close();
  }, [settingsOpen]);

  function openSettings(kind = 'profile') { setSettingsKind(kind); setSettingsOpen(true); }

  function toast(text) { setNotice(text); window.setTimeout(() => setNotice(''), 2800); }
  function createGroup(event) {
    event.preventDefault();
    const name = groupName.trim();
    if (!name) return;
    const group = { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, name, glyph: groupIcon || name.slice(0, 2).toUpperCase(), color: '#35205c', textChannels: [], voiceChannels: [] };
    setGroups(current => [...current, group]);
    setServerIndex(groups.length + 1);
    setActiveChannelId('');
    setGroupName(''); setGroupIcon(''); setCreateGroupOpen(false); setMobileNav(true);
  }
  function openCreateChannel(type) { setCreateChannelType(type); setChannelName(''); }
  function createChannel(event) {
    event.preventDefault();
    const name = channelName.trim();
    if (!name || !server || !createChannelType) return;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const key = createChannelType === 'text' ? 'textChannels' : 'voiceChannels';
    setGroups(current => current.map(group => group.id === server.id ? { ...group, [key]: [...(group[key] || []), { id, name }] } : group));
    setActiveChannelId(id);
    setCreateChannelType(null);
    setChannelName('');
    setMobileNav(false);
  }
  function submitMessage(event) {
    event.preventDefault();
    const text = channelDraft.trim();
    if (!text || !channel || !server || !server.textChannels.some(item => item.id === channel.id)) return;
    setChannelMessages(current => ({ ...current, [channel.id]: [...(current[channel.id] || []), text] }));
    setChannelDraft('');
  }
  function deleteGroup(groupId) {
    const groupToDelete = groups.find(group => group.id === groupId);
    if (!groupToDelete) return;
    const channelIds = [...(groupToDelete.textChannels || []), ...(groupToDelete.voiceChannels || [])].map(item => item.id);
    setGroups(current => current.filter(group => group.id !== groupId));
    setChannelMessages(current => Object.fromEntries(Object.entries(current).filter(([id]) => !channelIds.includes(id))));
    setServerIndex(0);
    setActiveChannelId('');
    setChannelDraft('');
    setSettingsOpen(false);
    setSettingsKind('profile');
    setMobileNav(true);
  }

  return <main className={`app-shell ${mobileNav ? "channels-visible" : "chat-visible"}`}>
    <ServerRail servers={servers} selected={serverIndex} onSelect={index=>{setServerIndex(index);setActiveChannelId('');setMobileNav(true);}} onCreate={()=>setCreateGroupOpen(true)} profile={profile} onSettings={()=>openSettings()}/>
    <CommunityNavigation visible={mobileNav} server={server} showWelcome={!server && groups.length===0} channels={{text:server?.textChannels || [],voice:server?.voiceChannels || []}} activeChannelId={activeChannelId} onSelectChannel={id=>{setActiveChannelId(id);setMobileNav(false);}} onCreateChannel={openCreateChannel} onCreateGroup={()=>setCreateGroupOpen(true)} onServerSettings={()=>server && openSettings('server')} onSettings={()=>openSettings()} onNotice={toast} profile={profile} muted={muted} onMute={()=>setMuted(!muted)} deafened={deafened} onDeafen={()=>setDeafened(!deafened)}/>

    <section className="chat-column">{!server && groups.length===0 && <div className="channel-welcome mancord-welcome"><h1>Welcome to Mancord</h1></div>}{server && <>{channel && <header className="topbar"><div className="top-channel">{channel.type === 'voice' || server.voiceChannels.some(item=>item.id===channel.id) ? <Mic size={18}/> : <Hash size={18}/>}<strong>{channel.name}</strong></div><div className="topbar-actions"><button type="button" className="settings-trigger" aria-label="Group settings" title="Group settings" onClick={()=>openSettings('server')}><Settings size={19}/></button></div></header>}{channel && (server.textChannels.some(item=>item.id===channel.id) ? <><div className="message-list channel-message-list">{(channelMessages[channel.id] || []).map((message,index)=><article className="message" key={`${channel.id}-${index}`}><Avatar person={{avatar:profile.username?.[0]?.toUpperCase() || 'Y',color:'blue'}}/><div className="message-content"><div className="message-byline"><strong>{profile.display_name || profile.username}</strong><span>Just now</span></div><p>{message}</p></div></article>)}</div><form className="composer" onSubmit={submitMessage}><input value={channelDraft} onChange={event=>setChannelDraft(event.target.value)} placeholder={`Message #${channel.name}`} aria-label={`Message ${channel.name}`}/><button type="submit" aria-label="Send message"><Send size={18}/></button></form></> : <div className="group-empty-space"/> )}{!channel && <div className="group-empty-space"/>}</>}</section>
    <dialog ref={settingsDialog} className="settings-dialog" aria-label="Settings" onClose={()=>setSettingsOpen(false)}>
      <SettingsPanel key={settingsKind} kind={settingsKind} profile={profile} email={email} server={server || servers[serverIndex - 1]} onBack={()=>setSettingsOpen(false)} onDeleteServer={()=>server && deleteGroup(server.id)} onSignOut={onSignOut} signingOut={signingOut} authError={authError}/>
    </dialog>
    {notice && <div className="toast"><Sparkles size={15} />{notice}<button onClick={() => setNotice('')} aria-label="Dismiss"><X size={14} /></button></div>}
    {createGroupOpen && <div className="group-create-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setCreateGroupOpen(false);}}><form className="group-create-dialog" onSubmit={createGroup} aria-labelledby="create-group-title"><button type="button" className="group-create-close" aria-label="Close" onClick={()=>setCreateGroupOpen(false)}><X size={18}/></button><h2 id="create-group-title">Create a group</h2><p>Choose a name and, if you like, an icon.</p><label>Group name<input autoFocus required maxLength={40} value={groupName} onChange={event=>setGroupName(event.target.value)} placeholder="Group name"/></label><fieldset className="group-icon-picker"><legend>Group icon <span>Optional</span></legend><div>{[String.fromCodePoint(0x1F3AE),String.fromCodePoint(0x1F3B5),String.fromCodePoint(0x1F4BB),String.fromCodePoint(0x1F916),String.fromCodePoint(0x1F3A8),String.fromCodePoint(0x1F4DA),String.fromCodePoint(0x1F3C6),String.fromCodePoint(0x1F3AC),String.fromCodePoint(0x1F30D),String.fromCodePoint(0x1F355),String.fromCodePoint(0x2728),String.fromCodePoint(0x1F331)].map(icon=><button key={icon} type="button" className={groupIcon===icon?'selected':''} aria-label={icon} aria-pressed={groupIcon===icon} onClick={()=>setGroupIcon(groupIcon===icon?'':icon)}>{icon}</button>)}</div></fieldset><button className="group-create-submit" type="submit">Save group</button></form></div>}
    {createChannelType && <div className="group-create-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setCreateChannelType(null);}}><form className="group-create-dialog channel-create-dialog" onSubmit={createChannel} aria-labelledby="create-channel-title"><button type="button" className="group-create-close" aria-label="Close" onClick={()=>setCreateChannelType(null)}><X size={18}/></button><h2 id="create-channel-title">Create {createChannelType} channel</h2><p>Add a {createChannelType} channel to <strong>{server?.name}</strong>.</p><label>Channel name<input autoFocus required maxLength={50} value={channelName} onChange={event=>setChannelName(event.target.value)} placeholder={createChannelType==='text'?'e.g. project-chat':'e.g. Hangout'}/></label><button className="group-create-submit" type="submit">Create channel</button></form></div>}
  </main>;
}
