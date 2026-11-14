import {execFileSync,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFileSync,readdirSync} from 'node:fs';
import {setTimeout as delay} from 'node:timers/promises';
const run=promisify(execFile);
const container=`learning-squads-test-${process.pid}-${Date.now()}`;
const docker=(args,input)=>execFileSync('docker',args,{encoding:'utf8',input,stdio:['pipe','pipe','pipe']});
const sql=(text)=>docker(['exec','-i',container,'psql','-U','postgres','-v','ON_ERROR_STOP=1','-tA'],text);
try {
  docker(['run','--rm','-d','--name',container,'--network','none','-e','POSTGRES_HOST_AUTH_METHOD=trust','postgres:16.13-alpine']);
  let ready=false;
  for(let attempt=0;attempt<40;attempt++) {try{docker(['exec',container,'pg_isready','-U','postgres']);ready=true;break;}catch{await delay(250);}}
  if(!ready)throw new Error('Disposable PostgreSQL did not start');
  sql(readFileSync('tests/server/database-fixture.sql','utf8'));
  for(const filename of readdirSync('supabase/migrations').filter(f=>f.endsWith('.sql')).sort())sql(readFileSync(`supabase/migrations/${filename}`,'utf8'));
  sql(readFileSync('tests/server/database-integration.sql','utf8'));
  console.log('PostgreSQL migration, grading, access, idempotency and interval union checks PASS');
  sql(`insert into auth.users(id) select ('10000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid from generate_series(1,5)n;
    insert into public.ls_squads(id,name,track,level,created_by,request_id) values('90000000-0000-4000-8000-000000000001','Capacity race','python','beginner','10000000-0000-4000-8000-000000000001',gen_random_uuid());
    insert into public.ls_memberships(squad_id,user_id) select '90000000-0000-4000-8000-000000000001',('10000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid from generate_series(1,3)n;`);
  const join=async(user)=>run('docker',['exec',container,'psql','-U','postgres','-v','ON_ERROR_STOP=1','-tA','-c',`begin;set local role authenticated;select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-00000000000${user}',true); select public.ls_join_squad('90000000-0000-4000-8000-000000000001');select pg_sleep(0.1);commit;`],{encoding:'utf8'});
  const race=await Promise.allSettled([join(4),join(5)]);
  if(race.filter(r=>r.status==='fulfilled').length!==1||race.filter(r=>r.status==='rejected'&&String(r.reason.stderr).includes('SQUAD_FULL')).length!==1)throw new Error('Concurrent final-slot join was not atomic');
  if(sql("select count(*) from public.ls_memberships where squad_id='90000000-0000-4000-8000-000000000001';").trim()!=='4')throw new Error('Squad overflow after race');
  console.log('Concurrent final-slot join: one success, one SQUAD_FULL; final count4 PASS');
  const actor=(id,statement)=>run('docker',['exec',container,'psql','-U','postgres','-v','ON_ERROR_STOP=1','-tA','-c',`begin;set local role authenticated;select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-00000000000${id}',true);${statement};commit;`],{encoding:'utf8'});
  const createCall=(request)=>actor(1,`select public.ls_create_call('squad','90000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-00000000000${request}',null,array['10000000-0000-4000-8000-000000000002'::uuid])`);
  const inviteRace=await Promise.allSettled([createCall(1),createCall(2)]);
  if(inviteRace.filter(r=>r.status==='fulfilled').length!==1||inviteRace.filter(r=>r.status==='rejected'&&String(r.reason.stderr).includes('INVITATION_PENDING')).length!==1)throw new Error('Concurrent fresh request IDs bypass pending invitation dedup');
  if(sql("select count(*) from public.ls_invitations where status='pending';").trim()!=='1')throw new Error('Duplicate pending invitations created');
  const invitationId=sql("select id from public.ls_invitations where status='pending';").trim();
  const responseRace=await Promise.allSettled([
    actor(2,`select public.ls_respond_invitation('${invitationId}','accepted')`),
    actor(1,`select public.ls_respond_invitation('${invitationId}','cancelled')`)
  ]);
  if(responseRace.filter(r=>r.status==='fulfilled').length!==1||responseRace.filter(r=>r.status==='rejected'&&/CONFLICT|INVITATION_CANCELLED/.test(String(r.reason.stderr))).length!==1)throw new Error('Accept/cancel race did not have exactly one winning transition');
  const finalState=sql(`select status from public.ls_invitations where id='${invitationId}';`).trim();
  if(!['accepted','cancelled'].includes(finalState))throw new Error('Invalid invitation terminal state');
  await createCall(3);
  console.log('Concurrent fresh-ID anti-spam and accept/cancel race PASS; new call allowed after terminal response');
  const expiringId=sql("select id from public.ls_invitations where status='pending';").trim();
  sql(`update public.ls_invitations set expires_at=clock_timestamp()+interval '5 seconds' where id='${expiringId}';`);
  const blocker=run('docker',['exec',container,'psql','-U','postgres','-v','ON_ERROR_STOP=1','-tA','-c',`/* expiry-holder */ begin; select id from public.ls_invitations where id='${expiringId}' for update; select pg_sleep(6);commit;`],{encoding:'utf8'});
  let holderReady=false;
  for(let n=0;n<30;n++){if(sql("select count(*) from pg_stat_activity where query like '/* expiry-holder */%' and wait_event='PgSleep';").trim()==='1'){holderReady=true;break;}await delay(25);}
  if(!holderReady)throw new Error('Expiry row-lock holder did not start');
  const acceptance=actor(2,`/* expiry-waiter */ select public.ls_respond_invitation('${expiringId}','accepted')`).then(()=>({ok:true,error:''}),error=>({ok:false,error:String(error.stderr)}));
  let blockedBeforeExpiry=false;
  for(let n=0;n<30;n++){if(sql(`select count(*) from pg_stat_activity a,public.ls_invitations i where i.id='${expiringId}' and a.query like '%/* expiry-waiter */%' and a.wait_event_type='Lock' and a.xact_start<i.expires_at;`).trim()==='1'){blockedBeforeExpiry=true;break;}await delay(25);}
  await blocker;
  const expiryResult=await acceptance;
  if(!blockedBeforeExpiry||expiryResult.ok||!expiryResult.error.includes('INVITATION_EXPIRED'))throw new Error('A pre-deadline request waiting on a lock accepted after expiry');
  console.log('Expiry checked after row-lock acquisition, not transaction start PASS');
  console.log('This fixture does NOT verify Supabase GoTrue/PostgREST, browser sessions or deployment.');
} finally {
  try{docker(['stop',container]);}catch{/* May not exist if startup failed. */}
}
