import type { Track } from "@/contracts";
import { StudySchedule } from "@/features/groups/ui/study-schedule";

export default async function SchedulePage({searchParams}:{searchParams:Promise<{course?:string}>}) {
  const {course}=await searchParams;
  const courseId=course==="python"||course==="how-to-use-ai"?course as Track:undefined;
  return <StudySchedule courseId={courseId}/>;
}
