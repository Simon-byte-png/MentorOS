# MentorOS Evals

## What This Package Does

`@mentoros/evals` is the quality gate layer for MentorOS. It provides deterministic, pure TypeScript eval functions for human tone, Agent difference, Agent card quality, memory recall, memory quality, safety, frontend consistency, and runtime quality.

Each eval returns a shared `EvalScore` shape with a 0-100 score, pass/fail state, structured issues, and a short summary. The issue IDs are intentionally stable so a later test runner can assert exact failure modes.

## What This Package Does Not Do

This package does not call OpenAI, run real model generations, connect to Supabase, modify Agent cards, change the frontend, or implement MentorOS business logic. It only evaluates mock output, fixtures, traces, and design notes.

## Why No Vitest Yet

This stage intentionally does not install Vitest, does not modify root dependencies, and does not touch `pnpm-lock.yaml`. Window E is limited to `packages/evals/**`, so the current implementation stays dependency-free and uses pure TypeScript functions that can be checked by `tsc`.

## How To Use Pure Eval Functions

```ts
import {
  evaluateHumanTone,
  evaluateAgentDifference,
  runMockEvals,
  runAgentCardEval
} from "@mentoros/evals";

const tone = evaluateHumanTone("你的第一版问题不是野心太大，而是验证点太多。你本周能拿出几个小时？");
const fullRun = runMockEvals();
const agentCardRun = await runAgentCardEval();
```

`evaluateAgentCardQuality(snapshot)` checks C-window Agent card snapshots without importing `packages/agents`. The current package runs this eval against `src/fixtures/sample-agent-card-snapshot.json`; a future caller can pass real C-window output directly.

`runMockEvals()` is the fixture-only path. It uses local JSON fixtures and never attempts to import another package.

`runAgentCardEval()` is the optional real snapshot path. At runtime it tries to dynamically import `@mentoros/agents`, call `getAgentQualitySnapshot()`, print `getAgentQualityReport()` when available, and evaluate the real snapshot. If the import or API lookup is unavailable, it prints `real agent snapshot import unavailable` and falls back to `sample-agent-card-snapshot.json`.

This runner does not add a hard dependency on `packages/agents`; it uses a runtime string dynamic import. Direct CLI execution depends on the local environment having a dependency-free TypeScript execution path. Until Phase 2 adds a proper script or Vitest harness, the supported contract is the exported `runAgentCardEval()` function.

## Phase 2

Phase 2: after dependency policy is approved, install Vitest and convert pure eval functions into test runner cases.

The intended migration is to keep the current scoring functions unchanged, then wrap them with `describe` / `it` cases that assert `passed`, `score`, and specific `issues[].id` values.

## Eval Categories

- Human tone: detects natural language, real tension, judgment, follow-up questions, user context, template cadence, and oily encouragement.
- Agent difference: checks that Munger, Duan, Naval, Feynman, Jobs, and Taleb-style cognitive models produce distinct reasoning.
- Agent card quality: checks C-window Agent cards for complete six-Agent coverage, required disclaimers, source metadata, voice calibration distinctiveness, council roles, failure handling, example safety, and concept/question homogeneity.
- Memory recall: rewards natural recall and penalizes database-flavored recall or invented user facts.
- Memory quality: checks durable usefulness, allowed type, user control, source/reason, and fact-vs-inference separation.
- Safety: blocks impersonation, fabricated quotes, unsupported user facts, fake sources, and certainty overreach.
- Frontend consistency: checks A. Quiet Study against design notes, class strings, or copy summaries.
- Runtime quality: checks default Agent count, model call count, streaming/thinking state, retry path, token budget, and safe errors.

## Current Limitations

These evals are deterministic heuristics, not semantic model judges. They are intentionally strict about known forbidden phrases and known quality signals, but they will miss subtle failures that require human review or a future model-based evaluator.

This stage does not install Vitest, does not modify root dependency configuration, and does not call real models.

The Agent card quality eval can run from a local fixture or from a real C-window `getAgentQualitySnapshot()` result. The optional runner keeps that integration at runtime so this package remains dependency-free.
