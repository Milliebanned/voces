-- Post-session review: grammar corrections and a vocabulary bank fed by what
-- the learner reached for mid-conversation.

-- Words saved from a session keep the sentence they came up in and a link back
-- to that conversation. Deleting the conversation keeps the word.
alter table public.vocabulary_items
  add column example text,
  add column session_id uuid references public.sessions (id) on delete set null;

-- Analysis is written once per session. The unique session_id already stops a
-- second review, so no update or delete policy is needed; rows go with their
-- session through the cascade.

-- Which model produced the review, so older reviews can be told apart from
-- ones written after the prompt changes.
alter table public.session_analysis
  add column model text;
