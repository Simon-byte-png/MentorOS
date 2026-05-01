export const allowedMemoryTypes = [
  "profile",
  "goal",
  "preference",
  "project",
  "decision_history",
  "blind_spot",
  "writing_style",
  "relationship"
] as const;

export const durableMemorySignals = [
  "长期",
  "偏好",
  "目标",
  "项目",
  "判断",
  "风格",
  "关系",
  "blind spot",
  "preference",
  "goal",
  "project"
] as const;

export const overMemoryPatterns = [
  "今天晚上吃了什么",
  "现在有点烦",
  "今天心情",
  "刚才说",
  "temporary",
  "tonight",
  "now feels"
] as const;

export const sensitiveInferencePatterns = [
  "心理问题",
  "敏感身份",
  "政治立场",
  "宗教",
  "性取向",
  "疾病",
  "diagnosis",
  "sensitive identity"
] as const;

export const absoluteMemoryPatterns = [
  "永远会",
  "一定会",
  "从不",
  "总是",
  "always",
  "never"
] as const;

export const memoryQualityRubric = [
  "Long-term useful",
  "Future-answer usable",
  "Allowed memory type",
  "Avoid trivial over-memory",
  "Avoid unconfirmed sensitive inference",
  "Has source or reason",
  "User can edit, delete, or disable",
  "Separates facts from inferences"
] as const;
