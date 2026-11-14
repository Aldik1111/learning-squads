import { createHash } from "node:crypto";

export type GoogleMeetingInput = {
  id: string;
  groupId: string;
  startsAt: string;
  endsAt: string;
  /** GET only when false. Expired meetings are always GET only. */
  createIfMissing?: boolean;
};
export type GoogleMeetingResult = { status: "pending" | "ready" | "unavailable"; meetUrl: string | null };
export type GoogleCalendarConfig = { clientId: string; clientSecret: string; refreshToken: string; calendarId?: string; openAccess?: boolean };
type Dependencies = { config: () => GoogleCalendarConfig | null; fetch?: typeof fetch; now?: () => number; budgetMs?: number };
type JsonObject = Record<string, unknown>;
const unavailable = (): GoogleMeetingResult => ({ status: "unavailable", meetUrl: null });
const uuid = /^[\da-f]{8}-[\da-f]{4}-[1-8][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i;
const timestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const meetUrl = /^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/;
const object = (value: unknown): JsonObject => value !== null && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : {};

/** No authorization happens here: callers must load/authorize the DB row first. */
export function createGoogleMeetingProvider(dependencies: Dependencies) {
  const send = dependencies.fetch ?? fetch;
  const now = dependencies.now ?? Date.now;
  const budgetMs = Math.min(12_000, Math.max(1, dependencies.budgetMs ?? 12_000));
  const inFlight = new Map<string, Promise<GoogleMeetingResult>>();
  const cancellations = new Map<string, Promise<boolean>>();
  const refreshing = new Map<string, Promise<string | null>>();
  let cachedToken: { key: string; value: string; expiresAt: number } | null = null;

  async function request(url: string, init: RequestInit, signal: AbortSignal) {
    signal.throwIfAborted();
    const response = await send(url, { ...init, cache: "no-store", credentials: "omit", redirect: "error", signal });
    signal.throwIfAborted();
    return response;
  }
  async function json(response: Response, signal: AbortSignal): Promise<JsonObject> {
    const result: unknown = await response.json();
    signal.throwIfAborted();
    return object(result);
  }
  async function accessToken(config: GoogleCalendarConfig, key: string, signal: AbortSignal): Promise<string | null> {
    if (cachedToken?.key === key && cachedToken.expiresAt > now() + 30_000) return cachedToken.value;
    const active = refreshing.get(key);
    if (active) return active;
    const work = (async () => {
      const response = await request("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, refresh_token: config.refreshToken, grant_type: "refresh_token" }),
      }, signal);
      if (!response.ok) return null;
      const data = await json(response, signal);
      if (typeof data.access_token !== "string" || !data.access_token || data.token_type !== "Bearer" || typeof data.expires_in !== "number" || !Number.isFinite(data.expires_in) || data.expires_in <= 0) return null;
      cachedToken = { key, value: data.access_token, expiresAt: now() + Math.min(data.expires_in, 3600) * 1000 };
      return data.access_token;
    })().catch(() => null).finally(() => { if (refreshing.get(key) === work) refreshing.delete(key); });
    refreshing.set(key, work);
    signal.addEventListener("abort", () => { if (refreshing.get(key) === work) refreshing.delete(key); }, { once: true });
    return work;
  }

  function resultForEvent(event: JsonObject, input: GoogleMeetingInput, eventId: string): GoogleMeetingResult {
    const properties = object(object(event.extendedProperties).private);
    if (event.id !== eventId || event.status === "cancelled" || properties.learningSquadsMeetingId !== input.id || properties.learningSquadsGroupId !== input.groupId) return unavailable();
    if (Date.parse(String(object(event.start).dateTime)) !== Date.parse(input.startsAt) || Date.parse(String(object(event.end).dateTime)) !== Date.parse(input.endsAt)) return unavailable();
    const conference = object(event.conferenceData);
    const status = object(object(conference.createRequest).status).statusCode;
    if (status === "pending") return { status: "pending", meetUrl: null };
    if (status !== undefined && status !== "success") return unavailable();
    if (object(object(conference.conferenceSolution).key).type !== "hangoutsMeet") return unavailable();
    const video = Array.isArray(conference.entryPoints) ? conference.entryPoints.map(object).find(entry => entry.entryPointType === "video") : undefined;
    return typeof video?.uri === "string" && meetUrl.test(video.uri) ? { status: "ready", meetUrl: video.uri } : unavailable();
  }

  async function confirmOpenAccess(uri: string, headers: Record<string, string>, key: string, signal: AbortSignal): Promise<boolean> {
    const code = uri.slice("https://meet.google.com/".length);
    let response = await request(`https://meet.googleapis.com/v2/spaces/${code}`, { method: "GET", headers }, signal);
    if (response.status === 401 && cachedToken?.key === key) cachedToken = null;
    if (!response.ok) return false;
    const space = await json(response, signal);
    // Resolve the meeting-code alias; PATCH must use Google's canonical resource name.
    if (typeof space.name !== "string" || !/^spaces\/[A-Za-z0-9_-]+$/.test(space.name) || space.meetingUri !== uri || space.meetingCode !== code) return false;
    if (object(space.config).accessType === "OPEN") return true;
    response = await request(`https://meet.googleapis.com/v2/${space.name}?updateMask=config.accessType`, {
      method: "PATCH", headers, body: JSON.stringify({ name: space.name, config: { accessType: "OPEN" } }),
    }, signal);
    if (response.status === 401 && cachedToken?.key === key) cachedToken = null;
    if (!response.ok) return false;
    const updated = await json(response, signal);
    return updated.name === space.name && updated.meetingUri === uri && updated.meetingCode === code && object(updated.config).accessType === "OPEN";
  }

  async function run(input: GoogleMeetingInput, config: GoogleCalendarConfig, key: string, signal: AbortSignal): Promise<GoogleMeetingResult> {
    const token = await accessToken(config, key, signal);
    if (!token) return unavailable();
    const eventId = input.id.replaceAll("-", "").toLowerCase(); // UUID hex is a valid base32hex subset.
    const base = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(config.calendarId || "primary")}/events`;
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
    const get = () => request(`${base}/${eventId}`, { method: "GET", headers }, signal);
    let response = await get();
    if (response.status === 404) {
      if (input.createIfMissing === false || Date.parse(input.endsAt) <= now()) return unavailable();
      response = await request(`${base}?conferenceDataVersion=1&sendUpdates=none`, {
        method: "POST", headers,
        body: JSON.stringify({
          id: eventId,
          summary: "Learning Squads practice",
          start: { dateTime: new Date(input.startsAt).toISOString() },
          end: { dateTime: new Date(input.endsAt).toISOString() },
          visibility: "private",
          guestsCanInviteOthers: false,
          guestsCanModify: false,
          guestsCanSeeOtherGuests: false,
          reminders: { useDefault: false },
          extendedProperties: { private: { learningSquadsMeetingId: input.id, learningSquadsGroupId: input.groupId } },
          conferenceData: { createRequest: { requestId: `ls-${input.id}`, conferenceSolutionKey: { type: "hangoutsMeet" } } },
          // No attendees: no participant email/calendar access or invitations.
        }),
      }, signal);
      if (response.status === 409) response = await get();
    }
    if (response.status === 401 && cachedToken?.key === key) cachedToken = null;
    if (!response.ok) return unavailable();
    const result = resultForEvent(await json(response, signal), input, eventId);
    if (config.openAccess === true && result.status === "ready" && result.meetUrl && !await confirmOpenAccess(result.meetUrl, headers, key, signal)) return unavailable();
    return result;
  }

  async function ensureGoogleMeeting(input: GoogleMeetingInput): Promise<GoogleMeetingResult> {
    // Validate even when called outside the HTTP adapter; never interpolate arbitrary paths.
    if (!input || !uuid.test(input.id) || !uuid.test(input.groupId) || !timestamp.test(input.startsAt) || !timestamp.test(input.endsAt)) return unavailable();
    const start = Date.parse(input.startsAt), end = Date.parse(input.endsAt);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return unavailable();
    let config: GoogleCalendarConfig | null;
    try { config = dependencies.config(); } catch { return unavailable(); }
    if (!config?.clientId || !config.clientSecret || !config.refreshToken) return unavailable();
    const key = createHash("sha256").update(JSON.stringify(config)).digest("hex");
    const commandKey = JSON.stringify([key, input.id, input.groupId, start, end, input.createIfMissing !== false]);
    const active = inFlight.get(commandKey);
    if (active) return active;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const deadline = new Promise<GoogleMeetingResult>(resolve => {
      timer = setTimeout(() => { controller.abort(); resolve(unavailable()); }, budgetMs);
    });
    const work = Promise.race([run(input, config, key, controller.signal).catch(() => unavailable()), deadline])
      .finally(() => { clearTimeout(timer); controller.abort(); inFlight.delete(commandKey); });
    inFlight.set(commandKey, work);
    return work;
  }
  /** Caller must authorize and confirm cancellation in the database before invoking. */
  async function cancelGoogleMeeting(input: Pick<GoogleMeetingInput, "id" | "groupId">): Promise<boolean> {
    if (!input || !uuid.test(input.id) || !uuid.test(input.groupId)) return false;
    let config: GoogleCalendarConfig | null;
    try { config = dependencies.config(); } catch { return false; }
    if (!config?.clientId || !config.clientSecret || !config.refreshToken) return false;
    const key = createHash("sha256").update(JSON.stringify(config)).digest("hex");
    const commandKey = JSON.stringify([key, input.id, input.groupId]);
    const active = cancellations.get(commandKey);
    if (active) return active;
    const controller = new AbortController();
    const signal = controller.signal;
    let timer: ReturnType<typeof setTimeout>;
    const deadline = new Promise<boolean>(resolve => { timer = setTimeout(() => { controller.abort(); resolve(false); }, budgetMs); });
    const operation = (async () => {
      const token = await accessToken(config, key, signal);
      if (!token) return false;
      const eventId = input.id.replaceAll("-", "").toLowerCase();
      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(config.calendarId || "primary")}/events/${eventId}`;
      const headers = { Authorization: `Bearer ${token}` };
      let response = await request(url, { method: "GET", headers }, signal);
      if (response.status === 404 || response.status === 410) return true;
      if (response.status === 401 && cachedToken?.key === key) cachedToken = null;
      if (!response.ok) return false;
      const event = await json(response, signal);
      if (event.id !== eventId) return false;
      if (event.status === "cancelled") return true;
      const properties = object(object(event.extendedProperties).private);
      if (properties.learningSquadsMeetingId !== input.id || properties.learningSquadsGroupId !== input.groupId) return false;
      response = await request(`${url}?sendUpdates=none`, { method: "DELETE", headers }, signal);
      if (response.status === 401 && cachedToken?.key === key) cachedToken = null;
      return response.ok || response.status === 404 || response.status === 410;
    })().catch(() => false);
    const work = Promise.race([operation, deadline]).finally(() => { clearTimeout(timer); controller.abort(); cancellations.delete(commandKey); });
    cancellations.set(commandKey, work);
    return work;
  }
  return { ensureGoogleMeeting, cancelGoogleMeeting };
}
