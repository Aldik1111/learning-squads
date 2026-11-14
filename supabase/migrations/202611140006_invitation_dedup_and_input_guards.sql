-- Technical anti-spam: one outstanding pending sender->recipient invitation.
-- Completed, declined, cancelled or expired invitations do not limit future calls.
-- Existing historical rows are preserved; new requests serialize per sender.
-- Direct RPC null/type checks apply before idempotent replay, not just HTTP validation.
create or replace function public.ls_create_call(kind_value text,target_value text,request_id_value uuid,module_id_value text default null,recipient_ids_value uuid[] default null) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid := public.ls_require_user(); c public.ls_calls; partner uuid; recipients uuid[]; recipient uuid;
begin
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
 if module_id_value is not null and module_id_value<>'spanish-first-conversation' then raise exception 'INVALID_INPUT'; end if;
 if kind_value='language' then
  if module_id_value is not null and target_value<>'es' then raise exception 'INVALID_INPUT'; end if;
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

create or replace function public.ls_respond_invitation(invitation_id_value uuid,status_value text) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid := public.ls_require_user(); i public.ls_invitations;
begin
 if invitation_id_value is null or status_value is null or status_value not in ('accepted','declined','cancelled') then raise exception 'INVALID_INPUT'; end if;
 select * into i from public.ls_invitations where id=invitation_id_value for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 if (status_value='cancelled' and i.sender_id<>u) or (status_value in ('accepted','declined') and i.recipient_id<>u) or status_value not in ('accepted','declined','cancelled') then raise exception 'FORBIDDEN'; end if;
 if i.status=status_value then return; end if;
 if i.status='expired' or (i.status='pending' and i.expires_at<=clock_timestamp()) then raise exception 'INVITATION_EXPIRED'; end if;
 if i.status='cancelled' then raise exception 'INVITATION_CANCELLED'; end if;
 if i.status<>'pending' then raise exception 'CONFLICT'; end if;
 update public.ls_invitations set status=status_value where id=i.id;
end $$;

create or replace function public.ls_expire_invitations() returns void language sql security definer set search_path=public,pg_temp as $$
 update public.ls_invitations set status='expired' where status='pending' and expires_at<=clock_timestamp()
$$;

create or replace function public.ls_update_profile(input jsonb) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid := public.ls_require_user(); p public.ls_profiles;
begin
 if input is null or jsonb_typeof(input) is distinct from 'object' or jsonb_typeof(input->'name') is distinct from 'string' or jsonb_typeof(input->'track') is distinct from 'string' or jsonb_typeof(input->'level') is distinct from 'string' or jsonb_typeof(input->'primaryLanguage') is distinct from 'string' or jsonb_typeof(input->'knownLanguages') is distinct from 'array' or jsonb_typeof(input->'timezone') is distinct from 'string' or jsonb_typeof(input->'availableForCalls') is distinct from 'boolean' then raise exception 'INVALID_INPUT'; end if;
 if exists(select from jsonb_array_elements(input->'knownLanguages') v where jsonb_typeof(v) is distinct from 'string' or length(v#>>'{}') not between 2 and 35) then raise exception 'INVALID_INPUT'; end if;
 if jsonb_typeof(input->'knownLanguages') <> 'array' or jsonb_array_length(input->'knownLanguages') > 50 then raise exception 'INVALID_INPUT'; end if;
 if char_length(input->>'primaryLanguage') not between 2 and 35 or not exists(select from pg_timezone_names where name=input->>'timezone') then raise exception 'INVALID_INPUT'; end if;
 insert into public.ls_profiles(id,name,track,level,primary_language,known_languages,timezone,available)
 values(u,trim(input->>'name'),input->>'track',input->>'level',input->>'primaryLanguage',array(select jsonb_array_elements_text(input->'knownLanguages')),input->>'timezone',(input->>'availableForCalls')::boolean)
 on conflict(id) do update set name=excluded.name,track=excluded.track,level=excluded.level,primary_language=excluded.primary_language,known_languages=excluded.known_languages,timezone=excluded.timezone,available=excluded.available,last_active_at=now()
 returning * into p; return public.ls_profile_json(p);
end $$;

create or replace function public.ls_create_squad(input jsonb,request_id_value uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid := public.ls_require_user(); s public.ls_squads;
begin
 if request_id_value is null or input is null or jsonb_typeof(input) is distinct from 'object' or jsonb_typeof(input->'name') is distinct from 'string' or jsonb_typeof(input->'track') is distinct from 'string' or jsonb_typeof(input->'level') is distinct from 'string' then raise exception 'INVALID_INPUT'; end if;
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

create or replace function public.ls_submit_quiz(module_id_value text,version_value integer,answers_value jsonb,request_id_value uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid := public.ls_require_user(); a public.ls_quiz_attempts; questions jsonb; q jsonb; feedback jsonb := '[]';
begin
 if module_id_value is null or version_value is null or answers_value is null or request_id_value is null or jsonb_typeof(answers_value) is distinct from 'object' then raise exception 'INVALID_INPUT'; end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text||request_id_value::text,0));
 select * into a from public.ls_quiz_attempts where user_id=u and request_id=request_id_value;
 if found then
  if a.module_id<>module_id_value or a.content_version<>version_value or a.answers<>answers_value then raise exception 'CONFLICT'; end if;
  return public.ls_attempt_json(a);
 end if;
 select quiz into questions from public.ls_content_versions where module_id=module_id_value and content_version=version_value;
 if not found then raise exception 'NOT_FOUND'; end if;
 if jsonb_typeof(answers_value)<>'object' then raise exception 'INVALID_INPUT'; end if;
 if exists(select from jsonb_each(answers_value) answer_entry where jsonb_typeof(answer_entry.value) is distinct from 'string') then raise exception 'INVALID_INPUT'; end if;
 if (select count(*) from jsonb_object_keys(answers_value))<>jsonb_array_length(questions) then raise exception 'INVALID_INPUT'; end if;
 for q in select * from jsonb_array_elements(questions) loop
  if not exists(select from jsonb_array_elements(q->'options') opt where opt->>'id'=answers_value->>(q->>'id')) then raise exception 'INVALID_INPUT'; end if;
  feedback:=feedback||jsonb_build_array(jsonb_build_object('questionId',q->>'id','correctOptionId',q->>'correctOptionId','correct',(answers_value->>(q->>'id'))=(q->>'correctOptionId'),'explanation',q->>'explanation'));
 end loop;
 insert into public.ls_quiz_attempts(user_id,request_id,module_id,content_version,answers,feedback) values(u,request_id_value,module_id_value,version_value,answers_value,feedback) returning * into a;
 return public.ls_attempt_json(a);
end $$;

create or replace function public.ls_submit_python(exercise_id_value text,version_value integer,passed_value integer,total_value integer,request_id_value uuid,status_value text) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid := public.ls_require_user(); a public.ls_python_attempts;
begin
 if exercise_id_value is null or version_value is null or passed_value is null or total_value is null or request_id_value is null or status_value is null then raise exception 'INVALID_INPUT'; end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text||request_id_value::text,0));
 select * into a from public.ls_python_attempts where user_id=u and request_id=request_id_value;
 if found then
  if a.exercise_id<>exercise_id_value or a.exercise_version<>version_value or a.passed<>passed_value or a.total<>total_value or a.status<>status_value then raise exception 'CONFLICT'; end if;
  return public.ls_python_json(a);
 end if;
 if exercise_id_value<>'python-count-completed' or version_value<>1 or total_value<>6 or status_value not in ('passed','failed','error','timeout','cancelled') or (status_value='passed' and passed_value<>total_value) then raise exception 'INVALID_INPUT'; end if;
 insert into public.ls_python_attempts(user_id,request_id,exercise_id,exercise_version,passed,total,status) values(u,request_id_value,exercise_id_value,version_value,passed_value,total_value,status_value) returning * into a;
 return public.ls_python_json(a);
end $$;

create or replace function public.ls_join_squad(squad_id_value uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid := public.ls_require_user(); s public.ls_squads;
begin
 if squad_id_value is null then raise exception 'INVALID_INPUT'; end if;
 select * into s from public.ls_squads where id=squad_id_value for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 if not exists(select from public.ls_memberships where squad_id=s.id and user_id=u) then
  if (select count(*) from public.ls_memberships where squad_id=s.id)>=4 then raise exception 'SQUAD_FULL'; end if;
  insert into public.ls_memberships(squad_id,user_id) values(s.id,u);
 end if;
 return public.ls_squad_json(s);
end $$;

create or replace function public.ls_leave_squad(squad_id_value uuid) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin if squad_id_value is null then raise exception 'INVALID_INPUT'; end if; delete from public.ls_memberships where squad_id=squad_id_value and user_id=public.ls_require_user(); end $$;

create or replace function public.ls_get_call(call_id_value uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid := public.ls_require_user(); c public.ls_calls;
begin
 if call_id_value is null then raise exception 'INVALID_INPUT'; end if;
 perform public.ls_expire_invitations();
 select * into c from public.ls_calls where id=call_id_value;
 if not found then raise exception 'NOT_FOUND'; end if;
 if c.created_by<>u and not exists(select from public.ls_invitations where call_id=c.id and recipient_id=u and status='accepted') then raise exception 'FORBIDDEN'; end if;
 return jsonb_build_object('id',c.id,'kind',c.kind,'createdBy',c.created_by,'squadId',c.squad_id,'moduleId',c.module_id,'meetUrl',c.meet_url,'createdAt',c.created_at,
 'myPracticeEndedAt',(select practice_ended_at from public.ls_call_participants where call_id=c.id and user_id=u),
 'myTransitionedAt',(select transitioned_at from public.ls_call_participants where call_id=c.id and user_id=u),
 'participants',coalesce((select jsonb_agg(jsonb_build_object('invitationId',i.id,'userId',p.user_id,'name',coalesce(pr.name,'Guest'),'status',case when p.user_id=c.created_by then 'organizer' else i.status end,'transitionedAt',p.transitioned_at) order by p.user_id) from public.ls_call_participants p left join public.ls_profiles pr on pr.id=p.user_id left join public.ls_invitations i on i.call_id=p.call_id and i.recipient_id=p.user_id where p.call_id=c.id),'[]'::jsonb));
end $$;

create or replace function public.ls_finish_practice(call_id_value uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid := public.ls_require_user(); c jsonb;
begin
 if call_id_value is null then raise exception 'INVALID_INPUT'; end if;
 c:=public.ls_get_call(call_id_value);
 if c->>'moduleId' is null or c->>'myTransitionedAt' is null then raise exception 'INVALID_INPUT'; end if;
 update public.ls_call_participants set practice_ended_at=coalesce(practice_ended_at,clock_timestamp()) where call_id=call_id_value and user_id=u;
 return public.ls_get_call(call_id_value);
end $$;

create or replace function public.ls_mark_read(invitation_id_value uuid) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin if invitation_id_value is null then raise exception 'INVALID_INPUT'; end if; update public.ls_invitations set read_at=coalesce(read_at,now()) where id=invitation_id_value and recipient_id=public.ls_require_user(); if not found then raise exception 'NOT_FOUND'; end if; end $$;

create or replace function public.ls_record_transition(call_id_value uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid := public.ls_require_user(); c jsonb;
begin
 if call_id_value is null then raise exception 'INVALID_INPUT'; end if;
 c:=public.ls_get_call(call_id_value);
 if c->>'meetUrl' is null then raise exception 'MEET_LINK_MISSING'; end if;
 update public.ls_call_participants set transitioned_at=coalesce(transitioned_at,now()) where call_id=call_id_value and user_id=u;
 return public.ls_get_call(call_id_value);
end $$;

create or replace function public.ls_set_meet(call_id_value uuid,url_value text) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid := public.ls_require_user();
begin
 if call_id_value is null or url_value is null then raise exception 'INVALID_INPUT'; end if;
 if url_value !~ '^https://meet[.]google[.]com/[a-z]{3}-[a-z]{4}-[a-z]{3}$' then raise exception 'INVALID_INPUT'; end if;
 update public.ls_calls set meet_url=url_value where id=call_id_value and created_by=u;
 if not found then raise exception 'FORBIDDEN'; end if; return public.ls_get_call(call_id_value);
end $$;

create or replace function public.ls_find_squads(track_value text default null,level_value text default null) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
begin if (track_value is not null and track_value not in ('python','how-to-use-ai','spanish')) or (level_value is not null and level_value not in ('beginner','intermediate','advanced')) then raise exception 'INVALID_INPUT'; end if; perform public.ls_require_user(); return coalesce((select jsonb_agg(public.ls_squad_json(s) order by created_at desc) from public.ls_squads s where (track_value is null or track=track_value) and (level_value is null or level=level_value)),'[]'::jsonb); end $$;
