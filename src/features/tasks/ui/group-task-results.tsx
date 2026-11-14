"use client";

import Link from "next/link";
import { useCallback } from "react";
import { api } from "@/lib/api-client";
import { useRemoteData } from "@/components/use-remote-data";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { useVisibleRefresh } from "@/features/groups/ui/group-shared";
import { ResultLink, taskStatusLabels } from "./task-shared";
import styles from "./task-board.module.css";

export function GroupTaskResults({groupId,courseId}:{groupId:string;courseId:string}) {
  const state = useRemoteData(useCallback(()=>api.getGroupTaskResults(groupId),[groupId]));
  useVisibleRefresh(state.reload);
  return <section className="ls-panel" aria-labelledby="group-task-results-heading">
    <div className="ls-card-top"><h2 id="group-task-results-heading">Shared task results</h2><button className="ls-button ls-button-secondary ls-button-small" disabled={state.loading} onClick={()=>void state.reload()}>Refresh results</button></div>
    <p className="ls-small ls-muted">Only work explicitly shared by current members appears here. Task status is self-reported, not a quiz grade or a qualification.</p>
    {state.error ? <ErrorState message={state.error} onRetry={()=>void state.reload()}/> : !state.data ? <LoadingState>Loading shared results…</LoadingState> : !state.data.length ? <EmptyState title="No shared results yet"><p>Your task board is private by default. You decide which result to share with this group.</p></EmptyState> : <ul className={styles.sharedList}>{state.data.map(({task,result})=><li key={`${task.id}:${result.userId}`} className={styles.sharedResult}>
      <div className="ls-card-top"><strong>{result.userName||"Guest learner"}</strong><span className={styles.visibility}>{taskStatusLabels[result.status]}</span></div>
      <h3>{task.title}</h3>{result.summary ? <p className={styles.sharedSummary}>{result.summary}</p> : <p className="ls-small ls-muted">No description added yet.</p>}
      <ResultLink value={result.link}/><Link className={styles.resultLink} href={`/learn/${encodeURIComponent(task.moduleId)}`}>Open related lesson →</Link>
      {result.updatedAt&&<time className={styles.date} dateTime={result.updatedAt}>Updated {new Date(result.updatedAt).toLocaleString()}</time>}
    </li>)}</ul>}
    <p style={{marginTop:20}}><Link className="ls-text-link" href={`/tasks?course=${encodeURIComponent(courseId)}`}>Open my task board →</Link></p>
  </section>;
}
