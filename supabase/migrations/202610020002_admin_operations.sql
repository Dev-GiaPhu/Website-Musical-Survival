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
