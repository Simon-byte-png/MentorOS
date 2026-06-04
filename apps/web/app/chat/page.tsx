import { InteractiveChat } from "@/components/chat/interactive-chat";
import {
  getCurrentPageAccess,
  getRedirectForAccess,
  isDevBypassEnabled,
} from "@/lib/auth/access";
import { redirect } from "next/navigation";

export default async function ChatPage() {
  if (!isDevBypassEnabled()) {
    const access = await getCurrentPageAccess();
    const accessRedirect = getRedirectForAccess(access);

    if (accessRedirect !== "/chat") {
      redirect(accessRedirect);
    }
  }

  return (
    <InteractiveChat />
  );
}
