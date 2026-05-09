"use client";

import { useState } from "react";
import type { KeyboardEvent } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

type ModelDepth = "flash" | "pro";

type ChatInputProps = {
  placeholder?: string;
  value?: string;
  disabled?: boolean;
  modelDepth?: ModelDepth;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  onModelDepthChange?: (value: ModelDepth) => void;
};

export function ChatInput({
  placeholder = "输入消息...",
  value,
  disabled = false,
  modelDepth = "flash",
  onChange,
  onSubmit,
  onModelDepthChange
}: ChatInputProps) {
  const [internalDraft, setInternalDraft] = useState("");
  const draft = value ?? internalDraft;
  const isControlled = value !== undefined;

  function updateDraft(nextValue: string) {
    if (!isControlled) {
      setInternalDraft(nextValue);
    }
    onChange?.(nextValue);
  }

  function handleSend() {
    if (disabled || draft.trim().length === 0) return;

    onSubmit?.(draft);

    if (!isControlled) {
      setInternalDraft("");
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.nativeEvent.isComposing) {
      return;
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-paper/95 px-5 py-4 backdrop-blur md:left-[320px] md:px-10">
      <div className="mx-auto max-w-[980px]">
        <div className="border border-line bg-white px-4 py-3 shadow-quiet">
          <div className="mb-3 inline-flex rounded-full border border-line bg-[#faf7f3] p-1">
            {(["flash", "pro"] as const).map((depth) => (
              <button
                key={depth}
                type="button"
                className={cn(
                  "rounded-full px-4 py-1.5 text-[13px] transition-colors",
                  modelDepth === depth
                    ? "bg-white text-ink shadow-[0_4px_14px_rgba(0,0,0,0.06)]"
                    : "text-muted hover:text-ink"
                )}
                onClick={() => onModelDepthChange?.(depth)}
                disabled={disabled}
              >
                {depth === "flash" ? "快速" : "深度"}
              </button>
            ))}
          </div>
          <div className="flex items-end gap-3">
            <textarea
              aria-label="输入消息"
              className="min-h-[70px] min-w-0 flex-1 resize-none bg-transparent text-[16px] leading-7 text-ink outline-none placeholder:text-muted/80"
              placeholder={placeholder}
              value={draft}
              onChange={(event) => updateDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              rows={2}
            />
            <button
              type="button"
              className={cn(
                "mb-1 flex h-9 w-9 shrink-0 items-center justify-center border border-ink text-ink transition-colors hover:bg-ink hover:text-white",
                disabled &&
                  "cursor-not-allowed border-line text-muted hover:bg-transparent hover:text-muted"
              )}
              aria-label="发送消息"
              onClick={handleSend}
              disabled={disabled}
            >
              <ArrowUp className="h-4 w-4" strokeWidth={1.8} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
