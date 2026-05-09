import Link from "next/link";
import { BookOpenText, MessageCircle, NotebookText, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/chat", label: "对话", icon: MessageCircle },
  { href: "/memory", label: "记忆", icon: BookOpenText },
  { href: "/memo/demo", label: "备忘录", icon: NotebookText },
  { href: "#", label: "设置", icon: Settings }
];

type SidebarProps = {
  active?: "chat" | "memory" | "memo" | "settings";
};

export function Sidebar({ active }: SidebarProps) {
  return (
    <aside className="hidden w-[236px] shrink-0 border-r border-line bg-paper/95 px-6 py-7 md:flex md:min-h-screen md:flex-col">
      <Link
        href="/"
        className="flex h-10 w-10 items-center justify-center border border-ink text-[15px] font-medium"
        aria-label="MentorOS home"
      >
        M
      </Link>

      <nav className="mt-14 space-y-2 text-[15px]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const selected =
            (active === "chat" && item.href === "/chat") ||
            (active === "memory" && item.href === "/memory") ||
            (active === "memo" && item.href === "/memo/demo") ||
            (active === "settings" && item.label === "设置");

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center gap-3 py-2 text-muted transition-colors hover:text-ink",
                selected && "text-ink"
              )}
            >
              <Icon aria-hidden className="h-4 w-4" strokeWidth={1.6} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-line pt-5 text-[13px] text-muted">
        <div className="mb-2 h-px w-10 bg-ink/30" />
        记忆开启
      </div>
    </aside>
  );
}
