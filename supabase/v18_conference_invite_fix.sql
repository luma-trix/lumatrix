-- Luma V18: allow room participants to re-invite or restore dismissed users.
-- Run once after v16_conference_rooms.sql.

drop policy if exists "Invitees respond to conference invitations" on public.conference_participants;
create policy "Invitees and room members update conference invitations"
on public.conference_participants
for update to authenticated
using (
  user_id=auth.uid()
  or invited_by=auth.uid()
  or public.is_conference_participant(room_id)
)
with check (
  user_id=auth.uid()
  or invited_by=auth.uid()
  or public.is_conference_participant(room_id)
);
