-- MentorOS beta access schema.
-- Stores invite-gated access state, usage events, and early quota controls.

create table if not exists user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  access_status text not null default 'pending',
  role text not null default 'tester',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint user_profiles_access_status_check
    check (access_status in ('pending', 'active', 'suspended')),
  constraint user_profiles_role_check
    check (role in ('owner', 'tester'))
);

create table if not exists invite_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text unique not null,
  code_label text,
  status text not null default 'active',
  max_uses int not null default 1,
  used_count int not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  note text,
  expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint invite_codes_status_check
    check (status in ('active', 'disabled', 'exhausted')),
  constraint invite_codes_max_uses_check
    check (max_uses > 0),
  constraint invite_codes_used_count_check
    check (used_count >= 0 and used_count <= max_uses)
);

create table if not exists invite_redemptions (
  id uuid primary key default gen_random_uuid(),
  invite_code_id uuid not null references invite_codes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  redeemed_at timestamptz default now(),
  constraint invite_redemptions_invite_code_id_user_id_unique
    unique (invite_code_id, user_id)
);

create table if not exists usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid references conversations(id) on delete set null,
  provider text not null,
  model text not null,
  purpose text,
  input_tokens int,
  output_tokens int,
  estimated_cost numeric,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  constraint usage_events_input_tokens_check
    check (input_tokens is null or input_tokens >= 0),
  constraint usage_events_output_tokens_check
    check (output_tokens is null or output_tokens >= 0),
  constraint usage_events_estimated_cost_check
    check (estimated_cost is null or estimated_cost >= 0)
);

create table if not exists quota_limits (
  id uuid primary key default gen_random_uuid(),
  role text not null,
  daily_message_limit int not null default 20,
  monthly_cost_limit numeric,
  created_at timestamptz default now(),
  constraint quota_limits_role_check
    check (role in ('owner', 'tester')),
  constraint quota_limits_daily_message_limit_check
    check (daily_message_limit >= 0),
  constraint quota_limits_monthly_cost_limit_check
    check (monthly_cost_limit is null or monthly_cost_limit >= 0)
);

create index if not exists user_profiles_access_status_idx
  on user_profiles(access_status);

create index if not exists user_profiles_role_idx
  on user_profiles(role);

create index if not exists invite_codes_status_idx
  on invite_codes(status);

create index if not exists invite_codes_expires_at_idx
  on invite_codes(expires_at);

create index if not exists invite_redemptions_user_id_idx
  on invite_redemptions(user_id);

create index if not exists invite_redemptions_invite_code_id_idx
  on invite_redemptions(invite_code_id);

create index if not exists usage_events_user_id_created_at_idx
  on usage_events(user_id, created_at desc);

create index if not exists usage_events_conversation_id_idx
  on usage_events(conversation_id);

create index if not exists quota_limits_role_idx
  on quota_limits(role);

create trigger user_profiles_set_updated_at
  before update on user_profiles
  for each row
  execute function set_updated_at();

create trigger invite_codes_set_updated_at
  before update on invite_codes
  for each row
  execute function set_updated_at();

alter table user_profiles enable row level security;
alter table invite_codes enable row level security;
alter table invite_redemptions enable row level security;
alter table usage_events enable row level security;
alter table quota_limits enable row level security;

create policy user_profiles_select_own
  on user_profiles for select
  to authenticated
  using (user_id = auth.uid());

-- TODO(Window B): add owner/admin policies once admin roles are finalized.
-- Invite code lookup and redemption should run through server-side service-role code.

create policy invite_redemptions_select_own
  on invite_redemptions for select
  to authenticated
  using (user_id = auth.uid());

create policy usage_events_select_own
  on usage_events for select
  to authenticated
  using (user_id = auth.uid());

create policy quota_limits_select_authenticated
  on quota_limits for select
  to authenticated
  using (true);
