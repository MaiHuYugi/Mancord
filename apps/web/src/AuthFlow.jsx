import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, ImagePlus, LoaderCircle, LockKeyhole, Mail, UploadCloud, UserRound, X } from 'lucide-react';
import Mancord from './Mancord.jsx';
import { supabase } from './supabase.js';

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm']);
const maxBytes = 8 * 1024 * 1024;
const extensions = { 'image/jpeg':'jpg', 'image/png':'png', 'image/webp':'webp', 'image/gif':'gif', 'video/mp4':'mp4', 'video/webm':'webm' };

export default function AuthFlow() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(Boolean(supabase));
  const [profileLoading, setProfileLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [authForm, setAuthForm] = useState({ email: '', password: '', confirm: '' });
  const [profileForm, setProfileForm] = useState({ username: '', file: null, preview: '' });
  const [busy, setBusy] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!alive) return;
      if (sessionError) setError(sessionError.message);
      setSession(data.session);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!alive) return;
      setSession(nextSession);
      setProfile(null);
      setError('');
    });
    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!supabase || !session?.user) { setProfile(null); return; }
    let alive = true;
    setProfileLoading(true);
    supabase.from('profiles').select('id,username,display_name,avatar_url,avatar_media_type,profile_completed').eq('id', session.user.id).single()
      .then(({ data, error: profileError }) => {
        if (!alive) return;
        if (profileError) setError(`Could not load your profile: ${profileError.message}`);
        else setProfile(data);
        setProfileLoading(false);
      });
    return () => { alive = false; };
  }, [session?.user?.id]);

  function updateAuth(field, value) { setAuthForm(current => ({ ...current, [field]: value })); }
  function updateProfile(field, value) { setProfileForm(current => ({ ...current, [field]: value })); }

  async function submitAuth(event) {
    event.preventDefault(); setError(''); setNotice('');
    if (mode === 'register' && authForm.password !== authForm.confirm) { setError('Those passwords do not match.'); return; }
    if (authForm.password.length < 8) { setError('Use a password with at least 8 characters.'); return; }
    setBusy(true);
    try {
      if (mode === 'register') {
        const { data, error: signupError } = await supabase.auth.signUp({ email: authForm.email.trim(), password: authForm.password });
        if (signupError) throw signupError;
        if (!data.session) setNotice('Check your email to confirm your account. Then log in to finish setting up your profile.');
        else setNotice('Account created. Let’s set up your Mancord profile.');
      } else {
        const { error: loginError } = await supabase.auth.signInWithPassword({ email: authForm.email.trim(), password: authForm.password });
        if (loginError) throw loginError;
      }
    } catch (authError) { setError(authError.message || 'Could not complete authentication.'); }
    finally { setBusy(false); }
  }

  function selectMedia(file) {
    setError(''); setNotice('');
    if (!file) return;
    if (!allowedTypes.has(file.type)) { setError('Choose a JPEG, PNG, WebP, GIF, MP4, or WebM file.'); return; }
    if (file.size > maxBytes) { setError('Profile media must be 8 MB or smaller.'); return; }
    const preview = URL.createObjectURL(file);
    setProfileForm(current => { if (current.preview) URL.revokeObjectURL(current.preview); return { ...current, file, preview }; });
    setVideoDuration(0);
  }

  async function submitProfile(event) {
    event.preventDefault(); setError(''); setNotice('');
    const username = profileForm.username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,24}$/.test(username)) { setError('Use 3–24 characters: lowercase letters, numbers, or underscores.'); return; }
    if (!profileForm.file) { setError('Choose a profile photo, GIF, or short video to continue.'); return; }
    if (profileForm.file?.type.startsWith('video/') && (videoDuration <= 0 || videoDuration > 12)) { setError('Choose a short video that is 12 seconds or less.'); return; }
    setBusy(true);
    try {
      let avatarUrl = null;
      if (profileForm.file) {
        const ext = extensions[profileForm.file.type];
        const path = `${session.user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('profile-media').upload(path, profileForm.file, { contentType: profileForm.file.type, cacheControl: '3600', upsert: false });
        if (uploadError) throw uploadError;
        avatarUrl = supabase.storage.from('profile-media').getPublicUrl(path).data.publicUrl;
      }
      const { data, error: saveError } = await supabase.from('profiles').update({ username, display_name: username, avatar_url: avatarUrl, avatar_media_type: profileForm.file?.type || null, profile_completed: true }).eq('id', session.user.id).select('id,username,display_name,avatar_url,avatar_media_type,profile_completed').single();
      if (saveError) throw saveError;
      setProfile(data);
    } catch (saveError) {
      if (saveError.code === '23505') setError('That username is already taken. Try another one.');
      else setError(saveError.message || 'Could not save your profile. Please try again.');
    } finally { setBusy(false); }
  }

  async function signOut() { setError(''); await supabase.auth.signOut(); setProfile(null); setMode('login'); }

  if (!supabase) return <main className="auth-backdrop"><div className="auth-card setup-card"><Brand /><div className="auth-icon"><LockKeyhole size={22}/></div><h1>Connect Mancord</h1><p>Add your Supabase project URL and anon key to <code>apps/web/.env.local</code>, then restart the web app to enable account creation and login.</p><div className="setup-code">VITE_SUPABASE_URL<br/>VITE_SUPABASE_ANON_KEY</div></div></main>;
  if (loading || (session && (profileLoading || (!profile && !error)))) return <main className="auth-backdrop"><div className="auth-loading"><span className="brand-mark">m.</span><LoaderCircle className="spinner" size={20}/></div></main>;
  if (session && !profile && error) return <main className="auth-backdrop"><section className="auth-card"><Brand/><div className="auth-error"><X size={15}/><span>{error}</span></div><button className="auth-submit" onClick={signOut}>Sign out</button></section></main>;
  if (session && profile && !profile.profile_completed) return <ProfileSetup user={session.user} form={profileForm} setField={updateProfile} fileRef={fileRef} onSelect={selectMedia} onVideoMetadata={setVideoDuration} onSubmit={submitProfile} busy={busy} error={error} />;
  if (session && profile?.profile_completed) return <Mancord profile={profile} onSignOut={signOut} />;

  return <main className="auth-backdrop"><section className="auth-card"><Brand /><div className="auth-icon"><LockKeyhole size={22}/></div><h1>{mode === 'register' ? 'Create your account' : 'Welcome back'}</h1><p>{mode === 'register' ? 'Start your own little corner of Mancord.' : 'Log in to find your people.'}</p>
    {notice && <div className="auth-notice"><Check size={15}/><span>{notice}</span></div>}{error && <div className="auth-error"><X size={15}/><span>{error}</span></div>}
    <form onSubmit={submitAuth} className="auth-form"><label>Email address<span className="field"><Mail size={16}/><input type="email" autoComplete="email" required value={authForm.email} onChange={event => updateAuth('email',event.target.value)} placeholder="you@example.com" /></span></label><label>Password<span className="field"><LockKeyhole size={16}/><input type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} minLength={8} required value={authForm.password} onChange={event => updateAuth('password',event.target.value)} placeholder="At least 8 characters" /></span></label>{mode === 'register' && <label>Confirm password<span className="field"><LockKeyhole size={16}/><input type="password" autoComplete="new-password" minLength={8} required value={authForm.confirm} onChange={event => updateAuth('confirm',event.target.value)} placeholder="Type it again" /></span></label>}<button disabled={busy} className="auth-submit">{busy ? <LoaderCircle size={17} className="spinner"/> : mode === 'register' ? 'Create account' : 'Log in'}{!busy && <ArrowRight size={17}/>}</button></form>
    <div className="auth-switch">{mode === 'register' ? 'Already have an account?' : 'New to Mancord?'} <button onClick={() => {setMode(mode === 'register'?'login':'register');setError('');setNotice('');}}> {mode === 'register' ? 'Log in' : 'Create an account'}</button></div><div className="auth-free"><span>✦</span> Everything good is free here.</div>
  </section></main>;
}

function Brand() { return <div className="auth-brand"><span className="brand-mark">m.</span><span>mancord</span></div>; }

function ProfileSetup({ user, form, setField, fileRef, onSelect, onVideoMetadata, onSubmit, busy, error }) {
  const isVideo = form.file?.type.startsWith('video/');
  return <main className="auth-backdrop"><section className="auth-card profile-card"><Brand /><div className="auth-icon profile-icon"><UserRound size={22}/></div><h1>Make yourself at home</h1><p>Choose your Mancord username and profile media to continue.</p>
    <div className="signed-in-email"><Mail size={14}/>{user.email}</div>{error && <div className="auth-error"><X size={15}/><span>{error}</span></div>}
    <form className="auth-form" onSubmit={onSubmit}><label>Username<span className="field"><span className="at-sign">@</span><input value={form.username} onChange={event=>setField('username',event.target.value)} autoComplete="username" minLength={3} maxLength={24} pattern="[A-Za-z0-9_]+" required placeholder="yourname" /></span></label>
      <label>Profile photo, GIF, or short video</label><input ref={fileRef} className="file-hidden" type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" onChange={event=>onSelect(event.target.files?.[0])}/>
      <button type="button" className="media-picker" onClick={()=>fileRef.current?.click()}>{form.preview ? (isVideo ? <video src={form.preview} autoPlay muted loop playsInline onLoadedMetadata={event=>onVideoMetadata(event.currentTarget.duration)} /> : <img src={form.preview} alt="Profile preview" />) : <span className="media-placeholder"><ImagePlus size={22}/><span>Choose a file</span><small>GIF, photo, MP4 or WebM · max 8 MB</small></span>}<span className="media-edit"><UploadCloud size={15}/></span></button>
      <div className="media-hint">Short profile videos must be 12 seconds or less.</div><button disabled={busy} className="auth-submit">{busy ? <LoaderCircle size={17} className="spinner"/> : 'Enter Mancord'}{!busy && <ArrowRight size={17}/>}</button>
    </form>
  </section></main>;
}
