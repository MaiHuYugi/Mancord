import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';

const icons = {
  back: require('../web/public/assets/auth-updated/back.png'),
  user: require('../web/public/assets/auth-updated/user.png'),
  mail: require('../web/public/assets/auth-updated/mail.png'),
  lock: require('../web/public/assets/auth-updated/lock.png'),
  google: require('../web/public/assets/auth-updated/google.png'),
  apple: require('../web/public/assets/auth-updated/apple.png'),
};

export default function UpdatedAuthScreen({ register, setMode, email, setEmail, password, setPassword, confirm, setConfirm, username, setUsername, submit, busy, error, notice, ContinueButton }) {
  const [size,setSize] = useState({width:398,height:865});
  const scale = Math.min(size.width/398,1);
  const Icon = ({name,footer=false}) => {
    const [width,height] = name==='google' ? [26,27] : name==='apple' ? [22.1,26] : name==='back'&&!footer ? [24,24] : [20,20];
    return <Image source={icons[name]} accessible={false} fadeDuration={0} style={{width:width*scale,height:height*scale}}/>;
  };
  const Back = ({footer=false}) => <Pressable accessibilityRole="button" accessibilityLabel="Back to welcome" disabled={busy} onPress={()=>setMode('welcome')} style={{height:(footer?44:40)*scale,minWidth:48*scale,paddingHorizontal:12*scale,alignSelf:'flex-start',flexDirection:'row',alignItems:'center',gap:8*scale}}><Icon name="back" footer={footer}/>{footer&&<Text style={[s.backText,{fontSize:14*scale}]}>Back</Text>}</Pressable>;
  const field = (icon,label,value,onChangeText,options={}) => <View style={[s.field,{height:Math.max(48,54*scale),paddingHorizontal:16*scale,gap:12*scale}]}><Icon name={icon}/><TextInput accessibilityLabel={label} placeholder={label} placeholderTextColor="#c4b4ff" value={value} onChangeText={onChangeText} editable={!busy} style={s.input} {...options}/></View>;
  return <SafeAreaView style={s.safe}><StatusBar barStyle="light-content" backgroundColor="#000"/><KeyboardAvoidingView style={s.safe} behavior={Platform.OS==='ios'?'padding':'height'} onLayout={event=>setSize(event.nativeEvent.layout)}>
    <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      <View style={{width:Math.min(size.width,398),padding:24*scale,minHeight:Math.max(size.height,(register?903:865)*scale)}}>
        <Back/>
        {register&&<View style={{marginTop:16*scale}}><Text accessibilityRole="header" style={[s.heading,{fontSize:Math.max(24,28*scale),lineHeight:Math.max(30,35*scale)}]}>Create Account</Text><Text style={[s.copy,{fontSize:14,lineHeight:20,marginTop:8*scale}]}>Join the Mancord community</Text></View>}
        {notice?<Text accessibilityRole="alert" style={s.notice}>{notice}</Text>:null}
        {error?<Text accessibilityRole="alert" style={s.error}>{error}</Text>:null}
        <View style={{marginTop:(register?32:42.333)*scale,gap:(register?16:42.333)*scale}}>
          {register&&field('user','Username',username,setUsername,{autoCapitalize:'none',autoCorrect:false,maxLength:24,autoComplete:'username'})}
          {field(register?'mail':'user','Email Address',email,setEmail,{autoCapitalize:'none',autoCorrect:false,autoComplete:'email',keyboardType:'email-address'})}
          {field('lock','Password',password,setPassword,{secureTextEntry:true,autoComplete:register?'new-password':'current-password'})}
          {register&&field('lock','Confirm Password',confirm,setConfirm,{secureTextEntry:true,autoComplete:'new-password'})}
        </View>
        <ContinueButton radius={12} onPress={submit} busy={busy} style={{marginTop:(register?32:74.333)*scale,height:Math.max(48,56*scale),borderRadius:12}}>Continue</ContinueButton>
        <View style={{marginTop:(register?32:74.333)*scale,flexDirection:'row',alignItems:'center',gap:16*scale,height:16*scale}}><View style={s.rule}/><Text style={[s.copy,{fontSize:12*scale,lineHeight:16*scale}]}>or sign up with</Text><View style={s.rule}/></View>
        <View style={{flexDirection:'row',gap:16*scale,marginTop:(register?32:58.333)*scale,paddingRight:2*scale}}>
          {['google','apple'].map((name,index)=><Pressable key={name} disabled accessibilityRole="button" accessibilityLabel={`${name==='google'?'Google':'Apple'} sign in coming soon`} style={[s.social,{flex:index?173:159,height:Math.max(48,56*scale),gap:16*scale}]}><Icon name={name}/><Text style={{fontFamily:'Inter',fontSize:14,color:'#fff'}}>{name==='google'?'Google':'Apple'}</Text></Pressable>)}
        </View>
        <Pressable accessibilityRole="button" disabled={busy} onPress={()=>setMode(register?'login':'register')} style={{padding:8*scale,marginTop:24*scale}}><Text style={[s.copy,{fontSize:12,textAlign:'center'}]}>{register?'Already have an account? Log in':'New to Mancord? Create an account'}</Text></Pressable>
        <View style={{flex:1,minHeight:32*scale}}/><Back footer/>
      </View>
    </ScrollView>
  </KeyboardAvoidingView></SafeAreaView>;
}

const s=StyleSheet.create({
  safe:{flex:1,backgroundColor:'#000'},scroll:{flexGrow:1,alignItems:'center'},
  heading:{fontFamily:'Inter',fontWeight:'700',color:'#fff',includeFontPadding:false},copy:{fontFamily:'Inter',color:'#c4b4ff',includeFontPadding:false},backText:{fontFamily:'Inter',color:'#a684ff'},
  field:{flexDirection:'row',alignItems:'center',backgroundColor:'#2d1b4e',borderWidth:1,borderColor:'#7f22fe',borderRadius:12},input:{flex:1,minWidth:0,fontFamily:'Inter',fontSize:14,color:'#fff',paddingVertical:0,includeFontPadding:false},
  rule:{flex:1,height:1,backgroundColor:'#ffffff1a'},social:{borderRadius:12,backgroundColor:'#2d1b4e',flexDirection:'row',alignItems:'center',justifyContent:'center'},
  notice:{fontFamily:'Inter',fontSize:12,color:'#a6e4c1',backgroundColor:'#183026',padding:12,borderRadius:12,marginTop:16},error:{fontFamily:'Inter',fontSize:12,color:'#ffb5c1',backgroundColor:'#3b1825',padding:12,borderRadius:12,marginTop:16},
});
