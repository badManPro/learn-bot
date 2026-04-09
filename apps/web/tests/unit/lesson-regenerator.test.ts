import { beforeEach, expect, test, vi } from "vitest";

const {
  lessonFindUniqueMock,
  lessonFindManyMock,
  profileFindUniqueMock,
  transactionMock,
  planUpdateMock,
  lessonUpdateMock,
  taskDeleteManyMock,
  taskCreateManyMock,
  quizUpsertMock,
  feedbackCreateMock,
  createWebStructuredModelMock,
  buildPlanGenerationRequestMock,
  parseStoredLessonContractMock,
  parseStoredPlanContractMock,
  generatePythonReplanMock,
  generatePythonLessonMock
} = vi.hoisted(() => ({
  lessonFindUniqueMock: vi.fn(),
  lessonFindManyMock: vi.fn(),
  profileFindUniqueMock: vi.fn(),
  transactionMock: vi.fn(),
  planUpdateMock: vi.fn(),
  lessonUpdateMock: vi.fn(),
  taskDeleteManyMock: vi.fn(),
  taskCreateManyMock: vi.fn(),
  quizUpsertMock: vi.fn(),
  feedbackCreateMock: vi.fn(),
  createWebStructuredModelMock: vi.fn(),
  buildPlanGenerationRequestMock: vi.fn(),
  parseStoredLessonContractMock: vi.fn(),
  parseStoredPlanContractMock: vi.fn(),
  generatePythonReplanMock: vi.fn(),
  generatePythonLessonMock: vi.fn()
}));

vi.mock("@/lib/db", () => ({
  db: {
    lesson: {
      findUnique: lessonFindUniqueMock,
      findMany: lessonFindManyMock,
      update: lessonUpdateMock
    },
    learningProfile: {
      findUnique: profileFindUniqueMock
    },
    atomicTask: {
      deleteMany: taskDeleteManyMock,
      createMany: taskCreateManyMock
    },
    quiz: {
      upsert: quizUpsertMock
    },
    lessonFeedbackEvent: {
      create: feedbackCreateMock
    },
    plan: {
      update: planUpdateMock
    },
    $transaction: transactionMock
  }
}));

vi.mock("@/lib/ai/runtime", () => ({
  createWebStructuredModel: createWebStructuredModelMock,
  buildPlanGenerationRequest: buildPlanGenerationRequestMock,
  parseStoredLessonContract: parseStoredLessonContractMock,
  parseStoredPlanContract: parseStoredPlanContractMock,
  resolveLessonModel: () => "gpt-5-mini",
  resolveReplanModel: () => "gpt-5-mini",
  stringifyContract: (value: unknown) => JSON.stringify(value)
}));

vi.mock("@learn-bot/ai-orchestrator", () => ({
  generatePythonReplan: generatePythonReplanMock,
  generatePythonLesson: generatePythonLessonMock
}));

import { regenerateLesson } from "@/lib/ai/lesson-regenerator";

const currentLesson = {
  lessonId: "lesson_1",
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

const currentPlan = {
  planTitle: "Python Automation Roadmap",
  domainId: "python",
  tags: ["automation", "beginner"],
  goalSummary: "Build Python automation habits for AI-adjacent workflows.",
  totalEstimatedWeeks: 3,
  milestones: [
    {
      id: "m1",
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
    milestoneId: "m1",
    lessonType: "project",
    objective: "Build the first script"
  },
  warnings: []
};

const replacementLesson = {
  ...currentLesson,
  lessonId: "python-m1-review-replacement-2",
  title: "Stabilize one input-output script",
  whyThisNow: "Shrink the work so the learner can finish one useful step today.",
  completionCriteria: "Run one tiny script from input to output.",
  nextDefaultAction: {
    label: "Extend the same script by one small variation",
    rationale: "Stay on the same milestone and reuse the same environment."
  }
};

beforeEach(() => {
  lessonFindUniqueMock.mockReset();
  lessonFindManyMock.mockReset();
  profileFindUniqueMock.mockReset();
  transactionMock.mockReset();
  planUpdateMock.mockReset();
  lessonUpdateMock.mockReset();
  taskDeleteManyMock.mockReset();
  taskCreateManyMock.mockReset();
  quizUpsertMock.mockReset();
  feedbackCreateMock.mockReset();
  createWebStructuredModelMock.mockReset();
  buildPlanGenerationRequestMock.mockReset();
  parseStoredLessonContractMock.mockReset();
  parseStoredPlanContractMock.mockReset();
  generatePythonReplanMock.mockReset();
  generatePythonLessonMock.mockReset();

  transactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
    callback({
      lessonFeedbackEvent: { create: feedbackCreateMock },
      plan: { update: planUpdateMock },
      lesson: { update: lessonUpdateMock },
      atomicTask: { deleteMany: taskDeleteManyMock, createMany: taskCreateManyMock },
      quiz: { upsert: quizUpsertMock }
    })
  );

  createWebStructuredModelMock.mockReturnValue({ kind: "fake-client" });
  buildPlanGenerationRequestMock.mockReturnValue({
    goalText: "我想学 Python 做 AI 工作流",
    currentLevel: "zero",
    weeklyTimeBudgetMinutes: 180,
    targetDeadline: "2026-05-05",
    mbti: "INFP"
  });

  lessonFindUniqueMock.mockResolvedValue({
    id: "lesson_1",
    planId: "plan_1",
    milestoneId: "db_milestone_1",
    regenerationCount: 0,
    contractJson: JSON.stringify(currentLesson),
    plan: {
      id: "plan_1",
      userId: "user_1",
      currentMilestoneIndex: 1,
      contractJson: JSON.stringify(currentPlan)
    }
  });
  lessonFindManyMock.mockResolvedValue([]);
  profileFindUniqueMock.mockResolvedValue({
    userId: "user_1",
    goalText: "我想学 Python 做 AI 工作流",
    currentLevel: "zero",
    weeklyTimeBudgetMinutes: 180,
    targetDeadline: new Date("2026-05-05T00:00:00.000Z"),
    mbti: "INFP"
  });
  parseStoredLessonContractMock.mockImplementation((json: string) => JSON.parse(json));
  parseStoredPlanContractMock.mockImplementation((json: string) => JSON.parse(json));
  generatePythonReplanMock.mockResolvedValue({
    replanReason: "too_hard",
    diagnosis: "The current lesson asks for too much implementation in one sitting.",
    paceChange: "Reduce pressure for the next lesson.",
    milestoneAdjustment: "Keep the same milestone, but insert a smaller review step first.",
    replacementLesson: {
      title: "Stabilize one input-output script",
      focus: "Run one tiny script end to end.",
      firstStep: "Write down the exact input and expected output.",
      reason: "The learner needs a smaller slice to regain momentum."
    },
    replacementLessonSeed: {
      milestoneId: "m1",
      lessonType: "review",
      objective: "Run one tiny script end to end"
    },
    replacementLessonTitle: "Stabilize one input-output script",
    userMessage: "Keep the same goal, but shrink the next lesson to one small runnable script."
  });
  generatePythonLessonMock.mockResolvedValue(replacementLesson);
});

test("replaces the lesson through real replan and replacement generation", async () => {
  const result = await regenerateLesson({
    lessonId: "lesson_1",
    reason: "too_hard",
    regenerationCount: 0
  });

  expect(result).not.toBeNull();
  expect(result?.changeSummary).toMatch(/shrink the next lesson/i);
  expect(result?.lesson.title).toBe("Stabilize one input-output script");
  expect(generatePythonReplanMock).toHaveBeenCalled();
  expect(generatePythonLessonMock).toHaveBeenCalled();
  expect(feedbackCreateMock).toHaveBeenCalledWith({
    data: {
      lessonId: "lesson_1",
      reason: "too_hard"
    }
  });
  expect(planUpdateMock).toHaveBeenCalled();
  expect(lessonUpdateMock).toHaveBeenCalled();
  expect(quizUpsertMock).toHaveBeenCalled();
});
