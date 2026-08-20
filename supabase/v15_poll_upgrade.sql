-- Luma V15: allow multi-answer and advanced poll votes.
-- Run once after v9_features.sql.

alter table public.poll_votes drop constraint if exists poll_votes_pkey;
alter table public.poll_votes
  add constraint poll_votes_pkey primary key (message_id, user_id, option_index);

-- Keep one database row per selected option. Single-answer enforcement is handled
-- by the app by removing the user's older choices before inserting the new one.
