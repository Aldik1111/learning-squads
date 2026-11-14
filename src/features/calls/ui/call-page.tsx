"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { Call } from "@/contracts";
import { api } from "@/lib/api-client";
import { ErrorState, LoadingState, PageHeading } from "@/components/states";
import { useRemoteData } from "@/components/use-remote-data";
import { useCommand } from "@/components/use-command";

function safeMeetUrl(value: string | null) {
  if (!value) return null;
  try { const url=new URL(value);return url.protocol==="https:" && url.hostname==="meet.google.com" && !url.username && !url.password ? url.href : null; } catch {return null;}
}

function PracticeTimer({ start, end }: { start: string | null; end: string | null }) {
  const [now,setNow]=useState(()=>Date.now());
  useEffect(()=>{const interval=window.setInterval(()=>setNow(Date.now()),1000);return()=>window.clearInterval(interval);},[]);
  const seconds=start ? Math.max(0,Math.floor(((end ? Date.parse(end) : now)-Date.parse(start))/1000)) : 0;
  const elapsed=`${Math.floor(seconds/60).toString().padStart(2,"0")}:${(seconds%60).toString().padStart(2,"0")}`;
  return <><p className="ls-eyebrow">Time since opening Meet</p><div className="ls-timer" aria-label={`${Math.floor(seconds/60)} minutes ${seconds%60} seconds`}>{elapsed}</div><p className="ls-small ls-muted">{!start ? "The timer starts when you open the Meet link." : end ? "This practice interval has been recorded." : "The start time is saved. Refreshing this page does not restart it."}</p><p className="ls-small ls-muted">This measures time from your link click, not verified attendance or time speaking.</p></>;
}

export function CallPage({ callId }: { callId: string }) {
  const load=useCallback(async()=>{const [call,session]=await Promise.all([api.getCall(callId),api.ensureGuestSession()]);return {call,userId:session.userId};},[callId]);
  const state=useRemoteData(load);
  const {reload}=state;
  const command=useCommand();
  useEffect(()=>{const refresh=()=>{if(document.visibilityState==="visible")void reload(true);};const interval=window.setInterval(refresh,10_000);document.addEventListener("visibilitychange",refresh);return()=>{window.clearInterval(interval);document.removeEventListener("visibilitychange",refresh);};},[reload]);
  if (state.loading && !state.data) return <LoadingState>Opening your conversation…</LoadingState>;
  if (!state.data) return <><ErrorState message={state.error ?? "This conversation is not available."} onRetry={()=>void reload()}/><p className="ls-small ls-muted">If you were invited, accept the invitation before opening the conversation.</p><div className="ls-actions"><Link className="ls-text-link" href="/notifications">Check your invitations →</Link><Link className="ls-text-link" href="/calls">Back to your conversations</Link></div></>;
  const {call,userId}=state.data;
  const organizer=call.createdBy===userId;
  const me=call.participants.find(participant=>participant.userId===userId);
  const canJoin=organizer || me?.status==="accepted";
  const meetUrl=safeMeetUrl(call.meetUrl);
  const update=(updated:Call)=>state.setData({call:updated,userId});
  function openMeet() {
    if (!meetUrl || !canJoin || command.pending) return;
    void command.run(`transition:${callId}`,async()=>{
      // Open before awaiting, but after the synchronous duplicate-command guard.
      const newTab=window.open("about:blank","_blank");
      if (newTab) newTab.opener=null;
      try {
        const updated=await api.recordMeetTransition(callId);
        const destination=safeMeetUrl(updated.meetUrl);
        if (!destination) throw new Error("A valid Meet link is not available yet.");
        update(updated);
        if (newTab) newTab.location.replace(destination); else window.location.assign(destination);
      } catch (error) {newTab?.close();throw error;}
    });
  }
  return <>
    <PageHeading eyebrow={call.kind==="language"?"Spanish practice":"Squad conversation"} title="Ready when you are.">Accept the invitation, open Meet, and start a conversation. The organizer supplies the meeting link.</PageHeading>
    <div className="ls-actions" style={{marginBottom:24}}><Link className="ls-text-link" href="/calls">← Your conversations</Link><button className="ls-button ls-button-secondary ls-button-small" disabled={state.loading} onClick={()=>void reload()}>Refresh</button></div>
    {state.error && <ErrorState message={state.error}/>}{command.error && <ErrorState message={command.error}/>}
    <div className="ls-two-columns"><div>
      <section className="ls-panel"><h2>Your meeting space</h2>
        {me?.status==="pending" && me.invitationId && <div style={{marginBottom:24}}><p>You have been invited. Joining is your choice.</p><div className="ls-actions"><button className="ls-button" disabled={command.pending} onClick={()=>void command.run(`accept:${me.invitationId}`,async()=>{await api.acceptInvitation(me.invitationId!);await reload(true);})}>Accept invitation</button><button className="ls-button ls-button-secondary" disabled={command.pending} onClick={()=>void command.run(`decline:${me.invitationId}`,async()=>{await api.declineInvitation(me.invitationId!);await reload(true);})}>Decline</button></div></div>}
        {meetUrl ? <><p className="ls-small ls-muted">Google Meet opens in a new tab. Its own access requirements may apply.</p><button className="ls-button" disabled={!canJoin || command.pending} onClick={openMeet}>{command.pending ? "Opening…" : "Open Google Meet ↗"}</button>{!canJoin && <p className="ls-small ls-muted" style={{marginTop:12}}>Accept an active invitation before opening the meeting.</p>}</> : <p className="ls-muted">{organizer ? "Create a meeting in Google Meet, then paste its link below." : "Waiting for the organizer to add a Meet link. This page refreshes automatically."}</p>}
        {organizer && <><hr className="ls-divider"/><MeetLinkForm key={call.meetUrl ?? "empty"} call={call} onSaved={update}/></>}
      </section>
      <section className="ls-panel"><h2>People in this conversation</h2><ul className="ls-list">{call.participants.map(participant=><li key={participant.userId} className="ls-card-top"><div><strong>{participant.name || "Guest learner"}{participant.userId===userId ? " (you)" : ""}</strong><div className="ls-small ls-muted">{participant.status}</div></div>{organizer && participant.status==="pending" && participant.invitationId && <button className="ls-button ls-button-secondary ls-button-small" disabled={command.pending} onClick={()=>void command.run(`cancel:${participant.invitationId}`,async()=>{await api.cancelInvitation(participant.invitationId!);await reload(true);})}>Cancel invitation</button>}</li>)}</ul><p className="ls-small ls-muted" style={{margin:"20px 0 0"}}>Each person answers independently. Pending invitations expire after 10 minutes.</p></section>
    </div><aside className="ls-panel"><PracticeTimer start={call.myTransitionedAt} end={call.myPracticeEndedAt}/>
      {call.moduleId && call.myTransitionedAt && !call.myPracticeEndedAt && <button className="ls-button ls-button-secondary" disabled={command.pending} onClick={()=>void command.run(`finish:${callId}`,async()=>{const updated=await api.finishPractice(callId);update(updated);})}>Finish this practice</button>}
      {call.moduleId && <><hr className="ls-divider"/><p className="ls-small ls-muted">Finished intervals contribute to this module’s practice total. The goal is at least 15 minutes across calls; the timer is not proof of attendance.</p><Link className="ls-text-link" href={`/learn/${encodeURIComponent(call.moduleId)}`}>Back to your module →</Link></>}
    </aside></div>
  </>;
}

function MeetLinkForm({call,onSaved}:{call:Call;onSaved:(call:Call)=>void}) {
  const [url,setUrl]=useState(call.meetUrl ?? "");
  const command=useCommand();
  function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void command.run(`link:${url.trim()}`,async()=>{if(!safeMeetUrl(url.trim()))throw new Error("Use a secure Google Meet link beginning with https://meet.google.com/.");onSaved(await api.setMeetLink(call.id,url.trim()));});
  }
  return <form className="ls-form" onSubmit={submit}><label className="ls-field">Meet link<input required type="url" placeholder="https://meet.google.com/abc-defg-hij" value={url} onChange={event=>setUrl(event.target.value)} disabled={command.pending}/></label>{command.error && <p className="ls-error" role="alert">{command.error}</p>}<div><button className="ls-button ls-button-secondary" disabled={command.pending}>{command.pending?"Saving…":"Save Meet link"}</button></div></form>;
}
