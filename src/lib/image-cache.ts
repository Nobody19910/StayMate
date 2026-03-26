"use client";

/**
 * Native image cache for Capacitor.
 *
 * Uses @capacitor/filesystem to store downloaded images in the app's
 * CACHE directory (no storage permission needed — it's app-private).
 *
 * Flow:
 * 1. Check if image URL is already cached → return local file URI
 * 2. If not, fetch the image, write to cache dir, return local URI
 * 3. Maintain an in-memory index + persist index via @capacitor/preferences
 *
 * On web (browser), falls back to the URL as-is (SW handles caching there).
 */

import { Capacitor } from "@capacitor/core";

// Lazy-load native plugins only when running on a native platform
let Filesystem: typeof import("@capacitor/filesystem").Filesystem | null = null;
let Directory: typeof import("@capacitor/filesystem").Directory | null = null;
let Preferences: typeof import("@capacitor/preferences").Preferences | null = null;

const isNative = Capacitor.isNativePlatform();

// In-memory lookup: original URL → local file URI
const cache = new Map<string, string>();
// URLs currently being fetched (prevent duplicate downloads)
const inflight = new Map<string, Promise<string>>();

const INDEX_KEY = "staymate_img_cache_index";
const CACHE_DIR = "img_cache";
const MAX_ENTRIES = 500;

/** Initialize native plugins + restore index from Preferences */
let initPromise: Promise<void> | null = null;

function init(): Promise<void> {
  if (!isNative) return Promise.resolve();
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const fs = await import("@capacitor/filesystem");
    const prefs = await import("@capacitor/preferences");
    Filesystem = fs.Filesystem;
    Directory = fs.Directory;
    Preferences = prefs.Preferences;

    // Ensure cache directory exists
    try {
      await Filesystem.mkdir({
        path: CACHE_DIR,
        directory: Directory.CACHE,
        recursive: true,
      });
    } catch {
      // Already exists — fine
    }

    // Restore index
    const { value } = await Preferences.get({ key: INDEX_KEY });
    if (value) {
      try {
        const entries: [string, string][] = JSON.parse(value);
        for (const [url, path] of entries) {
          // Build the local URI from the cached path
          const uri = await getFileUri(path);
          if (uri) cache.set(url, uri);
        }
      } catch {
        // Corrupted index — start fresh
      }
    }
  })();

  return initPromise;
}

async function getFileUri(path: string): Promise<string | null> {
  if (!Filesystem || !Directory) return null;
  try {
    const { uri } = await Filesystem.getUri({
      path: `${CACHE_DIR}/${path}`,
      directory: Directory.CACHE,
    });
    return Capacitor.convertFileSrc(uri);
  } catch {
    return null;
  }
}

async function persistIndex() {
  if (!Preferences) return;
  // Store as [[url, filename], ...] — we rebuild full URIs on init
  const entries: [string, string][] = [];
  for (const [url] of cache) {
    entries.push([url, urlToFilename(url)]);
  }
  await Preferences.set({ key: INDEX_KEY, value: JSON.stringify(entries) });
}

/** Deterministic filename from URL (hash-like, collision-resistant) */
function urlToFilename(url: string): string {
  // Simple hash: use last path segments + query params hash
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    hash = ((hash << 5) - hash + url.charCodeAt(i)) | 0;
  }
  const ext = url.match(/\.(jpe?g|png|webp|gif|avif)/i)?.[1] || "jpg";
  return `${Math.abs(hash).toString(36)}.${ext}`;
}

/**
 * Get a cached image URL. On native, downloads + caches to filesystem.
 * On web, returns the URL as-is.
 */
export async function getCachedImageUrl(originalUrl: string): Promise<string> {
  if (!originalUrl) return "";
  if (!isNative) return originalUrl;

  await init();

  // Already cached in memory?
  const cached = cache.get(originalUrl);
  if (cached) return cached;

  // Already downloading?
  const existing = inflight.get(originalUrl);
  if (existing) return existing;

  const promise = (async () => {
    try {
      if (!Filesystem || !Directory) return originalUrl;

      const filename = urlToFilename(originalUrl);

      // Check if file exists on disk (might be cached from previous session
      // but index was lost)
      try {
        const uri = await getFileUri(filename);
        if (uri) {
          cache.set(originalUrl, uri);
          return uri;
        }
      } catch {
        // Not on disk
      }

      // Download the image
      const response = await fetch(originalUrl);
      if (!response.ok) return originalUrl;

      const blob = await response.blob();
      const base64 = await blobToBase64(blob);

      // Write to cache directory
      await Filesystem.writeFile({
        path: `${CACHE_DIR}/${filename}`,
        data: base64,
        directory: Directory.CACHE,
      });

      // Get the local URI
      const localUri = await getFileUri(filename);
      if (!localUri) return originalUrl;

      cache.set(originalUrl, localUri);

      // Evict oldest if over limit
      if (cache.size > MAX_ENTRIES) {
        const oldestKey = cache.keys().next().value;
        if (oldestKey) {
          cache.delete(oldestKey);
          try {
            await Filesystem.deleteFile({
              path: `${CACHE_DIR}/${urlToFilename(oldestKey)}`,
              directory: Directory.CACHE,
            });
          } catch { /* ignore */ }
        }
      }

      // Persist index (fire and forget)
      persistIndex();

      return localUri;
    } catch {
      return originalUrl;
    } finally {
      inflight.delete(originalUrl);
    }
  })();

  inflight.set(originalUrl, promise);
  return promise;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Strip the data:...;base64, prefix
      resolve(result.split(",")[1] || "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Preload a batch of image URLs into the native cache.
 * Call this when listing data arrives to start caching ahead of scroll.
 */
export function preloadImages(urls: string[]) {
  if (!isNative) return;
  for (const url of urls) {
    if (url && !cache.has(url)) {
      getCachedImageUrl(url); // fire and forget
    }
  }
}
