import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

const require = createRequire(import.meta.url);
const { transformSync } = require('@babel/core');
const source = transformSync(readFileSync(new URL('./MancordHome.js', import.meta.url), 'utf8'), {
  babelrc: false, configFile: false,
  plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'],
}).code;

function mount(storage = new Map(), id = 'user') {
  let states = [], cursor = 0, failWrites = false;
  const react = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState(initial) {
      const index = cursor++;
      if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial;
      return [states[index], next => { states[index] = typeof next === 'function' ? next(states[index]) : next; }];
    },
    useEffect() {},
  };
  const exports = {};
  runInNewContext(source, { exports, localStorage: {
    getItem: key => storage.get(key) ?? null,
    setItem(key, value) { if (failWrites) throw Error('Storage full'); storage.set(key, value); },
  }, require(name) {
    if (name === 'react') return { ...react, default: react, __esModule: true };
    if (name === './TextChannelScreen') return { default: 'TextChannelScreen', __esModule: true };
    if (name === './DesignScreens') return { CommunityScreen: 'CommunityScreen', SettingsScreen: 'SettingsScreen' };
    if (name === 'react-native') return { StyleSheet: { create: value => value }, Platform: { OS: 'android' } };
    return {};
  } });
  return {
    render() { cursor = 0; return exports.MancordHome({ profile: { id, username: 'tester' } }); },
    failWrites() { failWrites = true; },
    storage,
  };
}

function setup() {
  const a = { id: 'a', name: 'general' }, b = { id: 'b', name: 'design' }, voice = { id: 'v', name: 'Voice' };
  const storage = new Map([['mancord:groups:user', JSON.stringify([{ id: 'group', textChannels: [a, b], voiceChannels: [voice] }])]]);
  return { app: mount(storage), a, b, voice };
}

test('every text channel opens the new native screen with independent messages and drafts', () => {
  const { app, a, b } = setup();
  app.render().props.onChannel(a);
  assert.equal(app.render().type, 'TextChannelScreen');
  assert.equal(app.render().props.channel.name, 'general');
  app.render().props.onDraftChange('First message');
  assert.equal(app.render().props.onSend(), true);
  assert.equal(app.render().props.messages[0].text, 'First message');
  assert.equal(app.render().props.draft, '');
  app.render().props.onDraftChange('General draft');
  app.render().props.onBack();
  app.render().props.onChannel(b);
  assert.equal(app.render().props.channel.name, 'design');
  assert.equal(app.render().props.messages.length, 0);
  assert.equal(app.render().props.draft, '');
  app.render().props.onBack();
  app.render().props.onChannel(a);
  assert.equal(app.render().props.draft, 'General draft');
  assert.equal(app.render().props.messages.length, 1);
});

test('native messages and attachments survive remount and remain scoped to the account', () => {
  const { app, a } = setup();
  app.render().props.onChannel(a);
  assert.equal(app.render().props.onSend({ name: 'notes.txt', type: 'text/plain', dataUrl: 'data:text/plain;base64,dGVzdA==' }), true);
  const restored = mount(app.storage);
  restored.render().props.onChannel(a);
  assert.equal(restored.render().props.messages[0].attachment.name, 'notes.txt');
  const otherAccount = mount(app.storage, 'another-user');
  otherAccount.render().props.onChannel(a);
  assert.equal(otherAccount.render().props.messages.length, 0);
});

test('failed storage writes preserve the native draft and expose an error', () => {
  const { app, a } = setup();
  app.render().props.onChannel(a);
  app.render().props.onDraftChange('Keep this draft');
  app.failWrites();
  assert.equal(app.render().props.onSend(), false);
  assert.equal(app.render().props.draft, 'Keep this draft');
  assert.equal(app.render().props.messages.length, 0);
  assert.match(app.render().props.error, /Could not save/);
});
