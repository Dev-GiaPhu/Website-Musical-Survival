-- Musical Survival — complete production database bootstrap
-- Use this file for a NEW/EMPTY Supabase project or a project missing core tables
-- such as public.wallets.
--
-- IMPORTANT:
-- This is a full schema installer. Do not run it over a populated production
-- database whose core schema already exists. For an already initialized
-- database, use supabase/production-finalize.sql instead.
--
-- Order: 001 -> 002 -> 003 -> 004 -> 005 -> 006

-- ============================================================================
-- supabase/migrations/202610020001_initial.sql
-- ============================================================================

-- Musical Survival initial production schema
-- Apply with Supabase CLI or paste into the Supabase SQL editor once per environment.

create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  display_name text,
  role text not null default 'player' check (role in ('player','moderator','admin','super_admin')),
  status text not null default 'active' check (status in ('active','suspended','banned')),
  username_changed_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index profiles_username_unique
  on public.profiles (lower(username))
  where username is not null;

create table public.username_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  old_username text not null,
  changed_at timestamptz not null default now()
);

create table public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  coin_balance bigint not null default 0 check (coin_balance >= 0),
  version bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references public.wallets(id) on delete restrict,
  delta bigint not null check (delta <> 0),
  balance_after bigint not null check (balance_after >= 0),
  kind text not null check (kind in ('topup','purchase','refund','admin_adjustment','reward')),
  reference_id text unique,
  actor_user_id uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index wallet_ledger_wallet_created_idx
  on public.wallet_ledger(wallet_id, created_at desc);

create table public.topup_packages (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  vnd_amount integer not null check (vnd_amount > 0),
  coin_amount bigint not null check (coin_amount > 0),
  active boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  package_id uuid not null references public.topup_packages(id) on delete restrict,
  provider text not null check (provider in ('momo')),
  provider_order_id text not null unique,
  provider_request_id text not null unique,
  provider_transaction_id text unique,
  idempotency_key uuid not null unique,
  amount_vnd integer not null check (amount_vnd > 0),
  coin_amount bigint not null check (coin_amount > 0),
  status text not null default 'pending' check (status in ('pending','paid','failed','refunded')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index payment_orders_user_created_idx
  on public.payment_orders(user_id, created_at desc);

create table public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_order_id text,
  provider_transaction_id text,
  valid_signature boolean not null default false,
  payload jsonb not null,
  received_at timestamptz not null default now()
);

create table public.news_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text not null,
  content text not null,
  published boolean not null default false,
  author_id uuid not null references public.profiles(id) on delete restrict,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index news_posts_published_idx
  on public.news_posts(published, published_at desc);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  severity text not null default 'info' check (severity in ('info','warning','important')),
  active boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  author_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text not null,
  hidden boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.player_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete restrict,
  unlocked_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique(user_id, achievement_id)
);

create table public.player_game_state (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  level integer not null default 1 check (level >= 1),
  xp bigint not null default 0 check (xp >= 0),
  revision bigint not null default 0,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.store_items (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  price_coins bigint not null check (price_coins >= 0),
  active boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.player_inventory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid not null references public.store_items(id) on delete restrict,
  acquired_at timestamptz not null default now(),
  source text not null,
  metadata jsonb not null default '{}'::jsonb,
  unique(user_id, item_id)
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid references public.profiles(id) on delete set null,
  target_user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_created_idx on public.audit_logs(created_at desc);

create table public.security_events (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  severity text not null default 'info' check (severity in ('info','warning','critical')),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger wallets_set_updated_at
before update on public.wallets
for each row execute function public.set_updated_at();

create trigger topup_packages_set_updated_at
before update on public.topup_packages
for each row execute function public.set_updated_at();

create trigger payment_orders_set_updated_at
before update on public.payment_orders
for each row execute function public.set_updated_at();

create trigger news_posts_set_updated_at
before update on public.news_posts
for each row execute function public.set_updated_at();

create trigger announcements_set_updated_at
before update on public.announcements
for each row execute function public.set_updated_at();

create trigger store_items_set_updated_at
before update on public.store_items
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  initial_display_name text;
begin
  initial_display_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');

  insert into public.profiles (id, display_name)
  values (new.id, initial_display_name)
  on conflict (id) do nothing;

  insert into public.wallets (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.player_game_state (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('admin','super_admin')
      and status = 'active'
  );
$$;

create or replace function public.update_display_name(new_display_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  clean_name text := trim(new_display_name);
begin
  if uid is null then raise exception 'UNAUTHORIZED'; end if;
  if char_length(clean_name) < 1 or char_length(clean_name) > 32 then
    raise exception 'INVALID_DISPLAY_NAME';
  end if;

  update public.profiles
  set display_name = clean_name
  where id = uid and status = 'active';

  if not found then raise exception 'ACCOUNT_UNAVAILABLE'; end if;

  insert into public.audit_logs(actor_user_id, target_user_id, action, entity_type, entity_id)
  values(uid, uid, 'profile.display_name_changed', 'profile', uid::text);
end;
$$;

create or replace function public.change_username(new_username text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  clean_username text := trim(new_username);
  current_username text;
  last_changed timestamptz;
begin
  if uid is null then raise exception 'UNAUTHORIZED'; end if;

  if clean_username !~ '^[A-Za-z0-9_]{3,20}$' then
    raise exception 'INVALID_USERNAME';
  end if;

  select username, username_changed_at
  into current_username, last_changed
  from public.profiles
  where id = uid and status = 'active'
  for update;

  if not found then raise exception 'ACCOUNT_UNAVAILABLE'; end if;

  if current_username is not null and lower(current_username) = lower(clean_username) then
    return;
  end if;

  if last_changed is not null and last_changed > now() - interval '30 days' then
    raise exception 'USERNAME_COOLDOWN';
  end if;

  if exists (
    select 1 from public.profiles
    where id <> uid and lower(username) = lower(clean_username)
  ) then
    raise exception 'USERNAME_TAKEN';
  end if;

  if current_username is not null then
    insert into public.username_history(user_id, old_username)
    values(uid, current_username);
  end if;

  update public.profiles
  set username = clean_username, username_changed_at = now()
  where id = uid;

  insert into public.audit_logs(actor_user_id, target_user_id, action, entity_type, entity_id, details)
  values(uid, uid, 'profile.username_changed', 'profile', uid::text, jsonb_build_object('old', current_username));
end;
$$;

create or replace function public.touch_presence()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'UNAUTHORIZED'; end if;

  update public.profiles
  set last_seen_at = now()
  where id = uid and status = 'active';
end;
$$;

create or replace function public.finalize_payment_order(
  target_order_id uuid,
  provider_transaction_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_order public.payment_orders%rowtype;
  target_wallet public.wallets%rowtype;
  new_balance bigint;
begin
  if auth.role() <> 'service_role' then
    raise exception 'FORBIDDEN';
  end if;

  select * into target_order
  from public.payment_orders
  where id = target_order_id
  for update;

  if not found then raise exception 'ORDER_NOT_FOUND'; end if;

  if target_order.status = 'paid' then
    return;
  end if;

  if target_order.status <> 'pending' then
    raise exception 'ORDER_NOT_PENDING';
  end if;

  if provider_transaction_id is null or provider_transaction_id = '' then
    raise exception 'INVALID_TRANSACTION_ID';
  end if;

  if exists (
    select 1 from public.payment_orders
    where provider_transaction_id = finalize_payment_order.provider_transaction_id
      and id <> target_order_id
  ) then
    raise exception 'DUPLICATE_PROVIDER_TRANSACTION';
  end if;

  select * into target_wallet
  from public.wallets
  where user_id = target_order.user_id
  for update;

  if not found then raise exception 'WALLET_NOT_FOUND'; end if;

  new_balance := target_wallet.coin_balance + target_order.coin_amount;

  update public.wallets
  set coin_balance = new_balance,
      version = version + 1
  where id = target_wallet.id;

  insert into public.wallet_ledger(
    wallet_id, delta, balance_after, kind, reference_id, metadata
  ) values (
    target_wallet.id,
    target_order.coin_amount,
    new_balance,
    'topup',
    'payment:' || target_order.id::text,
    jsonb_build_object(
      'provider', target_order.provider,
      'providerTransactionId', provider_transaction_id
    )
  );

  update public.payment_orders
  set status = 'paid',
      provider_transaction_id = finalize_payment_order.provider_transaction_id,
      paid_at = now()
  where id = target_order.id;

  insert into public.audit_logs(target_user_id, action, entity_type, entity_id, details)
  values(
    target_order.user_id,
    'payment.finalized',
    'payment_order',
    target_order.id::text,
    jsonb_build_object('amountVnd', target_order.amount_vnd, 'coins', target_order.coin_amount)
  );
end;
$$;

create or replace function public.purchase_store_item(target_sku text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  item public.store_items%rowtype;
  target_wallet public.wallets%rowtype;
  new_balance bigint;
  purchase_id uuid := gen_random_uuid();
begin
  if uid is null then raise exception 'UNAUTHORIZED'; end if;

  if not exists (
    select 1 from public.profiles
    where id = uid and status = 'active'
  ) then
    raise exception 'ACCOUNT_UNAVAILABLE';
  end if;

  select * into item
  from public.store_items
  where sku = target_sku and active = true;

  if not found then raise exception 'ITEM_NOT_FOUND'; end if;

  if exists (
    select 1 from public.player_inventory
    where user_id = uid and item_id = item.id
  ) then
    raise exception 'ITEM_ALREADY_OWNED';
  end if;

  select * into target_wallet
  from public.wallets
  where user_id = uid
  for update;

  if target_wallet.coin_balance < item.price_coins then
    raise exception 'INSUFFICIENT_BALANCE';
  end if;

  new_balance := target_wallet.coin_balance - item.price_coins;

  update public.wallets
  set coin_balance = new_balance,
      version = version + 1
  where id = target_wallet.id;

  insert into public.wallet_ledger(
    wallet_id, delta, balance_after, kind, reference_id, actor_user_id, metadata
  ) values (
    target_wallet.id,
    -item.price_coins,
    new_balance,
    'purchase',
    'purchase:' || purchase_id::text,
    uid,
    jsonb_build_object('sku', item.sku, 'itemId', item.id)
  );

  insert into public.player_inventory(user_id, item_id, source)
  values(uid, item.id, 'store');

  insert into public.audit_logs(actor_user_id, target_user_id, action, entity_type, entity_id, details)
  values(uid, uid, 'store.purchase', 'store_item', item.id::text, jsonb_build_object('sku', item.sku));

  return jsonb_build_object(
    'purchaseId', purchase_id,
    'sku', item.sku,
    'balance', new_balance
  );
end;
$$;

alter table public.profiles enable row level security;
alter table public.username_history enable row level security;
alter table public.wallets enable row level security;
alter table public.wallet_ledger enable row level security;
alter table public.topup_packages enable row level security;
alter table public.payment_orders enable row level security;
alter table public.payment_webhook_events enable row level security;
alter table public.news_posts enable row level security;
alter table public.announcements enable row level security;
alter table public.achievements enable row level security;
alter table public.player_achievements enable row level security;
alter table public.player_game_state enable row level security;
alter table public.store_items enable row level security;
alter table public.player_inventory enable row level security;
alter table public.audit_logs enable row level security;
alter table public.security_events enable row level security;

create policy "profiles_select_own_or_admin"
on public.profiles for select
using (id = auth.uid() or public.is_admin());

create policy "username_history_select_own_or_admin"
on public.username_history for select
using (user_id = auth.uid() or public.is_admin());

create policy "wallets_select_own_or_admin"
on public.wallets for select
using (user_id = auth.uid() or public.is_admin());

create policy "wallet_ledger_select_own_or_admin"
on public.wallet_ledger for select
using (
  exists (
    select 1 from public.wallets w
    where w.id = wallet_ledger.wallet_id
      and (w.user_id = auth.uid() or public.is_admin())
  )
);

create policy "topup_packages_public_active"
on public.topup_packages for select
using (active = true or public.is_admin());

create policy "payment_orders_select_own_or_admin"
on public.payment_orders for select
using (user_id = auth.uid() or public.is_admin());

create policy "news_public_select"
on public.news_posts for select
using (published = true or public.is_admin());

create policy "news_admin_insert"
on public.news_posts for insert
with check (public.is_admin() and author_id = auth.uid());

create policy "news_admin_update"
on public.news_posts for update
using (public.is_admin())
with check (public.is_admin());

create policy "news_admin_delete"
on public.news_posts for delete
using (public.is_admin());

create policy "announcements_public_select"
on public.announcements for select
using (
  (active = true and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now()))
  or public.is_admin()
);

create policy "announcements_admin_all"
on public.announcements for all
using (public.is_admin())
with check (public.is_admin());

create policy "achievements_public_select"
on public.achievements for select
using (active = true or public.is_admin());

create policy "player_achievements_select_own_or_admin"
on public.player_achievements for select
using (user_id = auth.uid() or public.is_admin());

create policy "game_state_select_own_or_admin"
on public.player_game_state for select
using (user_id = auth.uid() or public.is_admin());

create policy "store_items_public_active"
on public.store_items for select
using (active = true or public.is_admin());

create policy "inventory_select_own_or_admin"
on public.player_inventory for select
using (user_id = auth.uid() or public.is_admin());

create policy "audit_logs_admin_select"
on public.audit_logs for select
using (public.is_admin());

create policy "security_events_admin_select"
on public.security_events for select
using (public.is_admin());

revoke all on function public.finalize_payment_order(uuid, text) from public, anon, authenticated;
grant execute on function public.finalize_payment_order(uuid, text) to service_role;

revoke all on table public.payment_webhook_events from anon, authenticated;
revoke all on table public.audit_logs from anon, authenticated;
revoke all on table public.security_events from anon, authenticated;

grant execute on function public.update_display_name(text) to authenticated;
grant execute on function public.change_username(text) to authenticated;
grant execute on function public.touch_presence() to authenticated;
grant execute on function public.purchase_store_item(text) to authenticated;


-- ============================================================================
-- supabase/migrations/202610020002_admin_operations.sql
-- ============================================================================

-- Administrative operations for Musical Survival.
-- No game content or prices are seeded here.

create or replace function public.admin_set_player_status(
  target_user_id uuid,
  new_status text,
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

  select role into actor_role
  from public.profiles
  where id = actor_id and status = 'active';

  if actor_role not in ('admin', 'super_admin') then
    raise exception 'FORBIDDEN';
  end if;

  if new_status not in ('active', 'suspended', 'banned') then
    raise exception 'INVALID_STATUS';
  end if;

  if char_length(clean_reason) < 3 or char_length(clean_reason) > 500 then
    raise exception 'INVALID_REASON';
  end if;

  if target_user_id = actor_id and new_status <> 'active' then
    raise exception 'CANNOT_RESTRICT_SELF';
  end if;

  select role into target_role
  from public.profiles
  where id = target_user_id
  for update;

  if not found then
    raise exception 'PLAYER_NOT_FOUND';
  end if;

  if target_role = 'super_admin' and actor_role <> 'super_admin' then
    raise exception 'FORBIDDEN';
  end if;

  update public.profiles
  set status = new_status
  where id = target_user_id;

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
    'player.status_changed',
    'profile',
    target_user_id::text,
    jsonb_build_object('status', new_status, 'reason', clean_reason)
  );
end;
$$;

create or replace function public.admin_adjust_wallet(
  target_user_id uuid,
  delta_amount bigint,
  reason text
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
  adjustment_id uuid := gen_random_uuid();
begin
  if actor_id is null then
    raise exception 'UNAUTHORIZED';
  end if;

  select role into actor_role
  from public.profiles
  where id = actor_id and status = 'active';

  if actor_role <> 'super_admin' then
    raise exception 'FORBIDDEN';
  end if;

  if delta_amount = 0 or abs(delta_amount) > 1000000000 then
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

  new_balance := target_wallet.coin_balance + delta_amount;

  if new_balance < 0 then
    raise exception 'INSUFFICIENT_BALANCE';
  end if;

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
    delta_amount,
    new_balance,
    'admin_adjustment',
    'admin-adjustment:' || adjustment_id::text,
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
    'wallet.admin_adjustment',
    'wallet',
    target_wallet.id::text,
    jsonb_build_object(
      'delta', delta_amount,
      'balanceAfter', new_balance,
      'reason', clean_reason,
      'adjustmentId', adjustment_id
    )
  );

  return jsonb_build_object(
    'adjustmentId', adjustment_id,
    'balance', new_balance
  );
end;
$$;

grant execute on function public.admin_set_player_status(uuid, text, text) to authenticated;
grant execute on function public.admin_adjust_wallet(uuid, bigint, text) to authenticated;

create policy "topup_packages_admin_insert"
on public.topup_packages for insert
with check (public.is_admin());

create policy "topup_packages_admin_update"
on public.topup_packages for update
using (public.is_admin())
with check (public.is_admin());

create policy "topup_packages_admin_delete"
on public.topup_packages for delete
using (public.is_admin());

create policy "store_items_admin_insert"
on public.store_items for insert
with check (public.is_admin());

create policy "store_items_admin_update"
on public.store_items for update
using (public.is_admin())
with check (public.is_admin());

create policy "store_items_admin_delete"
on public.store_items for delete
using (public.is_admin());

create policy "achievements_admin_insert"
on public.achievements for insert
with check (public.is_admin());

create policy "achievements_admin_update"
on public.achievements for update
using (public.is_admin())
with check (public.is_admin());

create policy "achievements_admin_delete"
on public.achievements for delete
using (public.is_admin());


-- ============================================================================
-- supabase/migrations/202610020003_game_state_api.sql
-- ============================================================================

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

