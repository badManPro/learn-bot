import type { PlanContract } from "@learn-bot/ai-contracts";
import { buildPlanPrompts, generatePlan, inferGoalDomain, type StructuredTextModel } from "@learn-bot/ai-orchestrator";

const samplePianoPlan: PlanContract = {
  planTitle: "Piano Foundations",
  domainId: "generic",
  tags: ["rhythm"],
  goalSummary: "Build stable piano basics.",
  totalEstimatedWeeks: 2,
  milestones: [
    {
      id: "m2",
      index: 4,
      title: "Play a steady short pattern",
      purpose: "Develop rhythm confidence.",
      outcome: "A simple pattern stays in time.",
      prerequisites: ["m1"],
      successCriteria: ["The learner can count and play together"],
      recommendedWeeks: 2,
      lessonTypes: ["practice"],
      status: "pending"
    },
    {
      id: "m1",
      index: 7,
      title: "Find the note groups",
      purpose: "Recognize keyboard landmarks.",
      outcome: "The learner can locate note groups quickly.",
      prerequisites: [],
      successCriteria: ["The learner can point to groups of two and three black keys"],
      recommendedWeeks: 1,
      lessonTypes: ["setup"],
      status: "completed"
    }
  ],
  currentStrategy: "Keep the work slow and countable.",
  todayLessonSeed: {
    milestoneId: "m2",
    lessonType: "practice",
    objective: "Play a steady five-note pattern"
  },
  warnings: []
};

test("infers piano and drawing goals into supported domains", () => {
  expect(inferGoalDomain("我想学钢琴伴奏")).toBe("piano");
  expect(inferGoalDomain("I want to learn drawing and perspective")).toBe("drawing");
});

test("generic plan prompts use the selected domain pack constraints", () => {
  const prompts = buildPlanPrompts({
    goalText: "I want to learn piano chords",
    currentLevel: "zero",
    weeklyTimeBudgetMinutes: 150,
    targetDeadline: "2026-07-01",
    mbti: "ISFJ",
    preferredDomain: "piano"
  });

  expect(prompts.domainId).toBe("piano");
  expect(prompts.systemPrompt).toContain("Domain pack: Piano");
  expect(prompts.systemPrompt).toContain("Acceptable lesson formats");
  expect(prompts.systemPrompt).toContain("Pedagogy constraints");
  expect(prompts.userPrompt).toContain("Generate a Piano-first roadmap");
});

test("generic plan generation normalizes the output into the selected domain", async () => {
  const fakeClient: StructuredTextModel = {
    parse: async () => samplePianoPlan
  };

  const result = await generatePlan({
    client: fakeClient,
    input: {
      goalText: "我想学钢琴基础",
      currentLevel: "zero",
      weeklyTimeBudgetMinutes: 210,
      targetDeadline: "2026-07-01",
      mbti: null,
      preferredDomain: "piano"
    },
    model: "gpt-5-mini"
  });

  expect(result.domainId).toBe("piano");
  expect(result.tags).toEqual(expect.arrayContaining(["piano", "beginner", "deliberate-practice", "rhythm"]));
  expect(result.milestones[0]?.status).toBe("active");
  expect(result.milestones[0]?.index).toBe(1);
  expect(result.totalEstimatedWeeks).toBeGreaterThanOrEqual(3);
});
