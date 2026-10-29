import { useEffect, useState } from 'react';
import Avatar from './Avatar.jsx';

const friends = [
  { id: 'ava', name: 'Ava Chen', color: 'blue', last: 'Hey, how are you?' },
  { id: 'noah', name: 'Noah Williams', color: 'green', last: 'See you later!' },
  { id: 'mia', name: 'Mia Patel', color: 'pink', last: 'That sounds fun.' },
];

export default function DirectMessages({ profile, onBackChannels }) {
  const [selected, setSelected] = useState(null);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState(() => { try { return JSON.parse(localStorage.getItem(`mancord:dms:${profile.id}`) || '{}'); } catch { return {}; } });
  useEffect(() => { try { localStorage.setItem(`mancord:dms:${profile.id}`, JSON.stringify(messages)); } catch {} }, [messages, profile.id]);
  const current = friends.find(friend => friend.id === selected);
  function send(event) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !current) return;
    setMessages(items => ({ ...items, [current.id]: [...(items[current.id] || []), text] }));
    setDraft('');
  }
  return <section className="dm-page" aria-label="Direct messages">
    <aside className="dm-list"><div className="dm-list-title"><h1>Direct Messages</h1><button type="button" onClick={onBackChannels}>Channels</button></div><h2>Friends</h2>{friends.map(friend=><button type="button" key={friend.id} className={`dm-friend ${selected===friend.id?'selected':''}`} onClick={()=>setSelected(friend.id)}><Avatar person={{avatar:friend.name[0],color:friend.color}}/><span><strong>{friend.name}</strong><small>{messages[friend.id]?.at(-1)||friend.last}</small></span></button>)}</aside>
    <div className={`dm-conversation ${current?'open':''}`}>{current?<><header><button type="button" className="dm-back" aria-label="Back to friends" onClick={()=>setSelected(null)}>‹</button><Avatar person={{avatar:current.name[0],color:current.color}}/><strong>{current.name}</strong><span>Online</span></header><div className="dm-messages">{(messages[current.id]||[]).length===0?<p>Start a conversation with {current.name}.</p>:(messages[current.id]||[]).map((message,index)=><div className="dm-message" key={`${current.id}-${index}`}><Avatar person={{avatar:profile.username?.[0]?.toUpperCase()||'Y',color:'blue'}}/><p><strong>{profile.display_name||profile.username}</strong>{message}</p></div>)}</div><form className="dm-composer" onSubmit={send}><input aria-label={`Message ${current.name}`} value={draft} onChange={event=>setDraft(event.target.value)} placeholder={`Message ${current.name}`}/><button type="submit" disabled={!draft.trim()}>Send</button></form></>:<div className="dm-empty"><h2>Your direct messages</h2><p>Select a friend to open a chat.</p></div>}</div>
  </section>;
}
