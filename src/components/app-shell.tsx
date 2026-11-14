"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { api } from "@/lib/api-client";

const links = [
  { href: "/dashboard", label: "Learn" },
  { href: "/teams", label: "Squads" },
  { href: "/practice", label: "Practice" },
  { href: "/notifications", label: "Invitations" },
  { href: "/profile", label: "Your profile" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  useEffect(() => {
    const heartbeat = () => {
      if (document.visibilityState === "visible") {
        // A failed background heartbeat makes availability expire; never fake freshness.
        void api.heartbeat().catch(() => undefined);
      }
    };
    heartbeat();
    const interval = window.setInterval(heartbeat, 60_000);
    document.addEventListener("visibilitychange", heartbeat);
    return () => { window.clearInterval(interval); document.removeEventListener("visibilitychange", heartbeat); };
  }, []);
  return <>
    <a className="ls-skip" href="#main">Skip to content</a>
    <header className="ls-site-header">
      <div className="ls-header-inner">
        <Link className="ls-brand" href="/" aria-label="Learning Squads home"><span className="ls-brand-mark" aria-hidden="true"><span /><span /><span /></span>Learning Squads</Link>
        <nav aria-label="Main navigation">{links.map(link => <Link key={link.href} href={link.href} aria-current={pathname === link.href || (link.href === "/dashboard" && pathname.startsWith("/learn/")) ? "page" : undefined}>{link.label}</Link>)}</nav>
      </div>
    </header>
    <main id="main" tabIndex={-1} className="ls-main">{children}</main>
    <footer className="ls-site-footer"><span>Small steps. Shared progress.</span><span>Learn at your pace. Practise together.</span></footer>
  </>;
}
