// Client-side saved listings store using localStorage
// Will be replaced with a proper backend in Phase 3

import type { ListingType } from "./types";

const STORAGE_KEY = "staymate-saved";

interface SavedEntry {
  id: string;
  type: ListingType;
  savedAt: string;
}

function load(): SavedEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function save(entries: SavedEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  window.dispatchEvent(new Event("staymate:saved-changed"));
}

export function addSaved(id: string, type: ListingType) {
  const entries = load();
  if (!entries.find((e) => e.id === id)) {
    entries.unshift({ id, type, savedAt: new Date().toISOString() });
    save(entries);
  }
}

export function removeSaved(id: string) {
  save(load().filter((e) => e.id !== id));
}

export function isSaved(id: string): boolean {
  return load().some((e) => e.id === id);
}

export function getSavedByType(type: ListingType): SavedEntry[] {
  return load().filter((e) => e.type === type);
}

export function getAllSaved(): SavedEntry[] {
  return load();
}
