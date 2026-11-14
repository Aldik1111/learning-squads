-- Preserve the expired error code after notification refresh materializes expiry.
create or replace function public.ls_respond_invitation(invitation_id_value uuid,status_value text) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid := public.ls_require_user(); i public.ls_invitations;
begin
 select * into i from public.ls_invitations where id=invitation_id_value for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 if (status_value='cancelled' and i.sender_id<>u) or (status_value in ('accepted','declined') and i.recipient_id<>u) or status_value not in ('accepted','declined','cancelled') then raise exception 'FORBIDDEN'; end if;
 if i.status=status_value then return; end if;
 if i.status='expired' or (i.status='pending' and i.expires_at<=now()) then raise exception 'INVITATION_EXPIRED'; end if;
 if i.status='cancelled' then raise exception 'INVITATION_CANCELLED'; end if;
 if i.status<>'pending' then raise exception 'CONFLICT'; end if;
 update public.ls_invitations set status=status_value where id=i.id;
end $$;
