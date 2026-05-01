import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

type AppShellProps = {
  active?: "chat" | "memory" | "memo" | "settings";
  children: ReactNode;
  topbarTitle?: string;
};

export function AppShell({ active, children, topbarTitle }: AppShellProps) {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="flex min-h-screen">
        <Sidebar active={active} />
        <main className="min-w-0 flex-1">
          <Topbar title={topbarTitle} />
          {children}
        </main>
      </div>
    </div>
  );
}
