import { LessonSchema, type LessonContract, type PlanContract } from "@learn-bot/ai-contracts";
import { createOpenAIStructuredModel, generatePythonPlan, type PlanGenerationRequest } from "@learn-bot/ai-orchestrator";

function resolvePlanModel() {
  return process.env.LEARN_BOT_PLAN_MODEL ?? "gpt-5-mini";
}

function requireOpenAIApiKey() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set. The desktop plan generation path is wired, but it cannot run without an API key.");
  }

  return apiKey;
}

export async function generateDesktopPlan(input: PlanGenerationRequest): Promise<PlanContract> {
  const client = createOpenAIStructuredModel(requireOpenAIApiKey());

  return generatePythonPlan({
    client,
    input,
    model: resolvePlanModel()
  });
}

export async function generateMockLesson(): Promise<LessonContract> {
  return LessonSchema.parse({
    lessonId: "desktop-lesson-preview",
    title: "Automate a small terminal workflow",
    whyThisNow: "A tiny automation loop is the fastest proof that Python can save you effort this week.",
    whyItMatters: "The fastest way to trust Python is to use it on a repetitive task you already do.",
    estimatedTotalMinutes: 35,
    completionContract: {
      summary: "You can run a script that reads input, transforms it, and prints a useful result.",
      passCriteria: ["The script accepts input", "The output is readable and repeatable"],
      failCriteria: ["The script never runs", "The output is still ambiguous or manual-only"]
    },
    completionCriteria: "You can run a script that reads input, transforms it, and prints a useful result.",
    materialsNeeded: ["Python 3", "Terminal", "A repetitive task you already perform manually"],
    tasks: [
      {
        id: "task_1",
        title: "Inspect the input shape",
        type: "reading",
        instructions: "Pick a repeated CLI task and write down the exact input, output, and success condition.",
        expectedOutput: "A short note describing the task input, output, and success condition.",
        estimatedMinutes: 10,
        verificationMethod: "self_check",
        skipPolicy: "never_skip"
      },
      {
        id: "task_2",
        title: "Write a minimal script",
        type: "coding",
        instructions: "Use variables, conditionals, and a loop only where they remove repetition from the manual workflow.",
        expectedOutput: "A Python script that replaces one repeated manual step.",
        estimatedMinutes: 15,
        verificationMethod: "compare_output",
        skipPolicy: "never_skip"
      },
      {
        id: "task_3",
        title: "Run and refine",
        type: "verification",
        instructions: "Execute the script twice with different inputs and adjust names or output text until the result is easy to trust.",
        expectedOutput: "Two successful runs with readable output.",
        estimatedMinutes: 10,
        verificationMethod: "run_command",
        skipPolicy: "never_skip"
      }
    ],
    ifBlocked: [
      {
        trigger: "You still do not know what to automate",
        response: "Choose the smallest repeated terminal step and automate only that slice today."
      }
    ],
    reflectionPrompt: "Which part of the workflow felt most reusable after writing the script?",
    nextDefaultAction: {
      label: "Generate the next automation lesson",
      rationale: "Keep building on the same environment and reduce setup switching."
    },
    quiz: {
      kind: "single_choice",
      question: "What is the most useful first check before turning a manual workflow into a Python script?",
      options: [
        "Clarify the exact input, output, and success condition",
        "Pick a framework before writing any code",
        "Add classes so the script is easier to extend later"
      ],
      correctAnswer: "Clarify the exact input, output, and success condition"
    }
  });
}
