import React from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { CalendarDays, ChevronLeft, ChevronRight, Link2, MoreHorizontal, Shield } from 'lucide-react-native';

function ProfileBackground() {
  return <Svg pointerEvents="none" width="100%" height="100%" style={StyleSheet.absoluteFill} viewBox="0 0 441 834" preserveAspectRatio="xMidYMid slice">
    <Defs>
      <LinearGradient id="profileBase" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#130027"/><Stop offset="0.28" stopColor="#08070b"/><Stop offset="1" stopColor="#08070b"/></LinearGradient>
      <RadialGradient id="profilePurple" cx="0.08" cy="0" rx="0.85" ry="0.62"><Stop offset="0" stopColor="#8d12ff" stopOpacity="0.98"/><Stop offset="0.55" stopColor="#3f0788" stopOpacity="0.7"/><Stop offset="1" stopColor="#130027" stopOpacity="0"/></RadialGradient>
      <RadialGradient id="profileGlow" cx="0.8" cy="0.95" rx="0.6" ry="0.45"><Stop offset="0" stopColor="#8c16ff" stopOpacity="0.3"/><Stop offset="1" stopColor="#08070b" stopOpacity="0"/></RadialGradient>
    </Defs>
    <Rect width="441" height="834" fill="url(#profileBase)"/>
    <Rect width="441" height="255" fill="url(#profilePurple)"/>
    <Rect width="441" height="834" fill="url(#profileGlow)"/>
    <Ellipse cx="380" cy="64" rx="84" ry="84" fill="none" stroke="#9e35ff" strokeWidth="1" opacity="0.75"/>
    <Circle cx="380" cy="64" r="70" fill="none" stroke="#6820bb" strokeWidth="1" opacity="0.7"/>
  </Svg>;
}

function Avatar({ profile }) {
  const name = profile?.display_name || profile?.username || '?';
  return profile?.avatar_url
    ? <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage}/>
    : <View style={styles.avatarFallback}><Text style={styles.avatarLetter}>{name[0].toUpperCase()}</Text></View>;
}

export default function ServerProfileModal({ visible, profile, server, onClose, canMessage = !server }) {
  const name = profile?.display_name || profile?.username || 'Mancord user';
  const username = profile?.username || 'user';
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.backdrop}>
      <View style={styles.card}>
        <ProfileBackground/>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close server profile" onPress={onClose} style={styles.headerButton}><ChevronLeft color="#fff" size={28}/></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="More profile actions" style={styles.headerButton}><MoreHorizontal color="#fff" size={24}/></Pressable>
        </View>
        <View style={styles.hero}>
          <View style={styles.avatarRing}><Avatar profile={profile}/><View style={styles.online}/></View>
          <View style={styles.presence}><View style={styles.onlineDot}/><Text style={styles.presenceText}>Online</Text><ChevronRight color="#fff" size={17}/></View>
          <Text style={styles.name}>{name}<Text style={styles.star}>★</Text></Text>
          <Text style={styles.handle}>@{username}<Text style={styles.separator}> | </Text><Text style={styles.serverName}>{server?.name || 'MANCORD'}</Text></Text>
          <View style={styles.actions}>{canMessage && <Pressable accessibilityRole="button" style={styles.message}><Text style={styles.messageText}>Message</Text></Pressable>}<Pressable accessibilityRole="button" accessibilityLabel="More actions" style={styles.more}><MoreHorizontal color="#fff" size={22}/></Pressable></View>
        </View>
        <View style={styles.body}>
          <View style={styles.section}><Text style={styles.sectionTitle}>Bio</Text><Text style={styles.copy}>Just a gamer who loves to explore new worlds,{"\n"}connect with people and be part of something bigger. 🎮</Text></View>
          <View style={styles.section}><Text style={styles.sectionTitle}>Member Since</Text><View style={styles.memberRow}><Text style={styles.memberValue}><CalendarDays color="#b9a1db" size={20}/>Oct 31, 2026</Text><View style={styles.divider}/><Text style={styles.memberValue}><Shield color="#b9a1db" size={19}/>Oct 31, 2026</Text></View></View>
          <View style={styles.section}><Text style={styles.sectionTitle}>Connections</Text><Pressable style={styles.connectionRow} accessibilityLabel="View connections"><ChevronRight color="#d6c1ef" size={22}/></Pressable><Pressable style={styles.addConnection}><Link2 color="#b66cff" size={20}/><Text style={styles.addText}>Add Connection</Text></Pressable></View>
        </View>
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop:{flex:1,backgroundColor:'#000c'},card:{flex:1,overflow:'hidden',backgroundColor:'#08070b'},header:{position:'absolute',zIndex:3,top:38,left:0,right:0,paddingHorizontal:18,flexDirection:'row',justifyContent:'space-between'},headerButton:{width:40,height:40,alignItems:'center',justifyContent:'center'},hero:{height:445,alignItems:'center',paddingTop:105},avatarRing:{width:136,height:136,padding:4,borderRadius:68,borderWidth:5,borderColor:'#9c35ff',shadowColor:'#a222ff',shadowOpacity:.95,shadowRadius:20,elevation:14},avatarImage:{width:'100%',height:'100%',borderRadius:64},avatarFallback:{width:'100%',height:'100%',borderRadius:64,alignItems:'center',justifyContent:'center',backgroundColor:'#251044'},avatarLetter:{fontSize:45,fontWeight:'800',color:'#e7d8ff'},online:{position:'absolute',right:1,bottom:3,width:23,height:23,borderRadius:12,borderWidth:3,borderColor:'#08070b',backgroundColor:'#16df7a'},presence:{position:'absolute',top:183,right:20,height:35,paddingHorizontal:13,borderRadius:19,borderWidth:1,borderColor:'#8629ec',backgroundColor:'#180b30',flexDirection:'row',alignItems:'center',gap:7},onlineDot:{width:9,height:9,borderRadius:5,backgroundColor:'#20d77a'},presenceText:{fontSize:13,color:'#f4edff'},name:{marginTop:12,fontSize:25,lineHeight:31,fontWeight:'800',color:'#f4edff'},star:{color:'#b230ff'},handle:{marginTop:4,fontSize:13,color:'#a89acb'},separator:{color:'#81719b'},serverName:{paddingHorizontal:7,color:'#cf8aff',fontSize:11,fontWeight:'800',borderWidth:1,borderColor:'#9c35ff',borderRadius:6},actions:{height:45,marginTop:54,flexDirection:'row',gap:8},message:{width:168,height:45,borderRadius:15,alignItems:'center',justifyContent:'center',backgroundColor:'#8619ef'},messageText:{color:'#fff',fontSize:16,fontWeight:'800'},more:{width:45,height:45,borderRadius:15,borderWidth:1,borderColor:'#4e2084',alignItems:'center',justifyContent:'center',backgroundColor:'#130a24'},body:{flex:1,paddingBottom:22,gap:10},section:{marginHorizontal:18,padding:14,paddingHorizontal:17,borderRadius:18,borderWidth:1,borderColor:'#452260',backgroundColor:'#160d25'},sectionTitle:{marginBottom:8,paddingLeft:8,borderLeftWidth:4,borderLeftColor:'#a435ff',fontSize:15,fontWeight:'800',color:'#f4edff'},copy:{fontSize:11,lineHeight:18,color:'#a89acb'},memberRow:{flexDirection:'row',alignItems:'center',gap:10},memberValue:{flex:1,flexDirection:'row',alignItems:'center',gap:7,fontSize:12,color:'#a89acb'},divider:{height:20,borderLeftWidth:2,borderLeftColor:'#8b70a5'},connectionRow:{height:45,borderRadius:14,borderWidth:1,borderColor:'#452260',alignItems:'flex-end',justifyContent:'center',paddingHorizontal:10},addConnection:{height:35,marginTop:9,borderRadius:14,borderWidth:1,borderColor:'#a435ff',flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8},addText:{fontSize:16,fontWeight:'800',color:'#b66cff'}
});
