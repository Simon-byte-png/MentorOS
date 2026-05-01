import type { CouncilMessage as CouncilMessageType } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type CouncilMessageProps = {
  message: CouncilMessageType;
};

export function CouncilMessage({ message }: CouncilMessageProps) {
  const isDirector = message.role === "director";
  const isUser = message.role === "user";

  return (
    <article
      className={cn(
        "border-b border-line/80 py-8 last:border-b-0",
        isDirector && "py-10",
        isUser && "flex flex-col items-end py-7"
      )}
    >
      <p
        className={cn(
          "mb-3 text-[13px] text-muted md:text-[14px]",
          isUser && "text-right"
        )}
      >
        {message.speaker}
      </p>
      <p
        className={cn(
          "max-w-[780px] text-[17px] leading-[1.9] text-ink md:text-[19px]",
          isDirector && "font-serif text-[19px] leading-[1.85] md:text-[21px]",
          isUser &&
            "max-w-[680px] border-l border-line pl-5 text-right text-[16px] leading-[1.85] text-ink/85 md:text-[18px]"
        )}
      >
        {message.text}
      </p>
    </article>
  );
}
