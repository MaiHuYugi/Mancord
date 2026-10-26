import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm';

const source = await readFile(new URL('./svgAsset.js', import.meta.url), 'utf8');
const svg = '<svg width="20" height="20" xmlns="http://www.w3.org/2000/svg"/>';
const localUri = 'file:///data/user/0/host.exp.exponent/cache/ExperienceData/%2540anonymous%252Fmancord-example/ExponentAsset-icon.svg';

async function loadReader({
  readText = () => { throw new Error('Unexpected native file read'); },
  readLegacy = () => { throw new Error('Unexpected legacy read'); },
  fetch = () => { throw new Error('Never fetch a local asset URI'); },
} = {}) {
  const context = createContext({ fetch });
  const modern = new SyntheticModule(['File'], function () {
    this.setExport('File', class {
      constructor(uri) { this.uri = uri; }
      text() { return readText(this.uri); }
    });
  }, { context });
  const legacy = new SyntheticModule(['readAsStringAsync', 'EncodingType'], function () {
    this.setExport('readAsStringAsync', readLegacy);
    this.setExport('EncodingType', { UTF8: 'utf8' });
  }, { context });
  const module = new SourceTextModule(source, { context });
  await module.link(name => name === 'expo-file-system' ? modern : legacy);
  await module.evaluate();
  return module.namespace.readSvgAsset;
}

test('reads Expo Go SVG cache files natively without fetching or decoding their URI', async () => {
  const readSvgAsset = await loadReader({ readText: async uri => {
    assert.equal(uri, localUri);
    return svg;
  } });
  assert.equal(await readSvgAsset({ localUri, uri: 'http://localhost:8081/icon.svg' }), svg);
});

test('falls back to the legacy UTF-8 reader for Expo Go file access', async () => {
  const readSvgAsset = await loadReader({
    readText: () => { throw new Error('Native text unavailable'); },
    readLegacy: async (uri, options) => {
      assert.equal(uri, localUri);
      assert.equal(options.encoding, 'utf8');
      return svg;
    },
  });
  assert.equal(await readSvgAsset({ localUri, uri: localUri }), svg);
});

test('recovers an evicted cache file using its original Metro URL', async () => {
  const readSvgAsset = await loadReader({ fetch: async uri => {
    assert.equal(uri, 'http://localhost:8081/icon.svg');
    return { ok: true, text: async () => svg };
  } });
  assert.equal(await readSvgAsset({ localUri, uri: 'http://localhost:8081/icon.svg' }), svg);
});

test('does not send local file URIs to fetch when both native readers fail', async () => {
  const readSvgAsset = await loadReader({
    readLegacy: () => { throw new Error('File no longer exists'); },
  });
  await assert.rejects(readSvgAsset({ localUri, uri: localUri }), /File no longer exists/);
});

test('reads remote development assets and reports HTTP failures', async () => {
  const readSvgAsset = await loadReader({ fetch: async uri => ({
    ok: uri.endsWith('valid.svg'), status: 404, text: async () => svg,
  }) });
  assert.equal(await readSvgAsset({ uri: 'https://example.test/valid.svg' }), svg);
  await assert.rejects(readSvgAsset({ uri: 'https://example.test/missing.svg' }), /404/);
});

test('reports missing asset sources', async () => {
  const readSvgAsset = await loadReader();
  await assert.rejects(readSvgAsset({}), /no source/);
});
