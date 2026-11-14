// Local-only HTTP boundary check. --with-french-meet additionally creates ONE real organizer event.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
const origin=process.env.LEARNING_SQUADS_TEST_ORIGIN??'http://127.0.0.1:4191';
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
for(const address of [origin,url])assert.ok(address&&['127.0.0.1','localhost'].includes(new URL(address).hostname),'Only local Learning Squads endpoints are allowed');
assert.ok(key);
const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
const {data,error}=await client.auth.signInAnonymously();assert.ifError(error);assert.ok(data.session);
const request=async(path,method='GET',body,token=data.session.access_token)=>{
 const response=await fetch(`${origin}/api/${path}`,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(120000)});
 return {status:response.status,payload:await response.json()};
};
const catalog=(await request('courses')).payload.data;assert.equal(catalog.length,6);assert.equal(catalog.flatMap(c=>c.modules).length,18);
const french=(await request('courses/modules/french-daily-plans')).payload.data;assert.equal(french.courseId,'french');assert.equal(french.conversation.targetLanguage,'fr');
for(const [language,moduleId] of [['es','french-daily-plans'],['fr','python-clean-labels']]){
 const rejected=await request('calls/language','POST',{language,moduleId,requestId:randomUUID()});
 assert.equal(rejected.payload.error?.code,'INVALID_INPUT');assert.ok(rejected.status>=400);
}
assert.equal((await request('calls')).payload.data.length,0,'Invalid language requests must not create calls');
const board=(await request('tasks')).payload.data;assert.equal(board.length,18);
const task=board.find(item=>item.task.moduleId==='french-daily-plans');assert.ok(task);
const requestId=randomUUID();
const input={taskVersion:1,status:'done',summary:'Bonjour, demain je pratique le français.',link:null,shareWithGroup:false,shareGroupId:null,expectedRevision:0,requestId};
const saved=await request(`tasks/${task.task.id}`,'PUT',input);assert.equal(saved.status,200);assert.equal(saved.payload.data.revision,1);assert.equal(saved.payload.data.sharedGroupId,null);
assert.deepEqual((await request(`tasks/${task.task.id}`,'PUT',input)).payload.data,saved.payload.data);
assert.equal((await request(`tasks/${task.task.id}`,'PUT',{...input,requestId:randomUUID()})).payload.error?.code,'CONFLICT');
for(const link of ['javascript:alert(1)','https://user:password@example.com'])assert.equal((await request(`tasks/${task.task.id}`,'PUT',{...input,link,expectedRevision:1,requestId:randomUUID()})).payload.error?.code,'INVALID_INPUT');
const python=(await request('courses/modules/python-clean-labels')).payload.data.exercise;assert.ok(python);
const result={exerciseId:python.id,exerciseVersion:python.exerciseVersion,status:'cancelled',cases:[],stdout:'',durationMs:0};
const attempt=await request('attempts/python','POST',{result,requestId:randomUUID()});assert.equal(attempt.status,200);assert.equal(attempt.payload.data.total,python.cases.length);
assert.equal((await request('attempts/python','POST',{result:{...result,cases:[{id:'forged-case',passed:true}],status:'passed'},requestId:randomUUID()})).payload.error?.code,'INVALID_INPUT');
console.log('Local HTTP: six courses/18 tasks, French module-language rejection before provider, private task save/replay/conflict, unsafe links and dynamic Python case validation PASS');
if(process.argv.includes('--with-french-meet')){
 const partner=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 const auth=await partner.auth.signInAnonymously();assert.ifError(auth.error);assert.ok(auth.data.session);
 const token=auth.data.session.access_token;
 try{
  const profile=await request('profile','PUT',{name:'French HTTP QA',track:'french',level:'beginner',primaryLanguage:'fr',knownLanguages:['fr'],timezone:'UTC',availableForCalls:true},token);assert.equal(profile.status,200);
  const created=await request('calls/language','POST',{language:'fr',moduleId:'french-daily-plans',requestId:randomUUID()});assert.equal(created.status,200);
  const call=created.payload.data;assert.equal(call.targetLanguage,'fr');assert.equal(call.moduleId,'french-daily-plans');
  const invitation=call.participants.find(p=>p.userId===auth.data.user.id);assert.ok(invitation?.invitationId,'Expected the dedicated local French QA partner');
  assert.equal((await request(`invitations/${invitation.invitationId}/accepted`,'PUT',undefined,token)).status,200);
  const current=(await request(`calls/${call.id}`)).payload.data;
  const peer=(await request(`calls/${call.id}`,'GET',undefined,token)).payload.data;
  assert.equal(current.meetStatus,'ready');assert.ok(current.meetUrl?.startsWith('https://meet.google.com/'));assert.equal(peer.meetUrl,current.meetUrl);
  assert.equal(current.myTransitionedAt,null);assert.equal(peer.myTransitionedAt,null);
  console.log('Local French integration: two real guests, matching/accept, same ready Google link, timers unstarted PASS (no attendance claim)');
 }finally{await request('availability','PUT',{available:false},token);}
}
