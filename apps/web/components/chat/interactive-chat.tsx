"use client";

import { useEffect, useMemo, useState } from "react";
import { LogOut, MessageSquarePlus } from "lucide-react";
import type {
  MentorOSPipelineResult,
  ModelDepth,
  RecentMessage,
} from "@mentoros/ai";
import { ChatInput } from "@/components/chat/chat-input";
import { PipelineResultView } from "@/components/chat/pipeline-result-view";
import { ThinkingSteps } from "@/components/chat/thinking-steps";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type ConversationSummary = {
  id: string;
  title: string;
  mode?: string;
  status?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type ChatMessageView = {
  id: string;
  role: "user" | "assistant";
  content: string;
  speaker?: string | null;
  result?: MentorOSPipelineResult;
  createdAt?: string | null;
  pending?: boolean;
};

type UserState = {
  email: string | null;
  label: string;
  devBypass: boolean;
};

type ConversationsApiResponse =
  | {
      ok: true;
      conversations: ConversationSummary[];
      user: UserState;
    }
  | {
      ok: false;
      error: string;
    };

type MessagesApiResponse =
  | {
      ok: true;
      messages: Array<{
        id: string;
        role: string;
        speaker?: string | null;
        content: string;
        metadata?: Record<string, unknown>;
        createdAt?: string | null;
      }>;
    }
  | {
      ok: false;
      error: string;
    };

type ChatApiResponse =
  | {
      ok: true;
      result: MentorOSPipelineResult;
      conversationId: string | null;
      persisted: {
        conversationId: string | null;
        userMessageId?: string | null;
        assistantMessageId?: string | null;
        decisionMemoId?: string | null;
      };
      warnings?: string[];
    }
  | {
      ok: false;
      error: string;
    };

const ERROR_BY_STATUS: Record<number, string> = {
  401: "请先登录后再使用 MentorOS。",
  403: "你的内测权限尚未激活，请先输入邀请码。",
  429: "今天的内测额度已用完，明天再继续。",
};

const friendlyError = "MentorOS 暂时没有组织好这场讨论，请稍后重试。";

export function InteractiveChat() {
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [messages, setMessages] = useState<ChatMessageView[]>([]);
  const [modelDepth, setModelDepth] = useState<ModelDepth>("flash");
  const [user, setUser] = useState<UserState>({
    email: null,
    label: "读取中",
    devBypass: true,
  });
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [localMessagesByConversation, setLocalMessagesByConversation] = useState<
    Record<string, ChatMessageView[]>
  >({});

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === conversationId) ?? null,
    [conversationId, conversations],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadConversations() {
      try {
        const response = await fetch("/api/conversations", { cache: "no-store" });
        const payload = (await response.json()) as ConversationsApiResponse;

        if (cancelled) return;

        if (!payload.ok) {
          setError(ERROR_BY_STATUS[response.status] ?? payload.error);
          return;
        }

        setConversations(payload.conversations);
        setUser(payload.user);
      } catch {
        if (!cancelled) {
          setError("暂时无法读取历史对话。");
        }
      } finally {
        if (!cancelled) {
          setLoadingConversations(false);
        }
      }
    }

    void loadConversations();

    return () => {
      cancelled = true;
    };
  }, []);

  async function submitMessage(message: string) {
    const trimmed = message.trim();

    if (pending || trimmed.length === 0) return;

    const userMessage: ChatMessageView = {
      id: `local-user-${Date.now()}`,
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    const previousMessages = messages;
    const requestConversationId = conversationId;

    setPending(true);
    setError(null);
    setDraft("");
    setMessages((current) => [...current, userMessage]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userMessage: trimmed,
          modelDepth,
          ...(requestConversationId ? { conversationId: requestConversationId } : {}),
          recentMessages: toRecentMessages(previousMessages),
        }),
      });
      const payload = (await response.json()) as ChatApiResponse;

      if (!payload.ok) {
        setError(ERROR_BY_STATUS[response.status] ?? payload.error ?? friendlyError);
        return;
      }

      const nextConversationId =
        payload.conversationId ?? requestConversationId ?? `local-${Date.now()}`;
      const assistantMessage: ChatMessageView = {
        id: payload.persisted.assistantMessageId ?? `local-assistant-${Date.now()}`,
        role: "assistant",
        speaker: "director",
        content: flattenAssistantResult(payload.result),
        result: payload.result,
        createdAt: new Date().toISOString(),
      };
      const nextMessages = [...previousMessages, userMessage, assistantMessage];

      setConversationId(nextConversationId);
      setMessages(nextMessages);
      setConversations((current) =>
        upsertConversation(current, {
          id: nextConversationId,
          title: findConversationTitle(current, nextConversationId) ?? makeConversationTitle(trimmed),
          mode: "decision",
          status: "active",
          updatedAt: new Date().toISOString(),
        }),
      );

      if (user.devBypass) {
        setLocalMessagesByConversation((current) => ({
          ...current,
          [nextConversationId]: nextMessages,
        }));
      }
    } catch {
      setError(friendlyError);
    } finally {
      setPending(false);
    }
  }

  async function selectConversation(nextConversationId: string) {
    if (pending || nextConversationId === conversationId) return;

    setConversationId(nextConversationId);
    setError(null);

    if (user.devBypass) {
      setMessages(localMessagesByConversation[nextConversationId] ?? []);
      return;
    }

    setLoadingMessages(true);
    setMessages([]);
    try {
      const response = await fetch(
        `/api/conversations/${encodeURIComponent(nextConversationId)}/messages`,
        { cache: "no-store" },
      );
      const payload = (await response.json()) as MessagesApiResponse;

      if (!payload.ok) {
        setError(ERROR_BY_STATUS[response.status] ?? payload.error);
        return;
      }

      setMessages(
        payload.messages
          .filter((message) => message.role === "user" || message.role === "assistant")
          .map((message) => ({
            id: message.id,
            role: message.role as "user" | "assistant",
            speaker: message.speaker,
            content: message.content,
            createdAt: message.createdAt,
          })),
      );
    } catch {
      setError("暂时无法读取这段对话。");
    } finally {
      setLoadingMessages(false);
    }
  }

  function handleNewChat() {
    setDraft("");
    setPending(false);
    setError(null);
    setMessages([]);
    setConversationId(null);
  }

  async function handleSignOut() {
    if (user.devBypass) return;

    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } finally {
      window.location.href = "/login";
    }
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="flex min-h-screen">
        <aside className="hidden w-[320px] shrink-0 border-r border-line bg-white md:flex md:flex-col">
          <div className="px-7 pb-5 pt-8">
            <div className="flex items-center gap-4">
              <div
                className="h-[54px] w-[54px] rounded-full border-[13px] border-[#ff7426]"
                aria-label="MentorOS"
              />
              <span className="text-[17px] font-medium text-ink">MentorOS</span>
            </div>
            <button
              type="button"
              className="mt-8 inline-flex w-full items-center justify-center gap-3 rounded-full border border-line bg-white px-5 py-3 text-[14px] text-ink shadow-quiet transition-colors hover:border-ink disabled:cursor-not-allowed disabled:text-muted"
              onClick={handleNewChat}
              disabled={pending}
            >
              <MessageSquarePlus className="h-4 w-4" strokeWidth={1.8} />
              新对话
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
            {loadingConversations ? (
              <p className="px-3 py-3 text-[13px] text-muted">正在读取对话...</p>
            ) : conversations.length === 0 ? (
              <p className="px-3 py-3 text-[13px] leading-6 text-muted">
                暂无历史对话
              </p>
            ) : (
              <nav className="space-y-1">
                {conversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    type="button"
                    className={cn(
                      "block w-full rounded-[10px] px-3 py-3 text-left text-[14px] leading-5 transition-colors",
                      conversation.id === conversationId
                        ? "bg-[#f6f1ec] text-ink"
                        : "text-muted hover:bg-[#faf7f3] hover:text-ink",
                    )}
                    onClick={() => void selectConversation(conversation.id)}
                    disabled={pending}
                  >
                    <span className="line-clamp-2">{conversation.title}</span>
                  </button>
                ))}
              </nav>
            )}
          </div>

          <div className="border-t border-line px-7 py-5">
            <p className="truncate text-[13px] text-ink">{user.label}</p>
            {user.devBypass ? (
              <p className="mt-1 text-[12px] text-muted">历史仅保存在本页</p>
            ) : (
              <button
                type="button"
                className="mt-3 inline-flex items-center gap-2 text-[13px] text-muted transition-colors hover:text-ink"
                onClick={() => void handleSignOut()}
              >
                <LogOut className="h-4 w-4" strokeWidth={1.8} />
                退出登录
              </button>
            )}
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-10 border-b border-line bg-paper/92 px-5 py-5 backdrop-blur md:px-10">
            <div className="mx-auto flex max-w-[980px] items-center justify-between">
              <nav className="flex items-center gap-8 text-[16px] text-muted">
                <span className="border-b-2 border-ink pb-3 text-ink">对话</span>
              </nav>
              <div className="flex items-center gap-4">
                {activeConversation ? (
                  <span className="hidden max-w-[260px] truncate text-[13px] text-muted sm:inline">
                    {activeConversation.title}
                  </span>
                ) : null}
                <button
                  type="button"
                  className="inline-flex items-center gap-2 text-[13px] text-muted transition-colors hover:text-ink md:hidden"
                  onClick={handleNewChat}
                  disabled={pending}
                >
                  <MessageSquarePlus className="h-4 w-4" strokeWidth={1.8} />
                  新对话
                </button>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-[980px] px-5 pb-44 md:px-10">
            <main className="min-w-0">
              {renderConversation({
                messages,
                pending,
                loadingMessages,
                error,
              })}
            </main>
          </div>
        </main>
      </div>
      <ChatInput
        value={draft}
        disabled={pending || loadingMessages}
        modelDepth={modelDepth}
        onModelDepthChange={setModelDepth}
        onChange={setDraft}
        onSubmit={submitMessage}
      />
    </div>
  );
}

function renderConversation({
  messages,
  pending,
  loadingMessages,
  error,
}: {
  messages: ChatMessageView[];
  pending: boolean;
  loadingMessages: boolean;
  error: string | null;
}) {
  if (loadingMessages) {
    return <div className="min-h-[48vh] pt-12 text-[14px] text-muted">正在读取这段对话...</div>;
  }

  if (messages.length === 0 && !pending && !error) {
    return <div aria-hidden className="min-h-[48vh]" />;
  }

  return (
    <section className="pt-6 md:pt-10">
      {messages.map((message) =>
        message.role === "user" ? (
          <UserMessage key={message.id}>{message.content}</UserMessage>
        ) : (
          <AssistantMessage key={message.id} message={message} />
        ),
      )}
      {pending ? <ThinkingSteps /> : null}
      {error ? (
        <div className="mt-8 max-w-[640px] border-l border-line pl-5">
          <p className="text-[14px] leading-6 text-muted">{error}</p>
        </div>
      ) : null}
    </section>
  );
}

function AssistantMessage({ message }: { message: ChatMessageView }) {
  if (message.result) {
    return (
      <PipelineResultView
        result={message.result}
        userMessage=""
        showUserMessage={false}
      />
    );
  }

  return (
    <article className="border-l border-line py-7 pl-5">
      <p className="mb-3 text-[12px] leading-5 text-muted md:text-[13px]">
        圆桌主持
      </p>
      <p className="max-w-[780px] whitespace-pre-line text-[16px] leading-[1.9] text-ink/90 md:text-[18px]">
        {message.content}
      </p>
    </article>
  );
}

function UserMessage({ children }: { children: string }) {
  return (
    <article className="flex justify-end py-7">
      <p className="max-w-[560px] rounded-[16px] bg-white px-5 py-3 text-[16px] leading-7 text-ink shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
        {children}
      </p>
    </article>
  );
}

function toRecentMessages(messages: ChatMessageView[]): RecentMessage[] {
  return messages.slice(-10).map((message) => ({
    role: message.role,
    content: message.content,
    speaker: message.speaker ?? (message.role === "user" ? "user" : "director"),
  }));
}

function flattenAssistantResult(result: MentorOSPipelineResult): string {
  return [
    result.dialogue.opening,
    ...result.dialogue.messages.map((message) => `${message.speaker}: ${message.content}`),
    result.dialogue.summary,
    result.dialogue.nextQuestion,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function upsertConversation(
  conversations: ConversationSummary[],
  next: ConversationSummary,
): ConversationSummary[] {
  const withoutCurrent = conversations.filter((conversation) => conversation.id !== next.id);
  return [next, ...withoutCurrent];
}

function findConversationTitle(
  conversations: ConversationSummary[],
  conversationId: string,
): string | null {
  return conversations.find((conversation) => conversation.id === conversationId)?.title ?? null;
}

function makeConversationTitle(message: string): string {
  const compact = message.replace(/\s+/g, " ").trim();
  return compact.length > 24 ? `${compact.slice(0, 24)}...` : compact || "新对话";
}
