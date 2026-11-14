"use client";
import { browserSupabase } from "../supabase/browser";
let pending: Promise<{ userId: string }> | null = null;
export function ensureGuestSession(): Promise<{ userId: string }> {
  if (pending) return pending;
  const ensure = async () => {
    const client = browserSupabase();
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    if (data.session) return { userId: data.session.user.id };
    const signed = await client.auth.signInAnonymously();
    if (signed.error || !signed.data.user) throw signed.error ?? new Error("Could not create your guest profile.");
    return { userId: signed.data.user.id };
  };
  const operation = typeof navigator !== "undefined" && navigator.locks
    ? navigator.locks.request("learning-squads-guest", ensure) : ensure();
  pending = operation.finally(() => { pending = null; });
  return pending;
}
