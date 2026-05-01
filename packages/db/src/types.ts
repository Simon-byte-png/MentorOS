export type JsonObject = Record<string, unknown>;

export type MessageRole = "user" | "assistant" | "system" | "agent";

export type MemoryType =
  | "profile"
  | "goal"
  | "preference"
  | "project"
  | "decision_history"
  | "blind_spot"
  | "writing_style"
  | "relationship";

export type MemoryEventType = "created" | "updated" | "disabled" | "deleted" | "merged";

export type ConversationMode = "decision" | "writing" | "review" | "general";

export type ConversationStatus = "active" | "archived" | "deleted";

export type CouncilRunStatus = "pending" | "running" | "completed" | "failed";

export type AccessStatus = "pending" | "active" | "suspended";

export type UserRole = "owner" | "tester";

export type InviteCodeStatus = "active" | "disabled" | "exhausted";

export type Conversation = {
  id: string;
  user_id: string;
  title: string | null;
  mode: ConversationMode | null;
  status: ConversationStatus | null;
  created_at: string | null;
  updated_at: string | null;
};

export type Message = {
  id: string;
  conversation_id: string | null;
  role: MessageRole;
  speaker: string | null;
  content: string;
  metadata: JsonObject | null;
  created_at: string | null;
};

export type UserMemory = {
  id: string;
  user_id: string;
  memory_type: MemoryType;
  content: string;
  confidence: number | null;
  source_conversation_id: string | null;
  source_message_id: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

export type MemoryEvent = {
  id: string;
  user_id: string;
  memory_id: string | null;
  event_type: MemoryEventType;
  reason: string | null;
  created_at: string | null;
};

export type CouncilRun = {
  id: string;
  conversation_id: string | null;
  selected_agents: string[];
  context_snapshot: JsonObject | null;
  status: CouncilRunStatus | null;
  created_at: string | null;
  completed_at: string | null;
};

export type AgentRun = {
  id: string;
  council_run_id: string | null;
  conversation_id: string | null;
  agent_slug: string;
  structured_output: JsonObject | null;
  raw_output: string | null;
  created_at: string | null;
};

export type DecisionMemo = {
  id: string;
  conversation_id: string | null;
  title: string | null;
  memo: JsonObject | null;
  markdown: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type Review = {
  id: string;
  conversation_id: string | null;
  decision_memo_id: string | null;
  original_decision: string | null;
  actual_result: string | null;
  correct_judgments: string | null;
  wrong_judgments: string | null;
  lessons: string | null;
  next_action: string | null;
  created_at: string | null;
};

export type UserProfile = {
  user_id: string;
  email: string | null;
  display_name: string | null;
  access_status: AccessStatus;
  role: UserRole;
  created_at: string | null;
  updated_at: string | null;
};

export type InviteCode = {
  id: string;
  code_hash: string;
  code_label: string | null;
  status: InviteCodeStatus;
  max_uses: number;
  used_count: number;
  created_by: string | null;
  note: string | null;
  expires_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type InviteRedemption = {
  id: string;
  invite_code_id: string;
  user_id: string;
  redeemed_at: string | null;
};

export type UsageEvent = {
  id: string;
  user_id: string;
  conversation_id: string | null;
  provider: string;
  model: string;
  purpose: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  estimated_cost: number | null;
  metadata: JsonObject | null;
  created_at: string | null;
};

export type QuotaLimit = {
  id: string;
  role: UserRole;
  daily_message_limit: number;
  monthly_cost_limit: number | null;
  created_at: string | null;
};

export type CreateConversationInput = {
  user_id: string;
  title?: string | null;
  mode?: ConversationMode;
  status?: ConversationStatus;
};

export type CreateMessageInput = {
  conversation_id: string;
  role: MessageRole;
  speaker?: string | null;
  content: string;
  metadata?: JsonObject;
};

export type CreateMemoryInput = {
  user_id: string;
  memory_type: MemoryType;
  content: string;
  confidence?: number;
  source_conversation_id?: string | null;
  source_message_id?: string | null;
  is_active?: boolean;
};

export type UpdateMemoryInput = {
  memory_type?: MemoryType;
  content?: string;
  confidence?: number;
  source_conversation_id?: string | null;
  source_message_id?: string | null;
  is_active?: boolean;
};

export type CreateCouncilRunInput = {
  conversation_id: string;
  selected_agents: string[];
  context_snapshot?: JsonObject;
  status?: CouncilRunStatus;
};

export type CompleteCouncilRunInput = {
  status?: Extract<CouncilRunStatus, "completed" | "failed">;
  completed_at?: string;
};

export type CreateAgentRunInput = {
  council_run_id?: string | null;
  conversation_id: string;
  agent_slug: string;
  structured_output?: JsonObject;
  raw_output?: string | null;
};

export type CreateDecisionMemoInput = {
  conversation_id: string;
  title?: string | null;
  memo?: JsonObject;
  markdown?: string | null;
};

export type CreateReviewInput = {
  conversation_id: string;
  decision_memo_id?: string | null;
  original_decision?: string | null;
  actual_result?: string | null;
  correct_judgments?: string | null;
  wrong_judgments?: string | null;
  lessons?: string | null;
  next_action?: string | null;
};

export type CreateUserProfileInput = {
  user_id: string;
  email?: string | null;
  display_name?: string | null;
  access_status?: AccessStatus;
  role?: UserRole;
};

export type RedeemInviteCodeInput = {
  invite_code_id: string;
  user_id: string;
};

export type RedeemInviteCodeByHashInput = {
  code_hash: string;
  user_id: string;
};

export type RedeemInviteCodeResult = {
  ok: boolean;
  reason: string | null;
  invite_code_id: string | null;
};

export type RecordUsageEventInput = {
  user_id: string;
  conversation_id?: string | null;
  provider: string;
  model: string;
  purpose?: string | null;
  input_tokens?: number | null;
  output_tokens?: number | null;
  estimated_cost?: number | null;
  metadata?: JsonObject;
};
