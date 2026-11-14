"use client";

import Link from "next/link";
import { useCallback, useRef, useState, type FormEvent } from "react";
import { api } from "@/lib/api-client";
import { useRemoteData } from "@/components/use-remote-data";
import { useCommand } from "@/components/use-command";
import { EmptyState, ErrorState, LoadingState, PageHeading } from "@/components/states";
import { courseLessons, courseNames, formatWindow, MeetingCard, useVisibleRefresh } from "./group-shared";
import { GroupTaskResults } from "@/features/tasks/ui/group-task-results";

export function GroupDetail({groupId}:{groupId:string}) {
  const state=useRemoteData(useCallback(async()=>{
    const [group,schedule,session,courses]=await Promise.all([api.getCourseGroup(groupId),api.getStudyAvailability(),api.ensureGuestSession(),api.getCourses()]);
    return {group,timezone:schedule?.timezone??"UTC",userId:session.userId,modules:courses.find(course=>course.id===group.courseId)?.modules??[]};
  },[groupId]));
  useVisibleRefresh(state.reload);
  if(state.error)return <><ErrorState message={state.error} onRetry={()=>void state.reload()}/><p className="ls-muted">Your group may have changed after an availability update. Previous group chats are no longer accessible.</p><Link className="ls-button" href="/teams">Open my current groups</Link></>;
  if(!state.data)return <LoadingState>Opening your course group…</LoadingState>;
  const {group,timezone,userId,modules}=state.data;
  return <>
    <Link className="ls-text-link" href="/teams">← My groups</Link>
    <div style={{marginTop:24}}><PageHeading eyebrow={courseNames[group.courseId]} title={`Group ${group.number}`}>A private course group with up to four learners who share at least 15 minutes of weekly availability.</PageHeading></div>
    <div className="ls-actions" style={{marginBottom:24}}><Link className="ls-button" href={`/learn/${courseLessons[group.courseId]}`}>Continue the lesson →</Link><Link className="ls-text-link" href="/schedule">Edit my availability</Link><span className="ls-tag">{group.members.length} / 4 members</span></div>
    {group.status==="waiting"&&<div className="ls-state" role="status"><h2>Waiting for another learner</h2><p>Your group is ready for someone with a compatible schedule. Materials and checks are available now; you do not need to wait.</p></div>}
    <div className="ls-two-columns"><div><GroupChat key={groupId} groupId={groupId} userId={userId} timezone={timezone}/><GroupTaskResults key={`tasks:${groupId}`} groupId={groupId} courseId={group.courseId}/><MemberProgress groupId={groupId} moduleNames={Object.fromEntries(modules.map(module=>[module.id,module.title]))}/></div>
      <aside><section className="ls-panel"><h2>Your teammates</h2><ul className="ls-list">{group.members.map(member=><li key={member.userId}>{member.name||"Guest learner"}{member.userId===userId?" (you)":""}</li>)}</ul><hr className="ls-divider"/><h2>Shared availability</h2><p className="ls-small ls-muted">Times shown in {timezone}. These windows work for every current member.</p>{group.commonWindows.length?<ul className="ls-list">{group.commonWindows.slice(0,5).map(window=><li className="ls-small" key={window.startsAt}><time dateTime={window.startsAt}>{formatWindow(window.startsAt,window.endsAt,timezone)}</time></li>)}</ul>:<p className="ls-muted">No shared window is available to display yet.</p>}</section>
      <GroupMeetings groupId={groupId} timezone={timezone} waiting={group.status==="waiting"}/></aside>
    </div>
  </>;
}

function GroupChat({groupId,userId,timezone}:{groupId:string;userId:string;timezone:string}) {
  const state=useRemoteData(useCallback(()=>api.getGroupMessages(groupId),[groupId]));
  useVisibleRefresh(state.reload);
  const [body,setBody]=useState("");
  const command=useCommand();
  const list=useRef<HTMLDivElement>(null);
  const input=useRef<HTMLTextAreaElement>(null);
  function send(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message=body.trim();
    if(!message)return;
    void command.run(`message:${groupId}:${message}`,async requestId=>{
      const saved=await api.sendGroupMessage(groupId,message,requestId);
      state.setData([...(state.data??[]).filter(item=>item.id!==saved.id),saved].sort((a,b)=>a.createdAt.localeCompare(b.createdAt)));
      setBody("");
      requestAnimationFrame(()=>{if(list.current)list.current.scrollTop=list.current.scrollHeight;input.current?.focus();});
    });
  }
  return <section className="ls-panel" aria-labelledby="group-chat-heading"><div className="ls-card-top"><h2 id="group-chat-heading">Group chat</h2><button className="ls-button ls-button-secondary ls-button-small" disabled={state.loading} onClick={()=>void state.reload()}>Refresh chat</button></div><p className="ls-small ls-muted">Only current members of this group can read or send messages. Updates appear while this page is open.</p>
    {state.error?<ErrorState message={state.error} onRetry={()=>void state.reload()}/>:!state.data?<LoadingState>Loading messages…</LoadingState>:<div className="ls-chat-log" ref={list} role="log" aria-label="Group messages" aria-live="polite" tabIndex={0}>{!state.data.length?<p className="ls-muted">Say hello or share what you are practising.</p>:state.data.map(message=><article className={`ls-chat-message${message.authorId===userId?" ls-chat-own":""}`} key={message.id}><div className="ls-card-top"><strong>{message.authorName||"Guest learner"}{message.authorId===userId?" (you)":""}</strong><time className="ls-small ls-muted" dateTime={message.createdAt}>{new Intl.DateTimeFormat("en",{timeZone:timezone,month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(message.createdAt))}</time></div><p>{message.body}</p></article>)}</div>}
    <form className="ls-form" style={{marginTop:20}} onSubmit={send}><label className="ls-field">Message your group<textarea ref={input} rows={3} maxLength={2000} value={body} disabled={command.pending||Boolean(state.error)} onChange={event=>setBody(event.target.value)} placeholder="What are you working on today?"/></label>{command.error&&<ErrorState message={command.error}/>}<div><button className="ls-button" disabled={command.pending||Boolean(state.error)||!body.trim()}>{command.pending?"Sending…":"Send message"}</button></div></form>
  </section>;
}

function MemberProgress({groupId,moduleNames}:{groupId:string;moduleNames:Record<string,string>}) {
  const state=useRemoteData(useCallback(()=>api.getGroupProgress(groupId),[groupId]));
  useVisibleRefresh(state.reload);
  return <section className="ls-panel"><h2>Learning together</h2><p className="ls-small ls-muted">Practice records from current teammates. Scores are feedback, not a ranking or a qualification.</p>{state.error?<ErrorState message={state.error} onRetry={()=>void state.reload()}/>:!state.data?<LoadingState>Loading shared progress…</LoadingState>:<ul className="ls-list">{state.data.map(member=><li className="ls-member-progress" key={member.userId}><h3>{member.name||"Guest learner"}</h3>{member.modules.length?member.modules.map(module=><div key={module.moduleId}><Link className="ls-text-link" href={`/learn/${encodeURIComponent(module.moduleId)}`}>{moduleNames[module.moduleId]??module.moduleId}</Link><p className="ls-small ls-muted">{module.quizAttemptCount===0?"No quiz attempts yet":`${module.quizAttemptCount} quiz attempt${module.quizAttemptCount===1?"":"s"}`}{module.latestQuizScore!==null&&module.latestQuizTotal!==null?` · Latest: ${module.latestQuizScore}/${module.latestQuizTotal}`:""}{module.pythonPassed!==null&&module.pythonTotal!==null?` · Python self-check: ${module.pythonPassed}/${module.pythonTotal}`:""}</p></div>):<p className="ls-small ls-muted">No practice records yet.</p>}</li>)}</ul>}</section>;
}

function GroupMeetings({groupId,timezone,waiting}:{groupId:string;timezone:string;waiting:boolean}) {
  const state=useRemoteData(useCallback(()=>api.getGroupMeetings(groupId),[groupId]));
  useVisibleRefresh(state.reload);
  return <section className="ls-panel"><div className="ls-card-top"><h2>Group meetings</h2><button className="ls-button ls-button-secondary ls-button-small" disabled={state.loading} onClick={()=>void state.reload()}>Refresh meetings</button></div><p className="ls-small ls-muted">A meeting is prepared automatically for a shared time when at least two members are in the group. No one needs to paste a link.</p>{state.error?<ErrorState message={state.error} onRetry={()=>void state.reload()}/>:!state.data?<LoadingState>Checking the calendar…</LoadingState>:state.data.length?<div className="ls-list">{state.data.map(meeting=><MeetingCard key={meeting.id} meeting={meeting} timezone={timezone}/>)}</div>:<EmptyState title={waiting?"Waiting for a teammate":"No meeting prepared yet"}><p>{waiting?"You can continue the lesson while your group fills.":"Refresh to check for a meeting at your next shared time."}</p></EmptyState>}<p className="ls-small ls-muted" style={{marginTop:20}}>Google Meet opens separately and may have its own access requirements.</p><Link className="ls-text-link" href="/calendar">View all group meetings →</Link></section>;
}
