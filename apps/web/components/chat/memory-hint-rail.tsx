import type { MemoryHint } from "@/lib/mock-data";

type MemoryHintRailProps = {
  hints: MemoryHint[];
  emptyText?: string;
};

export function MemoryHintRail({ hints, emptyText }: MemoryHintRailProps) {
  return (
    <aside className="hidden pt-16 xl:block" aria-label="Related memory hints">
      <div className="sticky top-24 border-l border-line/70 pl-6">
        <p className="mb-5 text-[12px] text-muted">相关记忆</p>
        {emptyText ? (
          <p className="max-w-[180px] text-[13px] leading-6 text-muted/80">
            {emptyText}
          </p>
        ) : (
          <div className="space-y-5">
            {hints.map((hint) => (
              <p
                key={hint.id}
                className="max-w-[180px] text-[13px] leading-6 text-muted"
              >
                {hint.text}
              </p>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
