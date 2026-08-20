-- Nexa V9: advanced status updates, chat polls, and unrestricted file types
-- Run once after v8_features.sql.

alter table public.status_updates add column if not exists visibility text not null default 'everyone'
  check (visibility in ('everyone','selected','private'));
alter table public.status_updates add column if not exists style jsonb not null default '{}'::jsonb;
alter table public.status_updates add column if not exists publish_at timestamptz not null default now();
alter table public.status_updates add column if not exists allow_replies boolean not null default true;

create table if not exists public.status_audience (
  status_id uuid not null references public.status_updates(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key(status_id,user_id)
);
create table if not exists public.status_views (
  status_id uuid not null references public.status_updates(id) on delete cascade,
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key(status_id,viewer_id)
);
create table if not exists public.status_reactions (
  status_id uuid not null references public.status_updates(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null check(char_length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  primary key(status_id,user_id)
);
create table if not exists public.status_replies (
  id uuid primary key default gen_random_uuid(),
  status_id uuid not null references public.status_updates(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check(char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

alter table public.status_audience enable row level security;
alter table public.status_views enable row level security;
alter table public.status_reactions enable row level security;
alter table public.status_replies enable row level security;

drop policy if exists "Users view active statuses" on public.status_updates;
drop policy if exists "Users view eligible active statuses" on public.status_updates;
create policy "Users view eligible active statuses" on public.status_updates for select to authenticated using (
  expires_at > now() and (
    user_id=auth.uid() or (
      publish_at <= now() and (
        visibility='everyone' or
        (visibility='selected' and exists(select 1 from public.status_audience a where a.status_id=id and a.user_id=auth.uid()))
      )
    )
  )
);
drop policy if exists "Owners update statuses" on public.status_updates;
create policy "Owners update statuses" on public.status_updates for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());

drop policy if exists "Owners manage status audience" on public.status_audience;
drop policy if exists "Selected users view own audience entry" on public.status_audience;
create policy "Owners manage status audience" on public.status_audience for all to authenticated
using(exists(select 1 from public.status_updates s where s.id=status_id and s.user_id=auth.uid()))
with check(exists(select 1 from public.status_updates s where s.id=status_id and s.user_id=auth.uid()));
create policy "Selected users view own audience entry" on public.status_audience for select to authenticated using(user_id=auth.uid());

drop policy if exists "Status owners view viewers" on public.status_views;
drop policy if exists "Users mark statuses viewed" on public.status_views;
create policy "Status owners view viewers" on public.status_views for select to authenticated
using(exists(select 1 from public.status_updates s where s.id=status_id and s.user_id=auth.uid()) or viewer_id=auth.uid());
create policy "Users mark statuses viewed" on public.status_views for insert to authenticated with check(viewer_id=auth.uid());

drop policy if exists "Users view status reactions" on public.status_reactions;
drop policy if exists "Users react to statuses" on public.status_reactions;
drop policy if exists "Users change own status reaction" on public.status_reactions;
drop policy if exists "Users remove own status reaction" on public.status_reactions;
create policy "Users view status reactions" on public.status_reactions for select to authenticated using(true);
create policy "Users react to statuses" on public.status_reactions for insert to authenticated with check(user_id=auth.uid());
create policy "Users change own status reaction" on public.status_reactions for update to authenticated using(user_id=auth.uid());
create policy "Users remove own status reaction" on public.status_reactions for delete to authenticated using(user_id=auth.uid());

drop policy if exists "Participants view status replies" on public.status_replies;
drop policy if exists "Users reply to enabled statuses" on public.status_replies;
drop policy if exists "Users delete own status replies" on public.status_replies;
create policy "Participants view status replies" on public.status_replies for select to authenticated using(
  sender_id=auth.uid() or exists(select 1 from public.status_updates s where s.id=status_id and s.user_id=auth.uid())
);
create policy "Users reply to enabled statuses" on public.status_replies for insert to authenticated with check(
  sender_id=auth.uid() and exists(select 1 from public.status_updates s where s.id=status_id and s.allow_replies)
);
create policy "Users delete own status replies" on public.status_replies for delete to authenticated using(sender_id=auth.uid());

-- Poll votes are stored separately so every participant can vote without editing the sender's message.
create table if not exists public.poll_votes (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  option_index integer not null check(option_index between 0 and 20),
  voted_at timestamptz not null default now(),
  primary key(message_id,user_id)
);
alter table public.poll_votes enable row level security;
drop policy if exists "Members view poll votes" on public.poll_votes;
drop policy if exists "Members cast poll votes" on public.poll_votes;
drop policy if exists "Users change poll vote" on public.poll_votes;
drop policy if exists "Users remove poll vote" on public.poll_votes;
create policy "Members view poll votes" on public.poll_votes for select to authenticated using(
  exists(select 1 from public.messages m where m.id=message_id and public.is_conversation_member(m.conversation_id))
);
create policy "Members cast poll votes" on public.poll_votes for insert to authenticated with check(
  user_id=auth.uid() and exists(select 1 from public.messages m where m.id=message_id and public.is_conversation_member(m.conversation_id))
);
create policy "Users change poll vote" on public.poll_votes for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy "Users remove poll vote" on public.poll_votes for delete to authenticated using(user_id=auth.uid());

-- Keep the 50 MB limit but permit documents, archives, and other user-selected file types.
update storage.buckets set allowed_mime_types=null, file_size_limit=52428800 where id='chat-media';

do $$ begin alter publication supabase_realtime add table public.status_views; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.status_reactions; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.status_replies; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.poll_votes; exception when duplicate_object then null; end $$;
