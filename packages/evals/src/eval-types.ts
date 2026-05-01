export type EvalSeverity = "pass" | "warning" | "fail";

export interface EvalIssue {
  id: string;
  severity: EvalSeverity;
  message: string;
  evidence?: string;
  suggestion?: string;
}

export interface EvalScore {
  score: number;
  passed: boolean;
  issues: EvalIssue[];
  summary: string;
}

export interface TextEvalInput {
  output: string;
  context?: Record<string, unknown>;
}

export interface AgentOutputMap {
  munger?: string;
  duan?: string;
  naval?: string;
  feynman?: string;
  jobs?: string;
  taleb?: string;
}

export interface MemoryCandidate {
  type?: string;
  content?: string;
  source?: string;
  reason?: string;
  editable?: boolean;
  deletable?: boolean;
  canDisable?: boolean;
  confidence?: "fact" | "inference" | "unknown";
}

export interface RuntimeTrace {
  selectedAgentCount: number;
  modelCallCount: number;
  hasStreamingStart: boolean;
  hasRetryPath: boolean;
  estimatedTokenBudget?: number;
  errorMessage?: string;
}
