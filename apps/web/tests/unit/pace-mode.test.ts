import { generatePlanBlueprint } from "@/lib/ai/plan-generator";
import { derivePaceMode } from "@/lib/domain/replan";

test("maps mbti and weekly budget to a pace mode", () => {
  expect(derivePaceMode({ mbti: "INFP", weeklyTimeBudgetMinutes: 120 })).toBe("slower");
});

test("keeps milestone structure while slowing the first lesson pace", () => {
  const blueprint = generatePlanBlueprint({
    goalPath: "python_for_ai_workflows",
    goalText: "我想学 Python 做 AI 工作流",
    currentLevel: "zero",
    weeklyTimeBudgetMinutes: 120,
    targetDeadline: "2026-05-05",
    mbti: "INFP",
    paceMode: "slower"
  });

  expect(blueprint.milestones).toHaveLength(3);
  expect(blueprint.firstLesson.tasks).toHaveLength(4);
});
