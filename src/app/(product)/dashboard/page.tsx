"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getCourses, getProgress } from "@/lib/api-client";
import type { Course, Progress } from "@/contracts";
import { CourseCatalog } from "@/features/learning/ui/course-catalog";
import { CourseEnrollment } from "@/features/groups/ui/course-enrollment";

const descriptions: Record<string, string> = {
  python: "Write a useful function, then run it against real examples.",
  "how-to-use-ai": "Make clearer requests and learn to check unsupported claims.",
  spanish: "Start a conversation and practise with another person.",
};

export default function Dashboard() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [state, setState] = useState<"loading" | "error" | "ready">("loading");
  const [progress, setProgress] = useState<Progress | null>(null);
  const [progressError, setProgressError] = useState(false);
  const loadCourses = useCallback(async () => {
    setState("loading");
    try { setCourses(await getCourses()); setState("ready"); } catch { setState("error"); }
  }, []);
  const loadProgress = useCallback(async () => {
    setProgressError(false);
    try { setProgress(await getProgress()); } catch { setProgressError(true); }
  }, []);
  useEffect(() => {
    let active = true;
    void getCourses().then(value => { if (active) { setCourses(value); setState("ready"); } }).catch(() => { if (active) setState("error"); });
    void getProgress().then(value => { if (active) setProgress(value); }).catch(() => { if (active) setProgressError(true); });
    return () => { active = false; };
  }, []);

  return <>
    <CourseCatalog state={state} onRetry={loadCourses} courses={courses.map(course => ({
      id: course.id, title: course.title, description: descriptions[course.id],
      categoryLabel: {programming:"Programming",languages:"Languages",ai:"AI"}[course.category],
      action: course.collaborationMode==="group" ? <CourseEnrollment courseId={course.id}/> : course.collaborationMode==="language-partner" ? <div className="ls-course-enrollment"><p className="ls-small ls-muted">One-to-one practice with an available Spanish-speaking partner. No course group required.</p><Link className="ls-button ls-button-small" href="/practice">Practise Spanish →</Link></div> : undefined,
      modules: course.modules.map(module => ({ id: module.id, title: module.title, href: `/learn/${encodeURIComponent(module.id)}` })),
    }))} />
    <section className="ls-panel" style={{marginTop:40}} aria-labelledby="progress-title">
      <h2 id="progress-title">Your saved practice</h2>
      <p className="ls-muted">Progress belongs to this browser profile. People sharing it share these results.</p>
      {progressError ? <div role="alert"><p>We could not load saved progress. Lessons are still available.</p><button className="ls-button ls-button-secondary" onClick={loadProgress}>Reload progress</button></div> : !progress ? <p role="status">Loading progress…</p> : <>
        {progress.quizAttempts.length === 0 && progress.pythonAttempts.length === 0 && <p>No saved attempts yet. Choose a lesson above to start.</p>}
        <ul className="ls-list">{progress.quizAttempts.slice(0, 8).map(attempt => <li key={attempt.id}>
          <Link className="ls-text-link" href={`/learn/${encodeURIComponent(attempt.moduleId)}`}>{courses.flatMap(c=>c.modules).find(m=>m.id===attempt.moduleId)?.title ?? attempt.moduleId}</Link>
          <span> · {attempt.items.filter(item=>item.correct).length}/{attempt.items.length} correct · {new Date(attempt.submittedAt).toLocaleDateString()}</span>
        </li>)}</ul>
        {progress.pythonAttempts.length > 0 && <p style={{marginTop:20}}>Python self-checks saved: {progress.pythonAttempts.length}. These are practice records, not verified qualifications.</p>}
        {progress.practice?.map(item => <p key={item.moduleId}>Recorded language practice: {Math.floor(item.seconds / 60)} minutes for <Link href={`/learn/${encodeURIComponent(item.moduleId)}`}>{item.moduleId}</Link>. Target: {item.minimumPracticeMinutes} minutes. This is time between your recorded actions, not verified attendance.</p>)}
      </>}
    </section>
  </>;
}
