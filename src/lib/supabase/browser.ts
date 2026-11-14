import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { guestStorageKey, legacyGuestStorageKey, legacySessionMatchesProject } from "../auth/storage";
let client: SupabaseClient | undefined;
export function browserSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Guest profiles are not available yet. Please try again later.");
  if (!client) {
    const storageKey = guestStorageKey(url);
    if (typeof window !== "undefined") {
      try {
        const legacy = window.localStorage.getItem(legacyGuestStorageKey);
        if (!window.localStorage.getItem(storageKey) && legacy && legacySessionMatchesProject(legacy, url)) {
          window.localStorage.setItem(storageKey, legacy);
          // Keep the old entry until its owner can migrate, and never import a
          // different project's session into the new project's storage key.
        }
      } catch { /* Supabase handles unavailable storage; migration is optional. */ }
    }
    client = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey } });
  }
  return client;
}
