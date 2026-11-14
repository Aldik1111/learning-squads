export const legacyGuestStorageKey = "learning-squads-auth";

export function guestStorageKey(projectUrl: string): string {
  return `learning-squads-auth:${new URL(projectUrl).origin}`;
}

// This is only a storage-migration hint, never authentication. The API verifies
// the JWT with Supabase getUser before exposing or modifying any private data.
export function legacySessionMatchesProject(serialized: string, projectUrl: string): boolean {
  try {
    const session: unknown = JSON.parse(serialized);
    if (!session || typeof session !== "object" || !("access_token" in session) || !("refresh_token" in session)
      || typeof session.access_token !== "string" || typeof session.refresh_token !== "string") return false;
    const payload = session.access_token.split(".")[1];
    if (!payload) return false;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const claims: unknown = JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")));
    if (!claims || typeof claims !== "object" || !("iss" in claims) || typeof claims.iss !== "string") return false;
    const issuer = new URL(claims.iss);
    return issuer.origin === new URL(projectUrl).origin && issuer.pathname.replace(/\/$/, "") === "/auth/v1";
  } catch { return false; }
}
