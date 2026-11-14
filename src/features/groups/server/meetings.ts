import type { GroupMeeting } from "@/contracts";
import type { GoogleMeetingInput, GoogleMeetingResult } from "@/features/meet/server/google-meet-core";

type MeetingIdentity = Pick<GroupMeeting, "id" | "groupId">;
export type GroupMeetingDependencies = {
  readMeetings: () => Promise<GroupMeeting[]>;
  readCancelled: (ids: string[]) => Promise<MeetingIdentity[]>;
  ensure: (meeting: GoogleMeetingInput) => Promise<GoogleMeetingResult>;
  cancel: (meeting: MeetingIdentity) => Promise<boolean>;
  now?: () => number;
};

/** Both reads authorize current membership. Cleanup reads reveal only DB-cancelled
 * IDs from a period when this caller had access; they never authorize arbitrary deletion. */
export async function loadAuthorizedGroupMeetings(deps: GroupMeetingDependencies): Promise<GroupMeeting[]> {
  const rows = await deps.readMeetings();
  const enriched = await Promise.all(rows.map(async row => {
    if (row.status === "cancelled") { await deps.cancel(row); return row; }
    // History may have an existing Google room. Read it, but never create a past event.
    const external = await deps.ensure({ ...row, createIfMissing: Date.parse(row.endsAt) > (deps.now?.() ?? Date.now()) });
    return { ...row, status: external.status, meetUrl: external.meetUrl };
  }));
  let current: GroupMeeting[];
  try { current = await deps.readMeetings(); }
  catch (error) {
    // Reassignment can remove access while Google is inserting. A concurrent
    // cancellation may have seen404 before that insert completed. Reconcile only
    // rows the database now confirms cancelled, then preserve the original denial.
    try {
      const cancelled = await deps.readCancelled(rows.map(row => row.id));
      const original = new Set(rows.map(row => `${row.groupId}:${row.id}`));
      await Promise.all(cancelled.filter(row => original.has(`${row.groupId}:${row.id}`)).map(row => deps.cancel(row)));
    } catch { /* Do not replace the original authorization/service error. A later cleanup retries. */ }
    throw error;
  }
  return Promise.all(current.map(async row => {
    if (row.status === "cancelled") {
      if (enriched.find(old => old.id === row.id)?.status !== "cancelled") await deps.cancel(row);
      return row;
    }
    return enriched.find(old => old.id === row.id) ?? row;
  }));
}
