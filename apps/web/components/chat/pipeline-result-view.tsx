import type { MentorOSPipelineResult } from "@mentoros/ai";
import { complianceNote } from "@/lib/mock-data";
import { adaptChatResult } from "@/lib/chat-result-adapter";
import { MemoryCandidates } from "@/components/chat/memory-candidates";
import { cn } from "@/lib/utils";

type PipelineResultViewProps = {
  result: MentorOSPipelineResult;
  userMessage: string;
  conversationId: string | null;
  onUseNextQuestion: (question: string) => void;
};

export function PipelineResultView({
  result,
  userMessage,
  conversationId,
  onUseNextQuestion
}: PipelineResultViewProps) {
  const view = adaptChatResult(result);

  return (
    <section className="min-w-0 pt-10 md:pt-14">
      {view.selectedAgents.length > 0 ? (
        <div className="mb-8 max-w-[760px] border-y border-line py-4">
          <p className="text-[13px] leading-6 text-ink/80">
            本轮圆桌：{view.selectedAgents.map((agent) => agent.label).join(" · ")}
          </p>
          <p className="mt-1 text-[12px] leading-5 text-muted">
            {complianceNote}
          </p>
        </div>
      ) : null}

      <div className="max-w-[840px] border-t border-line">
        <ReadingBlock speaker="你" variant="user">
          {userMessage}
        </ReadingBlock>
        <ReadingBlock speaker="Dialogue Director" variant="opening">
          {view.dialogue.opening}
        </ReadingBlock>
        {view.dialogue.messages.map((message, index) => (
          <ReadingBlock
            key={`${message.speaker}-${index}`}
            speaker={message.speaker}
            variant="agent"
          >
            {message.content}
          </ReadingBlock>
        ))}
        <ReadingBlock speaker="收束判断" variant="closing">
          {view.dialogue.summary}
        </ReadingBlock>
      </div>

      <section className="mt-8 max-w-[840px] border-y border-line py-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-[14px] font-normal text-ink">下一问</h2>
            <p className="mt-3 max-w-[680px] text-[17px] leading-8 text-ink/85">
              {view.dialogue.nextQuestion}
            </p>
          </div>
          <button
            type="button"
            className="w-fit shrink-0 border border-line px-4 py-2 text-[13px] text-muted transition-colors hover:border-ink hover:text-ink"
            onClick={() => onUseNextQuestion(view.dialogue.nextQuestion)}
          >
            用这个继续问
          </button>
        </div>
      </section>

      <MemoryCandidates
        candidates={view.memoryCandidates}
        conversationId={conversationId}
      />

      <details className="mt-8 max-w-[840px] border-y border-line py-5">
        <summary className="cursor-pointer text-[14px] text-ink">
          本次决策备忘录
        </summary>
        <div className="mt-6 space-y-6 text-[14px] leading-7 text-muted">
          <MemoText
            title="这次真正的问题"
            body={view.decisionMemo.questionRestatement}
          />
          <MemoList title="主要风险" items={view.decisionMemo.risks} />
          <MemoList title="未来 7 天行动" items={view.decisionMemo.sevenDayPlan} />
          <MemoList title="复盘指标" items={view.decisionMemo.reviewMetrics} />
        </div>
      </details>

      <div className="mt-6 max-w-[840px] text-[13px] leading-6 text-muted">
        <p className={cn("text-ink/80", !view.evalStatus.passed && "text-ink")}>
          {view.evalStatus.label}
        </p>
        <p className="mt-1 text-muted/80">
          已检查：安全、人物边界、记忆表达、运行质量
        </p>
      </div>
    </section>
  );
}

function ReadingBlock({
  speaker,
  variant,
  children
}: {
  speaker: string;
  variant: "opening" | "agent" | "closing" | "user";
  children: string;
}) {
  const isOpening = variant === "opening";
  const isAgent = variant === "agent";
  const isClosing = variant === "closing";
  const isUser = variant === "user";

  return (
    <article
      className={cn(
        "border-b border-line/80 py-8 last:border-b-0",
        isOpening && "py-10",
        isClosing && "py-9",
        isUser && "flex flex-col items-end py-7"
      )}
    >
      <p
        className={cn(
          "mb-3 text-[12px] leading-5 text-muted md:text-[13px]",
          isUser && "text-right",
          isClosing && "text-ink/75"
        )}
      >
        {speaker}
      </p>
      <p
        className={cn(
          "max-w-[780px] whitespace-pre-line text-[16px] leading-[1.9] text-ink/90 md:text-[18px]",
          isOpening &&
            "font-serif text-[19px] leading-[1.9] text-ink md:text-[22px]",
          isAgent && "max-w-[740px]",
          isClosing &&
            "max-w-[760px] border-l border-line pl-5 text-[17px] text-ink md:text-[19px]",
          isUser &&
            "max-w-[680px] border-l border-line pl-5 text-right text-[15px] leading-[1.85] text-ink/75 md:text-[17px]"
        )}
      >
        {children}
      </p>
    </article>
  );
}

function MemoText({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <p className="mb-2 text-[12px] text-muted/70">{title}</p>
      <p className="max-w-[760px] text-ink/85">{body}</p>
    </div>
  );
}

function MemoList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;

  return (
    <div>
      <p className="mb-2 text-[12px] text-muted/70">{title}</p>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="max-w-[760px] text-ink/85">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
