import test from "node:test";
import assert from "node:assert/strict";
import type { Notification } from "../../src/contracts";
import { unreadInvitationCount } from "../../src/features/notifications/unread";
import { languages, languageName, otherLanguages } from "../../src/features/profile/languages";

const now = Date.parse("2026-11-15T10:00:00Z");
function notification(status: Notification["invitation"]["status"] = "pending", expiresAt = "2026-11-15T10:01:00Z", readAt: string | null = null): Notification {
  return {id:"invitation",readAt,invitation:{id:"invitation",callId:"call",senderId:"sender",recipientId:"recipient",senderName:"Guest",status,createdAt:"2026-11-15T09:51:00Z",expiresAt}};
}

test("badge counts only unread active invitations, excluding every terminal state and deadline", () => {
  const items = [notification(),notification(),notification("pending",undefined,"2026-11-15T09:59:00Z"),
    ...(["accepted","declined","cancelled","expired"] as const).map(status=>notification(status)),
    notification("pending","2026-11-15T10:00:00Z"),notification("pending","2026-11-15T09:59:59Z"),notification("pending","invalid")];
  const before=JSON.stringify(items);
  assert.equal(unreadInvitationCount(items,now),2);
  assert.equal(unreadInvitationCount(items,now+60_000),0);
  assert.equal(JSON.stringify(items),before);
});

test("badge clears after read or response and preserves the actual count above display cap", () => {
  const item=notification();
  assert.equal(unreadInvitationCount([item],now),1);
  assert.equal(unreadInvitationCount([{...item,readAt:new Date(now).toISOString()}],now),0);
  assert.equal(unreadInvitationCount([{...item,invitation:{...item.invitation,status:"accepted"}}],now),0);
  assert.equal(unreadInvitationCount(Array.from({length:105},()=>notification()),now),105);
  assert.equal(unreadInvitationCount([],now),0);
});

test("language selections exclude the primary, deduplicate and retain unsupported saved codes", () => {
  const codes=Object.freeze(["en","es","es","fr","qaa-saved"]);
  assert.deepEqual(otherLanguages(codes,"en"),["es","fr","qaa-saved"]);
  assert.deepEqual(otherLanguages(codes,"fr"),["en","es","qaa-saved"]);
  assert.deepEqual(codes,["en","es","es","fr","qaa-saved"]);
  assert.deepEqual(otherLanguages([],"es"),[]);
  assert.equal(languageName("es"),"Spanish");
  assert.equal(languageName("fr"),"French");
  assert.equal(languageName("qaa-saved"),"Saved language (qaa-saved)");
  assert.equal(new Set(languages.map(language=>language.code)).size,languages.length);
});
