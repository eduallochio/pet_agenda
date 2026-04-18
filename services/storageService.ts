import { supabase } from './supabase';
import * as FileSystem from 'expo-file-system';

/**
 * Uploads an image to Supabase Storage and returns the public URL.
 * Uses upsert so the old file with the same path is replaced automatically.
 * Returns the original local URI if upload fails (graceful fallback).
 */
export async function uploadImage(
  localUri: string,
  bucket: 'avatars' | 'pets',
  path: string,
): Promise<string> {
  try {
    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const ext = localUri.split('.').pop()?.toLowerCase() ?? 'jpg';
    const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
    const filePath = `${path}.${ext}`;

    const byteCharacters = atob(base64);
    const byteArray = new Uint8Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteArray[i] = byteCharacters.charCodeAt(i);
    }

    const { error } = await supabase.storage
      .from(bucket)
      .upload(filePath, byteArray, { contentType: mimeType, upsert: true });

    if (error) throw error;

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return data.publicUrl;
  } catch (e) {
    if (__DEV__) console.warn('[storageService] upload failed, using local URI:', e);
    return localUri;
  }
}

/**
 * Deletes an image from Supabase Storage given its public URL.
 * Used when the user removes their photo.
 */
export async function deleteImage(publicUrl: string, bucket: 'avatars' | 'pets'): Promise<void> {
  try {
    // Extract the file path from the public URL
    // URL format: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
    const marker = `/object/public/${bucket}/`;
    const idx = publicUrl.indexOf(marker);
    if (idx === -1) return;
    const filePath = publicUrl.slice(idx + marker.length);
    await supabase.storage.from(bucket).remove([filePath]);
  } catch (e) {
    if (__DEV__) console.warn('[storageService] delete failed:', e);
  }
}

/** Returns true if the URI is a remote https URL (already uploaded). */
export function isRemoteUrl(uri: string): boolean {
  return uri.startsWith('https://') || uri.startsWith('http://');
}
