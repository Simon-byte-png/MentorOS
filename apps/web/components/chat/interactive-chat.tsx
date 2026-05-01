"use client";

import { useState } from "react";
import type { MentorOSPipelineResult } from "@mentoros/ai";
import { ChatInput } from "@/components/chat/chat-input";
import { EmptyChatState } from "@/components/chat/empty-chat-state";
import { PipelineResultView } from "@/components/chat/pipeline-result-view";
import { ThinkingSteps } from "@/components/chat/thinking-steps";
import { emptyStateCopy, thinkingStatuses } from "@/lib/mock-data";

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

export function InteractiveChat() {
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<MentorOSPipelineResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSubmittedMessage, setLastSubmittedMessage] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const friendlyError =
    "MentorOS 暂时没有组织好这场讨论，请稍后重试。";

  async function submitMessage(message: string) {
    const trimmed = message.trim();

    if (pending || trimmed.length === 0) return;

    setPending(true);
    setError(null);
    setResult(null);
    setLastSubmittedMessage(trimmed);
    setDraft("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userMessage: trimmed,
          ...(conversationId ? { conversationId } : {}),
        }),
      });
      const payload = (await response.json()) as ChatApiResponse;

      if (!payload.ok) {
        setError(ERROR_BY_STATUS[response.status] ?? payload.error ?? friendlyError);
        return;
      }

      setResult(payload.result);
      if (payload.conversationId) {
        setConversationId(payload.conversationId);
      }
    } catch {
      setError(friendlyError);
    } finally {
      setPending(false);
    }
  }

  function handleRetry() {
    void submitMessage(lastSubmittedMessage);
  }

  function handleBackToInput() {
    setDraft(lastSubmittedMessage);
    setError(null);
  }

  function handleUseNextQuestion(question: string) {
    setDraft(question);
    setError(null);
  }

  return (
    <>
      <div className="mx-auto max-w-[1140px] px-5 pb-40 md:px-10">
        <main className="min-w-0">
          {pending ? (
            <section className="pt-10 md:pt-14">
              <ThinkingSteps steps={thinkingStatuses} />
            </section>
          ) : null}
          {result ? (
            <PipelineResultView
              result={result}
              userMessage={lastSubmittedMessage}
              conversationId={conversationId}
              onUseNextQuestion={handleUseNextQuestion}
            />
          ) : pending || error ? null : (
            <EmptyChatState copy={emptyStateCopy} />
          )}
          {error ? (
            <div className="mt-8 max-w-[640px] border-t border-line pt-5">
              <p className="text-[14px] leading-6 text-muted">{error}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                {lastSubmittedMessage ? (
                  <button
                    type="button"
                    className="border border-ink px-4 py-2 text-[13px] text-ink transition-colors hover:bg-ink hover:text-white disabled:cursor-not-allowed disabled:border-line disabled:text-muted disabled:hover:bg-transparent disabled:hover:text-muted"
                    onClick={handleRetry}
                    disabled={pending}
                  >
                    重试
                  </button>
                ) : null}
                <button
                  type="button"
                  className="border border-line px-4 py-2 text-[13px] text-muted transition-colors hover:border-ink hover:text-ink disabled:cursor-not-allowed"
                  onClick={handleBackToInput}
                  disabled={pending}
                >
                  回到输入
                </button>
              </div>
            </div>
          ) : null}
        </main>
      </div>
      <ChatInput
        value={draft}
        disabled={pending}
        onChange={setDraft}
        onSubmit={submitMessage}
      />
    </>
  );
}
