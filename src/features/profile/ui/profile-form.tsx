"use client";

import Link from "next/link";
import { useCallback, useState, type FormEvent } from "react";
import { api } from "@/lib/api-client";
import type { Profile, ProfileInput } from "@/contracts";
import { ErrorState, LoadingState } from "@/components/states";
import { useRemoteData } from "@/components/use-remote-data";
import { useCommand } from "@/components/use-command";

const languages = [{code:"en",name:"English"},{code:"es",name:"Spanish"},{code:"ru",name:"Russian"},{code:"kk",name:"Kazakh"},{code:"fr",name:"French"},{code:"de",name:"German"},{code:"pt",name:"Portuguese"},{code:"it",name:"Italian"},{code:"zh",name:"Chinese"},{code:"ja",name:"Japanese"},{code:"ar",name:"Arabic"},{code:"hi",name:"Hindi"}];

export function ProfileForm({ starting = false }: { starting?: boolean }) {
  const load = useCallback(() => api.getProfile(), []);
  const profile = useRemoteData(load);
  if (profile.loading) return <LoadingState>Opening your browser profile…</LoadingState>;
  if (profile.error) return <><ErrorState message={profile.error} onRetry={() => void profile.reload()} /><Link className="ls-text-link" href="/dashboard">You can still explore the lessons</Link></>;
  if (!profile.data) return <ErrorState message="Your profile is not available yet." onRetry={() => void profile.reload()} />;
  return <ProfileEditor profile={profile.data} starting={starting} />;
}

function ProfileEditor({ profile, starting }: { profile: Profile; starting: boolean }) {
  const [values, setValues] = useState<ProfileInput>(() => ({ name:profile.name,track:profile.track,level:profile.level,primaryLanguage:profile.primaryLanguage,knownLanguages:profile.knownLanguages,timezone:profile.timezone,availableForCalls:profile.availableForCalls }));
  const [additionalLanguages, setAdditionalLanguages] = useState(profile.knownLanguages.filter(code => !languages.some(language => language.code === code)).join(", "));
  const [saved, setSaved] = useState(false);
  const command = useCommand();
  const change = <K extends keyof ProfileInput>(key: K, value: ProfileInput[K]) => { setSaved(false); setValues(current => ({ ...current, [key]:value })); };
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const knownLanguages = [...new Set([...values.knownLanguages.filter(code => languages.some(language=>language.code===code)), ...additionalLanguages.split(",").map(code=>code.trim().toLowerCase()).filter(Boolean)])];
    const payload = { ...values, name: values.name.trim(), primaryLanguage: values.primaryLanguage.trim().toLowerCase(), knownLanguages, timezone:values.timezone.trim() };
    void command.run(JSON.stringify(payload), async () => { await api.updateProfile(payload); setSaved(true); });
  }
  return <><section className="ls-panel ls-profile-overview"><span className="ls-profile-avatar" aria-hidden="true">{values.name.trim().slice(0,2).toUpperCase() || "G"}</span><div><h2>{values.name.trim() || "Guest learner"}</h2><p className="ls-muted ls-small">Your learning profile belongs to this browser.</p><div className="ls-tags"><span className="ls-tag">Guest profile</span><span className="ls-tag">{values.level}</span></div></div></section><div className="ls-two-columns">
    <section className="ls-panel"><h2>Profile settings</h2><form className="ls-form" onSubmit={submit}>
      <label className="ls-field">What should we call you?<input name="name" required maxLength={80} autoComplete="nickname" value={values.name} onChange={event=>change("name",event.target.value)} disabled={command.pending}/></label>
      <div className="ls-form-grid">
        <label className="ls-field">Your learning direction<select value={values.track} onChange={event=>change("track",event.target.value as ProfileInput["track"])} disabled={command.pending}><option value="python">Python</option><option value="how-to-use-ai">How to use AI</option><option value="spanish">Spanish</option></select></label>
        <label className="ls-field">Your level<select value={values.level} onChange={event=>change("level",event.target.value as ProfileInput["level"])} disabled={command.pending}><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></label>
      </div>
      <fieldset className="ls-form" style={{border:0,padding:0,margin:0}} disabled={command.pending}><legend style={{fontWeight:700,marginBottom:16}}>Your languages</legend>
        <label className="ls-field">Primary language<input list="language-options" required maxLength={3} pattern="[A-Za-z]{2,3}" title="Use a two- or three-letter language code, such as es for Spanish." value={values.primaryLanguage} onChange={event=>change("primaryLanguage",event.target.value)} placeholder="For example: es"/><datalist id="language-options">{languages.map(language=><option value={language.code} key={language.code}>{language.name}</option>)}</datalist><small>Choose a language code, such as es for Spanish. This is your own description, not a verified qualification.</small></label>
        <div><p className="ls-small"><strong>Other languages you know</strong></p><div className="ls-form-grid">{languages.map(language=><label className="ls-checkbox" key={language.code}><input type="checkbox" checked={values.knownLanguages.includes(language.code)} onChange={event=>change("knownLanguages",event.target.checked?[...values.knownLanguages,language.code]:values.knownLanguages.filter(code=>code!==language.code))}/><span>{language.name}</span></label>)}</div></div>
        <label className="ls-field">Additional languages (optional)<input value={additionalLanguages} onChange={event=>{setAdditionalLanguages(event.target.value);setSaved(false);}} placeholder="For example: ko, tr"/><small>Separate language codes with commas.</small></label>
      </fieldset>
      <div><label className="ls-field">Time zone<input required value={values.timezone} onChange={event=>change("timezone",event.target.value)} placeholder="America/New_York" disabled={command.pending}/><small>Your saved time zone. Use a name such as America/New_York.</small></label><button className="ls-button ls-button-secondary ls-button-small" type="button" style={{marginTop:10}} disabled={command.pending} onClick={()=>change("timezone",Intl.DateTimeFormat().resolvedOptions().timeZone)}>Use this device’s time zone</button></div>
      <label className="ls-checkbox"><input type="checkbox" checked={values.availableForCalls} onChange={event=>change("availableForCalls",event.target.checked)} disabled={command.pending}/><span><strong>I am open to conversation invitations</strong><br/><span className="ls-muted ls-small">Invitations appear here on the website. You can switch this off at any time.</span></span></label>
      {command.error && <p className="ls-error" role="alert">{command.error}</p>}
      {saved && <div className="ls-success" role="status">Your profile is saved.{starting && <p style={{margin:"8px 0 0"}}><Link className="ls-text-link" href="/dashboard">Choose your first lesson →</Link></p>}</div>}
      <div><button className="ls-button" disabled={command.pending} type="submit">{command.pending ? "Saving…" : "Save profile"}</button></div>
    </form></section>
    <aside className="ls-panel"><p className="ls-eyebrow">Yours, in this browser</p><h2>A simple start</h2><p className="ls-muted">No email or password needed. Your learning is saved to a guest profile in this browser.</p><p className="ls-muted">Anyone using this browser profile shares its progress and invitations. A different browser starts a different profile.</p><p className="ls-muted">Clearing browser data can remove access to this profile. Account recovery is not available yet.</p><hr className="ls-divider"/><Link className="ls-text-link" href="/dashboard">Explore lessons now →</Link></aside>
  </div></>;
}
