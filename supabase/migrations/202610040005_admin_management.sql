-- Additional publisher-management operations.

create or replace function public.admin_set_player_role(
  target_user_id uuid,
  new_role text,
  reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  actor_role text;
  target_role text;
  clean_reason text := trim(reason);
begin
  if actor_id is null then
    raise exception 'UNAUTHORIZED';
  end if;

  select role
  into actor_role
  from public.profiles
  where id = actor_id and status = 'active';

  if actor_role <> 'super_admin' then
    raise exception 'FORBIDDEN';
  end if;

  if new_role not in ('player', 'moderator', 'admin', 'super_admin') then
    raise exception 'INVALID_ROLE';
  end if;

  if char_length(clean_reason) < 3 or char_length(clean_reason) > 500 then
    raise exception 'INVALID_REASON';
  end if;

  select role
  into target_role
  from public.profiles
  where id = target_user_id
  for update;

  if not found then
    raise exception 'PLAYER_NOT_FOUND';
  end if;

  if target_user_id = actor_id and new_role <> 'super_admin' then
    raise exception 'CANNOT_DEMOTE_SELF';
  end if;

  update public.profiles
  set role = new_role
  where id = target_user_id;

  insert into public.audit_logs(
    actor_user_id,
    target_user_id,
    action,
    entity_type,
    entity_id,
    details
  )
  values (
    actor_id,
    target_user_id,
    'player.role_changed',
    'profile',
    target_user_id::text,
    jsonb_build_object(
      'oldRole', target_role,
      'newRole', new_role,
      'reason', clean_reason
    )
  );
end;
$$;

revoke all on function public.admin_set_player_role(uuid, text, text) from public, anon;
grant execute on function public.admin_set_player_role(uuid, text, text) to authenticated;
