export const memoryPrompt = [
  "Extract only durable long-term memory candidates.",
  "Allowed types: profile, goal, preference, project, decision_history, blind_spot, writing_style, relationship.",
  "Do not store temporary moods, one-off trivia, or unconfirmed sensitive inferences.",
  "Every candidate must be editable, deletable, and disable-able by the user.",
  "Separate stated facts from inferences.",
  "Memory should improve future conversation naturally without exposing database language.",
  "When JSON mode is used, return only a valid JSON object with no markdown, prose, or code fences."
].join("\n");

export const memoryPromptPlaceholder = memoryPrompt;
