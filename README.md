# MentorOS

MentorOS is a long-memory, multi-agent intellectual dialogue system. It explores a quieter form of AI conversation: remembered context, selected cognitive agents, background roundtable discussion, and a final response shaped by a dialogue director.

Current status: working monorepo prototype with a Next.js frontend, mock-first AI pipeline, Supabase-ready auth/database packages, and evaluation fixtures. Real DeepSeek calls are optional and disabled by default.

## What It Does

- Runs a mock-first multi-agent dialogue pipeline.
- Selects cognitive model agents from a registry.
- Produces structured council traces, dialogue output, memory candidates, and decision memo candidates.
- Provides a quiet study-style web interface instead of a dashboard-heavy chat UI.
- Includes Supabase migrations and repository layers for auth, invite access, conversations, messages, memories, and usage tracking.
- Includes evals for tone, memory quality, agent differentiation, runtime behavior, safety, and frontend consistency.

## Tech Stack

- Monorepo: pnpm workspaces + Turborepo
- Web: Next.js App Router, TypeScript, Tailwind CSS
- AI runtime: mock provider by default, optional DeepSeek provider
- Data: Supabase Auth and PostgreSQL schema/repositories
- Quality: package-level TypeScript checks and evaluation fixtures

## Repository Layout

- `apps/web`: Next.js app, chat UI, login/invite flow, API routes
- `packages/ai`: pipeline orchestration, providers, prompts, streaming helpers
- `packages/agents`: cognitive model cards, registry, selection policy
- `packages/db`: Supabase schema, repositories, server/client helpers
- `packages/evals`: quality evals, rubrics, fixtures
- `packages/shared`: shared types and constants

## Local Development

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

The default local path uses mock AI behavior. To enable real model calls, copy `.env.example`, set server-side environment variables, and explicitly opt in:

```bash
ENABLE_REAL_LLM=true
DEEPSEEK_API_KEY=<your-deepseek-api-key>
```

Do not expose service role keys or model API keys to client components.

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm build
```

## License

MIT
