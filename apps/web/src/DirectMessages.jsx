import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, Home, MessageCircle, Search, Send, Settings, SquarePen, Users, X } from 'lucide-react';
import Avatar from './Avatar.jsx';
import { supabase } from './supabase.js';

const displayName = user => user.display_name || user.username;
const avatarPerson = user => ({ mediaUrl: user.avatar_url, mediaType: user.avatar_media_type, avatar: user.username?.[0]?.toUpperCase() || '?', color: 'blue' });
const matches = (user, query) => `${displayName(user)} ${user.username}`.toLowerCase().includes(query.trim().toLowerCase());
const readKey = id => `mancord:dm-read:${id}`;
function savedReads(id) {
  try { return JSON.parse(localStorage.getItem(readKey(id))) || {}; } catch { return {}; }
}
function relativeTime(value, now) {
  const minutes = Math.max(0, Math.floor((now - new Date(value).getTime()) / 60000));
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
  if (minutes < 10080) return `${Math.floor(minutes / 1440)}d`;
  return new Date(value).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function PeoplePicker({ open, onClose, users, loading, error, onlineUsers, onMessage, onGroupCreated }) {
  const dialog = useRef(null);
  const busyRef = useRef(false);
  // Retain completed steps so a failed request can be retried without duplicate groups.
  const progress = useRef(null);
  const [mode, setMode] = useState('message');
  const [query, setQuery] = useState('');
  const [chosen, setChosen] = useState([]);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');
  const locked = !!progress.current;

  useEffect(() => {
    if (open && !dialog.current.open) dialog.current.showModal();
    if (!open && dialog.current.open) dialog.current.close();
  }, [open]);

  function close() { if (!busyRef.current) onClose(); }
  function switchMode(value) {
    if (locked) return;
    setMode(value); setChosen([]); setFailure('');
  }
  async function submit(event) {
    event.preventDefault();
    if (busyRef.current || !chosen.length || (mode === 'group' && !name.trim())) return;
    if (mode === 'message') { onMessage(chosen[0]); onClose(); return; }
    busyRef.current = true; setBusy(true); setFailure('');
    try {
      if (!progress.current) {
        const { data, error } = await supabase.rpc('create_server', { server_name: name.trim() });
        if (error) throw error;
        progress.current = { serverId: data, channelId: null, added: new Set() };
      }
      const step = progress.current;
      if (!step.channelId) {
        const { data, error } = await supabase.from('channels').insert({ server_id: step.serverId, name: 'group-chat', kind: 'text' }).select('id').single();
        if (error) throw error;
        step.channelId = data.id;
      }
      for (const id of chosen) {
        if (step.added.has(id)) continue;
        const { error } = await supabase.rpc('add_server_member', { target_server: step.serverId, target_user: id });
        if (error) throw error;
        step.added.add(id);
      }
      await onGroupCreated(step.serverId, step.channelId);
      progress.current = null; setChosen([]); setName(''); setQuery(''); onClose();
    } catch (error) {
      setFailure(`${progress.current ? 'Your group was created. Retry to finish setting it up. ' : ''}${error.message || 'Could not create the group. Please try again.'}`);
    } finally { busyRef.current = false; setBusy(false); }
  }

  return <dialog ref={dialog} className="dm-people-dialog" aria-labelledby="dm-picker-title" onClose={onClose} onCancel={event => { event.preventDefault(); close(); }} onClick={event => {
    if (event.target !== event.currentTarget) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close();
  }}><form onSubmit={submit}>
    <div className="dm-picker-heading"><div><h2 id="dm-picker-title">{mode === 'group' ? 'Create a group' : 'New message'}</h2><p>{mode === 'group' ? 'Bring your people together in a group channel.' : 'Find someone and start a conversation.'}</p></div><button type="button" aria-label="Close people picker" disabled={busy} onClick={close}><X size={20}/></button></div>
    <div className="dm-picker-tabs" aria-label="Conversation type"><button type="button" aria-pressed={mode === 'message'} disabled={busy || locked} onClick={() => switchMode('message')}><MessageCircle size={16}/>Message</button><button type="button" aria-pressed={mode === 'group'} disabled={busy || locked} onClick={() => switchMode('group')}><Users size={16}/>Create group</button></div>
    {mode === 'group' && <label className="dm-group-label">Group name<input required maxLength={80} placeholder="Give your group a name" value={name} disabled={busy || locked} onChange={event => setName(event.target.value)}/></label>}
    <label className="dm-search"><Search size={19}/><input autoFocus aria-label="Search people" placeholder="Search name or username" value={query} onChange={event => setQuery(event.target.value)}/></label>
    <div className="dm-picker-people" aria-label="People">
      {loading ? <p className="dm-state" role="status">Loading people…</p> : error ? <p className="dm-state" role="alert">{error}</p> : users.filter(user => matches(user, query)).map(user => <button type="button" key={user.id} className="dm-person-option" aria-pressed={chosen.includes(user.id)} disabled={busy || locked} onClick={() => setChosen(ids => mode === 'message' ? [user.id] : ids.includes(user.id) ? ids.filter(id => id !== user.id) : [...ids, user.id])}><span className={`dm-avatar ${onlineUsers.includes(user.id) ? 'is-online' : ''}`}><Avatar person={avatarPerson(user)}/></span><span><strong>{displayName(user)}</strong><small>@{user.username}</small></span><span className="dm-person-check">{chosen.includes(user.id) && <Check size={15}/>}</span></button>)}
      {!loading && !error && !users.some(user => matches(user, query)) && <p className="dm-state">{query ? 'No people match your search.' : 'No other members yet. Invite someone to Mancord to get started.'}</p>}
    </div>
    {failure && <p className="dm-picker-error" role="alert">{failure}</p>}
    <footer className="dm-picker-footer"><span>{chosen.length ? `${chosen.length} selected` : 'Choose your people'}</span><button type="submit" disabled={busy || loading || !chosen.length || (mode === 'group' && !name.trim())}>{busy ? 'Creating…' : locked ? 'Retry setup' : mode === 'group' ? 'Create group' : 'Start message'}</button></footer>
  </form></dialog>;
}

export default function DirectMessages({ profile, servers = [], onlineUsers = [], onBackChannels, onJoinedServer, onGroupCreated, onSettings }) {
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [notice, setNotice] = useState('');
  const [peopleError, setPeopleError] = useState('');
  const [loadingPeople, setLoadingPeople] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [messageError, setMessageError] = useState('');
  const [query, setQuery] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [reads, setReads] = useState(() => savedReads(profile.id));
  const [opened, setOpened] = useState([]);
  const [now, setNow] = useState(Date.now());
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const messageList = useRef(null);
  const nearBottom = useRef(true);
  const current = users.find(user => user.id === selected);
  const draft = drafts[selected] || '';

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    let request = 0;
    const load = async () => {
      const version = ++request;
      try {
        const { data, error } = await supabase.from('profiles').select('id,username,display_name,avatar_url,avatar_media_type').neq('id', profile.id).order('username');
        if (!active || version !== request) return;
        if (error) throw error;
        setUsers(data || []); setPeopleError('');
      } catch (error) { if (active && version === request) setPeopleError(error.message); }
      finally { if (active && version === request) setLoadingPeople(false); }
    };
    load();
    const channel = supabase.channel(`profile-list:${profile.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, load).subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
  }, [profile.id]);

  useEffect(() => {
    let active = true;
    let request = 0;
    const load = async () => {
      const version = ++request;
      try {
        const items = [];
        // Page past Supabase's response cap so older conversations remain available.
        for (let start = 0; ; start += 1000) {
          const { data, error } = await supabase.from('direct_messages').select('id,sender_id,recipient_id,body,created_at').or(`sender_id.eq.${profile.id},recipient_id.eq.${profile.id}`).order('created_at').order('id').range(start, start + 999);
          if (!active || version !== request) return;
          if (error) throw error;
          items.push(...(data || []));
          if (!data || data.length < 1000) break;
        }
        setMessages(items); setMessageError('');
      } catch (error) { if (active && version === request) setMessageError(error.message); }
      finally { if (active && version === request) setLoadingMessages(false); }
    };
    load();
    const subscription = supabase.channel(`dm-inbox:${profile.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'direct_messages', filter: `sender_id=eq.${profile.id}` }, load).on('postgres_changes', { event: '*', schema: 'public', table: 'direct_messages', filter: `recipient_id=eq.${profile.id}` }, load).subscribe(status => { if (status === 'SUBSCRIBED') load(); });
    return () => { active = false; supabase.removeChannel(subscription); };
  }, [profile.id]);

  const threads = new Map();
  for (const message of messages) {
    const id = message.sender_id === profile.id ? message.recipient_id : message.sender_id;
    const previous = threads.get(id);
    threads.set(id, { latest: message, unread: (previous?.unread || 0) + (message.sender_id !== profile.id && message.created_at > (reads[id] || '') ? 1 : 0) });
  }
  const conversationMessages = messages.filter(message => message.sender_id === selected || message.recipient_id === selected);
  const latestIncoming = conversationMessages.filter(message => message.sender_id === selected).at(-1)?.created_at;

  useEffect(() => {
    if (!selected || !latestIncoming) return;
    const markRead = () => {
      if (document.visibilityState === 'hidden') return;
      setReads(previous => {
        if ((previous[selected] || '') >= latestIncoming) return previous;
        const next = { ...previous, [selected]: latestIncoming };
        try { localStorage.setItem(readKey(profile.id), JSON.stringify(next)); } catch { /* Storage may be disabled. */ }
        return next;
      });
    };
    markRead();
    document.addEventListener('visibilitychange', markRead);
    return () => document.removeEventListener('visibilitychange', markRead);
  }, [selected, latestIncoming, profile.id]);

  useEffect(() => {
    if (nearBottom.current && messageList.current) messageList.current.scrollTop = messageList.current.scrollHeight;
  }, [selected, conversationMessages.length]);

  function openConversation(id) { nearBottom.current = true; setSelected(id); setOpened(ids => ids.includes(id) ? ids : [...ids, id]); setNotice(''); }
  async function send(event, body) {
    event?.preventDefault?.();
    const text = typeof body === 'string' ? body : draft.trim();
    if (!text || !current || sendingRef.current) return;
    const recipient = current.id;
    sendingRef.current = true; setSending(true); setNotice('');
    try {
      const { data, error } = await supabase.from('direct_messages').insert({ sender_id: profile.id, recipient_id: recipient, body: text }).select('id,sender_id,recipient_id,body,created_at').single();
      if (error) throw error;
      setMessages(items => [...items.filter(item => item.id !== data.id), data].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id)));
      if (typeof body !== 'string') setDrafts(items => items[recipient] === draft ? { ...items, [recipient]: '' } : items);
      nearBottom.current = true;
    } catch (error) { setNotice(error.message || 'Could not send your message. Try again.'); }
    finally { sendingRef.current = false; setSending(false); }
  }
  async function sendInvite(server) {
    try {
      const { data: token, error } = await supabase.rpc('create_server_invite', { target_server: server.id });
      if (error) throw error;
      await send(null, `Join my server ${server.name}: ${window.location.origin}/?invite=${encodeURIComponent(token)}`);
    } catch (error) { setNotice(error.message); }
  }
  async function joinInvite(token) {
    try {
      const { data: serverId, error } = await supabase.rpc('join_server_by_invite', { invite_token: token });
      if (error) throw error;
      await onJoinedServer?.(serverId);
    } catch (error) { setNotice(error.message); }
  }
  const visibleUsers = users.filter(user => (threads.has(user.id) || opened.includes(user.id)) && (matches(user, query) || threads.get(user.id)?.latest.body.toLowerCase().includes(query.trim().toLowerCase()))).sort((a, b) => (threads.get(b.id)?.latest.created_at || '').localeCompare(threads.get(a.id)?.latest.created_at || ''));

  return <section className={`dm-page dm-screen ${current ? 'has-conversation' : ''}`} aria-label="Direct messages">
    <aside className="dm-inbox">
      <header className="dm-inbox-header"><h1>Messages</h1><button type="button" className="dm-compose-button" aria-label="New message or group" title="New message or group" onClick={() => setPickerOpen(true)}><SquarePen size={23}/></button></header>
      <label className="dm-search"><Search size={20}/><input aria-label="Search conversations" placeholder="Search conversations" value={query} onChange={event => setQuery(event.target.value)}/>{query && <button type="button" aria-label="Clear conversation search" onClick={() => setQuery('')}><X size={16}/></button>}</label>
      <div className="dm-thread-list" aria-label="Conversations" aria-busy={loadingPeople || loadingMessages}>
        {loadingPeople || loadingMessages ? <p className="dm-state" role="status">Loading conversations…</p> : visibleUsers.map(user => {
          const thread = threads.get(user.id);
          return <button type="button" key={user.id} className={`dm-thread ${selected === user.id ? 'is-selected' : ''} ${thread?.unread ? 'is-unread' : ''}`} aria-current={selected === user.id ? 'true' : undefined} onClick={() => openConversation(user.id)}><span className={`dm-avatar ${onlineUsers.includes(user.id) ? 'is-online' : ''}`}><Avatar person={avatarPerson(user)}/></span><span className="dm-thread-copy"><strong>{displayName(user)}</strong><span>{thread ? `${thread.latest.sender_id === profile.id ? 'You: ' : ''}${thread.latest.body}` : `Say hello to @${user.username}`}</span></span><span className="dm-thread-meta">{thread && <time dateTime={thread.latest.created_at}>{relativeTime(thread.latest.created_at, now)}</time>}{!!thread?.unread && <span className="dm-unread" aria-label={`${thread.unread} unread messages`}>{thread.unread > 99 ? '99+' : thread.unread}</span>}</span></button>;
        })}
        {!loadingPeople && !loadingMessages && !visibleUsers.length && <div className="dm-inbox-empty"><MessageCircle size={34}/><h2>{query ? 'No conversations found' : 'Your people, one message away'}</h2><p>{query ? 'Try another name or message.' : 'Start a conversation or bring everyone together in a group.'}</p>{!query && <button type="button" onClick={() => setPickerOpen(true)}>Start a conversation</button>}</div>}
      </div>
      <nav className="dm-bottom-nav" aria-label="Messages navigation"><button type="button" onClick={onBackChannels}><span><Home size={23}/></span>Home</button><button type="button" className="is-active" aria-current="page" onClick={() => setSelected(null)}><span><MessageCircle size={23}/></span>Messages</button><button type="button" onClick={() => setPickerOpen(true)}><span><Users size={23}/></span>Friends</button><button type="button" onClick={onSettings}><span><Settings size={23}/></span>Settings</button></nav>
    </aside>
    <div className={`dm-conversation ${current ? 'open' : ''}`}>
      {current ? <><header><button type="button" className="dm-back" aria-label="Back to messages" onClick={() => setSelected(null)}><ArrowLeft size={21}/></button><span className={`dm-avatar ${onlineUsers.includes(current.id) ? 'is-online' : ''}`}><Avatar person={avatarPerson(current)}/></span><div className="dm-chat-person"><strong>{displayName(current)}</strong><small>{onlineUsers.includes(current.id) ? 'Online' : 'Offline'}</small></div><details className="dm-invite"><summary>Invite to server</summary><div>{servers.length ? servers.map(server => <button key={server.id} type="button" onClick={event => { event.currentTarget.closest('details').open = false; sendInvite(server); }}>{server.name}</button>) : <p>No groups to invite to yet.</p>}</div></details></header>
        <div className="dm-messages" ref={messageList} onScroll={event => { const list = event.currentTarget; nearBottom.current = list.scrollHeight - list.scrollTop - list.clientHeight < 80; }} role="log" aria-live="polite" aria-relevant="additions text" aria-label={`Messages with ${displayName(current)}`}>
          {!conversationMessages.length && <p className="dm-chat-start">Start a conversation with {displayName(current)}.</p>}
          {conversationMessages.map(item => {
            const author = item.sender_id === profile.id ? profile : current;
            const invite = item.body.match(/[?&]invite=([a-zA-Z0-9]+)|mancord:\/\/invite\/([a-zA-Z0-9]+)/);
            const token = invite?.[1] || invite?.[2];
            return <div className={`dm-message ${item.sender_id === profile.id ? 'sent' : ''}`} key={item.id}><Avatar person={avatarPerson(author)}/><div><strong>{displayName(author)}</strong><p>{item.body}</p>{token && <button type="button" className="dm-join-invite" onClick={() => joinInvite(token)}>Join server</button>}<time dateTime={item.created_at} title={new Date(item.created_at).toLocaleString()}>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time></div></div>;
          })}
        </div>
        <form className="dm-composer" onSubmit={send}><input aria-label={`Message ${displayName(current)}`} maxLength={4000} value={draft} onChange={event => setDrafts(items => ({ ...items, [selected]: event.target.value }))} placeholder={`Message ${displayName(current)}`}/><button type="submit" aria-label="Send message" disabled={!draft.trim() || sending}><Send size={18}/></button></form></> : <div className="dm-empty"><MessageCircle size={42}/><h2>Your direct messages</h2><p>Pick a conversation or start a new one.</p><button type="button" onClick={() => setPickerOpen(true)}>New message</button></div>}
    </div>
    {(notice || peopleError || messageError) && <div className="dm-notice" role="alert">{notice || peopleError || messageError}<button type="button" aria-label="Dismiss message" onClick={() => { setNotice(''); setPeopleError(''); setMessageError(''); }}><X size={16}/></button></div>}
    <PeoplePicker open={pickerOpen} onClose={() => setPickerOpen(false)} users={users} loading={loadingPeople} error={peopleError} onlineUsers={onlineUsers} onMessage={openConversation} onGroupCreated={onGroupCreated}/>
  </section>;
}
