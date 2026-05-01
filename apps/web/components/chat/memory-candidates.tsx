"use client";

import { useState } from "react";
import type { ExtractedMemoryCandidate } from "@mentoros/ai";

type CandidateStatus = "idle" | "editing" | "saving" | "saved" | "ignored" | "error";

type MemoryCandidatesProps = {
  candidates: ExtractedMemoryCandidate[];
  conversationId: string | null;
};

export function MemoryCandidates({ candidates, conversationId }: MemoryCandidatesProps) {
  const [statuses, setStatuses] = useState<Map<number, CandidateStatus>>(new Map());
  const [editedContents, setEditedContents] = useState<Map<number, string>>(new Map());

  function getStatus(index: number): CandidateStatus {
    return statuses.get(index) ?? "idle";
  }

  function updateStatus(index: number, status: CandidateStatus) {
    setStatuses((prev) => new Map(prev).set(index, status));
  }

  async function handleConfirm(index: number, editedContent?: string) {
    const candidate = candidates[index];
    updateStatus(index, "saving");

    try {
      const response = await fetch("/api/memories/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, candidate, editedContent }),
      });
      const result = (await response.json()) as { ok: boolean; error?: string };

      if (result.ok) {
        updateStatus(index, "saved");
      } else {
        updateStatus(index, "error");
      }
    } catch {
      updateStatus(index, "error");
    }
  }

  function handleEdit(index: number) {
    const candidate = candidates[index];
    setEditedContents((prev) => new Map(prev).set(index, candidate.content));
    updateStatus(index, "editing");
  }

  function handleCancelEdit(index: number) {
    setEditedContents((prev) => {
      const next = new Map(prev);
      next.delete(index);
      return next;
    });
    updateStatus(index, "idle");
  }

  function handleIgnore(index: number) {
    updateStatus(index, "ignored");
  }

  if (candidates.length === 0) {
    return (
      <section className="mt-8 max-w-[840px] border-t border-line pt-6">
        <h2 className="text-[14px] font-normal text-ink">
          可能值得记住的内容
        </h2>
        <p className="mt-5 text-[14px] leading-7 text-muted">
          这轮暂时没有需要写入长期记忆的内容。
        </p>
      </section>
    );
  }

  return (
    <section className="mt-8 max-w-[840px] border-t border-line pt-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="text-[14px] font-normal text-ink">
          可能值得记住的内容
        </h2>
        <p className="text-[12px] leading-5 text-muted">
          当前仅为候选，确认后才会写入长期记忆。
        </p>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {candidates.map((candidate, index) => {
          const status = getStatus(index);
          return (
            <CandidateCard
              key={`${candidate.type}-${index}`}
              candidate={candidate}
              status={status}
              editedContent={editedContents.get(index) ?? ""}
              onConfirm={() => handleConfirm(index)}
              onEdit={() => handleEdit(index)}
              onSaveEdit={(content) => handleConfirm(index, content)}
              onCancelEdit={() => handleCancelEdit(index)}
              onIgnore={() => handleIgnore(index)}
              onRetry={() => handleConfirm(index, editedContents.get(index))}
              onEditedContentChange={(content) =>
                setEditedContents((prev) => new Map(prev).set(index, content))
              }
            />
          );
        })}
      </div>
    </section>
  );
}

type CandidateCardProps = {
  candidate: ExtractedMemoryCandidate;
  status: CandidateStatus;
  editedContent: string;
  onConfirm: () => void;
  onEdit: () => void;
  onSaveEdit: (content: string) => void;
  onCancelEdit: () => void;
  onIgnore: () => void;
  onRetry: () => void;
  onEditedContentChange: (content: string) => void;
};

function CandidateCard({
  candidate,
  status,
  editedContent,
  onConfirm,
  onEdit,
  onSaveEdit,
  onCancelEdit,
  onIgnore,
  onRetry,
  onEditedContentChange,
}: CandidateCardProps) {
  const isInteractive = status === "idle";
  const isEditing = status === "editing";
  const isSaving = status === "saving";

  return (
    <article className="min-w-0 border border-line/80 bg-paper px-4 py-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] leading-5 text-muted">
        <span>{formatMemoryType(candidate.type)}</span>
        <span className="h-px w-5 bg-line" aria-hidden />
        <span>{formatConfidence(candidate.confidence)}</span>
      </div>

      {isEditing ? (
        <textarea
          className="mt-3 w-full resize-none border border-line bg-transparent px-3 py-2 text-[14px] leading-7 text-ink outline-none focus:border-ink"
          rows={3}
          value={editedContent}
          onChange={(e) => onEditedContentChange(e.target.value)}
        />
      ) : (
        <p className="mt-3 break-words text-[14px] leading-7 text-ink/85">
          {candidate.content}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {isInteractive && (
          <>
            <button
              type="button"
              className="border border-ink px-3 py-1.5 text-[12px] text-ink transition-colors hover:bg-ink hover:text-white"
              onClick={onConfirm}
            >
              记住
            </button>
            <button
              type="button"
              className="border border-line px-3 py-1.5 text-[12px] text-muted transition-colors hover:border-ink hover:text-ink"
              onClick={onEdit}
            >
              编辑后记住
            </button>
            <button
              type="button"
              className="border border-line px-3 py-1.5 text-[12px] text-muted transition-colors hover:border-ink hover:text-ink"
              onClick={onIgnore}
            >
              不记
            </button>
          </>
        )}

        {isEditing && (
          <>
            <button
              type="button"
              className="border border-ink px-3 py-1.5 text-[12px] text-ink transition-colors hover:bg-ink hover:text-white"
              onClick={() => onSaveEdit(editedContent)}
            >
              保存
            </button>
            <button
              type="button"
              className="border border-line px-3 py-1.5 text-[12px] text-muted transition-colors hover:border-ink hover:text-ink"
              onClick={onCancelEdit}
            >
              取消
            </button>
          </>
        )}

        {isSaving && (
          <span className="text-[12px] leading-5 text-muted">保存中…</span>
        )}

        {status === "saved" && (
          <span className="text-[12px] leading-5 text-muted">已记住</span>
        )}

        {status === "ignored" && (
          <span className="text-[12px] leading-5 text-muted">已忽略</span>
        )}

        {status === "error" && (
          <div className="flex items-center gap-2">
            <span className="text-[12px] leading-5 text-muted">
              这条记忆暂时没有保存成功，请稍后重试。
            </span>
            <button
              type="button"
              className="border border-line px-3 py-1.5 text-[12px] text-muted transition-colors hover:border-ink hover:text-ink"
              onClick={onRetry}
            >
              重试
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

function formatMemoryType(type: string): string {
  const labels: Record<string, string> = {
    profile: "画像",
    goal: "目标",
    preference: "偏好",
    project: "项目",
    decision_history: "决策",
    blind_spot: "盲区",
    writing_style: "表达",
    relationship: "关系",
  };

  return labels[type] ?? type;
}

function formatConfidence(confidence: string): string {
  if (confidence === "fact") {
    return "置信度较高";
  }

  return "置信度中等";
}
