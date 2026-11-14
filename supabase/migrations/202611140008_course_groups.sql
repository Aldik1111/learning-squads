-- Automatic course groups. Historical squads/attempts/calls remain stored.
create table public.ls_group_courses(course_id text primary key, module_id text not null, exercise_id text);
insert into public.ls_group_courses values ('python','python-first-function','python-count-completed'),('how-to-use-ai','ai-clear-requests',null);
create table public.ls_study_availability(user_id uuid primary key references auth.users(id), timezone text not null, windows jsonb not null, updated_at timestamptz not null default now());
create table public.ls_course_groups(id uuid primary key default gen_random_uuid(), course_id text not null references public.ls_group_courses, number integer not null, created_at timestamptz not null default now(), unique(course_id,number));
create table public.ls_course_group_members(id uuid primary key default gen_random_uuid(), group_id uuid not null references public.ls_course_groups, course_id text not null references public.ls_group_courses, user_id uuid not null references auth.users(id), joined_at timestamptz not null default now(), left_at timestamptz);
create unique index ls_one_active_course_group on public.ls_course_group_members(user_id,course_id) where left_at is null;
create index on public.ls_course_group_members(group_id) where left_at is null;
create table public.ls_course_enrollment_requests(user_id uuid not null references auth.users(id), request_id uuid not null, course_id text not null references public.ls_group_courses, primary key(user_id,request_id));
create table public.ls_group_messages(id uuid primary key default gen_random_uuid(), group_id uuid not null references public.ls_course_groups, author_id uuid not null references auth.users(id), request_id uuid not null, body text not null check(char_length(body) between 1 and 2000), created_at timestamptz not null default now(), unique(author_id,request_id));
create index on public.ls_group_messages(group_id,created_at);
create table public.ls_group_meetings(id uuid primary key default gen_random_uuid(), group_id uuid not null references public.ls_course_groups, starts_at timestamptz not null, ends_at timestamptz not null, status text not null default 'pending' check(status in ('pending','cancelled')), created_by uuid not null references auth.users(id), created_at timestamptz not null default now(), check(ends_at>=starts_at+interval '15 minutes'));
create unique index ls_group_meeting_slot on public.ls_group_meetings(group_id,starts_at,ends_at) where status<>'cancelled';
create table public.ls_group_meeting_requests(user_id uuid not null references auth.users(id), request_id uuid not null, meeting_id uuid not null references public.ls_group_meetings, primary key(user_id,request_id));
-- No provider URL column exists. Google Calendar remains authoritative.
do $$ declare t text; begin foreach t in array array['ls_group_courses','ls_study_availability','ls_course_groups','ls_course_group_members','ls_course_enrollment_requests','ls_group_messages','ls_group_meetings','ls_group_meeting_requests'] loop execute format('alter table public.%I enable row level security',t); execute format('revoke all on public.%I from anon, authenticated',t); end loop; end $$;

create function public.ls_validate_study_schedule(input jsonb) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare w jsonb; a jsonb; b jsonb;
begin
 if input is null or jsonb_typeof(input) is distinct from 'object' or jsonb_typeof(input->'timezone') is distinct from 'string' or not exists(select from pg_timezone_names where name=input->>'timezone') or jsonb_typeof(input->'windows') is distinct from 'array' then raise exception 'INVALID_INPUT'; end if;
 if jsonb_array_length(input->'windows') not between 1 and 100 then raise exception 'INVALID_INPUT'; end if;
 for w in select value from jsonb_array_elements(input->'windows') loop
  if jsonb_typeof(w) is distinct from 'object' or jsonb_typeof(w->'weekday') is distinct from 'number' or jsonb_typeof(w->'startMinute') is distinct from 'number' or jsonb_typeof(w->'endMinute') is distinct from 'number' then raise exception 'INVALID_INPUT'; end if;
  if (w->>'weekday')::numeric<>trunc((w->>'weekday')::numeric) or (w->>'startMinute')::numeric<>trunc((w->>'startMinute')::numeric) or (w->>'endMinute')::numeric<>trunc((w->>'endMinute')::numeric) or (w->>'weekday')::numeric not between 0 and 6 or (w->>'startMinute')::numeric<0 or (w->>'endMinute')::numeric>1440 or (w->>'endMinute')::numeric-(w->>'startMinute')::numeric<15 then raise exception 'INVALID_INPUT'; end if;
 end loop;
 if exists(select from jsonb_array_elements(input->'windows') with ordinality a(v,n),jsonb_array_elements(input->'windows') with ordinality b(v,n) where a.n<b.n and a.v->>'weekday'=b.v->>'weekday' and (a.v->>'startMinute')::int<(b.v->>'endMinute')::int and (b.v->>'startMinute')::int<(a.v->>'endMinute')::int) then raise exception 'INVALID_INPUT'; end if;
end $$;

-- Expand wall-clock windows into real instants. Skip nonexistent spring-forward
-- endpoints (round-trip check); ambiguous fall-back endpoints use PostgreSQL's
-- standard-time interpretation consistently. A 28-day horizon includes DST.
create function public.ls_user_study_ranges(user_id_value uuid,anchor timestamptz default statement_timestamp()) returns tstzmultirange language sql stable security definer set search_path=public,pg_temp as $$
 with local_windows as (
  select a.timezone, d.day::date+(w->>'startMinute')::int*interval '1 minute' as local_start,d.day::date+(w->>'endMinute')::int*interval '1 minute' as local_end
  from public.ls_study_availability a cross join lateral jsonb_array_elements(a.windows) w
  cross join lateral generate_series((anchor at time zone a.timezone)::date-1,(anchor at time zone a.timezone)::date+28,interval '1 day') d(day)
  where a.user_id=user_id_value and extract(dow from d.day)::int=(w->>'weekday')::int
 ), instants as(select *,local_start at time zone timezone as s,local_end at time zone timezone as e from local_windows)
 select coalesce(range_agg(tstzrange(greatest(s,anchor),least(e,anchor+interval '28 days'),'[)')),'{}'::tstzmultirange) from instants
 where s<e and e>anchor and s<anchor+interval '28 days' and s at time zone timezone=local_start and e at time zone timezone=local_end
$$;
create function public.ls_common_study_ranges(user_ids uuid[],anchor timestamptz default statement_timestamp()) returns tstzmultirange language plpgsql stable security definer set search_path=public,pg_temp as $$
declare u uuid; result tstzmultirange; r tstzmultirange;
begin
 if user_ids is null or cardinality(user_ids)=0 then return '{}'::tstzmultirange; end if;
 foreach u in array user_ids loop r:=public.ls_user_study_ranges(u,anchor); result:=case when result is null then r else result*r end; end loop;
 return coalesce((select range_agg(v) from unnest(result) v where upper(v)-lower(v)>=interval '15 minutes'),'{}'::tstzmultirange);
end $$;
create function public.ls_require_course_group(group_id_value uuid) returns uuid language plpgsql stable security definer set search_path=public,pg_temp as $$
declare u uuid:=public.ls_require_user();
begin if group_id_value is null then raise exception 'INVALID_INPUT'; end if; if not exists(select from public.ls_course_group_members where group_id=group_id_value and user_id=u and left_at is null) then raise exception 'FORBIDDEN'; end if; return u; end $$;
create function public.ls_course_group_json(group_id_value uuid) returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select jsonb_build_object('id',g.id,'number',g.number,'courseId',g.course_id,'createdAt',g.created_at,
 'members',coalesce((select jsonb_agg(jsonb_build_object('userId',m.user_id,'name',p.name,'joinedAt',m.joined_at) order by m.joined_at,m.user_id) from public.ls_course_group_members m join public.ls_profiles p on p.id=m.user_id where m.group_id=g.id and m.left_at is null),'[]'::jsonb),
 'commonWindows',coalesce((select jsonb_agg(jsonb_build_object('startsAt',lower(r),'endsAt',upper(r)) order by lower(r)) from unnest(public.ls_common_study_ranges(array(select user_id from public.ls_course_group_members where group_id=g.id and left_at is null))) r),'[]'::jsonb),
 'status',case when (select count(*) from public.ls_course_group_members where group_id=g.id and left_at is null)>=2 and public.ls_common_study_ranges(array(select user_id from public.ls_course_group_members where group_id=g.id and left_at is null))<>'{}'::tstzmultirange then 'ready' else 'waiting' end)
 from public.ls_course_groups g where g.id=group_id_value
$$;
create function public.ls_get_course_group(group_id_value uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$ begin perform public.ls_require_course_group(group_id_value);return public.ls_course_group_json(group_id_value); end $$;
create function public.ls_get_my_course_groups() returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=public.ls_require_user(); begin return coalesce((select jsonb_agg(public.ls_course_group_json(group_id) order by joined_at) from public.ls_course_group_members where user_id=u and left_at is null),'[]'::jsonb); end $$;
create function public.ls_get_study_availability() returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=public.ls_require_user(); begin return (select jsonb_build_object('timezone',timezone,'windows',windows,'updatedAt',updated_at) from public.ls_study_availability where user_id=u); end $$;

-- Caller holds its user lock and the course lock. Existing groups are checked
-- against ALL active members, never a pairwise-only approximation.
create function public.ls_reconcile_group_meetings(group_id_value uuid) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare users uuid[]; available tstzmultirange;
begin
 select array_agg(user_id) into users from public.ls_course_group_members where group_id=group_id_value and left_at is null;
 available:=public.ls_common_study_ranges(users);
 update public.ls_group_meetings set status='cancelled' where group_id=group_id_value and status='pending' and starts_at>clock_timestamp() and (coalesce(cardinality(users),0)<2 or not (available @> tstzrange(starts_at,ends_at,'[)')));
end $$;
create function public.ls_assign_course_group(user_id_value uuid,course_id_value text) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare g public.ls_course_groups; users uuid[]; selected_id uuid;
begin
 select group_id into selected_id from public.ls_course_group_members where user_id=user_id_value and course_id=course_id_value and left_at is null;
 if found then return selected_id; end if;
 for g in select * from public.ls_course_groups where course_id=course_id_value order by number for update loop
  select array_agg(user_id) into users from public.ls_course_group_members where group_id=g.id and left_at is null;
  if cardinality(users) between 1 and 3 and public.ls_common_study_ranges(users||user_id_value)<>'{}'::tstzmultirange then selected_id:=g.id;exit; end if;
 end loop;
 if selected_id is null then insert into public.ls_course_groups(course_id,number) select course_id_value,coalesce(max(number),0)+1 from public.ls_course_groups where course_id=course_id_value returning id into selected_id; end if;
 insert into public.ls_course_group_members(group_id,course_id,user_id) values(selected_id,course_id_value,user_id_value);
 perform public.ls_reconcile_group_meetings(selected_id);
 return selected_id;
end $$;
create function public.ls_enroll_course(course_id_value text,request_id_value uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=public.ls_require_user(); previous_course text; g uuid;
begin
 if course_id_value is null or request_id_value is null then raise exception 'INVALID_INPUT'; end if;
 if not exists(select from public.ls_group_courses where course_id=course_id_value) then raise exception 'INVALID_INPUT'; end if;
 perform pg_advisory_xact_lock(hashtextextended('study-user:'||u::text,0));
 perform pg_advisory_xact_lock(hashtextextended('study-course:'||course_id_value,0));
 perform public.ls_get_profile();
 if not exists(select from public.ls_study_availability where user_id=u) then raise exception 'AVAILABILITY_REQUIRED'; end if;
 select course_id into previous_course from public.ls_course_enrollment_requests where user_id=u and request_id=request_id_value;
 if found and previous_course<>course_id_value then raise exception 'CONFLICT'; end if;
 insert into public.ls_course_enrollment_requests values(u,request_id_value,course_id_value) on conflict do nothing;
 g:=public.ls_assign_course_group(u,course_id_value); return public.ls_course_group_json(g);
end $$;
create function public.ls_update_study_availability(input jsonb) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=public.ls_require_user(); c text; m record; members uuid[]; affected_groups uuid[];
begin
 perform public.ls_validate_study_schedule(input);
 perform pg_advisory_xact_lock(hashtextextended('study-user:'||u::text,0));
 -- Sorted course locks prevent cross-course deadlocks during reassignment.
 for c in select course_id from public.ls_course_group_members where user_id=u and left_at is null order by course_id loop perform pg_advisory_xact_lock(hashtextextended('study-course:'||c,0)); end loop;
 select array_agg(distinct group_id) into affected_groups from public.ls_course_group_members where user_id=u;
 perform public.ls_get_profile();
 insert into public.ls_study_availability(user_id,timezone,windows) values(u,input->>'timezone',input->'windows') on conflict(user_id) do update set timezone=excluded.timezone,windows=excluded.windows,updated_at=clock_timestamp();
 for m in select * from public.ls_course_group_members where user_id=u and left_at is null order by course_id loop
  select array_agg(user_id) into members from public.ls_course_group_members where group_id=m.group_id and left_at is null;
  if public.ls_common_study_ranges(members)='{}'::tstzmultirange then
   update public.ls_course_group_members set left_at=clock_timestamp() where id=m.id;
   perform public.ls_assign_course_group(u,m.course_id);
  end if;
  perform public.ls_reconcile_group_meetings(m.group_id);
 end loop;
 -- Operational IDs only; HTTP strips this field after provider cleanup.
 return public.ls_get_study_availability()||jsonb_build_object('_cancelledMeetings',coalesce((select jsonb_agg(jsonb_build_object('id',id,'groupId',group_id)) from public.ls_group_meetings where group_id=any(affected_groups) and status='cancelled' and starts_at>clock_timestamp()),'[]'::jsonb));
end $$;
create function public.ls_get_group_messages(group_id_value uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
begin perform public.ls_require_course_group(group_id_value); return coalesce((select jsonb_agg(jsonb_build_object('id',x.id,'groupId',x.group_id,'authorId',x.author_id,'authorName',p.name,'body',x.body,'createdAt',x.created_at) order by x.created_at,x.id) from (select * from public.ls_group_messages where group_id=group_id_value order by created_at desc,id desc limit 100) x join public.ls_profiles p on p.id=x.author_id),'[]'::jsonb); end $$;
create function public.ls_send_group_message(group_id_value uuid,body_value text,request_id_value uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=public.ls_require_user(); m public.ls_group_messages; c text;
begin
 if group_id_value is null or request_id_value is null or body_value is null or char_length(trim(body_value)) not between 1 and 2000 then raise exception 'INVALID_INPUT'; end if;
 select course_id into c from public.ls_course_groups where id=group_id_value;
 perform pg_advisory_xact_lock(hashtextextended('study-course:'||coalesce(c,''),0));perform public.ls_require_course_group(group_id_value);
 perform pg_advisory_xact_lock(hashtextextended('group-message:'||u::text||request_id_value::text,0));
 select * into m from public.ls_group_messages where author_id=u and request_id=request_id_value;
 if found then if m.group_id<>group_id_value or m.body<>trim(body_value) then raise exception 'CONFLICT'; end if;
 else insert into public.ls_group_messages(group_id,author_id,request_id,body) values(group_id_value,u,request_id_value,trim(body_value)) returning * into m; end if;
 return jsonb_build_object('id',m.id,'groupId',m.group_id,'authorId',m.author_id,'authorName',(select name from public.ls_profiles where id=u),'body',m.body,'createdAt',m.created_at);
end $$;
create function public.ls_get_group_progress(group_id_value uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare result jsonb; begin
 perform public.ls_require_course_group(group_id_value);
 select coalesce(jsonb_agg(jsonb_build_object('userId',m.user_id,'name',p.name,'modules',jsonb_build_array(jsonb_build_object('moduleId',c.module_id,
 'quizAttemptCount',(select count(*) from public.ls_quiz_attempts where user_id=m.user_id and module_id=c.module_id),
 'latestQuizScore',case when q.feedback is null then null else (select count(*) from jsonb_array_elements(q.feedback) f where (f->>'correct')::boolean) end,
 'latestQuizTotal',jsonb_array_length(q.feedback),'pythonPassed',py.passed,'pythonTotal',py.total,'practiceSeconds',0))) order by m.joined_at), '[]'::jsonb) into result
 from public.ls_course_group_members m join public.ls_profiles p on p.id=m.user_id join public.ls_group_courses c on c.course_id=m.course_id
 left join lateral(select feedback from public.ls_quiz_attempts where user_id=m.user_id and module_id=c.module_id order by submitted_at desc,id desc limit 1) q on true
 left join lateral(select passed,total from public.ls_python_attempts where user_id=m.user_id and exercise_id=c.exercise_id order by submitted_at desc,id desc limit 1) py on true
 where m.group_id=group_id_value and m.left_at is null;
 return result;
end $$;
create function public.ls_group_meeting_json(m public.ls_group_meetings) returns jsonb language sql stable security definer set search_path=public,pg_temp as $$ select jsonb_build_object('id',m.id,'groupId',m.group_id,'startsAt',m.starts_at,'endsAt',m.ends_at,'status',m.status,'meetUrl',null,'createdBy',m.created_by,'createdAt',m.created_at) $$;
create function public.ls_ensure_group_meeting(group_id_value uuid,actor uuid) returns public.ls_group_meetings language plpgsql security definer set search_path=public,pg_temp as $$
declare users uuid[]; available tstzmultirange; slot tstzrange; m public.ls_group_meetings; c text;
begin
 select course_id into c from public.ls_course_groups where id=group_id_value;
 perform pg_advisory_xact_lock(hashtextextended('study-course:'||coalesce(c,''),0));
 perform public.ls_require_course_group(group_id_value);
 perform public.ls_reconcile_group_meetings(group_id_value);
 select array_agg(user_id) into users from public.ls_course_group_members where group_id=group_id_value and left_at is null;
 if cardinality(users)<2 then return null; end if;
 available:=public.ls_common_study_ranges(users);
 select * into m from public.ls_group_meetings where group_id=group_id_value and status='pending' and ends_at>clock_timestamp() order by starts_at limit 1;
 if found then return m; end if;
 select r into slot from unnest(available) r order by lower(r) limit 1;
 if slot is null then return null; end if;
 insert into public.ls_group_meetings(group_id,starts_at,ends_at,created_by) values(group_id_value,lower(slot),lower(slot)+interval '15 minutes',actor) returning * into m;
 return m;
end $$;
create function public.ls_get_group_meetings(group_id_value uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=public.ls_require_course_group(group_id_value); begin perform public.ls_ensure_group_meeting(group_id_value,u); return coalesce((select jsonb_agg(public.ls_group_meeting_json(m) order by m.starts_at desc) from (select * from public.ls_group_meetings where group_id=group_id_value order by starts_at desc limit 30) m),'[]'::jsonb); end $$;
create function public.ls_create_group_meeting(group_id_value uuid,request_id_value uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=public.ls_require_course_group(group_id_value); m public.ls_group_meetings;
begin
 if request_id_value is null then raise exception 'INVALID_INPUT'; end if;
 perform pg_advisory_xact_lock(hashtextextended('group-meeting:'||u::text||request_id_value::text,0));
 select x.* into m from public.ls_group_meeting_requests r join public.ls_group_meetings x on x.id=r.meeting_id where r.user_id=u and r.request_id=request_id_value;
 if found then if m.group_id<>group_id_value then raise exception 'CONFLICT'; end if;return public.ls_group_meeting_json(m);end if;
 m:=public.ls_ensure_group_meeting(group_id_value,u);if m.id is null then raise exception 'NO_AVAILABLE_PARTNER';end if;
 insert into public.ls_group_meeting_requests values(u,request_id_value,m.id);return public.ls_group_meeting_json(m);
end $$;

-- Revoke legacy manual group discovery/mutation and client-authored Meet links.
revoke execute on function public.ls_find_squads(text,text),public.ls_create_squad(jsonb,uuid),public.ls_join_squad(uuid),public.ls_leave_squad(uuid),public.ls_set_meet(uuid,text) from public,anon,authenticated;
-- Group calls now originate only in automatic course groups; language matching remains.
alter function public.ls_create_call(text,text,uuid,text,uuid[]) rename to ls_legacy_create_call;
revoke all on function public.ls_legacy_create_call(text,text,uuid,text,uuid[]) from public,anon,authenticated;
create function public.ls_create_call(kind_value text,target_value text,request_id_value uuid,module_id_value text default null,recipient_ids_value uuid[] default null) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
begin if kind_value is distinct from 'language' then raise exception 'FORBIDDEN';end if;return public.ls_legacy_create_call(kind_value,target_value,request_id_value,module_id_value,recipient_ids_value);end $$;
-- API checks provider readiness before recording a transition. The own-user
-- timestamp is still an untrusted click, never proof of presence in Google Meet.
create or replace function public.ls_record_transition(call_id_value uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare c jsonb;u uuid:=public.ls_require_user();begin c:=public.ls_get_call(call_id_value);if c->>'kind'<>'language' then raise exception 'FORBIDDEN';end if;update public.ls_call_participants set transitioned_at=coalesce(transitioned_at,clock_timestamp()) where call_id=call_id_value and user_id=u;return public.ls_get_call(call_id_value);end $$;
-- New helpers default to PUBLIC execute in PostgreSQL; revoke every one first.
do $$ declare fn record; begin for fn in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('ls_reconcile_group_meetings','ls_validate_study_schedule','ls_user_study_ranges','ls_common_study_ranges','ls_require_course_group','ls_course_group_json','ls_get_course_group','ls_get_my_course_groups','ls_get_study_availability','ls_assign_course_group','ls_enroll_course','ls_update_study_availability','ls_get_group_messages','ls_send_group_message','ls_get_group_progress','ls_group_meeting_json','ls_ensure_group_meeting','ls_get_group_meetings','ls_create_group_meeting','ls_create_call') loop execute format('revoke all on function %s from public,anon,authenticated',fn.signature);end loop;end $$;
grant execute on function public.ls_get_course_group(uuid),public.ls_get_my_course_groups(),public.ls_get_study_availability(),public.ls_enroll_course(text,uuid),public.ls_update_study_availability(jsonb),public.ls_get_group_messages(uuid),public.ls_send_group_message(uuid,text,uuid),public.ls_get_group_progress(uuid),public.ls_get_group_meetings(uuid),public.ls_create_group_meeting(uuid,uuid),public.ls_create_call(text,text,uuid,text,uuid[]) to authenticated;
