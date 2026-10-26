import React, { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { ArrowRight, Check, LockKeyhole, Mail, UserRound } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { supabase } from './supabase';
import { MancordHome } from './MancordHome';

const accepted = ['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm'];
const maxSize = 8 * 1024 * 1024;
const extensions = {'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif','video/mp4':'mp4','video/webm':'webm'};

export default function AuthFlow() {
  const [session,setSession] = useState(null);
  const [profile,setProfile] = useState(null);
  const [loading,setLoading] = useState(Boolean(supabase));
  const [mode,setMode] = useState('login');
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');
  const [confirm,setConfirm] = useState('');
  const [username,setUsername] = useState('');
  const [media,setMedia] = useState(null);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');

  useEffect(()=>{
    if (!supabase) return;
    supabase.auth.getSession().then(({data,error:sessionError})=>{ if(sessionError)setError(sessionError.message); setSession(data.session); setLoading(false); });
    const {data:listener}=supabase.auth.onAuthStateChange((_event,next)=>{setSession(next);setProfile(null);setError('');});
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
    const result=await DocumentPicker.getDocumentAsync({type:accepted,copyToCacheDirectory:true,multiple:false});
    if(result.canceled)return;
    const file=result.assets?.[0];
    if(!file)return;
    if(!accepted.includes(file.mimeType)){setError('Choose a JPEG, PNG, WebP, GIF, MP4, or WebM file.');return;}
    if(file.size>maxSize){setError('Profile media must be 8 MB or smaller.');return;}
    setMedia(file);
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
        const pickedFile=new File(media.uri);
        if(!pickedFile.exists)throw new Error('Android could not access that file. Please choose it again.');
        if(pickedFile.size>maxSize)throw new Error('Profile media must be 8 MB or smaller.');
        const bytes=await pickedFile.bytes();
        const contents=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
        const ext=extensions[mediaType];
        const path=`${session.user.id}/${Date.now()}.${ext}`;
        const {error:uploadError}=await supabase.storage.from('profile-media').upload(path,contents,{contentType:mediaType,cacheControl:'3600',upsert:false});
        if(uploadError)throw uploadError;
        avatarUrl=supabase.storage.from('profile-media').getPublicUrl(path).data.publicUrl;
      }
      const {data,error:saveError}=await supabase.from('profiles').update({username:name,display_name:name,avatar_url:avatarUrl,avatar_media_type:mediaType,profile_completed:true}).eq('id',session.user.id).select('id,username,display_name,avatar_url,avatar_media_type,profile_completed').single();
      if(saveError)throw saveError;setProfile(data);
    }catch(e){setError(e.code==='23505'?'That username is already taken. Try another one.':(e.message||'Could not save your profile.'));}finally{setBusy(false);}
  }

  if(!supabase)return <AuthScreen configured={false}/>;
  if(loading||(session&&!profile&&!error))return <SafeAreaView style={s.safe}><StatusBar barStyle="light-content"/><View style={s.center}><Text style={s.brandMark}>m.</Text><ActivityIndicator color="#b5a5ff" style={{marginTop:15}}/></View></SafeAreaView>;
  if(session&&!profile&&error)return <AuthScreen recoveryError={error} onSignOut={()=>supabase.auth.signOut()}/>;
  if(session&&profile&&!profile.profile_completed)return <ProfileScreen email={session.user.email} username={username} setUsername={setUsername} media={media} chooseMedia={chooseMedia} finish={finishProfile} busy={busy} error={error}/>;
  if(session&&profile?.profile_completed)return <MancordHome profile={profile} onSignOut={()=>supabase.auth.signOut()}/>;
  return <AuthScreen mode={mode} setMode={value=>{setMode(value);setError('');setNotice('');}} email={email} setEmail={setEmail} password={password} setPassword={setPassword} confirm={confirm} setConfirm={setConfirm} submit={submitAuth} busy={busy} error={error} notice={notice}/>;
}

function Brand(){return <View style={s.brand}><Text style={s.brandMark}>m.</Text><Text style={s.brandName}>mancord</Text></View>;}
function AuthScreen({configured=true,recoveryError='',onSignOut=()=>{},mode='login',setMode=()=>{},email='',setEmail=()=>{},password='',setPassword=()=>{},confirm='',setConfirm=()=>{},submit=()=>{},busy=false,error='',notice=''}){
  return <SafeAreaView style={s.safe}><StatusBar barStyle="light-content" backgroundColor="#17181d"/><KeyboardAvoidingView style={s.safe} behavior={Platform.OS==='ios'?'padding':undefined}><ScrollView contentContainerStyle={s.screen} keyboardShouldPersistTaps="handled"><View style={s.card}><Brand/>{!configured?<><View style={s.iconBox}><LockKeyhole color="#c6baff" size={21}/></View><Text style={s.title}>Connect Mancord</Text><Text style={s.subtitle}>Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to your Expo environment, then restart.</Text></>:recoveryError?<><View style={s.iconBox}><LockKeyhole color="#c6baff" size={21}/></View><Text style={s.title}>Could not load profile</Text><Text style={s.subtitle}>{recoveryError}</Text><Pressable onPress={onSignOut} style={s.primary}><Text style={s.primaryText}>Sign out</Text></Pressable></>:<><View style={s.iconBox}><LockKeyhole color="#c6baff" size={21}/></View><Text style={s.title}>{mode==='register'?'Create your account':'Welcome back'}</Text><Text style={s.subtitle}>{mode==='register'?'Start your own little corner of Mancord.':'Log in to find your people.'}</Text>{notice?<View style={s.notice}><Check color="#a6e4c1" size={15}/><Text style={s.noticeText}>{notice}</Text></View>:null}{error?<View style={s.errorBox}><Text style={s.errorText}>{error}</Text></View>:null}
    <Text style={s.label}>Email address</Text><View style={s.field}><Mail color="#858490" size={16}/><TextInput value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder="you@example.com" placeholderTextColor="#777783" style={s.input}/></View>
    <Text style={s.label}>Password</Text><View style={s.field}><LockKeyhole color="#858490" size={16}/><TextInput value={password} onChangeText={setPassword} secureTextEntry autoComplete={mode==='register'?'new-password':'current-password'} placeholder="At least 8 characters" placeholderTextColor="#777783" style={s.input}/></View>
    {mode==='register'?<><Text style={s.label}>Confirm password</Text><View style={s.field}><LockKeyhole color="#858490" size={16}/><TextInput value={confirm} onChangeText={setConfirm} secureTextEntry autoComplete="new-password" placeholder="Type it again" placeholderTextColor="#777783" style={s.input}/></View></>:null}
    <Pressable disabled={busy} onPress={submit} style={s.primary}>{busy?<ActivityIndicator color="#282532"/>:<><Text style={s.primaryText}>{mode==='register'?'Create account':'Log in'}</Text><ArrowRight color="#282532" size={17}/></>}</Pressable>
    <Text style={s.switchText}>{mode==='register'?'Already have an account?':'New to Mancord?'} <Text style={s.link} onPress={()=>setMode(mode==='register'?'login':'register')}>{mode==='register'?'Log in':'Create an account'}</Text></Text><Text style={s.free}>✦  Everything good is free here.</Text></>}</View></ScrollView></KeyboardAvoidingView></SafeAreaView>;
}
function ProfileScreen({email,username,setUsername,media,chooseMedia,finish,busy,error}){
  return <SafeAreaView style={s.safe}><StatusBar barStyle="light-content"/><KeyboardAvoidingView style={s.safe} behavior={Platform.OS==='ios'?'padding':undefined}><ScrollView contentContainerStyle={s.screen} keyboardShouldPersistTaps="handled"><View style={s.card}><Brand/><View style={s.iconBox}><UserRound color="#c6baff" size={21}/></View><Text style={s.title}>Make yourself at home</Text><Text style={s.subtitle}>Choose your Mancord username and profile media before entering the app.</Text><Text style={s.accountEmail}><Mail color="#b5a5ff" size={14}/>{email}</Text>{error?<View style={s.errorBox}><Text style={s.errorText}>{error}</Text></View>:null}
    <Text style={s.label}>Username</Text><View style={s.field}><Text style={s.at}>@</Text><TextInput value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} maxLength={24} placeholder="yourname" placeholderTextColor="#777783" style={s.input}/></View>
    <Text style={s.label}>Profile photo, GIF, or short video</Text><Pressable style={s.mediaButton} onPress={chooseMedia}><Text style={s.mediaGlyph}>▧</Text><Text style={s.mediaTitle}>{media?.name||'Choose a file'}</Text><Text style={s.mediaHint}>GIF, photo, MP4, or WebM · max 8 MB</Text></Pressable>
    <Pressable disabled={busy} onPress={finish} style={s.primary}>{busy?<ActivityIndicator color="#282532"/>:<><Text style={s.primaryText}>Enter Mancord</Text><ArrowRight color="#282532" size={17}/></>}</Pressable></View></ScrollView></KeyboardAvoidingView></SafeAreaView>;
}

const s=StyleSheet.create({safe:{flex:1,backgroundColor:'#17181d'},screen:{flexGrow:1,justifyContent:'center',padding:18},center:{flex:1,alignItems:'center',justifyContent:'center'},card:{padding:24,borderRadius:16,borderWidth:1,borderColor:'#ffffff12',backgroundColor:'#22232a'},brand:{flexDirection:'row',alignItems:'center',gap:9},brandMark:{width:33,height:33,textAlign:'center',textAlignVertical:'center',borderRadius:11,overflow:'hidden',backgroundColor:'#b5a5ff',color:'#272430',fontWeight:'900',fontSize:20},brandName:{fontWeight:'800',fontSize:13,color:'#e9e8ee'},iconBox:{marginTop:27,width:42,height:42,borderRadius:12,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'#b5a5ff2e',backgroundColor:'#b5a5ff14'},title:{fontSize:22,fontWeight:'800',color:'#efedf4',marginTop:18},subtitle:{fontSize:12,lineHeight:18,color:'#a2a1ae',marginTop:7,marginBottom:20},label:{fontSize:11,fontWeight:'600',color:'#cfced7',marginTop:14,marginBottom:7},field:{height:43,borderWidth:1,borderColor:'#41414b',borderRadius:7,backgroundColor:'#1c1d23',paddingHorizontal:11,flexDirection:'row',alignItems:'center',gap:9},input:{flex:1,minWidth:0,color:'#f0eff4',fontSize:12,paddingVertical:0},primary:{height:43,marginTop:21,borderRadius:7,backgroundColor:'#a998f2',alignItems:'center',justifyContent:'center',flexDirection:'row',gap:9},primaryText:{fontSize:12,fontWeight:'700',color:'#282532'},switchText:{textAlign:'center',marginTop:18,color:'#9695a2',fontSize:11},link:{color:'#c2b5ff',fontWeight:'700'},free:{textAlign:'center',borderTopWidth:1,borderTopColor:'#ffffff0d',marginTop:21,paddingTop:15,color:'#85848f',fontSize:10},notice:{flexDirection:'row',gap:8,padding:10,borderRadius:7,backgroundColor:'#24372f'},noticeText:{flex:1,color:'#a6e4c1',fontSize:10,lineHeight:15},errorBox:{padding:10,borderRadius:7,backgroundColor:'#422c34',marginBottom:10},errorText:{color:'#ffb5c1',fontSize:10,lineHeight:15},accountEmail:{flexDirection:'row',alignItems:'center',gap:7,padding:10,borderRadius:7,backgroundColor:'#1c1d23',color:'#a5a4b0',fontSize:10,overflow:'hidden',marginBottom:6},at:{color:'#a998f2',fontSize:15},optional:{fontSize:9,color:'#888793',fontWeight:'400'},mediaButton:{minHeight:96,borderWidth:1,borderStyle:'dashed',borderColor:'#595663',borderRadius:9,backgroundColor:'#1c1d23',alignItems:'center',justifyContent:'center',padding:12},mediaGlyph:{color:'#b5a5ff',fontSize:22},mediaTitle:{color:'#cfced7',fontSize:11,fontWeight:'600',marginTop:4},mediaHint:{color:'#888793',fontSize:9,marginTop:5}});
