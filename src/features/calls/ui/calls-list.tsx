"use client";

import Link from "next/link";
import { useCallback } from "react";
import { api } from "@/lib/api-client";
import { EmptyState, ErrorState, LoadingState, PageHeading } from "@/components/states";
import { useRemoteData } from "@/components/use-remote-data";

export function CallsList() {
  const calls=useRemoteData(useCallback(()=>api.getMyCalls(),[]));
  return <><PageHeading eyebrow="Keep the conversation going" title="Your conversations.">Return to an invitation, meeting link, or practice interval.</PageHeading><div className="ls-actions" style={{marginBottom:24}}><Link className="ls-button" href="/practice">Find a partner</Link><button className="ls-button ls-button-secondary" disabled={calls.loading} onClick={()=>void calls.reload()}>Refresh</button></div>{calls.loading ? <LoadingState>Loading your conversations…</LoadingState> : calls.error ? <ErrorState message={calls.error} onRetry={()=>void calls.reload()}/> : calls.data?.length ? <ul className="ls-list">{calls.data.map(call=><li className="ls-panel" key={call.id}><div className="ls-card-top"><div><h2>{call.kind==="language"?"Spanish conversation":"Squad conversation"}</h2><p className="ls-small ls-muted">{new Date(call.createdAt).toLocaleString()} · {call.participants.length} participants</p></div><Link className="ls-button ls-button-secondary" href={`/calls/${call.id}`}>Open conversation</Link></div></li>)}</ul> : <EmptyState title="Your next conversation is ahead"><p>Find a partner or start a call with your squad. There is no fixed booking schedule.</p></EmptyState>}</>;
}
