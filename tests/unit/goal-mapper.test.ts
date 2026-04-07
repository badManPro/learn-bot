import { mapGoal } from "@/lib/ai/goal-mapper";

test("maps python and AI goals to the supported path", async () => {
  const result = await mapGoal("我想学 Python 做 AI 工作流");

  expect(result.supportStatus).toBe("supported");
  expect(result.mappedPath).toBe("python_for_ai_workflows");
});

test("rejects non-programming goals", async () => {
  const result = await mapGoal("我想学钢琴");

  expect(result.supportStatus).toBe("unsupported");
});
