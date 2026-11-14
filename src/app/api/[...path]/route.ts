import { loadAuthorizedGroupMeetings } from "@/features/groups/server/meetings";
import type { Call, GroupMeeting, StudyAvailability } from "@/contracts";
import { ensureGoogleMeeting, cancelGoogleMeeting } from "@/features/meet/server/google-meet";
import { courses, learningModule } from "@/features/learning/server/content";
import { authenticated, body, failure, HttpError, reply, requiredText, rpcError, uuid } from "@/lib/api-server";
export const runtime="nodejs";
export const dynamic="force-dynamic";
async function handle(request:Request,context:{params:Promise<{path:string[]}>}) {
  try {
    const path=(await context.params).path; const name=path.join("/"); const method=request.method;
    if(method==="GET"&&name==="courses") return reply(await courses());
    if(method==="GET"&&path[0]==="courses"&&path[1]==="modules"&&path.length===3) {
      const lesson=await learningModule(path[2]); if(!lesson) throw new HttpError("NOT_FOUND","This module does not exist.",404);return reply(lesson);
    }
    const client=await authenticated(request);
    const rpc=async(name:string,args:Record<string,unknown>={})=>{const {data,error}=await client.rpc(name,args);if(error)rpcError(error);return reply(data);};
    const rpcData=async<T,>(name:string,args:Record<string,unknown>={})=>{const {data,error}=await client.rpc(name,args);if(error)rpcError(error);return data as T;};
    const enrichCall=async(call:Call):Promise<Call>=>{
      if(call.kind!=="language")return {...call,meetUrl:null,meetStatus:"unavailable"};
      const meeting=await ensureGoogleMeeting({id:call.id,groupId:call.id,startsAt:call.createdAt,endsAt:new Date(Date.parse(call.createdAt)+15*60*1000).toISOString()});
      // Recheck permissions after the remote request; never trust a stale read.
      const current=await rpcData<Call>("ls_get_call",{call_id_value:call.id});
      return {...current,meetUrl:meeting.meetUrl,meetStatus:meeting.status};
    };
    const groupMeetings=(id:string)=>loadAuthorizedGroupMeetings({
      readMeetings:()=>rpcData<GroupMeeting[]>("ls_get_group_meetings",{group_id_value:id}),
      readCancelled:(ids)=>rpcData<Pick<GroupMeeting,"id"|"groupId">[]>("ls_get_cancelled_group_meetings",{group_id_value:id,meeting_ids_value:ids}),
      ensure:ensureGoogleMeeting,
      cancel:cancelGoogleMeeting,
    });
    if(name==="study-availability"&&method==="GET")return await rpc("ls_get_study_availability");
    if(name==="study-availability"&&method==="PUT"){
      const result=await rpcData<StudyAvailability & {_cancelledMeetings:{id:string;groupId:string}[]}>("ls_update_study_availability",{input:await body(request)});
      const {_cancelledMeetings,...schedule}=result;
      await Promise.all(_cancelledMeetings.map(meeting=>cancelGoogleMeeting(meeting)));
      return reply(schedule);
    }
    if(name==="course-groups"&&method==="GET")return await rpc("ls_get_my_course_groups");
    if(name==="course-groups/enroll"&&method==="POST"){const b=await body(request);return await rpc("ls_enroll_course",{course_id_value:requiredText(b.courseId),request_id_value:uuid(b.requestId)});}
    if(path[0]==="course-groups"&&path.length>=2){
      const id=uuid(path[1]);const args={group_id_value:id};
      if(path.length===2&&method==="GET")return await rpc("ls_get_course_group",args);
      if(path.length===3&&path[2]==="messages"&&method==="GET")return await rpc("ls_get_group_messages",args);
      if(path.length===3&&path[2]==="messages"&&method==="POST"){const b=await body(request);if(typeof b.body!=="string")throw new HttpError("INVALID_INPUT","Write a message.");return await rpc("ls_send_group_message",{...args,body_value:b.body,request_id_value:uuid(b.requestId)});}
      if(path.length===3&&path[2]==="progress"&&method==="GET")return await rpc("ls_get_group_progress",args);
      if(path.length===3&&path[2]==="meetings"&&method==="GET")return reply(await groupMeetings(id));
      if(path.length===3&&path[2]==="meetings"&&method==="POST"){const b=await body(request);const row=await rpcData<GroupMeeting>("ls_create_group_meeting",{...args,request_id_value:uuid(b.requestId)});const meetings=await groupMeetings(id);return reply(meetings.find(m=>m.id===row.id)??row);}
    }
    // Legacy manual group discovery and client-provided Meet URLs are retired.
    if(path[0]==="squads"||name==="calls/squad"||(path[0]==="calls"&&path[2]==="meet"))throw new HttpError("FORBIDDEN","Groups are assigned automatically and meeting links are created by the service.",403);
    if(name==="profile"&&method==="GET") return await rpc("ls_get_profile");
    if(name==="profile"&&method==="PUT") return await rpc("ls_update_profile",{input:await body(request)});
    if(name==="availability"&&method==="PUT") {const b=await body(request);if(typeof b.available!=="boolean")throw new HttpError("INVALID_INPUT","Choose availability.");return await rpc("ls_availability",{available_value:b.available});}
    if(name==="availability/heartbeat"&&method==="POST") return await rpc("ls_availability");
    if(name==="progress"&&method==="GET") return await rpc("ls_get_progress");
    if(name==="attempts/quiz"&&method==="POST") {const b=await body(request);return await rpc("ls_submit_quiz",{module_id_value:requiredText(b.moduleId),version_value:b.contentVersion,answers_value:b.answers,request_id_value:uuid(b.requestId)});}
    if(name==="attempts/python"&&method==="POST") {
      const b=await body(request); const result=b.result as {exerciseId?:unknown;exerciseVersion?:unknown;cases?:unknown;status?:unknown};
      const caseIds=new Set(["empty","single-done","single-pending","all-pending","all-done","mixed"]);
      if(!result||!Array.isArray(result.cases)||result.cases.length>6||result.cases.some(c=>!c||typeof c.passed!=="boolean"||!caseIds.has(c.id))||new Set(result.cases.map(c=>c.id)).size!==result.cases.length)throw new HttpError("INVALID_INPUT","Check the self-check result and try again.");
      if(["passed","failed"].includes(String(result.status))&&result.cases.length!==6)throw new HttpError("INVALID_INPUT","A completed self-check requires all six cases.");
      return await rpc("ls_submit_python",{exercise_id_value:requiredText(result.exerciseId),version_value:result.exerciseVersion,passed_value:result.cases.filter(c=>c.passed).length,total_value:6,status_value:requiredText(result.status),request_id_value:uuid(b.requestId)});
    }
    if(name==="calls"&&method==="GET")return reply((await rpcData<Call[]>("ls_get_my_calls")).filter(c=>c.kind==="language").map(c=>({...c,meetUrl:null,meetStatus:"pending"})));
    if(name==="calls/language"&&method==="POST") {const b=await body(request);return reply(await enrichCall(await rpcData<Call>("ls_create_call",{kind_value:"language",target_value:requiredText(b.language),request_id_value:uuid(b.requestId),module_id_value:b.moduleId??null,recipient_ids_value:b.recipientIds??null})));}
    if(path[0]==="calls"&&path.length===2&&method==="GET")return reply(await enrichCall(await rpcData<Call>("ls_get_call",{call_id_value:uuid(path[1])})));
    if(path[0]==="calls"&&path.length===3&&path[2]==="transition"&&method==="POST"){const args={call_id_value:uuid(path[1])};const call=await enrichCall(await rpcData<Call>("ls_get_call",args));if(!call.meetUrl)throw new HttpError("SERVICE_UNAVAILABLE","The meeting link is not ready yet. Try again shortly.",503);const updated=await rpcData<Call>("ls_record_transition",args);return reply({...updated,meetUrl:call.meetUrl,meetStatus:call.meetStatus});}
    if(path[0]==="calls"&&path.length===3&&path[2]==="finish"&&method==="POST")return reply(await enrichCall(await rpcData<Call>("ls_finish_practice",{call_id_value:uuid(path[1])})));
    if(name==="notifications"&&method==="GET")return await rpc("ls_get_notifications");
    if(path[0]==="notifications"&&path.length===3&&path[2]==="read"&&method==="PUT")return await rpc("ls_mark_read",{invitation_id_value:uuid(path[1])});
    if(path[0]==="invitations"&&path.length===3&&["accepted","declined","cancelled"].includes(path[2])&&method==="PUT")return await rpc("ls_respond_invitation",{invitation_id_value:uuid(path[1]),status_value:path[2]});
    throw new HttpError("NOT_FOUND","This API route does not exist.",404);
  } catch(error) {return failure(error);}
}
export const GET=handle; export const POST=handle; export const PUT=handle; export const DELETE=handle;
