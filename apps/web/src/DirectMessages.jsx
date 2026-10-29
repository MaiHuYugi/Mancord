import { useEffect, useState } from 'react';
import Avatar from './Avatar.jsx';
import { supabase } from './supabase.js';

export default function DirectMessages({ profile, servers, onlineUsers = [], onBackChannels, onJoinedServer }) {
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [notice, setNotice] = useState('');
  const current = users.find(user => user.id === selected);

  useEffect(() => {
    let active = true;
    const load = async () => { const { data, error } = await supabase.from('profiles').select('id,username,display_name,avatar_url,avatar_media_type').neq('id', profile.id).order('username'); if (active && !error) setUsers(data || []); if (active && error) setNotice(error.message); };
    load();
    const channel=supabase.channel(`profile-list:${profile.id}`).on('postgres_changes',{event:'*',schema:'public',table:'profiles'},load).subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
  }, [profile.id, profile.username]);

  useEffect(() => {
    if (!current) { setMessages([]); return; }
    let active = true;
    const refresh = async () => {
      const { data, error } = await supabase.from('direct_messages').select('id,sender_id,recipient_id,body,created_at').or(`and(sender_id.eq.${profile.id},recipient_id.eq.${current.id}),and(sender_id.eq.${current.id},recipient_id.eq.${profile.id})`).order('created_at');
      if (!active) return;
      if (error) { setNotice(error.message); return; }
      setMessages(data || []);
    };
    refresh();
    const channel = supabase.channel(`dm:${[profile.id,current.id].sort().join(':')}`).on('postgres_changes', { event: '*', schema: 'public', table: 'direct_messages' }, payload => {
      const item = payload.new || payload.old;
      if (item && [item.sender_id,item.recipient_id].includes(profile.id) && [item.sender_id,item.recipient_id].includes(current.id)) refresh();
    }).subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
  }, [profile.id, current?.id]);

  async function send(event, body = draft.trim()) {
    event?.preventDefault?.();
    if (!body || !current) return;
    const { error } = await supabase.from('direct_messages').insert({ sender_id: profile.id, recipient_id: current.id, body });
    if (error) setNotice(error.message); else { setDraft(''); setNotice(''); }
  }
  async function sendInvite(server) {
    const { data: token, error } = await supabase.rpc('create_server_invite', { target_server: server.id });
    if (error) { setNotice(error.message); return; }
    const link = `${window.location.origin}/?invite=${encodeURIComponent(token)}`;
    await send(null, `Join my server ${server.name}: ${link}`);
  }
  async function joinInvite(token) {
    const { data: serverId, error } = await supabase.rpc('join_server_by_invite', { invite_token: token });
    if (error) { setNotice(error.message); return; }
    setNotice('You joined the server.'); onJoinedServer?.(serverId);
  }

  return <section className="dm-page" aria-label="Direct messages">
    <aside className="dm-list"><div className="dm-list-title"><h1>Direct Messages</h1><button type="button" onClick={onBackChannels}>Channels</button></div><h2>Mancord members</h2>
      {users.length===0?<p className="dm-status">No other registered users yet.</p>:users.map(user=>{const isOnline=onlineUsers.includes(user.id);return <button type="button" key={user.id} className={`dm-friend ${selected===user.id?'selected':''}`} onClick={()=>setSelected(user.id)}><Avatar person={{mediaUrl:user.avatar_url,mediaType:user.avatar_media_type,avatar:user.username?.[0]?.toUpperCase()||'?',color:'blue'}}/><span><strong>{user.display_name||user.username}</strong><small>{isOnline?'Online':'Offline'} · @{user.username}</small></span><i className={isOnline?'online':''}/></button>;})}
    </aside>
    <div className={`dm-conversation ${current?'open':''}`}>{current?<><header><button type="button" className="dm-back" aria-label="Back to users" onClick={()=>setSelected(null)}>‹</button><Avatar person={{mediaUrl:current.avatar_url,mediaType:current.avatar_media_type,avatar:current.username?.[0]?.toUpperCase()||'?',color:'blue'}}/><strong>{current.display_name||current.username}</strong><span>{onlineUsers.includes(current.id)?'Online':'Offline'}</span><details className="dm-invite"><summary>Invite to server</summary><div>{(servers||[]).map(server=><button key={server.id} type="button" onClick={()=>sendInvite(server)}>{server.name}</button>)}</div></details></header><div className="dm-messages">{messages.length===0?<p>Start a conversation with {current.display_name||current.username}.</p>:messages.map(item=>{const invite=item.body.match(/[?&]invite=([a-zA-Z0-9]+)|mancord:\/\/invite\/([a-zA-Z0-9]+)/);const token=invite?.[1]||invite?.[2];return <div className={`dm-message ${item.sender_id===profile.id?'sent':''}`} key={item.id}><Avatar person={{mediaUrl:item.sender_id===profile.id?profile.avatar_url:current.avatar_url,mediaType:item.sender_id===profile.id?profile.avatar_media_type:current.avatar_media_type,avatar:(item.sender_id===profile.id?profile.username:current.username)?.[0]?.toUpperCase()||'?',color:'blue'}}/><p><strong>{item.sender_id===profile.id?(profile.display_name||profile.username):(current.display_name||current.username)}</strong>{item.body}{token&&<button type="button" className="dm-join-invite" onClick={()=>joinInvite(token)}>Join server</button>}<time>{new Date(item.created_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</time></p></div>;})}</div><form className="dm-composer" onSubmit={send}><input aria-label={`Message ${current.display_name||current.username}`} value={draft} onChange={event=>setDraft(event.target.value)} placeholder={`Message ${current.display_name||current.username}`}/><button type="submit" disabled={!draft.trim()}>Send</button></form></>:<div className="dm-empty"><h2>Your direct messages</h2><p>Choose a signed-in member to chat or invite them to your server.</p></div>}{notice&&<p className="dm-notice" role="status">{notice}</p>}</div>
  </section>;
}
