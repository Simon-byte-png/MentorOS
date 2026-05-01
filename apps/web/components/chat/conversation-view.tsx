import type { CouncilMessage as CouncilMessageType } from "@/lib/mock-data";
import { complianceNote, thinkingStatuses } from "@/lib/mock-data";
import { CouncilMessage } from "@/components/chat/council-message";
import { ThinkingSteps } from "@/components/chat/thinking-steps";

type ConversationViewProps = {
  messages: CouncilMessageType[];
};

export function ConversationView({ messages }: ConversationViewProps) {
  return (
    <section className="min-w-0 pt-10 md:pt-14">
      <ThinkingSteps steps={thinkingStatuses} />
      <p className="mb-5 max-w-[720px] text-[13px] leading-6 text-muted">
        {complianceNote}
      </p>
      <div className="border-t border-line">
        {messages.map((message) => (
          <CouncilMessage key={message.id} message={message} />
        ))}
      </div>
    </section>
  );
}
