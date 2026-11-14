import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], display: "swap", variable: "--font-jakarta" });

export const metadata: Metadata = {
  title: { default: "Learning Squads", template: "%s · Learning Squads" },
  description: "Short lessons, useful practice, and people to learn with. Explore Python, AI, and Spanish without a signup form.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en" data-scroll-behavior="smooth" className={jakarta.variable}><body><AppShell>{children}</AppShell></body></html>;
}
