"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { api } from "@/lib/api-client";
import { InvitationBadge } from "@/features/notifications/ui/invitation-badge";
import { AppIcon } from "./app-icon";

const links = [
  { href: "/dashboard", label: "Learn", icon: "book" },
  { href: "/tasks", label: "Tasks", icon: "tasks" },
  { href: "/teams", label: "My groups", icon: "users" },
  { href: "/calendar", label: "Calendar", icon: "calendar" },
  { href: "/practice", label: "Practice", icon: "chat" },
  { href: "/notifications", label: "Invitations", icon: "bell" },
  { href: "/plans", label: "Plans", icon: "wallet" },
] as const;

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
        <nav aria-label="Main navigation">{links.map(link => <Link key={link.href} href={link.href} aria-current={pathname === link.href || (link.href === "/dashboard" && pathname.startsWith("/learn/")) || (link.href==="/teams"&&pathname.startsWith("/teams/")) || (link.href==="/practice"&&pathname.startsWith("/calls")) ? "page" : undefined}><AppIcon name={link.icon}/><span>{link.label}</span>{link.href==="/notifications"&&<InvitationBadge/>}</Link>)}</nav>
        <div className="ls-header-tools"><Link className="ls-guide-link" href="/#tester-guide"><AppIcon name="sparkles"/>Tester guide</Link><Link className="ls-profile-link" href="/profile" aria-label="Your profile" aria-current={pathname==="/profile"?"page":undefined}><span className="ls-profile-avatar"><AppIcon name="user"/></span><span>Your profile<small>Browser guest</small></span></Link></div>
      </div>
    </header>
    <main id="main" tabIndex={-1} className="ls-main">{children}</main>
    <footer className="ls-site-footer"><div className="ls-footer-inner"><div><Link className="ls-brand" href="/">Learning Squads</Link><p>Small steps. Shared progress.</p></div><p>Learn at your pace. Practise together.<br/>No signup forms or passwords.</p><div className="ls-actions"><Link href="/#tester-guide">Tester guide</Link><Link href="/plans">Pricing hypothesis</Link></div></div></footer>
  </>;
}
