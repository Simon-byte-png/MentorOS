# @mentoros/ai

MentorOS AI runtime defaults to the mock provider. Real DeepSeek calls are opt-in
and only run when both conditions are true:

```bash
ENABLE_REAL_LLM=true
DEEPSEEK_API_KEY=<your-deepseek-api-key>
```

Optional model configuration:

```bash
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_DEFAULT_MODEL=deepseek-v4-flash
DEEPSEEK_HIGH_QUALITY_MODEL=deepseek-v4-pro
```

The web chat route uses `MENTOROS_CHAT_PROVIDER=auto` by default: it selects
DeepSeek when real LLM calls are enabled and an API key exists, otherwise it
uses the mock provider. Setting `MENTOROS_CHAT_PROVIDER=deepseek` requires the
DeepSeek config to be complete and returns a visible configuration error if it
is not.

DeepSeek JSON mode uses the OpenAI-compatible `response_format` option. Prompts
must explicitly request a valid JSON object, with no markdown or prose.
