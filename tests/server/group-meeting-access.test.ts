import assert from "node:assert/strict";
import { test } from "node:test";
import type { GroupMeeting } from "../../src/contracts";
import { loadAuthorizedGroupMeetings, type GroupMeetingDependencies } from "../../src/features/groups/server/meetings";

const row: GroupMeeting = { id: "10000000-0000-4000-8000-000000000001", groupId: "20000000-0000-4000-8000-000000000001", startsAt: "2026-11-14T10:00:00Z", endsAt: "2026-11-14T10:15:00Z", status: "pending", meetUrl: null, createdBy: "30000000-0000-4000-8000-000000000001", createdAt: "2026-11-13T10:00:00Z" };
const ready = { status: "ready" as const, meetUrl: "https://meet.google.com/abc-defg-hij" };
const now = () => Date.parse("2026-11-14T12:00:00Z");
function dependencies(overrides: Partial<GroupMeetingDependencies> = {}): GroupMeetingDependencies {
  return { readMeetings: async () => [{ ...row }], readCancelled: async () => [], ensure: async () => ready, cancel: async () => true, now, ...overrides };
}

test("past calendar history keeps existing Google URL with GET-only provisioning", async () => {
  const result = await loadAuthorizedGroupMeetings(dependencies({ ensure: async input => {
    assert.equal(input.createIfMissing, false); return ready;
  } }));
  assert.equal(result[0].status, "ready");
  assert.equal(result[0].meetUrl, ready.meetUrl);
});

test("future calendar entries may create once and are reauthorized before return", async () => {
  let reads = 0;
  const future = { ...row, startsAt: "2026-11-15T10:00:00Z", endsAt: "2026-11-15T10:15:00Z" };
  const result = await loadAuthorizedGroupMeetings(dependencies({
    readMeetings: async () => { reads++; return [future]; },
    ensure: async input => { assert.equal(input.createIfMissing, true); assert.equal(reads, 1); return ready; },
  }));
  assert.equal(reads, 2);
  assert.equal(result[0].meetUrl, ready.meetUrl);
});

test("late Google insertion after reassignment is cleaned only after DB cancellation proof", async () => {
  const denied = new Error("FORBIDDEN");
  let reads = 0, inserted = false, cleanup = 0;
  let finishInsert!: () => void;
  const insertion = new Promise<void>(resolve => { finishInsert = resolve; });
  const result = loadAuthorizedGroupMeetings(dependencies({
    readMeetings: async () => { if (++reads === 1) return [row]; throw denied; },
    ensure: async () => { await insertion; inserted = true; return ready; },
    readCancelled: async ids => { assert.equal(inserted, true); assert.deepEqual(ids, [row.id]); return [row]; },
    cancel: async input => { assert.equal(inserted, true); assert.equal(input.id, row.id); cleanup++; return true; },
  }));
  // Concurrent schedule cleanup saw404 while INSERT was still in flight.
  finishInsert();
  await assert.rejects(result, error => error === denied);
  assert.equal(cleanup, 1);
});

test("losing membership never deletes a valid meeting of remaining participants", async () => {
  const denied = new Error("FORBIDDEN"); let reads = 0, cleanup = 0;
  await assert.rejects(loadAuthorizedGroupMeetings(dependencies({
    readMeetings: async () => { if (++reads === 1) return [row]; throw denied; },
    readCancelled: async () => [],
    cancel: async () => { cleanup++; return true; },
  })), error => error === denied);
  assert.equal(cleanup, 0);
});

test("cleanup cannot delete IDs outside the originally authorized snapshot", async () => {
  let reads = 0, cleanup = 0;
  await assert.rejects(loadAuthorizedGroupMeetings(dependencies({
    readMeetings: async () => { if (++reads === 1) return [row]; throw new Error("FORBIDDEN"); },
    readCancelled: async () => [{ id: "40000000-0000-4000-8000-000000000001", groupId: row.groupId }],
    cancel: async () => { cleanup++; return true; },
  })), /FORBIDDEN/);
  assert.equal(cleanup, 0);
});

test("cancellation discovered on the second authorized read returns no stale URL", async () => {
  let reads = 0, cleanup = 0;
  const result = await loadAuthorizedGroupMeetings(dependencies({
    readMeetings: async () => [{ ...row, status: ++reads === 1 ? "pending" : "cancelled" }],
    cancel: async () => { cleanup++; return true; },
  }));
  assert.equal(cleanup, 1);
  assert.equal(result[0].status, "cancelled");
  assert.equal(result[0].meetUrl, null);
});
