import test from "node:test";
import assert from "node:assert/strict";
import { guestStorageKey, legacySessionMatchesProject } from "../../src/lib/auth/storage";
const oldSession = (issuer: string) => JSON.stringify({ access_token: `header.${Buffer.from(JSON.stringify({iss:issuer})).toString("base64url")}.signature`, refresh_token: "synthetic-refresh-token" });
test("guest storage isolates Supabase projects and local ports", () => {
  assert.notEqual(guestStorageKey("http://127.0.0.1:54321"), guestStorageKey("https://project.supabase.co"));
  assert.notEqual(guestStorageKey("http://127.0.0.1:54321"), guestStorageKey("http://127.0.0.1:54331"));
  assert.equal(guestStorageKey("https://project.supabase.co/"), guestStorageKey("https://project.supabase.co"));
});
test("legacy migration keeps same-project guest but rejects other issuers", () => {
  const legacy = oldSession("https://project.supabase.co/auth/v1");
  assert.equal(legacySessionMatchesProject(legacy, "https://project.supabase.co"), true);
  assert.equal(legacySessionMatchesProject(legacy, "https://other.supabase.co"), false);
  assert.equal(legacySessionMatchesProject(oldSession("http://127.0.0.1:54321/auth/v1"), "https://project.supabase.co"), false);
  assert.equal(legacySessionMatchesProject(oldSession("https://project.supabase.co/other"), "https://project.supabase.co"), false);
  for (const broken of ["not-json", "null", "{}", JSON.stringify({access_token:"bad",refresh_token:"x"})]) assert.equal(legacySessionMatchesProject(broken,"https://project.supabase.co"),false);
});
