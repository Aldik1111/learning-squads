import { TaskBoard } from "@/features/tasks/ui/task-board";

export default async function Page({searchParams}:{searchParams:Promise<{course?:string|string[];task?:string|string[]}>}) {
  const query = await searchParams;
  return <TaskBoard initialCourse={typeof query.course==="string"?query.course:undefined} initialTask={typeof query.task==="string"?query.task:undefined}/>;
}
