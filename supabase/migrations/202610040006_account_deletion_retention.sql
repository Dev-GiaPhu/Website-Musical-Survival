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
