# Architecture

MentorOS uses a pnpm/turbo monorepo so five Codex windows can work in parallel without crossing ownership boundaries.

## Packages

- `apps/web`: static prototype, pages, visual system, mock data
- `packages/shared`: shared types and constants
- `packages/db`: Supabase schema, repositories, database types, RLS notes
- `packages/agents`: cognitive model cards, registry, selection policy
- `packages/ai`: OpenAI client, orchestration, structured schemas, streaming
- `packages/evals`: evaluation tests, rubrics, fixtures

## Intended Data Flow

User input enters the web app, moves to the AI package for orchestration, retrieves memory through database repositories, selects cognitive models from the agents package, streams a Dialogue Director response back to the web app, and later writes approved memory updates.

The current prototype stops at mock data inside `apps/web/lib/mock-data.ts`.
