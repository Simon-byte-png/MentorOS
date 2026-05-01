import { AppShell } from "@/components/layout/app-shell";
import { ChatInput } from "@/components/chat/chat-input";
import { ConversationView } from "@/components/chat/conversation-view";
import { MemoryHintRail } from "@/components/chat/memory-hint-rail";
import { demoChatMessages, memoryHints } from "@/lib/mock-data";

export default function ChatDemoPage() {
  return (
    <AppShell active="chat">
      <div className="mx-auto grid max-w-[1140px] grid-cols-1 gap-12 px-5 pb-36 md:px-10 xl:grid-cols-[minmax(0,840px)_200px] xl:gap-16">
        <ConversationView messages={demoChatMessages} />
        <MemoryHintRail hints={memoryHints} />
      </div>
      <ChatInput />
    </AppShell>
  );
}
