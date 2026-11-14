"use client";

import { useId, type ReactNode } from "react";
import styles from "./course-catalog.module.css";

export type CourseCardView = {
  id: string;
  title: string;
  description: string;
  categoryLabel?: string;
  action?: ReactNode;
  modules: readonly { id: string; title: string; href: string }[];
};

export type CourseCatalogProps = {
  state: "loading" | "error" | "ready";
  courses: readonly CourseCardView[];
  onRetry?: () => void;
};

export function CourseCatalog({ state, courses, onRetry }: CourseCatalogProps) {
  const id = useId();
  return (
    <section className={styles.catalog} aria-labelledby={`${id}-title`} aria-busy={state === "loading"}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>A little progress, together</p>
        <h1 id={`${id}-title`}>What will you learn today?</h1>
        <p>Start with a short lesson. Check what you know, then put it into practice with others.</p>
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
        <div className={styles.grid}>
          {courses.map((course, index) => (
            <article key={course.id} className={styles.card}>
              <span className={styles.index} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              {course.categoryLabel?<><h2 className={styles.category}>{course.categoryLabel}</h2><h3>{course.title}</h3></>:<h2>{course.title}</h2>}
              <p>{course.description}</p>
              {course.modules.length ? (
                <ul className={styles.modules}>
                  {course.modules.map((module) => <li key={module.id}><a href={module.href}>{module.title}<span aria-hidden="true"> ↗</span></a></li>)}
                </ul>
              ) : <p>Lessons are being prepared.</p>}
              {course.action}
            </article>
          ))}
        </div>
      ))}
      <p className={styles.note}>You can start learning on your own. A team or conversation partner is not required.</p>
    </section>
  );
}
