import { beforeEach, expect, test, vi } from "vitest";

const { quizFindUniqueMock, lessonUpdateMock } = vi.hoisted(() => ({
  quizFindUniqueMock: vi.fn(),
  lessonUpdateMock: vi.fn()
}));

vi.mock("@/lib/db", () => ({
  db: {
    quiz: {
      findUnique: quizFindUniqueMock
    },
    lesson: {
      update: lessonUpdateMock
    }
  }
}));

import { submitQuizAnswer } from "@/lib/domain/progress";

beforeEach(() => {
  quizFindUniqueMock.mockReset();
  lessonUpdateMock.mockReset();
});

test("marks lesson complete when quiz answer is correct", async () => {
  quizFindUniqueMock.mockResolvedValue({
    lessonId: "lesson_1",
    correctAnswer: "A"
  });
  lessonUpdateMock.mockResolvedValue({
    id: "lesson_1",
    status: "completed"
  });

  const result = await submitQuizAnswer({
    lessonId: "lesson_1",
    answer: "A"
  });

  expect(result.status).toBe("correct");
  expect(lessonUpdateMock).toHaveBeenCalledWith({
    where: { id: "lesson_1" },
    data: { status: "completed" }
  });
});

test("does not complete the lesson when the quiz answer is incorrect", async () => {
  quizFindUniqueMock.mockResolvedValue({
    lessonId: "lesson_1",
    correctAnswer: "A"
  });

  const result = await submitQuizAnswer({
    lessonId: "lesson_1",
    answer: "B"
  });

  expect(result.status).toBe("incorrect");
  expect(lessonUpdateMock).not.toHaveBeenCalled();
});
