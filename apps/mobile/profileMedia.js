import { File } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';

export const maxProfileMediaSize = 8 * 1024 * 1024;

export async function readProfileMedia(asset) {
  if (asset.size > maxProfileMediaSize) {
    throw new Error('Profile media must be 8 MB or smaller.');
  }

  let temporaryUri;
  try {
    let uri = asset.uri;
    if (uri.startsWith('content://')) {
      if (!FileSystem.cacheDirectory) {
        throw new Error('Could not open the app cache. Restart the app and try again.');
      }
      // Unlike DocumentPicker's shared Android cache, this directory is scoped
      // to the current Expo Go project. copyAsync supports provider content URIs.
      temporaryUri = `${FileSystem.cacheDirectory}profile-media-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      await FileSystem.copyAsync({ from: uri, to: temporaryUri });
      uri = temporaryUri;
    }

    let bytes;
    try {
      // Android providers can report missing metadata for readable files.
      bytes = await new File(uri).bytes();
    } catch {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      bytes = Uint8Array.from(atob(base64), character => character.charCodeAt(0));
    }

    if (bytes.byteLength > maxProfileMediaSize) {
      throw new Error('Profile media must be 8 MB or smaller.');
    }
    if (!bytes.byteLength) {
      throw new Error('That file is empty. Choose another photo, GIF, or video.');
    }
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  } finally {
    if (temporaryUri) {
      // Only remove the copy we created; cleanup must not hide a read failure.
      await FileSystem.deleteAsync(temporaryUri, { idempotent: true }).catch(() => {});
    }
  }
}
