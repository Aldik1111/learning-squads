-- Additive course/task registry. Existing published quizzes and attempts remain unchanged.
alter table public.ls_profiles drop constraint ls_profiles_track_check;
alter table public.ls_profiles add constraint ls_profiles_track_check check(track in ('python','how-to-use-ai','spanish','python-automation','ai-for-work','french'));
insert into public.ls_group_courses values ('python-automation','python-clean-labels',null),('ai-for-work','ai-work-email',null);
create table public.ls_course_modules(
 module_id text primary key, course_id text not null, content_version integer not null,
 position integer not null, target_language text, exercise_id text, exercise_version integer,
 foreign key(module_id,content_version) references public.ls_content_versions,
 unique(course_id,position)
);
create table public.ls_python_exercise_versions(exercise_id text not null, exercise_version integer not null, case_ids jsonb not null check(jsonb_typeof(case_ids)='array' and jsonb_array_length(case_ids)>0), primary key(exercise_id,exercise_version));
create table public.ls_task_definitions(
 id text not null, version integer not null check(version>0), module_id text not null,
 content_version integer not null, title text not null, description text not null,
 acceptance_criteria jsonb not null check(jsonb_typeof(acceptance_criteria)='array'),
 primary key(id,version), foreign key(module_id,content_version) references public.ls_content_versions
);
create table public.ls_task_results(
 user_id uuid not null references auth.users(id), task_id text not null, task_version integer not null,
 status text not null check(status in ('not_started','in_progress','done')),
 summary text not null default '' check(char_length(summary)<=4000), link text,
 shared_group_id uuid references public.ls_course_groups, revision integer not null check(revision>0),
 updated_at timestamptz not null default clock_timestamp(), primary key(user_id,task_id,task_version),
 foreign key(task_id,task_version) references public.ls_task_definitions,
 check(status<>'done' or char_length(trim(summary))>0)
);
create index on public.ls_task_results(shared_group_id) where shared_group_id is not null;
create table public.ls_task_requests(user_id uuid not null references auth.users(id), request_id uuid not null, payload jsonb not null, primary key(user_id,request_id));
alter table public.ls_course_modules enable row level security;
alter table public.ls_python_exercise_versions enable row level security;
alter table public.ls_task_definitions enable row level security;
alter table public.ls_task_results enable row level security;
alter table public.ls_task_requests enable row level security;
revoke all on public.ls_course_modules,public.ls_python_exercise_versions,public.ls_task_definitions,public.ls_task_results,public.ls_task_requests from public,anon,authenticated;

create function public.ls_task_definition_json(t public.ls_task_definitions) returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select jsonb_build_object('id',t.id,'version',t.version,'moduleId',t.module_id,'contentVersion',t.content_version,'courseId',m.course_id,'title',t.title,'description',t.description,'acceptanceCriteria',t.acceptance_criteria) from public.ls_course_modules m where m.module_id=t.module_id
$$;
create function public.ls_task_result_json(t public.ls_task_definitions,u uuid) returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select jsonb_build_object('taskId',t.id,'taskVersion',t.version,'userId',u,'userName',p.name,'status',coalesce(r.status,'not_started'),'summary',coalesce(r.summary,''),'link',r.link,'sharedGroupId',r.shared_group_id,'revision',coalesce(r.revision,0),'updatedAt',r.updated_at)
 from public.ls_profiles p left join public.ls_task_results r on r.user_id=p.id and r.task_id=t.id and r.task_version=t.version where p.id=u
$$;
create function public.ls_get_task_board(course_id_value text default null) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=public.ls_require_user();begin
 perform public.ls_get_profile();
 if course_id_value is not null and not exists(select from public.ls_course_modules where course_id=course_id_value) then raise exception 'NOT_FOUND';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('task',public.ls_task_definition_json(t),'result',public.ls_task_result_json(t,u)) order by m.course_id,m.position)
 from public.ls_task_definitions t join public.ls_course_modules m on m.module_id=t.module_id
 where (course_id_value is null or m.course_id=course_id_value) and t.version=(select max(version) from public.ls_task_definitions where id=t.id)),'[]'::jsonb);
end $$;
create function public.ls_update_task_result(task_id_value text,version_value integer,input jsonb,request_id_value uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=public.ls_require_user(); t public.ls_task_definitions; r public.ls_task_results; prior jsonb; payload jsonb; c text; g uuid; expected integer; summary_value text; link_value text;
begin
 if task_id_value is null or version_value is null or request_id_value is null or input is null or jsonb_typeof(input) is distinct from 'object'
 or jsonb_typeof(input->'status') is distinct from 'string' or input->>'status' not in ('not_started','in_progress','done')
 or jsonb_typeof(input->'summary') is distinct from 'string' or jsonb_typeof(input->'shareWithGroup') is distinct from 'boolean'
 or jsonb_typeof(input->'expectedRevision') is distinct from 'number' or (input->>'expectedRevision')!~'^[0-9]{1,9}$'
 or not(input?'link') or jsonb_typeof(input->'link') not in ('string','null')
 or not(input?'shareGroupId') or jsonb_typeof(input->'shareGroupId') not in ('string','null') then raise exception 'INVALID_INPUT';end if;
 if (input->>'shareWithGroup')::boolean and (input->>'shareGroupId') is null then raise exception 'INVALID_INPUT';end if;
 if not (input->>'shareWithGroup')::boolean and (input->>'shareGroupId') is not null then raise exception 'INVALID_INPUT';end if;
 summary_value:=regexp_replace(input->>'summary','^[[:space:]]+|[[:space:]]+$','','g');link_value:=input->>'link';expected:=(input->>'expectedRevision')::integer;
 if char_length(input->>'summary')>4000 or (input->>'status'='done' and summary_value='') then raise exception 'INVALID_INPUT';end if;
 -- Links are displayed only, never fetched. Reject credentials, controls and URL backslashes even through direct RPC.
 if link_value is not null and (char_length(link_value)>2048 or position(chr(92) in link_value)>0 or link_value!~'^https://(\[[0-9A-Fa-f:]+\]|[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?)(:[0-9]{1,5})?([/?#][^[:space:]]*)?$') then raise exception 'INVALID_INPUT';end if;
 select * into t from public.ls_task_definitions where id=task_id_value and version=version_value;
 if not found then raise exception 'NOT_FOUND';end if;
 select course_id into c from public.ls_course_modules where module_id=t.module_id;
 perform pg_advisory_xact_lock(hashtextextended('study-user:'||u::text,0));
 perform pg_advisory_xact_lock(hashtextextended('study-course:'||c,0));
 perform public.ls_get_profile();
 payload:=jsonb_build_object('taskId',task_id_value,'version',version_value,'input',input);
 select q.payload into prior from public.ls_task_requests q where user_id=u and request_id=request_id_value;
 if found then
  if prior<>payload then raise exception 'CONFLICT';end if;
  -- Replays never restore obsolete sharing/revisions after a membership change.
  return public.ls_task_result_json(t,u);
 end if;
 if t.version<>(select max(version) from public.ls_task_definitions where id=t.id) then raise exception 'CONFLICT';end if;
 select * into r from public.ls_task_results where user_id=u and task_id=task_id_value and task_version=version_value for update;
 if coalesce(r.revision,0)<>expected then raise exception 'CONFLICT';end if;
 if (input->>'shareWithGroup')::boolean then
  select group_id into g from public.ls_course_group_members where user_id=u and course_id=c and left_at is null;
  if g is null then raise exception 'FORBIDDEN';end if;
  if g::text is distinct from input->>'shareGroupId' then raise exception 'CONFLICT';end if;
 end if;
 insert into public.ls_task_results(user_id,task_id,task_version,status,summary,link,shared_group_id,revision)
 values(u,task_id_value,version_value,input->>'status',summary_value,link_value,g,expected+1)
 on conflict(user_id,task_id,task_version) do update set status=excluded.status,summary=excluded.summary,link=excluded.link,shared_group_id=excluded.shared_group_id,revision=excluded.revision,updated_at=clock_timestamp();
 insert into public.ls_task_requests values(u,request_id_value,payload);
 return public.ls_task_result_json(t,u);
end $$;
create function public.ls_get_group_task_results(group_id_value uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare c text;begin
 select course_id into c from public.ls_course_groups where id=group_id_value;
 perform pg_advisory_xact_lock(hashtextextended('study-course:'||coalesce(c,''),0));
 perform public.ls_require_course_group(group_id_value);
 return coalesce((select jsonb_agg(jsonb_build_object('task',public.ls_task_definition_json(t),'result',public.ls_task_result_json(t,r.user_id)) order by r.updated_at desc,r.user_id,t.id)
 from public.ls_task_results r join public.ls_task_definitions t on t.id=r.task_id and t.version=r.task_version
 join public.ls_course_modules cm on cm.module_id=t.module_id and cm.course_id=c
 join public.ls_course_group_members m on m.user_id=r.user_id and m.group_id=group_id_value and m.left_at is null
 where r.shared_group_id=group_id_value),'[]'::jsonb);
end $$;
create function public.ls_clear_task_sharing() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if tg_op='DELETE' or (old.left_at is null and new.left_at is not null) then
  update public.ls_task_results set shared_group_id=null,revision=revision+1,updated_at=clock_timestamp() where user_id=old.user_id and shared_group_id=old.group_id;
 end if;
 return null;
end $$;
create trigger ls_task_sharing_on_exit after update of left_at or delete on public.ls_course_group_members for each row execute function public.ls_clear_task_sharing();

create function public.ls_get_python_exercise_spec(exercise_id_value text,version_value integer) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare result jsonb;begin
 perform public.ls_require_user();
 select jsonb_build_object('caseIds',case_ids) into result from public.ls_python_exercise_versions where exercise_id=exercise_id_value and exercise_version=version_value;
 if result is null then raise exception 'NOT_FOUND';end if;return result;
end $$;
create or replace function public.ls_submit_python(exercise_id_value text,version_value integer,passed_value integer,total_value integer,request_id_value uuid,status_value text) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=public.ls_require_user();a public.ls_python_attempts;expected integer;begin
 if exercise_id_value is null or version_value is null or passed_value is null or total_value is null or request_id_value is null or status_value is null then raise exception 'INVALID_INPUT';end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text||request_id_value::text,0));
 select * into a from public.ls_python_attempts where user_id=u and request_id=request_id_value;
 if found then
  if a.exercise_id<>exercise_id_value or a.exercise_version<>version_value or a.passed<>passed_value or a.total<>total_value or a.status<>status_value then raise exception 'CONFLICT';end if;
  return public.ls_python_json(a);
 end if;
 select jsonb_array_length(case_ids) into expected from public.ls_python_exercise_versions where exercise_id=exercise_id_value and exercise_version=version_value;
 if expected is null or total_value<>expected or passed_value<0 or passed_value>expected or status_value not in ('passed','failed','error','timeout','cancelled') or (status_value='passed' and passed_value<>expected) then raise exception 'INVALID_INPUT';end if;
 insert into public.ls_python_attempts(user_id,request_id,exercise_id,exercise_version,passed,total,status) values(u,request_id_value,exercise_id_value,version_value,passed_value,total_value,status_value) returning * into a;return public.ls_python_json(a);
end $$;

create or replace function public.ls_get_group_progress(group_id_value uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare c text;begin
 select course_id into c from public.ls_course_groups where id=group_id_value;
 perform pg_advisory_xact_lock(hashtextextended('study-course:'||coalesce(c,''),0));
 perform public.ls_require_course_group(group_id_value);
 return coalesce((select jsonb_agg(jsonb_build_object('userId',m.user_id,'name',p.name,'modules',(
 select jsonb_agg(jsonb_build_object('moduleId',cm.module_id,'quizAttemptCount',(select count(*) from public.ls_quiz_attempts where user_id=m.user_id and module_id=cm.module_id),
 'latestQuizScore',case when q.feedback is null then null else (select count(*) from jsonb_array_elements(q.feedback) f where (f->>'correct')::boolean) end,
 'latestQuizTotal',jsonb_array_length(q.feedback),'pythonPassed',py.passed,'pythonTotal',py.total,'practiceSeconds',0) order by cm.position)
 from public.ls_course_modules cm
 left join lateral(select feedback from public.ls_quiz_attempts where user_id=m.user_id and module_id=cm.module_id order by submitted_at desc,id desc limit 1) q on true
 left join lateral(select passed,total from public.ls_python_attempts where user_id=m.user_id and exercise_id=cm.exercise_id order by submitted_at desc,id desc limit 1) py on true
 where cm.course_id=m.course_id
 )) order by m.joined_at) from public.ls_course_group_members m join public.ls_profiles p on p.id=m.user_id where m.group_id=group_id_value and m.left_at is null),'[]'::jsonb);
end $$;

-- Every newly introduced helper starts closed; application RPCs are explicitly granted.
do $$ declare fn record;begin for fn in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('ls_task_definition_json','ls_task_result_json','ls_get_task_board','ls_update_task_result','ls_get_group_task_results','ls_clear_task_sharing','ls_get_python_exercise_spec') loop execute format('revoke all on function %s from public,anon,authenticated',fn.signature);end loop;end $$;
grant execute on function public.ls_get_task_board(text),public.ls_update_task_result(text,integer,jsonb,uuid),public.ls_get_group_task_results(uuid),public.ls_get_python_exercise_spec(text,integer) to authenticated;

-- Language matching retains invitation privacy, expiry, anti-spam and replay semantics.
create or replace function public.ls_create_call(kind_value text,target_value text,request_id_value uuid,module_id_value text default null,recipient_ids_value uuid[] default null) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid := public.ls_require_user(); c public.ls_calls; partner uuid; recipients uuid[]; recipient uuid;
begin
 if kind_value is distinct from 'language' then raise exception 'FORBIDDEN';end if;
 if kind_value is null or kind_value not in ('language','squad') or target_value is null or length(trim(target_value))=0 or request_id_value is null then raise exception 'INVALID_INPUT'; end if;
 if kind_value='language' and recipient_ids_value is not null then raise exception 'INVALID_INPUT'; end if;
 perform public.ls_get_profile();
 -- Serialize a sender's distinct request IDs before checking outstanding invitations.
 perform pg_advisory_xact_lock(hashtextextended('ls-invitations:'||u::text,0));
 perform public.ls_expire_invitations();
 perform pg_advisory_xact_lock(hashtextextended(u::text||request_id_value::text,0));
 select * into c from public.ls_calls where created_by=u and request_id=request_id_value;
 if found then
  if c.kind<>kind_value or c.module_id is distinct from module_id_value or (kind_value='language' and c.language<>target_value) or (kind_value='squad' and c.squad_id::text<>target_value) then raise exception 'CONFLICT'; end if;
  if recipient_ids_value is not null and (select array_agg(x order by x) from unnest(recipient_ids_value) x) is distinct from (select array_agg(user_id order by user_id) from public.ls_call_participants where call_id=c.id and user_id<>u) then raise exception 'CONFLICT'; end if;
  return public.ls_get_call(c.id);
 end if;
 if module_id_value is not null and not exists(select from public.ls_course_modules where module_id=module_id_value and target_language=target_value) then raise exception 'INVALID_INPUT';end if;
 if kind_value='language' then
  select p.id into partner from public.ls_profiles p where p.id<>u and p.primary_language=target_value and p.available and p.last_active_at>clock_timestamp()-interval '2 minutes' and not exists(select from public.ls_invitations i where i.sender_id=u and i.recipient_id=p.id and i.status='pending') order by random() limit 1;
  if partner is null then
   if exists(select from public.ls_profiles p where p.id<>u and p.primary_language=target_value and p.available and p.last_active_at>clock_timestamp()-interval '2 minutes' and exists(select from public.ls_invitations i where i.sender_id=u and i.recipient_id=p.id and i.status='pending')) then raise exception 'INVITATION_PENDING'; end if;
   raise exception 'NO_AVAILABLE_PARTNER';
  end if;
  recipients:=array[partner];
 elsif kind_value='squad' then
  if not exists(select from public.ls_memberships where squad_id=target_value::uuid and user_id=u) then raise exception 'FORBIDDEN'; end if;
  if recipient_ids_value is null then
   select array_agg(user_id) into recipients from public.ls_memberships where squad_id=target_value::uuid and user_id<>u;
  else
   if cardinality(recipient_ids_value)<1 or cardinality(recipient_ids_value)<>(select count(distinct x) from unnest(recipient_ids_value) x) or exists(select from unnest(recipient_ids_value) x where x=u or not exists(select from public.ls_memberships where squad_id=target_value::uuid and user_id=x)) then raise exception 'INVALID_INPUT'; end if;
   recipients:=recipient_ids_value;
  end if;
  if recipients is null then raise exception 'NO_AVAILABLE_PARTNER'; end if;
 else raise exception 'INVALID_INPUT'; end if;
 if exists(select from public.ls_invitations where sender_id=u and recipient_id=any(recipients) and status='pending') then raise exception 'INVITATION_PENDING'; end if;
 insert into public.ls_calls(kind,created_by,request_id,squad_id,language,module_id) values(kind_value,u,request_id_value,case when kind_value='squad' then target_value::uuid end,case when kind_value='language' then target_value end,module_id_value) returning * into c;
 insert into public.ls_call_participants(call_id,user_id) values(c.id,u);
 foreach recipient in array recipients loop
  insert into public.ls_call_participants(call_id,user_id) values(c.id,recipient);
  insert into public.ls_invitations(call_id,sender_id,recipient_id) values(c.id,u,recipient);
 end loop;
 return public.ls_get_call(c.id);
end $$;
create or replace function public.ls_get_call(call_id_value uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid := public.ls_require_user(); c public.ls_calls;
begin
 if call_id_value is null then raise exception 'INVALID_INPUT'; end if;
 perform public.ls_expire_invitations();
 select * into c from public.ls_calls where id=call_id_value;
 if not found then raise exception 'NOT_FOUND'; end if;
 if c.created_by<>u and not exists(select from public.ls_invitations where call_id=c.id and recipient_id=u and status='accepted') then raise exception 'FORBIDDEN'; end if;
 return jsonb_build_object('id',c.id,'kind',c.kind,'targetLanguage',c.language,'createdBy',c.created_by,'squadId',c.squad_id,'moduleId',c.module_id,'meetUrl',c.meet_url,'createdAt',c.created_at,
 'myPracticeEndedAt',(select practice_ended_at from public.ls_call_participants where call_id=c.id and user_id=u),
 'myTransitionedAt',(select transitioned_at from public.ls_call_participants where call_id=c.id and user_id=u),
 'participants',coalesce((select jsonb_agg(jsonb_build_object('invitationId',i.id,'userId',p.user_id,'name',coalesce(pr.name,'Guest'),'status',case when p.user_id=c.created_by then 'organizer' else i.status end,'transitionedAt',p.transitioned_at) order by p.user_id) from public.ls_call_participants p left join public.ls_profiles pr on pr.id=p.user_id left join public.ls_invitations i on i.call_id=p.call_id and i.recipient_id=p.user_id where p.call_id=c.id),'[]'::jsonb));
end $$;
