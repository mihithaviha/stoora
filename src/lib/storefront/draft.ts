import type { StoreConfig } from './shared';

/** The draft the seller is editing lives in this browser until they publish it. */
const key = (handle: string) => `stoora.storefront.draft.${handle || 'shop'}`;

export function loadDraft(handle: string): StoreConfig | null {
  try {
    const raw = localStorage.getItem(key(handle));
    return raw ? (JSON.parse(raw) as StoreConfig) : null;
  } catch {
    return null;
  }
}

export function saveDraft(handle: string, config: StoreConfig): boolean {
  try {
    localStorage.setItem(key(handle), JSON.stringify(config));
    return true;
  } catch {
    return false; // storage full or blocked: the editor says so
  }
}

export function clearDraft(handle: string) {
  try { localStorage.removeItem(key(handle)); } catch { /* ignore */ }
}

/** Shrink a photo in the browser (longest side 1600px) and return it as a JPEG data URL. */
export function shrinkImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) return reject(new Error('Use a JPG, PNG or WebP image.'));
    const url = URL.createObjectURL(file);
    const picture = new Image();
    picture.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That image could not be read.')); };
    picture.onload = () => {
      const scale = Math.min(1, 1600 / Math.max(picture.width, picture.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(picture.width * scale);
      canvas.height = Math.round(picture.height * scale);
      canvas.getContext('2d')?.drawImage(picture, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    picture.src = url;
  });
}
