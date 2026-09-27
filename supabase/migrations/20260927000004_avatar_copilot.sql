-- TANIA migration 4 — Avatar / Copilot storage (PRD v3.1 AV-01..AV-07, §7.5)
-- chat_conversations, chat_messages, copilot_briefings.
-- Strictly private per user (AG-06, CLAUDE.md §2.6): no admin/lead read policy.
-- Written by the tania-assistant Edge Function using the CALLER's JWT.

create type public.chat_role as enum ('user', 'assistant');

create table public.chat_conversations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index chat_conversations_user_idx on public.chat_conversations (user_id, updated_at desc);

create table public.chat_messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references public.chat_conversations (id) on delete cascade,
  user_id          uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  role             public.chat_role not null,
  content          text not null check (length(content) <= 20000),
  model            text,
  input_tokens     integer check (input_tokens is null or input_tokens >= 0),
  output_tokens    integer check (output_tokens is null or output_tokens >= 0),
  created_at       timestamptz not null default now()
);
create index chat_messages_conversation_idx on public.chat_messages (conversation_id, created_at);
create index chat_messages_user_created_idx on public.chat_messages (user_id, created_at);

-- One briefing per user per day (Asia/Jakarta calendar day), AV-05.
create table public.copilot_briefings (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  briefing_date  date not null default (now() at time zone 'Asia/Jakarta')::date,
  content        text not null,
  model          text,
  input_tokens   integer check (input_tokens is null or input_tokens >= 0),
  output_tokens  integer check (output_tokens is null or output_tokens >= 0),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (user_id, briefing_date)
);

create trigger chat_conversations_updated_at before update on public.chat_conversations
  for each row execute function public.set_updated_at();
create trigger copilot_briefings_updated_at before update on public.copilot_briefings
  for each row execute function public.set_updated_at();

-- Owner is always the caller; a message must belong to the caller's conversation.
create or replace function public.chat_owner_stamp()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is not null then
    new.user_id := auth.uid();
  end if;
  return new;
end;
$$;

create trigger chat_conversations_owner before insert on public.chat_conversations
  for each row execute function public.chat_owner_stamp();
create trigger chat_messages_owner before insert on public.chat_messages
  for each row execute function public.chat_owner_stamp();
create trigger copilot_briefings_owner before insert or update on public.copilot_briefings
  for each row execute function public.chat_owner_stamp();

revoke all on public.chat_conversations, public.chat_messages, public.copilot_briefings from anon;
revoke truncate, references, trigger on public.chat_conversations, public.chat_messages, public.copilot_briefings from authenticated;
-- Messages are an append-only record of what the copilot said.
revoke update on public.chat_messages from authenticated;

alter table public.chat_conversations enable row level security;
alter table public.chat_messages      enable row level security;
alter table public.copilot_briefings  enable row level security;

-- Guests and inactive users have no copilot access (is_member()).
create policy chat_conversations_own on public.chat_conversations
  for all to authenticated
  using (user_id = auth.uid() and public.is_member())
  with check (user_id = auth.uid() and public.is_member());

create policy chat_messages_select_own on public.chat_messages
  for select to authenticated
  using (user_id = auth.uid() and public.is_member());
create policy chat_messages_insert_own on public.chat_messages
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.is_member()
    and exists (
      select 1 from public.chat_conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );
create policy chat_messages_delete_own on public.chat_messages
  for delete to authenticated
  using (user_id = auth.uid() and public.is_member());

-- Briefings: insert today's row, or overwrite it on force-refresh (AV-05).
create policy copilot_briefings_select_own on public.copilot_briefings
  for select to authenticated
  using (user_id = auth.uid() and public.is_member());
create policy copilot_briefings_insert_own on public.copilot_briefings
  for insert to authenticated
  with check (
    user_id = auth.uid() and public.is_member()
    and briefing_date = (now() at time zone 'Asia/Jakarta')::date
  );
create policy copilot_briefings_update_own on public.copilot_briefings
  for update to authenticated
  using (user_id = auth.uid() and public.is_member()
         and briefing_date = (now() at time zone 'Asia/Jakarta')::date)
  with check (user_id = auth.uid() and public.is_member()
              and briefing_date = (now() at time zone 'Asia/Jakarta')::date);
