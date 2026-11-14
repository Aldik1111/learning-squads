-- LANGUAGES-003: match all explicitly declared languages; keep availability, TTL and access rules.
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
  select p.id into partner from public.ls_profiles p where p.id<>u and (p.primary_language=target_value or target_value=any(p.known_languages)) and p.available and p.last_active_at>clock_timestamp()-interval '2 minutes' and not exists(select from public.ls_invitations i where i.sender_id=u and i.recipient_id=p.id and i.status='pending') order by random() limit 1;
  if partner is null then
   if exists(select from public.ls_profiles p where p.id<>u and (p.primary_language=target_value or target_value=any(p.known_languages)) and p.available and p.last_active_at>clock_timestamp()-interval '2 minutes' and exists(select from public.ls_invitations i where i.sender_id=u and i.recipient_id=p.id and i.status='pending')) then raise exception 'INVITATION_PENDING'; end if;
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
