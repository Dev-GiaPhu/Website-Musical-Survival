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
