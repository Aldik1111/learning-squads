import type { TaskStatus } from "@/contracts";
import styles from "./task-board.module.css";

export const taskStatuses: readonly TaskStatus[] = ["not_started", "in_progress", "done"];
export const taskStatusLabels: Record<TaskStatus, string> = {not_started:"Not started",in_progress:"In progress",done:"Done"};

export function safeResultLink(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export function ResultLink({ value }: { value: string | null }) {
  const url = safeResultLink(value);
  return url ? <a className={styles.resultLink} href={url} target="_blank" rel="noopener noreferrer nofollow">Open result link ↗</a> : null;
}
