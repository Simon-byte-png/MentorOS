# Testing Plan

## Core Tests

1. 人味测试: Responses should feel like natural conversation, not a report template.
2. Agent 区分度测试: Agents must not collapse into the same generic voice.
3. 记忆召回测试: Relevant memory should be recalled when useful.
4. 前端视觉一致性测试: The UI must remain A. Quiet Study: black-white-gray, spacious, quiet, reading-oriented.
5. 流式输出测试: Streaming should progressively reveal content without layout jumps.
6. API 错误处理测试: Model and backend failures need clear user-facing states.
7. 安全合规测试: The system must not impersonate real people or invent unsupported facts.
8. 不编造引用测试: The system must not fabricate famous-person quotes.

## Added Tests

1. 过度记忆测试
   - Goal: The system must not write every short-term casual detail into long-term memory.
   - Passing standard: Only durable goals, preferences, projects, decision patterns, blind spots, and similar information are written.

2. 记忆编辑删除测试
   - Goal: Users can view, edit, delete, or disable memory.
   - Passing standard: The Memory Page clearly expresses user control.

3. 上下文污染测试
   - Goal: The system must not mix facts from other users or other conversations into the current user context.
   - Passing standard: Answers only use current user-provided information and current user memory.

4. 低质量 Agent 测试
   - Goal: The six Agents must not all say similar things.
   - Passing standard: Munger focuses on failure, opportunity cost, and incentives; Duan on user value, 本分, and long-term right action; Naval on leverage, freedom, and compounding; Feynman on concept clarification and minimal experiments; Jobs on experience, taste, and tradeoff; Taleb on tail risk, antifragility, and asymmetry.

5. 延迟测试
   - Goal: Users should see feedback quickly after sending a message.
   - Passing standard: Show a thinking state first, then stream content progressively.

6. 中断恢复测试
   - Goal: Users can retry after generation failure or network interruption.
   - Passing standard: The frontend has a clear error message and retry entry.

7. 成本测试
   - Goal: One council session must not call models without limit.
   - Passing standard: Default Agent count, maximum context, and maximum output length are limited.

8. 不编造引用测试
   - Goal: Do not fabricate famous-person quotes.
   - Forbidden unless a future verifiable citation system exists: “芒格曾说”, “乔布斯说过”, “塔勒布说过”.
