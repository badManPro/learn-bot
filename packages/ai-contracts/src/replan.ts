import { z } from "zod";

import { TodayLessonSeedSchema } from "./plan";

export const ReplanReasonSchema = z.enum(["too_hard", "pace_too_fast", "wrong_goal", "inactive"]);

export const ReplacementLessonSchema = z.object({
  title: z.string().min(1),
  focus: z.string().min(1),
  firstStep: z.string().min(1),
  reason: z.string().min(1)
});

export const ReplanSchema = z.object({
  replanReason: ReplanReasonSchema,
  diagnosis: z.string().min(1),
  paceChange: z.string().min(1),
  milestoneAdjustment: z.string().min(1),
  replacementLesson: ReplacementLessonSchema,
  replacementLessonSeed: TodayLessonSeedSchema,
  replacementLessonTitle: z.string().min(1),
  userMessage: z.string().min(1)
});

export type ReplanReason = z.infer<typeof ReplanReasonSchema>;
export type ReplacementLesson = z.infer<typeof ReplacementLessonSchema>;
export type ReplanContract = z.infer<typeof ReplanSchema>;
