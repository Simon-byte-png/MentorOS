import type { MentorOSPipelineResult } from "./structured-schemas";

export type DialogueStreamEvent =
  | {
      type: "status";
      content: string;
    }
  | {
      type: "opening" | "message" | "summary" | "next_question";
      content: string;
      speaker?: string;
    };

export async function* createDialogueStream(
  result: MentorOSPipelineResult
): AsyncGenerator<DialogueStreamEvent> {
  yield { type: "status", content: "正在读取相关记忆……" };
  yield { type: "status", content: "正在召集认知模型……" };
  yield { type: "status", content: "Dialogue Director 正在组织讨论……" };
  yield { type: "opening", content: result.dialogue.opening };

  for (const message of result.dialogue.messages) {
    yield {
      type: "message",
      speaker: message.speaker,
      content: message.content
    };
  }

  yield { type: "summary", content: result.dialogue.summary };
  yield { type: "next_question", content: result.dialogue.nextQuestion };
}
