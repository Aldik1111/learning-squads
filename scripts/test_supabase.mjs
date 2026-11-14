// Integration against an explicitly configured Learning Squads project.
// Creates labelled QA guests/squad/calls; never prints auth tokens or uses an admin key.
import {createClient} from '@supabase/supabase-js';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if(!url||!key)throw new Error('Set the dedicated Learning Squads public URL/key before integration tests.');
const clients=[];
const runId=Date.now().toString(36);
const client=()=>createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
const rpc=async(c,name,args={})=>{const {data,error}=await c.rpc(name,args);if(error)throw new Error(`${name}: ${error.message}`);return data;};
try {
  for(let i=0;i<5;i++) {
    const c=client();const {data,error}=await c.auth.signInAnonymously();
    if(error||!data.session)throw new Error(`Anonymous sign-in unavailable: ${error?.message??'missing session'}`);
    clients.push(c);
    await rpc(c,'ls_update_profile',{input:{name:`QA ${runId} ${i+1}`,track:'spanish',level:'beginner',primaryLanguage:i===1?`qaa-${runId}`:'en',knownLanguages:i===1?['es','en']:['en'],timezone:'UTC',availableForCalls:i===1}});
  }
  const [a,b,c,d,e]=clients;
  const sa=(await a.auth.getSession()).data.session; const sb=(await b.auth.getSession()).data.session;
  assert.notEqual(sa.user.id,sb.user.id);
  const restored=client();const restoredAuth=await restored.auth.setSession({access_token:sa.access_token,refresh_token:sa.refresh_token});
  assert.equal(restoredAuth.data.user?.id,sa.user.id);assert.equal((await rpc(restored,'ls_get_profile')).id,sa.user.id);
  console.log('Real anonymous auth: five distinct guests and session restoration PASS');
  const answers={'python-return':'b','python-mixed':'c','python-empty':'a','python-return-position':'b'};
  const quizArgs={module_id_value:'python-first-function',version_value:1,answers_value:answers,request_id_value:randomUUID()};
  const attempt=await rpc(a,'ls_submit_quiz',quizArgs);assert.equal(attempt.items.filter(x=>x.correct).length,4);
  assert.equal((await rpc(a,'ls_submit_quiz',quizArgs)).id,attempt.id);
  assert.equal((await rpc(b,'ls_get_progress')).quizAttempts.length,0);
  const keys=await a.from('ls_content_versions').select('*');assert.ok(keys.error,'Grading keys should not be readable');
  const forged=await a.from('ls_quiz_attempts').insert({user_id:sb.user.id});assert.ok(forged.error,'Direct score inserts should be denied');
  console.log('Private quiz persistence, idempotency, grading key protection PASS');
  const squad=await rpc(a,'ls_create_squad',{input:{name:`QA ${runId}`,track:'spanish',level:'beginner'},request_id_value:randomUUID()});
  await rpc(b,'ls_join_squad',{squad_id_value:squad.id});await rpc(c,'ls_join_squad',{squad_id_value:squad.id});
  const race=await Promise.all([d.rpc('ls_join_squad',{squad_id_value:squad.id}),e.rpc('ls_join_squad',{squad_id_value:squad.id})]);
  assert.equal(race.filter(x=>!x.error).length,1);assert.equal(race.filter(x=>x.error?.message==='SQUAD_FULL').length,1);
  assert.equal((await rpc(a,'ls_find_squads')).find(x=>x.id===squad.id).memberCount,4);
  console.log('Real PostgREST concurrent squad capacity PASS');
  // Unique private-use language prevents a random test invitation reaching real users.
  const matching=await rpc(a,'ls_create_call',{kind_value:'language',target_value:`qaa-${runId}`,request_id_value:randomUUID(),module_id_value:null,recipient_ids_value:null});
  assert.equal(matching.participants.find(x=>x.userId!==sa.user.id).userId,sb.user.id);
  const duplicate=await a.rpc('ls_create_call',{kind_value:'language',target_value:`qaa-${runId}`,request_id_value:randomUUID(),module_id_value:null,recipient_ids_value:null});
  assert.equal(duplicate.error?.message,'INVITATION_PENDING');
  await rpc(a,'ls_respond_invitation',{invitation_id_value:matching.participants.find(x=>x.userId===sb.user.id).invitationId,status_value:'cancelled'});
  const call=await rpc(a,'ls_create_call',{kind_value:'squad',target_value:squad.id,request_id_value:randomUUID(),module_id_value:'spanish-first-conversation',recipient_ids_value:[sb.user.id]});
  await rpc(a,'ls_set_meet',{call_id_value:call.id,url_value:'https://meet.google.com/abc-defg-hij'});
  const invitations=await rpc(b,'ls_get_notifications');const invite=invitations.find(n=>n.invitation.callId===call.id).invitation;
  assert.ok((await c.rpc('ls_respond_invitation',{invitation_id_value:invite.id,status_value:'accepted'})).error);
  await rpc(b,'ls_respond_invitation',{invitation_id_value:invite.id,status_value:'accepted'});
  const transition=await rpc(b,'ls_record_transition',{call_id_value:call.id});
  assert.equal((await rpc(b,'ls_record_transition',{call_id_value:call.id})).myTransitionedAt,transition.myTransitionedAt);
  const finish=await rpc(b,'ls_finish_practice',{call_id_value:call.id});assert.ok(finish.myPracticeEndedAt);
  assert.equal((await rpc(b,'ls_finish_practice',{call_id_value:call.id})).myPracticeEndedAt,finish.myPracticeEndedAt);
  assert.equal((await rpc(b,'ls_get_progress')).practice[0].moduleId,'spanish-first-conversation');
  assert.ok((await c.rpc('ls_get_call',{call_id_value:call.id})).error);
  console.log('Real invitations, foreign-access rejection, immutable transition and practice finish PASS');
  if(process.env.TEST_APP_URL) {
    const base=process.env.TEST_APP_URL.replace(/\/$/,'');
    const publicResponse=await fetch(`${base}/api/courses`);assert.equal(publicResponse.status,200);
    const blocked=await fetch(`${base}/api/profile`);assert.equal(blocked.status,401);
    const profile=await fetch(`${base}/api/profile`,{headers:{Authorization:`Bearer ${sa.access_token}`}});assert.equal(profile.status,200);assert.equal((await profile.json()).data.id,sa.user.id);
    const forgedResponse=await fetch(`${base}/api/profile`,{headers:{Authorization:'Bearer not-a-token'}});assert.equal(forgedResponse.status,401);
    console.log('Next.js API public/private/bearer checks PASS');
  }
  console.log(`Integration PASS. QA data label: QA ${runId}. Meet URL is a format-test fixture, not a real meeting or attendance proof.`);
} finally {
  for(const c of clients){try{await c.rpc('ls_availability',{available_value:false});await c.auth.signOut();}catch{/* Best effort: availability also expires after2min. */}}
}
