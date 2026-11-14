"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, type FormEvent } from "react";
import type { AvailabilitySchedule, AvailabilityWindow, StudyAvailability, Track } from "@/contracts";
import { api } from "@/lib/api-client";
import { ErrorState, LoadingState, PageHeading } from "@/components/states";
import { useRemoteData } from "@/components/use-remote-data";
import { useCommand } from "@/components/use-command";
import { courseNames } from "./group-shared";

const days=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const toTime=(minutes:number)=>`${Math.floor(minutes/60)%24}`.padStart(2,"0")+":"+`${minutes%60}`.padStart(2,"0");
const toMinutes=(time:string)=>{const [hours,minutes]=time.split(":").map(Number);return hours*60+minutes;};

export function StudySchedule({courseId}:{courseId?:Track}) {
  const state=useRemoteData(useCallback(async()=>({schedule:await api.getStudyAvailability()}),[]));
  return <><PageHeading eyebrow="Make time to learn" title="When can you study together?">Save your weekly availability before joining a Python or AI course group. Language conversation partners use their own availability switch.</PageHeading>
    {state.loading&&!state.data?<LoadingState>Loading your schedule…</LoadingState>:state.error?<ErrorState message={state.error} onRetry={()=>void state.reload()}/>:state.data&&<ScheduleEditor initial={state.data.schedule} courseId={courseId}/>}
    <p style={{marginTop:24}}><Link className="ls-text-link" href="/dashboard">Keep learning without a group →</Link></p>
  </>;
}

function ScheduleEditor({initial,courseId}:{initial:StudyAvailability|null;courseId?:Track}) {
  const [timezone,setTimezone]=useState(initial?.timezone??Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [windows,setWindows]=useState<(AvailabilityWindow&{key:string})[]>(()=>initial?.windows.map((window,index)=>({...window,key:`saved-${index}`}))??[]);
  const [saved,setSaved]=useState(false);
  const [groups,setGroups]=useState<{id:string;label:string}[]>([]);
  const notice=useRef<HTMLDivElement>(null);
  const command=useCommand();
  const router=useRouter();
  const update=(index:number,patch:Partial<AvailabilityWindow>)=>{setSaved(false);setWindows(items=>items.map((item,i)=>i===index?{...item,...patch}:item));};
  function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const schedule:AvailabilitySchedule={timezone:timezone.trim(),windows:windows.map(({weekday,startMinute,endMinute})=>({weekday,startMinute,endMinute}))};
    void command.run(`schedule:${JSON.stringify(schedule)}:${courseId??""}`,async requestId=>{
      if(!schedule.windows.length)throw new Error("Add at least one weekly time window before saving.");
      try {new Intl.DateTimeFormat("en",{timeZone:schedule.timezone}).format();}catch{throw new Error("Enter a valid time zone, such as America/New_York.");}
      if(schedule.windows.some(window=>!Number.isFinite(window.startMinute)||!Number.isFinite(window.endMinute)||window.endMinute-window.startMinute<15))throw new Error("Each window needs at least 15 minutes, with its end after its start. Split overnight availability into two days.");
      for(let i=0;i<schedule.windows.length;i++)for(let j=i+1;j<schedule.windows.length;j++){const a=schedule.windows[i],b=schedule.windows[j];if(a.weekday===b.weekday&&a.startMinute<b.endMinute&&b.startMinute<a.endMinute)throw new Error("Time windows on the same day must not overlap. Combine them into one window.");}
      await api.updateStudyAvailability(schedule);
      if(courseId){const group=await api.enrollCourse(courseId,requestId);router.push(`/teams/${group.id}`);return;}
      const refreshed=await api.getMyCourseGroups();
      setGroups(refreshed.map(group=>({id:group.id,label:`${courseNames[group.courseId]} · Group ${group.number}`})));
      setSaved(true);
      requestAnimationFrame(()=>notice.current?.focus());
    });
  }
  return <div className="ls-two-columns"><section className="ls-panel"><form className="ls-form" onSubmit={submit}>
    <label className="ls-field">Time zone<input required value={timezone} disabled={command.pending} placeholder="America/New_York" onChange={event=>{setTimezone(event.target.value);setSaved(false);}}/></label>
    <button className="ls-button ls-button-secondary ls-button-small" type="button" disabled={command.pending} onClick={()=>{setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);setSaved(false);}}>Use this device’s time zone</button>
    <fieldset className="ls-schedule-fieldset" disabled={command.pending}><legend>Weekly time windows</legend><p className="ls-small ls-muted">Add every time you are usually free. Use 00:00 as the end for midnight; split other overnight windows across two days.</p>
      {!windows.length&&<p>No windows added yet.</p>}
      <div className="ls-list">{windows.map((window,index)=><div className="ls-schedule-row" key={window.key}>
        <label className="ls-field">Day {index+1}<select value={window.weekday} onChange={event=>update(index,{weekday:Number(event.target.value) as AvailabilityWindow["weekday"]})}>{days.map((day,i)=><option key={day} value={i}>{day}</option>)}</select></label>
        <label className="ls-field">Start {index+1}<input type="time" required value={toTime(window.startMinute)} onChange={event=>update(index,{startMinute:toMinutes(event.target.value)})}/></label>
        <label className="ls-field">End {index+1}<input type="time" required value={toTime(window.endMinute)} onChange={event=>update(index,{endMinute:toMinutes(event.target.value)||1440})}/></label>
        <button type="button" className="ls-button ls-button-secondary ls-button-small" aria-label={`Remove time window ${index+1}`} onClick={()=>{setWindows(items=>items.filter((_,i)=>i!==index));setSaved(false);}}>Remove</button>
      </div>)}</div>
      <button type="button" className="ls-button ls-button-secondary" style={{marginTop:16}} disabled={windows.length>=100} onClick={()=>{setWindows(items=>[...items,{key:crypto.randomUUID(),weekday:1,startMinute:18*60,endMinute:19*60}]);setSaved(false);}}>Add time window</button>
    </fieldset>
    {command.error&&<ErrorState message={command.error}/>}
    {saved&&<div ref={notice} tabIndex={-1} className="ls-success" role="status"><strong>Your weekly availability is saved.</strong><p>Check your current groups below; membership may have changed.</p>{groups.length?<ul>{groups.map(group=><li key={group.id}><Link className="ls-text-link" href={`/teams/${group.id}`}>{group.label}</Link></li>)}</ul>:<Link className="ls-text-link" href="/dashboard">Choose a course →</Link>}</div>}
    <button className="ls-button" disabled={command.pending}>{command.pending?"Saving…":courseId?`Save and find my ${courseNames[courseId]} group` :"Save weekly availability"}</button>
  </form></section><aside className="ls-panel"><h2>A time that works for everyone</h2><p>Each course group has up to four learners. You share a time window of at least 15 minutes with every member.</p><p>If no group fits, you get a new numbered group and can keep learning while waiting for others.</p><hr className="ls-divider"/><h2>Changing your schedule</h2><p className="ls-muted">Saving a change automatically moves you from incompatible groups. Your learning progress stays with you, but you lose access to previous group chats.</p><p className="ls-small ls-muted">You belong to one group per course and can study several courses.</p></aside></div>;
}
