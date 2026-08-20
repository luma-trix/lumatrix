-- Luma V12 corrected account-deletion preparation.
-- Storage objects must be removed by the Edge Function through the Storage API.

-- Remove the earlier database-only deletion function if it exists.
drop function if exists public.delete_my_account(text);

create or replace function public.prepare_my_account_deletion(confirmation text)
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

  -- Delete conversations that have no participant other than this account.
  delete from public.conversations c
  where c.created_by = deleting_user
    and not exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = c.id and cm.user_id <> deleting_user
    );

  -- Transfer remaining conversations/groups created by this account.
  update public.conversations c
  set created_by = (
    select cm.user_id
    from public.conversation_members cm
    where cm.conversation_id = c.id and cm.user_id <> deleting_user
    order by case when cm.role in ('owner','admin') then 0 else 1 end, cm.joined_at
    limit 1
  )
  where c.created_by = deleting_user;

  -- Promote each replacement creator to owner.
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
end;
$$;

revoke all on function public.prepare_my_account_deletion(text) from public;
revoke all on function public.prepare_my_account_deletion(text) from anon;
revoke all on function public.prepare_my_account_deletion(text) from authenticated;
grant execute on function public.prepare_my_account_deletion(text) to authenticated;
