-- Nexa V5: media statuses and disappearing messages
-- Run once in Supabase SQL Editor.

alter table public.conversations
add column if not exists disappearing_seconds integer
check (disappearing_seconds is null or disappearing_seconds in (86400, 604800, 7776000));

create or replace function public.set_disappearing_messages(target_conversation uuid, timer_seconds integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_conversation_member(target_conversation, auth.uid()) then
    raise exception 'Not a member of this conversation';
  end if;
  if timer_seconds is not null and timer_seconds not in (86400, 604800, 7776000) then
    raise exception 'Invalid disappearing message timer';
  end if;
  update public.conversations set disappearing_seconds = timer_seconds where id = target_conversation;
end;
$$;
grant execute on function public.set_disappearing_messages(uuid, integer) to authenticated;

-- Expired messages become inaccessible even if a cleanup job has not run yet.
drop policy if exists "Members read messages" on public.messages;
create policy "Members read messages" on public.messages
for select to authenticated
using (
  public.is_conversation_member(conversation_id)
  and (
    (select c.disappearing_seconds from public.conversations c where c.id = conversation_id) is null
    or created_at + make_interval(secs => (select c.disappearing_seconds from public.conversations c where c.id = conversation_id)) > now()
  )
);

create or replace function public.clean_expired_messages()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  delete from public.messages m
  using public.conversations c
  where m.conversation_id = c.id
    and c.disappearing_seconds is not null
    and m.created_at + make_interval(secs => c.disappearing_seconds) <= now();
  return new;
end;
$$;
drop trigger if exists clean_expired_messages_on_send on public.messages;
create trigger clean_expired_messages_on_send after insert on public.messages
for each statement execute procedure public.clean_expired_messages();

create table if not exists public.status_updates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null default '',
  media_path text,
  media_type text check (media_type is null or media_type in ('image','video','audio')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  check (body <> '' or media_path is not null)
);
create index if not exists status_updates_recent_idx on public.status_updates(expires_at desc);
alter table public.status_updates enable row level security;
drop policy if exists "Users view active statuses" on public.status_updates;
create policy "Users view active statuses" on public.status_updates for select to authenticated using (expires_at > now());
drop policy if exists "Users post own statuses" on public.status_updates;
create policy "Users post own statuses" on public.status_updates for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "Users delete own statuses" on public.status_updates;
create policy "Users delete own statuses" on public.status_updates for delete to authenticated using (user_id = auth.uid());

do $$ begin
  alter publication supabase_realtime add table public.status_updates;
exception when duplicate_object then null; end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('status-media','status-media',false,52428800,array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','audio/mpeg','audio/ogg','audio/webm','audio/mp4','audio/aac','audio/x-m4a'])
on conflict (id) do update set
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

-- Expand chat media MIME support for iPhone recordings and videos.
update storage.buckets set allowed_mime_types = array[
 'image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm',
 'audio/mpeg','audio/ogg','audio/webm','audio/mp4','audio/aac','audio/x-m4a','application/pdf'
] where id='chat-media';

drop policy if exists "Authenticated users view status media" on storage.objects;
create policy "Authenticated users view status media" on storage.objects for select to authenticated
using (bucket_id='status-media');
drop policy if exists "Users upload own status media" on storage.objects;
create policy "Users upload own status media" on storage.objects for insert to authenticated
with check (bucket_id='status-media' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "Users delete own status media" on storage.objects;
create policy "Users delete own status media" on storage.objects for delete to authenticated
using (bucket_id='status-media' and owner_id=auth.uid()::text);


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
