import { LessonSchema as lessonPayloadSchema } from "@learn-bot/ai-contracts";

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

test("lesson payload accepts non-coding task types for multi-domain lessons", () => {
  const result = lessonPayloadSchema.safeParse({
    lessonId: "lesson_piano_1",
    title: "Slow pulse drill",
    whyThisNow: "The learner needs one stable rhythmic loop first.",
    whyItMatters: "Pulse control supports later coordination.",
    estimatedTotalMinutes: 20,
    completionContract: {
      summary: "Play one short drill with a metronome.",
      passCriteria: ["The learner stays with the click"],
      failCriteria: ["The learner repeatedly loses the pulse"]
    },
    completionCriteria: "Play one short drill with a metronome.",
    materialsNeeded: ["Keyboard or piano"],
    tasks: [
      {
        id: "task_1",
        title: "Set tempo",
        type: "setup",
        instructions: "Set a slow metronome tempo.",
        expectedOutput: "A ready metronome.",
        estimatedMinutes: 5,
        verificationMethod: "self_check",
        skipPolicy: "never_skip"
      },
      {
        id: "task_2",
        title: "Play the drill",
        type: "practice",
        instructions: "Play the pattern for eight bars.",
        expectedOutput: "One slow clean run.",
        estimatedMinutes: 10,
        verificationMethod: "manual_review",
        skipPolicy: "never_skip"
      }
    ],
    ifBlocked: [
      {
        trigger: "tempo drifts",
        response: "Lower the tempo and count aloud first."
      }
    ],
    reflectionPrompt: "Which beat felt least stable?",
    nextDefaultAction: {
      label: "Repeat once more",
      rationale: "Keep the same skill target."
    },
    quiz: {
      kind: "single_choice",
      question: "What should you change first if the pulse drifts?",
      options: ["Lower the tempo", "Add more notes"],
      correctAnswer: "Lower the tempo"
    }
  });

  expect(result.success).toBe(true);
});
