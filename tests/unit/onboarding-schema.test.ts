import { onboardingSchema } from "@/lib/validations/onboarding";

test("requires goal, current level, weekly time, and deadline", () => {
  const result = onboardingSchema.safeParse({});

  expect(result.success).toBe(false);
});
