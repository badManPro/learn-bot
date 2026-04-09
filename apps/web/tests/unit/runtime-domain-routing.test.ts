import { buildPlanGenerationRequest, goalPathToDomainPackId, isSupportedGoalPath } from "@/lib/ai/runtime";

test("runtime goal-path helpers recognize all supported roadmap domains", () => {
  expect(isSupportedGoalPath("python_for_ai_workflows")).toBe(true);
  expect(isSupportedGoalPath("piano_foundations")).toBe(true);
  expect(isSupportedGoalPath("drawing_foundations")).toBe(true);
  expect(isSupportedGoalPath(null)).toBe(false);
  expect(goalPathToDomainPackId("drawing_foundations")).toBe("drawing");
});

test("plan generation request carries the preferred domain from the stored goal path", () => {
  const request = buildPlanGenerationRequest({
    goalText: "我想学素描",
    currentLevel: "zero",
    weeklyTimeBudgetMinutes: 120,
    targetDeadline: new Date("2026-07-01T00:00:00.000Z"),
    mbti: null,
    goalPath: "drawing_foundations"
  });

  expect(request.preferredDomain).toBe("drawing");
  expect(request.targetDeadline).toBe("2026-07-01");
});
