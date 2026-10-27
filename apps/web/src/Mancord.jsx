import TextChannel from './TextChannel.jsx';
import SettingsPanel from './SettingsPanel.jsx';
import CommunityNavigation, { ServerRail } from './CommunityNavigation.jsx';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Mic, Settings, Sparkles, X } from 'lucide-react';

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
  const [channelDrafts, setChannelDrafts] = useState({});
  const [messageError, setMessageError] = useState('');
  const [channelMessages, setChannelMessages] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(`mancord:messages:${profile.id}`) || '{}');
      if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return {};
      return Object.fromEntries(Object.entries(saved).map(([id, messages]) => [id, Array.isArray(messages) ? messages.filter(message => message && typeof message.text === 'string' && typeof message.id === 'string' && Number.isFinite(Date.parse(message.createdAt))) : []]));
    } catch { return {}; }
  });
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
  function saveMessages(next) {
    try {
      localStorage.setItem(`mancord:messages:${profile.id}`, JSON.stringify(next));
      setMessageError('');
      return true;
    } catch {
      setMessageError('Could not save your message on this device. Free up browser storage and try again.');
      return false;
    }
  }
  function submitMessage(attachment = null) {
    const text = (channelDrafts[activeChannelId] || '').trim();
    if ((!text && !attachment) || !channel || !server?.textChannels.some(item => item.id === channel.id)) return false;
    const id = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const message = { id, text, createdAt: new Date().toISOString(), ...(attachment ? { attachment } : {}) };
    const next = { ...channelMessages, [channel.id]: [...(channelMessages[channel.id] || []), message] };
    if (!saveMessages(next)) return false;
    setChannelMessages(next);
    setChannelDrafts(current => ({ ...current, [channel.id]: '' }));
    return true;
  }
  function deleteGroup(groupId) {
    const groupToDelete = groups.find(group => group.id === groupId);
    if (!groupToDelete) return;
    const channelIds = [...(groupToDelete.textChannels || []), ...(groupToDelete.voiceChannels || [])].map(item => item.id);
    setGroups(current => current.filter(group => group.id !== groupId));
    const remainingMessages = Object.fromEntries(Object.entries(channelMessages).filter(([id]) => !channelIds.includes(id)));
    setChannelMessages(remainingMessages);
    saveMessages(remainingMessages);
    setChannelDrafts(current => Object.fromEntries(Object.entries(current).filter(([id]) => !channelIds.includes(id))));
    setServerIndex(0);
    setActiveChannelId('');

    setSettingsOpen(false);
    setSettingsKind('profile');
    setMobileNav(true);
  }

  return <main className={`app-shell ${mobileNav ? "channels-visible" : "chat-visible"}`}>
    <ServerRail servers={servers} selected={serverIndex} onSelect={index=>{setServerIndex(index);setActiveChannelId('');setMobileNav(true);}} onCreate={()=>setCreateGroupOpen(true)} profile={profile} onSettings={()=>openSettings()}/>
    <CommunityNavigation visible={mobileNav} server={server} showWelcome={!server && groups.length===0} channels={{text:server?.textChannels || [],voice:server?.voiceChannels || []}} activeChannelId={activeChannelId} onSelectChannel={id=>{setActiveChannelId(id);setMessageError('');setMobileNav(false);}} onCreateChannel={openCreateChannel} onCreateGroup={()=>setCreateGroupOpen(true)} onServerSettings={()=>server && openSettings('server')} onSettings={()=>openSettings()} onNotice={toast} profile={profile} muted={muted} onMute={()=>setMuted(!muted)} deafened={deafened} onDeafen={()=>setDeafened(!deafened)}/>

    <section className="chat-column">
      {!server && groups.length === 0 && <div className="channel-welcome mancord-welcome"><h1>Welcome to Mancord</h1></div>}
      {server && channel && (server.textChannels.some(item => item.id === channel.id)
        ? <TextChannel key={channel.id} channel={channel} profile={profile} messages={channelMessages[channel.id] || []} draft={channelDrafts[channel.id] || ''} onDraftChange={value => setChannelDrafts(current => ({ ...current, [channel.id]: value }))} onSend={submitMessage} onBack={() => { setActiveChannelId(''); setMobileNav(true); }} error={messageError}/>
        : <><header className="topbar"><button type="button" className="mobile-menu" aria-label="Back to channels" onClick={() => setMobileNav(true)}><ArrowLeft size={20}/></button><div className="top-channel"><Mic size={18}/><strong>{channel.name}</strong></div><div className="topbar-actions"><button type="button" className="settings-trigger" aria-label="Group settings" onClick={() => openSettings('server')}><Settings size={19}/></button></div></header><div className="group-empty-space"/></>)}
      {server && !channel && <div className="group-empty-space"/>}
    </section>
    <dialog ref={settingsDialog} className="settings-dialog" aria-label="Settings" onClose={()=>setSettingsOpen(false)}>
      <SettingsPanel key={settingsKind} kind={settingsKind} profile={profile} email={email} server={server || servers[serverIndex - 1]} onBack={()=>setSettingsOpen(false)} onDeleteServer={()=>server && deleteGroup(server.id)} onSignOut={onSignOut} signingOut={signingOut} authError={authError}/>
    </dialog>
    {notice && <div className="toast"><Sparkles size={15} />{notice}<button onClick={() => setNotice('')} aria-label="Dismiss"><X size={14} /></button></div>}
    {createGroupOpen && <div className="group-create-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setCreateGroupOpen(false);}}><form className="group-create-dialog" onSubmit={createGroup} aria-labelledby="create-group-title"><button type="button" className="group-create-close" aria-label="Close" onClick={()=>setCreateGroupOpen(false)}><X size={18}/></button><h2 id="create-group-title">Create a group</h2><p>Choose a name and, if you like, an icon.</p><label>Group name<input autoFocus required maxLength={40} value={groupName} onChange={event=>setGroupName(event.target.value)} placeholder="Group name"/></label><fieldset className="group-icon-picker"><legend>Group icon <span>Optional</span></legend><div>{[String.fromCodePoint(0x1F3AE),String.fromCodePoint(0x1F3B5),String.fromCodePoint(0x1F4BB),String.fromCodePoint(0x1F916),String.fromCodePoint(0x1F3A8),String.fromCodePoint(0x1F4DA),String.fromCodePoint(0x1F3C6),String.fromCodePoint(0x1F3AC),String.fromCodePoint(0x1F30D),String.fromCodePoint(0x1F355),String.fromCodePoint(0x2728),String.fromCodePoint(0x1F331)].map(icon=><button key={icon} type="button" className={groupIcon===icon?'selected':''} aria-label={icon} aria-pressed={groupIcon===icon} onClick={()=>setGroupIcon(groupIcon===icon?'':icon)}>{icon}</button>)}</div></fieldset><button className="group-create-submit" type="submit">Save group</button></form></div>}
    {createChannelType && <div className="group-create-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setCreateChannelType(null);}}><form className="group-create-dialog channel-create-dialog" onSubmit={createChannel} aria-labelledby="create-channel-title"><button type="button" className="group-create-close" aria-label="Close" onClick={()=>setCreateChannelType(null)}><X size={18}/></button><h2 id="create-channel-title">Create {createChannelType} channel</h2><p>Add a {createChannelType} channel to <strong>{server?.name}</strong>.</p><label>Channel name<input autoFocus required maxLength={50} value={channelName} onChange={event=>setChannelName(event.target.value)} placeholder={createChannelType==='text'?'e.g. project-chat':'e.g. Hangout'}/></label><button className="group-create-submit" type="submit">Create channel</button></form></div>}
  </main>;
}
