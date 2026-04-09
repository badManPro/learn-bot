import { beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { lessonFindUniqueMock } = vi.hoisted(() => ({
  lessonFindUniqueMock: vi.fn()
}));

vi.mock("@/lib/db", () => ({
  db: {
    lesson: {
      findUnique: lessonFindUniqueMock
    }
  }
}));

import LessonPage from "@/app/lesson/[lessonId]/page";

beforeEach(() => {
  lessonFindUniqueMock.mockReset();
  lessonFindUniqueMock.mockResolvedValue({
    id: "lesson_1",
    regenerationCount: 0,
    contractJson: JSON.stringify({
      lessonId: "lesson_1",
      title: "Build a tiny workflow helper",
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
    })
  });
});

test("shows completion criteria before lesson content", async () => {
  render(await LessonPage({ params: Promise.resolve({ lessonId: "lesson_1" }) }));

  expect(screen.getByText(/完成标准/i)).toBeInTheDocument();
});
