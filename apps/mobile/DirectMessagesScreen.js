import React, { useEffect, useRef, useState } from 'react';
import { AppState, BackHandler, KeyboardAvoidingView, Modal, Platform, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, TextInput, View } from 'react-native';
import { ArrowLeft, Check, Home, MessageCircle, Search, Send, Settings, SquarePen, Users, X } from 'lucide-react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { supabase } from './supabase';
import { ProfileMedia, Text } from './DesignScreens';

const nameOf = user => user.display_name || user.username;
const matches = (user, query) => `${nameOf(user)} ${user.username}`.toLowerCase().includes(query.trim().toLowerCase());
const readKey = id => `mancord:dm-read:${id}`;
function loadReads(id) {
  try { return JSON.parse(localStorage.getItem(readKey(id))) || {}; } catch { return {}; }
}
function age(date, now) {
  const minutes = Math.max(0, Math.floor((now - new Date(date).getTime()) / 60000));
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
  if (minutes < 10080) return `${Math.floor(minutes / 1440)}d`;
  return new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric' });
}
function Avatar({ user, online = false, size = 57, highlighted = false }) {
  return <View style={{ width: size, height: size }}>
    <View style={[s.avatar, { width: size, height: size, borderRadius: size / 2, borderColor: highlighted ? '#a34cff' : '#79509d' }]}>
      {user.avatar_url ? <ProfileMedia uri={user.avatar_url} type={user.avatar_media_type} size={size - 2}/> : <Text style={{ color: '#e5ceff', fontWeight: '700', fontSize: size * .38 }}>{nameOf(user)?.[0]?.toUpperCase() || '?'}</Text>}
    </View>
    {online && <View style={s.presence}/>}
  </View>;
}

export default function DirectMessagesScreen({ profile, servers = [], onlineUsers = [], onBack, onJoinedServer, onGroupCreated, onSettings }) {
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selected, setSelected] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [query, setQuery] = useState('');
  const [opened, setOpened] = useState([]);
  const [reads, setReads] = useState(() => loadReads(profile.id));
  const [loading, setLoading] = useState(true);
  const [peopleError, setPeopleError] = useState('');
  const [notice, setNotice] = useState('');
  const [sending, setSending] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [mode, setMode] = useState('message');
  const [peopleQuery, setPeopleQuery] = useState('');
  const [chosen, setChosen] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [creating, setCreating] = useState(false);
  const [groupError, setGroupError] = useState('');
  const [now, setNow] = useState(Date.now());
  const list = useRef(null), nearBottom = useRef(true), sendingRef = useRef(false), creatingRef = useRef(false), groupProgress = useRef(null);
  const friend = users.find(user => user.id === selected);
  const draft = drafts[selected] || '';
  const locked = !!groupProgress.current;

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true, peopleVersion = 0, messageVersion = 0;
    const loadPeople = async () => {
      const version = ++peopleVersion;
      try {
        const { data, error } = await supabase.from('profiles').select('id,username,display_name,avatar_url,avatar_media_type').neq('id', profile.id).order('username');
        if (!active || version !== peopleVersion) return;
        if (error) throw error;
        setUsers(data || []); setPeopleError('');
      } catch (error) { if (active && version === peopleVersion) setPeopleError(error.message); }
    };
    const loadMessages = async () => {
      const version = ++messageVersion;
      try {
        const items = [];
        for (let start = 0; ; start += 1000) {
          const { data, error } = await supabase.from('direct_messages').select('id,sender_id,recipient_id,body,created_at').or(`sender_id.eq.${profile.id},recipient_id.eq.${profile.id}`).order('created_at').order('id').range(start, start + 999);
          if (!active || version !== messageVersion) return;
          if (error) throw error;
          items.push(...(data || []));
          if (!data || data.length < 1000) break;
        }
        setMessages(items);
      } catch (error) { if (active && version === messageVersion) setNotice(error.message); }
    };
    Promise.all([loadPeople(), loadMessages()]).finally(() => { if (active) setLoading(false); });
    const channel = supabase.channel(`mobile-inbox:${profile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, loadPeople)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'direct_messages', filter: `sender_id=eq.${profile.id}` }, loadMessages)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'direct_messages', filter: `recipient_id=eq.${profile.id}` }, loadMessages)
      .subscribe(status => { if (status === 'SUBSCRIBED') loadMessages(); });
    const appState = AppState.addEventListener('change', state => { if (state === 'active') { loadPeople(); loadMessages(); } });
    return () => { active = false; supabase.removeChannel(channel); appState.remove(); };
  }, [profile.id]);

  const threads = new Map();
  for (const item of messages) {
    const id = item.sender_id === profile.id ? item.recipient_id : item.sender_id;
    threads.set(id, { latest: item, unread: (threads.get(id)?.unread || 0) + (item.sender_id !== profile.id && item.created_at > (reads[id] || '') ? 1 : 0) });
  }
  const conversation = messages.filter(item => item.sender_id === selected || item.recipient_id === selected);
  const latestIncoming = conversation.filter(item => item.sender_id === selected).at(-1)?.created_at;
  const visible = users.filter(user => (threads.has(user.id) || opened.includes(user.id)) && (matches(user, query) || threads.get(user.id)?.latest.body.toLowerCase().includes(query.trim().toLowerCase()))).sort((a, b) => (threads.get(b.id)?.latest.created_at || '').localeCompare(threads.get(a.id)?.latest.created_at || ''));

  useEffect(() => {
    if (!selected || !latestIncoming) return;
    const markRead = () => {
      if (AppState.currentState && AppState.currentState !== 'active') return;
      setReads(previous => {
        if ((previous[selected] || '') >= latestIncoming) return previous;
        const next = { ...previous, [selected]: latestIncoming };
        try { localStorage.setItem(readKey(profile.id), JSON.stringify(next)); } catch { /* Chat remains available if device storage is full. */ }
        return next;
      });
    };
    markRead();
    const subscription = AppState.addEventListener('change', markRead);
    return () => subscription.remove();
  }, [profile.id, selected, latestIncoming]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (pickerOpen) { if (!creatingRef.current) setPickerOpen(false); }
      else if (selected) { setSelected(null); setInviteOpen(false); }
      else onBack();
      return true;
    });
    return () => subscription.remove();
  }, [selected, pickerOpen, onBack]);

  function openConversation(id) {
    nearBottom.current = true; setSelected(id); setOpened(previous => previous.includes(id) ? previous : [...previous, id]); setNotice(''); setInviteOpen(false);
  }
  async function send(body) {
    const text = typeof body === 'string' ? body : draft.trim();
    if (!text || !friend || sendingRef.current) return;
    const recipient = friend.id;
    sendingRef.current = true; setSending(true); setNotice('');
    try {
      const { data, error } = await supabase.from('direct_messages').insert({ sender_id: profile.id, recipient_id: recipient, body: text }).select('id,sender_id,recipient_id,body,created_at').single();
      if (error) throw error;
      nearBottom.current = true;
      setMessages(previous => [...previous.filter(item => item.id !== data.id), data].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id)));
      if (typeof body !== 'string') setDrafts(previous => previous[recipient] === draft ? { ...previous, [recipient]: '' } : previous);
    } catch (error) { setNotice(error.message || 'Could not send. Please try again.'); }
    finally { sendingRef.current = false; setSending(false); }
  }
  async function invite(server) {
    try {
      const { data: token, error } = await supabase.rpc('create_server_invite', { target_server: server.id });
      if (error) throw error;
      await send(`Join my server ${server.name}: mancord://invite/${token}`); setInviteOpen(false);
    } catch (error) { setNotice(error.message); }
  }
  async function join(token) {
    try {
      const { data: id, error } = await supabase.rpc('join_server_by_invite', { invite_token: token });
      if (error) throw error;
      await onJoinedServer?.(id);
    } catch (error) { setNotice(error.message); }
  }
  async function submitPicker() {
    if (creatingRef.current || !chosen.length || (mode === 'group' && !groupName.trim())) return;
    if (mode === 'message') { openConversation(chosen[0]); setPickerOpen(false); return; }
    creatingRef.current = true; setCreating(true); setGroupError('');
    try {
      if (!groupProgress.current) {
        const { data, error } = await supabase.rpc('create_server', { server_name: groupName.trim() });
        if (error) throw error;
        groupProgress.current = { serverId: data, channel: null, added: new Set() };
      }
      const progress = groupProgress.current;
      if (!progress.channel) {
        const { data, error } = await supabase.from('channels').insert({ server_id: progress.serverId, name: 'group-chat', kind: 'text' }).select('id,name,kind').single();
        if (error) throw error;
        progress.channel = data;
      }
      for (const id of chosen) {
        if (progress.added.has(id)) continue;
        const { error } = await supabase.rpc('add_server_member', { target_server: progress.serverId, target_user: id });
        if (error) throw error;
        progress.added.add(id);
      }
      await onGroupCreated(progress.serverId, progress.channel);
      groupProgress.current = null; setPickerOpen(false); setChosen([]); setGroupName(''); setPeopleQuery('');
    } catch (error) { setGroupError(`${groupProgress.current ? 'Your group was created. Retry to finish setup. ' : ''}${error.message || 'Please try again.'}`); }
    finally { creatingRef.current = false; setCreating(false); }
  }

  return <SafeAreaView style={s.safe}>
    <StatusBar barStyle="light-content" backgroundColor="#100a19"/>
    <KeyboardAvoidingView style={s.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View pointerEvents="none" style={s.atmosphere}><Svg width="100%" height="500"><Defs><RadialGradient id="dm-glow" cx="50%" cy="30%" rx="85%" ry="75%"><Stop offset="0" stopColor="#7f22fe" stopOpacity=".24"/><Stop offset="1" stopColor="#7f22fe" stopOpacity="0"/></RadialGradient></Defs><Rect width="100%" height="500" fill="url(#dm-glow)"/></Svg></View>
      {friend ? <>
        <View style={s.chatHeader}><Pressable accessibilityRole="button" accessibilityLabel="Back to messages" hitSlop={8} onPress={() => { setSelected(null); setInviteOpen(false); }} style={s.iconButton}><ArrowLeft color="#c4b6ff" size={22}/></Pressable><Avatar user={friend} size={40} online={onlineUsers.includes(friend.id)}/><View style={s.fill}><Text numberOfLines={1} style={s.personName}>{nameOf(friend)}</Text><Text style={s.chatStatus}>{onlineUsers.includes(friend.id) ? 'Online' : 'Offline'}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Invite to server" onPress={() => setInviteOpen(value => !value)} style={s.invite}><Text style={s.inviteText}>Invite</Text></Pressable></View>
        {inviteOpen && <ScrollView horizontal style={s.inviteList} contentContainerStyle={s.inviteItems}>{servers.length ? servers.map(server => <Pressable key={server.id} accessibilityRole="button" onPress={() => invite(server)} style={s.invite}><Text style={s.inviteText}>{server.name}</Text></Pressable>) : <Text style={s.muted}>No groups to invite to yet.</Text>}</ScrollView>}
        <ScrollView ref={list} style={s.fill} contentContainerStyle={s.chatMessages} keyboardShouldPersistTaps="handled" onScroll={event => { const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent; nearBottom.current = contentSize.height - contentOffset.y - layoutMeasurement.height < 80; }} scrollEventThrottle={100} onContentSizeChange={() => { if (nearBottom.current) list.current?.scrollToEnd({ animated: false }); }}>
          {!conversation.length && <Text style={s.emptyCopy}>Start a conversation with {nameOf(friend)}.</Text>}
          {conversation.map(item => {
            const author = item.sender_id === profile.id ? profile : friend;
            const token = item.body.match(/(?:invite=|mancord:\/\/invite\/)([a-zA-Z0-9]+)/)?.[1];
            return <View key={item.id} style={[s.chatMessage, item.sender_id === profile.id && s.sent]}><Avatar user={author} size={30}/><View style={s.bubble}><Text style={s.author}>{nameOf(author)}</Text><Text selectable style={s.body}>{item.body}</Text>{token && <Pressable accessibilityRole="button" onPress={() => join(token)} style={s.primary}><Text style={s.primaryText}>Join server</Text></Pressable>}<Text style={s.time}>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text></View></View>;
          })}
        </ScrollView>
        <View style={s.composer}><TextInput accessibilityLabel={`Message ${nameOf(friend)}`} placeholder={`Message ${nameOf(friend)}`} placeholderTextColor="#a8a5e4" value={draft} maxLength={4000} onChangeText={value => setDrafts(previous => ({ ...previous, [selected]: value }))} onSubmitEditing={() => send()} style={s.composerInput}/><Pressable accessibilityRole="button" accessibilityLabel="Send message" accessibilityState={{ disabled: sending || !draft.trim(), busy: sending }} disabled={sending || !draft.trim()} onPress={() => send()} style={[s.send, (sending || !draft.trim()) && s.disabled]}><Send color="white" size={19}/></Pressable></View>
      </> : <>
        <View style={s.header}><Text accessibilityRole="header" style={s.heading}>Messages</Text><Pressable accessibilityRole="button" accessibilityLabel="New message or group" onPress={() => setPickerOpen(true)} style={s.compose}><SquarePen size={23} color="white"/></Pressable></View>
        <View style={s.search}><Search size={20} color="#a8a5e4"/><TextInput accessibilityLabel="Search conversations" placeholder="Search conversations" placeholderTextColor="#a8a5e4" value={query} onChangeText={setQuery} style={s.searchInput}/>{!!query && <Pressable accessibilityRole="button" accessibilityLabel="Clear conversation search" onPress={() => setQuery('')}><X size={17} color="#a8a5e4"/></Pressable>}</View>
        <ScrollView style={s.fill} contentContainerStyle={s.threads} keyboardShouldPersistTaps="handled">
          <View style={s.listDivider}/>
          {loading ? <Text style={s.emptyCopy}>Loading conversations…</Text> : visible.map(user => {
            const thread = threads.get(user.id);
            return <Pressable key={user.id} accessibilityRole="button" accessibilityLabel={`Open chat with ${nameOf(user)}${thread?.unread ? `, ${thread.unread} unread messages` : ''}`} onPress={() => openConversation(user.id)} style={[s.thread, !!thread?.unread && s.unreadThread]}><Avatar user={user} online={onlineUsers.includes(user.id)} highlighted={!!thread?.unread}/><View style={s.threadCopy}><Text numberOfLines={1} style={s.personName}>{nameOf(user)}</Text><Text numberOfLines={1} style={s.preview}>{thread ? `${thread.latest.sender_id === profile.id ? 'You: ' : ''}${thread.latest.body}` : `Say hello to @${user.username}`}</Text></View><View style={s.threadMeta}>{thread && <Text style={s.threadTime}>{age(thread.latest.created_at, now)}</Text>}{!!thread?.unread && <View style={s.unreadBadge}><Text style={s.badgeText}>{thread.unread > 99 ? '99+' : thread.unread}</Text></View>}</View><View style={s.rowDivider}/></Pressable>;
          })}
          {!loading && !visible.length && <View style={s.empty}><MessageCircle color="#a34cff" size={34}/><Text style={s.emptyTitle}>{query ? 'No conversations found' : 'Your people, one message away'}</Text><Text style={s.emptyCopy}>{query ? 'Try another name or message.' : 'Start a conversation or bring everyone together in a group.'}</Text>{!query && <Pressable accessibilityRole="button" onPress={() => setPickerOpen(true)} style={s.primary}><Text style={s.primaryText}>Start a conversation</Text></Pressable>}</View>}
        </ScrollView>
        <View style={s.nav}>{[[Home, 'Home', onBack], [MessageCircle, 'Messages', () => setSelected(null)], [Users, 'Friends', () => setPickerOpen(true)], [Settings, 'Settings', onSettings]].map(([Icon, label, onPress]) => <Pressable key={label} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: label === 'Messages' }} onPress={onPress} style={s.navItem}><View style={[s.navIcon, label === 'Messages' && s.activeNavIcon]}><Icon size={23} color={label === 'Messages' ? '#a34cff' : '#a8a5e4'}/></View><Text style={[s.navLabel, label === 'Messages' && s.activeNavLabel]}>{label}</Text></Pressable>)}</View>
      </>}
      {!!(notice || peopleError) && <View style={s.notice}><Text accessibilityRole="alert" style={s.noticeText}>{notice || peopleError}</Text><Pressable accessibilityRole="button" accessibilityLabel="Dismiss message" hitSlop={8} onPress={() => { setNotice(''); setPeopleError(''); }}><X color="#ffb5d0" size={18}/></Pressable></View>}
      <Modal visible={pickerOpen} transparent animationType="fade" statusBarTranslucent onRequestClose={() => { if (!creatingRef.current) setPickerOpen(false); }}>
        <KeyboardAvoidingView style={s.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Dismiss people picker" disabled={creating} onPress={() => setPickerOpen(false)}/>
          <View accessibilityViewIsModal style={s.picker}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.pickerContent}>
            <View style={s.pickerHeader}><View style={s.fill}><Text accessibilityRole="header" style={s.pickerTitle}>{mode === 'group' ? 'Create a group' : 'New message'}</Text><Text style={s.pickerCopy}>{mode === 'group' ? 'Bring your people together in a group channel.' : 'Find someone and start a conversation.'}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Close people picker" disabled={creating} onPress={() => setPickerOpen(false)} style={s.iconButton}><X color="#a8a5e4" size={20}/></Pressable></View>
            <View style={s.tabs}>{[['message', 'Message', MessageCircle], ['group', 'Create group', Users]].map(([value, label, Icon]) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: mode === value, disabled: creating || locked }} disabled={creating || locked} onPress={() => { setMode(value); setChosen([]); setGroupError(''); }} style={[s.tab, mode === value && s.activeTab]}><Icon size={16} color={mode === value ? '#c28aff' : '#a8a5e4'}/><Text style={[s.tabText, mode === value && { color: '#c28aff' }]}>{label}</Text></Pressable>)}</View>
            {mode === 'group' && <View style={s.groupField}><Text style={s.fieldLabel}>Group name</Text><TextInput accessibilityLabel="Group name" placeholder="Give your group a name" placeholderTextColor="#827993" maxLength={80} editable={!creating && !locked} value={groupName} onChangeText={setGroupName} style={s.groupInput}/></View>}
            <View style={[s.search, s.pickerSearch]}><Search color="#a8a5e4" size={19}/><TextInput accessibilityLabel="Search people" placeholder="Search name or username" placeholderTextColor="#a8a5e4" value={peopleQuery} onChangeText={setPeopleQuery} style={s.searchInput}/></View>
            <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={s.peopleList}>
              {loading ? <Text style={s.emptyCopy}>Loading people…</Text> : peopleError ? <Text style={s.noticeText}>{peopleError}</Text> : users.filter(user => matches(user, peopleQuery)).map(user => <Pressable key={user.id} accessibilityRole="checkbox" accessibilityLabel={`Select ${nameOf(user)}`} accessibilityState={{ checked: chosen.includes(user.id), disabled: creating || locked }} disabled={creating || locked} onPress={() => setChosen(previous => mode === 'message' ? [user.id] : previous.includes(user.id) ? previous.filter(id => id !== user.id) : [...previous, user.id])} style={[s.personOption, chosen.includes(user.id) && s.selectedPerson]}><Avatar user={user} size={40} online={onlineUsers.includes(user.id)}/><View style={s.fill}><Text style={s.optionName}>{nameOf(user)}</Text><Text style={s.username}>@{user.username}</Text></View><View style={[s.checkbox, chosen.includes(user.id) && s.checked]}>{chosen.includes(user.id) && <Check color="white" size={15}/>}</View></Pressable>)}
              {!loading && !peopleError && !users.some(user => matches(user, peopleQuery)) && <Text style={s.emptyCopy}>{peopleQuery ? 'No people match your search.' : 'No other members yet.'}</Text>}
            </ScrollView>
            {!!groupError && <Text accessibilityRole="alert" style={s.groupError}>{groupError}</Text>}
            <View style={s.pickerFooter}><Text style={s.selectionCount}>{chosen.length ? `${chosen.length} selected` : 'Choose your people'}</Text><Pressable accessibilityRole="button" accessibilityLabel={locked ? 'Retry setup' : mode === 'group' ? 'Create group' : 'Start message'} accessibilityState={{ disabled: creating || loading || !chosen.length || (mode === 'group' && !groupName.trim()), busy: creating }} disabled={creating || loading || !chosen.length || (mode === 'group' && !groupName.trim())} onPress={submitPicker} style={[s.primary, (creating || loading || !chosen.length || (mode === 'group' && !groupName.trim())) && s.disabled]}><Text style={s.primaryText}>{creating ? 'Creating…' : locked ? 'Retry setup' : mode === 'group' ? 'Create group' : 'Start message'}</Text></Pressable></View>
          </ScrollView></View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#09090b' }, fill: { flex: 1, minWidth: 0 },
  atmosphere: { position: 'absolute', top: 0, left: 0, right: 0, height: 500 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 28, paddingHorizontal: 22, paddingBottom: 10 },
  heading: { color: '#fbfaff', fontSize: 28, fontWeight: '700', letterSpacing: -.7 },
  compose: { width: 42, height: 42, borderRadius: 13, borderWidth: 1, borderColor: '#bc6dff', backgroundColor: '#861bff', alignItems: 'center', justifyContent: 'center' },
  search: { height: 42, flexDirection: 'row', alignItems: 'center', gap: 13, marginHorizontal: 22, marginBottom: 14, paddingHorizontal: 15, borderWidth: 1, borderColor: '#7131b44d', borderRadius: 14, backgroundColor: '#0b0c16b3' },
  searchInput: { flex: 1, minWidth: 0, height: 42, paddingVertical: 0, fontFamily: 'Inter', color: '#fbfaff', fontSize: 13 },
  threads: { paddingHorizontal: 22 }, listDivider: { height: 1, backgroundColor: '#a34cff15', marginBottom: 4 },
  thread: { minHeight: 77, flexDirection: 'row', alignItems: 'flex-start', gap: 21, paddingTop: 4, paddingBottom: 16 }, unreadThread: { backgroundColor: '#7f22fe12' },
  avatar: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#322044', borderWidth: 1, overflow: 'hidden' },
  presence: { position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderRadius: 7, backgroundColor: '#23e66c', borderWidth: 3, borderColor: '#100b18' },
  threadCopy: { flex: 1, minWidth: 0, paddingTop: 5, gap: 4 }, personName: { fontSize: 15, lineHeight: 20, fontWeight: '700', color: '#fbfaff' }, preview: { fontSize: 13, lineHeight: 18, color: '#a8a5e4' },
  threadMeta: { alignItems: 'flex-end', gap: 6, paddingTop: 6 }, threadTime: { fontSize: 12, lineHeight: 16, color: '#a8a5e4' },
  unreadBadge: { minWidth: 26, height: 26, paddingHorizontal: 6, borderRadius: 13, backgroundColor: '#861bff', alignItems: 'center', justifyContent: 'center' }, badgeText: { fontSize: 12, fontWeight: '700', color: 'white' },
  rowDivider: { position: 'absolute', bottom: 0, left: 79, right: 0, height: 1, backgroundColor: '#a34cff15' },
  nav: { minHeight: 84, paddingTop: 6, paddingBottom: 13, paddingHorizontal: 12, flexDirection: 'row', borderTopWidth: 1, borderColor: '#a8a5e41a', backgroundColor: '#080910' }, navItem: { flex: 1, alignItems: 'center' }, navIcon: { width: 48, height: 42, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 2 }, activeNavIcon: { backgroundColor: '#7f22fe1f' }, navLabel: { fontSize: 11.2, color: '#a8a5e4' }, activeNavLabel: { fontWeight: '700', color: '#a34cff' },
  empty: { alignItems: 'center', paddingHorizontal: 10, paddingTop: 65, gap: 14 }, emptyTitle: { fontSize: 16, fontWeight: '600', textAlign: 'center' }, emptyCopy: { fontSize: 13, lineHeight: 21, color: '#a8a5e4', textAlign: 'center', paddingVertical: 20 }, muted: { color: '#a8a5e4', fontSize: 12 },
  primary: { backgroundColor: '#7f22fe', minHeight: 40, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, primaryText: { color: 'white', fontSize: 12, fontWeight: '600' }, disabled: { opacity: .45 },
  chatHeader: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderBottomWidth: 1, borderColor: '#a8a5e41a' }, iconButton: { width: 32, height: 40, alignItems: 'center', justifyContent: 'center' }, chatStatus: { color: '#a8a5e4', fontSize: 11, marginTop: 4 },
  invite: { borderRadius: 8, borderWidth: 1, borderColor: '#a34cff40', paddingVertical: 9, paddingHorizontal: 10 }, inviteText: { fontSize: 11, color: '#c4b6ff' }, inviteList: { maxHeight: 58 }, inviteItems: { padding: 10, gap: 8, alignItems: 'center' },
  chatMessages: { flexGrow: 1, justifyContent: 'flex-end', padding: 16, gap: 16 }, chatMessage: { flexDirection: 'row', gap: 8, maxWidth: '95%', alignItems: 'flex-end', alignSelf: 'flex-start' }, sent: { alignSelf: 'flex-end' }, bubble: { flexShrink: 1, padding: 12, borderRadius: 12, backgroundColor: '#251535', gap: 6 }, author: { fontSize: 11, fontWeight: '600', color: '#d4b7f3' }, body: { fontSize: 13, lineHeight: 20, color: '#f1eef8' }, time: { fontSize: 10, color: '#a8a5e4' },
  composer: { margin: 12, marginTop: 0, padding: 6, paddingLeft: 14, borderRadius: 12, borderWidth: 1, borderColor: '#a34cff40', backgroundColor: '#14101f', flexDirection: 'row', alignItems: 'center', gap: 8 }, composerInput: { flex: 1, minWidth: 0, height: 38, color: 'white', fontFamily: 'Inter', fontSize: 13, paddingVertical: 0 }, send: { width: 36, height: 36, borderRadius: 9, backgroundColor: '#7f22fe', alignItems: 'center', justifyContent: 'center' },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: '#2c1732' }, noticeText: { flex: 1, color: '#ffb5d0', fontSize: 12, lineHeight: 18 },
  modalBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#050309cc' }, picker: { width: '100%', maxWidth: 400, maxHeight: '88%', borderRadius: 20, borderWidth: 1, borderColor: '#a34cff4d', backgroundColor: '#100d17', overflow: 'hidden' }, pickerContent: { padding: 22 },
  pickerHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 }, pickerTitle: { fontSize: 21, fontWeight: '700', letterSpacing: -.5 }, pickerCopy: { fontSize: 12, lineHeight: 19, color: '#aaa2c5', marginTop: 8 },
  tabs: { flexDirection: 'row', gap: 5, marginTop: 22, marginBottom: 18, padding: 4, borderRadius: 11, backgroundColor: '#09070f', borderWidth: 1, borderColor: '#ffffff0c' }, tab: { flex: 1, minHeight: 36, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, activeTab: { backgroundColor: '#7f22fe26' }, tabText: { fontSize: 12, color: '#aaa2c5' },
  groupField: { gap: 8, marginBottom: 16 }, fieldLabel: { fontSize: 12, color: '#c2b5d6' }, groupInput: { height: 42, paddingHorizontal: 12, borderWidth: 1, borderColor: '#7131b44d', borderRadius: 10, backgroundColor: '#0b0910', color: '#fbfaff', fontFamily: 'Inter', fontSize: 13 }, pickerSearch: { marginHorizontal: 0, marginBottom: 12, borderRadius: 10 },
  peopleList: { maxHeight: 240 }, personOption: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8, minHeight: 60, borderRadius: 10 }, selectedPerson: { backgroundColor: '#7f22fe15' }, optionName: { fontSize: 13, fontWeight: '600' }, username: { fontSize: 11, color: '#aaa2c5', marginTop: 5 }, checkbox: { width: 21, height: 21, borderRadius: 7, borderWidth: 1, borderColor: '#77618466', alignItems: 'center', justifyContent: 'center' }, checked: { backgroundColor: '#7f22fe', borderColor: '#a34cff' },
  groupError: { color: '#ffb7d0', fontSize: 12, lineHeight: 19, marginTop: 12 }, pickerFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 12, paddingTop: 18, borderTopWidth: 1, borderColor: '#ffffff0d' }, selectionCount: { fontSize: 11, color: '#aaa2c5' },
});
