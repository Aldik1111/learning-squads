"use client";

import { useId, useState, type ReactNode } from "react";
import Link from "next/link";
import styles from "./course-catalog.module.css";

export type CourseCardView = {
  id: string;
  title: string;
  description: string;
  categoryLabel?: string;
  progress?: { correct: number; total: number };
  action?: ReactNode;
  modules: readonly { id: string; title: string; href: string }[];
};

export type CourseCatalogProps = {
  state: "loading" | "error" | "ready";
  courses: readonly CourseCardView[];
  onRetry?: () => void;
  summary?: ReactNode;
};

function CourseIcon({ category }: { category?: string }) {
  return <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {category === "Programming" ? <><rect x="3" y="4" width="18" height="16" rx="3"/><path d="m7 9 3 3-3 3m6 0h4"/></> : category === "Languages" ? <><path d="M20 11a8 8 0 0 1-8 8H5l-3 3v-11a9 9 0 0 1 18 0Z"/><path d="M7 9h8m-8 4h5"/></> : <><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z"/></>}
  </svg>;
}

export function CourseCatalog({ state, courses, onRetry, summary }: CourseCatalogProps) {
  const id = useId();
  const [filter, setFilter] = useState("all");
  const categories = [...new Set(courses.map(course => course.categoryLabel).filter((label): label is string => Boolean(label)))];
  const visibleCourses = courses.filter(course => filter === "all" || course.categoryLabel === filter);
  return (
    <section className={styles.catalog} aria-labelledby={`${id}-title`} aria-busy={state === "loading"}>
      <header className={styles.header}>
        <div>
        <p className={styles.eyebrow}>A little progress, together</p>
        <h1 id={`${id}-title`}>What will you learn today?</h1>
        <p>Start with a short lesson. Check what you know, then put it into practice with others.</p>
        </div>
        {summary && <div className={styles.summary}>{summary}</div>}
      </header>
      {state === "loading" && <p role="status" className={styles.notice}>Loading your learning paths…</p>}
      {state === "error" && (
        <div className={styles.notice}>
          <p role="alert">We could not load the courses. Please try again.</p>
          {onRetry && <button type="button" onClick={onRetry}>Try again</button>}
        </div>
      )}
      {state === "ready" && (courses.length === 0 ? (
        <p className={styles.notice}>No courses are available yet. Check back soon.</p>
      ) : (
        <>
        {categories.length > 1 && <div className={styles.filters} role="group" aria-label="Filter learning paths">
          <button type="button" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>All courses</button>
          {categories.map(category => <button key={category} type="button" aria-pressed={filter === category} onClick={() => setFilter(category)}>{category}</button>)}
        </div>}
        <div className={styles.grid}>
          {visibleCourses.map(course => (
            <article key={course.id} className={styles.card}>
              <div className={styles.cardTop}>
                <span className={`${styles.icon} ${course.categoryLabel === "Languages" ? styles.languageIcon : course.categoryLabel === "AI" ? styles.aiIcon : ""}`}><CourseIcon category={course.categoryLabel}/></span>
                {course.categoryLabel && <span className={styles.category}>{course.categoryLabel}</span>}
              </div>
              <h2>{course.title}</h2>
              <p>{course.description}</p>
              <div className={styles.cardMeta}>
                <span>{course.modules.length} {course.modules.length === 1 ? "starter lesson" : "lessons"}</span>
                {course.progress && <span className={styles.savedScore}>Latest check: {course.progress.correct}/{course.progress.total}</span>}
              </div>
              {course.modules.length ? (
                <ul className={styles.modules}>
                  {course.modules.map(module => <li key={module.id}><Link href={module.href}><span>{module.title}<small>Open lesson</small></span><span aria-hidden="true">→</span></Link></li>)}
                </ul>
              ) : <p>Lessons are being prepared.</p>}
              {course.action && <div className={styles.collaboration}>{course.action}</div>}
            </article>
          ))}
        </div>
        {visibleCourses.length === 0 && <p className={styles.notice}>No courses in this category. Choose another learning path.</p>}
        </>
      ))}
      <p className={styles.note}>You can start learning on your own. A team or conversation partner is not required.</p>
    </section>
  );
}
