-- Fix for creating the first conversation membership.
-- Run once in Supabase Dashboard → SQL Editor.

drop policy if exists "Members view conversations" on public.conversations;

create policy "Members view conversations"
on public.conversations
for select
to authenticated
using (
  created_by = auth.uid()
  or public.is_conversation_member(id)
  or (is_public and kind = 'channel')
);
