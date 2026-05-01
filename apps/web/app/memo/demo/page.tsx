import { AppShell } from "@/components/layout/app-shell";
import { memoSections } from "@/lib/mock-data";

export default function MemoDemoPage() {
  return (
    <AppShell active="memo" topbarTitle="Decision Memo">
      <article className="mx-auto max-w-[800px] px-5 pb-28 pt-12 md:px-10 md:pt-16">
        <p className="mb-4 text-[14px] text-muted">Memo Demo</p>
        <h1 className="font-serif text-[42px] leading-tight md:text-[58px]">
          MentorOS 第一轮决策备忘录
        </h1>
        <p className="mt-6 max-w-2xl text-[17px] leading-8 text-muted">
          备忘录是对话之后的沉淀，不是主体验。它应该像一份安静的阅读文档，帮助用户在几天后仍能回到当时的判断。
        </p>

        <div className="mt-14 border-t border-line">
          {memoSections.map((section) => (
            <section key={section.title} className="border-b border-line py-10">
              <h2 className="mb-5 text-[15px] text-muted">{section.title}</h2>
              <p className="text-[18px] leading-[1.95] text-ink">{section.body}</p>
            </section>
          ))}
        </div>
      </article>
    </AppShell>
  );
}
