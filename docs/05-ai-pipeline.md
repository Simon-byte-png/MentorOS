# AI Pipeline

The intended AI pipeline is:

用户输入
→ 读取相关记忆
→ 构建上下文
→ 自动选择 Agent
→ 后台圆桌讨论
→ Dialogue Director 组织自然对话
→ 前端流式展示
→ Memory Extractor 提炼新记忆
→ 写入或更新记忆
→ 可选生成决策备忘录

## Current Prototype

The current frontend prototype does not execute this pipeline. It uses static mock data to demonstrate the desired frontstage experience.

## Future Guardrails

- Limit default Agent count.
- Limit maximum context.
- Limit maximum output length.
- Show a thinking state quickly.
- Stream output progressively.
- Provide retry on model or network failure.
- Never fabricate facts the user did not provide.
