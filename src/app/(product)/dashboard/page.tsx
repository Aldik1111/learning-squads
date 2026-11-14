"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getCourses, getProgress } from "@/lib/api-client";
import type { Course, Progress } from "@/contracts";
import { CourseCatalog } from "@/features/learning/ui/course-catalog";
import { CourseEnrollment } from "@/features/groups/ui/course-enrollment";
import styles from "@/features/learning/ui/dashboard.module.css";

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
    <CourseCatalog state={state} onRetry={loadCourses} summary={progress && !progressError ? <dl className={styles.stats} aria-label="Your saved activity">
      <div><dt>Quiz attempts</dt><dd>{progress.quizAttempts.length}</dd></div>
      <div><dt>Python runs</dt><dd>{progress.pythonAttempts.length}</dd></div>
      <div><dt>Recorded min</dt><dd>{Math.floor(progress.practice.reduce((total,item)=>total+item.seconds,0)/60)}</dd></div>
    </dl> : undefined} courses={courses.map(course => {
      const latest = progress?.quizAttempts.find(attempt => course.modules.some(module => module.id === attempt.moduleId && module.contentVersion === attempt.contentVersion));
      return {
      id: course.id, title: course.title, description: course.description ?? "Learn with practical lessons and checks.",
      progress: latest ? { correct: latest.items.filter(item=>item.correct).length, total: latest.items.length } : undefined,
      categoryLabel: {programming:"Programming",languages:"Languages",ai:"AI"}[course.category],
      action: <><Link className="ls-text-link" href={`/tasks?course=${encodeURIComponent(course.id)}`}>Open task board →</Link>{course.collaborationMode==="group" ? <CourseEnrollment courseId={course.id}/> : course.collaborationMode==="language-partner" ? <div className="ls-course-enrollment"><p className="ls-small ls-muted">One-to-one practice with an available {course.title}-speaking partner. No course group required.</p><Link className="ls-button ls-button-small" href={`/practice?module=${encodeURIComponent(course.modules[0]?.id ?? "")}`}>Practise {course.title} →</Link></div> : null}</>,
      modules: course.modules.map(module => ({ id: module.id, title: module.title, href: `/learn/${encodeURIComponent(module.id)}` })),
    };})} />
    <section className={styles.practice} aria-labelledby="progress-title">
      <div className={styles.practiceHeader}><div>
      <h2 id="progress-title">Your saved practice</h2>
      <p>Progress belongs to this browser profile. People sharing it share these results.</p>
      </div><Link href="/teams">Open my course groups →</Link></div>
      {progressError ? <div role="alert"><p>We could not load saved progress. Lessons are still available.</p><button className="ls-button ls-button-secondary" onClick={loadProgress}>Reload progress</button></div> : !progress ? <p role="status">Loading progress…</p> : <>
        {progress.quizAttempts.length === 0 && progress.pythonAttempts.length === 0 && <p className={styles.empty}>No saved attempts yet. Choose a lesson above to start.</p>}
        <ul className={styles.history}>{progress.quizAttempts.slice(0, 8).map(attempt => <li key={attempt.id}>
          <div><Link href={`/learn/${encodeURIComponent(attempt.moduleId)}`}>{courses.flatMap(c=>c.modules).find(m=>m.id===attempt.moduleId)?.title ?? attempt.moduleId}</Link><time dateTime={attempt.submittedAt}>{new Date(attempt.submittedAt).toLocaleDateString()}</time></div>
          <span className={styles.score}>{attempt.items.filter(item=>item.correct).length}/{attempt.items.length} correct</span>
        </li>)}</ul>
        {progress.pythonAttempts.length > 0 && <p className={styles.record}>Python self-checks saved: {progress.pythonAttempts.length}. These are practice records, not verified qualifications.</p>}
        {progress.practice?.map(item => <p className={styles.record} key={item.moduleId}>Recorded language practice: {Math.floor(item.seconds / 60)} minutes for <Link href={`/learn/${encodeURIComponent(item.moduleId)}`}>{courses.flatMap(course=>course.modules).find(module=>module.id===item.moduleId)?.title ?? item.moduleId}</Link>. Target: {item.minimumPracticeMinutes} minutes. This is time between your recorded actions, not verified attendance.</p>)}
      </>}
    </section>
  </>;
}
