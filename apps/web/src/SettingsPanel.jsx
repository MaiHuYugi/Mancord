import { useState } from 'react';
import { LogOut } from 'lucide-react';
import DesignIcon, { Glyph } from './DesignIcon.jsx';
import Avatar from './Avatar.jsx';
import InterestsScreen from './InterestsScreen.jsx';

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

export default function SettingsPanel({ kind, profile, email, server, onBack, onDeleteServer, onSignOut, signingOut, authError }) {
  const [notice, setNotice] = useState('');
  const [interestsOpen, setInterestsOpen] = useState(false);
  const comingSoon = () => setNotice('This option is coming soon.');
  if (interestsOpen) return <InterestsScreen userId={profile.id} onBack={()=>setInterestsOpen(false)} onDone={()=>setInterestsOpen(false)}/>;
  const isServer = kind === 'server';
  const displayName = profile.display_name || profile.username;
  return <section className={`settings-page ${isServer ? 'server-settings-page' : 'profile-settings-page'}`}>
    <header className="settings-page-header"><button type="button" aria-label="Back to channels" onClick={onBack}><DesignIcon name={isServer ? 'serverBack' : 'back'}/></button><h2 id="settings-title">{isServer ? 'Server Settings' : 'Profile Settings'}</h2><span/></header>
    <div className="settings-identity"><div className={`settings-identity-avatar ${isServer ? 'server-identity-avatar' : ''}`}>{isServer ? <Glyph>{server.glyph}</Glyph> : <Avatar person={{ mediaUrl:profile.avatar_url, mediaType:profile.avatar_media_type, avatar:profile.username?.[0]?.toUpperCase() || 'Y', color:'blue' }}/>}<button type="button" className="identity-camera" aria-label={isServer ? 'Edit server icon' : 'Edit avatar'} onClick={comingSoon}><DesignIcon name={isServer ? 'serverCamera' : 'editCamera'}/></button></div><strong>{isServer ? server.name : displayName}</strong><span>{isServer ? '1,284 members' : `@${profile.username}`}</span><button type="button" className="edit-identity" onClick={comingSoon}>{isServer ? 'Edit Server Icon' : 'Edit Avatar'}</button></div>
    {notice && <p className="settings-notice" role="status">{notice}</p>}
    {isServer ? <>
      <SettingsGroup title="Overview"><SettingsRow icon="serverName" label="Server Name" value={server.name} onClick={comingSoon}/><SettingsRow icon="description" label="Server Description" value="A place for gamers" onClick={comingSoon}/><SettingsRow icon="region" label="Server Region" value="US East" onClick={comingSoon}/></SettingsGroup>
      <SettingsGroup title="Members"><SettingsRow icon="members" label="View All Members" onClick={comingSoon}><span className="setting-badge">1,284</span></SettingsRow><SettingsRow icon="invite" label="Invites" value="mancord / gaminghub" onClick={comingSoon}/><SettingsRow icon="bans" label="Bans" value="3 banned" onClick={comingSoon}/></SettingsGroup>
      <SettingsGroup title="Roles & Permissions"><SettingsRow icon="roles" label="Manage Roles" onClick={comingSoon}><span className="setting-roles"><i>Admin</i><i>Moderator</i><i>Member</i></span></SettingsRow><SettingsRow icon="permissions" label="Default Permissions" value="Standard" onClick={comingSoon}/><SettingsRow icon="bots" label="Bot Integrations" value="2 active" onClick={comingSoon}/></SettingsGroup>
      <SettingsGroup title="Channels"><SettingsRow icon="channels" label="Manage Channels" value="7 channels" onClick={comingSoon}/><SettingsRow icon="categories" label="Channel Categories" value="2 categories" onClick={comingSoon}/></SettingsGroup>
      <SettingsGroup title="Danger Zone" danger><SettingsRow icon="transfer" label="Transfer Ownership" danger onClick={comingSoon}/><SettingsRow icon="trash" label="Delete Server" danger onClick={onDeleteServer}/></SettingsGroup>
    </> : <>
      <SettingsGroup title="Account"><SettingsRow icon="user" label="Display Name" value={displayName} onClick={comingSoon}/><SettingsRow icon="mail" label="Email" value={email || 'Signed in'} onClick={comingSoon}/><SettingsRow icon="lock" label="Password" value="••••••••" onClick={comingSoon}/></SettingsGroup>
      <SettingsGroup title="Privacy"><SettingsRow icon="status" label="Online Status" value="Online" onClick={comingSoon}><span className="setting-online"/></SettingsRow><SettingsRow icon="dm" label="Who Can DM Me" value="Friends Only" onClick={comingSoon}/><SettingSwitch icon="activity" label="Show Activity Status" checked/></SettingsGroup>
      <SettingsGroup title="Notifications"><SettingSwitch icon="notifications" label="Push Notifications" checked/><SettingSwitch icon="mention" label="Mention Alerts" checked/><SettingSwitch icon="announcement" label="Server Announcements" checked={false}/></SettingsGroup>
      <SettingsGroup title="Interests"><SettingsRow icon="categories" label="Your interests" onClick={()=>setInterestsOpen(true)}/></SettingsGroup>
      <SettingsGroup title="Developer Option"><SettingSwitch label="Developer mode" checked={false}/></SettingsGroup>
      <SettingsGroup title="Danger Zone" danger><SettingsRow icon="trash" label="Delete Account" danger onClick={comingSoon}/></SettingsGroup>
      {authError && <div className="logout-error" role="alert">{authError}</div>}
      <button type="button" className="settings-logout" disabled={signingOut} onClick={onSignOut}><LogOut size={18}/>{signingOut ? 'Logging out...' : 'Log out'}</button>
    </>}
  </section>;
}
