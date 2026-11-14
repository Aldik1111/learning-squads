import { CallPage } from "@/features/calls/ui/call-page";
export default async function Page({params}:{params:Promise<{id:string}>}) {const {id}=await params;return <CallPage key={id} callId={id}/>;}
