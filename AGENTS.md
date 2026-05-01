# MentorOS Agent Rules

## Project Goal

MentorOS is an intellectual dialogue system with long-term memory, natural language texture, and multi-agent roundtable discussion. The user should experience a thoughtful conversation, not a dashboard, chatbot template, or generated report.

## Tech Stack

- Monorepo: pnpm workspaces + Turborepo
- Web app: Next.js App Router, TypeScript, Tailwind CSS
- UI: shadcn/ui may be introduced later, but the first prototype should stay light
- Data: Supabase Auth and Supabase PostgreSQL are planned
- AI: OpenAI API is planned
- Deployment: Vercel is planned

## Five-Window Boundaries

### Window A: `apps/web`

Owns frontend pages, visual design, interactions, and mock data. Window A may create or edit files inside `apps/web` only.

Window A must not connect to real OpenAI APIs. Window A must not implement Supabase reads or writes. Window A must not modify `packages/ai`, `packages/db`, `packages/agents`, or `packages/evals`.

### Window B: `packages/db`

Owns Supabase schema, repository placeholders, database types, and RLS notes.

Window B must not write frontend pages. Window B must not write Agent prompts. Window B must not call OpenAI APIs.

### Window C: `packages/agents`

Owns the six cognitive model cards, Agent registry, and selection policy.

Window C must not write OpenAI API calls. Window C must not write UI. Window C must not write database schema.

### Window D: `packages/ai`

Owns OpenAI client placeholders, structured schemas, background council orchestration, Dialogue Director, Memory Extractor, and streaming.

Window D must not modify frontend visual design. Window D must not modify database schema. Window D must not modify formal Agent cards.

### Window E: `packages/evals`

Owns human-tone tests, Agent difference tests, memory recall tests, safety compliance tests, and frontend consistency tests.

Window E must not implement business features. Window E must not modify frontend pages. Window E must not modify the AI pipeline.

## Frontend Visual Rules

The confirmed direction is **A. Quiet Study**: black, white, gray, large whitespace, quiet left navigation, a centered reading-width conversation column, and a light bottom input.

Do not use technology-blue or purple gradients. Do not create a complex dashboard. Do not fill the screen with cards. Do not make it feel like customer support chat, a game, or a backend admin panel.

Any formal frontend development beyond the static prototype must wait for user confirmation of the visual effect.

## Backend Architecture Rules

Backend concerns belong in packages. Keep package boundaries explicit:

- `packages/db`: persistence, repositories, migrations, RLS notes
- `packages/agents`: cognitive model metadata and selection policy
- `packages/ai`: model calls, structured schemas, orchestration, streaming
- `packages/shared`: shared types and constants
- `packages/evals`: tests and evaluation rubrics

## AI Calling Rules

Do not call real AI providers during the static prototype. Future AI calls must be isolated in `packages/ai` and must support cost controls, maximum context limits, maximum output limits, retry behavior, and user-visible failure states.

## Memory System Rules

Memory must be transparent and user-controlled. Users must be able to view, edit, delete, or disable remembered content. Do not store every passing remark as long-term memory. Prefer durable items such as goals, preferences, projects, decision history, blind spots, writing style, and relationships.

## Agent Compliance Rules

All Agents are **基于公开思想抽象出的认知模型，不代表本人观点**. They must never claim to represent a real person. They must not invent quotes or write unsupported phrases such as “芒格曾说”, “乔布斯说过”, or “塔勒布说过” unless a future verifiable citation system is added.

## Testing Rules

Testing must cover human tone, Agent differentiation, memory recall, frontend visual consistency, streaming feedback, API error handling, safety compliance, context contamination, cost limits, and non-fabricated citations.

## Hard Gate

任何前端正式开发必须先等待用户确认视觉效果。
