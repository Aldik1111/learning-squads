import { PracticePage } from "@/features/calls/ui/practice-page";
import { courses, learningModule } from "@/features/learning/server/content";
import { ErrorState } from "@/components/states";
import Link from "next/link";

export default async function Page({ searchParams }: { searchParams: Promise<{ module?: string | string[] }> }) {
  const {module:requested}=await searchParams;
  const moduleId=requested===undefined?"spanish-first-conversation":typeof requested==="string"?requested:"";
  const [module,catalog]=await Promise.all([learningModule(moduleId),courses()]);
  if(!module?.conversation)return <><ErrorState message="Choose a language module to start a conversation."/><Link className="ls-button" href="/dashboard">Explore language courses</Link></>;
  const choices=catalog.filter(course=>course.collaborationMode==="language-partner").flatMap(course=>course.modules.map(item=>({id:item.id,label:`${course.title} — ${item.title}`})));
  return <PracticePage key={module.id} moduleId={module.id} language={module.conversation.targetLanguage} moduleTitle={module.title} choices={choices}/>;
}
