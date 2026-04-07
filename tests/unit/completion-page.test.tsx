import { render, screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

const { getLessonCompletionSummaryMock } = vi.hoisted(() => ({
  getLessonCompletionSummaryMock: vi.fn()
}));

vi.mock("@/lib/domain/progress", () => ({
  getLessonCompletionSummary: getLessonCompletionSummaryMock
}));

import LessonCompletePage from "@/app/lesson/[lessonId]/complete/page";

beforeEach(() => {
  getLessonCompletionSummaryMock.mockReset();
});

test("shows completed work and milestone progress", async () => {
  getLessonCompletionSummaryMock.mockResolvedValue({
    lessonTitle: "Day 1: 跑通你的第一个 Python for AI 工作流练习",
    completedTaskTitles: ["确认 Python 环境", "运行 hello world"],
    currentMilestoneTitle: "里程碑 1: 环境与基础脚本",
    completedLessonCount: 1,
    totalLessonCount: 3
  });

  render(await LessonCompletePage({ params: Promise.resolve({ lessonId: "lesson_1" }) }));

  expect(screen.getByText(/当前阶段进度/i)).toBeInTheDocument();
  expect(screen.getByText(/确认 Python 环境/i)).toBeInTheDocument();
  expect(screen.getByText(/1 \/ 3/i)).toBeInTheDocument();
});
