"use client";

import Link from "next/link";
import { useCallback, useState, type FormEvent } from "react";
import { api } from "@/lib/api-client";
import type { Profile, ProfileInput } from "@/contracts";
import { ErrorState, LoadingState } from "@/components/states";
import { useRemoteData } from "@/components/use-remote-data";
import { useCommand } from "@/components/use-command";

import { languages, languageName, otherLanguages } from "../languages";

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
  const [addingLanguage, setAddingLanguage] = useState(false);
  const [languageToAdd, setLanguageToAdd] = useState("");
  const [saved, setSaved] = useState(false);
  const command = useCommand();
  const change = <K extends keyof ProfileInput>(key: K, value: ProfileInput[K]) => { setSaved(false); setValues(current => ({ ...current, [key]:value })); };
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const knownLanguages = otherLanguages(values.knownLanguages, values.primaryLanguage);
    const payload = { ...values, name: values.name.trim(), primaryLanguage: values.primaryLanguage.trim().toLowerCase(), knownLanguages, timezone:values.timezone.trim() };
    void command.run(JSON.stringify(payload), async () => { await api.updateProfile(payload); setSaved(true); });
  }
  const selectedLanguages = otherLanguages(values.knownLanguages, values.primaryLanguage);
  const availableLanguages = languages.filter(language=>language.code!==values.primaryLanguage&&!selectedLanguages.includes(language.code));
  const selectedIsSupported = languages.some(language=>language.code===values.primaryLanguage);
  return <><section className="ls-panel ls-profile-overview"><span className="ls-profile-avatar" aria-hidden="true">{values.name.trim().slice(0,2).toUpperCase() || "G"}</span><div><h2>{values.name.trim() || "Guest learner"}</h2><p className="ls-muted ls-small">Your learning profile belongs to this browser.</p><div className="ls-tags"><span className="ls-tag">Guest profile</span><span className="ls-tag">{values.level}</span></div></div></section><div className="ls-two-columns">
    <section className="ls-panel"><h2>Profile settings</h2><form className="ls-form" onSubmit={submit}>
      <label className="ls-field">What should we call you?<input name="name" required maxLength={80} autoComplete="nickname" value={values.name} onChange={event=>change("name",event.target.value)} disabled={command.pending}/></label>
      <div className="ls-form-grid">
        <label className="ls-field">Your learning direction<select value={values.track} onChange={event=>change("track",event.target.value as ProfileInput["track"])} disabled={command.pending}><option value="python">Python</option><option value="how-to-use-ai">How to use AI</option><option value="spanish">Spanish</option><option value="python-automation">Python Automation</option><option value="ai-for-work">AI for Work</option><option value="french">French</option></select></label>
        <label className="ls-field">Your level<select value={values.level} onChange={event=>change("level",event.target.value as ProfileInput["level"])} disabled={command.pending}><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></label>
      </div>
      <fieldset className="ls-form" style={{border:0,padding:0,margin:0}} disabled={command.pending}><legend style={{fontWeight:700,marginBottom:16}}>Your languages</legend>
        <label className="ls-field">Primary language<select required value={selectedIsSupported?values.primaryLanguage:""} onChange={event=>{change("primaryLanguage",event.target.value);setLanguageToAdd("");}}>
          {!selectedIsSupported&&<option value="" disabled>Choose a language (previously {values.primaryLanguage})</option>}
          {languages.map(language=><option key={language.code} value={language.code}>{language.name}</option>)}
        </select><small>Your main language. Language skills are self-reported.</small></label>
        <div className="ls-known-languages"><h3>Other languages you know</h3>
          {selectedLanguages.length ? <ul className="ls-language-list">{selectedLanguages.map(code=><li key={code}><span>{languageName(code)}</span><button className="ls-button ls-button-secondary ls-button-small" type="button" aria-label={`Remove ${languageName(code)}`} onClick={()=>change("knownLanguages",values.knownLanguages.filter(value=>value!==code))}>Remove</button></li>)}</ul> : <p className="ls-muted ls-small">No other languages added yet.</p>}
          {addingLanguage ? <div className="ls-language-add">
            <label className="ls-field">Language to add<select value={languageToAdd} onChange={event=>setLanguageToAdd(event.target.value)}><option value="">Choose a language</option>{availableLanguages.map(language=><option key={language.code} value={language.code}>{language.name}</option>)}</select></label>
            <div className="ls-actions"><button className="ls-button ls-button-small" type="button" disabled={!availableLanguages.some(language=>language.code===languageToAdd)} onClick={()=>{change("knownLanguages",[...selectedLanguages,languageToAdd]);setLanguageToAdd("");setAddingLanguage(false);}}>Add selected language</button><button className="ls-button ls-button-secondary ls-button-small" type="button" onClick={()=>{setAddingLanguage(false);setLanguageToAdd("");}}>Cancel</button></div>
          </div> : <button className="ls-button ls-button-secondary ls-button-small" type="button" disabled={!availableLanguages.length} onClick={()=>setAddingLanguage(true)}>+ Add language</button>}
          <p className="ls-small ls-muted">When invitations are enabled, you can receive requests in your primary language or any language added here. Save your profile to apply changes.</p>
        </div>
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
