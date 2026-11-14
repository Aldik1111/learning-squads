// Explicit integration check against TEST_APP_URL + dedicated Supabase environment.
import {createClient} from '@supabase/supabase-js';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const base=process.env.TEST_APP_URL;
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if(!base||!url||!key)throw new Error('TEST_APP_URL and dedicated public Supabase config are required.');
const users=[];
try {
  for(let n=0;n<2;n++) {
    const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data,error}=await client.auth.signInAnonymously();if(error)throw new Error(error.message);
    users.push({client,token:data.session.access_token,id:data.user.id});
  }
  const call=(path,user,method='GET',body)=>fetch(`${base}/api/${path}`,{method,headers:{'Content-Type':'application/json',...(user?{Authorization:`Bearer ${user.token}`}:{})},body:body===undefined?undefined:JSON.stringify(body)});
  assert.equal((await call('courses')).status,200);
  assert.equal((await call('profile')).status,401);
  assert.equal((await call('profile',{token:'forged-token'})).status,401);
  const own=await call('profile',users[0]);assert.equal(own.status,200);assert.equal((await own.json()).data.id,users[0].id);
  const forged=await call('profile',users[0],'PUT',{id:users[1].id,name:'QA HTTP learner',track:'python',level:'beginner',primaryLanguage:'en',knownLanguages:['en'],timezone:'UTC',availableForCalls:false});
  assert.equal(forged.status,200);assert.equal((await forged.json()).data.id,users[0].id);
  const input={moduleId:'python-first-function',contentVersion:1,answers:{'python-return':'b','python-mixed':'c','python-empty':'a','python-return-position':'b'},requestId:randomUUID()};
  const first=await call('attempts/quiz',users[0],'POST',input);assert.equal(first.status,200);const attempt=(await first.json()).data;assert.equal(attempt.items.filter(x=>x.correct).length,4);
  const retry=await call('attempts/quiz',users[0],'POST',input);assert.equal((await retry.json()).data.id,attempt.id);
  const other=await call('progress',users[1]);assert.equal((await other.json()).data.quizAttempts.length,0);
  const conflict=await call('attempts/quiz',users[0],'POST',{...input,answers:{}});assert.equal(conflict.status,409);assert.equal((await conflict.json()).error.code,'CONFLICT');
  console.log('Next.js HTTP API PASS: public courses, missing/forged bearer rejection, identity from session, quiz persistence/retry/conflict, cross-user isolation.');
} finally {
  for(const user of users)await user.client.auth.signOut();
}
