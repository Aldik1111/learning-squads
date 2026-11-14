import type { Notification } from "@/contracts";
export function unreadInvitationCount(items:readonly Notification[],now=Date.now()) {
  return items.filter(item=>!item.readAt&&item.invitation.status==="pending"&&Date.parse(item.invitation.expiresAt)>now).length;
}
