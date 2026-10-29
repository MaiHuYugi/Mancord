import React, { useEffect, useRef, useState } from 'react';
import { BackHandler, Image, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { Send, X } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import DesignAsset from './DesignAsset';
import { ProfileMedia } from './DesignScreens';

const emojis = [0x1f600, 0x1f602, 0x2764, 0x1f44d, 0x1f389, 0x1f525, 0x1f440, 0x2728].map(code => String.fromCodePoint(code));

// Scale the original Figma surfaces without changing their SVG root dimensions.
function Surface({ name, width, height, naturalWidth, naturalHeight, left = 0 }) {
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}><View style={{ position:'absolute', left, top:0, width:naturalWidth, height:naturalHeight, transformOrigin:'top left', transform:[{scaleX:width/naturalWidth},{scaleY:height/naturalHeight}] }}><DesignAsset name={name}/></View></View>;
}

function EmojiIcon() {
  return <View style={{width:20,height:20}}><DesignAsset name="textSmile"/><View style={{position:'absolute',left:4.6,top:5.6}}><DesignAsset name="textEye"/></View><View style={{position:'absolute',left:12.6,top:5.6}}><DesignAsset name="textEye"/></View><View style={{position:'absolute',left:4.25,top:12.25}}><DesignAsset name="textMouth"/></View></View>;
}

export default function TextChannelScreen({ channel, profile, messages, draft, onDraftChange, onSend, onBack, error }) {
  const [size, setSize] = useState({width:390,height:844});
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const [fileError, setFileError] = useState('');
  const [reading, setReading] = useState(false);
  const [composerHeight, setComposerHeight] = useState(45);
  const list = useRef(null), input = useRef(null), nearBottom = useRef(true);
  const visible = messages.filter(message => `${message.text} ${message.attachment?.name || ''}`.toLowerCase().includes(search.trim().toLowerCase()));
  const narrow = size.width < 350;

  useEffect(() => { const subscription = BackHandler.addEventListener('hardwareBackPress', () => { onBack(); return true; }); return () => subscription.remove(); }, [onBack]);

  async function send() {
    if (reading || (!draft.trim() && !attachment)) return;
    if (await onSend(attachment)) { setAttachment(null); setSearch(''); setEmojiOpen(false); setFileError(''); nearBottom.current = true; }
    input.current?.focus();
  }

  async function attach() {
    setFileError('');
    try {
      const result = await DocumentPicker.getDocumentAsync({type:['image/jpeg','image/png','image/webp','image/gif','application/pdf','text/plain'],copyToCacheDirectory:true});
      if (result.canceled) return;
      setReading(true);
      const selected = result.assets[0], file = new File(selected.uri);
      if ((selected.size ?? file.size) > 1024 * 1024) { setFileError('Choose a file up to 1 MB.'); return; }
      const type = selected.mimeType || 'application/octet-stream';
      setAttachment({name:selected.name,type,dataUrl:`data:${type};base64,${await file.base64()}`});
    } catch { setFileError('Could not attach this file. Try again.'); }
    finally { setReading(false); }
  }

  return <SafeAreaView style={s.safe}><StatusBar barStyle="light-content" backgroundColor="#31163d"/><KeyboardAvoidingView style={s.page} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} onLayout={event => setSize(event.nativeEvent.layout)}>
    <Surface name="textBackground" width={size.width+125} height={size.height} naturalWidth={515} naturalHeight={844} left={-40}/>
    <View style={[s.header,narrow&&{paddingHorizontal:8,gap:6}]}>
      <Surface name="textHeader" width={size.width-28} height={76} naturalWidth={362} naturalHeight={76}/>
      <Pressable accessibilityRole="button" accessibilityLabel="Back to channels" onPress={onBack} style={s.back}><DesignAsset name="textBack"/></Pressable>
      <Text style={s.hash}>#</Text><View style={s.heading}><Text numberOfLines={1} style={[s.title,narrow&&{fontSize:17}]}>{channel.name}</Text><View style={s.presence}><DesignAsset name="textOnline"/><Text style={s.presenceText}>1 Online</Text></View></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Search messages" accessibilityState={{expanded:searchOpen}} onPress={() => {setSearchOpen(!searchOpen);setSearch('');}} style={s.iconButton}><DesignAsset name="textSearch"/></Pressable>
    </View>
    {searchOpen&&<View style={s.search}><TextInput autoFocus value={search} onChangeText={setSearch} placeholder={`Search #${channel.name}`} placeholderTextColor="#b9a8c7" accessibilityLabel="Search this channel" style={s.searchInput}/><Pressable accessibilityRole="button" accessibilityLabel="Close search" onPress={()=>{setSearch('');setSearchOpen(false);}} style={s.smallButton}><X size={18} color="#eddbff"/></Pressable></View>}
    <ScrollView ref={list} style={s.messages} contentContainerStyle={s.messageContent} keyboardShouldPersistTaps="handled" onScroll={event=>{const {layoutMeasurement,contentOffset,contentSize}=event.nativeEvent;nearBottom.current=contentSize.height-contentOffset.y-layoutMeasurement.height<80;}} scrollEventThrottle={16} onContentSizeChange={()=>{if(nearBottom.current)list.current?.scrollToEnd({animated:false});}}>
      {search.trim()&&<Text style={s.help}>{visible.length ? `${visible.length} matching messages` : 'No messages found.'}</Text>}
      {visible.map((message,index)=>{const date=new Date(message.createdAt);return <View key={message.id}>
        {(!index||new Date(visible[index-1].createdAt).toDateString()!==date.toDateString())&&<Text style={s.date}>{date.toLocaleDateString()}</Text>}
        <View style={s.message}><ProfileMedia uri={message.author?.avatar_url||profile.avatar_url} type={message.author?.avatar_media_type||profile.avatar_media_type} size={36}/><View style={s.messageBody}><View style={s.byline}><Text style={s.author}>{message.author?.display_name||message.author?.username||profile.display_name||profile.username||'You'}</Text><Text style={s.time}>{date.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</Text></View>{Boolean(message.text)&&<Text selectable style={s.messageText}>{message.text}</Text>}{message.attachment&&<View style={s.file}>{message.attachment.type.startsWith('image/')&&<Image source={{uri:message.attachment.dataUrl}} style={s.image} resizeMode="contain" accessibilityLabel={message.attachment.name}/>}<Text selectable style={s.help}>{message.attachment.name}</Text></View>}</View></View>
      </View>;})}
    </ScrollView>
    <View style={s.composerArea}>
      {attachment&&<View style={s.pending}><Text numberOfLines={1} style={[s.help,{flex:1}]}>{attachment.name}</Text><Pressable accessibilityRole="button" accessibilityLabel="Remove attachment" onPress={()=>setAttachment(null)} style={s.smallButton}><X size={18} color="#eddbff"/></Pressable></View>}
      {emojiOpen&&<View style={s.emojis}>{emojis.map(emoji=><Pressable key={emoji} accessibilityRole="button" accessibilityLabel={`Insert ${emoji}`} onPress={()=>{onDraftChange(draft+emoji);setEmojiOpen(false);input.current?.focus();}} style={s.emojiChoice}><Text style={{fontSize:22}}>{emoji}</Text></Pressable>)}</View>}
      <View style={s.composer} onLayout={event=>setComposerHeight(event.nativeEvent.layout.height)}>
        <Surface name="textComposer" width={size.width-28} height={composerHeight} naturalWidth={363} naturalHeight={46}/>
        <Pressable accessibilityRole="button" accessibilityLabel="Attach a file" disabled={reading} onPress={attach} style={s.smallButton}><DesignAsset name="textPlus"/></Pressable><DesignAsset name="textDivider"/>
        <TextInput ref={input} value={draft} onChangeText={onDraftChange} placeholder={`Message ${channel.name}`} placeholderTextColor="#b9a8c7" accessibilityLabel={`Message ${channel.name}`} style={s.input} multiline submitBehavior="submit" onSubmitEditing={send} returnKeyType="send"/>
        <Pressable accessibilityRole="button" accessibilityLabel="Add emoji" onPress={()=>setEmojiOpen(!emojiOpen)} style={s.smallButton}><EmojiIcon/></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Send message" accessibilityState={{disabled:reading||(!draft.trim()&&!attachment)}} disabled={reading||(!draft.trim()&&!attachment)} onPress={send} style={[s.send,(reading||(!draft.trim()&&!attachment))&&{opacity:.35}]}><Send size={20} color="#eddbff"/></Pressable>
      </View>
      {Boolean(error||fileError||reading)&&<Text accessibilityRole={error||fileError?'alert':undefined} style={s.help}>{error||fileError||'Reading file...'}</Text>}
    </View>
  </KeyboardAvoidingView></SafeAreaView>;
}

const s=StyleSheet.create({
  safe:{flex:1,backgroundColor:'#31163d'},page:{flex:1,overflow:'hidden'},header:{height:76,flexDirection:'row',alignItems:'center',gap:12,marginTop:14,marginLeft:18,marginRight:10,paddingHorizontal:18,borderRadius:22,overflow:'hidden'},back:{width:36,height:76,alignItems:'center',justifyContent:'center',paddingTop:20},hash:{fontFamily:'Inter',fontSize:21,fontWeight:'700',color:'#fff',alignSelf:'flex-start',marginTop:23},heading:{flex:1,minWidth:0,paddingTop:16,alignSelf:'stretch'},title:{fontFamily:'Inter',fontSize:21,lineHeight:25,fontWeight:'700',color:'#fff'},presence:{flexDirection:'row',alignItems:'center',gap:8,marginTop:6},presenceText:{fontFamily:'Inter',fontSize:14,color:'#cfc5db'},iconButton:{width:36,height:44,alignItems:'center',justifyContent:'center',alignSelf:'flex-start',marginTop:10},search:{flexDirection:'row',alignItems:'center',gap:8,marginTop:12,marginLeft:18,marginRight:10,paddingHorizontal:12,borderRadius:14,backgroundColor:'#1a1029'},searchInput:{flex:1,minWidth:0,fontFamily:'Inter',color:'#fff',fontSize:15,paddingVertical:12},messages:{flex:1},messageContent:{paddingHorizontal:18,paddingTop:24,paddingBottom:12},date:{fontFamily:'Inter',fontSize:11,color:'#cfc5db',textAlign:'center',marginBottom:20},message:{flexDirection:'row',gap:12,marginBottom:20},messageBody:{flex:1,minWidth:0},byline:{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:8},author:{fontFamily:'Inter',fontSize:13,fontWeight:'700',color:'#fff'},time:{fontFamily:'Inter',fontSize:10,color:'#cfc5db'},messageText:{fontFamily:'Inter',fontSize:14,lineHeight:23,color:'#f4eafc'},composerArea:{marginLeft:18,marginRight:10,marginBottom:10},composer:{minHeight:45,flexDirection:'row',alignItems:'center',gap:8,paddingLeft:8,paddingRight:8,borderRadius:17,backgroundColor:'#1a1029',overflow:'hidden'},smallButton:{width:30,minHeight:36,alignItems:'center',justifyContent:'center'},input:{flex:1,minWidth:0,minHeight:37,maxHeight:120,paddingVertical:8,paddingHorizontal:0,fontFamily:'Inter',fontSize:15,lineHeight:21,color:'#fff'},send:{width:34,height:34,borderRadius:10,backgroundColor:'#75409a',alignItems:'center',justifyContent:'center'},help:{fontFamily:'Inter',fontSize:12,lineHeight:20,color:'#eddbff'},pending:{flexDirection:'row',alignItems:'center',gap:8,backgroundColor:'#1a1029',borderRadius:12,paddingHorizontal:12,marginBottom:8},emojis:{flexDirection:'row',flexWrap:'wrap',justifyContent:'flex-end',gap:4,padding:8,borderRadius:14,backgroundColor:'#1a1029',marginBottom:8},emojiChoice:{width:34,height:36,alignItems:'center',justifyContent:'center'},file:{marginTop:8,padding:10,borderRadius:12,backgroundColor:'#1a1029'},image:{width:'100%',height:180},
});
