import type { LessonContract, PlanContract, ReplanContract } from "@learn-bot/ai-contracts";
import { buildPythonReplanPrompts, generatePythonReplan, type StructuredTextModel } from "@learn-bot/ai-orchestrator";

const samplePlan: PlanContract = {
  planTitle: "Python Automation Roadmap",
  domainId: "python",
  tags: ["automation", "beginner"],
  goalSummary: "Build Python automation habits for AI-adjacent workflows.",
  totalEstimatedWeeks: 3,
  milestones: [
    {
      id: "m2",
      index: 1,
      title: "Automate a first workflow",
      purpose: "Turn a repeated terminal action into a script.",
      outcome: "A working CLI helper exists.",
      prerequisites: [],
      successCriteria: ["The script accepts input", "The script produces stable output"],
      recommendedWeeks: 2,
      lessonTypes: ["project", "review"],
      status: "active"
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

const sampleLesson: LessonContract = {
  lessonId: "python-m2-project",
  title: "Build a tiny workflow helper",
  whyThisNow: "This is the smallest lesson that moves the milestone forward.",
  whyItMatters: "A working script proves the environment and workflow loop are usable.",
  estimatedTotalMinutes: 35,
  completionContract: {
    summary: "A learner can run a script that transforms one repeated terminal step.",
    passCriteria: ["The script accepts input", "The output is readable"],
    failCriteria: ["The script does not run", "The output stays manual-only"]
  },
  completionCriteria: "A learner can run a script that transforms one repeated terminal step.",
  materialsNeeded: ["Python 3", "Terminal"],
  tasks: [
    {
      id: "task_1",
      title: "Define the workflow input and output",
      type: "reading",
      instructions: "Write down one repeated terminal step and the desired output.",
      expectedOutput: "A note listing input and output.",
      estimatedMinutes: 10,
      verificationMethod: "self_check",
      skipPolicy: "never_skip"
    },
    {
      id: "task_2",
      title: "Write the script",
      type: "coding",
      instructions: "Create a script that accepts input and prints a normalized result.",
      expectedOutput: "A runnable script.",
      estimatedMinutes: 15,
      verificationMethod: "run_command",
      skipPolicy: "never_skip"
    }
  ],
  ifBlocked: [
    {
      trigger: "The script does not run",
      response: "Reduce the task to a single input and a single print statement first."
    }
  ],
  reflectionPrompt: "Which input-output step felt most reusable?",
  nextDefaultAction: {
    label: "Generate the next automation lesson",
    rationale: "Stay in the same environment and keep the friction low."
  },
  quiz: {
    kind: "single_choice",
    question: "What should you verify before extending the script?",
    options: ["That two basic runs behave predictably", "That the file has classes", "That a framework is installed"],
    correctAnswer: "That two basic runs behave predictably"
  }
};

const sampleReplan: ReplanContract = {
  replanReason: "pace_too_fast",
  diagnosis: "The learner can still progress, but the current lesson asks for too much implementation in one sitting.",
  paceChange: "Reduce pressure this week and move to a narrower execution target.",
  milestoneAdjustment: "Keep the same active milestone but insert a smaller bridge lesson first.",
  replacementLesson: {
    title: "Stabilize one input-output script",
    focus: "Run one tiny script end to end with only one input path.",
    firstStep: "Write down the exact input and expected output before touching code.",
    reason: "A narrower lesson restores momentum without abandoning the milestone."
  },
  replacementLessonSeed: {
    milestoneId: "wrong-id",
    lessonType: "project",
    objective: "Run one tiny script end to end"
  },
  replacementLessonTitle: "Placeholder",
  userMessage: "Keep the goal, but shrink the next lesson so you can finish it in one focused block."
};

test("python replan prompts include current lesson state and learner context", () => {
  const prompts = buildPythonReplanPrompts({
    goalText: "I want to learn Python for automation",
    currentLevel: "zero",
    weeklyTimeBudgetMinutes: 180,
    targetDeadline: "2026-06-30",
    mbti: "INTJ",
    plan: samplePlan,
    currentLesson: sampleLesson,
    reason: "too_hard",
    lessonHistory: [sampleLesson]
  });

  expect(prompts.systemPrompt).toContain("Current lesson title");
  expect(prompts.systemPrompt).toContain("Reason guidance");
  expect(prompts.userPrompt).toContain("Replan reason: too_hard");
  expect(prompts.userPrompt).toContain(sampleLesson.title);
});

test("python replan generation normalizes replacement lesson title and seed", async () => {
  const fakeClient: StructuredTextModel = {
    parse: async () => sampleReplan
  };

  const result = await generatePythonReplan({
    client: fakeClient,
    input: {
      goalText: "I want to automate AI workflows with Python",
      currentLevel: "zero",
      weeklyTimeBudgetMinutes: 150,
      targetDeadline: "2026-06-30",
      mbti: null,
      plan: samplePlan,
      currentLesson: sampleLesson,
      reason: "too_hard",
      lessonHistory: [sampleLesson]
    },
    model: "gpt-5-mini"
  });

  expect(result.replanReason).toBe("too_hard");
  expect(result.replacementLessonTitle).toBe("Stabilize one input-output script");
  expect(result.replacementLessonSeed.milestoneId).toBe("m2");
  expect(result.replacementLessonSeed.lessonType).toBe("review");
});
