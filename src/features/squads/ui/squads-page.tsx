"use client";

import { useCallback, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import type { Level, Track } from "@/contracts";
import { EmptyState, ErrorState, LoadingState, PageHeading } from "@/components/states";
import { useRemoteData } from "@/components/use-remote-data";
import { useCommand } from "@/components/use-command";

const trackLabels: Record<Track,string> = { python:"Python", "how-to-use-ai":"How to use AI", spanish:"Spanish" };

export function SquadsPage() {
  const [track, setTrack] = useState<Track | "">("");
  const [level, setLevel] = useState<Level | "">("");
  const load = useCallback(async () => {const [items,session]=await Promise.all([api.findSquads({ ...(track ? { track } : {}), ...(level ? { level } : {}) }),api.ensureGuestSession()]);return {items,userId:session.userId};}, [track,level]);
  const squads = useRemoteData(load);
  const [name, setName] = useState("");
  const [newTrack, setNewTrack] = useState<Track>("python");
  const [newLevel, setNewLevel] = useState<Level>("beginner");
  const [notice, setNotice] = useState("");
  const [selectedMembers,setSelectedMembers]=useState<Record<string,string[]>>({});
  const command = useCommand();
  const router = useRouter();
  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = { name:name.trim(),track:newTrack,level:newLevel };
    void command.run(`create:${JSON.stringify(input)}`,async requestId => {
      const created = await api.createSquad(input,requestId);
      setNotice(`${created.name} is ready. You are its first member.`);
      setName("");
      await squads.reload();
    });
  }
  return <>
    <PageHeading eyebrow="Find your people" title="A small squad. A shared direction.">Learn in a squad of up to four people working on a similar skill. You can belong to more than one squad.</PageHeading>
    <div className="ls-two-columns">
      <section aria-label="Find squads">
        <div className="ls-form-grid" style={{marginBottom:24}}>
          <label className="ls-field">Learning direction<select value={track} onChange={event=>setTrack(event.target.value as Track | "")}><option value="">All directions</option>{Object.entries(trackLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
          <label className="ls-field">Level<select value={level} onChange={event=>setLevel(event.target.value as Level | "")}><option value="">All levels</option><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></label>
        </div>
        {notice && <p className="ls-success" role="status">{notice}</p>}
        {command.error && <ErrorState message={command.error}/>}
        {squads.loading ? <LoadingState>Finding squads…</LoadingState> : squads.error ? <ErrorState message={squads.error} onRetry={()=>void squads.reload()}/> : squads.data?.items.length ? <ul className="ls-list">{squads.data.items.map(squad=>{
          const members=squad.members ?? [];
          const eligible=members.filter(member=>member.userId!==squads.data?.userId);
          const selected=(selectedMembers[squad.id] ?? eligible.map(member=>member.userId)).filter(id=>eligible.some(member=>member.userId===id));
          return <li className="ls-panel" key={squad.id}>
          <div className="ls-card-top"><h2>{squad.name}</h2>{squad.isMember && <span className="ls-tag">Your squad</span>}</div>
          <div className="ls-tags"><span className="ls-tag">{trackLabels[squad.track]}</span><span className="ls-tag">{squad.level}</span><span className="ls-tag">{squad.memberCount} / 4 members</span></div>
          {squad.isMember && <fieldset style={{border:0,padding:0,margin:"0 0 20px"}} disabled={command.pending}><legend style={{fontSize:".85rem",fontWeight:700,marginBottom:12}}>Members · choose who to invite</legend><div className="ls-form" style={{gap:10}}>{members.map(member=>member.userId===squads.data?.userId ? <p className="ls-small ls-muted" style={{margin:0}} key={member.userId}>{member.name || "Guest learner"} (you)</p> : <label className="ls-checkbox" key={member.userId}><input type="checkbox" checked={selected.includes(member.userId)} onChange={event=>setSelectedMembers(current=>({...current,[squad.id]:event.target.checked?[...selected,member.userId]:selected.filter(id=>id!==member.userId)}))}/><span>{member.name || "Guest learner"}</span></label>)}</div></fieldset>}
          <div className="ls-actions">{squad.isMember ? <>
            <button className="ls-button ls-button-small" disabled={command.pending || selected.length===0} onClick={()=>void command.run(`call:${squad.id}:${[...selected].sort().join(",")}`,async requestId=>{const call=await api.createSquadCall(squad.id,requestId,squad.track==="spanish"?"spanish-first-conversation":undefined,selected);router.push(`/calls/${call.id}`);})}>Start a squad call</button>
            <button className="ls-button ls-button-secondary ls-button-small" disabled={command.pending} onClick={()=>void command.run(`leave:${squad.id}`,async()=>{await api.leaveSquad(squad.id);setNotice(`You left ${squad.name}. Your learning progress is kept.`);await squads.reload();})}>Leave squad</button>
          </> : <button className="ls-button ls-button-small" disabled={command.pending || squad.memberCount >= 4} onClick={()=>void command.run(`join:${squad.id}`,async()=>{await api.joinSquad(squad.id);setNotice(`You joined ${squad.name}.`);await squads.reload();})}>{squad.memberCount >= 4 ? "Squad is full" : "Join squad"}</button>}</div>
          {squad.isMember && squad.memberCount < 2 && <p className="ls-small ls-muted" style={{margin:"14px 0 0"}}>A squad call needs at least two members. A teammate can find this squad here by its direction and level.</p>}
        </li>;})}</ul> : <EmptyState title="Room for a new squad"><p>No squads match these filters yet. Try another direction or create one.</p></EmptyState>}
      </section>
      <aside className="ls-panel"><p className="ls-eyebrow">Start a shared chapter</p><h2>Create a squad</h2><form className="ls-form" onSubmit={create}>
        <label className="ls-field">Squad name<input required maxLength={80} value={name} onChange={event=>setName(event.target.value)} disabled={command.pending} placeholder="For example, After-work Python"/></label>
        <label className="ls-field">Direction<select value={newTrack} onChange={event=>setNewTrack(event.target.value as Track)} disabled={command.pending}>{Object.entries(trackLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
        <label className="ls-field">Level<select value={newLevel} onChange={event=>setNewLevel(event.target.value as Level)} disabled={command.pending}><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></label>
        <button className="ls-button" disabled={command.pending} type="submit">{command.pending ? "Working…" : "Create squad"}</button>
      </form><p className="ls-small ls-muted" style={{margin:"20px 0 0"}}>Learn on your own or together. Joining a squad does not lock you into a schedule.</p></aside>
    </div>
  </>;
}
