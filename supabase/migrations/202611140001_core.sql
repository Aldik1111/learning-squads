-- Learning Squads: standalone project. No service-role credential is required by the app.
create table public.ls_profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 name text not null default 'Guest' check(char_length(name) between 1 and 80),
 track text not null default 'python' check(track in ('python','how-to-use-ai','spanish')),
 level text not null default 'beginner' check(level in ('beginner','intermediate','advanced')),
 primary_language text not null default 'en', known_languages text[] not null default '{}',
 timezone text not null default 'UTC', available boolean not null default false,
 last_active_at timestamptz not null default now()
);
create table public.ls_content_versions (
 module_id text not null, content_version integer not null, quiz jsonb not null,
 primary key(module_id, content_version)
);
create table public.ls_quiz_attempts (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 request_id uuid not null, module_id text not null, content_version integer not null,
 answers jsonb not null, feedback jsonb not null, submitted_at timestamptz not null default now(),
 unique(user_id, request_id), foreign key(module_id,content_version) references public.ls_content_versions
);
create table public.ls_python_attempts (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 request_id uuid not null, exercise_id text not null, exercise_version integer not null,
 passed integer not null check(passed >= 0), total integer not null check(total >= passed),
 submitted_at timestamptz not null default now(), unique(user_id, request_id)
);
create table public.ls_squads (
 id uuid primary key default gen_random_uuid(), name text not null check(char_length(name) between 1 and 80),
 track text not null check(track in ('python','how-to-use-ai','spanish')),
 level text not null check(level in ('beginner','intermediate','advanced')),
 created_by uuid not null references auth.users(id), request_id uuid not null,
 created_at timestamptz not null default now(), unique(created_by,request_id)
);
create table public.ls_memberships (
 squad_id uuid references public.ls_squads(id) on delete cascade, user_id uuid references auth.users(id) on delete cascade,
 joined_at timestamptz not null default now(), primary key(squad_id,user_id)
);
create table public.ls_calls (
 id uuid primary key default gen_random_uuid(), kind text not null check(kind in ('language','squad')),
 created_by uuid not null references auth.users(id), request_id uuid not null,
 squad_id uuid references public.ls_squads(id), language text, meet_url text, module_id text,
 created_at timestamptz not null default now(), unique(created_by,request_id)
);
create table public.ls_call_participants (
 call_id uuid references public.ls_calls(id) on delete cascade, user_id uuid references auth.users(id) on delete cascade,
 transitioned_at timestamptz, practice_ended_at timestamptz, primary key(call_id,user_id)
);
create table public.ls_invitations (
 id uuid primary key default gen_random_uuid(), call_id uuid references public.ls_calls(id) on delete cascade,
 sender_id uuid not null references auth.users(id), recipient_id uuid not null references auth.users(id),
 status text not null default 'pending' check(status in ('pending','accepted','declined','cancelled','expired')),
 created_at timestamptz not null default now(), expires_at timestamptz not null default (now()+interval '10 minutes'),
 read_at timestamptz, unique(call_id,recipient_id), check(sender_id <> recipient_id)
);
create index on public.ls_invitations(recipient_id,created_at desc);
create index on public.ls_profiles(primary_language,last_active_at) where available;

-- All application access goes through narrowly scoped auth.uid()-checked functions.
alter table public.ls_profiles enable row level security;
alter table public.ls_content_versions enable row level security;
alter table public.ls_quiz_attempts enable row level security;
alter table public.ls_python_attempts enable row level security;
alter table public.ls_squads enable row level security;
alter table public.ls_memberships enable row level security;
alter table public.ls_calls enable row level security;
alter table public.ls_call_participants enable row level security;
alter table public.ls_invitations enable row level security;
revoke all on public.ls_profiles,public.ls_content_versions,public.ls_quiz_attempts,public.ls_python_attempts,public.ls_squads,public.ls_memberships,public.ls_calls,public.ls_call_participants,public.ls_invitations from anon,authenticated;

create function public.ls_require_user() returns uuid language plpgsql stable security definer set search_path=public,pg_temp as $$
begin if auth.uid() is null then raise exception 'SESSION_REQUIRED'; end if; return auth.uid(); end $$;

create function public.ls_profile_json(p public.ls_profiles) returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select jsonb_build_object('id',p.id,'name',p.name,'track',p.track,'level',p.level,'primaryLanguage',p.primary_language,'knownLanguages',to_jsonb(p.known_languages),'timezone',p.timezone,'availableForCalls',p.available)
$$;
create function public.ls_get_profile() returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid := public.ls_require_user(); p public.ls_profiles;
begin insert into public.ls_profiles(id) values(u) on conflict do nothing; select * into p from public.ls_profiles where id=u; return public.ls_profile_json(p); end $$;
create function public.ls_update_profile(input jsonb) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid := public.ls_require_user(); p public.ls_profiles;
begin
 if jsonb_typeof(input->'knownLanguages') <> 'array' or jsonb_array_length(input->'knownLanguages') > 50 then raise exception 'INVALID_INPUT'; end if;
 if char_length(input->>'primaryLanguage') not between 2 and 35 or not exists(select from pg_timezone_names where name=input->>'timezone') then raise exception 'INVALID_INPUT'; end if;
 insert into public.ls_profiles(id,name,track,level,primary_language,known_languages,timezone,available)
 values(u,trim(input->>'name'),input->>'track',input->>'level',input->>'primaryLanguage',array(select jsonb_array_elements_text(input->'knownLanguages')),input->>'timezone',(input->>'availableForCalls')::boolean)
 on conflict(id) do update set name=excluded.name,track=excluded.track,level=excluded.level,primary_language=excluded.primary_language,known_languages=excluded.known_languages,timezone=excluded.timezone,available=excluded.available,last_active_at=now()
 returning * into p; return public.ls_profile_json(p);
end $$;
create function public.ls_availability(available_value boolean default null) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid := public.ls_require_user(); p public.ls_profiles;
begin perform public.ls_get_profile(); update public.ls_profiles set available=coalesce(available_value,available),last_active_at=now() where id=u returning * into p; return public.ls_profile_json(p); end $$;

create function public.ls_attempt_json(a public.ls_quiz_attempts) returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select jsonb_build_object('id',a.id,'moduleId',a.module_id,'contentVersion',a.content_version,'answers',a.answers,'items',a.feedback,'submittedAt',a.submitted_at)
$$;
create function public.ls_submit_quiz(module_id_value text,version_value integer,answers_value jsonb,request_id_value uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid := public.ls_require_user(); a public.ls_quiz_attempts; questions jsonb; q jsonb; feedback jsonb := '[]';
begin
 perform pg_advisory_xact_lock(hashtextextended(u::text||request_id_value::text,0));
 select * into a from public.ls_quiz_attempts where user_id=u and request_id=request_id_value;
 if found then
  if a.module_id<>module_id_value or a.content_version<>version_value or a.answers<>answers_value then raise exception 'CONFLICT'; end if;
  return public.ls_attempt_json(a);
 end if;
 select quiz into questions from public.ls_content_versions where module_id=module_id_value and content_version=version_value;
 if not found then raise exception 'NOT_FOUND'; end if;
 if jsonb_typeof(answers_value)<>'object' then raise exception 'INVALID_INPUT'; end if;
 if (select count(*) from jsonb_object_keys(answers_value))<>jsonb_array_length(questions) then raise exception 'INVALID_INPUT'; end if;
 for q in select * from jsonb_array_elements(questions) loop
  if not exists(select from jsonb_array_elements(q->'options') opt where opt->>'id'=answers_value->>(q->>'id')) then raise exception 'INVALID_INPUT'; end if;
  feedback:=feedback||jsonb_build_array(jsonb_build_object('questionId',q->>'id','correctOptionId',q->>'correctOptionId','correct',(answers_value->>(q->>'id'))=(q->>'correctOptionId'),'explanation',q->>'explanation'));
 end loop;
 insert into public.ls_quiz_attempts(user_id,request_id,module_id,content_version,answers,feedback) values(u,request_id_value,module_id_value,version_value,answers_value,feedback) returning * into a;
 return public.ls_attempt_json(a);
end $$;
create function public.ls_python_json(a public.ls_python_attempts) returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select jsonb_build_object('id',a.id,'exerciseId',a.exercise_id,'exerciseVersion',a.exercise_version,'passed',a.passed,'total',a.total,'submittedAt',a.submitted_at,'source','self-check')
$$;
create function public.ls_submit_python(exercise_id_value text,version_value integer,passed_value integer,total_value integer,request_id_value uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid := public.ls_require_user(); a public.ls_python_attempts;
begin
 perform pg_advisory_xact_lock(hashtextextended(u::text||request_id_value::text,0));
 select * into a from public.ls_python_attempts where user_id=u and request_id=request_id_value;
 if found then
  if a.exercise_id<>exercise_id_value or a.exercise_version<>version_value or a.passed<>passed_value or a.total<>total_value then raise exception 'CONFLICT'; end if;
  return public.ls_python_json(a);
 end if;
 if exercise_id_value<>'python-count-completed' or version_value<>1 or total_value<>6 then raise exception 'INVALID_INPUT'; end if;
 insert into public.ls_python_attempts(user_id,request_id,exercise_id,exercise_version,passed,total) values(u,request_id_value,exercise_id_value,version_value,passed_value,total_value) returning * into a;
 return public.ls_python_json(a);
end $$;
create function public.ls_practice_progress() returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select coalesce(jsonb_agg(jsonb_build_object('moduleId',module_id,'seconds',seconds,'minimumPracticeMinutes',15)),'[]'::jsonb)
 from (
   select module_id, floor(sum(extract(epoch from upper(r)-lower(r))))::integer as seconds
   from (
     select c.module_id, unnest(range_agg(tstzrange(p.transitioned_at,p.practice_ended_at,'[)'))) as r
     from public.ls_call_participants p join public.ls_calls c on c.id=p.call_id
     where p.user_id=auth.uid() and c.module_id is not null and p.transitioned_at is not null and p.practice_ended_at is not null
     group by c.module_id
   ) intervals group by module_id
 ) totals
$$;
create function public.ls_get_progress() returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid := public.ls_require_user();
begin return jsonb_build_object('quizAttempts',coalesce((select jsonb_agg(public.ls_attempt_json(a) order by submitted_at desc) from public.ls_quiz_attempts a where user_id=u),'[]'::jsonb),'pythonAttempts',coalesce((select jsonb_agg(public.ls_python_json(a) order by submitted_at desc) from public.ls_python_attempts a where user_id=u),'[]'::jsonb),'practice',public.ls_practice_progress()); end $$;

create function public.ls_squad_json(s public.ls_squads) returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select jsonb_build_object('id',s.id,'name',s.name,'track',s.track,'level',s.level,'createdBy',s.created_by,'memberCount',(select count(*) from public.ls_memberships where squad_id=s.id),'isMember',exists(select from public.ls_memberships where squad_id=s.id and user_id=auth.uid()))
$$;
create function public.ls_find_squads(track_value text default null,level_value text default null) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
begin perform public.ls_require_user(); return coalesce((select jsonb_agg(public.ls_squad_json(s) order by created_at desc) from public.ls_squads s where (track_value is null or track=track_value) and (level_value is null or level=level_value)),'[]'::jsonb); end $$;
create function public.ls_create_squad(input jsonb,request_id_value uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid := public.ls_require_user(); s public.ls_squads;
begin
 perform pg_advisory_xact_lock(hashtextextended(u::text||request_id_value::text,0));
 select * into s from public.ls_squads where created_by=u and request_id=request_id_value;
 if found then
  if s.name<>trim(input->>'name') or s.track<>input->>'track' or s.level<>input->>'level' then raise exception 'CONFLICT'; end if;
 else
  insert into public.ls_squads(name,track,level,created_by,request_id) values(trim(input->>'name'),input->>'track',input->>'level',u,request_id_value) returning * into s;
  insert into public.ls_memberships(squad_id,user_id) values(s.id,u);
 end if;
 return public.ls_squad_json(s);
end $$;
create function public.ls_join_squad(squad_id_value uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid := public.ls_require_user(); s public.ls_squads;
begin
 select * into s from public.ls_squads where id=squad_id_value for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 if not exists(select from public.ls_memberships where squad_id=s.id and user_id=u) then
  if (select count(*) from public.ls_memberships where squad_id=s.id)>=4 then raise exception 'SQUAD_FULL'; end if;
  insert into public.ls_memberships(squad_id,user_id) values(s.id,u);
 end if;
 return public.ls_squad_json(s);
end $$;
create function public.ls_leave_squad(squad_id_value uuid) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin delete from public.ls_memberships where squad_id=squad_id_value and user_id=public.ls_require_user(); end $$;

create function public.ls_expire_invitations() returns void language sql security definer set search_path=public,pg_temp as $$
 update public.ls_invitations set status='expired' where status='pending' and expires_at<=now()
$$;
create function public.ls_get_call(call_id_value uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid := public.ls_require_user(); c public.ls_calls;
begin
 perform public.ls_expire_invitations();
 select * into c from public.ls_calls where id=call_id_value;
 if not found then raise exception 'NOT_FOUND'; end if;
 if c.created_by<>u and not exists(select from public.ls_invitations where call_id=c.id and recipient_id=u and status='accepted') then raise exception 'FORBIDDEN'; end if;
 return jsonb_build_object('id',c.id,'kind',c.kind,'createdBy',c.created_by,'squadId',c.squad_id,'moduleId',c.module_id,'meetUrl',c.meet_url,'createdAt',c.created_at,
 'myPracticeEndedAt',(select practice_ended_at from public.ls_call_participants where call_id=c.id and user_id=u),
 'myTransitionedAt',(select transitioned_at from public.ls_call_participants where call_id=c.id and user_id=u),
 'participants',coalesce((select jsonb_agg(jsonb_build_object('invitationId',i.id,'userId',p.user_id,'name',coalesce(pr.name,'Guest'),'status',case when p.user_id=c.created_by then 'organizer' else i.status end,'transitionedAt',p.transitioned_at) order by p.user_id) from public.ls_call_participants p left join public.ls_profiles pr on pr.id=p.user_id left join public.ls_invitations i on i.call_id=p.call_id and i.recipient_id=p.user_id where p.call_id=c.id),'[]'::jsonb));
end $$;
create function public.ls_get_my_calls() returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid := public.ls_require_user();
begin return coalesce((select jsonb_agg(public.ls_get_call(c.id) order by c.created_at desc) from public.ls_calls c where c.created_by=u or exists(select from public.ls_invitations i where i.call_id=c.id and i.recipient_id=u and i.status='accepted')),'[]'::jsonb); end $$;
create function public.ls_finish_practice(call_id_value uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid := public.ls_require_user(); c jsonb;
begin
 c:=public.ls_get_call(call_id_value);
 if c->>'moduleId' is null or c->>'myTransitionedAt' is null then raise exception 'INVALID_INPUT'; end if;
 update public.ls_call_participants set practice_ended_at=coalesce(practice_ended_at,clock_timestamp()) where call_id=call_id_value and user_id=u;
 return public.ls_get_call(call_id_value);
end $$;
create function public.ls_create_call(kind_value text,target_value text,request_id_value uuid,module_id_value text default null) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid := public.ls_require_user(); c public.ls_calls; partner uuid; recipients uuid[]; recipient uuid;
begin
 perform public.ls_get_profile();
 perform pg_advisory_xact_lock(hashtextextended(u::text||request_id_value::text,0));
 select * into c from public.ls_calls where created_by=u and request_id=request_id_value;
 if found then
  if c.kind<>kind_value or c.module_id is distinct from module_id_value or (kind_value='language' and c.language<>target_value) or (kind_value='squad' and c.squad_id::text<>target_value) then raise exception 'CONFLICT'; end if;
  return public.ls_get_call(c.id);
 end if;
 if module_id_value is not null and module_id_value<>'spanish-first-conversation' then raise exception 'INVALID_INPUT'; end if;
 if kind_value='language' then
  if module_id_value is not null and target_value<>'es' then raise exception 'INVALID_INPUT'; end if;
  select id into partner from public.ls_profiles where id<>u and primary_language=target_value and available and last_active_at>now()-interval '2 minutes' order by random() limit 1;
  if partner is null then raise exception 'NO_AVAILABLE_PARTNER'; end if;
  recipients:=array[partner];
 elsif kind_value='squad' then
  if not exists(select from public.ls_memberships where squad_id=target_value::uuid and user_id=u) then raise exception 'FORBIDDEN'; end if;
  select array_agg(user_id) into recipients from public.ls_memberships where squad_id=target_value::uuid and user_id<>u;
  if recipients is null then raise exception 'NO_AVAILABLE_PARTNER'; end if;
 else raise exception 'INVALID_INPUT'; end if;
 insert into public.ls_calls(kind,created_by,request_id,squad_id,language,module_id) values(kind_value,u,request_id_value,case when kind_value='squad' then target_value::uuid end,case when kind_value='language' then target_value end,module_id_value) returning * into c;
 insert into public.ls_call_participants(call_id,user_id) values(c.id,u);
 foreach recipient in array recipients loop
  insert into public.ls_call_participants(call_id,user_id) values(c.id,recipient);
  insert into public.ls_invitations(call_id,sender_id,recipient_id) values(c.id,u,recipient);
 end loop;
 return public.ls_get_call(c.id);
end $$;
create function public.ls_get_notifications() returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid := public.ls_require_user();
begin perform public.ls_expire_invitations(); return coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'readAt',i.read_at,'invitation',jsonb_build_object('id',i.id,'callId',i.call_id,'senderId',i.sender_id,'recipientId',i.recipient_id,'senderName',coalesce(p.name,'Guest'),'status',i.status,'createdAt',i.created_at,'expiresAt',i.expires_at)) order by i.created_at desc) from public.ls_invitations i left join public.ls_profiles p on p.id=i.sender_id where i.recipient_id=u),'[]'::jsonb); end $$;
create function public.ls_mark_read(invitation_id_value uuid) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin update public.ls_invitations set read_at=coalesce(read_at,now()) where id=invitation_id_value and recipient_id=public.ls_require_user(); if not found then raise exception 'NOT_FOUND'; end if; end $$;
create function public.ls_respond_invitation(invitation_id_value uuid,status_value text) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid := public.ls_require_user(); i public.ls_invitations;
begin
 select * into i from public.ls_invitations where id=invitation_id_value for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 if (status_value='cancelled' and i.sender_id<>u) or (status_value in ('accepted','declined') and i.recipient_id<>u) or status_value not in ('accepted','declined','cancelled') then raise exception 'FORBIDDEN'; end if;
 if i.status=status_value then return; end if;
 if i.status='pending' and i.expires_at<=now() then raise exception 'INVITATION_EXPIRED'; end if;
 if i.status='cancelled' then raise exception 'INVITATION_CANCELLED'; end if;
 if i.status<>'pending' then raise exception 'CONFLICT'; end if;
 update public.ls_invitations set status=status_value where id=i.id;
end $$;
create function public.ls_set_meet(call_id_value uuid,url_value text) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid := public.ls_require_user();
begin
 if url_value !~ '^https://meet[.]google[.]com/[a-z]{3}-[a-z]{4}-[a-z]{3}$' then raise exception 'INVALID_INPUT'; end if;
 update public.ls_calls set meet_url=url_value where id=call_id_value and created_by=u;
 if not found then raise exception 'FORBIDDEN'; end if; return public.ls_get_call(call_id_value);
end $$;
create function public.ls_record_transition(call_id_value uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid := public.ls_require_user(); c jsonb;
begin
 c:=public.ls_get_call(call_id_value);
 if c->>'meetUrl' is null then raise exception 'MEET_LINK_MISSING'; end if;
 update public.ls_call_participants set transitioned_at=coalesce(transitioned_at,now()) where call_id=call_id_value and user_id=u;
 return public.ls_get_call(call_id_value);
end $$;

-- Internal functions cannot be called by a client, including authenticated users.
do $$ declare f regprocedure; begin
 for f in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and left(p.proname,3)='ls_' loop
  execute format('revoke execute on function %s from public,anon,authenticated',f);
 end loop;
end $$;
grant execute on function public.ls_get_profile(),public.ls_update_profile(jsonb),public.ls_availability(boolean),public.ls_submit_quiz(text,integer,jsonb,uuid),public.ls_submit_python(text,integer,integer,integer,uuid),public.ls_get_progress(),public.ls_find_squads(text,text),public.ls_create_squad(jsonb,uuid),public.ls_join_squad(uuid),public.ls_leave_squad(uuid),public.ls_get_call(uuid),public.ls_get_my_calls(),public.ls_finish_practice(uuid),public.ls_create_call(text,text,uuid,text),public.ls_get_notifications(),public.ls_mark_read(uuid),public.ls_respond_invitation(uuid,text),public.ls_set_meet(uuid,text),public.ls_record_transition(uuid) to authenticated;
