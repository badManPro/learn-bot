import { buildPlanGenerationRequest } from "@/lib/ai/runtime";
import { derivePaceMode } from "@/lib/domain/replan";

test("maps mbti and weekly budget to a pace mode", () => {
  expect(derivePaceMode({ mbti: "INFP", weeklyTimeBudgetMinutes: 120 })).toBe("slower");
});

test("builds a structured plan request from the persisted learner profile", () => {
  const request = buildPlanGenerationRequest({
    goalText: "我想学 Python 做 AI 工作流",
    currentLevel: "zero",
    weeklyTimeBudgetMinutes: 120,
    targetDeadline: new Date("2026-05-05T00:00:00.000Z"),
    mbti: "INFP"
  });

  expect(request.targetDeadline).toBe("2026-05-05");
  expect(request.goalText).toContain("Python");
});
