import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import { createGoogleMeetingProvider, type GoogleMeetingInput } from "../../src/features/meet/server/google-meet-core";

const input: GoogleMeetingInput = { id: "11111111-1111-4111-8111-111111111111", groupId: "22222222-2222-4222-8222-222222222222", startsAt: "2026-11-15T10:00:00Z", endsAt: "2026-11-15T10:30:00Z" };
const config = { clientId: "test-client", clientSecret: "test-client-secret", refreshToken: "test-refresh-secret" };
const now = () => Date.parse("2026-11-14T10:00:00Z");
const url = "https://meet.google.com/abc-defg-hij";
const json = (body: unknown, status = 200) => Response.json(body, { status });
const token = () => json({ access_token: "test-access-secret", token_type: "Bearer", expires_in: 3600 });
const event = (meeting = input, status = "success", uri = url) => ({
  id: meeting.id.replaceAll("-", ""), status: "confirmed",
  start: { dateTime: meeting.startsAt }, end: { dateTime: meeting.endsAt },
  extendedProperties: { private: { learningSquadsMeetingId: meeting.id, learningSquadsGroupId: meeting.groupId } },
  conferenceData: { createRequest: { status: { statusCode: status } }, conferenceSolution: { key: { type: "hangoutsMeet" } }, entryPoints: [{ entryPointType: "video", uri }] },
});
type Handler = (url: URL, init: RequestInit) => Promise<Response> | Response;
const mockedFetch = (handler: Handler) => ((target: string | URL | Request, init?: RequestInit) => Promise.resolve(handler(new URL(String(target)), init ?? {}))) as typeof fetch;
const unavailable = { status: "unavailable", meetUrl: null };

test("Meet requires configuration and valid authorized-row shape before network", async () => {
  let calls = 0;
  const send = mockedFetch(() => { calls++; throw new Error("must not call"); });
  assert.deepEqual(await createGoogleMeetingProvider({ config: () => null, fetch: send }).ensureGoogleMeeting(input), unavailable);
  const provider = createGoogleMeetingProvider({ config: () => config, fetch: send, now });
  for (const bad of [{ ...input, id: "../../private" }, { ...input, groupId: "not-uuid" }, { ...input, startsAt: "tomorrow" }, { ...input, endsAt: input.startsAt }]) assert.deepEqual(await provider.ensureGoogleMeeting(bad), unavailable);
  assert.equal(calls, 0);
});

test("Meet inserts deterministic event, no attendees or notifications, then reads same room", async () => {
  let saved: unknown, refreshes = 0, inserts = 0;
  const provider = createGoogleMeetingProvider({ config: () => config, now, fetch: mockedFetch((target, init) => {
    if (target.hostname === "oauth2.googleapis.com") { refreshes++; assert.equal(new URLSearchParams(String(init.body)).get("grant_type"), "refresh_token"); return token(); }
    assert.equal(new Headers(init.headers).get("authorization"), "Bearer test-access-secret");
    assert.equal(init.credentials, "omit"); assert.equal(init.redirect, "error");
    if (init.method === "GET") return saved ? json(saved) : json({}, 404);
    inserts++; assert.equal(target.searchParams.get("conferenceDataVersion"), "1"); assert.equal(target.searchParams.get("sendUpdates"), "none");
    const body = JSON.parse(String(init.body));
    assert.equal(body.id, input.id.replaceAll("-", "")); assert.match(body.id, /^[0-9a-v]{32}$/);
    assert.equal(body.conferenceData.createRequest.requestId, `ls-${input.id}`);
    assert.equal(body.conferenceData.createRequest.conferenceSolutionKey.type, "hangoutsMeet");
    assert.equal(body.attendees, undefined); assert.equal(body.visibility, "private"); assert.deepEqual(body.reminders, { useDefault: false });
    saved = event(); return json(saved);
  }) });
  assert.deepEqual(await provider.ensureGoogleMeeting(input), { status: "ready", meetUrl: url });
  assert.deepEqual(await provider.ensureGoogleMeeting(input), { status: "ready", meetUrl: url });
  assert.equal(inserts, 1); assert.equal(refreshes, 1);
});

test("concurrent callers share refresh/create and a different DB meeting gets its own event", async () => {
  let refreshes = 0, inserts = 0;
  const second = { ...input, id: "33333333-3333-4333-8333-333333333333" };
  const provider = createGoogleMeetingProvider({ config: () => config, now, fetch: mockedFetch(async (target, init) => {
    if (target.hostname === "oauth2.googleapis.com") { refreshes++; await new Promise(resolve => setTimeout(resolve, 5)); return token(); }
    if (init.method === "GET") return json({}, 404);
    inserts++; const body = JSON.parse(String(init.body)); return json(event(body.id === input.id.replaceAll("-", "") ? input : second));
  }) });
  const results = await Promise.all([provider.ensureGoogleMeeting(input), provider.ensureGoogleMeeting(input), provider.ensureGoogleMeeting(second)]);
  assert.ok(results.every(result => result.status === "ready")); assert.equal(refreshes, 1); assert.equal(inserts, 2);
});

test("distributed creation conflict retrieves winner; lost insert response retries by deterministic ID", async () => {
  let gets = 0, posts = 0;
  const provider = createGoogleMeetingProvider({ config: () => config, now, fetch: mockedFetch((target, init) => {
    if (target.hostname === "oauth2.googleapis.com") return token();
    if (init.method === "GET") return ++gets === 1 ? json({}, 404) : json(event());
    posts++; return json({}, 409);
  }) });
  assert.deepEqual(await provider.ensureGoogleMeeting(input), { status: "ready", meetUrl: url }); assert.equal(posts, 1); assert.equal(gets, 2);
  let exists = false;
  const uncertain = createGoogleMeetingProvider({ config: () => config, now, fetch: mockedFetch((target, init) => {
    if (target.hostname === "oauth2.googleapis.com") return token();
    if (init.method === "GET") return exists ? json(event()) : json({}, 404);
    exists = true; throw new Error("response lost after commit");
  }) });
  assert.deepEqual(await uncertain.ensureGoogleMeeting(input), unavailable);
  assert.deepEqual(await uncertain.ensureGoogleMeeting(input), { status: "ready", meetUrl: url });
});

test("pending, failed, mismatched and malicious responses never leak a URL", async () => {
  const cases: Array<[unknown, "pending" | "unavailable"]> = [
    [event(input, "pending"), "pending"], [event(input, "failure"), "unavailable"],
    [event(input, "success", "https://meet.google.com.evil.test/abc-defg-hij"), "unavailable"],
    [event(input, "success", `${url}?token=test-access-secret`), "unavailable"],
    [{ ...event(), extendedProperties: {} }, "unavailable"],
    [{ ...event(), start: { dateTime: "2026-11-16T10:00:00Z" } }, "unavailable"],
    [{ ...event(), status: "cancelled" }, "unavailable"],
    [{ ...event(), id: "someoneelsesid" }, "unavailable"],
  ];
  for (const [body, status] of cases) {
    const provider = createGoogleMeetingProvider({ config: () => config, now, fetch: mockedFetch(target => target.hostname === "oauth2.googleapis.com" ? token() : json(body)) });
    assert.deepEqual(await provider.ensureGoogleMeeting(input), { status, meetUrl: null });
  }
});

test("provider outage, invalid grant, malformed JSON and total timeout expose only unavailable", async () => {
  for (const send of [
    mockedFetch(() => json({ error: "test-refresh-secret" }, 400)),
    mockedFetch(target => target.hostname === "oauth2.googleapis.com" ? token() : json({ error: "test-access-secret" }, 429)),
    mockedFetch(target => target.hostname === "oauth2.googleapis.com" ? token() : new Response("not json")),
    mockedFetch(() => { throw new Error("test-client-secret"); }),
    mockedFetch(() => new Promise<Response>(() => {})),
  ]) {
    const provider = createGoogleMeetingProvider({ config: () => config, now, fetch: send, budgetMs: 20 });
    assert.deepEqual(await provider.ensureGoogleMeeting(input), unavailable);
  }
});

test("past or lookup-only missing events are not created; pending can become ready", async () => {
  let status = "pending", posts = 0;
  const provider = createGoogleMeetingProvider({ config: () => config, now, fetch: mockedFetch((target, init) => {
    if (target.hostname === "oauth2.googleapis.com") return token();
    if (init.method === "POST") posts++;
    return status === "missing" ? json({}, 404) : json(event(input, status));
  }) });
  assert.equal((await provider.ensureGoogleMeeting(input)).status, "pending"); status = "success";
  assert.equal((await provider.ensureGoogleMeeting(input)).status, "ready"); status = "missing";
  assert.deepEqual(await provider.ensureGoogleMeeting({ ...input, createIfMissing: false }), unavailable);
  assert.deepEqual(await provider.ensureGoogleMeeting({ ...input, startsAt: "2025-01-01T10:00:00Z", endsAt: "2025-01-01T10:30:00Z" }), unavailable);
  assert.equal(posts, 0);
});

test("cancellation deletes only matching managed events, sends no updates and tolerates absence", async () => {
  let deletes = 0, body: unknown = event();
  const provider = createGoogleMeetingProvider({ config: () => config, now, fetch: mockedFetch((target, init) => {
    if (target.hostname === "oauth2.googleapis.com") return token();
    if (init.method === "DELETE") { deletes++; assert.equal(target.searchParams.get("sendUpdates"), "none"); return new Response(null, { status: 204 }); }
    return body ? json(body) : json({}, 404);
  }) });
  body = { ...event(), extendedProperties: {} }; assert.equal(await provider.cancelGoogleMeeting(input), false); assert.equal(deletes, 0);
  body = event(); assert.equal(await provider.cancelGoogleMeeting(input), true); assert.equal(deletes, 1);
  body = null; assert.equal(await provider.cancelGoogleMeeting(input), true); assert.equal(deletes, 1);
});

test("expired access token is refreshed on the next attempt, including cancellation reads", async () => {
  let refreshes = 0, denied = true;
  const provider = createGoogleMeetingProvider({ config: () => config, now, fetch: mockedFetch(target => {
    if (target.hostname === "oauth2.googleapis.com") { refreshes++; return token(); }
    return denied ? json({}, 401) : json(event());
  }) });
  assert.deepEqual(await provider.ensureGoogleMeeting(input), unavailable);
  assert.equal(await provider.cancelGoogleMeeting(input), false);
  denied = false;
  assert.equal((await provider.ensureGoogleMeeting(input)).status, "ready");
  assert.equal(refreshes, 3);
});

for (const openMeet of [false, true]) test(`local OAuth helper rejects wrong state, uses PKCE and scopes only explicit OPEN=${openMeet}`, async () => {
  const folder = await mkdtemp(join(tmpdir(), "learning-squads-oauth-test-"));
  const clientFile = join(folder, "client.json"), outputFile = join(folder, ".env.google.local");
  await writeFile(clientFile, JSON.stringify({ installed: { client_id: "synthetic.apps.googleusercontent.com", client_secret: "synthetic-private-secret" } }));
  const child = spawn(process.execPath, ["scripts/google-oauth-local.mjs", "--client-file", clientFile, "--output-env", outputFile, ...(openMeet ? ["--open-meet"] : [])], { cwd: process.cwd(), windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  let logs = "";
  child.stdout.setEncoding("utf8"); child.stderr.setEncoding("utf8");
  child.stdout.on("data", chunk => { logs += chunk; }); child.stderr.on("data", chunk => { logs += chunk; });
  const exited = once(child, "exit");
  try {
    const deadline = Date.now() + 5000;
    while (!logs.includes("https://accounts.google.com/") && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 10));
    const address = logs.split(/\r?\n/).find(line => line.startsWith("https://accounts.google.com/"));
    assert.ok(address, "helper produced consent URL");
    const consent = new URL(address);
    assert.equal(consent.searchParams.get("code_challenge_method"), "S256");
    assert.match(consent.searchParams.get("code_challenge") ?? "", /^[\w-]{43}$/);
    assert.equal(consent.searchParams.get("scope"), "https://www.googleapis.com/auth/calendar.events" + (openMeet ? " https://www.googleapis.com/auth/meetings.space.settings" : ""));
    const callback = new URL(consent.searchParams.get("redirect_uri")!);
    assert.equal(callback.hostname, "127.0.0.1");
    callback.search = new URLSearchParams({ state: "incorrect", error: "access_denied" }).toString();
    assert.equal((await fetch(callback)).status, 400);
    callback.search = new URLSearchParams({ state: consent.searchParams.get("state")!, error: "access_denied" }).toString();
    assert.equal((await fetch(callback)).status, 400);
    const [code] = await exited;
    assert.equal(code, 1); assert.equal(await readFile(outputFile, "utf8"), "");
    assert.equal(logs.includes("synthetic-private-secret"), false);
  } finally {
    if (child.exitCode === null) { child.kill(); await exited; }
    await rm(folder, { recursive: true, force: true });
  }
});

test("OPEN defaults off and makes no Meet settings requests", async () => {
  let settings = 0;
  const provider = createGoogleMeetingProvider({ config: () => config, now, fetch: mockedFetch(target => {
    if (target.hostname === "oauth2.googleapis.com") return token();
    if (target.hostname === "meet.googleapis.com") settings++;
    return json(event());
  }) });
  assert.deepEqual(await provider.ensureGoogleMeeting(input), { status: "ready", meetUrl: url });
  assert.equal(settings, 0);
});

test("opt-in OPEN resolves canonical space, patches only accessType, and verifies result", async () => {
  const space = { name: "spaces/canonical_space123", meetingUri: url, meetingCode: "abc-defg-hij", config: { accessType: "TRUSTED" } };
  let patches = 0, gets = 0;
  const provider = createGoogleMeetingProvider({ config: () => ({ ...config, openAccess: true }), now, fetch: mockedFetch((target, init) => {
    if (target.hostname === "oauth2.googleapis.com") return token();
    if (target.hostname !== "meet.googleapis.com") return json(event());
    if (init.method === "GET") { gets++; assert.equal(target.pathname, "/v2/spaces/abc-defg-hij"); return json(space); }
    patches++; assert.equal(init.method, "PATCH");
    assert.equal(target.pathname, "/v2/spaces/canonical_space123");
    assert.equal(target.searchParams.get("updateMask"), "config.accessType");
    assert.deepEqual(JSON.parse(String(init.body)), { name: space.name, config: { accessType: "OPEN" } });
    space.config.accessType = "OPEN"; return json(space);
  }) });
  assert.deepEqual(await provider.ensureGoogleMeeting(input), { status: "ready", meetUrl: url });
  assert.deepEqual(await provider.ensureGoogleMeeting(input), { status: "ready", meetUrl: url });
  assert.equal(patches, 1); assert.equal(gets, 2); // Re-check Google; do not cache an authorization assumption.
});

test("opt-in OPEN fails closed for denied, mismatched or unchanged settings", async () => {
  const space = { name: "spaces/canonical_space123", meetingUri: url, meetingCode: "abc-defg-hij", config: { accessType: "TRUSTED" } };
  for (const scenario of ["get-denied", "patch-denied", "wrong-uri", "bad-name", "unchanged", "wrong-patched-uri", "timeout"]) {
    let patches = 0;
    const provider = createGoogleMeetingProvider({ config: () => ({ ...config, openAccess: true }), now, budgetMs: 30, fetch: mockedFetch((target, init) => {
      if (target.hostname === "oauth2.googleapis.com") return token();
      if (target.hostname !== "meet.googleapis.com") return json(event());
      if (scenario === "timeout") return new Promise<Response>(() => {});
      if (init.method === "GET") {
        if (scenario === "get-denied") return json({ error: "test-access-secret" }, 403);
        return json({ ...space, ...(scenario === "wrong-uri" ? { meetingUri: "https://meet.google.com/xyz-abcd-efg" } : {}), ...(scenario === "bad-name" ? { name: "spaces/../../private" } : {}) });
      }
      patches++;
      if (scenario === "patch-denied") return json({}, 403);
      return json({ ...space, ...(scenario === "wrong-patched-uri" ? { meetingUri: "https://meet.google.com/xyz-abcd-efg", config: { accessType: "OPEN" } } : {}) });
    }) });
    assert.deepEqual(await provider.ensureGoogleMeeting(input), unavailable, scenario);
    if (["get-denied", "wrong-uri", "bad-name", "timeout"].includes(scenario)) assert.equal(patches, 0);
  }
});
