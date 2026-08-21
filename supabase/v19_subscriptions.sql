-- v19_subscriptions.sql
-- Adds subscription tracking for the 1:1 video-call paywall.
--
-- Additive and idempotent. Safe to run on the existing database: it creates one
-- new table plus policies and touches nothing that already exists.
--
-- SECURITY MODEL
--   * A user may READ their own subscription row.
--   * A user may NOT insert, update or delete it. Only the service-role client
--     (inside the `verify-subscription` Edge Function, after the payment provider
--     confirms the transaction) may write. This is what stops anyone granting
--     themselves a subscription from the browser console.
--   * No cardholder data is ever stored here. Only the provider's opaque
--     customer/subscription references.

create table if not exists public.subscriptions (
  user_id           uuid primary key references public.profiles(id) on delete cascade,
  status            text not null default 'inactive'
                    check (status in ('inactive','active','past_due','cancelled')),
  plan              text not null default 'free'
                    check (plan in ('free','monthly','yearly')),
  provider          text,               -- 'paystack' | 'flutterwave' | 'stripe'
  provider_ref      text,               -- opaque customer/subscription id
  current_period_end timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

-- Read your own row, and nobody else's.
drop policy if exists "Users read own subscription" on public.subscriptions;
create policy "Users read own subscription" on public.subscriptions
  for select to authenticated
  using (user_id = auth.uid());

-- Deliberately NO insert/update/delete policy for `authenticated`.
-- With RLS enabled and no permissive policy, all client writes are denied.
-- The service-role key bypasses RLS, so the Edge Function can still write.

create index if not exists subscriptions_status_idx
  on public.subscriptions (status)
  where status = 'active';

-- Keep updated_at fresh using the existing helper from schema.sql.
drop trigger if exists subscriptions_touch on public.subscriptions;
create trigger subscriptions_touch
  before update on public.subscriptions
  for each row execute function public.touch_updated_at();

-- Convenience predicate for future server-side checks.
create or replace function public.has_active_subscription(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.subscriptions s
    where s.user_id = uid
      -- 'cancelled' still counts while the paid period runs: the user has
      -- already paid for it and simply turned off renewal.
      and s.status in ('active', 'cancelled')
      and (s.current_period_end is null or s.current_period_end > now())
      -- ...but a cancelled row with no end date grants nothing.
      and (s.status <> 'cancelled' or s.current_period_end is not null)
  );
$$;

revoke all on function public.has_active_subscription(uuid) from public;
grant execute on function public.has_active_subscription(uuid) to authenticated;
