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
    if(name==="squads"&&method==="GET") {const q=new URL(request.url).searchParams;return await rpc("ls_find_squads",{track_value:q.get("track"),level_value:q.get("level")});}
    if(name==="squads"&&method==="POST") {const b=await body(request);return await rpc("ls_create_squad",{input:b,request_id_value:uuid(b.requestId)});}
    if(path[0]==="squads"&&path[2]==="membership"&&path.length===3&&["PUT","DELETE"].includes(method))return await rpc(method==="PUT"?"ls_join_squad":"ls_leave_squad",{squad_id_value:uuid(path[1])});
    if(name==="calls"&&method==="GET")return await rpc("ls_get_my_calls");
    if(["calls/language","calls/squad"].includes(name)&&method==="POST") {const b=await body(request);return await rpc("ls_create_call",{kind_value:path[1],target_value:path[1]==="squad"?uuid(b.squadId):requiredText(b.language),request_id_value:uuid(b.requestId),module_id_value:b.moduleId??null,recipient_ids_value:b.recipientIds??null});}
    if(path[0]==="calls"&&path.length===2&&method==="GET")return await rpc("ls_get_call",{call_id_value:uuid(path[1])});
    if(path[0]==="calls"&&path.length===3&&path[2]==="meet"&&method==="PUT") {const b=await body(request);return await rpc("ls_set_meet",{call_id_value:uuid(path[1]),url_value:requiredText(b.meetUrl)});}
    if(path[0]==="calls"&&path.length===3&&path[2]==="transition"&&method==="POST")return await rpc("ls_record_transition",{call_id_value:uuid(path[1])});
    if(path[0]==="calls"&&path.length===3&&path[2]==="finish"&&method==="POST")return await rpc("ls_finish_practice",{call_id_value:uuid(path[1])});
    if(name==="notifications"&&method==="GET")return await rpc("ls_get_notifications");
    if(path[0]==="notifications"&&path.length===3&&path[2]==="read"&&method==="PUT")return await rpc("ls_mark_read",{invitation_id_value:uuid(path[1])});
    if(path[0]==="invitations"&&path.length===3&&["accepted","declined","cancelled"].includes(path[2])&&method==="PUT")return await rpc("ls_respond_invitation",{invitation_id_value:uuid(path[1]),status_value:path[2]});
    throw new HttpError("NOT_FOUND","This API route does not exist.",404);
  } catch(error) {return failure(error);}
}
export const GET=handle; export const POST=handle; export const PUT=handle; export const DELETE=handle;
