"use client";
import { useCallback, useEffect } from "react";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api-client";
import { useRemoteData } from "@/components/use-remote-data";
import { unreadInvitationCount } from "../unread";

export function InvitationBadge() {
  const pathname=usePathname();
  const state=useRemoteData(useCallback(()=>api.getNotifications(),[]));
  const {reload}=state;
  useEffect(()=>{
    const refresh=()=>{if(document.visibilityState==="visible")void reload(true);};
    const changed=()=>{void reload();};
    const interval=window.setInterval(refresh,10_000);
    document.addEventListener("visibilitychange",refresh);
    window.addEventListener("ls:notifications-changed",changed);
    return()=>{window.clearInterval(interval);document.removeEventListener("visibilitychange",refresh);window.removeEventListener("ls:notifications-changed",changed);};
  },[reload]);
  useEffect(()=>{void reload();},[pathname,reload]);
  const count=state.error?0:unreadInvitationCount(state.data??[]);
  return <span className="ls-invitation-indicator" role="status" aria-live="polite" aria-atomic="true">{count>0&&<><span className="ls-notification-badge" aria-hidden="true">{count>99?"99+":count}</span><span className="ls-sr-only">{count} unread {count===1?"invitation":"invitations"}</span></>}</span>;
}
