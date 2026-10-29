import { useEffect, useRef, useState } from 'react';
import { Send, X } from 'lucide-react';
import Avatar from './Avatar.jsx';
import './text-channel.css';

const asset = name => `/assets/text-channel/${name}.svg`;
const emojis = ['😀', '😂', '❤️', '👍', '🎉', '🔥', '👀', '✨'];

function EmojiIcon() {
  return <span className="channel-emoji-icon" aria-hidden="true">
    <img src={asset('smile')} alt=""/>
    <img className="emoji-eye-left" src={asset('eye')} alt=""/>
    <img className="emoji-eye-right" src={asset('eye')} alt=""/>
    <img className="emoji-mouth" src={asset('mouth')} alt=""/>
  </span>;
}

export default function TextChannel({ channel, profile, messages, draft, onDraftChange, onSend, onBack, error }) {
  const list = useRef(null);
  const input = useRef(null);
  const fileInput = useRef(null);
  const [nearBottom, setNearBottom] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const [attachmentError, setAttachmentError] = useState('');
  const [readingFile, setReadingFile] = useState(false);
  const visibleMessages = search.trim() ? messages.filter(message => `${message.text} ${message.attachment?.name || ''}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())) : messages;

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const resize = () => document.documentElement.style.setProperty('--chat-viewport-height', `${viewport.height}px`);
    resize();
    viewport.addEventListener('resize', resize);
    return () => { viewport.removeEventListener('resize', resize); document.documentElement.style.removeProperty('--chat-viewport-height'); };
  }, []);

  useEffect(() => {
    if (nearBottom && list.current) list.current.scrollTop = list.current.scrollHeight;
  }, [messages, nearBottom]);

  async function submit(event) {
    event.preventDefault();
    if ((!draft.trim() && !attachment) || readingFile) return;
    if (await onSend(attachment)) {
      setAttachment(null);
      setAttachmentError('');
      setEmojiOpen(false);
      setSearch('');
      setNearBottom(true);
    }
    input.current?.focus();
  }

  function addEmoji(emoji) {
    const start = input.current?.selectionStart ?? draft.length;
    const end = input.current?.selectionEnd ?? draft.length;
    onDraftChange(draft.slice(0, start) + emoji + draft.slice(end));
    setEmojiOpen(false);
    requestAnimationFrame(() => { input.current?.focus(); input.current?.setSelectionRange(start + emoji.length, start + emoji.length); });
  }

  async function selectFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setAttachmentError('');
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'text/plain'].includes(file.type) || file.size > 1024 * 1024) {
      setAttachmentError('Choose an image, PDF, or text file up to 1 MB.');
      return;
    }
    setReadingFile(true);
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      setAttachment({ name: file.name, type: file.type, dataUrl });
    } catch { setAttachmentError('Could not read this file. Try again.'); }
    finally { setReadingFile(false); }
  }

  return <section className="text-channel" aria-label={`Text channel ${channel.name}`}>
    <header className="text-channel-header">
      <button type="button" className="channel-back" aria-label="Back to channels" onClick={onBack}><img src={asset('back')} alt=""/></button>
      <span className="channel-header-hash" aria-hidden="true">#</span>
      <div className="channel-heading"><h1>{channel.name}</h1><p><img src={asset('online')} alt=""/>1 Online</p></div>
      <button type="button" className="channel-search-toggle" aria-label="Search messages" aria-expanded={searchOpen} onClick={() => { setSearchOpen(!searchOpen); setSearch(''); }}><img src={asset('search')} alt=""/></button>
    </header>
    {searchOpen && <div className="channel-search"><input autoFocus type="search" aria-label="Search this channel" placeholder={`Search #${channel.name}`} value={search} onChange={event => setSearch(event.target.value)} onKeyDown={event => { if (event.key === 'Escape') { setSearchOpen(false); setSearch(''); } }}/><button type="button" aria-label="Close search" onClick={() => { setSearchOpen(false); setSearch(''); }}><X size={18}/></button></div>}
    <div ref={list} className="text-channel-messages" onScroll={event => {
      const node = event.currentTarget;
      setNearBottom(node.scrollHeight - node.scrollTop - node.clientHeight < 80);
    }}>
      {search.trim() && <p className="channel-search-summary" role="status">{visibleMessages.length ? `${visibleMessages.length} matching message${visibleMessages.length === 1 ? '' : 's'}` : 'No messages found.'}</p>}
      <div role="log" aria-label={`Messages in ${channel.name}`} aria-live="polite" aria-relevant="additions text">
        {visibleMessages.map((message, index) => {
          const date = new Date(message.createdAt);
          const previous = index > 0 ? new Date(visibleMessages[index - 1].createdAt) : null;
          const newDay = !previous || previous.toDateString() !== date.toDateString();
          return <div key={message.id}>
            {newDay && <div className="channel-message-date"><span>{date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</span></div>}
            <article className="message">
              <Avatar person={{ mediaUrl: message.author?.avatar_url || profile.avatar_url, mediaType: message.author?.avatar_media_type || profile.avatar_media_type, avatar: (message.author?.username || profile.username)?.[0]?.toUpperCase() || 'Y', color: 'blue' }}/>
              <div className="message-content">
                <div className="message-byline"><strong>{message.author?.display_name || message.author?.username || profile.display_name || profile.username || 'You'}</strong><time dateTime={message.createdAt} title={date.toLocaleString()}>{date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</time></div>
                {message.text && <p>{message.text}</p>}
                {message.attachment && <a className="channel-file" href={message.attachment.dataUrl} download={message.attachment.name}>{message.attachment.type.startsWith('image/') && <img src={message.attachment.dataUrl} alt={message.attachment.name}/>}<span>{message.attachment.name}</span></a>}
              </div>
            </article>
          </div>;
        })}
      </div>
    </div>
    <div className="channel-composer-area">
    {attachment && <div className="channel-pending-file"><span>{attachment.name}</span><button type="button" aria-label="Remove attachment" onClick={() => setAttachment(null)}><X size={16}/></button></div>}
    {emojiOpen && <div className="channel-emoji-picker" role="group" aria-label="Choose an emoji">{emojis.map(emoji => <button key={emoji} type="button" aria-label={`Insert ${emoji}`} onClick={() => addEmoji(emoji)}>{emoji}</button>)}</div>}
    <form className="text-channel-composer" onSubmit={submit}>
      <input ref={fileInput} hidden type="file" accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,text/plain" onChange={selectFile}/>
      <button type="button" className="channel-add" aria-label="Attach a file" disabled={readingFile} onClick={() => fileInput.current?.click()}><img src={asset('plus')} alt=""/></button>
      <img className="channel-composer-divider" src={asset('divider')} alt=""/>
      <textarea ref={input} rows={1} value={draft} onChange={event => onDraftChange(event.target.value)} placeholder={`Message ${channel.name}`} aria-label={`Message ${channel.name}`} onKeyDown={event => {
        if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); submit(event); }
        if (event.key === 'Escape') setEmojiOpen(false);
      }}/>
      <button type="button" className="channel-emoji-toggle" aria-label="Add emoji" aria-expanded={emojiOpen} onClick={() => setEmojiOpen(!emojiOpen)}><EmojiIcon/></button>
      <button type="submit" className="text-channel-send" disabled={readingFile || (!draft.trim() && !attachment)} aria-label="Send message"><Send size={20}/></button>
    </form>
    {readingFile && <p className="channel-search-summary" role="status">Reading file…</p>}
    {(error || attachmentError) && <p className="text-channel-error" role="alert">{error || attachmentError}</p>}
    </div>
  </section>;
}
