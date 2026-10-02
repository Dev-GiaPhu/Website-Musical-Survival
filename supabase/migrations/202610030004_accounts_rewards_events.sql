-- Unified account metadata, administrator rewards and mini-game events.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  initial_display_name text;
  initial_username text;
begin
  initial_display_name := nullif(
    trim(
      coalesce(
        new.raw_user_meta_data ->> 'display_name',
        new.raw_user_meta_data ->> 'full_name',
        ''
      )
    ),
    ''
  );

  initial_username := nullif(
    trim(coalesce(new.raw_user_meta_data ->> 'username', '')),
    ''
  );

  if initial_username is not null and initial_username !~ '^[A-Za-z0-9_]{3,20}$' then
    initial_username := null;
  end if;

  insert into public.profiles (id, display_name, username, username_changed_at)
  values (
    new.id,
    initial_display_name,
    initial_username,
    case when initial_username is not null then now() else null end
  )
  on conflict (id) do update
  set display_name = coalesce(public.profiles.display_name, excluded.display_name),
      username = coalesce(public.profiles.username, excluded.username),
      username_changed_at = coalesce(public.profiles.username_changed_at, excluded.username_changed_at);

  insert into public.wallets (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.player_game_state (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create or replace function public.complete_player_onboarding(
  new_username text,
  new_display_name text
)
returns void
language plpgsql
security definer
set search_path = public
as $
declare
  uid uuid := auth.uid();
  clean_username text := trim(new_username);
  clean_display_name text := trim(new_display_name);
  current_username text;
begin
  if uid is null then
    raise exception 'UNAUTHORIZED';
  end if;

  if clean_username !~ '^[A-Za-z0-9_]{3,20}
  target_user_id uuid,
  reward_amount bigint,
  reason text,
  source_reference text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  actor_role text;
  target_wallet public.wallets%rowtype;
  clean_reason text := trim(reason);
  new_balance bigint;
  reference_value text;
begin
  if actor_id is null then
    raise exception 'UNAUTHORIZED';
  end if;

  select role into actor_role
  from public.profiles
  where id = actor_id and status = 'active';

  if actor_role not in ('admin', 'super_admin') then
    raise exception 'FORBIDDEN';
  end if;

  if reward_amount <= 0 or reward_amount > 1000000000 then
    raise exception 'INVALID_AMOUNT';
  end if;

  if char_length(clean_reason) < 3 or char_length(clean_reason) > 500 then
    raise exception 'INVALID_REASON';
  end if;

  select * into target_wallet
  from public.wallets
  where user_id = target_user_id
  for update;

  if not found then
    raise exception 'WALLET_NOT_FOUND';
  end if;

  reference_value := case
    when source_reference is not null and trim(source_reference) <> ''
      then 'reward:' || trim(source_reference)
    else 'reward:' || gen_random_uuid()::text
  end;

  if exists (
    select 1 from public.wallet_ledger
    where reference_id = reference_value
  ) then
    raise exception 'DUPLICATE_REWARD';
  end if;

  new_balance := target_wallet.coin_balance + reward_amount;

  update public.wallets
  set coin_balance = new_balance,
      version = version + 1
  where id = target_wallet.id;

  insert into public.wallet_ledger(
    wallet_id,
    delta,
    balance_after,
    kind,
    reference_id,
    actor_user_id,
    metadata
  ) values (
    target_wallet.id,
    reward_amount,
    new_balance,
    'reward',
    reference_value,
    actor_id,
    jsonb_build_object('reason', clean_reason)
  );

  insert into public.audit_logs(
    actor_user_id,
    target_user_id,
    action,
    entity_type,
    entity_id,
    details
  ) values (
    actor_id,
    target_user_id,
    'wallet.reward_granted',
    'wallet',
    target_wallet.id::text,
    jsonb_build_object(
      'amount', reward_amount,
      'balanceAfter', new_balance,
      'reason', clean_reason,
      'reference', reference_value
    )
  );

  return jsonb_build_object(
    'balance', new_balance,
    'reference', reference_value
  );
end;
$$;

grant execute on function public.admin_grant_reward(uuid, bigint, text, text) to authenticated;

create table public.game_events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null check (char_length(title) between 3 and 120),
  summary text not null check (char_length(summary) between 3 and 280),
  rules text not null check (char_length(rules) between 3 and 12000),
  submission_prompt text not null default 'Bài dự thi',
  reward_description text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  max_entries integer check (max_entries is null or max_entries > 0),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'closed')),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index game_events_status_time_idx
  on public.game_events(status, starts_at, ends_at);

create table public.game_event_entries (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.game_events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  submission text not null check (char_length(submission) between 1 and 4000),
  status text not null default 'submitted'
    check (status in ('submitted', 'winner', 'not_selected')),
  reward_coins bigint not null default 0 check (reward_coins >= 0),
  admin_note text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  unique(event_id, user_id)
);

create index game_event_entries_event_idx
  on public.game_event_entries(event_id, submitted_at desc);

create trigger game_events_set_updated_at
before update on public.game_events
for each row execute function public.set_updated_at();

alter table public.game_events enable row level security;
alter table public.game_event_entries enable row level security;

create policy "game_events_public_select"
on public.game_events for select
using (status = 'published' or public.is_admin());

create policy "game_events_admin_insert"
on public.game_events for insert
with check (public.is_admin() and created_by = auth.uid());

create policy "game_events_admin_update"
on public.game_events for update
using (public.is_admin())
with check (public.is_admin());

create policy "game_events_admin_delete"
on public.game_events for delete
using (public.is_admin());

create policy "game_event_entries_select_own_or_admin"
on public.game_event_entries for select
using (user_id = auth.uid() or public.is_admin());

create policy "game_event_entries_admin_update"
on public.game_event_entries for update
using (public.is_admin())
with check (public.is_admin());

create or replace function public.get_game_event_phase(
  target_event_id uuid
)
returns text
language plpgsql
stable
security definer
set search_path = public
as $
declare
  target_event public.game_events%rowtype;
begin
  select * into target_event
  from public.game_events
  where id = target_event_id and status = 'published';

  if not found then
    return 'unavailable';
  end if;

  if now() < target_event.starts_at then
    return 'not_started';
  end if;

  if now() >= target_event.ends_at then
    return 'ended';
  end if;

  return 'open';
end;
$;

grant execute on function public.get_game_event_phase(uuid) to anon, authenticated;

create or replace function public.submit_game_event_entry(
  target_event_id uuid,
  submission_text text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  target_event public.game_events%rowtype;
  clean_submission text := trim(submission_text);
  entry_id uuid;
  current_entries integer;
begin
  if uid is null then
    raise exception 'UNAUTHORIZED';
  end if;

  if char_length(clean_submission) < 1 or char_length(clean_submission) > 4000 then
    raise exception 'INVALID_SUBMISSION';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = uid and status = 'active'
  ) then
    raise exception 'ACCOUNT_UNAVAILABLE';
  end if;

  select * into target_event
  from public.game_events
  where id = target_event_id
  for update;

  if not found or target_event.status <> 'published' then
    raise exception 'EVENT_NOT_AVAILABLE';
  end if;

  if now() < target_event.starts_at then
    raise exception 'EVENT_NOT_STARTED';
  end if;

  if now() >= target_event.ends_at then
    raise exception 'EVENT_ENDED';
  end if;

  if exists (
    select 1
    from public.game_event_entries
    where event_id = target_event_id and user_id = uid
  ) then
    raise exception 'ALREADY_SUBMITTED';
  end if;

  if target_event.max_entries is not null then
    select count(*) into current_entries
    from public.game_event_entries
    where event_id = target_event_id;

    if current_entries >= target_event.max_entries then
      raise exception 'EVENT_FULL';
    end if;
  end if;

  insert into public.game_event_entries(event_id, user_id, submission)
  values(target_event_id, uid, clean_submission)
  returning id into entry_id;

  insert into public.audit_logs(
    actor_user_id,
    target_user_id,
    action,
    entity_type,
    entity_id,
    details
  ) values (
    uid,
    uid,
    'event.entry_submitted',
    'game_event',
    target_event_id::text,
    jsonb_build_object('entryId', entry_id)
  );

  return entry_id;
end;
$$;

grant execute on function public.submit_game_event_entry(uuid, text) to authenticated;

create or replace function public.admin_award_event_entry(
  target_entry_id uuid,
  reward_amount bigint,
  note text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  actor_role text;
  target_entry public.game_event_entries%rowtype;
  target_wallet public.wallets%rowtype;
  clean_note text := trim(note);
  new_balance bigint;
  reference_value text;
begin
  if actor_id is null then
    raise exception 'UNAUTHORIZED';
  end if;

  select role into actor_role
  from public.profiles
  where id = actor_id and status = 'active';

  if actor_role not in ('admin', 'super_admin') then
    raise exception 'FORBIDDEN';
  end if;

  if reward_amount <= 0 or reward_amount > 1000000000 then
    raise exception 'INVALID_AMOUNT';
  end if;

  if char_length(clean_note) < 3 or char_length(clean_note) > 500 then
    raise exception 'INVALID_NOTE';
  end if;

  select * into target_entry
  from public.game_event_entries
  where id = target_entry_id
  for update;

  if not found then
    raise exception 'ENTRY_NOT_FOUND';
  end if;

  reference_value := 'event:' || target_entry.id::text;

  if target_entry.status = 'winner' or exists (
    select 1 from public.wallet_ledger where reference_id = reference_value
  ) then
    raise exception 'ENTRY_ALREADY_AWARDED';
  end if;

  select * into target_wallet
  from public.wallets
  where user_id = target_entry.user_id
  for update;

  if not found then
    raise exception 'WALLET_NOT_FOUND';
  end if;

  new_balance := target_wallet.coin_balance + reward_amount;

  update public.wallets
  set coin_balance = new_balance,
      version = version + 1
  where id = target_wallet.id;

  insert into public.wallet_ledger(
    wallet_id,
    delta,
    balance_after,
    kind,
    reference_id,
    actor_user_id,
    metadata
  ) values (
    target_wallet.id,
    reward_amount,
    new_balance,
    'reward',
    reference_value,
    actor_id,
    jsonb_build_object(
      'eventId', target_entry.event_id,
      'entryId', target_entry.id,
      'note', clean_note
    )
  );

  update public.game_event_entries
  set status = 'winner',
      reward_coins = reward_amount,
      admin_note = clean_note,
      reviewed_at = now(),
      reviewed_by = actor_id
  where id = target_entry.id;

  insert into public.audit_logs(
    actor_user_id,
    target_user_id,
    action,
    entity_type,
    entity_id,
    details
  ) values (
    actor_id,
    target_entry.user_id,
    'event.winner_awarded',
    'game_event_entry',
    target_entry.id::text,
    jsonb_build_object(
      'eventId', target_entry.event_id,
      'reward', reward_amount,
      'balanceAfter', new_balance,
      'note', clean_note
    )
  );

  return jsonb_build_object(
    'balance', new_balance,
    'reward', reward_amount
  );
end;
$$;

grant execute on function public.admin_award_event_entry(uuid, bigint, text) to authenticated;
 then
    raise exception 'INVALID_USERNAME';
  end if;

  if char_length(clean_display_name) < 1 or char_length(clean_display_name) > 32 then
    raise exception 'INVALID_DISPLAY_NAME';
  end if;

  select username into current_username
  from public.profiles
  where id = uid and status = 'active'
  for update;

  if not found then
    raise exception 'ACCOUNT_UNAVAILABLE';
  end if;

  if current_username is not null then
    raise exception 'ONBOARDING_ALREADY_COMPLETE';
  end if;

  if exists (
    select 1
    from public.profiles
    where id <> uid and lower(username) = lower(clean_username)
  ) then
    raise exception 'USERNAME_TAKEN';
  end if;

  update public.profiles
  set username = clean_username,
      display_name = clean_display_name,
      username_changed_at = now()
  where id = uid;

  insert into public.audit_logs(
    actor_user_id,
    target_user_id,
    action,
    entity_type,
    entity_id,
    details
  ) values (
    uid,
    uid,
    'profile.onboarding_completed',
    'profile',
    uid::text,
    jsonb_build_object('username', clean_username)
  );
end;
$;

grant execute on function public.complete_player_onboarding(text, text) to authenticated;

create or replace function public.admin_grant_reward(
  target_user_id uuid,
  reward_amount bigint,
  reason text,
  source_reference text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  actor_role text;
  target_wallet public.wallets%rowtype;
  clean_reason text := trim(reason);
  new_balance bigint;
  reference_value text;
begin
  if actor_id is null then
    raise exception 'UNAUTHORIZED';
  end if;

  select role into actor_role
  from public.profiles
  where id = actor_id and status = 'active';

  if actor_role not in ('admin', 'super_admin') then
    raise exception 'FORBIDDEN';
  end if;

  if reward_amount <= 0 or reward_amount > 1000000000 then
    raise exception 'INVALID_AMOUNT';
  end if;

  if char_length(clean_reason) < 3 or char_length(clean_reason) > 500 then
    raise exception 'INVALID_REASON';
  end if;

  select * into target_wallet
  from public.wallets
  where user_id = target_user_id
  for update;

  if not found then
    raise exception 'WALLET_NOT_FOUND';
  end if;

  reference_value := case
    when source_reference is not null and trim(source_reference) <> ''
      then 'reward:' || trim(source_reference)
    else 'reward:' || gen_random_uuid()::text
  end;

  if exists (
    select 1 from public.wallet_ledger
    where reference_id = reference_value
  ) then
    raise exception 'DUPLICATE_REWARD';
  end if;

  new_balance := target_wallet.coin_balance + reward_amount;

  update public.wallets
  set coin_balance = new_balance,
      version = version + 1
  where id = target_wallet.id;

  insert into public.wallet_ledger(
    wallet_id,
    delta,
    balance_after,
    kind,
    reference_id,
    actor_user_id,
    metadata
  ) values (
    target_wallet.id,
    reward_amount,
    new_balance,
    'reward',
    reference_value,
    actor_id,
    jsonb_build_object('reason', clean_reason)
  );

  insert into public.audit_logs(
    actor_user_id,
    target_user_id,
    action,
    entity_type,
    entity_id,
    details
  ) values (
    actor_id,
    target_user_id,
    'wallet.reward_granted',
    'wallet',
    target_wallet.id::text,
    jsonb_build_object(
      'amount', reward_amount,
      'balanceAfter', new_balance,
      'reason', clean_reason,
      'reference', reference_value
    )
  );

  return jsonb_build_object(
    'balance', new_balance,
    'reference', reference_value
  );
end;
$$;

grant execute on function public.admin_grant_reward(uuid, bigint, text, text) to authenticated;

create table public.game_events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null check (char_length(title) between 3 and 120),
  summary text not null check (char_length(summary) between 3 and 280),
  rules text not null check (char_length(rules) between 3 and 12000),
  submission_prompt text not null default 'Bài dự thi',
  reward_description text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  max_entries integer check (max_entries is null or max_entries > 0),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'closed')),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index game_events_status_time_idx
  on public.game_events(status, starts_at, ends_at);

create table public.game_event_entries (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.game_events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  submission text not null check (char_length(submission) between 1 and 4000),
  status text not null default 'submitted'
    check (status in ('submitted', 'winner', 'not_selected')),
  reward_coins bigint not null default 0 check (reward_coins >= 0),
  admin_note text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  unique(event_id, user_id)
);

create index game_event_entries_event_idx
  on public.game_event_entries(event_id, submitted_at desc);

create trigger game_events_set_updated_at
before update on public.game_events
for each row execute function public.set_updated_at();

alter table public.game_events enable row level security;
alter table public.game_event_entries enable row level security;

create policy "game_events_public_select"
on public.game_events for select
using (status = 'published' or public.is_admin());

create policy "game_events_admin_insert"
on public.game_events for insert
with check (public.is_admin() and created_by = auth.uid());

create policy "game_events_admin_update"
on public.game_events for update
using (public.is_admin())
with check (public.is_admin());

create policy "game_events_admin_delete"
on public.game_events for delete
using (public.is_admin());

create policy "game_event_entries_select_own_or_admin"
on public.game_event_entries for select
using (user_id = auth.uid() or public.is_admin());

create policy "game_event_entries_admin_update"
on public.game_event_entries for update
using (public.is_admin())
with check (public.is_admin());

create or replace function public.submit_game_event_entry(
  target_event_id uuid,
  submission_text text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  target_event public.game_events%rowtype;
  clean_submission text := trim(submission_text);
  entry_id uuid;
  current_entries integer;
begin
  if uid is null then
    raise exception 'UNAUTHORIZED';
  end if;

  if char_length(clean_submission) < 1 or char_length(clean_submission) > 4000 then
    raise exception 'INVALID_SUBMISSION';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = uid and status = 'active'
  ) then
    raise exception 'ACCOUNT_UNAVAILABLE';
  end if;

  select * into target_event
  from public.game_events
  where id = target_event_id
  for update;

  if not found or target_event.status <> 'published' then
    raise exception 'EVENT_NOT_AVAILABLE';
  end if;

  if now() < target_event.starts_at then
    raise exception 'EVENT_NOT_STARTED';
  end if;

  if now() >= target_event.ends_at then
    raise exception 'EVENT_ENDED';
  end if;

  if exists (
    select 1
    from public.game_event_entries
    where event_id = target_event_id and user_id = uid
  ) then
    raise exception 'ALREADY_SUBMITTED';
  end if;

  if target_event.max_entries is not null then
    select count(*) into current_entries
    from public.game_event_entries
    where event_id = target_event_id;

    if current_entries >= target_event.max_entries then
      raise exception 'EVENT_FULL';
    end if;
  end if;

  insert into public.game_event_entries(event_id, user_id, submission)
  values(target_event_id, uid, clean_submission)
  returning id into entry_id;

  insert into public.audit_logs(
    actor_user_id,
    target_user_id,
    action,
    entity_type,
    entity_id,
    details
  ) values (
    uid,
    uid,
    'event.entry_submitted',
    'game_event',
    target_event_id::text,
    jsonb_build_object('entryId', entry_id)
  );

  return entry_id;
end;
$$;

grant execute on function public.submit_game_event_entry(uuid, text) to authenticated;

create or replace function public.admin_award_event_entry(
  target_entry_id uuid,
  reward_amount bigint,
  note text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  actor_role text;
  target_entry public.game_event_entries%rowtype;
  target_wallet public.wallets%rowtype;
  clean_note text := trim(note);
  new_balance bigint;
  reference_value text;
begin
  if actor_id is null then
    raise exception 'UNAUTHORIZED';
  end if;

  select role into actor_role
  from public.profiles
  where id = actor_id and status = 'active';

  if actor_role not in ('admin', 'super_admin') then
    raise exception 'FORBIDDEN';
  end if;

  if reward_amount <= 0 or reward_amount > 1000000000 then
    raise exception 'INVALID_AMOUNT';
  end if;

  if char_length(clean_note) < 3 or char_length(clean_note) > 500 then
    raise exception 'INVALID_NOTE';
  end if;

  select * into target_entry
  from public.game_event_entries
  where id = target_entry_id
  for update;

  if not found then
    raise exception 'ENTRY_NOT_FOUND';
  end if;

  reference_value := 'event:' || target_entry.id::text;

  if target_entry.status = 'winner' or exists (
    select 1 from public.wallet_ledger where reference_id = reference_value
  ) then
    raise exception 'ENTRY_ALREADY_AWARDED';
  end if;

  select * into target_wallet
  from public.wallets
  where user_id = target_entry.user_id
  for update;

  if not found then
    raise exception 'WALLET_NOT_FOUND';
  end if;

  new_balance := target_wallet.coin_balance + reward_amount;

  update public.wallets
  set coin_balance = new_balance,
      version = version + 1
  where id = target_wallet.id;

  insert into public.wallet_ledger(
    wallet_id,
    delta,
    balance_after,
    kind,
    reference_id,
    actor_user_id,
    metadata
  ) values (
    target_wallet.id,
    reward_amount,
    new_balance,
    'reward',
    reference_value,
    actor_id,
    jsonb_build_object(
      'eventId', target_entry.event_id,
      'entryId', target_entry.id,
      'note', clean_note
    )
  );

  update public.game_event_entries
  set status = 'winner',
      reward_coins = reward_amount,
      admin_note = clean_note,
      reviewed_at = now(),
      reviewed_by = actor_id
  where id = target_entry.id;

  insert into public.audit_logs(
    actor_user_id,
    target_user_id,
    action,
    entity_type,
    entity_id,
    details
  ) values (
    actor_id,
    target_entry.user_id,
    'event.winner_awarded',
    'game_event_entry',
    target_entry.id::text,
    jsonb_build_object(
      'eventId', target_entry.event_id,
      'reward', reward_amount,
      'balanceAfter', new_balance,
      'note', clean_note
    )
  );

  return jsonb_build_object(
    'balance', new_balance,
    'reward', reward_amount
  );
end;
$$;

grant execute on function public.admin_award_event_entry(uuid, bigint, text) to authenticated;
