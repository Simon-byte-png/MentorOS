import type { MentorOSPipelineResult } from "@mentoros/ai";
import { complianceNote } from "@/lib/mock-data";
import { adaptChatResult } from "@/lib/chat-result-adapter";
import { cn } from "@/lib/utils";

type PipelineResultViewProps = {
  result: MentorOSPipelineResult;
  userMessage: string;
  showUserMessage?: boolean;
};

export function PipelineResultView({
  result,
  userMessage,
  showUserMessage = true
}: PipelineResultViewProps) {
  const view = adaptChatResult(result);

  return (
    <section className="min-w-0 pt-10 md:pt-14">
      <div className="max-w-[880px]">
        {showUserMessage ? (
          <ReadingBlock speaker="你" variant="user">
            {userMessage}
          </ReadingBlock>
        ) : null}
        <ReadingBlock speaker="圆桌主持" variant="opening">
          {view.dialogue.opening}
        </ReadingBlock>
        {view.dialogue.messages.map((message, index) => (
          <ReadingBlock
            key={`${message.speaker}-${index}`}
            speaker={formatSpeakerName(message.speaker)}
            variant="agent"
          >
            {message.content}
          </ReadingBlock>
        ))}
        <ReadingBlock speaker="收束判断" variant="closing">
          {view.dialogue.summary}
        </ReadingBlock>
      </div>

      <p className="mt-8 max-w-[760px] text-[12px] leading-5 text-muted">
        {complianceNote}
      </p>
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
        "py-7",
        isOpening && "py-10",
        isClosing && "py-9",
        isUser && "flex flex-col items-end py-7",
        !isUser && "border-l border-line pl-5"
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
            "max-w-[760px] text-[17px] text-ink md:text-[19px]",
          isUser &&
            "max-w-[560px] rounded-[16px] bg-white px-5 py-3 text-right text-[15px] leading-[1.85] text-ink shadow-[0_8px_30px_rgba(0,0,0,0.04)] md:text-[17px]"
        )}
      >
        {children}
      </p>
    </article>
  );
}

function formatSpeakerName(speaker: string): string {
  const names: Record<string, string> = {
    "dialogue director": "圆桌主持",
    "munger-style mentor": "芒格式认知模型",
    "feynman-style mentor": "费曼式认知模型",
    "naval-style mentor": "Naval 式认知模型",
    "taleb-style mentor": "塔勒布式认知模型",
    "jobs-style mentor": "乔布斯式认知模型",
    "duan-style mentor": "段永平式认知模型"
  };

  return names[speaker.toLowerCase()] ?? speaker;
}
