import { z } from "zod";

export const ReplacementLessonSchema = z.object({
  title: z.string().min(1),
  focus: z.string().min(1),
  firstStep: z.string().min(1),
  reason: z.string().min(1)
});

export const ReplanSchema = z.object({
  replanReason: z.string().min(1),
  diagnosis: z.string().min(1),
  paceChange: z.string().min(1),
  milestoneAdjustment: z.string().min(1),
  replacementLesson: ReplacementLessonSchema,
  replacementLessonTitle: z.string().min(1),
  userMessage: z.string().min(1)
});

export type ReplacementLesson = z.infer<typeof ReplacementLessonSchema>;
export type ReplanContract = z.infer<typeof ReplanSchema>;
