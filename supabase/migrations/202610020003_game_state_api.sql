-- Safe game data operations.
-- Player clients may save their own opaque save-state with optimistic concurrency.
-- Trusted game servers retain authority over progression and achievement grants.

create or replace function public.save_player_state(
  expected_revision bigint,
  new_state jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  current_state public.player_game_state%rowtype;
  next_revision bigint;
begin
  if uid is null then
    raise exception 'UNAUTHORIZED';
  end if;

  if new_state is null or jsonb_typeof(new_state) <> 'object' then
    raise exception 'INVALID_STATE';
  end if;

  if pg_column_size(new_state) > 65536 then
    raise exception 'STATE_TOO_LARGE';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = uid and status = 'active'
  ) then
    raise exception 'ACCOUNT_UNAVAILABLE';
  end if;

  select * into current_state
  from public.player_game_state
  where user_id = uid
  for update;

  if not found then
    insert into public.player_game_state(user_id, state, revision)
    values(uid, new_state, 1)
    returning revision into next_revision;

    return jsonb_build_object('revision', next_revision, 'state', new_state);
  end if;

  if current_state.revision <> expected_revision then
    raise exception 'STATE_CONFLICT';
  end if;

  next_revision := current_state.revision + 1;

  update public.player_game_state
  set state = new_state,
      revision = next_revision,
      updated_at = now()
  where user_id = uid;

  return jsonb_build_object('revision', next_revision, 'state', new_state);
end;
$$;

create or replace function public.server_update_player_progress(
  target_user_id uuid,
  new_level integer,
  new_xp bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'FORBIDDEN';
  end if;

  if new_level < 1 or new_level > 1000000 or new_xp < 0 then
    raise exception 'INVALID_PROGRESS';
  end if;

  insert into public.player_game_state(user_id, level, xp)
  values(target_user_id, new_level, new_xp)
  on conflict (user_id) do update
  set level = excluded.level,
      xp = excluded.xp,
      updated_at = now();

  insert into public.audit_logs(
    target_user_id,
    action,
    entity_type,
    entity_id,
    details
  ) values (
    target_user_id,
    'game.progress_updated',
    'player_game_state',
    target_user_id::text,
    jsonb_build_object('level', new_level, 'xp', new_xp)
  );

  return jsonb_build_object('level', new_level, 'xp', new_xp);
end;
$$;

create or replace function public.server_unlock_achievement(
  target_user_id uuid,
  target_code text,
  achievement_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_achievement public.achievements%rowtype;
  unlocked_at_value timestamptz;
begin
  if auth.role() <> 'service_role' then
    raise exception 'FORBIDDEN';
  end if;

  if achievement_metadata is null or jsonb_typeof(achievement_metadata) <> 'object' then
    raise exception 'INVALID_METADATA';
  end if;

  if pg_column_size(achievement_metadata) > 16384 then
    raise exception 'METADATA_TOO_LARGE';
  end if;

  select * into target_achievement
  from public.achievements
  where code = target_code and active = true;

  if not found then
    raise exception 'ACHIEVEMENT_NOT_FOUND';
  end if;

  insert into public.player_achievements(
    user_id,
    achievement_id,
    metadata
  ) values (
    target_user_id,
    target_achievement.id,
    achievement_metadata
  )
  on conflict (user_id, achievement_id) do update
  set metadata = public.player_achievements.metadata || excluded.metadata
  returning unlocked_at into unlocked_at_value;

  insert into public.audit_logs(
    target_user_id,
    action,
    entity_type,
    entity_id,
    details
  ) values (
    target_user_id,
    'achievement.unlocked',
    'achievement',
    target_achievement.id::text,
    jsonb_build_object('code', target_achievement.code)
  );

  return jsonb_build_object(
    'code', target_achievement.code,
    'unlockedAt', unlocked_at_value
  );
end;
$$;

grant execute on function public.save_player_state(bigint, jsonb) to authenticated;

revoke all on function public.server_update_player_progress(uuid, integer, bigint) from public, anon, authenticated;
grant execute on function public.server_update_player_progress(uuid, integer, bigint) to service_role;

revoke all on function public.server_unlock_achievement(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.server_unlock_achievement(uuid, text, jsonb) to service_role;
