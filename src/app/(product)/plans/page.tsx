import type { Metadata } from "next";
import { DemoPlans } from "@/components/demo-plans";

export const metadata: Metadata = { title: "Plans · Learning Squads" };

export default function PlansPage() {
  return <DemoPlans />;
}
