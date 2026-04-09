import { z } from "zod";

export const ReplanSchema = z.object({
  replanReason: z.string().min(1),
  diagnosis: z.string().min(1),
  paceChange: z.string().min(1),
  milestoneAdjustment: z.string().min(1),
  replacementLessonTitle: z.string().min(1),
  userMessage: z.string().min(1)
});

export type ReplanContract = z.infer<typeof ReplanSchema>;
