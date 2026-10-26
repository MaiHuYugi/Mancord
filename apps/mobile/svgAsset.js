import { File } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';

export async function readSvgAsset(asset) {
  const uri = asset.localUri || asset.uri;
  if (!uri) throw new Error('SVG asset has no source.');

  if (/^https?:\/\//i.test(uri)) return readRemoteSvg(uri);

  // Expo Go scopes its file cache to the current project. React Native fetch
  // cannot reliably read these file:// paths; use the native filesystem APIs.
  try {
    return await new File(uri).text();
  } catch {
    try {
      return await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
    } catch (fileError) {
      // A cached asset may have been evicted. During development the original
      // Metro URL is still available, without fetching a local URI over HTTP.
      if (asset.uri !== uri && /^https?:\/\//i.test(asset.uri)) {
        return readRemoteSvg(asset.uri);
      }
      throw fileError;
    }
  }
}

async function readRemoteSvg(uri) {
  const response = await fetch(uri);
  if (!response.ok) throw new Error(`Could not load SVG asset (${response.status}).`);
  return response.text();
}
