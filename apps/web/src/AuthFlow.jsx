import ProfileSetup from './ProfileSetup.jsx';
import WelcomeScreen from './WelcomeScreen.jsx';
import './auth-updated.css';
import InterestsScreen from './InterestsScreen.jsx';
import { useEffect, useRef, useState } from 'react';
import { Check, LoaderCircle, LockKeyhole, X } from 'lucide-react';
import Mancord from './Mancord.jsx';
import { supabase } from './supabase.js';

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm']);
const maxBytes = 8 * 1024 * 1024;
const extensions = { 'image/jpeg':'jpg', 'image/png':'png', 'image/webp':'webp', 'image/gif':'gif', 'video/mp4':'mp4', 'video/webm':'webm' };

export default function AuthFlow() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [mode, setMode] = useState('welcome');
  const [interestsOpen, setInterestsOpen] = useState(false);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [profileLoading, setProfileLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [authForm, setAuthForm] = useState({ email: '', password: '', confirm: '' });
  const [profileForm, setProfileForm] = useState({ username: '', file: null, preview: '' });
  const [busy, setBusy] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const fileRef = useRef(null);
  const logoutInProgress = useRef(false);

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!alive) return;
      if (sessionError) setError(sessionError.message);
      setSession(data.session);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!alive) return;
      setSession(nextSession);
      // Focus and token refresh events can repeat for the same user. Keep the
      // loaded profile: its fetch effect only runs when the user ID changes.
      setProfile(current => current?.id === nextSession?.user?.id ? current : null);
      setError('');
      if (event === 'SIGNED_OUT') {
        setProfileLoading(false);
        setAuthForm({ email: '', password: '', confirm: '' });
        setNotice('');
        setMode('login');
      }
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
      setInterestsOpen(true);
    } catch (saveError) {
      if (saveError.code === '23505') setError('That username is already taken. Try another one.');
      else setError(saveError.message || 'Could not save your profile. Please try again.');
    } finally { setBusy(false); }
  }

  async function signOut() {
    if (logoutInProgress.current || busy) return;
    logoutInProgress.current = true;
    setError(''); setBusy(true);
    try {
      const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
      if (signOutError) {
        // The SDK can clear this device's session even if server revocation
        // fails. Only keep the user signed in if a session actually remains.
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || data.session) throw signOutError;
      }
      setSession(null); setProfile(null); setProfileLoading(false);
      setAuthForm({ email: '', password: '', confirm: '' });
      if (profileForm.preview) URL.revokeObjectURL(profileForm.preview);
      setProfileForm({ username: '', file: null, preview: '' });
      setVideoDuration(0); setNotice(''); setInterestsOpen(false); setMode('login');
    } catch (signOutError) {
      setError(signOutError.message || 'Could not log out. Please try again.');
    } finally { logoutInProgress.current = false; setBusy(false); }
  }

  if (!supabase && mode === 'welcome') return <WelcomeScreen onStart={() => navigate('register')}/>;
  if (!supabase) return <main className="auth-backdrop"><div className="auth-card setup-card"><Brand /><div className="auth-icon"><LockKeyhole size={22}/></div><h1>Connect Mancord</h1><p>Add your Supabase project URL and anon key to <code>apps/web/.env.local</code>, then restart the web app to enable account creation and login.</p><div className="setup-code">VITE_SUPABASE_URL<br/>VITE_SUPABASE_ANON_KEY</div><button className="auth-back" onClick={() => navigate('welcome')}>Back to welcome</button></div></main>;
  if (loading || (session && (profileLoading || (!profile && !error)))) return <main className="welcome-backdrop welcome-loading"><div className="welcome-scenery" aria-hidden="true"><img src="/assets/welcome/background.png" alt="" fetchPriority="high"/></div><div className="auth-loading" style={{position:'relative'}}><span className="brand-mark">m.</span><LoaderCircle className="spinner" size={20}/></div></main>;
  if (session && !profile && error) return <main className="auth-backdrop"><section className="auth-card"><Brand/><div className="auth-error"><X size={15}/><span>{error}</span></div><button className="auth-submit" onClick={signOut}>Sign out</button></section></main>;
  if (session && profile && !profile.profile_completed) return <ProfileSetup user={session.user} form={profileForm} setField={updateProfile} fileRef={fileRef} onSelect={selectMedia} onVideoMetadata={setVideoDuration} onSubmit={submitProfile} onSignOut={signOut} busy={busy} error={error} />;
  if (session && profile?.profile_completed && interestsOpen) return <main className="auth-backdrop"><InterestsScreen userId={profile.id} onDone={()=>setInterestsOpen(false)}/></main>;
  if (session && profile?.profile_completed) return <Mancord email={session.user.email} profile={profile} onProfileChange={setProfile} onSignOut={signOut} signingOut={busy} authError={error} />;

  function navigate(nextMode) { setMode(nextMode); setError(''); setNotice(''); }

  if (mode === 'welcome') return <WelcomeScreen onStart={() => navigate('register')}/>;

  const registering = mode === 'register';
  return <main className="auth-backdrop updated-auth"><section className={`auth-screen ${registering ? 'register-screen' : 'login-screen'}`} aria-labelledby="auth-title">
    <button className="auth-back" aria-label="Back to welcome" disabled={busy} onClick={() => navigate('welcome')}><AuthAsset name="back" /></button>
    <header className="auth-heading"><h1 id="auth-title" className={registering ? '' : 'login-greeting'}>{registering ? 'Create Account' : 'welcome to Mancord!'}</h1>{registering && <p>Join the Mancord community</p>}</header>
    <div className="auth-feedback" aria-live="polite">{notice && <div className="auth-notice" role="status"><Check size={15}/><span>{notice}</span></div>}{error && <div className="auth-error" role="alert"><X size={15}/><span>{error}</span></div>}</div>
    <form onSubmit={submitAuth} className="auth-form" aria-busy={busy}>
      {registering && <label className="auth-input"><span className="sr-only">Username</span><span className="field"><AuthAsset name="user"/><input autoComplete="username" minLength={3} maxLength={24} pattern="[A-Za-z0-9_]+" required value={profileForm.username} onChange={event => updateProfile('username',event.target.value)} placeholder="Username" disabled={busy}/></span></label>}
      <label className="auth-input"><span className="sr-only">Email address</span><span className="field"><AuthAsset name={registering ? 'mail' : 'user'}/><input type="email" autoComplete="email" required value={authForm.email} onChange={event => updateAuth('email',event.target.value)} placeholder="Email Address" disabled={busy}/></span></label>
      <label className="auth-input"><span className="sr-only">Password</span><span className="field"><AuthAsset name="lock"/><input type="password" autoComplete={registering ? 'new-password' : 'current-password'} minLength={8} required value={authForm.password} onChange={event => updateAuth('password',event.target.value)} placeholder="Password" disabled={busy}/></span></label>
      {registering && <label className="auth-input"><span className="sr-only">Confirm password</span><span className="field"><AuthAsset name="lock"/><input type="password" autoComplete="new-password" minLength={8} required value={authForm.confirm} onChange={event => updateAuth('confirm',event.target.value)} placeholder="Confirm Password" disabled={busy}/></span></label>}
      <button disabled={busy} className="auth-submit">{busy ? <><LoaderCircle size={18} className="spinner"/>Please wait…</> : 'Continue'}</button>
    </form>
    <div className="auth-divider"><span>or sign up with</span></div>
    <div className="auth-social"><button disabled title="Google sign-in is not available"><AuthAsset name="google"/>Google</button><button disabled title="Apple sign-in is not available"><AuthAsset name="apple"/>Apple</button></div>
    <p className="auth-provider-note">Google and Apple sign-in coming soon</p>
    <div className="auth-switch">{registering ? 'Already have an account?' : 'New to Mancord?'} <button disabled={busy} onClick={() => navigate(registering ? 'login' : 'register')}>{registering ? 'Log in' : 'Create an account'}</button></div>
    <footer className="auth-footer"><button className="auth-back" disabled={busy} onClick={() => navigate('welcome')}><AuthAsset name="back-small"/>Back</button></footer>
  </section></main>;
}

function AuthAsset({ name }) {
  const [width,height] = name === 'back' ? [24,24] : name === 'google' ? [26,27] : name === 'apple' ? [22.1,26] : [20,20];
  return <img className="auth-asset" src={`/assets/auth-updated/${name === 'back-small' ? 'back' : name}.png`} alt="" aria-hidden="true" width={width} height={height}/>;
}

function Brand() { return <div className="auth-brand"><span className="brand-mark">m.</span><span>mancord</span></div>; }
