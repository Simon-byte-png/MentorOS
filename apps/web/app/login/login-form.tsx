"use client";

import { useState } from "react";
import { Github } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const EMAIL_SENT_MESSAGE = "注册/登录链接已经发送。请打开邮箱点击链接继续。";
const LOGIN_ERROR_MESSAGE = "暂时无法发送注册/登录链接，请稍后重试。";
const OAUTH_ERROR_MESSAGE = "第三方登录暂时不可用，请稍后重试。";

type OAuthProvider = "google" | "github";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [emailExpanded, setEmailExpanded] = useState(false);
  const [emailPending, setEmailPending] = useState(false);
  const [oauthPending, setOauthPending] = useState<OAuthProvider | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = emailPending || oauthPending !== null;

  async function handleOAuth(provider: OAuthProvider) {
    if (busy) {
      return;
    }

    setOauthPending(provider);
    setMessage(null);
    setError(null);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: getAuthRedirectTo(),
        },
      });

      if (signInError) {
        setError(OAUTH_ERROR_MESSAGE);
        setOauthPending(null);
      }
    } catch {
      setError(OAUTH_ERROR_MESSAGE);
      setOauthPending(null);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedEmail = email.trim();

    if (!trimmedEmail || busy) {
      return;
    }

    setEmailPending(true);
    setMessage(null);
    setError(null);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options: {
          emailRedirectTo: getAuthRedirectTo(),
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
      setEmailPending(false);
    }
  }

  return (
    <div className="mt-10 space-y-5">
      <button
        type="button"
        disabled={busy}
        onClick={() => void handleOAuth("google")}
        className="inline-flex h-12 w-full items-center justify-center border border-ink bg-ink px-5 text-[15px] text-white transition-colors hover:bg-transparent hover:text-ink disabled:cursor-not-allowed disabled:border-line disabled:bg-transparent disabled:text-muted"
      >
        <span className="mr-3 text-[17px] font-medium leading-none">G</span>
        {oauthPending === "google" ? "正在跳转..." : "使用 Google 登录"}
      </button>

      <button
        type="button"
        disabled={busy}
        onClick={() => void handleOAuth("github")}
        className="inline-flex h-12 w-full items-center justify-center border border-line bg-transparent px-5 text-[15px] text-ink transition-colors hover:border-ink disabled:cursor-not-allowed disabled:text-muted"
      >
        <Github aria-hidden className="mr-3 h-4 w-4" strokeWidth={1.8} />
        {oauthPending === "github" ? "正在跳转..." : "使用 GitHub 登录"}
      </button>

      <div className="border-t border-line pt-5">
        <button
          type="button"
          className="text-[14px] text-muted transition-colors hover:text-ink"
          onClick={() => {
            setEmailExpanded((expanded) => !expanded);
            setMessage(null);
            setError(null);
          }}
        >
          {emailExpanded ? "收起邮箱登录" : "使用邮箱登录"}
        </button>
      </div>

      {emailExpanded ? (
        <form className="space-y-5" onSubmit={handleSubmit}>
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
            disabled={busy}
            className="inline-flex h-12 w-full items-center justify-center border border-line bg-transparent px-5 text-[15px] text-ink transition-colors hover:border-ink disabled:cursor-not-allowed disabled:text-muted"
          >
            {emailPending ? "发送中..." : "发送注册/登录链接"}
          </button>
        </form>
      ) : null}

      {message ? (
        <p className="text-[14px] leading-6 text-muted">{message}</p>
      ) : null}
      {error ? (
        <p className="text-[14px] leading-6 text-muted">{error}</p>
      ) : null}
    </div>
  );
}

function getAuthRedirectTo(): string {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const siteUrl = configuredSiteUrl || window.location.origin;
  return `${siteUrl.replace(/\/$/, "")}/auth/callback`;
}
