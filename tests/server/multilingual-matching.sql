begin;
insert into auth.users(id) select ('70000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid from generate_series(1,5)n;
insert into public.ls_profiles(id,name,primary_language,known_languages,available,last_active_at) values
 ('70000000-0000-4000-8000-000000000001','Matching sender','en',array['es','fr'],true,clock_timestamp()),
 ('70000000-0000-4000-8000-000000000002','Additional languages','en',array['es','fr'],true,clock_timestamp()),
 ('70000000-0000-4000-8000-000000000003','Unavailable','en',array['es','fr'],false,clock_timestamp()),
 ('70000000-0000-4000-8000-000000000004','Stale','en',array['es','fr'],true,clock_timestamp()-interval '3 minutes'),
 ('70000000-0000-4000-8000-000000000005','Primary language','es',array[]::text[],false,clock_timestamp());
set local role authenticated;
do $$ declare a uuid:='70000000-0000-4000-8000-000000000001';b uuid:='70000000-0000-4000-8000-000000000002';c jsonb;i uuid;begin
 perform set_config('request.jwt.claim.sub',a::text,true);
 c:=public.ls_create_call('language','es','71000000-0000-4000-8000-000000000001','spanish-first-conversation');
 if not exists(select from jsonb_array_elements(c->'participants') p where p->>'userId'=b::text and p->>'status'='pending') then raise exception 'known Spanish not selected or unavailable/stale partner selected';end if;
 select (p->>'invitationId')::uuid into i from jsonb_array_elements(c->'participants')p where p->>'userId'=b::text;
 if public.ls_create_call('language','es','71000000-0000-4000-8000-000000000001','spanish-first-conversation')->>'id'<>c->>'id' then raise exception 'multilingual idempotent replay changedcall';end if;
 begin perform public.ls_create_call('language','fr',gen_random_uuid(),'french-first-conversation');raise exception 'known-language pending dedup bypassed';exception when raise_exception then if sqlerrm<>'INVITATION_PENDING' then raise;end if;end;
 if jsonb_array_length(public.ls_get_notifications())<>0 then raise exception 'sender received own unread invitation';end if;
 perform set_config('request.jwt.claim.sub',b::text,true);
 if jsonb_array_length(public.ls_get_notifications())<>1 or public.ls_get_notifications()->0->>'readAt' is not null then raise exception 'recipient unread notification absent';end if;
 perform public.ls_mark_read(i);
 if public.ls_get_notifications()->0->>'readAt' is null then raise exception 'markread not persisted';end if;
 perform set_config('request.jwt.claim.sub',a::text,true);
 begin perform public.ls_create_call('language','fr',gen_random_uuid(),'french-first-conversation');raise exception 'reading invitation removed pending guard';exception when raise_exception then if sqlerrm<>'INVITATION_PENDING' then raise;end if;end;
 perform public.ls_respond_invitation(i,'cancelled');
 c:=public.ls_create_call('language','fr','71000000-0000-4000-8000-000000000002','french-daily-plans');
 if c->>'targetLanguage'<>'fr' or not exists(select from jsonb_array_elements(c->'participants')p where p->>'userId'=b::text) then raise exception 'known French match failed after terminal invitation';end if;
end $$;
reset role;
-- Expiry must free the same multilingual recipient, without a lifetime call limit.
update public.ls_invitations set expires_at=clock_timestamp()-interval '1 second' where sender_id='70000000-0000-4000-8000-000000000001' and status='pending';
set local role authenticated;
do $$ declare c jsonb;i uuid;begin
 perform set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000001',true);
 c:=public.ls_create_call('language','fr',gen_random_uuid(),'french-preferences');
 select (p->>'invitationId')::uuid into i from jsonb_array_elements(c->'participants')p where p->>'userId'='70000000-0000-4000-8000-000000000002';
 if i is null then raise exception 'expired invitation did not release known-language match';end if;
 perform public.ls_respond_invitation(i,'cancelled');
 perform set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000002',true);
 perform public.ls_availability(false);
 perform set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000001',true);
 begin perform public.ls_create_call('language','es',gen_random_uuid(),'spanish-daily-plans');raise exception 'self/unavailable/stale match accepted';exception when raise_exception then if sqlerrm<>'NO_AVAILABLE_PARTNER' then raise;end if;end;
 perform set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000005',true);
 perform public.ls_availability(true);
 perform set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000001',true);
 c:=public.ls_create_call('language','es',gen_random_uuid(),'spanish-preferences');
 if not exists(select from jsonb_array_elements(c->'participants')p where p->>'userId'='70000000-0000-4000-8000-000000000005') then raise exception 'primary-language matching regressed';end if;
 begin perform public.ls_create_call('language','es',gen_random_uuid(),'french-preferences');raise exception 'language-module mismatch allowed';exception when raise_exception then if sqlerrm<>'INVALID_INPUT' then raise;end if;end;
end $$;
rollback;
