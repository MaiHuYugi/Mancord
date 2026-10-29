import { useEffect, useState } from 'react';
import { LogOut } from 'lucide-react';
import DesignIcon, { Glyph } from './DesignIcon.jsx';
import Avatar from './Avatar.jsx';
import { supabase } from './supabase.js';

function SettingsRow({ icon, label, value, onClick, danger = false, children }) {
  return <button type="button" className={`setting-row ${danger ? 'danger' : ''}`} onClick={onClick}>
    <span className="setting-row-icon">{icon && <DesignIcon name={icon}/>}</span><span className="setting-label">{label}</span>
    {value && <span className="setting-value">{value}</span>}{children}<DesignIcon name={icon === 'transfer' ? 'transferRight' : danger ? 'dangerRight' : 'right'}/>
  </button>;
}
function SettingSwitch({ icon, label, checked }) {
  return <div className="setting-row"><span className="setting-row-icon">{icon && <DesignIcon name={icon}/>}</span><span className="setting-label">{label}</span><button type="button" className="setting-switch" role="switch" aria-label={label} aria-checked={checked} disabled title="Coming soon"><span/></button></div>;
}
function SettingsGroup({ title, children, danger = false }) { return <section className={`settings-group ${danger ? 'danger-group' : ''}`}><h3>{title}</h3><div>{children}</div></section>; }

export default function SettingsPanel({ kind, profile, email, server, onBack, onDeleteServer, onRenameChannel, onDeleteChannel, onRenameCategory, onDeleteCategory, onCreateCategory, onAddMember, onProfileChange, onSignOut, signingOut, authError }) {
  const [notice, setNotice] = useState('');
  const [profileEditor, setProfileEditor] = useState(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [manage, setManage] = useState(null);
  const [editing, setEditing] = useState(null);
  const [value, setValue] = useState('');
  const [inviteUsers,setInviteUsers]=useState([]);
  const [inviteLoading,setInviteLoading]=useState(false);
  const [addingUser,setAddingUser]=useState(null);
  const comingSoon = () => setNotice('This option is coming soon.');
  const isServer = kind === 'server';
  const displayName = profile.display_name || profile.username;
  const channels = [...(server?.textChannels || []).map(item => ({...item,type:'Text'})), ...(server?.voiceChannels || []).map(item => ({...item,type:'Voice'}))];
  const categories = server?.categories || [];
  const beginEdit = (type,item) => { setEditing({type,id:item.id}); setValue(item.name); };
  const saveEdit = event => { event.preventDefault(); const name=value.trim(); if(!name)return; if(editing.type==='channel')onRenameChannel?.(server.id,editing.id,name); else onRenameCategory?.(server.id,editing.id,name); setEditing(null); };
  useEffect(()=>{
    if(manage!=='invite-users')return;
    let active=true;setInviteLoading(true);
    supabase.from('profiles').select('id,username,display_name,avatar_url,avatar_media_type').neq('id',profile.id).order('username').then(({data,error})=>{if(!active)return;setInviteUsers(error?[]:(data||[]));if(error)setNotice(error.message);setInviteLoading(false);});
    return()=>{active=false;};
  },[manage,profile.id]);
  async function addMember(user){setAddingUser(user.id);const result=await onAddMember?.(server.id,user.id);setAddingUser(null);const error=result?.error;if(error)setNotice(error.message);else setNotice(`${user.display_name||user.username} added to ${server.name}.`);}
  async function saveProfile(event) {
    event.preventDefault();
    const username=profileEditor.username.trim().toLowerCase(), display_name=profileEditor.displayName.trim();
    if(!/^[a-z0-9_]{3,24}$/.test(username)){setNotice('Use 3–24 characters for your username: lowercase letters, numbers, or underscores.');return;}
    if(!display_name||display_name.length>32){setNotice('Display name must be 1–32 characters.');return;}
    setProfileSaving(true);setNotice('');
    const {data,error}=await supabase.from('profiles').update({username,display_name}).eq('id',profile.id).select('id,username,display_name,avatar_url,avatar_media_type,profile_completed').single();
    setProfileSaving(false);
    if(error){setNotice(error.code==='23505'?'That username is already taken. Try another one.':error.message);return;}
    onProfileChange?.(data);setProfileEditor(null);setNotice('Profile updated.');
  }
  if (manage) return <section className="settings-page server-settings-page">
    <header className="settings-page-header"><button type="button" aria-label="Back to server settings" onClick={()=>{setManage(null);setEditing(null);}}><DesignIcon name="serverBack"/></button><h2>{manage==='channels'?'Manage Channels':manage==='invite-users'?'Invite Users':'Channel Categories'}</h2><span/></header>
    {manage==='invite-users'?<div className="invite-user-list">{inviteLoading?<p className="channel-manager-empty">Loading users…</p>:inviteUsers.length===0?<p className="channel-manager-empty">No other users are registered yet.</p>:inviteUsers.map(user=>{const member=(server.server_members||[]).some(item=>item.user_id===user.id);return <div className="invite-user-row" key={user.id}><Avatar person={{mediaUrl:user.avatar_url,mediaType:user.avatar_media_type,avatar:user.username?.[0]?.toUpperCase()||'?',color:'blue'}}/><span><strong>{user.display_name||user.username}</strong><small>@{user.username}</small></span><button type="button" disabled={member||addingUser===user.id} onClick={()=>addMember(user)}>{member?'Added':addingUser===user.id?'Adding…':'Add'}</button></div>;})}</div>:null}
    {manage==='categories'&&<button type="button" className="channel-manager-add" onClick={onCreateCategory}>＋ Add category</button>}
    {(manage==='channels'?channels:categories).length===0?<p className="channel-manager-empty">{manage==='channels'?'This server has no channels yet.':'This server has no categories yet.'}</p>:(manage==='channels'?channels:categories).map(item=><div className="channel-manager-row" key={item.id}>
      {editing?.id===item.id&&editing.type===(manage==='channels'?'channel':'category')?<form onSubmit={saveEdit} className="channel-manager-edit"><input autoFocus aria-label={`Rename ${item.name}`} maxLength={50} value={value} onChange={event=>setValue(event.target.value)}/><button type="submit">Save</button><button type="button" onClick={()=>setEditing(null)}>Cancel</button></form>:<><span className="channel-manager-name">{manage==='channels'?<small>{item.type}</small>:null}{item.name}</span><button type="button" onClick={()=>beginEdit(manage==='channels'?'channel':'category',item)}>Rename</button><button type="button" className="channel-manager-delete" onClick={()=>manage==='channels'?onDeleteChannel?.(server.id,item.id):onDeleteCategory?.(server.id,item.id)}>Delete</button></>}
    </div>)}
  </section>;
  return <section className={`settings-page ${isServer ? 'server-settings-page' : 'profile-settings-page'}`}>
    <header className="settings-page-header"><button type="button" aria-label="Back to channels" onClick={onBack}><DesignIcon name={isServer ? 'serverBack' : 'back'}/></button><h2 id="settings-title">{isServer ? 'Server Settings' : 'Profile Settings'}</h2><span/></header>
    <div className="settings-identity"><div className={`settings-identity-avatar ${isServer ? 'server-identity-avatar' : ''}`}>{isServer ? <Glyph>{server.glyph}</Glyph> : <Avatar person={{ mediaUrl:profile.avatar_url, mediaType:profile.avatar_media_type, avatar:profile.username?.[0]?.toUpperCase() || 'Y', color:'blue' }}/>}<button type="button" className="identity-camera" aria-label={isServer ? 'Edit server icon' : 'Edit avatar'} onClick={comingSoon}><DesignIcon name={isServer ? 'serverCamera' : 'editCamera'}/></button></div><strong>{isServer ? server.name : displayName}</strong><span>{isServer ? `${server.member_count||0} members` : `@${profile.username}`}</span><button type="button" className="edit-identity" onClick={comingSoon}>{isServer ? 'Edit Server Icon' : 'Edit Avatar'}</button></div>
    {notice && <p className="settings-notice" role="status">{notice}</p>}
    {isServer ? <>
      <SettingsGroup title="Overview"><SettingsRow icon="serverName" label="Server Name" value={server.name} onClick={comingSoon}/><SettingsRow icon="description" label="Server Description" value={server.description||''} onClick={comingSoon}/></SettingsGroup>
      <SettingsGroup title="Members"><SettingsRow icon="members" label="View All Members" onClick={comingSoon}><span className="setting-badge">{server.member_count||0}</span></SettingsRow><SettingsRow icon="invite" label="Invite Users" onClick={()=>setManage('invite-users')}/><SettingsRow icon="bans" label="Bans" value="3 banned" onClick={comingSoon}/></SettingsGroup>
      <SettingsGroup title="Channels"><SettingsRow icon="channels" label="Manage Channels" value={`${channels.length} channels`} onClick={()=>setManage('channels')}/></SettingsGroup>
      <SettingsGroup title="Danger Zone" danger><SettingsRow icon="trash" label="Delete Server" danger onClick={onDeleteServer}/></SettingsGroup>
    </> : <>
      <SettingsGroup title="Account"><SettingsRow icon="user" label="Username & Display Name" value={`@${profile.username}`} onClick={()=>setProfileEditor({username:profile.username||'',displayName:profile.display_name||profile.username||''})}/><SettingsRow icon="mail" label="Email" value={email || 'Signed in'} onClick={comingSoon}/><SettingsRow icon="lock" label="Password" value="••••••••" onClick={comingSoon}/></SettingsGroup>
      <SettingsGroup title="Privacy"><SettingsRow icon="status" label="Online Status" value="Online" onClick={comingSoon}><span className="setting-online"/></SettingsRow><SettingsRow icon="dm" label="Who Can DM Me" value="Friends Only" onClick={comingSoon}/><SettingSwitch icon="activity" label="Show Activity Status" checked/></SettingsGroup>
      <SettingsGroup title="Notifications"><SettingSwitch icon="notifications" label="Push Notifications" checked/><SettingSwitch icon="mention" label="Mention Alerts" checked/><SettingSwitch icon="announcement" label="Server Announcements" checked={false}/></SettingsGroup>
      <SettingsGroup title="Developer Option"><SettingSwitch label="Developer mode" checked={false}/></SettingsGroup>
      <SettingsGroup title="Danger Zone" danger><SettingsRow icon="trash" label="Delete Account" danger onClick={comingSoon}/></SettingsGroup>
      {authError && <div className="logout-error" role="alert">{authError}</div>}
      <button type="button" className="settings-logout" disabled={signingOut} onClick={onSignOut}><LogOut size={18}/>{signingOut ? 'Logging out...' : 'Log out'}</button>
    </>}
    {profileEditor&&<div className="profile-edit-backdrop"><form className="profile-edit-dialog" onSubmit={saveProfile} aria-label="Edit username and display name"><h3>Edit Profile</h3><label>Username<input autoFocus autoCapitalize="none" autoCorrect="off" maxLength={24} value={profileEditor.username} onChange={event=>setProfileEditor(current=>({...current,username:event.target.value}))}/></label><label>Display name<input maxLength={32} value={profileEditor.displayName} onChange={event=>setProfileEditor(current=>({...current,displayName:event.target.value}))}/></label>{notice&&<p role="alert">{notice}</p>}<div><button type="button" onClick={()=>setProfileEditor(null)} disabled={profileSaving}>Cancel</button><button type="submit" disabled={profileSaving}>{profileSaving?'Saving...':'Save changes'}</button></div></form></div>}
  </section>;
}
