"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { api } from "@/lib/api-client";
import { ErrorState, LoadingState, PageHeading } from "@/components/states";
import { useRemoteData } from "@/components/use-remote-data";
import { useCommand } from "@/components/use-command";

export function PracticePage({ moduleId = "spanish-first-conversation" }: { moduleId?: string }) {
  const router = useRouter();
  const profile = useRemoteData(useCallback(()=>api.getProfile(),[]));
  const command = useCommand();
  return <>
    <PageHeading eyebrow="Put a voice to it" title="A conversation starts with hello.">Practise Spanish with someone who lists it as their primary language and is available now.</PageHeading>
    <div className="ls-two-columns">
      <section className="ls-panel"><p className="ls-eyebrow">Spanish conversation</p><h2>Find a practice partner</h2><p className="ls-muted">We will send an invitation to a randomly selected available person. They can choose to accept or decline.</p><p className="ls-muted">Aim for at least 15 minutes of practice per module. You can practise across multiple calls. There is no one-call-per-course limit.</p>
        <div className="ls-actions"><button className="ls-button" disabled={command.pending || profile.loading || Boolean(profile.error)} onClick={()=>void command.run(`partner:es:${moduleId}`,async requestId=>{const call=await api.requestLanguagePartner("es",requestId,moduleId);router.push(`/calls/${call.id}`);})}>{command.pending ? "Sending invitation…" : "Find a Spanish partner"}</button><Link className="ls-text-link" href={`/learn/${encodeURIComponent(moduleId)}`}>Read the lesson first</Link></div>
        {command.error && <ErrorState message={command.error}/>}<hr className="ls-divider"/><p className="ls-small ls-muted">Language preferences are self-reported, not proof of native-speaker or teaching qualifications. No one available? You can keep learning and try again later.</p>
      </section>
      <aside className="ls-panel"><p className="ls-eyebrow">Make yourself available</p><h2>Open to a conversation?</h2>
        {profile.loading ? <LoadingState>Loading your preferences…</LoadingState> : profile.error ? <ErrorState message={profile.error} onRetry={()=>void profile.reload()}/> : profile.data && <>
          <label className="ls-checkbox"><input type="checkbox" checked={profile.data.availableForCalls} disabled={command.pending} onChange={event=>{const available=event.target.checked;void command.run(`availability:${available}`,async()=>{const updated=await api.setCallAvailability(available);profile.setData(updated);if(available)await api.heartbeat();});}}/><span><strong>Accept conversation invitations</strong><br/><span className="ls-small ls-muted">{profile.data.availableForCalls ? "You are open to invitations while active here." : "Your profile is not offered to people looking for a partner."}</span></span></label>
          <p className="ls-small ls-muted" style={{marginTop:20}}>Invitations appear on this website and expire after 10 minutes. Availability becomes inactive after two minutes without activity.</p><Link className="ls-text-link" href="/profile">Edit your languages →</Link>
        </>}
      </aside>
    </div>
    <div style={{marginTop:24}}><Link className="ls-text-link" href="/calls">Return to your conversations →</Link></div>
  </>;
}
