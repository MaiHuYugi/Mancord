import TextChannel from './TextChannel.jsx';
import SettingsPanel from './SettingsPanel.jsx';
import DirectMessages from './DirectMessages.jsx';
import { supabase } from './supabase.js';
import CommunityNavigation, { ServerRail } from './CommunityNavigation.jsx';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Mic, Settings, Sparkles, X } from 'lucide-react';

export default function Mancord({ profile, email, onProfileChange, onSignOut, signingOut = false, authError = null }) {

  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);

  const [mobileNav, setMobileNav] = useState(true);
  const [dmOpen, setDmOpen] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [serverIndex, setServerIndex] = useState(0);
  const [activeChannelId, setActiveChannelId] = useState('');
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [createChannelType, setCreateChannelType] = useState(null);
  const [channelName, setChannelName] = useState('');
  const [channelDrafts, setChannelDrafts] = useState({});
  const [messageError, setMessageError] = useState('');
  const [channelMessages, setChannelMessages] = useState({});
  const [groupName, setGroupName] = useState('');
  const [groupIcon, setGroupIcon] = useState('');
  const servers = groups.map(group => ({ ...group, textChannels: group.textChannels || [], voiceChannels: group.voiceChannels || [] }));
  const server = serverIndex ? servers[serverIndex - 1] : null;
  const channel = server && [...server.textChannels, ...server.voiceChannels].find(item => item.id === activeChannelId);

  useEffect(()=>{
    const presence=supabase.channel('mancord-online-users',{config:{presence:{key:profile.id}}}).on('presence',{event:'sync'},()=>setOnlineUsers(Object.values(presence.presenceState()).flat().map(item=>item.user_id))).subscribe(async status=>{if(status==='SUBSCRIBED')await presence.track({user_id:profile.id,username:profile.username});});
    return()=>{supabase.removeChannel(presence);};
  },[profile.id,profile.username]);

  async function loadServers() {
    const { data, error } = await supabase.from('servers').select('id,name,owner_id,icon_url,icon_media_type,created_at,channels(id,name,kind,position),server_members(user_id)').order('created_at');
    if (error) { setMessageError(`Could not load servers: ${error.message}`); return []; }
    const loaded = (data || []).map(item => ({ ...item, member_count:(item.server_members||[]).length, glyph:item.name.slice(0,2).toUpperCase(), color:'#35205c', textChannels:(item.channels||[]).filter(channel=>channel.kind==='text'||channel.kind==='announcement'), voiceChannels:(item.channels||[]).filter(channel=>channel.kind==='voice') }));
    setGroups(loaded); setMessageError(''); return loaded;
  }
  useEffect(() => {
    let active=true;
    loadServers();
    const channel=supabase.channel(`server-list:${profile.id}`).on('postgres_changes',{event:'*',schema:'public',table:'server_members'},()=>{if(active)loadServers();}).on('postgres_changes',{event:'*',schema:'public',table:'servers'},()=>{if(active)loadServers();}).on('postgres_changes',{event:'*',schema:'public',table:'channels'},()=>{if(active)loadServers();}).subscribe();
    return ()=>{active=false;supabase.removeChannel(channel);};
  },[profile.id]);
  useEffect(()=>{
    const token=new URLSearchParams(window.location.search).get('invite');
    if(!token)return;
    supabase.rpc('join_server_by_invite',{invite_token:token}).then(async({data:id,error})=>{
      window.history.replaceState({},'',window.location.pathname+window.location.hash);
      if(error){setMessageError(error.message);return;}
      const loaded=await loadServers();setServerIndex(loaded.findIndex(item=>item.id===id)+1);setDmOpen(false);setMobileNav(true);
    });
  },[profile.id]);
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
  async function createGroup(event) {
    event.preventDefault();
    const name = groupName.trim();
    if (!name) return;
    const {data:id,error}=await supabase.rpc('create_server',{server_name:name});
    if(error){setMessageError(error.message);return;}
    const loaded=await loadServers(); setServerIndex(loaded.findIndex(item=>item.id===id)+1);
    setActiveChannelId('');
    setGroupName(''); setGroupIcon(''); setCreateGroupOpen(false); setMobileNav(true);
  }
  function openCreateChannel(type) { setCreateChannelType(type); setChannelName(''); }
  async function createChannel(event) {
    event.preventDefault();
    const name = channelName.trim();
    if (!name || !server || !createChannelType) return;
    const kind=createChannelType==='text'?'text':'voice';
    const {data:item,error}=await supabase.from('channels').insert({server_id:server.id,name,kind}).select('id,name,kind,server_id').single();
    if(error){setMessageError(error.message);return;}
    setActiveChannelId(item.id);
    setCreateChannelType(null);
    setChannelName('');
    setMobileNav(false);
  }
  async function submitMessage(attachment = null) {
    const text = (channelDrafts[activeChannelId] || '').trim();
    if ((!text && !attachment) || !channel || !server?.textChannels.some(item => item.id === channel.id)) return false;
    if(attachment){setMessageError('File sharing is not available in live chat yet.');return false;}
    const {error}=await supabase.from('messages').insert({channel_id:channel.id,author_id:profile.id,body:text});
    if(error){setMessageError(error.message);return false;}
    setChannelDrafts(current => ({ ...current, [channel.id]: '' }));
    setMessageError('');
    return true;
  }
  useEffect(()=>{
    if(!channel||!server?.textChannels.some(item=>item.id===channel.id)){setChannelMessages(current=>({...current,[activeChannelId]:[]}));return;}
    let active=true;
    const refresh=async()=>{const {data,error}=await supabase.from('messages').select('id,channel_id,author_id,body,created_at,profiles(id,username,display_name,avatar_url,avatar_media_type)').eq('channel_id',channel.id).order('created_at');if(!active)return;if(error){setMessageError(error.message);return;}setChannelMessages(current=>({...current,[channel.id]:(data||[]).map(item=>({id:item.id,text:item.body,createdAt:item.created_at,author:item.profiles}))}));};
    refresh();
    const subscription=supabase.channel(`messages:${channel.id}`).on('postgres_changes',{event:'*',schema:'public',table:'messages',filter:`channel_id=eq.${channel.id}`},refresh).subscribe();
    return()=>{active=false;supabase.removeChannel(subscription);};
  },[channel?.id,server?.id]);
  async function deleteGroup(groupId) {
    const groupToDelete = groups.find(group => group.id === groupId);
    if (!groupToDelete) return;
    const {error}=await supabase.from('servers').delete().eq('id',groupId);
    if(error){setMessageError(error.message);return;}
    await loadServers();
    setServerIndex(0);
    setActiveChannelId('');

    setSettingsOpen(false);
    setSettingsKind('profile');
    setMobileNav(true);
  }
  async function renameChannel(groupId, channelId, name) {
    const {error}=await supabase.from('channels').update({name}).eq('id',channelId).eq('server_id',groupId);
    if(error)setMessageError(error.message);
  }
  async function deleteChannel(groupId, channelId) {
    const {error}=await supabase.from('channels').delete().eq('id',channelId).eq('server_id',groupId);
    if(error){setMessageError(error.message);return;}
    setChannelMessages(current=>{const next={...current};delete next[channelId];return next;});
    setChannelDrafts(current => { const next = { ...current }; delete next[channelId]; return next; });
    if (activeChannelId === channelId) { setActiveChannelId(''); setMobileNav(true); }
  }
  function renameCategory(groupId, categoryId, name) { setGroups(current => current.map(group => group.id === groupId ? { ...group, categories: (group.categories || []).map(item => item.id === categoryId ? { ...item, name } : item) } : group)); }
  function deleteCategory(groupId, categoryId) { setGroups(current => current.map(group => group.id === groupId ? { ...group, categories: (group.categories || []).filter(item => item.id !== categoryId) } : group)); }
  function createCategory(groupId) { const category = { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, name: 'New category' }; setGroups(current => current.map(group => group.id === groupId ? { ...group, categories: [...(group.categories || []), category] } : group)); }
  async function addServerMember(groupId,userId){const {error}=await supabase.rpc('add_server_member',{target_server:groupId,target_user:userId});if(!error)await loadServers();return {error};}

  return <main className={`app-shell ${mobileNav ? "channels-visible" : "chat-visible"}`}>
    <ServerRail servers={servers} selected={serverIndex} onHome={()=>{setDmOpen(true);setMobileNav(false);}} onSelect={index=>{setDmOpen(false);setServerIndex(index);setActiveChannelId('');setMobileNav(true);}} onCreate={()=>setCreateGroupOpen(true)} profile={profile} onSettings={()=>openSettings()}/>
    <CommunityNavigation visible={mobileNav} server={server} showWelcome={!server && groups.length===0} channels={{text:server?.textChannels || [],voice:server?.voiceChannels || []}} activeChannelId={activeChannelId} onDirectMessages={()=>{setDmOpen(true);setMobileNav(false);}} onSelectChannel={id=>{setDmOpen(false);setActiveChannelId(id);setMessageError('');setMobileNav(false);}} onCreateChannel={openCreateChannel} onCreateGroup={()=>setCreateGroupOpen(true)} onServerSettings={()=>server && openSettings('server')} onSettings={()=>openSettings()} onNotice={toast} profile={profile} muted={muted} onMute={()=>setMuted(!muted)} deafened={deafened} onDeafen={()=>setDeafened(!deafened)}/>

    <section className="chat-column">
      {messageError && !channel && !dmOpen && <p className="global-chat-error" role="alert">{messageError}</p>}
      {dmOpen && <DirectMessages profile={profile} servers={servers} onlineUsers={onlineUsers} onJoinedServer={async id=>{const loaded=await loadServers();setServerIndex(loaded.findIndex(item=>item.id===id)+1);setDmOpen(false);setMobileNav(true);}} onBackChannels={()=>{setDmOpen(false);setMobileNav(true);}}/>}
      {!dmOpen && <>
      {!server && groups.length === 0 && <div className="channel-welcome mancord-welcome"><h1>Welcome to Mancord</h1></div>}
      {server && channel && (server.textChannels.some(item => item.id === channel.id)
        ? <TextChannel key={channel.id} channel={channel} profile={profile} messages={channelMessages[channel.id] || []} draft={channelDrafts[channel.id] || ''} onDraftChange={value => setChannelDrafts(current => ({ ...current, [channel.id]: value }))} onSend={submitMessage} onBack={() => { setActiveChannelId(''); setMobileNav(true); }} error={messageError}/>
        : <><header className="topbar"><button type="button" className="mobile-menu" aria-label="Back to channels" onClick={() => setMobileNav(true)}><ArrowLeft size={20}/></button><div className="top-channel"><Mic size={18}/><strong>{channel.name}</strong></div><div className="topbar-actions"><button type="button" className="settings-trigger" aria-label="Group settings" onClick={() => openSettings('server')}><Settings size={19}/></button></div></header><div className="group-empty-space"/></>)}
      {server && !channel && <div className="group-empty-space"/>}
      </>}
    </section>
    <dialog ref={settingsDialog} className="settings-dialog" aria-label="Settings" onClose={()=>setSettingsOpen(false)}>
      <SettingsPanel key={settingsKind} kind={settingsKind} profile={profile} email={email} server={server || servers[serverIndex - 1]} onBack={()=>setSettingsOpen(false)} onDeleteServer={()=>server && deleteGroup(server.id)} onRenameChannel={renameChannel} onDeleteChannel={deleteChannel} onRenameCategory={renameCategory} onDeleteCategory={deleteCategory} onCreateCategory={()=>server && createCategory(server.id)} onAddMember={addServerMember} onProfileChange={onProfileChange} onSignOut={onSignOut} signingOut={signingOut} authError={authError}/>
    </dialog>
    {notice && <div className="toast"><Sparkles size={15} />{notice}<button onClick={() => setNotice('')} aria-label="Dismiss"><X size={14} /></button></div>}
    {createGroupOpen && <div className="group-create-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setCreateGroupOpen(false);}}><form className="group-create-dialog" onSubmit={createGroup} aria-labelledby="create-group-title"><button type="button" className="group-create-close" aria-label="Close" onClick={()=>setCreateGroupOpen(false)}><X size={18}/></button><h2 id="create-group-title">Create a group</h2><p>Choose a name and, if you like, an icon.</p><label>Group name<input autoFocus required maxLength={40} value={groupName} onChange={event=>setGroupName(event.target.value)} placeholder="Group name"/></label><fieldset className="group-icon-picker"><legend>Group icon <span>Optional</span></legend><div>{[String.fromCodePoint(0x1F3AE),String.fromCodePoint(0x1F3B5),String.fromCodePoint(0x1F4BB),String.fromCodePoint(0x1F916),String.fromCodePoint(0x1F3A8),String.fromCodePoint(0x1F4DA),String.fromCodePoint(0x1F3C6),String.fromCodePoint(0x1F3AC),String.fromCodePoint(0x1F30D),String.fromCodePoint(0x1F355),String.fromCodePoint(0x2728),String.fromCodePoint(0x1F331)].map(icon=><button key={icon} type="button" className={groupIcon===icon?'selected':''} aria-label={icon} aria-pressed={groupIcon===icon} onClick={()=>setGroupIcon(groupIcon===icon?'':icon)}>{icon}</button>)}</div></fieldset><button className="group-create-submit" type="submit">Save group</button></form></div>}
    {createChannelType && <div className="group-create-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setCreateChannelType(null);}}><form className="group-create-dialog channel-create-dialog" onSubmit={createChannel} aria-labelledby="create-channel-title"><button type="button" className="group-create-close" aria-label="Close" onClick={()=>setCreateChannelType(null)}><X size={18}/></button><h2 id="create-channel-title">Create {createChannelType} channel</h2><p>Add a {createChannelType} channel to <strong>{server?.name}</strong>.</p><label>Channel name<input autoFocus required maxLength={50} value={channelName} onChange={event=>setChannelName(event.target.value)} placeholder={createChannelType==='text'?'e.g. project-chat':'e.g. Hangout'}/></label><button className="group-create-submit" type="submit">Create channel</button></form></div>}
  </main>;
}
