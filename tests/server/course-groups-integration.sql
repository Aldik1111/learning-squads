\set ON_ERROR_STOP on
begin;
insert into auth.users(id) select ('20000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid from generate_series(1,5)n;
set local role authenticated;
do $$
declare a jsonb;b jsonb;c jsonb;ai jsonb;msg jsonb;meetings jsonb;old_group uuid;new_group uuid;attempt jsonb;
begin
 perform set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000001',true);
 if public.ls_get_study_availability() is not null then raise exception 'new schedule not null';end if;
 begin perform public.ls_enroll_course('python',gen_random_uuid());raise exception 'enrolled without schedule';exception when raise_exception then if sqlerrm<>'AVAILABILITY_REQUIRED' then raise;end if;end;
 begin perform public.ls_update_study_availability(null);raise exception 'null schedule accepted';exception when raise_exception then if sqlerrm<>'INVALID_INPUT' then raise;end if;end;
 begin perform public.ls_update_study_availability('{"timezone":"Fake/Zone","windows":[]}');raise exception 'invalid timezone accepted';exception when raise_exception then if sqlerrm<>'INVALID_INPUT' then raise;end if;end;
 begin perform public.ls_update_study_availability('{"timezone":"UTC","windows":[{"weekday":1,"startMinute":0,"endMinute":30},{"weekday":1,"startMinute":15,"endMinute":45}]}');raise exception 'overlap accepted';exception when raise_exception then if sqlerrm<>'INVALID_INPUT' then raise;end if;end;
 perform public.ls_update_study_availability('{"timezone":"UTC","windows":[{"weekday":1,"startMinute":540,"endMinute":660},{"weekday":2,"startMinute":540,"endMinute":660}]}');
 begin perform public.ls_enroll_course('spanish',gen_random_uuid());raise exception 'language enrolled into group';exception when raise_exception then if sqlerrm<>'INVALID_INPUT' then raise;end if;end;
 a:=public.ls_enroll_course('python','50000000-0000-4000-8000-000000000001');old_group:=(a->>'id')::uuid;
 if a->>'number'<>'1' or a->>'status'<>'waiting' then raise exception 'first automatic numbered group failed';end if;
 if public.ls_enroll_course('python','50000000-0000-4000-8000-000000000001')->>'id'<>a->>'id' then raise exception 'enroll replay duplicated';end if;
 if public.ls_enroll_course('python',gen_random_uuid())->>'id'<>a->>'id' then raise exception 'one active group per course failed';end if;
 begin perform public.ls_enroll_course('how-to-use-ai','50000000-0000-4000-8000-000000000001');raise exception 'request payload conflict accepted';exception when raise_exception then if sqlerrm<>'CONFLICT' then raise;end if;end;
 ai:=public.ls_enroll_course('how-to-use-ai',gen_random_uuid());
 msg:=public.ls_send_group_message(old_group,'Hello group','60000000-0000-4000-8000-000000000001');
 if public.ls_send_group_message(old_group,'Hello group','60000000-0000-4000-8000-000000000001')<>msg then raise exception 'chat replay failed';end if;
 begin perform public.ls_send_group_message(old_group,'Other body','60000000-0000-4000-8000-000000000001');raise exception 'chat conflict accepted';exception when raise_exception then if sqlerrm<>'CONFLICT' then raise;end if;end;
 attempt:=public.ls_submit_quiz('python-first-function',1,'{"python-return":"b","python-mixed":"c","python-empty":"a","python-return-position":"b"}',gen_random_uuid());
 perform set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000002',true);
 perform public.ls_update_study_availability('{"timezone":"UTC","windows":[{"weekday":1,"startMinute":540,"endMinute":600}]}');
 b:=public.ls_enroll_course('python',gen_random_uuid());if b->>'id'<>a->>'id' or b->>'status'<>'ready' then raise exception 'matching member not assigned';end if;
 if jsonb_array_length(public.ls_get_group_messages(old_group))<>1 then raise exception 'member chat read failed';end if;
 if (public.ls_get_group_progress(old_group)->0->'modules'->0->>'latestQuizScore')::int<>4 then raise exception 'group progress aggregate failed';end if;
 if public.ls_get_group_progress(old_group)::text like '%correctOptionId%' then raise exception 'private quiz answers leaked';end if;
 meetings:=public.ls_get_group_meetings(old_group);if jsonb_array_length(meetings)<>1 or meetings->0->>'meetUrl' is not null then raise exception 'meeting scheduling or provider boundary failed';end if;
 if public.ls_get_group_meetings(old_group)->0->>'id'<>meetings->0->>'id' then raise exception 'automatic meeting duplicated';end if;
 if jsonb_array_length(public.ls_get_cancelled_group_meetings(old_group,array[(meetings->0->>'id')::uuid]))<>0 then raise exception 'valid meeting authorized for deletion';end if;
 if public.ls_create_group_meeting(old_group,gen_random_uuid())->>'id'<>meetings->0->>'id' then raise exception 'overlapping duplicate meeting created';end if;
 perform set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000003',true);
 perform public.ls_update_study_availability('{"timezone":"UTC","windows":[{"weekday":1,"startMinute":600,"endMinute":660}]}');
 c:=public.ls_enroll_course('python',gen_random_uuid());if c->>'id'=a->>'id' or c->>'number'<>'2' then raise exception 'pairwise-only match bypassed ALL-member overlap';end if;
 begin perform public.ls_get_course_group(old_group);raise exception 'foreign group leaked';exception when raise_exception then if sqlerrm<>'FORBIDDEN' then raise;end if;end;
 begin perform public.ls_get_group_messages(old_group);raise exception 'foreign chat leaked';exception when raise_exception then if sqlerrm<>'FORBIDDEN' then raise;end if;end;
 begin perform public.ls_send_group_message(old_group,'intruder',gen_random_uuid());raise exception 'foreign chat write accepted';exception when raise_exception then if sqlerrm<>'FORBIDDEN' then raise;end if;end;
 begin perform public.ls_get_group_progress(old_group);raise exception 'foreign progress leaked';exception when raise_exception then if sqlerrm<>'FORBIDDEN' then raise;end if;end;
 begin perform public.ls_get_cancelled_group_meetings(old_group,array[(meetings->0->>'id')::uuid]);raise exception 'foreign cleanup permitted';exception when raise_exception then if sqlerrm<>'FORBIDDEN' then raise;end if;end;
 begin perform public.ls_get_group_meetings(old_group);raise exception 'foreign calendar leaked';exception when raise_exception then if sqlerrm<>'FORBIDDEN' then raise;end if;end;
 begin perform * from public.ls_group_messages;raise exception 'direct chat read accepted';exception when insufficient_privilege then null;end;
 begin perform public.ls_course_group_json(old_group);raise exception 'private group helper executable';exception when insufficient_privilege then null;end;
 begin perform public.ls_find_squads();raise exception 'legacy browse accessible';exception when insufficient_privilege then null;end;
 begin perform public.ls_create_squad('{}',gen_random_uuid());raise exception 'manual group create accessible';exception when insufficient_privilege then null;end;
 begin perform public.ls_set_meet(gen_random_uuid(),'https://meet.google.com/abc-defg-hij');raise exception 'manual Meet accessible';exception when insufficient_privilege then null;end;
 begin perform public.ls_create_call('squad',old_group::text,gen_random_uuid());raise exception 'manual squad call accessible';exception when raise_exception then if sqlerrm<>'FORBIDDEN' then raise;end if;end;
 perform set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000004',true);
 perform public.ls_update_study_availability('{"timezone":"UTC","windows":[{"weekday":2,"startMinute":540,"endMinute":600}]}');
 if public.ls_enroll_course('how-to-use-ai',gen_random_uuid())->>'id'<>ai->>'id' then raise exception 'AI grouping failed';end if;
 perform set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000001',true);
 b:=public.ls_update_study_availability('{"timezone":"UTC","windows":[{"weekday":2,"startMinute":540,"endMinute":600}]}');
 if jsonb_array_length(b->'_cancelledMeetings')<>1 then raise exception 'cancelled meeting cleanup IDs missing';end if;
 select (x->>'id')::uuid into new_group from jsonb_array_elements(public.ls_get_my_course_groups()) x where x->>'courseId'='python';
 if new_group=old_group then raise exception 'incompatible schedule not reassigned';end if;
 b:=public.ls_update_study_availability('{"timezone":"UTC","windows":[{"weekday":2,"startMinute":540,"endMinute":600}]}');
 if jsonb_array_length(b->'_cancelledMeetings')<>1 then raise exception 'cancel cleanup retry lost former group IDs';end if;
 if not exists(select from jsonb_array_elements(public.ls_get_my_course_groups()) x where x->>'id'=ai->>'id') then raise exception 'compatible other course changed';end if;
 if jsonb_array_length(public.ls_get_progress()->'quizAttempts')<>1 then raise exception 'learning history lost on reassignment';end if;
 if jsonb_array_length(public.ls_get_cancelled_group_meetings(old_group,array[(meetings->0->>'id')::uuid]))<>1 then raise exception 'former member cannot reconcile authorized cancelled meeting';end if;
 begin perform public.ls_get_group_messages(old_group);raise exception 'former member retained chat access';exception when raise_exception then if sqlerrm<>'FORBIDDEN' then raise;end if;end;
 begin perform public.ls_get_group_meetings(old_group);raise exception 'former member retained calendar access';exception when raise_exception then if sqlerrm<>'FORBIDDEN' then raise;end if;end;
 perform set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000002',true);
 if public.ls_get_group_meetings(old_group)->0->>'status'<>'cancelled' then raise exception 'invalid future meeting not cancelled';end if;
 -- Spanish remains a language-partner flow, independent of group enrollment.
 perform public.ls_update_profile('{"name":"Native QA","track":"spanish","level":"beginner","primaryLanguage":"qaa-groups","knownLanguages":["es"],"timezone":"UTC","availableForCalls":true}');
 perform set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000005',true);
 perform public.ls_get_profile();
 c:=public.ls_create_call('language','qaa-groups',gen_random_uuid(),null);
 if c->>'kind'<>'language' then raise exception 'language partner flow removed';end if;
 raise notice 'Automatic groups, ALL-member matching, private chat/progress/calendar, reassignment, historical attempts and language exception PASS';
end $$;
reset role;
-- Cleanup must not reveal newer meetings created after this guest left.
insert into public.ls_group_meetings(id,group_id,starts_at,ends_at,status,created_by,created_at)
select '90000000-0000-4000-8000-000000000099',group_id,clock_timestamp()+interval '1 day',clock_timestamp()+interval '1 day 15 minutes','cancelled','20000000-0000-4000-8000-000000000002',left_at+interval '1 second'
from public.ls_course_group_members where user_id='20000000-0000-4000-8000-000000000001' and course_id='python' and left_at is not null;
set local role authenticated;
do $$ declare old_group uuid;begin
 perform set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000001',true);
 -- The ID was known during membership; no general calendar read is permitted.
 select (value->>'groupId')::uuid into old_group from jsonb_array_elements(public.ls_update_study_availability('{"timezone":"UTC","windows":[{"weekday":2,"startMinute":540,"endMinute":600}]}')->'_cancelledMeetings') limit 1;
 if jsonb_array_length(public.ls_get_cancelled_group_meetings(old_group,array['90000000-0000-4000-8000-000000000099'::uuid]))<>0 then raise exception 'cleanup exposed post-departure calendar row';end if;
end $$;
reset role;
-- DST is tested with explicit anchors, not the machine's current date.
insert into public.ls_study_availability(user_id,timezone,windows) values('20000000-0000-4000-8000-000000000005','America/New_York','[{"weekday":0,"startMinute":120,"endMinute":150}]');
do $$ declare ranges tstzmultirange;begin
 ranges:=public.ls_user_study_ranges('20000000-0000-4000-8000-000000000005','2026-03-07T00:00:00Z');
 if exists(select from unnest(ranges) r where lower(r)::date='2026-03-08') then raise exception 'nonexistent DST wall-time silently shifted';end if;
 if (select count(*) from unnest(ranges))<>3 then raise exception 'unexpected spring DST occurrence count';end if;
 update public.ls_study_availability set windows='[{"weekday":0,"startMinute":60,"endMinute":90}]' where user_id='20000000-0000-4000-8000-000000000005';
 ranges:=public.ls_user_study_ranges('20000000-0000-4000-8000-000000000005','2026-10-31T00:00:00Z');
 if not (ranges @> '2026-11-01T06:15:00Z'::timestamptz) or ranges @> '2026-11-01T05:15:00Z'::timestamptz then raise exception 'ambiguous DST standard-time policy failed';end if;
 raise notice 'DST spring gap and autumn repeated time policy PASS';
end $$;
set local role anon;
do $$ begin begin perform public.ls_get_my_course_groups();raise exception 'anon database role got group access';exception when insufficient_privilege then null;end;end $$;
rollback;
