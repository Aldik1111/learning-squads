-- Complete team composition and explicitly selected group invitations.
create or replace function public.ls_squad_json(s public.ls_squads) returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select jsonb_build_object('id',s.id,'name',s.name,'track',s.track,'level',s.level,'createdBy',s.created_by,'memberCount',(select count(*) from public.ls_memberships where squad_id=s.id),'isMember',exists(select from public.ls_memberships where squad_id=s.id and user_id=auth.uid()),'members',case when exists(select from public.ls_memberships where squad_id=s.id and user_id=auth.uid()) then coalesce((select jsonb_agg(jsonb_build_object('userId',m.user_id,'name',coalesce(p.name,'Guest')) order by m.joined_at) from public.ls_memberships m left join public.ls_profiles p on p.id=m.user_id where m.squad_id=s.id),'[]'::jsonb) else '[]'::jsonb end)
$$;
drop function public.ls_create_call(text,text,uuid,text);
create function public.ls_create_call(kind_value text,target_value text,request_id_value uuid,module_id_value text default null,recipient_ids_value uuid[] default null) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid := public.ls_require_user(); c public.ls_calls; partner uuid; recipients uuid[]; recipient uuid;
begin
 perform public.ls_get_profile();
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
  select id into partner from public.ls_profiles where id<>u and primary_language=target_value and available and last_active_at>now()-interval '2 minutes' order by random() limit 1;
  if partner is null then raise exception 'NO_AVAILABLE_PARTNER'; end if;
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
 insert into public.ls_calls(kind,created_by,request_id,squad_id,language,module_id) values(kind_value,u,request_id_value,case when kind_value='squad' then target_value::uuid end,case when kind_value='language' then target_value end,module_id_value) returning * into c;
 insert into public.ls_call_participants(call_id,user_id) values(c.id,u);
 foreach recipient in array recipients loop
  insert into public.ls_call_participants(call_id,user_id) values(c.id,recipient);
  insert into public.ls_invitations(call_id,sender_id,recipient_id) values(c.id,u,recipient);
 end loop;
 return public.ls_get_call(c.id);
end $$;
revoke execute on function public.ls_create_call(text,text,uuid,text,uuid[]) from public,anon,authenticated;
grant execute on function public.ls_create_call(text,text,uuid,text,uuid[]) to authenticated;
