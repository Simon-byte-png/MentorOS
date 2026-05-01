# MentorOS — Claude Code 项目上下文

## 1. 项目定位

MentorOS 是一个有长期记忆、多 Agent 圆桌、自然语言对话和决策备忘录能力的智识对话系统。用户应该体验到一场有深度的对话，而不是一个仪表盘、聊天模板或生成报告。

AI pipeline 流程：
用户输入 → 读取相关记忆 → 构建上下文 → 自动选择 Agent → 后台圆桌讨论 → Dialogue Director 组织自然对话 → 前端流式展示 → Memory Extractor 提炼新记忆 → 写入或更新记忆 → 可选生成决策备忘录

## 2. 当前技术栈

- **Monorepo**: pnpm workspace + Turborepo
- **Frontend**: Next.js App Router + TypeScript + Tailwind CSS
- **Auth**: Supabase Auth（magic link OTP）
- **Database**: Supabase PostgreSQL + RLS
- **AI runtime**: `packages/ai`（pipeline orchestrator）
- **Model provider**: mock 优先，DeepSeek provider 可选（需 `ENABLE_REAL_LLM=true` + `DEEPSEEK_API_KEY`）
- **Agents**: `packages/agents`（6 个认知模型卡片 + 选择策略）
- **Evals**: `packages/evals`（8 项质量评估）
- **Shared types**: `packages/shared`（已存在但尚未接入依赖图）

## 3. 当前已完成状态

### apps/web
- `/chat` 页面：已接入 `@mentoros/ai` mock pipeline，有 access gate
- `/chat/demo`：纯静态展示，无 auth、无 AI 调用
- `/login`：Supabase OTP magic link 登录
- `/invite`：邀请码兑换 + 用户激活流程
- `/api/chat`：POST handler，调用 `runMentorOSPipeline`，默认 `provider: "mock"`
- `/api/invite/redeem`：SHA-256 哈希校验 + DB 写入
- middleware：保护 `/chat/*`、`/invite`、`/login`，支持 dev bypass

### packages/ai
- `runMentorOSPipeline`：完整 pipeline 编排（context → council → dialogue director → memory extraction → decision memo → evals）
- `DeepSeekProvider`：已实现，需 `ENABLE_REAL_LLM=true` 才会真实调用
- `MockProvider`：默认 provider，返回确定性 mock 文本
- 模型路由、usage 统计、streaming generator、prompts 均已就位

### packages/db
- 2 个 migration（12 张表）：conversations、messages、user_memories、memory_events、council_runs、agent_runs、decision_memos、reviews、user_profiles、invite_codes、invite_redemptions、usage_events、quota_limits
- Repository：invite-codes、user-profiles、usage-events、conversations、messages、memories、decision-memos 已实现
- Repository stubs：agent-runs、council-runs、reviews（TODO Window B）

### packages/agents
- 6 个认知模型卡片：munger、duan、naval、feynman、jobs、taleb
- Runtime adapter：`getRuntimeAgentProfile`、`buildAgentPromptBrief`、`buildCouncilPromptBrief`
- 选择策略：关键词匹配 + 主题预设，最多选 4 个 agent
- 质量检查：disclaimer 验证、虚假引用检测、agent 差异化检查

### packages/evals
- 8 项评估：human-tone、safety、memory-quality、memory-recall、agent-difference、runtime-quality、frontend-consistency、agent-card-quality
- 每项有阈值、rubric、fixture 数据
- `runMockEvals()` 可一键运行全部评估

### J1（已完成）
邮箱登录 + 邀请码最小门禁

### K1（已完成）
DeepSeek 非流式 provider 实现，默认仍为 mock

## 4. 永久边界

以下规则永远不能违反：

- **不要冒充真实人物** — 所有 Agent 是基于公开思想抽象出的认知模型，不代表本人观点
- **不要编造名人原话** — 禁止出现"芒格曾说"、"乔布斯说过"、"塔勒布说过"等无出处引用
- **不要把 service role key 暴露到 client** — `SUPABASE_SERVICE_ROLE_KEY` 只能在 server-side 使用
- **不要在前端写 DeepSeek API key** — API key 只在 server-side 环境变量中
- **不要把 stack trace 返回给用户** — 错误信息必须是用户友好的
- **不要越权修改无关 package** — 遵守文件夹职责边界
- **每次任务必须列出修改文件和验证命令** — 改了什么、怎么验证

## 5. 文件夹职责

| 目录 | 职责 |
|------|------|
| `apps/web` | UI 页面、API routes、auth 页面、chat route、middleware |
| `packages/ai` | AI pipeline、providers、model routing、prompts、streaming |
| `packages/db` | Supabase schema、migrations、repositories、types、RLS |
| `packages/agents` | Agent 卡片、registry、selection policy、runtime adapter |
| `packages/evals` | 质量评估、rubrics、fixtures、thresholds |
| `packages/shared` | 共享类型和常量（尚未接入依赖图） |

## 6. 当前后续路线

- **L1**: `/api/chat` 接真实 provider 选择 + usage gate，但默认安全（mock）
- **L2**: 保存 conversations / messages / decision memo 到 DB
- **L3**: memory candidate 确认后写入 user_memories
- **L4**: DeepSeek 真实非流式打开（`ENABLE_REAL_LLM=true`）
- **L5**: 小规模内测

## 7. 验证命令

```bash
# 全量
pnpm typecheck
pnpm build
pnpm lint

# 单包
pnpm --filter @mentoros/web typecheck
pnpm --filter @mentoros/ai typecheck
pnpm --filter @mentoros/db typecheck
pnpm --filter @mentoros/agents typecheck
pnpm --filter @mentoros/evals typecheck
```

## 8. Claude Code 交互规则

以下规则适用于本项目中所有 Claude Code 会话：

1. **语言**：所有解释、plan、执行总结、错误分析用中文。代码、命令、文件路径、包名、报错原文保留英文。
2. **Plan 格式**：每次 plan 必须用中文写清楚 — 要改什么、为什么要改、会碰哪些文件、怎么验证、有什么风险。
3. **错误处理**：遇到英文报错时，先翻译成中文，再解释怎么修。
4. **修改纪律**：每次任务开始前列出要修改的文件，结束后列出验证命令。
