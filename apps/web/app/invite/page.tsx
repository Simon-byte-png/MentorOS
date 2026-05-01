import { redirect } from "next/navigation";
import { getCurrentAccess, getRedirectForAccess } from "@/lib/auth/access";
import { InviteForm } from "./invite-form";

export default async function InvitePage() {
  const access = await getCurrentAccess();
  const accessRedirect = getRedirectForAccess(access);

  if (accessRedirect === "/login" || accessRedirect === "/chat") {
    redirect(accessRedirect);
  }

  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-7 md:px-10">
        <header className="border-b border-line pb-5">
          <div className="flex h-10 w-10 items-center justify-center border border-ink text-[15px] font-medium">
            M
          </div>
        </header>

        <section className="flex flex-1 items-center py-16">
          <div className="w-full max-w-[480px]">
            <p className="mb-5 text-[14px] text-muted">MentorOS Beta</p>
            <h1 className="font-serif text-[42px] leading-[1.1] tracking-normal md:text-[54px]">
              输入内测邀请码
            </h1>
            <p className="mt-6 text-[17px] leading-8 text-muted">
              MentorOS 目前只开放小规模测试。邀请码通过后，你就可以开始使用。
            </p>

            <InviteForm />
          </div>
        </section>
      </div>
    </main>
  );
}
