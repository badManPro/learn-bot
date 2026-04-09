import { z } from "zod";

export const TaskTypeSchema = z.enum([
  "setup",
  "observation",
  "reading",
  "practice",
  "production",
  "coding",
  "verification",
  "reflection"
]);
export const VerificationMethodSchema = z.enum([
  "run_command",
  "self_check",
  "compare_output",
  "answer_quiz",
  "manual_review"
]);
export const SkipPolicySchema = z.enum(["never_skip", "skip_if_already_done", "skip_with_note"]);

export const LessonTaskSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  type: TaskTypeSchema,
  instructions: z.string().min(1),
  expectedOutput: z.string().min(1),
  estimatedMinutes: z.number().int().min(5).max(30),
  verificationMethod: VerificationMethodSchema,
  skipPolicy: SkipPolicySchema
});

export const LessonQuizSchema = z.object({
  kind: z.enum(["single_choice", "true_false"]),
  question: z.string().min(1),
  options: z.array(z.string()).min(2),
  correctAnswer: z.string().min(1)
});

export const CompletionContractSchema = z.object({
  summary: z.string().min(1),
  passCriteria: z.array(z.string().min(1)).min(1),
  failCriteria: z.array(z.string().min(1)).min(1)
});

export const BlockedActionSchema = z.object({
  trigger: z.string().min(1),
  response: z.string().min(1)
});

export const LessonNextActionSchema = z.object({
  label: z.string().min(1),
  rationale: z.string().min(1)
});

export const LessonSchema = z.object({
  lessonId: z.string().min(1),
  title: z.string().min(1),
  whyThisNow: z.string().min(1),
  whyItMatters: z.string().min(1),
  estimatedTotalMinutes: z.number().int().min(10).max(120),
  completionContract: CompletionContractSchema,
  completionCriteria: z.string().min(1),
  materialsNeeded: z.array(z.string().min(1)).default([]),
  tasks: z.array(LessonTaskSchema).min(2).max(6),
  ifBlocked: z.array(BlockedActionSchema).min(1),
  reflectionPrompt: z.string().min(1),
  nextDefaultAction: LessonNextActionSchema,
  quiz: LessonQuizSchema
});

export type TaskType = z.infer<typeof TaskTypeSchema>;
export type VerificationMethod = z.infer<typeof VerificationMethodSchema>;
export type SkipPolicy = z.infer<typeof SkipPolicySchema>;
export type LessonTask = z.infer<typeof LessonTaskSchema>;
export type LessonQuiz = z.infer<typeof LessonQuizSchema>;
export type CompletionContract = z.infer<typeof CompletionContractSchema>;
export type BlockedAction = z.infer<typeof BlockedActionSchema>;
export type LessonNextAction = z.infer<typeof LessonNextActionSchema>;
export type LessonContract = z.infer<typeof LessonSchema>;
