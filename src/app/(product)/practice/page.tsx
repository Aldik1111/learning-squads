import { PracticePage } from "@/features/calls/ui/practice-page";
export default async function Page({ searchParams }: { searchParams: Promise<{ module?: string }> }) { const {module}=await searchParams;return <PracticePage moduleId={module}/>; }
