-- Luma V12: secure self-service account deletion
-- Run once in Supabase SQL Editor.

create or replace function public.delete_my_account(confirmation text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleting_user uuid := auth.uid();
begin
  if deleting_user is null then
    raise exception 'You must be signed in';
  end if;

  if confirmation is distinct from 'DELETE' then
    raise exception 'Type DELETE to confirm permanent account deletion';
  end if;

  -- Remove every object uploaded by this account, including profile pictures,
  -- chat attachments, voice notes, videos, and Moment media.
  delete from storage.objects
  where owner_id = deleting_user::text;

  -- Delete conversations that have no participant other than this account.
  delete from public.conversations c
  where c.created_by = deleting_user
    and not exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = c.id and cm.user_id <> deleting_user
    );

  -- Transfer remaining conversations/groups created by this account to an
  -- existing participant so the foreign-key relationship remains valid.
  update public.conversations c
  set created_by = (
    select cm.user_id
    from public.conversation_members cm
    where cm.conversation_id = c.id and cm.user_id <> deleting_user
    order by case when cm.role in ('owner','admin') then 0 else 1 end, cm.joined_at
    limit 1
  )
  where c.created_by = deleting_user;

  -- Ensure the replacement creator is an owner.
  update public.conversation_members cm
  set role = 'owner'
  from public.conversations c
  where cm.conversation_id = c.id
    and cm.user_id = c.created_by
    and c.created_by <> deleting_user
    and exists (
      select 1 from public.conversation_members old_member
      where old_member.conversation_id = c.id and old_member.user_id = deleting_user
    );

  -- Removing the Auth user cascades through profiles, memberships, messages,
  -- reactions, calls, Moments, replies, votes, and starred/hidden records.
  delete from auth.users where id = deleting_user;
end;
$$;

revoke all on function public.delete_my_account(text) from public;
revoke all on function public.delete_my_account(text) from anon;
revoke all on function public.delete_my_account(text) from authenticated;
grant execute on function public.delete_my_account(text) to authenticated;
