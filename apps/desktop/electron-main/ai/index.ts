import { LessonSchema, PlanSchema, type LessonContract, type PlanContract } from "@learn-bot/ai-contracts";
import { domainPacks } from "@learn-bot/domain-packs";

const pythonPack = domainPacks.python;

export async function generateMockPlan(): Promise<PlanContract> {
  return PlanSchema.parse({
    planTitle: "Python for AI Workflows",
    domainId: pythonPack.domain.id,
    tags: pythonPack.domain.defaultTags,
    goalSummary: "Build confidence with Python syntax, CLI habits, and small automation scripts.",
    milestones: [
      {
        index: 1,
        title: "Read and run Python confidently",
        outcome: "Understand the Python REPL, scripts, and basic control flow.",
        status: "completed"
      },
      {
        index: 2,
        title: "Automate terminal tasks",
        outcome: "Turn repetitive shell work into small Python utilities.",
        status: "active"
      },
      {
        index: 3,
        title: "Ship one reusable workflow",
        outcome: "Package an automation script with inputs, outputs, and guardrails.",
        status: "pending"
      }
    ],
    currentStrategy: "Phase 1 uses typed mocks so the desktop shell can validate real contracts before live model calls land.",
    todayLessonSeed: "automation-foundations",
    warnings: ["Mock plan only. Real model orchestration starts in Phase 2."]
  });
}

export async function generateMockLesson(): Promise<LessonContract> {
  return LessonSchema.parse({
    title: "Automate a small terminal workflow",
    whyItMatters: "The fastest way to trust Python is to use it on a repetitive task you already do.",
    completionCriteria: "You can run a script that reads input, transforms it, and prints a useful result.",
    tasks: [
      {
        title: "Inspect the input shape",
        instructions: "Pick a repeated CLI task and write down the exact input, output, and success condition.",
        estimatedMinutes: 10
      },
      {
        title: "Write a minimal script",
        instructions: "Use variables, conditionals, and a loop only where they remove repetition from the manual workflow.",
        estimatedMinutes: 15
      },
      {
        title: "Run and refine",
        instructions: "Execute the script twice with different inputs and adjust names or output text until the result is easy to trust.",
        estimatedMinutes: 10
      }
    ],
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
