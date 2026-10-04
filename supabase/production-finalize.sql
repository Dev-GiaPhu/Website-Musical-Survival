-- Musical Survival production finalization bundle
-- Production already has migrations 001-003.
-- Run this entire file once in Supabase SQL Editor before deploying the current main branch.
-- It contains migrations 004, 005 and 006 in order.

-- ============================================================================
-- supabase/migrations/202610030004_accounts_rewards_events.sql
-- ============================================================================

-- Musical Survival unified accounts, rewards and mini-game events.
-- Safe to re-run after migrations 001-003.

create extension if not exists pgcrypto;

-- Keep website/game account creation in one auth.users -> profile/wallet/game-state flow.
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

  if initial_username is not null
     and initial_username !~ '^[A-Za-z0-9_]{3,20}$' then
    initial_username := null;
  end if;

  insert into public.profiles (
    id,
    display_name,
    username,
    username_changed_at
  )
  values (
    new.id,
    initial_display_name,
    initial_username,
    case when initial_username is not null then now() else null end
  )
  on conflict (id) do update
  set display_name = coalesce(public.profiles.display_name, excluded.display_name),
      username = coalesce(public.profiles.username, excluded.username),
      username_changed_at = coalesce(
        public.profiles.username_changed_at,
        excluded.username_changed_at
      );

  insert into public.wallets (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.player_game_state (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- Google/OAuth accounts must finish their in-game identity atomically.
create or replace function public.complete_player_onboarding(
  new_username text,
  new_display_name text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  clean_username text := trim(new_username);
  clean_display_name text := trim(new_display_name);
  current_username text;
begin
  if uid is null then
    raise exception 'UNAUTHORIZED';
  end if;

  if clean_username !~ '^[A-Za-z0-9_]{3,20}$' then
    raise exception 'INVALID_USERNAME';
  end if;

  if char_length(clean_display_name) < 1
     or char_length(clean_display_name) > 32 then
    raise exception 'INVALID_DISPLAY_NAME';
  end if;

  select username
  into current_username
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
    where id <> uid
      and lower(username) = lower(clean_username)
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
  )
  values (
    uid,
    uid,
    'profile.onboarding_completed',
    'profile',
    uid::text,
    jsonb_build_object('username', clean_username)
  );
end;
$$;

revoke all on function public.complete_player_onboarding(text, text) from public, anon;
grant execute on function public.complete_player_onboarding(text, text) to authenticated;

-- Admin reward operation. Unlike raw balance adjustment, both admin and
-- super_admin may grant positive rewards, always with ledger + audit entries.
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

  select role
  into actor_role
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

  select *
  into target_wallet
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
    select 1
    from public.wallet_ledger
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
  )
  values (
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
  )
  values (
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

revoke all on function public.admin_grant_reward(uuid, bigint, text, text) from public, anon;
grant execute on function public.admin_grant_reward(uuid, bigint, text, text) to authenticated;

-- Official events / mini-games.
create table if not exists public.game_events (
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

create index if not exists game_events_status_time_idx
  on public.game_events(status, starts_at, ends_at);

create table if not exists public.game_event_entries (
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

create index if not exists game_event_entries_event_idx
  on public.game_event_entries(event_id, submitted_at desc);

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'game_events_set_updated_at'
      and tgrelid = 'public.game_events'::regclass
  ) then
    create trigger game_events_set_updated_at
    before update on public.game_events
    for each row execute function public.set_updated_at();
  end if;
end;
$$;

alter table public.game_events enable row level security;
alter table public.game_event_entries enable row level security;

drop policy if exists "game_events_public_select" on public.game_events;
create policy "game_events_public_select"
on public.game_events for select
using (status = 'published' or public.is_admin());

drop policy if exists "game_events_admin_insert" on public.game_events;
create policy "game_events_admin_insert"
on public.game_events for insert
with check (public.is_admin() and created_by = auth.uid());

drop policy if exists "game_events_admin_update" on public.game_events;
create policy "game_events_admin_update"
on public.game_events for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "game_events_admin_delete" on public.game_events;
create policy "game_events_admin_delete"
on public.game_events for delete
using (public.is_admin());

drop policy if exists "game_event_entries_select_own_or_admin" on public.game_event_entries;
create policy "game_event_entries_select_own_or_admin"
on public.game_event_entries for select
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "game_event_entries_admin_update" on public.game_event_entries;
create policy "game_event_entries_admin_update"
on public.game_event_entries for update
using (public.is_admin())
with check (public.is_admin());

-- Authoritative event phase uses database time.
create or replace function public.get_game_event_phase(
  target_event_id uuid
)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  target_event public.game_events%rowtype;
begin
  select *
  into target_event
  from public.game_events
  where id = target_event_id
    and status = 'published';

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
$$;

grant execute on function public.get_game_event_phase(uuid) to anon, authenticated;

-- One entry per account; capacity and time-window checked transactionally.
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

  select *
  into target_event
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
    select count(*)
    into current_entries
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
  )
  values (
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

revoke all on function public.submit_game_event_entry(uuid, text) from public, anon;
grant execute on function public.submit_game_event_entry(uuid, text) to authenticated;

-- Winner selection and reward credit happen in one database transaction.
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

  select role
  into actor_role
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

  select *
  into target_entry
  from public.game_event_entries
  where id = target_entry_id
  for update;

  if not found then
    raise exception 'ENTRY_NOT_FOUND';
  end if;

  reference_value := 'event:' || target_entry.id::text;

  if target_entry.status = 'winner'
     or exists (
       select 1
       from public.wallet_ledger
       where reference_id = reference_value
     ) then
    raise exception 'ENTRY_ALREADY_AWARDED';
  end if;

  select *
  into target_wallet
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
  )
  values (
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
  )
  values (
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

revoke all on function public.admin_award_event_entry(uuid, bigint, text) from public, anon;
grant execute on function public.admin_award_event_entry(uuid, bigint, text) to authenticated;


-- ============================================================================
-- supabase/migrations/202610040005_admin_management.sql
-- ============================================================================

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


create or replace function public.admin_list_players(
  search_text text default '',
  status_filter text default '',
  page_limit integer default 50,
  page_offset integer default 0
)
returns table (
  id uuid,
  username text,
  display_name text,
  role text,
  status text,
  created_at timestamptz,
  last_seen_at timestamptz,
  is_online boolean,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  q text := trim(coalesce(search_text, ''));
  normalized_status text := trim(coalesce(status_filter, ''));
  safe_limit integer := least(greatest(page_limit, 1), 100);
  safe_offset integer := greatest(page_offset, 0);
begin
  if actor_id is null or not public.is_admin() then
    raise exception 'FORBIDDEN';
  end if;

  if normalized_status <> ''
     and normalized_status not in ('active', 'suspended', 'banned') then
    raise exception 'INVALID_STATUS_FILTER';
  end if;

  return query
  select
    p.id,
    p.username,
    p.display_name,
    p.role,
    p.status,
    p.created_at,
    p.last_seen_at,
    coalesce(p.last_seen_at >= now() - interval '2 minutes', false) as is_online,
    count(*) over() as total_count
  from public.profiles p
  where
    (normalized_status = '' or p.status = normalized_status)
    and (
      q = ''
      or p.id::text ilike '%' || q || '%'
      or coalesce(p.username, '') ilike '%' || q || '%'
      or coalesce(p.display_name, '') ilike '%' || q || '%'
    )
  order by p.created_at desc
  limit safe_limit
  offset safe_offset;
end;
$$;

revoke all on function public.admin_list_players(text, text, integer, integer) from public, anon;
grant execute on function public.admin_list_players(text, text, integer, integer) to authenticated;


-- ============================================================================
-- supabase/migrations/202610040006_account_deletion_retention.sql
-- ============================================================================

-- Account deletion retention rules.
-- Personal game/profile data cascades with auth.users.
-- Minimal financial/publisher records may remain, but their direct profile FK is nulled.

-- Wallet ledger must survive wallet deletion for transaction integrity.
alter table public.wallet_ledger
  alter column wallet_id drop not null;

alter table public.wallet_ledger
  drop constraint if exists wallet_ledger_wallet_id_fkey;

alter table public.wallet_ledger
  add constraint wallet_ledger_wallet_id_fkey
  foreign key (wallet_id)
  references public.wallets(id)
  on delete set null;

-- Payment orders must survive account deletion for provider reconciliation.
alter table public.payment_orders
  alter column user_id drop not null;

alter table public.payment_orders
  drop constraint if exists payment_orders_user_id_fkey;

alter table public.payment_orders
  add constraint payment_orders_user_id_fkey
  foreign key (user_id)
  references public.profiles(id)
  on delete set null;

-- Published content should remain if its author account is later deleted.
alter table public.news_posts
  alter column author_id drop not null;

alter table public.news_posts
  drop constraint if exists news_posts_author_id_fkey;

alter table public.news_posts
  add constraint news_posts_author_id_fkey
  foreign key (author_id)
  references public.profiles(id)
  on delete set null;

alter table public.announcements
  alter column author_id drop not null;

alter table public.announcements
  drop constraint if exists announcements_author_id_fkey;

alter table public.announcements
  add constraint announcements_author_id_fkey
  foreign key (author_id)
  references public.profiles(id)
  on delete set null;

alter table public.game_events
  alter column created_by drop not null;

alter table public.game_events
  drop constraint if exists game_events_created_by_fkey;

alter table public.game_events
  add constraint game_events_created_by_fkey
  foreign key (created_by)
  references public.profiles(id)
  on delete set null;

-- Existing policies continue to work:
-- payment_orders rows with user_id NULL are no longer visible to players,
-- while admins retain access through public.is_admin().


drop policy if exists "wallet_ledger_admin_orphan_select" on public.wallet_ledger;
create policy "wallet_ledger_admin_orphan_select"
on public.wallet_ledger for select
using (wallet_id is null and public.is_admin());

