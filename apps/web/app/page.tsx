import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-7 md:px-10">
        <header className="flex items-center justify-between border-b border-line pb-5">
          <Link
            href="/"
            className="flex h-10 w-10 items-center justify-center border border-ink text-[15px] font-medium"
            aria-label="MentorOS home"
          >
            M
          </Link>
          <p className="hidden text-[13px] text-muted md:block">
            Quiet Council · Memory On
          </p>
        </header>

        <section className="grid flex-1 items-center gap-12 py-14 md:grid-cols-[minmax(0,760px)_1fr] md:py-20">
          <div>
            <p className="mb-5 text-[14px] text-muted">MentorOS</p>
            <h1 className="max-w-4xl font-serif text-[48px] leading-[1.05] tracking-normal md:text-[64px]">
              把混乱的问题，交给一场有记忆的智识圆桌。
            </h1>
            <p className="mt-8 max-w-2xl text-[18px] leading-[1.9] text-muted md:text-[20px]">
              它会记住你的目标、偏好和反复出现的盲区，在复杂选择前召集不同认知模型，帮你把问题说清楚、想深一点、走稳一点。
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/chat"
                className="inline-flex items-center justify-center gap-2 border border-ink bg-ink px-5 py-3 text-[15px] text-white transition-colors hover:bg-transparent hover:text-ink"
              >
                开始一次对话
                <ArrowRight className="h-4 w-4" strokeWidth={1.7} />
              </Link>
              <Link
                href="/memory"
                className="inline-flex items-center justify-center border border-line px-5 py-3 text-[15px] text-ink transition-colors hover:border-ink"
              >
                查看记忆系统
              </Link>
            </div>
          </div>

          <aside className="hidden border-l border-line pl-10 text-[14px] leading-7 text-muted md:block">
            <p className="mb-6 text-ink">A. Quiet Study</p>
            <p>
              黑白极简，大留白，低密度。先让用户感觉这不是一个急着输出答案的工具，而是一间能把问题慢慢放清楚的私人书房。
            </p>
          </aside>
        </section>

        <footer className="border-t border-line pt-5 text-[13px] text-muted">
          基于公开思想抽象出的认知模型，不代表本人观点。
        </footer>
      </div>
    </main>
  );
}
