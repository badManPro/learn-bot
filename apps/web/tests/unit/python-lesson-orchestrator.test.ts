import type { LessonContract, PlanContract } from "@learn-bot/ai-contracts";
import { buildPythonLessonPrompts, generatePythonLesson, type StructuredTextModel } from "@learn-bot/ai-orchestrator";

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
      lessonTypes: ["project"],
      status: "active"
    },
    {
      id: "m3",
      index: 2,
      title: "Add reusable data handling",
      purpose: "Normalize repeated input transformations.",
      outcome: "Data cleanup and reuse patterns feel predictable.",
      prerequisites: ["m2"],
      successCriteria: ["The learner can inspect and transform simple input data"],
      recommendedWeeks: 1,
      lessonTypes: ["practice"],
      status: "pending"
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
  lessonId: "raw-output-id",
  title: "Build a tiny workflow helper",
  whyThisNow: "This is the smallest lesson that moves the milestone forward.",
  whyItMatters: "A working script proves the environment and workflow loop are usable.",
  estimatedTotalMinutes: 20,
  completionContract: {
    summary: "A learner can run a script that transforms one repeated terminal step.",
    passCriteria: ["The script accepts input", "The output is readable"],
    failCriteria: ["The script does not run", "The output stays manual-only"]
  },
  completionCriteria: "A learner can run a script that transforms one repeated terminal step.",
  materialsNeeded: ["VS Code"],
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
    },
    {
      id: "task_3",
      title: "Verify two runs",
      type: "verification",
      instructions: "Run the script twice with different inputs and compare the outputs.",
      expectedOutput: "Two successful runs.",
      estimatedMinutes: 10,
      verificationMethod: "compare_output",
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

test("python lesson prompts include milestone, overlay, and learner-state constraints", () => {
  const prompts = buildPythonLessonPrompts({
    goalText: "I want to learn Python for automation",
    currentLevel: "zero",
    weeklyTimeBudgetMinutes: 180,
    targetDeadline: "2026-06-30",
    mbti: "INTJ",
    plan: samplePlan
  });

  expect(prompts.systemPrompt).toContain("Milestone: Automate a first workflow");
  expect(prompts.systemPrompt).toContain("Automation overlay lesson bias");
  expect(prompts.userPrompt).toContain("Derived pace signal: lighter");
  expect(prompts.userPrompt).toContain("Today's lesson seed objective: Build the first script");
});

test("python lesson generation normalizes lesson ids, materials, and total minutes", async () => {
  const fakeClient: StructuredTextModel = {
    parse: async () => sampleLesson
  };

  const result = await generatePythonLesson({
    client: fakeClient,
    input: {
      goalText: "I want to automate AI workflows with Python",
      currentLevel: "zero",
      weeklyTimeBudgetMinutes: 240,
      targetDeadline: "2026-06-30",
      mbti: null,
      plan: samplePlan
    },
    model: "gpt-5-mini"
  });

  expect(result.lessonId).toBe("python-m2-project");
  expect(result.estimatedTotalMinutes).toBe(35);
  expect(result.materialsNeeded).toEqual(expect.arrayContaining(["Python 3", "Terminal", "VS Code"]));
});
