"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const EMAIL_SENT_MESSAGE = "登录链接已经发送。请打开邮箱继续。";
const LOGIN_ERROR_MESSAGE = "暂时无法发送登录链接，请稍后重试。";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedEmail = email.trim();

    if (!trimmedEmail || pending) {
      return;
    }

    setPending(true);
    setMessage(null);
    setError(null);

    try {
      const supabase = createClient();
      const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
      const siteUrl = configuredSiteUrl || window.location.origin;
      const emailRedirectTo = `${siteUrl.replace(/\/$/, "")}/auth/callback`;
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options: {
          emailRedirectTo,
          shouldCreateUser: true,
        },
      });

      if (signInError) {
        setError(LOGIN_ERROR_MESSAGE);
        return;
      }

      setMessage(EMAIL_SENT_MESSAGE);
    } catch {
      setError(LOGIN_ERROR_MESSAGE);
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="mt-10 space-y-5" onSubmit={handleSubmit}>
      <label className="block">
        <span className="text-[13px] text-muted">邮箱</span>
        <input
          className="mt-2 h-12 w-full border border-line bg-transparent px-4 text-[15px] text-ink outline-none transition-colors placeholder:text-muted focus:border-ink"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          placeholder="you@example.com"
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-12 w-full items-center justify-center border border-ink bg-ink px-5 text-[15px] text-white transition-colors hover:bg-transparent hover:text-ink disabled:cursor-not-allowed disabled:border-line disabled:bg-transparent disabled:text-muted"
      >
        {pending ? "发送中..." : "发送登录链接"}
      </button>

      {message ? (
        <p className="text-[14px] leading-6 text-muted">{message}</p>
      ) : null}
      {error ? (
        <p className="text-[14px] leading-6 text-muted">{error}</p>
      ) : null}
    </form>
  );
}
