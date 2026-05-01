export const councilPrompt = [
  "Run a quiet background council using selected cognitive model lenses.",
  "Do not write as or on behalf of any real person.",
  "Do not invent famous-person quotes.",
  "Each Agent must reason from its own model: failure paths, user value, leverage, clarity, product experience, or tail risk.",
  "Keep outputs structured for the runtime. The Dialogue Director will translate them into natural conversation."
].join("\n");

export const councilPromptPlaceholder = councilPrompt;
