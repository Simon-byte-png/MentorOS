# MentorOS

MentorOS is a monorepo for a long-memory, multi-agent intellectual dialogue system.

The first working slice is a static **A. Quiet Study** frontend prototype in `apps/web`. It uses mock data only and does not connect to OpenAI, Supabase, auth, or any real backend route.

## Tech Plan

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui reserved for future UI primitives
- Supabase Auth and PostgreSQL planned
- OpenAI API planned
- Vercel deployment planned

## Local Preview

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

## Current Stop Rule

Before any backend, AI, auth, or memory persistence work continues, the static frontend visual prototype must be reviewed and confirmed.
