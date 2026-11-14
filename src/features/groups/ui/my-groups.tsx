"use client";

import Link from "next/link";
import { useCallback } from "react";
import { api } from "@/lib/api-client";
import { useRemoteData } from "@/components/use-remote-data";
import { EmptyState, ErrorState, LoadingState, PageHeading } from "@/components/states";
import { courseLessons, courseNames, formatWindow, useVisibleRefresh } from "./group-shared";

export function MyGroups() {
  const state=useRemoteData(useCallback(async()=>{const [groups,schedule]=await Promise.all([api.getMyCourseGroups(),api.getStudyAvailability()]);return {groups,timezone:schedule?.timezone??"UTC"};},[]));
  useVisibleRefresh(state.reload);
  return <><PageHeading eyebrow="Your learning circles" title="A shared course. A time in common.">Groups are assigned automatically from your course and weekly availability. You see only your own groups.</PageHeading>
    <div className="ls-actions" style={{marginBottom:24}}><Link className="ls-button" href="/dashboard">Choose a course</Link><Link className="ls-text-link" href="/schedule">Edit weekly availability →</Link><button className="ls-button ls-button-secondary ls-button-small" disabled={state.loading} onClick={()=>void state.reload()}>Refresh groups</button></div>
    {state.error?<ErrorState message={state.error} onRetry={()=>void state.reload()}/>:state.loading&&!state.data?<LoadingState>Loading your groups…</LoadingState>:state.data&&!state.data.groups.length?<EmptyState title="Your first group starts with a course"><p>Set your weekly availability, then choose a Python or AI course to be matched. Spanish and French have one-to-one conversation practice.</p><Link className="ls-text-link" href="/schedule">Set my availability →</Link></EmptyState>:<div className="ls-grid">{state.data?.groups.map(group=><article className="ls-panel" key={group.id}><p className="ls-eyebrow">{courseNames[group.courseId]}</p><h2>Group {group.number}</h2><div className="ls-tags"><span className="ls-tag">{group.members.length} / 4 members</span><span className="ls-tag">{group.status==="waiting"?"Waiting for teammates":"Ready to study together"}</span></div><p className="ls-muted">{group.members.map(member=>member.name||"Guest learner").join(", ")}</p>{group.commonWindows[0]&&<p className="ls-small">Next shared window: {formatWindow(group.commonWindows[0].startsAt,group.commonWindows[0].endsAt,state.data!.timezone)} ({state.data!.timezone})</p>}<div className="ls-actions"><Link className="ls-button ls-button-small" href={`/teams/${group.id}`}>Open group →</Link><Link className="ls-text-link" href={`/learn/${courseLessons[group.courseId]}`}>Read the lesson</Link></div></article>)}</div>}
  </>;
}
