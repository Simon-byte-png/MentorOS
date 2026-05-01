"use client";

import { useState } from "react";
import type { KeyboardEvent } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

type ChatInputProps = {
  placeholder?: string;
  value?: string;
  disabled?: boolean;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
};

export function ChatInput({
  placeholder = "把你正在纠结的事说出来。可以混乱，可以情绪化，可以没有结论。",
  value,
  disabled = false,
  onChange,
  onSubmit
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
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-paper/95 px-5 py-4 backdrop-blur md:left-[236px] md:px-10">
      <div className="mx-auto max-w-[1140px]">
        <div className="max-w-[840px] border border-line bg-paper px-4 py-3 shadow-quiet">
          <div className="flex items-end gap-3">
            <textarea
              aria-label="Message"
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
              aria-label="Send message"
              onClick={handleSend}
              disabled={disabled}
            >
              <ArrowUp className="h-4 w-4" strokeWidth={1.8} />
            </button>
          </div>
          <p className="mt-2 text-[12px] text-muted">
            Enter 发送，Shift + Enter 换行
          </p>
        </div>
      </div>
    </div>
  );
}
