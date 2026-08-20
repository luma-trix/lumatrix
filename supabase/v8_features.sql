-- Nexa V8: realtime reactions and synced starred messages
-- Run once after v7_features.sql.

create table if not exists public.starred_messages (
  user_id uuid not null references public.profiles(id) on delete cascade,
  message_id uuid not null references public.messages(id) on delete cascade,
  starred_at timestamptz not null default now(),
  primary key (user_id, message_id)
);
alter table public.starred_messages enable row level security;
drop policy if exists "Users view own starred messages" on public.starred_messages;
create policy "Users view own starred messages" on public.starred_messages for select to authenticated using (user_id=auth.uid());
drop policy if exists "Users star visible messages" on public.starred_messages;
create policy "Users star visible messages" on public.starred_messages for insert to authenticated with check (
  user_id=auth.uid() and exists (
    select 1 from public.messages m where m.id=message_id and public.is_conversation_member(m.conversation_id)
  )
);
drop policy if exists "Users unstar own messages" on public.starred_messages;
create policy "Users unstar own messages" on public.starred_messages for delete to authenticated using (user_id=auth.uid());

do $$ begin
  alter publication supabase_realtime add table public.message_reactions;
exception when duplicate_object then null; end $$;
