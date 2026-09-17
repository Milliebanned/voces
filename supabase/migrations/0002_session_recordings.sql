-- AssemblyAI keeps a stereo recording of every voice session. Only its session
-- id is stored here: the download links it hands out are pre-signed and expire
-- quickly, so a fresh one is fetched each time a recording is played.
alter table public.sessions
  add column agent_session_id text;
