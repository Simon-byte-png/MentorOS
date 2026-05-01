import { AppShell } from "@/components/layout/app-shell";
import { MemoryList } from "@/components/memory/memory-list";
import { memoryItems } from "@/lib/mock-data";

export default function MemoryPage() {
  return (
    <AppShell active="memory" topbarTitle="Memory Room">
      <section className="mx-auto max-w-[840px] px-5 pb-24 pt-12 md:px-10 md:pt-16">
        <p className="mb-4 text-[14px] text-muted">Memory</p>
        <h1 className="max-w-3xl font-serif text-[42px] leading-tight md:text-[56px]">
          这些是 MentorOS 目前记住的内容。
        </h1>
        <p className="mt-6 max-w-2xl text-[17px] leading-8 text-muted">
          你可以随时查看、编辑或删除 MentorOS 记住的内容。
        </p>
        <div className="mt-12">
          <MemoryList items={memoryItems} />
        </div>
      </section>
    </AppShell>
  );
}
