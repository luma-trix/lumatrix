-- v20_video_paywall_enforcement.sql
--
-- Server-side enforcement of the 1:1 video-call subscription.
--
-- WHY HERE, AND NOT IN AN EDGE FUNCTION
--   A 1:1 video call starts by inserting a row into public.call_sessions.
--   public.call_signals has a foreign key to that row, so WebRTC signalling is
--   impossible without it. Blocking the insert blocks the entire call path —
--   including anyone who bypasses the paywall modal with devtools.
--
--   Group conferences go through public.conference_rooms + the livekit-token
--   Edge Function and are deliberately NOT touched. They stay free.
--
-- REQUIRES: v19_subscriptions.sql (for public.has_active_subscription).
--
-- SAFE TO RUN NOW. Enforcement is off until you flip the switch in app_config,
-- so applying this changes nothing until you are ready.

-- ---------------------------------------------------------------------------
-- 1. Kill switch, so enforcement can be toggled without another migration
-- ---------------------------------------------------------------------------

create table if not exists public.app_config (
  key        text primary key,
  enabled    boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.app_config (key, enabled)
values ('video_paywall_enabled', false)
on conflict (key) do nothing;

alter table public.app_config enable row level security;

-- Readable by signed-in users; deliberately NO write policy, so only the
-- service role (or the SQL editor) can change it.
drop policy if exists "Anyone signed in can read config" on public.app_config;
create policy "Anyone signed in can read config" on public.app_config
  for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- 2. Predicate: may this user start a video call in this conversation?
-- ---------------------------------------------------------------------------

create or replace function public.luma_can_start_video(conv uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    -- (a) paywall disabled -> always allowed
    not coalesce(
      (select enabled from public.app_config where key = 'video_paywall_enabled'),
      false
    )
    -- (b) group/channel conversations use conferences, which remain free
    or coalesce(
      (select c.kind <> 'direct' from public.conversations c where c.id = conv),
      false
    )
    -- (c) otherwise require a live subscription
    or public.has_active_subscription(auth.uid());
$$;

revoke all on function public.luma_can_start_video(uuid) from public;
grant execute on function public.luma_can_start_video(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Replace the insert policy on call_sessions
-- ---------------------------------------------------------------------------
-- Identical to the original, plus the video condition. Voice calls are
-- untouched and stay free.

drop policy if exists "Members start calls" on public.call_sessions;
create policy "Members start calls" on public.call_sessions
  for insert to authenticated
  with check (
    started_by = auth.uid()
    and public.is_conversation_member(conversation_id)
    and (
      kind <> 'video'
      or public.luma_can_start_video(conversation_id)
    )
  );

-- ---------------------------------------------------------------------------
-- HOW TO USE
-- ---------------------------------------------------------------------------
-- Turn enforcement ON (do this at the same time as VITE_PAYWALL_ENABLED=1):
--
--   update public.app_config set enabled = true, updated_at = now()
--   where key = 'video_paywall_enabled';
--
-- Turn it OFF again instantly, with no redeploy:
--
--   update public.app_config set enabled = false, updated_at = now()
--   where key = 'video_paywall_enabled';
--
-- Grandfather an existing user (give them a free year):
--
--   insert into public.subscriptions (user_id, status, plan, provider, current_period_end)
--   values ('<user-uuid>', 'active', 'yearly', 'comp', now() + interval '1 year')
--   on conflict (user_id) do update
--     set status = 'active',
--         current_period_end = excluded.current_period_end,
--         updated_at = now();
--
-- Verify enforcement as a signed-in user (should return false when unsubscribed
-- and the switch is on):
--
--   select public.luma_can_start_video('<direct-conversation-uuid>');
