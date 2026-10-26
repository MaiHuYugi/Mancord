import { useState } from 'react';
import { LoaderCircle, LogOut, X } from 'lucide-react';
import DesignIcon, { Glyph } from './DesignIcon.jsx';
import { ProgressSteps } from './InterestsScreen.jsx';

const avatars = [['🦊','Fox'],['🐼','Panda'],['🐸','Frog'],['🐯','Tiger'],['🐙','Octopus']];
export default function ProfileSetup({ user, form, setField, fileRef, onSelect, onVideoMetadata, onSubmit, onSignOut, busy, error }) {
  const [suggested, setSuggested] = useState('');
  const [preparing, setPreparing] = useState(false);
  const isVideo = form.file?.type.startsWith('video/');
  async function chooseAvatar(glyph, name) {
    setPreparing(true);
    try {
      await document.fonts.load('96px "Noto Emoji"');
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
      const context = canvas.getContext('2d'); context.fillStyle = '#2d1b4e'; context.fillRect(0,0,256,256);
      context.fillStyle = '#fafafa'; context.font = '128px "Noto Emoji"'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText(glyph,128,138);
      const blob = await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
      if (blob) { onSelect(new File([blob],`${name.toLowerCase()}-avatar.png`,{type:'image/png'})); setSuggested(name); }
    } finally { setPreparing(false); }
  }
  return <main className="auth-backdrop"><section className="profile-setup-screen" aria-labelledby="profile-title"><ProgressSteps/>
    <h1 id="profile-title">Make it yours</h1><p>Add a profile photo and a username to personalize your Mancord identity.</p><span className="sr-only">Signed in as {user.email}</span>
    {error && <div className="auth-error" role="alert"><X size={15}/><span>{error}</span></div>}
    <form className="profile-setup-form" onSubmit={onSubmit}>
      <input ref={fileRef} className="file-hidden" type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" onChange={event=>{onSelect(event.target.files?.[0]);setSuggested('');}}/>
      <button type="button" className="profile-upload" aria-label="Choose profile photo, GIF, or video" disabled={busy || preparing} onClick={()=>fileRef.current?.click()}>{form.preview ? (isVideo ? <video src={form.preview} autoPlay muted loop playsInline onLoadedMetadata={event=>onVideoMetadata(event.currentTarget.duration)}/> : <img src={form.preview} alt="Selected profile avatar"/>) : <span className="profile-camera"><DesignIcon name="camera"/></span>}</button>
      <label className="profile-username">Username<span className="field"><input value={form.username} onChange={event=>setField('username',event.target.value)} autoComplete="username" minLength={3} maxLength={24} pattern="[A-Za-z0-9_]+" required placeholder="Your username" disabled={busy}/></span></label>
      <fieldset className="suggested-avatars"><legend>Suggested Avatars</legend><div>{avatars.map(([glyph,name])=><button type="button" key={name} aria-label={`Use ${name} avatar`} aria-pressed={suggested===name} disabled={busy || preparing} onClick={()=>chooseAvatar(glyph,name)}><Glyph>{glyph}</Glyph></button>)}</div></fieldset>
      <p className="profile-media-help">Photo, GIF, or video up to 8 MB. Videos: 12 seconds or less.</p>
      <button disabled={busy || preparing} className="auth-submit">{busy || preparing ? <LoaderCircle size={18} className="spinner"/> : 'Save & Continue'}</button>
    </form>
    <button type="button" className="profile-logout" disabled={busy || preparing} onClick={onSignOut}><LogOut size={16}/>Log out</button>
  </section></main>;
}
