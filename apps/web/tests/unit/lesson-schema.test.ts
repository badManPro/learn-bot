import { lessonPayloadSchema } from "@/lib/ai/lesson-generator";

test("lesson payload has 2 to 4 tasks and one quiz", () => {
  const result = lessonPayloadSchema.safeParse({
    lessonId: "lesson_1",
    title: "Day 1",
    whyThisNow: "Because the learner needs a runnable baseline first.",
    whyItMatters: "Python is the base for later AI workflows.",
    estimatedTotalMinutes: 25,
    completionContract: {
      summary: "Run hello world",
      passCriteria: ["hello world runs"],
      failCriteria: ["Python does not run"]
    },
    completionCriteria: "Run hello world",
    materialsNeeded: ["Python 3"],
    tasks: [
      {
        id: "task_1",
        title: "Task A",
        type: "setup",
        instructions: "Do A",
        expectedOutput: "A result",
        estimatedMinutes: 10,
        verificationMethod: "run_command",
        skipPolicy: "never_skip"
      },
      {
        id: "task_2",
        title: "Task B",
        type: "coding",
        instructions: "Do B",
        expectedOutput: "B result",
        estimatedMinutes: 15,
        verificationMethod: "compare_output",
        skipPolicy: "never_skip"
      }
    ],
    ifBlocked: [
      {
        trigger: "stuck",
        response: "shrink the task"
      }
    ],
    reflectionPrompt: "What was hardest?",
    nextDefaultAction: {
      label: "Continue",
      rationale: "Keep momentum"
    },
    quiz: {
      kind: "single_choice",
      question: "Q",
      options: ["A", "B"],
      correctAnswer: "A"
    }
  });

  expect(result.success).toBe(true);
});
