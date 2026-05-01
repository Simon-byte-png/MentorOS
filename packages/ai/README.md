# @mentoros/ai

MentorOS AI runtime defaults to the mock provider. Real DeepSeek calls are opt-in
and only run when both conditions are true:

```bash
ENABLE_REAL_LLM=true
DEEPSEEK_API_KEY=...
```

Optional model configuration:

```bash
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_DEFAULT_MODEL=deepseek-v4-flash
DEEPSEEK_HIGH_QUALITY_MODEL=deepseek-v4-pro
```

`provider: "deepseek"` falls back to mock unless real LLM calls are enabled and
the API key exists. The current `apps/web` chat route still sends
`provider: "mock"`; switch that route in a later frontend/API integration stage.

DeepSeek JSON mode uses the OpenAI-compatible `response_format` option. Prompts
must explicitly request a valid JSON object, with no markdown or prose.
