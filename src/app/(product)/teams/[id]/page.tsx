import { GroupDetail } from "@/features/groups/ui/group-detail";
export default async function Page({params}:{params:Promise<{id:string}>}) {const {id}=await params;return <GroupDetail key={id} groupId={id}/>;}
