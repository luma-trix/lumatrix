-- Nexa database schema for Supabase
-- Run this entire file once in Supabase Dashboard → SQL Editor → New query.

create extension if not exists pgcrypto;

create type public.conversation_kind as enum ('direct', 'group', 'channel', 'saved');
create type public.member_role as enum ('owner', 'admin', 'member', 'subscriber');
create type public.message_kind as enum ('text', 'image', 'video', 'audio', 'voice', 'file', 'location', 'contact', 'system', 'call');
create type public.call_kind as enum ('voice', 'video');
create type public.call_state as enum ('ringing', 'active', 'ended', 'declined', 'missed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{2,30}$'),
  display_name text not null check (char_length(display_name) between 2 and 60),
  avatar_url text,
  bio text not null default 'Hey there! I am using Nexa.',
  last_seen timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  kind public.conversation_kind not null default 'direct',
  title text,
  description text,
  avatar_url text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  invite_code text unique,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.member_role not null default 'member',
  joined_at timestamptz not null default now(),
  last_read_at timestamptz not null default now(),
  muted_until timestamptz,
  pinned boolean not null default false,
  archived boolean not null default false,
  primary key (conversation_id, user_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  kind public.message_kind not null default 'text',
  body text not null default '',
  reply_to uuid references public.messages(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.message_reactions (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);

create table public.call_sessions (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  started_by uuid not null references public.profiles(id) on delete cascade,
  kind public.call_kind not null,
  state public.call_state not null default 'ringing',
  started_at timestamptz not null default now(),
  answered_at timestamptz,
  ended_at timestamptz
);

create table public.call_signals (
  id bigint generated always as identity primary key,
  call_id uuid not null references public.call_sessions(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid references public.profiles(id) on delete cascade,
  signal_type text not null check (signal_type in ('offer','answer','ice','hangup')),
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index messages_conversation_created_idx on public.messages(conversation_id, created_at desc);
create index conversation_members_user_idx on public.conversation_members(user_id, joined_at desc);
create index call_signals_call_idx on public.call_signals(call_id, created_at);
create index profiles_username_idx on public.profiles(username);

-- Create a profile automatically after email registration.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  base_username text;
begin
  base_username := regexp_replace(lower(coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1))), '[^a-z0-9_]', '_', 'g');
  if char_length(base_username) < 2 then base_username := 'user'; end if;
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    left(base_username, 22) || '_' || substr(replace(new.id::text, '-', ''), 1, 6),
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
create trigger profiles_touch before update on public.profiles for each row execute procedure public.touch_updated_at();
create trigger conversations_touch before update on public.conversations for each row execute procedure public.touch_updated_at();

-- Security helper avoids recursive membership policies.
create or replace function public.is_conversation_member(target_conversation uuid, target_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.conversation_members
    where conversation_id = target_conversation and user_id = target_user
  );
$$;

create or replace function public.is_conversation_admin(target_conversation uuid, target_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.conversation_members
    where conversation_id = target_conversation and user_id = target_user and role in ('owner','admin')
  );
$$;

grant execute on function public.is_conversation_member(uuid, uuid) to authenticated;
grant execute on function public.is_conversation_admin(uuid, uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.message_reactions enable row level security;
alter table public.call_sessions enable row level security;
alter table public.call_signals enable row level security;

create policy "Authenticated users can discover profiles" on public.profiles for select to authenticated using (true);
create policy "Users update own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "Members view conversations" on public.conversations for select to authenticated
using (created_by = auth.uid() or public.is_conversation_member(id) or (is_public and kind = 'channel'));
create policy "Users create conversations" on public.conversations for insert to authenticated with check (created_by = auth.uid());
create policy "Admins update conversations" on public.conversations for update to authenticated using (public.is_conversation_admin(id));
create policy "Owners delete conversations" on public.conversations for delete to authenticated using (
  exists(select 1 from public.conversation_members m where m.conversation_id=id and m.user_id=auth.uid() and m.role='owner')
);

create policy "Members view membership" on public.conversation_members for select to authenticated
using (user_id = auth.uid() or public.is_conversation_member(conversation_id));
create policy "Creators add first membership" on public.conversation_members for insert to authenticated
with check (user_id = auth.uid() and exists(select 1 from public.conversations c where c.id=conversation_id and c.created_by=auth.uid()) or public.is_conversation_admin(conversation_id));
create policy "Members update own settings" on public.conversation_members for update to authenticated
using (user_id = auth.uid() or public.is_conversation_admin(conversation_id));
create policy "Members leave or admins remove" on public.conversation_members for delete to authenticated
using (user_id = auth.uid() or public.is_conversation_admin(conversation_id));

create policy "Members read messages" on public.messages for select to authenticated using (public.is_conversation_member(conversation_id));
create policy "Members send messages" on public.messages for insert to authenticated
with check (sender_id = auth.uid() and public.is_conversation_member(conversation_id));
create policy "Senders edit messages" on public.messages for update to authenticated using (sender_id = auth.uid()) with check (sender_id = auth.uid());
create policy "Senders or admins delete messages" on public.messages for delete to authenticated
using (sender_id = auth.uid() or public.is_conversation_admin(conversation_id));

create policy "Members read reactions" on public.message_reactions for select to authenticated using (
  exists(select 1 from public.messages m where m.id=message_id and public.is_conversation_member(m.conversation_id))
);
create policy "Users add own reactions" on public.message_reactions for insert to authenticated with check (user_id=auth.uid());
create policy "Users remove own reactions" on public.message_reactions for delete to authenticated using (user_id=auth.uid());

create policy "Members view calls" on public.call_sessions for select to authenticated using (public.is_conversation_member(conversation_id));
create policy "Members start calls" on public.call_sessions for insert to authenticated
with check (started_by=auth.uid() and public.is_conversation_member(conversation_id));
create policy "Members update calls" on public.call_sessions for update to authenticated using (public.is_conversation_member(conversation_id));
create policy "Call members view signals" on public.call_signals for select to authenticated using (
  recipient_id=auth.uid() or sender_id=auth.uid() or exists(select 1 from public.call_sessions c where c.id=call_id and public.is_conversation_member(c.conversation_id))
);
create policy "Users send own call signals" on public.call_signals for insert to authenticated with check (sender_id=auth.uid());
create policy "Users clear own signals" on public.call_signals for delete to authenticated using (sender_id=auth.uid() or recipient_id=auth.uid());

-- Realtime messages, receipts, membership, and call signalling.
do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.conversation_members;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.call_sessions;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.call_signals;
exception when duplicate_object then null; end $$;

-- Private media bucket. Upload paths must be conversation-id/user-id/file-name.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat-media', 'chat-media', false, 52428800, array['image/jpeg','image/png','image/webp','image/gif','video/mp4','audio/mpeg','audio/ogg','audio/webm','application/pdf'])
on conflict (id) do nothing;

create policy "Members view chat media" on storage.objects for select to authenticated using (
  bucket_id='chat-media' and public.is_conversation_member(((storage.foldername(name))[1])::uuid)
);
create policy "Members upload chat media" on storage.objects for insert to authenticated with check (
  bucket_id='chat-media' and public.is_conversation_member(((storage.foldername(name))[1])::uuid) and (storage.foldername(name))[2]=auth.uid()::text
);
create policy "Owners manage uploads" on storage.objects for update to authenticated using (owner_id=auth.uid()::text);
create policy "Owners delete uploads" on storage.objects for delete to authenticated using (owner_id=auth.uid()::text);
