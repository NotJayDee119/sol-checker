import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

/**
 * Photos of a learner's paper, kept with the result as proof of what was scored.
 *
 * Each paper's pages live on this phone at <documents>/papers/<paper id>/p1.jpg, p2.jpg, …
 * Papers store only the file names, never full paths: on iOS the app's documents folder
 * moves between app updates, so full paths would break.
 *
 * Web has no lasting file storage (and browser storage is too small for photos), so
 * there the photos are used while scoring and then dropped.
 */
export const CAN_KEEP_PHOTOS = Platform.OS !== 'web';

function paperDir(paperId: string) {
  return new Directory(Paths.document, 'papers', paperId);
}

/**
 * Copy freshly processed photos (cache files) into the paper's folder. Returns the saved
 * file names in page order. If a page can't be saved, the pages saved so far are removed
 * and the error is thrown, so nothing half-saved is left behind and the originals are
 * still there to try again. The caller discards the cache files after saving.
 */
export async function keepPaperPhotos(paperId: string, uris: string[]): Promise<string[]> {
  if (!CAN_KEEP_PHOTOS || uris.length === 0) return [];
  const dir = paperDir(paperId);
  try {
    dir.create({ intermediates: true, idempotent: true });
    const names: string[] = [];
    for (const [i, uri] of uris.entries()) {
      const name = `p${i + 1}.jpg`;
      await new File(uri).copy(new File(dir, name), { overwrite: true });
      names.push(name);
    }
    return names;
  } catch (e) {
    deletePaperPhotos(paperId);
    throw e;
  }
}

/** Full URI for showing a saved page. */
export function paperPhotoUri(paperId: string, name: string) {
  return new File(paperDir(paperId), name).uri;
}

/** Remove a paper's saved photos (when the paper is deleted). Best effort. */
export function deletePaperPhotos(paperId: string) {
  if (!CAN_KEEP_PHOTOS) return;
  try {
    const dir = paperDir(paperId);
    if (dir.exists) dir.delete();
  } catch {
    // A leftover folder only takes space; it never shows up in the app.
  }
}
