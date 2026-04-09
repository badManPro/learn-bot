import { beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { getOrCreateGuestUserIdMock, generateWebReplanPreviewMock } = vi.hoisted(() => ({
  getOrCreateGuestUserIdMock: vi.fn(),
  generateWebReplanPreviewMock: vi.fn()
}));

vi.mock("@/lib/session", () => ({
  getOrCreateGuestUserId: getOrCreateGuestUserIdMock
}));

vi.mock("@/lib/ai/replan-runtime", () => ({
  generateWebReplanPreview: generateWebReplanPreviewMock
}));

import ReplanPage from "@/app/replan/page";

beforeEach(() => {
  getOrCreateGuestUserIdMock.mockReset();
  generateWebReplanPreviewMock.mockReset();

  getOrCreateGuestUserIdMock.mockResolvedValue("guest_user");
  generateWebReplanPreviewMock.mockResolvedValue({
    context: {
      currentLessonId: "lesson_1",
      currentLesson: {
        title: "Build a tiny workflow helper",
        whyThisNow: "This lesson asks for too much implementation in one sitting."
      }
    },
    replan: {
      diagnosis: "The learner needs a smaller bridge lesson before continuing.",
      paceChange: "Reduce pressure for the next lesson.",
      milestoneAdjustment: "Keep the same milestone and insert a smaller review step.",
      replacementLessonTitle: "Stabilize one input-output script",
      replacementLesson: {
        reason: "A narrower lesson restores momentum.",
        focus: "Run one tiny script end to end.",
        firstStep: "Write down the exact input and expected output."
      },
      replacementLessonSeed: {
        lessonType: "review",
        objective: "Run one tiny script end to end"
      },
      userMessage: "Keep the goal, but shrink the next lesson so you can finish it."
    }
  });
});

test("renders a real replan preview instead of deterministic mode cards", async () => {
  render(await ReplanPage({ searchParams: Promise.resolve({ reason: "inactive" }) }));

  expect(screen.getByText(/真实 AI replan preview/i)).toBeInTheDocument();
  expect(screen.getByText(/stabilize one input-output script/i)).toBeInTheDocument();
  expect(screen.getByText(/应用这个 replan 并替换当前 lesson/i)).toBeInTheDocument();
});
