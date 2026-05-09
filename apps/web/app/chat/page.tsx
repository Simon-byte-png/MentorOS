import { InteractiveChat } from "@/components/chat/interactive-chat";
import {
  getCurrentAccess,
  getRedirectForAccess,
  isDevBypassEnabled,
} from "@/lib/auth/access";
import { redirect } from "next/navigation";

export default async function ChatPage() {
  if (!isDevBypassEnabled()) {
    const access = await getCurrentAccess();
    const accessRedirect = getRedirectForAccess(access);

    if (accessRedirect !== "/chat") {
      redirect(accessRedirect);
    }
  }

  return (
    <InteractiveChat />
  );
}
