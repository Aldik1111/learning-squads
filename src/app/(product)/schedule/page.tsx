import { StudySchedule } from "@/features/groups/ui/study-schedule";
import { courses } from "@/features/learning/server/content";

export default async function SchedulePage({searchParams}:{searchParams:Promise<{course?:string}>}) {
  const {course}=await searchParams;
  const courseId=(await courses()).find(item=>item.id===course&&item.collaborationMode==="group")?.id;
  return <StudySchedule courseId={courseId}/>;
}
