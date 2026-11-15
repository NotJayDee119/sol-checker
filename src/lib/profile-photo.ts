import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { supabase } from './supabase';

/** Avatars are shown at most ~100pt, so 320px covers 3x screens while keeping the data URI ~20–30 KB. */
const EDGE = 320;

/**
 * Take or choose a profile photo, crop it to a centered square, and return it as a JPEG data URI
 * (stored with the profile on this device). Returns null if the teacher cancels.
 */
export async function pickProfilePhoto(source: 'camera' | 'library'): Promise<string | null> {
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  };

  let result: ImagePicker.ImagePickerResult;
  if (source === 'camera') {
    if (Platform.OS !== 'web') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) throw new Error('SOL needs camera access to take your photo. You can turn it on in Settings.');
    }
    result = await ImagePicker.launchCameraAsync({ ...options, cameraType: ImagePicker.CameraType.front });
  } else {
    result = await ImagePicker.launchImageLibraryAsync(options);
  }
  if (result.canceled || !result.assets[0]) return null;

  const { uri, width, height } = result.assets[0];
  // The system cropper isn't always square (web, some Android builds), so square it here too.
  const side = Math.min(width, height);
  const ctx = ImageManipulator.manipulate(uri);
  if (width !== height) {
    ctx.crop({
      originX: Math.round((width - side) / 2),
      originY: Math.round((height - side) / 2),
      width: side,
      height: side,
    });
  }
  if (side > EDGE) ctx.resize({ width: EDGE, height: EDGE });
  const rendered = await ctx.renderAsync();
  const saved = await rendered.saveAsync({ compress: 0.8, format: SaveFormat.JPEG, base64: true });
  if (!saved.base64) throw new Error("That photo couldn't be used. Try another one.");
  return `data:image/jpeg;base64,${saved.base64}`;
}

// ── Supabase Storage ─────────────────────────────────────────────────────────
// Bucket and policies: backend/supabase/migrations/20261115000300_profile_photos.sql.

const BUCKET = 'avatars';

function dataUriParts(dataUri: string) {
  const match = /^data:([^;,]+);base64,(.*)$/s.exec(dataUri);
  if (!match) throw new Error('Not a base64 data URI');
  return { contentType: match[1], base64: match[2] };
}

/** supabase-js on React Native uploads ArrayBuffers reliably; Blobs/FormData from data URIs don't. */
function base64ToBytes(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function blobToDataUri(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the photo'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Save the profile photo for this account: upload it, point teachers.photo_path at it, then
 * remove older photos. Passing null removes the photo. Returns the new path (or null).
 */
export async function syncProfilePhoto(userId: string, photo: string | null): Promise<string | null> {
  if (!supabase) throw new Error('Supabase is not configured');
  const bucket = supabase.storage.from(BUCKET);

  let path: string | null = null;
  if (photo) {
    const { contentType, base64 } = dataUriParts(photo);
    const ext = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';
    path = `${userId}/${Date.now()}.${ext}`;
    const { error } = await bucket.upload(path, base64ToBytes(base64), { contentType, upsert: true });
    if (error) throw error;
  }

  const { error } = await supabase.from('teachers').update({ photo_path: path }).eq('id', userId);
  if (error) {
    // Don't leave an orphan behind if the profile row couldn't be updated.
    if (path) await bucket.remove([path]);
    throw error;
  }

  // Best effort: a leftover old photo is harmless and gets swept on the next change.
  const { data: files } = await bucket.list(userId, { limit: 100 });
  const stale = (files ?? []).map((f) => `${userId}/${f.name}`).filter((p) => p !== path);
  if (stale.length) await bucket.remove(stale);

  return path;
}

/** Download a profile photo saved by {@link syncProfilePhoto} as a data URI for <Avatar>. */
export async function downloadProfilePhoto(path: string): Promise<string> {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error) throw error;
  return blobToDataUri(data);
}
