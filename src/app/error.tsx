"use client";
import { ErrorState } from "@/components/states";
export default function ErrorPage({ reset }: { reset: () => void }) { return <ErrorState message="We could not open this page. Your saved work has not been removed." onRetry={reset} />; }
