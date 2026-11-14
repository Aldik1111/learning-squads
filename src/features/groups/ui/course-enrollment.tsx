"use client";

import Link from "next/link";
import { useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Track } from "@/contracts";
import { api, ApiError } from "@/lib/api-client";
import { useRemoteData } from "@/components/use-remote-data";
import { useCommand } from "@/components/use-command";
import { ErrorState } from "@/components/states";

export function CourseEnrollment({courseId}:{courseId:Track}) {
  const state=useRemoteData(useCallback(async()=>{const [groups,schedule]=await Promise.all([api.getMyCourseGroups(),api.getStudyAvailability()]);return {group:groups.find(group=>group.courseId===courseId),configured:Boolean(schedule?.windows.length)};},[courseId]));
  const command=useCommand();
  const router=useRouter();
  const scheduleUrl=`/schedule?course=${encodeURIComponent(courseId)}`;
  function enroll() {
    void command.run(`enroll:${courseId}`,async requestId=>{
      try {const group=await api.enrollCourse(courseId,requestId);router.push(`/teams/${group.id}`);}
      catch(error){if(error instanceof ApiError&&error.code==="AVAILABILITY_REQUIRED"){router.push(scheduleUrl);return;}throw error;}
    });
  }
  return <div className="ls-course-enrollment">
    <p className="ls-small ls-muted">Learn with up to four people whose weekly times overlap.</p>
    {state.error?<><ErrorState message={state.error} onRetry={()=>void state.reload()}/><Link className="ls-text-link" href={scheduleUrl}>Set weekly availability →</Link></>:state.loading?<p className="ls-small" role="status">Checking your group…</p>:state.data?.group?<Link className="ls-button ls-button-small" href={`/teams/${state.data.group.id}`}>Open Group {state.data.group.number} →</Link>:state.data?.configured?<button className="ls-button ls-button-small" disabled={command.pending} onClick={enroll}>{command.pending?"Finding your group…":"Join course group"}</button>:<Link className="ls-button ls-button-small" href={scheduleUrl}>Set availability & join →</Link>}
    {command.error&&<ErrorState message={command.error}/>}
  </div>;
}
