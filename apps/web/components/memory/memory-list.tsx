import type { MemoryItem } from "@/lib/mock-data";
import { MemoryCard } from "@/components/memory/memory-card";

type MemoryListProps = {
  items: MemoryItem[];
};

export function MemoryList({ items }: MemoryListProps) {
  return (
    <div className="border-t border-line">
      {items.map((item) => (
        <MemoryCard key={item.id} item={item} />
      ))}
    </div>
  );
}
