-- Additive follow-up: authorize cleanup after an in-flight creator loses group
-- membership. This returns only requested, already-cancelled operational IDs;
-- it cannot cancel an active meeting or disclose post-departure calendar rows.
create function public.ls_get_cancelled_group_meetings(group_id_value uuid,meeting_ids_value uuid[]) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=public.ls_require_user();
begin
 if group_id_value is null or meeting_ids_value is null or cardinality(meeting_ids_value)>100 then raise exception 'INVALID_INPUT';end if;
 if not exists(select from public.ls_course_group_members where group_id=group_id_value and user_id=u) then raise exception 'FORBIDDEN';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'groupId',m.group_id)) from public.ls_group_meetings m
  where m.group_id=group_id_value and m.id=any(meeting_ids_value) and m.status='cancelled'
  and exists(select from public.ls_course_group_members member where member.group_id=m.group_id and member.user_id=u and (member.left_at is null or m.created_at<=member.left_at))),'[]'::jsonb);
end $$;
revoke all on function public.ls_get_cancelled_group_meetings(uuid,uuid[]) from public,anon,authenticated;
grant execute on function public.ls_get_cancelled_group_meetings(uuid,uuid[]) to authenticated;
