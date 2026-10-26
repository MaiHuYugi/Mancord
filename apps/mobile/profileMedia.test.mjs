import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm';

const source = await readFile(new URL('./profileMedia.js', import.meta.url), 'utf8');

async function loadReader({
  readBytes,
  readBase64 = () => { throw new Error('Unexpected fallback'); },
  copy = () => { throw new Error('Unexpected copy'); },
  remove = async () => {},
  cacheDirectory = 'file:///cache/ExperienceData/project/',
}) {
  const context = createContext({ Uint8Array, atob });
  const modern = new SyntheticModule(['File'], function () {
    this.setExport('File', class {
      constructor(uri) { this.uri = uri; }
      get exists() { throw new Error('Do not gate reading on metadata'); }
      bytes() { return readBytes(this.uri); }
    });
  }, { context });
  const legacy = new SyntheticModule(['readAsStringAsync', 'EncodingType', 'cacheDirectory', 'copyAsync', 'deleteAsync'], function () {
    this.setExport('readAsStringAsync', readBase64);
    this.setExport('EncodingType', { Base64: 'base64' });
    this.setExport('cacheDirectory', cacheDirectory);
    this.setExport('copyAsync', copy);
    this.setExport('deleteAsync', remove);
  }, { context });
  const module = new SourceTextModule(source, { context });
  await module.link(name => name === 'expo-file-system' ? modern : legacy);
  await module.evaluate();
  return module.namespace;
}

test('reads Android picker files without an exists metadata check', async () => {
  const { readProfileMedia } = await loadReader({ readBytes: async uri => {
    assert.equal(uri, 'file:///cache/DocumentPicker/photo.png');
    return new Uint8Array([137, 80, 78, 71]);
  } });
  const contents = await readProfileMedia({ uri: 'file:///cache/DocumentPicker/photo.png' });
  assert.deepEqual([...new Uint8Array(contents)], [137, 80, 78, 71]);
});

test('falls back to the legacy reader when the modern Android reader fails', async () => {
  const { readProfileMedia } = await loadReader({
    readBytes: async () => { throw new Error('Permission metadata unavailable'); },
    readBase64: async (uri, options) => {
      assert.equal(uri, 'file:///cache/photo.gif');
      assert.equal(options.encoding, 'base64');
      return 'AP+AQQ==';
    },
  });
  const contents = await readProfileMedia({ uri: 'file:///cache/photo.gif' });
  assert.deepEqual([...new Uint8Array(contents)], [0, 255, 128, 65]);
});

test('retains an independent copy of exactly the selected bytes', async () => {
  const storage = new Uint8Array([9, 1, 2, 9]);
  const { readProfileMedia } = await loadReader({ readBytes: () => storage.subarray(1, 3) });
  const contents = await readProfileMedia({ uri: 'file:///cache/photo.png' });
  storage.fill(0);
  assert.deepEqual([...new Uint8Array(contents)], [1, 2]);
});

test('rejects known oversize files before reading', async () => {
  const { readProfileMedia, maxProfileMediaSize } = await loadReader({
    readBytes: () => { assert.fail('Oversize files should not be read'); },
  });
  await assert.rejects(readProfileMedia({ size: maxProfileMediaSize + 1 }), /8 MB/);
});

test('checks actual size when picker size is missing or inaccurate', async () => {
  const { readProfileMedia, maxProfileMediaSize } = await loadReader({
    readBytes: () => new Uint8Array(8 * 1024 * 1024 + 1),
  });
  await assert.rejects(readProfileMedia({ uri: 'file:///cache/video.mp4', size: 1 }), /8 MB/);
  await assert.rejects(readProfileMedia({ uri: 'file:///cache/video.mp4' }), /8 MB/);
  assert.equal(maxProfileMediaSize, 8 * 1024 * 1024);
});

test('rejects empty files and propagates actual read failures', async () => {
  const empty = await loadReader({ readBytes: () => new Uint8Array(0) });
  await assert.rejects(empty.readProfileMedia({ uri: 'file:///cache/photo.png' }), /empty/);
  const unreadable = await loadReader({
    readBytes: () => { throw new Error('Native read failed'); },
    readBase64: () => { throw new Error('File was removed'); },
  });
  await assert.rejects(unreadable.readProfileMedia({ uri: 'file:///cache/photo.png' }), /File was removed/);
});

test('copies Android provider videos into the project cache before reading, then cleans up', async () => {
  const events = [];
  let copiedUri;
  const { readProfileMedia } = await loadReader({
    copy: async ({ from, to }) => {
      assert.equal(from, 'content://com.android.providers.media.documents/document/video%3A123');
      assert.ok(to.startsWith('file:///cache/ExperienceData/project/profile-media-'));
      copiedUri = to;
      events.push('copy');
    },
    readBytes: async uri => {
      assert.equal(uri, copiedUri);
      events.push('read');
      return new Uint8Array([0, 0, 0, 24]);
    },
    remove: async (uri, options) => {
      assert.equal(uri, copiedUri);
      assert.equal(options.idempotent, true);
      events.push('delete');
    },
  });
  const contents = await readProfileMedia({ uri: 'content://com.android.providers.media.documents/document/video%3A123' });
  assert.deepEqual([...new Uint8Array(contents)], [0, 0, 0, 24]);
  assert.deepEqual(events, ['copy', 'read', 'delete']);
});

test('legacy fallback reads the scoped copy and cleanup preserves the original read error', async () => {
  let copiedUri;
  let deleted = false;
  const { readProfileMedia } = await loadReader({
    copy: async ({ to }) => { copiedUri = to; },
    readBytes: async () => { throw new Error('Modern reader failed'); },
    readBase64: async uri => {
      assert.equal(uri, copiedUri);
      throw new Error('Provider video unreadable');
    },
    remove: async uri => {
      assert.equal(uri, copiedUri);
      deleted = true;
      throw new Error('Cleanup failed');
    },
  });
  await assert.rejects(readProfileMedia({ uri: 'content://provider/video/123' }), /Provider video unreadable/);
  assert.equal(deleted, true);
});

test('does not attempt provider copies when the scoped cache is unavailable', async () => {
  const { readProfileMedia } = await loadReader({ cacheDirectory: null });
  await assert.rejects(readProfileMedia({ uri: 'content://provider/video/123' }), /Restart the app/);
});
