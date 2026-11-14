import { LearningPage } from "@/features/learning/ui/learning-page";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LearningPage key={id} moduleId={id} />;
}
