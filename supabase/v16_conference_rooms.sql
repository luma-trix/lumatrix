-- Luma V16: persistent multi-participant conference rooms and invitations.
-- Run once after the earlier Luma migrations.

create table if not exists public.conference_rooms (
  id uuid primary key default gen_random_uuid(),
  room_code text not null unique,
  conversation_id uuid references public.conversations(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete cascade,
  kind public.call_kind not null,
  title text not null default 'Luma conference',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '12 hours')
);

create table if not exists public.conference_participants (
  room_id uuid not null references public.conference_rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  invited_by uuid not null references public.profiles(id) on delete cascade,
  invited_at timestamptz not null default now(),
  joined_at timestamptz,
  dismissed_at timestamptz,
  primary key(room_id,user_id)
);
create index if not exists conference_participants_user_idx on public.conference_participants(user_id,invited_at desc);

alter table public.conference_rooms enable row level security;
alter table public.conference_participants enable row level security;

create or replace function public.is_conference_participant(target_room uuid, target_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.conference_participants where room_id=target_room and user_id=target_user);
$$;
revoke all on function public.is_conference_participant(uuid,uuid) from public;
grant execute on function public.is_conference_participant(uuid,uuid) to authenticated;

drop policy if exists "Participants view conference rooms" on public.conference_rooms;
create policy "Participants view conference rooms" on public.conference_rooms for select to authenticated using(
  created_by=auth.uid() or public.is_conference_participant(id)
);
drop policy if exists "Users create conference rooms" on public.conference_rooms;
create policy "Users create conference rooms" on public.conference_rooms for insert to authenticated with check(created_by=auth.uid());
drop policy if exists "Creators update conference rooms" on public.conference_rooms;
create policy "Creators update conference rooms" on public.conference_rooms for update to authenticated using(created_by=auth.uid());

drop policy if exists "Participants view conference invitations" on public.conference_participants;
create policy "Participants view conference invitations" on public.conference_participants for select to authenticated using(
  user_id=auth.uid() or invited_by=auth.uid() or public.is_conference_participant(room_id)
);
drop policy if exists "Participants invite people" on public.conference_participants;
create policy "Participants invite people" on public.conference_participants for insert to authenticated with check(
  invited_by=auth.uid() and (
    public.is_conference_participant(room_id) or
    exists(select 1 from public.conference_rooms r where r.id=room_id and r.created_by=auth.uid())
  )
);
drop policy if exists "Invitees respond to conference invitations" on public.conference_participants;
create policy "Invitees respond to conference invitations" on public.conference_participants for update to authenticated
using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists "Participants leave conference rooms" on public.conference_participants;
create policy "Participants leave conference rooms" on public.conference_participants for delete to authenticated using(
  user_id=auth.uid() or invited_by=auth.uid()
);

do $$ begin alter publication supabase_realtime add table public.conference_rooms; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.conference_participants; exception when duplicate_object then null; end $$;
