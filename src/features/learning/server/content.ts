import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Course, LearningModule, PythonExercise, Track } from "@/contracts";
const root = path.join(process.cwd(), "content");
async function json<T>(filename: string): Promise<T> { return JSON.parse(await readFile(filename, "utf8")) as T; }
type AuthoredModule = { id: string; contentVersion: number; title: string; level: string; objectives: string[]; lesson: string; quiz: LearningModule["quiz"]; exercise?: string; conversation?: {targetLanguage:string;minimumPracticeMinutes:number;guide:string} };
async function entries() {
  return (await json<{courses:{id:Track;title:string;category:Course["category"];collaborationMode:Course["collaborationMode"];modules:{id:string;directory:string}[]}[]}>(path.join(root,"catalog.json"))).courses;
}
export async function courses(): Promise<Course[]> {
  return Promise.all((await entries()).map(async c => ({id:c.id,title:c.title,category:c.category,collaborationMode:c.collaborationMode,modules:await Promise.all(c.modules.map(async entry => {
    const m=await json<AuthoredModule>(path.join(root,entry.directory,"module.json"));
    return {id:m.id,title:m.title,contentVersion:m.contentVersion};
  }))})));
}
export async function learningModule(id: string): Promise<LearningModule | null> {
  const entry=(await entries()).flatMap(c=>c.modules).find(m=>m.id===id);
  if(!entry) return null;
  const directory=path.join(root,entry.directory);
  const m=await json<AuthoredModule>(path.join(directory,"module.json"));
  const result:LearningModule={id:m.id,contentVersion:m.contentVersion,title:m.title,level:m.level,objectives:m.objectives,quiz:m.quiz,lessonMarkdown:await readFile(path.join(directory,m.lesson),"utf8")};
  if(m.exercise) {
    const e=await json<PythonExercise & {starterFile:string}>(path.join(directory,m.exercise));
    result.exercise={id:e.id,exerciseVersion:e.exerciseVersion,title:e.title,entrypoint:e.entrypoint,inputDescription:e.inputDescription,outputDescription:e.outputDescription,preserveInput:e.preserveInput,cases:e.cases,starterCode:await readFile(path.join(directory,e.starterFile),"utf8")};
  }
  if(m.conversation) result.conversation={targetLanguage:m.conversation.targetLanguage,minimumPracticeMinutes:m.conversation.minimumPracticeMinutes,guideMarkdown:await readFile(path.join(directory,m.conversation.guide),"utf8")};
  return result;
}
