import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';

/** Most photos kept for one paper (spec §4.3). */
export const MAX_PHOTOS = 5;

/** Longest edge kept for answer sheets: sharp enough to read handwriting, small enough to keep many on the phone. */
const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.7;

export interface PageImage {
  uri: string;
  width: number;
  height: number;
}

/**
 * Resize (downscale only) and JPEG-compress a captured or picked photo.
 * Output lives in the cache directory until the paper is saved; lib/paper-photos.ts then moves it
 * next to the result.
 */
export async function processImage(source: PageImage): Promise<PageImage> {
  const ctx = ImageManipulator.manipulate(source.uri);
  if (Math.max(source.width, source.height) > MAX_EDGE) {
    ctx.resize(
      source.width >= source.height ? { width: MAX_EDGE, height: null } : { width: null, height: MAX_EDGE }
    );
  }
  const rendered = await ctx.renderAsync();
  const saved = await rendered.saveAsync({ compress: JPEG_QUALITY, format: SaveFormat.JPEG });
  return { uri: saved.uri, width: saved.width, height: saved.height };
}

/** Remove processed photos that won't be saved (a page removed before saving). Best effort. */
export function discardPhotos(uris: string[]) {
  if (Platform.OS === 'web') return;
  for (const uri of uris) {
    try {
      const file = new File(uri);
      if (file.exists) file.delete();
    } catch {
      // A leftover cache file is harmless; the OS clears the cache.
    }
  }
}
