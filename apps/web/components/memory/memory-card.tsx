import type { MemoryItem } from "@/lib/mock-data";

type MemoryCardProps = {
  item: MemoryItem;
};

export function MemoryCard({ item }: MemoryCardProps) {
  return (
    <article className="border-b border-line py-8">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[14px] text-muted">{item.category}</h2>
          <p className="mt-1 text-[12px] leading-5 text-muted/80">{item.source}</p>
        </div>
        <div className="flex shrink-0 gap-3 text-[13px] text-muted">
          <button type="button" className="hover:text-ink">
            编辑
          </button>
          <button type="button" className="hover:text-ink">
            删除
          </button>
        </div>
      </div>
      <p className="max-w-[760px] text-[18px] leading-[1.85]">{item.text}</p>
    </article>
  );
}
