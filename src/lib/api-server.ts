import { createClient } from "@supabase/supabase-js";
import type { AppErrorCode } from "@/contracts";
export class HttpError extends Error { constructor(public code:AppErrorCode, message:string, public status=400) {super(message);} }
const messages:Record<AppErrorCode,string>={SESSION_REQUIRED:"Your guest session could not be verified. Reload and try again.",FORBIDDEN:"This action is not available to this profile.",INVALID_INPUT:"Check the submitted information.",NOT_FOUND:"This item could not be found.",SERVICE_UNAVAILABLE:"The service is not available yet. Please try again later.",POLICY_NOT_CONFIGURED:"This feature is awaiting configuration.",CONFLICT:"This action has already changed. Refresh before trying again.",NO_AVAILABLE_PARTNER:"No suitable partner is available right now. You can keep learning and try later.",INVITATION_EXPIRED:"This invitation has expired.",INVITATION_CANCELLED:"This invitation was cancelled.",MEET_LINK_MISSING:"The organizer has not added a Meet link yet.",SQUAD_FULL:"This squad already has four members.",INVITATION_PENDING:"You already have a pending invitation for this person. Wait for a response or cancel it before sending another."};
export function reply(data:unknown,status=200) {return Response.json({data},{status,headers:{"Cache-Control":"no-store"}});}
export function failure(error:unknown) {
  if(error instanceof HttpError) return Response.json({error:{code:error.code,message:error.message}},{status:error.status,headers:{"Cache-Control":"no-store"}});
  return Response.json({error:{code:"SERVICE_UNAVAILABLE",message:messages.SERVICE_UNAVAILABLE}},{status:503,headers:{"Cache-Control":"no-store"}});
}
export function authRequestError(error: { name?: string; status?: number }): HttpError {
  // A failed identity-provider request does not invalidate the guest's identity.
  const denied = error.name !== "AuthRetryableFetchError" && [400, 401, 403].includes(error.status ?? 0);
  return denied
    ? new HttpError("SESSION_REQUIRED", messages.SESSION_REQUIRED, 401)
    : new HttpError("SERVICE_UNAVAILABLE", messages.SERVICE_UNAVAILABLE, 503);
}
export async function authenticated(request:Request) {
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL; const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key) throw new HttpError("SERVICE_UNAVAILABLE",messages.SERVICE_UNAVAILABLE,503);
  const authorization=request.headers.get("authorization");
  if(!authorization?.startsWith("Bearer ")) throw new HttpError("SESSION_REQUIRED",messages.SESSION_REQUIRED,401);
  const token=authorization.slice(7);
  const client=createClient(url,key,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  const {data,error}=await client.auth.getUser(token);
  if(error) throw authRequestError(error);
  if(!data.user) throw new HttpError("SESSION_REQUIRED",messages.SESSION_REQUIRED,401);
  return client;
}
export function rpcError(error:{message:string;code?:string}):never {
  const code=Object.keys(messages).find(code=>error.message===code) as AppErrorCode | undefined;
  if(code) throw new HttpError(code,messages[code],code==="FORBIDDEN"?403:code==="NOT_FOUND"?404:code==="SESSION_REQUIRED"?401:409);
  if(error.code?.startsWith("22")||error.code?.startsWith("23")) throw new HttpError("INVALID_INPUT",messages.INVALID_INPUT);
  throw new HttpError("SERVICE_UNAVAILABLE",messages.SERVICE_UNAVAILABLE,503);
}
export async function body(request:Request):Promise<Record<string,unknown>> {
  const raw=await request.text();
  if(raw.length>64000) throw new HttpError("INVALID_INPUT",messages.INVALID_INPUT,413);
  try {const data:unknown=JSON.parse(raw);if(!data||typeof data!=="object"||Array.isArray(data)) throw new Error();return data as Record<string,unknown>;}catch{throw new HttpError("INVALID_INPUT",messages.INVALID_INPUT);}
}
export function uuid(value:unknown):string {if(typeof value!=="string"||!/^[\da-f]{8}-[\da-f]{4}-[1-8][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(value))throw new HttpError("INVALID_INPUT",messages.INVALID_INPUT);return value;}
export function requiredText(value:unknown):string {if(typeof value!=="string"||!value.trim()||value.length>2000)throw new HttpError("INVALID_INPUT",messages.INVALID_INPUT);return value;}
