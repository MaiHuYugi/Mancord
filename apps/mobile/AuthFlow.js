import { Asset } from 'expo-asset';
import { AuthScreen, ProfileScreen, InterestsScreen } from './DesignScreens';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Platform, SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { maxProfileMediaSize as maxSize, readProfileMedia } from './profileMedia';
import { supabase } from './supabase';
import { MancordHome } from './MancordHome';

const accepted = ['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm'];
const extensions = {'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif','video/mp4':'mp4','video/webm':'webm'};

export default function AuthFlow() {
  const [session,setSession] = useState(null);
  const [profile,setProfile] = useState(null);
  const [loading,setLoading] = useState(Boolean(supabase));
  const [mode,setMode] = useState('welcome');
  const [interestsOpen,setInterestsOpen] = useState(false);
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');
  const [confirm,setConfirm] = useState('');
  const [username,setUsername] = useState('');
  const [media,setMedia] = useState(null);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');
  const logoutInProgress = useRef(false);

  useEffect(()=>{
    if (!supabase) return;
    supabase.auth.getSession().then(({data,error:sessionError})=>{ if(sessionError)setError(sessionError.message); setSession(data.session); setLoading(false); });
    const {data:listener}=supabase.auth.onAuthStateChange((event,next)=>{
      setSession(next);
      setProfile(current=>current?.id===next?.user?.id?current:null);
      setError('');
      if(event==='SIGNED_OUT'){setLoading(false);setMode('login');setPassword('');setConfirm('');setNotice('');}
    });
    return ()=>listener.subscription.unsubscribe();
  },[]);

  useEffect(()=>{
    if(!session?.user || !supabase){setProfile(null);return;}
    let active=true;
    supabase.from('profiles').select('id,username,display_name,avatar_url,avatar_media_type,profile_completed').eq('id',session.user.id).single()
      .then(({data,error:profileError})=>{if(!active)return;if(profileError)setError(`Could not load your profile: ${profileError.message}`);else setProfile(data);setLoading(false);});
    return ()=>{active=false;};
  },[session?.user?.id]);

  async function submitAuth(){
    setError('');setNotice('');
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())){setError('Enter a valid email address.');return;}
    if(password.length<8){setError('Use a password with at least 8 characters.');return;}
    if(mode==='register'&&password!==confirm){setError('Those passwords do not match.');return;}
    setBusy(true);
    try{
      if(mode==='register'){
        const {data,error:authError}=await supabase.auth.signUp({email:email.trim(),password});
        if(authError)throw authError;
        if(!data.session)setNotice('Check your email to confirm your account, then log in to finish your profile.');
        else setNotice('Account created. Let’s set up your Mancord profile.');
      }else{
        const {error:authError}=await supabase.auth.signInWithPassword({email:email.trim(),password});if(authError)throw authError;
      }
    }catch(e){setError(e.message||'Could not complete authentication.');}finally{setBusy(false);}
  }

  async function chooseMedia(){
    setError('');
    setBusy(true);
    try{
      // Expo Go's Android picker cache can sit outside this project's file scope.
      // Keep the provider URI; readProfileMedia copies it into our scoped cache.
      const result=await DocumentPicker.getDocumentAsync({type:accepted,copyToCacheDirectory:Platform.OS!=='android',multiple:false});
      if(result.canceled)return;
      const file=result.assets?.[0];
      if(!file)return;
      if(!accepted.includes(file.mimeType)){setError('Choose a JPEG, PNG, WebP, GIF, MP4, or WebM file.');return;}
      if(file.size>maxSize){setError('Profile media must be 8 MB or smaller.');return;}
      // Keep the bytes so submission never depends on a temporary picker URI.
      const contents=await readProfileMedia(file);
      setMedia({...file,contents});
    }catch(e){setError(e.message||'Could not open that file. Try another photo, GIF, or video.');}finally{setBusy(false);}
  }

  async function chooseAvatar(avatar){
    setError('');setBusy(true);
    try{
      const asset=Asset.fromModule(avatar.asset);await asset.downloadAsync();
      const file={uri:asset.localUri||asset.uri,name:avatar.name.toLowerCase()+'-avatar.png',mimeType:'image/png'};
      const contents=await readProfileMedia(file);
      setMedia({...file,contents,size:contents.byteLength});
    }catch(e){setError(e.message||'Could not load that avatar. Please try again.');}
    finally{setBusy(false);}
  }

  async function finishProfile(){
    setError('');const name=username.trim().toLowerCase();
    if(!/^[a-z0-9_]{3,24}$/.test(name)){setError('Use 3–24 characters: lowercase letters, numbers, or underscores.');return;}
    if(!media){setError('Choose a profile photo, GIF, or short video to continue.');return;}
    setBusy(true);
    try{
      let avatarUrl=null,mediaType=null;
      if(media){
        mediaType=media.mimeType;
        const contents=media.contents;
        const ext=extensions[mediaType];
        const path=`${session.user.id}/${Date.now()}.${ext}`;
        const {error:uploadError}=await supabase.storage.from('profile-media').upload(path,contents,{contentType:mediaType,cacheControl:'3600',upsert:false});
        if(uploadError)throw uploadError;
        avatarUrl=supabase.storage.from('profile-media').getPublicUrl(path).data.publicUrl;
      }
      const {data,error:saveError}=await supabase.from('profiles').update({username:name,display_name:name,avatar_url:avatarUrl,avatar_media_type:mediaType,profile_completed:true}).eq('id',session.user.id).select('id,username,display_name,avatar_url,avatar_media_type,profile_completed').single();
      if(saveError)throw saveError;setProfile(data);setInterestsOpen(true);
    }catch(e){setError(e.code==='23505'?'That username is already taken. Try another one.':(e.message||'Could not save your profile.'));}finally{setBusy(false);}
  }

  async function saveAvatar(file){
    if(!file?.uri)return;
    setError('');setBusy(true);
    try{
      if(!accepted.includes(file.mimeType))throw new Error('Choose a JPEG, PNG, WebP, GIF, MP4, or WebM file.');
      const contents=await readProfileMedia(file);
      if(contents.byteLength>maxSize)throw new Error('Profile media must be 8 MB or smaller.');
      const ext=extensions[file.mimeType];
      const path=`${session.user.id}/${Date.now()}.${ext}`;
      const {error:uploadError}=await supabase.storage.from('profile-media').upload(path,contents,{contentType:file.mimeType,cacheControl:'3600',upsert:false});
      if(uploadError)throw uploadError;
      const avatarUrl=supabase.storage.from('profile-media').getPublicUrl(path).data.publicUrl;
      const {data,error:saveError}=await supabase.from('profiles').update({avatar_url:avatarUrl,avatar_media_type:file.mimeType}).eq('id',session.user.id).select('id,username,display_name,avatar_url,avatar_media_type,profile_completed').single();
      if(saveError)throw saveError;
      setProfile(data);
    }catch(e){setError(e.message||'Could not update your avatar. Please try again.');}finally{setBusy(false);}
  }

  async function saveServerIcon(file, serverId){
    if(!file?.uri)throw new Error('Choose an image or video first.');
    setError('');setBusy(true);
    try{
      if(!accepted.includes(file.mimeType))throw new Error('Choose a JPEG, PNG, WebP, GIF, MP4, or WebM file.');
      const contents=await readProfileMedia(file);
      if(contents.byteLength>maxSize)throw new Error('Server icon media must be 8 MB or smaller.');
      const ext=extensions[file.mimeType];
      const path=`${session.user.id}/servers/${serverId}/${Date.now()}.${ext}`;
      const {error:uploadError}=await supabase.storage.from('profile-media').upload(path,contents,{contentType:file.mimeType,cacheControl:'3600',upsert:false});
      if(uploadError)throw uploadError;
      return {icon_url:supabase.storage.from('profile-media').getPublicUrl(path).data.publicUrl,icon_media_type:file.mimeType};
    }catch(e){setError(e.message||'Could not update the server icon.');throw e;}finally{setBusy(false);}
  }

  async function pickServerIcon(kind, serverId){
    const permission=await ImagePicker.requestMediaLibraryPermissionsAsync();
    if(!permission.granted)throw new Error('Allow photo and video access to choose a server icon.');
    const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:kind==='video'?['videos']:['images'],allowsEditing:false,quality:1});
    if(result.canceled)return null;
    const file=result.assets?.[0];if(!file)return null;
    const mimeType=file.mimeType||(kind==='video'?'video/mp4':'image/jpeg');
    return saveServerIcon({uri:file.uri,name:file.fileName||`server-icon-${Date.now()}.${extensions[mimeType]||'jpg'}`,mimeType,size:file.fileSize},serverId);
  }

  async function pickAvatar(kind){
    setError('');
    try{
      const permission=await ImagePicker.requestMediaLibraryPermissionsAsync();
      if(!permission.granted){setError('Allow photo and video access to choose an avatar.');return;}
      const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:kind==='video'?['videos']:['images'],allowsEditing:false,quality:1});
      if(result.canceled)return;
      const file=result.assets?.[0];
      if(!file)return;
      const mimeType=file.mimeType||(kind==='video'?'video/mp4':'image/jpeg');
      await saveAvatar({uri:file.uri,name:file.fileName||`avatar-${Date.now()}.${extensions[mimeType]||'jpg'}`,mimeType,size:file.fileSize});
    }catch(e){setError(e.message||'Could not open your media library.');}
  }

  async function signOut(){
    if(logoutInProgress.current)return;
    logoutInProgress.current=true;setBusy(true);setError('');
    try{
      const {error:signOutError}=await supabase.auth.signOut({scope:'local'});
      if(signOutError){
        const {data,error:sessionError}=await supabase.auth.getSession();
        if(sessionError||data.session)throw signOutError;
      }
      setSession(null);setProfile(null);setLoading(false);setMode('login');
      setEmail('');setPassword('');setConfirm('');setUsername('');setMedia(null);setNotice('');setInterestsOpen(false);
    }catch(e){setError(e.message||'Could not log out. Please try again.');}
    finally{logoutInProgress.current=false;setBusy(false);}
  }

  if(!supabase)return <AuthScreen configured={false} mode={mode} setMode={setMode}/>;
  if(loading||(session&&!profile&&!error))return <View style={[s.safe,{backgroundColor:'#17052d'}]}><StatusBar barStyle="light-content" translucent backgroundColor="transparent"/><Image source={require('../web/public/assets/welcome/background.png')} style={[StyleSheet.absoluteFill,{width:'100%',height:'100%'}]} resizeMode="cover" fadeDuration={0}/><View style={s.center}><Text style={s.brandMark}>m.</Text><ActivityIndicator color="#b5a5ff" style={{marginTop:15}}/></View></View>;
  if(session&&!profile&&error)return <AuthScreen recoveryError={error} onSignOut={signOut}/>;
  if(session&&profile&&!profile.profile_completed)return <ProfileScreen email={session.user.email} username={username} setUsername={setUsername} media={media} chooseMedia={chooseMedia} chooseAvatar={chooseAvatar} onSignOut={signOut} finish={finishProfile} busy={busy} error={error}/>;
  if(session&&profile?.profile_completed&&interestsOpen)return <InterestsScreen userId={profile.id} onDone={()=>setInterestsOpen(false)}/>;
  if(session&&profile?.profile_completed)return <MancordHome email={session.user.email} profile={profile} onProfileChange={setProfile} onSignOut={signOut} signingOut={busy} authError={error} onAvatarImage={()=>pickAvatar('image')} onAvatarVideo={()=>pickAvatar('video')} onAvatarCamera={saveAvatar} onPickServerIcon={pickServerIcon}/>;
  return <AuthScreen mode={mode} setMode={value=>{setMode(value);setError('');setNotice('');}} email={email} setEmail={setEmail} password={password} setPassword={setPassword} confirm={confirm} setConfirm={setConfirm} username={username} setUsername={setUsername} submit={submitAuth} busy={busy} error={error} notice={notice}/>;
}

const s=StyleSheet.create({safe:{flex:1,backgroundColor:'#000'},center:{flex:1,alignItems:'center',justifyContent:'center'},brandMark:{fontSize:28,fontFamily:'Inter',fontWeight:'700',color:'#a684ff'}});
