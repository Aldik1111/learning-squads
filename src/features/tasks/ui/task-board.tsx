"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import type { CourseGroup, TaskBoardItem, TaskResult, TaskResultInput, TaskStatus } from "@/contracts";
import { api, ApiError } from "@/lib/api-client";
import { useRemoteData } from "@/components/use-remote-data";
import { useCommand } from "@/components/use-command";
import { EmptyState, ErrorState, LoadingState, PageHeading } from "@/components/states";
import { ResultLink, safeResultLink, taskStatusLabels, taskStatuses } from "./task-shared";
import styles from "./task-board.module.css";

export function TaskBoard({ initialCourse, initialTask }: { initialCourse?: string; initialTask?: string }) {
  const state = useRemoteData(useCallback(async () => {
    const [items, courses, groups] = await Promise.all([api.getTaskBoard(), api.getCourses(), api.getMyCourseGroups()]);
    return {items, courses, groups};
  }, []));
  const [filter, setFilter] = useState(initialCourse ?? "all");
  const [editing, setEditing] = useState<string | null>(initialTask ?? null);
  if (!state.data) return <><PageHeading eyebrow="Make it your own" title="Your task board.">Turn each lesson into something you can show. Results are private unless you choose to share.</PageHeading>{state.error ? <ErrorState message={state.error} onRetry={() => void state.reload()}/> : <LoadingState>Opening your task board…</LoadingState>}</>;
  const {items, courses, groups} = state.data;
  const selectedCourse = courses.some(course=>course.id===filter) ? filter : "all";
  const visibleItems = items.filter(item=>selectedCourse==="all"||item.task.courseId===selectedCourse);
  const editingItem = items.find(item=>item.task.id===editing);
  const editingGroup = groups.find(group=>group.courseId===editingItem?.task.courseId);
  const courseTitle = (id:string) => courses.find(course=>course.id===id)?.title ?? id;
  const saveResult = (result:TaskResult) => {
    state.setData({...state.data!,items:items.map(item=>item.task.id===result.taskId ? {...item,result} : item)});
    setEditing(null);
  };
  async function reloadEditingTask() {
    const refreshed = await api.getTaskBoard();
    const refreshedGroups = await api.getMyCourseGroups();
    state.setData({...state.data!,items:refreshed,groups:refreshedGroups});
  }
  return <>
    <PageHeading eyebrow="Make it your own" title="Your task board.">Turn lessons into small, practical results. Choose a status, describe your work, and save it to your guest profile.</PageHeading>
    <div className={styles.toolbar}>
      <label className="ls-field">Course<select value={selectedCourse} onChange={event=>setFilter(event.target.value)}><option value="all">All courses</option>{courses.map(course=><option key={course.id} value={course.id}>{course.title}</option>)}</select></label>
      <button className="ls-button ls-button-secondary ls-button-small" disabled={state.loading || Boolean(editingItem)} onClick={()=>void state.reload()}>Refresh board</button>
      <Link className="ls-text-link" href="/dashboard">Browse lessons →</Link>
    </div>
    <div className={styles.privacyNote}><strong>Private by default.</strong> Share a result only with your current Python or AI course group. Spanish and French tasks stay private. Changing groups removes sharing; your own work stays saved.</div>
    {state.error && <ErrorState message={state.error} onRetry={()=>void state.reload()}/>}
    {!items.length ? <EmptyState title="No tasks available yet"><p>You can still explore the lessons. Refresh the board to check again.</p></EmptyState> : <div className={styles.columns}>
      {taskStatuses.map(status=>{
        const columnItems = visibleItems.filter(item=>item.result.status===status);
        return <section className={styles.column} key={status} aria-labelledby={`tasks-${status}`}>
          <div className={styles.columnHeading}><h2 id={`tasks-${status}`}><span className={styles.statusDot} data-status={status}/>{taskStatusLabels[status]}</h2><span className={styles.count}>{columnItems.length}</span></div>
          {columnItems.length ? columnItems.map(item=><article className={styles.card} key={item.task.id}>
            <p className={styles.courseLabel}>{courseTitle(item.task.courseId)}</p>
            <h3>{item.task.title}</h3><p className={styles.description}>{item.task.description}</p>
            {item.result.summary && <p className={styles.summary}>{item.result.summary}</p>}
            <div className={styles.visibility}>{item.result.sharedGroupId ? "Shared with your course group" : "Only you"}</div>
            {item.result.updatedAt && <time className={styles.date} dateTime={item.result.updatedAt}>Saved {new Date(item.result.updatedAt).toLocaleDateString()}</time>}
            <ResultLink value={item.result.link}/>
            <div className={styles.cardActions}><button className="ls-button ls-button-small" onClick={()=>setEditing(item.task.id)}>Edit task</button><Link href={`/learn/${encodeURIComponent(item.task.moduleId)}`}>Read lesson →</Link></div>
          </article>) : <p className={styles.emptyColumn}>No tasks here yet.</p>}
        </section>;
      })}
    </div>}
    <p className={styles.finePrint}>“Done” is your own task status. It does not change quiz scores, certify a skill, or complete a course automatically.</p>
    {editingItem && <TaskEditor key={`${editingItem.task.id}:${editingItem.task.version}:${editingItem.result.revision}:${editingGroup?.id??"private"}`} item={editingItem} courseTitle={courseTitle(editingItem.task.courseId)} group={editingGroup} groupEligible={courses.find(course=>course.id===editingItem.task.courseId)?.collaborationMode==="group"} onClose={()=>setEditing(null)} onSaved={saveResult} onReload={reloadEditingTask}/>}
  </>;
}

function TaskEditor({item,courseTitle,group,groupEligible,onClose,onSaved,onReload}:{item:TaskBoardItem;courseTitle:string;group?:CourseGroup;groupEligible:boolean;onClose:()=>void;onSaved:(result:TaskResult)=>void;onReload:()=>Promise<void>}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [status,setStatus] = useState<TaskStatus>(item.result.status);
  const [summary,setSummary] = useState(item.result.summary);
  const [link,setLink] = useState(item.result.link ?? "");
  const [share,setShare] = useState(Boolean(group && item.result.sharedGroupId===group.id));
  const [validation,setValidation] = useState<string | null>(null);
  const [conflict,setConflict] = useState(false);
  const command = useCommand();
  useEffect(()=>{dialog.current?.showModal();},[]);
  function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(conflict)return;
    if(status==="done"&&!summary.trim()){setValidation("Describe what you made before marking the task Done.");return;}
    if(link.trim()&&!safeResultLink(link.trim())){setValidation("Use a full HTTPS link without a username or password. Leave it blank if you do not have a link.");return;}
    setValidation(null);
    const sharing = Boolean(share&&groupEligible&&group);
    const input:TaskResultInput = {status,summary:summary.trim(),link:link.trim()||null,shareWithGroup:sharing,shareGroupId:sharing ? group!.id : null,expectedRevision:item.result.revision};
    void command.run(JSON.stringify([item.task.id,item.task.version,input]),async requestId=>{
      try {onSaved(await api.updateTaskResult(item.task.id,item.task.version,input,requestId));}
      catch(error){if(error instanceof ApiError && error.code==="CONFLICT")setConflict(true);throw error;}
    });
  }
  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="task-edit-title" aria-describedby="task-edit-description" onClose={onClose} onCancel={event=>{if(command.pending)event.preventDefault();}}>
    <div className={styles.dialogHeader}><p className={styles.courseLabel}>{courseTitle}</p><button type="button" className={styles.closeButton} disabled={command.pending} onClick={onClose} aria-label="Close task editor">×</button></div>
    <h2 id="task-edit-title">{item.task.title}</h2><p id="task-edit-description" className={styles.description}>{item.task.description}</p>
    <div className={styles.criteria}><h3>What to include</h3><ul>{item.task.acceptanceCriteria.map(criterion=><li key={criterion}>{criterion}</li>)}</ul></div>
    <form className="ls-form" onSubmit={submit}>
      <fieldset className={styles.editFields} disabled={command.pending}>
        <label className="ls-field">Task status<select value={status} onChange={event=>setStatus(event.target.value as TaskStatus)}>{taskStatuses.map(value=><option key={value} value={value}>{taskStatusLabels[value]}</option>)}</select></label>
        <label className="ls-field">Your result<textarea rows={5} maxLength={4000} required={status==="done"} value={summary} onChange={event=>setSummary(event.target.value)} placeholder="Describe what you made, tried, or learned. Required for Done."/><span className="ls-small ls-muted">{summary.length} / 4000 characters</span></label>
        <label className="ls-field">Result link (optional)<input type="url" maxLength={2048} value={link} onChange={event=>setLink(event.target.value)} placeholder="https://…"/><span className="ls-small ls-muted">HTTPS only. Links open separately; this site does not fetch or preview them.</span></label>
        {groupEligible && group ? <label className="ls-checkbox"><input type="checkbox" checked={share} onChange={event=>setShare(event.target.checked)}/><span>Share this result with my current {courseTitle} group (Group {group.number})<small className={styles.shareHelp}>Current teammates will see your name, status, description and optional link. Uncheck to make it private.</small></span></label> : <p className={styles.privacyNote}>{groupEligible ? <>This result stays private. <Link href={`/schedule?course=${encodeURIComponent(item.task.courseId)}`}>Join a course group</Link> before choosing to share.</> : "Language task results stay private. A conversation invitation does not share your task board."}</p>}
      </fieldset>
      {validation&&<ErrorState message={validation}/>}{command.error&&<ErrorState message={command.error}/>}
      {conflict&&<div className={styles.conflict} role="alert"><strong>This task or your course group changed.</strong><p>Your draft is still here. Copy any changes you want to keep, then load the current task and group before editing again.</p><button type="button" className="ls-button ls-button-secondary ls-button-small" disabled={command.pending} onClick={()=>void command.run("reload-latest",onReload)}>Load latest and discard this draft</button></div>}
      <div className={styles.editorActions}><button type="button" className="ls-button ls-button-secondary" disabled={command.pending} onClick={onClose}>Cancel</button><button className="ls-button" disabled={command.pending||conflict}>{command.pending?"Saving…":"Save task"}</button></div>
    </form>
  </dialog>;
}
