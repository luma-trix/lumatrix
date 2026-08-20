-- Nexa V6: per-user deletion, clear-chat state, and iPhone video MIME support
-- Run once in Supabase SQL Editor after v5_features.sql.

alter table public.conversation_members
add column if not exists cleared_at timestamptz;

alter table public.messages replica identity full;

create table if not exists public.message_hidden (
  user_id uuid not null references public.profiles(id) on delete cascade,
  message_id uuid not null references public.messages(id) on delete cascade,
  hidden_at timestamptz not null default now(),
  primary key (user_id, message_id)
);
alter table public.message_hidden enable row level security;
drop policy if exists "Users view own hidden messages" on public.message_hidden;
create policy "Users view own hidden messages" on public.message_hidden for select to authenticated using (user_id=auth.uid());
drop policy if exists "Users hide messages for self" on public.message_hidden;
create policy "Users hide messages for self" on public.message_hidden for insert to authenticated with check (user_id=auth.uid());
drop policy if exists "Users unhide own messages" on public.message_hidden;
create policy "Users unhide own messages" on public.message_hidden for delete to authenticated using (user_id=auth.uid());

-- A message is visible only when the user is a member, has not hidden it,
-- has not cleared past it, and its disappearing timer has not expired.
drop policy if exists "Members read messages" on public.messages;
create policy "Members read messages" on public.messages
for select to authenticated
using (
  public.is_conversation_member(conversation_id)
  and not exists (
    select 1 from public.message_hidden h
    where h.message_id=id and h.user_id=auth.uid()
  )
  and created_at > coalesce((
    select cm.cleared_at from public.conversation_members cm
    where cm.conversation_id=messages.conversation_id and cm.user_id=auth.uid()
  ), '-infinity'::timestamptz)
  and (
    (select c.disappearing_seconds from public.conversations c where c.id=conversation_id) is null
    or created_at + make_interval(secs => (select c.disappearing_seconds from public.conversations c where c.id=conversation_id)) > now()
  )
);

-- iPhone camera recordings commonly use QuickTime/M4V and audio MP4.
update storage.buckets set allowed_mime_types = array[
 'image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif',
 'video/mp4','video/webm','video/quicktime','video/x-m4v',
 'audio/mpeg','audio/ogg','audio/webm','audio/mp4','audio/aac','audio/x-m4a',
 'application/pdf'
] where id='chat-media';

update storage.buckets set allowed_mime_types = array[
 'image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif',
 'video/mp4','video/webm','video/quicktime','video/x-m4v',
 'audio/mpeg','audio/ogg','audio/webm','audio/mp4','audio/aac','audio/x-m4a'
] where id='status-media';
