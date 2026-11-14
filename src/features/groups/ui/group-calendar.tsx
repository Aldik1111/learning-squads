"use client";

import Link from "next/link";
import { useCallback } from "react";
import { api } from "@/lib/api-client";
import { useRemoteData } from "@/components/use-remote-data";
import { EmptyState, ErrorState, LoadingState, PageHeading, errorMessage } from "@/components/states";
import { courseNames, MeetingCard, useVisibleRefresh } from "./group-shared";

export function GroupCalendar() {
  const state=useRemoteData(useCallback(async()=>{
    const [groups,schedule]=await Promise.all([api.getMyCourseGroups(),api.getStudyAvailability()]);
    const rows=await Promise.all(groups.map(async group=>{try{return {group,meetings:await api.getGroupMeetings(group.id),error:null};}catch(error){return {group,meetings:[],error:errorMessage(error)};}}));
    return {rows,timezone:schedule?.timezone??"UTC"};
  },[]));
  useVisibleRefresh(state.reload);
  return <><PageHeading eyebrow="Time to practise together" title="Your group calendar.">Meetings are prepared from the availability shared by everyone in each course group.</PageHeading><div className="ls-actions" style={{marginBottom:24}}><Link className="ls-text-link" href="/schedule">Edit weekly availability →</Link><Link className="ls-text-link" href="/calls">Language conversations →</Link><button className="ls-button ls-button-secondary ls-button-small" disabled={state.loading} onClick={()=>void state.reload()}>Refresh calendar</button></div>
    {state.error?<ErrorState message={state.error} onRetry={()=>void state.reload()}/>:!state.data?<LoadingState>Opening your calendar…</LoadingState>:!state.data.rows.length?<EmptyState title="Your calendar starts with a course group"><p>Set your availability and join a Python or AI course. Lessons are available while you wait for teammates.</p><Link className="ls-button" href="/dashboard">Choose a course</Link></EmptyState>:<><p className="ls-small ls-muted">Times shown in {state.data.timezone}.</p><div className="ls-grid">{state.data.rows.map(({group,meetings,error})=><section className="ls-panel" key={group.id}><p className="ls-eyebrow">{courseNames[group.courseId]}</p><h2>Group {group.number}</h2>{error?<ErrorState message={error} onRetry={()=>void state.reload()}/>:meetings.length?<div className="ls-list">{meetings.map(meeting=><MeetingCard key={meeting.id} meeting={meeting} timezone={state.data!.timezone}/>)}</div>:<p className="ls-muted">{group.status==="waiting"?"Waiting for another learner before preparing a meeting.":"No meeting is prepared yet. Refresh to check again."}</p>}<Link className="ls-text-link" href={`/teams/${group.id}`}>Open group chat →</Link></section>)}</div></>}
  </>;
}
