"use client";

import { useEffect } from "react";
import type { GroupMeeting, Track } from "@/contracts";

export const courseNames: Record<Track,string> = { python:"Python", "how-to-use-ai":"How to use AI", spanish:"Spanish", "python-automation":"Python Automation", "ai-for-work":"AI for Work", french:"French" };
export const courseLessons: Record<Track,string> = { python:"python-first-function", "how-to-use-ai":"ai-clear-requests", spanish:"spanish-first-conversation", "python-automation":"python-clean-labels", "ai-for-work":"ai-work-email", french:"french-first-conversation" };

export function useVisibleRefresh(reload: (silent?:boolean)=>Promise<void>) {
  useEffect(()=>{
    const refresh=()=>{if(document.visibilityState==="visible")void reload(true);};
    const interval=window.setInterval(refresh,10_000);
    document.addEventListener("visibilitychange",refresh);
    return()=>{window.clearInterval(interval);document.removeEventListener("visibilitychange",refresh);};
  },[reload]);
}

export function formatWindow(startsAt:string,endsAt:string,timezone:string) {
  const start=new Intl.DateTimeFormat("en",{timeZone:timezone,weekday:"short",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(startsAt));
  const end=new Intl.DateTimeFormat("en",{timeZone:timezone,hour:"2-digit",minute:"2-digit"}).format(new Date(endsAt));
  return `${start} – ${end}`;
}

export function MeetingCard({meeting,timezone}:{meeting:GroupMeeting;timezone:string}) {
  let url:string|null=null;
  try {const parsed=new URL(meeting.meetUrl ?? "");if(parsed.protocol==="https:"&&parsed.hostname==="meet.google.com"&&!parsed.username&&!parsed.password)url=parsed.href;}catch{}
  return <article className="ls-meeting-card">
    <p><strong><time dateTime={meeting.startsAt}>{formatWindow(meeting.startsAt,meeting.endsAt,timezone)}</time></strong></p>
    {meeting.status==="ready"&&url ? <><a className="ls-button ls-button-small" href={url} target="_blank" rel="noopener noreferrer">Open Google Meet ↗</a><p className="ls-small ls-muted">Use a signed-in Google account to join. Guest access here does not sign you into Google.</p></> : <p className="ls-small ls-muted">{meeting.status==="cancelled"?"This meeting was cancelled.":meeting.status==="unavailable"?"The meeting service could not prepare a link. Your lessons and chat are still available.":"Preparing the meeting link. This page refreshes automatically."}</p>}
  </article>;
}
