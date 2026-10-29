import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

const require = createRequire(import.meta.url);
const { transformSync } = require('@babel/core');
const compile = file => transformSync(readFileSync(new URL(file, import.meta.url), 'utf8'), {
  babelrc: false, configFile: false,
  plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'],
}).code;
const dmSource = compile('./DirectMessagesScreen.js');
const homeSource = compile('./MancordHome.js');
const people = [{ id: 'a', username: 'mahika', display_name: 'Mahika' }, { id: 'b', username: 'kartik', display_name: 'Kartik' }, { id: 'c', username: 'anya', display_name: 'Anya' }];

function mount({ source = dmSource, component = 'default', storage = new Map(), messages = [] } = {}) {
  const state = [], refs = [], dependencies = [], effects = [], cleanups = [];
  let cursor = 0, failure = '', memberFailure = false;
  const calls = [], events = [], navigations = [];
  const tables = { profiles: people, direct_messages: [...messages], servers: [], channels: [], messages: [] };
  const react = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState(initial) {
      const index = cursor++;
      if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial;
      return [state[index], next => { state[index] = typeof next === 'function' ? next(state[index]) : next; }];
    },
    useRef(initial) { const index = cursor++; return refs[index] ||= { current: initial }; },
    useEffect(effect, deps) {
      const index = cursor++;
      if (!dependencies[index] || !deps || deps.some((value, i) => value !== dependencies[index][i])) {
        dependencies[index] = deps; effects.push(() => { cleanups[index]?.(); cleanups[index] = effect(); });
      }
    },
  };
  const supabase = {
    from(table) {
      const query = {
        select() { return this; }, neq() { return this; }, eq() { return this; }, or() { return this; }, order() { return this; },
        range(start, end) { this.start = start; this.end = end; return this; },
        insert(value) { this.value = value; return this; }, single() { this.one = true; return this; },
        async then(resolve) {
          if (this.value) {
            calls.push({ table, value: this.value });
            if (failure) return resolve({ error: { message: failure } });
            const item = { ...this.value, id: `new-${calls.length}`, created_at: new Date().toISOString() };
            tables[table].push(item);
            return resolve({ data: this.one ? item : [item] });
          }
          return resolve({ data: this.start === undefined ? tables[table] : tables[table].slice(this.start, this.end + 1) });
        },
      };
      return query;
    },
    async rpc(name, args) {
      calls.push({ rpc: name, args });
      if (name === 'create_server') { tables.servers.push({ id: 'group', name: args.server_name }); return { data: 'group' }; }
      if (name === 'add_server_member' && memberFailure) { memberFailure = false; return { error: { message: 'Member unavailable' } }; }
      return { data: true };
    },
    channel() {
      return { on(type, config, callback) { events.push({ type, config, callback }); return this; }, subscribe() { return this; } };
    }, removeChannel() {},
  };
  const exports = {};
  runInNewContext(source, {
    exports, Date, Map, Set, Promise, setInterval: () => 1, clearInterval() {},
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    require(name) {
      if (name === 'react') return { ...react, default: react, __esModule: true };
      if (name === './supabase') return { supabase };
      if (name === './DirectMessagesScreen') return { default: 'DirectMessagesScreen', __esModule: true };
      if (name === './TextChannelScreen') return { default: 'TextChannelScreen', __esModule: true };
      if (name === './DesignScreens') return { Text: 'Text', ProfileMedia: 'ProfileMedia', CommunityScreen: 'CommunityScreen', SettingsScreen: 'SettingsScreen' };
      if (name === 'react-native') return Object.assign(Object.fromEntries(['View', 'Text', 'Pressable', 'TextInput', 'ScrollView', 'SafeAreaView', 'KeyboardAvoidingView', 'StatusBar', 'Modal'].map(name => [name, name])), {
        StyleSheet: { create: value => value, absoluteFill: {} }, Platform: { OS: 'android' },
        AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) }, BackHandler: { addEventListener: () => ({ remove() {} }) },
      });
      if (name === 'react-native-svg') return { default: 'Svg', __esModule: true, ...Object.fromEntries(['Defs', 'RadialGradient', 'Rect', 'Stop'].map(name => [name, name])) };
      return {};
    },
  });
  const props = { profile: { id: 'me', username: 'tester' }, onBack: () => navigations.push('home'), onSettings: () => navigations.push('settings'), onGroupCreated: (...args) => navigations.push(args) };
  let tree;
  function render() { cursor = 0; tree = exports[component](props); while (effects.length) effects.shift()(); return tree; }
  function nodes(value) { return value == null ? [] : Array.isArray(value) ? value.flatMap(nodes) : typeof value === 'object' ? [value, ...nodes(value.props?.children)] : []; }
  function byLabel(label) { const found = nodes(tree).find(node => node.props.accessibilityLabel === label); assert.ok(found, `Missing ${label}`); return found; }
  return {
    render, byLabel, calls, navigations, storage, tables,
    text: () => JSON.stringify(tree),
    async settle() { for (let i = 0; i < 5; i++) { await new Promise(resolve => setImmediate(resolve)); render(); } },
    press(label) { const result = byLabel(label).props.onPress(); render(); return result; },
    input(label, value) { byLabel(label).props.onChangeText(value); render(); },
    failSend(message) { failure = message; }, failMember() { memberFailure = true; },
    emit() { for (const event of events.filter(event => event.config.table === 'direct_messages')) event.callback(); },
  };
}
const incoming = (id = '1', sender = 'a', body = 'Hello', time = '2026-10-29T10:00:00Z') => ({ id, sender_id: sender, recipient_id: 'me', body, created_at: time });

test('native inbox shows message previews, real unread counts, search, and the compose picker', async () => {
  const app = mount({ messages: [incoming()] }); app.render(); await app.settle();
  assert.ok(app.byLabel('New message or group'));
  assert.ok(app.byLabel('Open chat with Mahika, 1 unread messages'));
  app.input('Search conversations', 'nobody');
  assert.match(app.text(), /No conversations found/);
  app.press('New message or group');
  app.input('Search people', 'anya');
  app.press('Select Anya'); app.press('Start message');
  assert.ok(app.byLabel('Message Anya'));
});

test('native drafts stay with their recipient and failed sends can be retried', async () => {
  const app = mount({ messages: [incoming(), incoming('2', 'b')] }); app.render(); await app.settle();
  app.press('Open chat with Mahika, 1 unread messages'); await app.settle();
  app.input('Message Mahika', 'Mahika draft'); app.press('Back to messages');
  app.press('Open chat with Kartik, 1 unread messages'); await app.settle();
  assert.equal(app.byLabel('Message Kartik').props.value, '');
  app.press('Back to messages'); app.press('Open chat with Mahika');
  assert.equal(app.byLabel('Message Mahika').props.value, 'Mahika draft');
  app.failSend('Network failed'); await app.press('Send message'); await app.settle();
  assert.equal(app.byLabel('Message Mahika').props.value, 'Mahika draft');
  assert.match(app.text(), /Network failed/);
  app.failSend(''); await app.press('Send message'); await app.settle();
  assert.equal(app.byLabel('Message Mahika').props.value, '');
  assert.equal(app.tables.direct_messages.filter(item => item.body === 'Mahika draft').length, 1);
});

test('native read markers survive reopening and realtime brings in new conversations', async () => {
  const storage = new Map(), messages = [incoming()];
  const app = mount({ storage, messages }); app.render(); await app.settle();
  app.press('Open chat with Mahika, 1 unread messages'); await app.settle();
  const restored = mount({ storage, messages }); restored.render(); await restored.settle();
  assert.ok(restored.byLabel('Open chat with Mahika'));
  restored.tables.direct_messages.push(incoming('new', 'c', 'New conversation', '2026-10-29T11:00:00Z')); restored.emit(); await restored.settle();
  assert.ok(restored.byLabel('Open chat with Anya, 1 unread messages'));
});

test('native group setup retries completed steps without duplicating groups or channels', async () => {
  const app = mount(); app.render(); await app.settle(); app.press('New message or group');
  // The mode tab has its text as children; the submit button has an accessible label.
  const tab = (function walk(node) { if (!node || typeof node !== 'object') return null; if (node.type === 'Pressable' && !node.props.accessibilityLabel && JSON.stringify(node.props.children).includes('Create group')) return node; for (const child of [node.props?.children].flat(Infinity)) { const found = walk(child); if (found) return found; } return null; })(app.render());
  assert.ok(tab); tab.props.onPress(); app.render();
  app.input('Group name', 'Weekend crew'); app.press('Select Mahika'); app.press('Select Kartik');
  app.failMember(); await app.press('Create group'); await app.settle();
  assert.match(app.text(), /Member unavailable/); assert.ok(app.byLabel('Retry setup'));
  await app.press('Retry setup'); await app.settle();
  assert.equal(app.calls.filter(call => call.rpc === 'create_server').length, 1);
  assert.equal(app.calls.filter(call => call.table === 'channels').length, 1);
  assert.equal(app.navigations[0][0], 'group');
  assert.equal(app.navigations[0][1].name, 'group-chat');
});

test('native Home routes DMs to the new screen and opens a created group in text chat', async () => {
  const app = mount({ source: homeSource, component: 'MancordHome' });
  app.render().props.onDirectMessages();
  let screen = app.render(); assert.equal(screen.type, 'DirectMessagesScreen');
  assert.equal(typeof screen.props.onGroupCreated, 'function');
  screen.props.onSettings(); screen = app.render(); assert.equal(screen.type, 'SettingsScreen');
  screen.props.onBack(); screen = app.render(); assert.equal(screen.type, 'DirectMessagesScreen');
  app.tables.servers.push({ id: 'g', name: 'Group', channels: [], server_members: [] });
  await screen.props.onGroupCreated('g', { id: 'ch', name: 'group-chat', kind: 'text' });
  screen = app.render(); assert.equal(screen.type, 'TextChannelScreen'); assert.equal(screen.props.channel.id, 'ch');
  await app.settle();
});
