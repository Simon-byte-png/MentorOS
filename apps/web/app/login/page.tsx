import { redirect } from "next/navigation";
import { getCurrentAccess, getRedirectForAccess } from "@/lib/auth/access";
import { LoginForm } from "./login-form";

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const access = await getCurrentAccess();
  const accessRedirect = getRedirectForAccess(access);

  if (accessRedirect !== "/login") {
    redirect(accessRedirect);
  }

  const params = await searchParams;
  const hasAuthError = params?.error === "auth";

  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-7 md:px-10">
        <header className="border-b border-line pb-5">
          <div className="flex h-10 w-10 items-center justify-center border border-ink text-[15px] font-medium">
            M
          </div>
        </header>

        <section className="flex flex-1 items-center py-16">
          <div className="w-full max-w-[440px]">
            <p className="mb-5 text-[14px] text-muted">MentorOS Beta</p>
            <h1 className="font-serif text-[44px] leading-[1.08] tracking-normal md:text-[56px]">
              注册或登录 MentorOS
            </h1>
            <p className="mt-6 text-[17px] leading-8 text-muted">
              输入邮箱后，我们会发送一个登录链接。新邮箱会自动创建账号，首次进入需要邀请码。
            </p>

            {hasAuthError ? (
              <p className="mt-8 border-t border-line pt-5 text-[14px] leading-6 text-muted">
                注册/登录链接已经失效或无法验证，请重新发送一次。
              </p>
            ) : null}

            <LoginForm />
          </div>
        </section>
      </div>
    </main>
  );
}
