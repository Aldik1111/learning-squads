"use client";

import Link from "next/link";
import { useCallback, useEffect } from "react";
import { api } from "@/lib/api-client";
import { EmptyState, ErrorState, LoadingState, PageHeading } from "@/components/states";
import { useRemoteData } from "@/components/use-remote-data";
import { useCommand } from "@/components/use-command";

export function NotificationsPage() {
  const load = useCallback(async()=>{const [items,session]=await Promise.all([api.getNotifications(),api.ensureGuestSession()]);return {items,userId:session.userId};},[]);
  const notifications = useRemoteData(load);
  const command = useCommand();
  const { reload } = notifications;
  useEffect(()=>{
    const refresh=()=>{if(document.visibilityState==="visible")void reload(true);};
    const interval=window.setInterval(refresh,20_000);
    document.addEventListener("visibilitychange",refresh);
    return()=>{window.clearInterval(interval);document.removeEventListener("visibilitychange",refresh);};
  },[reload]);
  return <>
    <PageHeading eyebrow="An invitation to practise" title="People make the difference.">Your invitations live here. This page refreshes while it is open; there are no email or push notifications.</PageHeading>
    <div className="ls-actions" style={{marginBottom:24}}><button className="ls-button ls-button-secondary ls-button-small" onClick={()=>void reload()} disabled={notifications.loading}>Refresh invitations</button><Link className="ls-text-link" href="/practice">Find a conversation partner →</Link></div>
    {command.error && <ErrorState message={command.error}/>}
    {notifications.error && <ErrorState message={notifications.error} onRetry={()=>void reload()}/>}
    {notifications.loading && !notifications.data ? <LoadingState>Checking your invitations…</LoadingState> : notifications.data?.items.length ? <ul className="ls-list">{notifications.data.items.map(notification=>{
      const invitation=notification.invitation;
      const incoming=invitation.recipientId===notifications.data?.userId;
      const actionable=invitation.status==="pending";
      return <li key={notification.id} className="ls-panel">
        <div className="ls-card-top"><div><p className="ls-eyebrow">{notification.readAt ? "Invitation" : "New invitation"}</p><h2>{incoming ? `${invitation.senderName || "A teammate"} invited you to practise` : "Your conversation invitation"}</h2></div><span className="ls-tag">{invitation.status}</span></div>
        <p className="ls-muted ls-small">Sent <time dateTime={invitation.createdAt}>{new Date(invitation.createdAt).toLocaleString()}</time>{actionable && <> · Expires <time dateTime={invitation.expiresAt}>{new Date(invitation.expiresAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</time></>}</p>
        <div className="ls-actions">
          {actionable && incoming && <><button className="ls-button ls-button-small" disabled={command.pending} onClick={()=>void command.run(`accept:${invitation.id}`,async()=>{await api.acceptInvitation(invitation.id);await reload(true);})}>Accept invitation</button><button className="ls-button ls-button-secondary ls-button-small" disabled={command.pending} onClick={()=>void command.run(`decline:${invitation.id}`,async()=>{await api.declineInvitation(invitation.id);await reload(true);})}>Decline</button></>}
          {actionable && !incoming && <button className="ls-button ls-button-secondary ls-button-small" disabled={command.pending} onClick={()=>void command.run(`cancel:${invitation.id}`,async()=>{await api.cancelInvitation(invitation.id);await reload(true);})}>Cancel invitation</button>}
          {(invitation.status==="accepted" || (!incoming && actionable)) && <Link className="ls-text-link" href={`/calls/${invitation.callId}`}>Open conversation →</Link>}
          {!notification.readAt && <button className="ls-button ls-button-secondary ls-button-small" disabled={command.pending} onClick={()=>void command.run(`read:${notification.id}`,async()=>{await api.markRead(notification.id);await reload(true);})}>Mark as read</button>}
        </div>
      </li>;
    })}</ul> : !notifications.error && <EmptyState title="A little quiet here"><p>No invitations yet. Open your availability to receive one, or find a partner yourself.</p></EmptyState>}
  </>;
}
