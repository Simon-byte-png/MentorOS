-- MentorOS initial Supabase schema.
-- Window B owns database persistence, repository contracts, and RLS notes.

create extension if not exists "pgcrypto";

-- Supabase provides auth.users. If a local migration runner does not expose the
-- auth schema, keep these references and fix the local Supabase setup rather
-- than weakening ownership constraints.
--
-- TODO(Window B): add pgvector columns and indexes in phase 2 for semantic
-- memory retrieval.
-- TODO(Window D): define service-role/background-job access policies before
-- AI workers write council_runs or agent_runs outside an end-user session.

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  mode text default 'decision',
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint conversations_mode_check
    check (mode in ('decision', 'writing', 'review', 'general')),
  constraint conversations_status_check
    check (status in ('active', 'archived', 'deleted'))
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  role text not null,
  speaker text,
  content text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  constraint messages_role_check
    check (role in ('user', 'assistant', 'system', 'agent'))
);

create table if not exists user_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  memory_type text not null,
  content text not null,
  confidence numeric default 0.8,
  source_conversation_id uuid references conversations(id) on delete set null,
  source_message_id uuid references messages(id) on delete set null,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint user_memories_memory_type_check
    check (
      memory_type in (
        'profile',
        'goal',
        'preference',
        'project',
        'decision_history',
        'blind_spot',
        'writing_style',
        'relationship'
      )
    ),
  constraint user_memories_confidence_check
    check (confidence >= 0 and confidence <= 1)
);

create table if not exists memory_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  memory_id uuid references user_memories(id) on delete cascade,
  event_type text not null,
  reason text,
  created_at timestamptz default now(),
  constraint memory_events_event_type_check
    check (event_type in ('created', 'updated', 'disabled', 'deleted', 'merged'))
);

create table if not exists council_runs (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  selected_agents text[] not null,
  context_snapshot jsonb default '{}'::jsonb,
  status text default 'pending',
  created_at timestamptz default now(),
  completed_at timestamptz,
  constraint council_runs_status_check
    check (status in ('pending', 'running', 'completed', 'failed')),
  constraint council_runs_id_conversation_id_unique
    unique (id, conversation_id)
);

create table if not exists agent_runs (
  id uuid primary key default gen_random_uuid(),
  council_run_id uuid,
  conversation_id uuid references conversations(id) on delete cascade,
  agent_slug text not null,
  structured_output jsonb default '{}'::jsonb,
  raw_output text,
  created_at timestamptz default now(),
  constraint agent_runs_council_run_conversation_fk
    foreign key (council_run_id, conversation_id)
    references council_runs(id, conversation_id)
    on delete cascade
);

create table if not exists decision_memos (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  title text,
  memo jsonb default '{}'::jsonb,
  markdown text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint decision_memos_id_conversation_id_unique
    unique (id, conversation_id)
);

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  decision_memo_id uuid,
  original_decision text,
  actual_result text,
  correct_judgments text,
  wrong_judgments text,
  lessons text,
  next_action text,
  created_at timestamptz default now(),
  constraint reviews_decision_memo_conversation_fk
    foreign key (decision_memo_id, conversation_id)
    references decision_memos(id, conversation_id)
    on delete set null (decision_memo_id)
);

create index if not exists conversations_user_id_idx
  on conversations(user_id);

create index if not exists messages_conversation_id_idx
  on messages(conversation_id);

create index if not exists user_memories_user_id_idx
  on user_memories(user_id);

create index if not exists user_memories_memory_type_idx
  on user_memories(memory_type);

create index if not exists user_memories_is_active_idx
  on user_memories(is_active);

create index if not exists council_runs_conversation_id_idx
  on council_runs(conversation_id);

create index if not exists agent_runs_conversation_id_idx
  on agent_runs(conversation_id);

create index if not exists decision_memos_conversation_id_idx
  on decision_memos(conversation_id);

create index if not exists reviews_conversation_id_idx
  on reviews(conversation_id);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger conversations_set_updated_at
  before update on conversations
  for each row
  execute function set_updated_at();

create trigger user_memories_set_updated_at
  before update on user_memories
  for each row
  execute function set_updated_at();

create trigger decision_memos_set_updated_at
  before update on decision_memos
  for each row
  execute function set_updated_at();

alter table conversations enable row level security;
alter table messages enable row level security;
alter table user_memories enable row level security;
alter table memory_events enable row level security;
alter table council_runs enable row level security;
alter table agent_runs enable row level security;
alter table decision_memos enable row level security;
alter table reviews enable row level security;

create policy conversations_select_own
  on conversations for select
  using (user_id = auth.uid());

create policy conversations_insert_own
  on conversations for insert
  with check (user_id = auth.uid());

create policy conversations_update_own
  on conversations for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy conversations_delete_own
  on conversations for delete
  using (user_id = auth.uid());

create policy messages_select_own_conversation
  on messages for select
  using (
    exists (
      select 1
      from conversations
      where conversations.id = messages.conversation_id
        and conversations.user_id = auth.uid()
    )
  );

create policy messages_insert_own_conversation
  on messages for insert
  with check (
    exists (
      select 1
      from conversations
      where conversations.id = messages.conversation_id
        and conversations.user_id = auth.uid()
    )
  );

create policy messages_update_own_conversation
  on messages for update
  using (
    exists (
      select 1
      from conversations
      where conversations.id = messages.conversation_id
        and conversations.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from conversations
      where conversations.id = messages.conversation_id
        and conversations.user_id = auth.uid()
    )
  );

create policy messages_delete_own_conversation
  on messages for delete
  using (
    exists (
      select 1
      from conversations
      where conversations.id = messages.conversation_id
        and conversations.user_id = auth.uid()
    )
  );

create policy user_memories_select_own
  on user_memories for select
  using (user_id = auth.uid());

create policy user_memories_insert_own
  on user_memories for insert
  with check (
    user_id = auth.uid()
    and (
      source_conversation_id is null
      or exists (
        select 1
        from conversations
        where conversations.id = user_memories.source_conversation_id
          and conversations.user_id = auth.uid()
      )
    )
    and (
      source_message_id is null
      or exists (
        select 1
        from messages
        join conversations
          on conversations.id = messages.conversation_id
        where messages.id = user_memories.source_message_id
          and conversations.user_id = auth.uid()
      )
    )
    and (
      source_conversation_id is null
      or source_message_id is null
      or exists (
        select 1
        from messages
        where messages.id = user_memories.source_message_id
          and messages.conversation_id = user_memories.source_conversation_id
      )
    )
  );

create policy user_memories_update_own
  on user_memories for update
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (
      source_conversation_id is null
      or exists (
        select 1
        from conversations
        where conversations.id = user_memories.source_conversation_id
          and conversations.user_id = auth.uid()
      )
    )
    and (
      source_message_id is null
      or exists (
        select 1
        from messages
        join conversations
          on conversations.id = messages.conversation_id
        where messages.id = user_memories.source_message_id
          and conversations.user_id = auth.uid()
      )
    )
    and (
      source_conversation_id is null
      or source_message_id is null
      or exists (
        select 1
        from messages
        where messages.id = user_memories.source_message_id
          and messages.conversation_id = user_memories.source_conversation_id
      )
    )
  );

create policy user_memories_delete_own
  on user_memories for delete
  using (user_id = auth.uid());

create policy memory_events_select_own_memory
  on memory_events for select
  using (
    user_id = auth.uid()
    and exists (
      select 1
      from user_memories
      where user_memories.id = memory_events.memory_id
        and user_memories.user_id = auth.uid()
    )
  );

create policy memory_events_insert_own_memory
  on memory_events for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from user_memories
      where user_memories.id = memory_events.memory_id
        and user_memories.user_id = auth.uid()
    )
  );

create policy memory_events_update_own_memory
  on memory_events for update
  using (
    user_id = auth.uid()
    and exists (
      select 1
      from user_memories
      where user_memories.id = memory_events.memory_id
        and user_memories.user_id = auth.uid()
    )
  )
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from user_memories
      where user_memories.id = memory_events.memory_id
        and user_memories.user_id = auth.uid()
    )
  );

create policy memory_events_delete_own_memory
  on memory_events for delete
  using (
    user_id = auth.uid()
    and exists (
      select 1
      from user_memories
      where user_memories.id = memory_events.memory_id
        and user_memories.user_id = auth.uid()
    )
  );

create policy council_runs_select_own_conversation
  on council_runs for select
  using (
    exists (
      select 1
      from conversations
      where conversations.id = council_runs.conversation_id
        and conversations.user_id = auth.uid()
    )
  );

create policy council_runs_insert_own_conversation
  on council_runs for insert
  with check (
    exists (
      select 1
      from conversations
      where conversations.id = council_runs.conversation_id
        and conversations.user_id = auth.uid()
    )
  );

create policy council_runs_update_own_conversation
  on council_runs for update
  using (
    exists (
      select 1
      from conversations
      where conversations.id = council_runs.conversation_id
        and conversations.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from conversations
      where conversations.id = council_runs.conversation_id
        and conversations.user_id = auth.uid()
    )
  );

create policy council_runs_delete_own_conversation
  on council_runs for delete
  using (
    exists (
      select 1
      from conversations
      where conversations.id = council_runs.conversation_id
        and conversations.user_id = auth.uid()
    )
  );

create policy agent_runs_select_own_conversation
  on agent_runs for select
  using (
    exists (
      select 1
      from conversations
      where conversations.id = agent_runs.conversation_id
        and conversations.user_id = auth.uid()
    )
    and (
      council_run_id is null
      or exists (
        select 1
        from council_runs
        where council_runs.id = agent_runs.council_run_id
          and council_runs.conversation_id = agent_runs.conversation_id
      )
    )
  );

create policy agent_runs_insert_own_conversation
  on agent_runs for insert
  with check (
    exists (
      select 1
      from conversations
      where conversations.id = agent_runs.conversation_id
        and conversations.user_id = auth.uid()
    )
    and (
      council_run_id is null
      or exists (
        select 1
        from council_runs
        where council_runs.id = agent_runs.council_run_id
          and council_runs.conversation_id = agent_runs.conversation_id
      )
    )
  );

create policy agent_runs_update_own_conversation
  on agent_runs for update
  using (
    exists (
      select 1
      from conversations
      where conversations.id = agent_runs.conversation_id
        and conversations.user_id = auth.uid()
    )
    and (
      council_run_id is null
      or exists (
        select 1
        from council_runs
        where council_runs.id = agent_runs.council_run_id
          and council_runs.conversation_id = agent_runs.conversation_id
      )
    )
  )
  with check (
    exists (
      select 1
      from conversations
      where conversations.id = agent_runs.conversation_id
        and conversations.user_id = auth.uid()
    )
    and (
      council_run_id is null
      or exists (
        select 1
        from council_runs
        where council_runs.id = agent_runs.council_run_id
          and council_runs.conversation_id = agent_runs.conversation_id
      )
    )
  );

create policy agent_runs_delete_own_conversation
  on agent_runs for delete
  using (
    exists (
      select 1
      from conversations
      where conversations.id = agent_runs.conversation_id
        and conversations.user_id = auth.uid()
    )
    and (
      council_run_id is null
      or exists (
        select 1
        from council_runs
        where council_runs.id = agent_runs.council_run_id
          and council_runs.conversation_id = agent_runs.conversation_id
      )
    )
  );

create policy decision_memos_select_own_conversation
  on decision_memos for select
  using (
    exists (
      select 1
      from conversations
      where conversations.id = decision_memos.conversation_id
        and conversations.user_id = auth.uid()
    )
  );

create policy decision_memos_insert_own_conversation
  on decision_memos for insert
  with check (
    exists (
      select 1
      from conversations
      where conversations.id = decision_memos.conversation_id
        and conversations.user_id = auth.uid()
    )
  );

create policy decision_memos_update_own_conversation
  on decision_memos for update
  using (
    exists (
      select 1
      from conversations
      where conversations.id = decision_memos.conversation_id
        and conversations.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from conversations
      where conversations.id = decision_memos.conversation_id
        and conversations.user_id = auth.uid()
    )
  );

create policy decision_memos_delete_own_conversation
  on decision_memos for delete
  using (
    exists (
      select 1
      from conversations
      where conversations.id = decision_memos.conversation_id
        and conversations.user_id = auth.uid()
    )
  );

create policy reviews_select_own_conversation
  on reviews for select
  using (
    exists (
      select 1
      from conversations
      where conversations.id = reviews.conversation_id
        and conversations.user_id = auth.uid()
    )
    and (
      decision_memo_id is null
      or exists (
        select 1
        from decision_memos
        where decision_memos.id = reviews.decision_memo_id
          and decision_memos.conversation_id = reviews.conversation_id
      )
    )
  );

create policy reviews_insert_own_conversation
  on reviews for insert
  with check (
    exists (
      select 1
      from conversations
      where conversations.id = reviews.conversation_id
        and conversations.user_id = auth.uid()
    )
    and (
      decision_memo_id is null
      or exists (
        select 1
        from decision_memos
        where decision_memos.id = reviews.decision_memo_id
          and decision_memos.conversation_id = reviews.conversation_id
      )
    )
  );

create policy reviews_update_own_conversation
  on reviews for update
  using (
    exists (
      select 1
      from conversations
      where conversations.id = reviews.conversation_id
        and conversations.user_id = auth.uid()
    )
    and (
      decision_memo_id is null
      or exists (
        select 1
        from decision_memos
        where decision_memos.id = reviews.decision_memo_id
          and decision_memos.conversation_id = reviews.conversation_id
      )
    )
  )
  with check (
    exists (
      select 1
      from conversations
      where conversations.id = reviews.conversation_id
        and conversations.user_id = auth.uid()
    )
    and (
      decision_memo_id is null
      or exists (
        select 1
        from decision_memos
        where decision_memos.id = reviews.decision_memo_id
          and decision_memos.conversation_id = reviews.conversation_id
      )
    )
  );

create policy reviews_delete_own_conversation
  on reviews for delete
  using (
    exists (
      select 1
      from conversations
      where conversations.id = reviews.conversation_id
        and conversations.user_id = auth.uid()
    )
    and (
      decision_memo_id is null
      or exists (
        select 1
        from decision_memos
        where decision_memos.id = reviews.decision_memo_id
          and decision_memos.conversation_id = reviews.conversation_id
      )
    )
  );
