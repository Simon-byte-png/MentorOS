"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const INVITE_ERROR_MESSAGE = "邀请码无效或已被使用。";

type InviteRedeemResponse =
  | {
      ok: true;
    }
  | {
      ok: false;
      error: string;
    };

export function InviteForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedCode = code.trim();

    if (!trimmedCode || pending) {
      return;
    }

    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/invite/redeem", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: trimmedCode }),
      });
      const payload = (await response.json()) as InviteRedeemResponse;

      if (!response.ok || !payload.ok) {
        setError(payload.ok ? INVITE_ERROR_MESSAGE : payload.error);
        return;
      }

      router.push("/chat");
      router.refresh();
    } catch {
      setError(INVITE_ERROR_MESSAGE);
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="mt-10 space-y-5" onSubmit={handleSubmit}>
      <label className="block">
        <span className="text-[13px] text-muted">邀请码</span>
        <input
          className="mt-2 h-12 w-full border border-line bg-transparent px-4 text-[15px] uppercase tracking-normal text-ink outline-none transition-colors placeholder:normal-case placeholder:text-muted focus:border-ink"
          type="text"
          autoComplete="one-time-code"
          required
          value={code}
          placeholder="输入邀请码"
          onChange={(event) => setCode(event.target.value)}
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-12 w-full items-center justify-center border border-ink bg-ink px-5 text-[15px] text-white transition-colors hover:bg-transparent hover:text-ink disabled:cursor-not-allowed disabled:border-line disabled:bg-transparent disabled:text-muted"
      >
        {pending ? "验证中..." : "进入内测"}
      </button>

      {error ? (
        <p className="text-[14px] leading-6 text-muted">{error}</p>
      ) : null}
    </form>
  );
}
