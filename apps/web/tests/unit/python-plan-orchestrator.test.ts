import type { PlanContract } from "@learn-bot/ai-contracts";
import { buildPythonPlanPrompts, generatePythonPlan, type StructuredTextModel } from "@learn-bot/ai-orchestrator";

const samplePlan: PlanContract = {
  planTitle: "Python Automation Roadmap",
  domainId: "generic",
  tags: ["automation"],
  goalSummary: "Build Python automation habits for AI-adjacent workflows.",
  totalEstimatedWeeks: 2,
  milestones: [
    {
      id: "m2",
      index: 3,
      title: "Automate a first workflow",
      purpose: "Turn a repeated terminal action into a script.",
      outcome: "A working CLI helper exists.",
      prerequisites: ["m1"],
      successCriteria: ["The script accepts input", "The script produces stable output"],
      recommendedWeeks: 2,
      lessonTypes: ["project"],
      status: "pending"
    },
    {
      id: "m1",
      index: 9,
      title: "Bootstrap the environment",
      purpose: "Get Python running locally.",
      outcome: "Python scripts can run from the terminal.",
      prerequisites: [],
      successCriteria: ["python3 --version works"],
      recommendedWeeks: 1,
      lessonTypes: ["setup"],
      status: "completed"
    }
  ],
  currentStrategy: "Start from practical terminal automation.",
  todayLessonSeed: {
    milestoneId: "m2",
    lessonType: "project",
    objective: "Build the first script"
  },
  warnings: []
};

test("python plan prompts include domain constraints and learner state", () => {
  const prompts = buildPythonPlanPrompts({
    goalText: "I want to learn Python for AI workflows",
    currentLevel: "zero",
    weeklyTimeBudgetMinutes: 180,
    targetDeadline: "2026-06-30",
    mbti: "INTJ"
  });

  expect(prompts.systemPrompt).toContain("Domain pack: Python");
  expect(prompts.systemPrompt).toContain("Skill graph");
  expect(prompts.userPrompt).toContain("Derived pace signal: lighter");
  expect(prompts.userPrompt).toContain("Target deadline: 2026-06-30");
});

test("python plan generation normalizes the model output into a python roadmap", async () => {
  const fakeClient: StructuredTextModel = {
    parse: async () => samplePlan
  };

  const result = await generatePythonPlan({
    client: fakeClient,
    input: {
      goalText: "I want to automate AI workflows with Python",
      currentLevel: "zero",
      weeklyTimeBudgetMinutes: 240,
      targetDeadline: "2026-06-30",
      mbti: null
    },
    model: "gpt-5-mini"
  });

  expect(result.domainId).toBe("python");
  expect(result.tags).toEqual(expect.arrayContaining(["python", "beginner", "project-based", "automation"]));
  expect(result.milestones[0]?.status).toBe("active");
  expect(result.milestones[0]?.index).toBe(1);
  expect(result.milestones[1]?.status).toBe("pending");
  expect(result.totalEstimatedWeeks).toBeGreaterThanOrEqual(3);
});
