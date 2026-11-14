import type { ReactNode } from "react";

export function LoadingState({ children = "Loading…" }: { children?: ReactNode }) {
  return <div className="ls-state" role="status"><span className="ls-loading-dot" aria-hidden="true" />{children}</div>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div className="ls-state ls-error"><p role="alert">{message}</p>{onRetry && <button className="ls-button ls-button-secondary" onClick={onRetry}>Try again</button>}</div>;
}

export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return <div className="ls-state"><h2>{title}</h2><div className="ls-muted">{children}</div></div>;
}

export function PageHeading({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return <header className="ls-page-heading"><p className="ls-eyebrow">{eyebrow}</p><h1>{title}</h1>{children && <div className="ls-lead">{children}</div>}</header>;
}

export function errorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong. Please try again.";
}
