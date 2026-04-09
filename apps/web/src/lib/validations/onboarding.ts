import { z } from "zod";

export const onboardingSchema = z.object({
  goalText: z.string().min(3),
  currentLevel: z.enum(["zero", "some_programming"]),
  weeklyTimeBudgetMinutes: z.coerce.number().min(30),
  targetDeadline: z.string().min(1),
  mbti: z.string().optional().nullable()
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
