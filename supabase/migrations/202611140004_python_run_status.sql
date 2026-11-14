alter table public.ls_python_attempts add column status text not null default 'passed' check(status in ('passed','failed','error','timeout','cancelled'));
-- Existing initial snapshots contain completed case runs only.
update public.ls_python_attempts set status=case when passed=total then 'passed' else 'failed' end;
create or replace function public.ls_python_json(a public.ls_python_attempts) returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select jsonb_build_object('id',a.id,'exerciseId',a.exercise_id,'exerciseVersion',a.exercise_version,'passed',a.passed,'total',a.total,'status',a.status,'submittedAt',a.submitted_at,'source','self-check')
$$;
drop function public.ls_submit_python(text,integer,integer,integer,uuid);
create function public.ls_submit_python(exercise_id_value text,version_value integer,passed_value integer,total_value integer,request_id_value uuid,status_value text) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid := public.ls_require_user(); a public.ls_python_attempts;
begin
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
revoke execute on function public.ls_submit_python(text,integer,integer,integer,uuid,text) from public,anon,authenticated;
grant execute on function public.ls_submit_python(text,integer,integer,integer,uuid,text) to authenticated;
