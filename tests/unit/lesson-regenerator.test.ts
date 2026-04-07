import { beforeEach, expect, test, vi } from "vitest";

const {
  lessonFindUniqueMock,
  lessonUpdateMock,
  taskDeleteManyMock,
  taskCreateManyMock,
  quizUpdateMock,
  feedbackCreateMock
} = vi.hoisted(() => ({
  lessonFindUniqueMock: vi.fn(),
  lessonUpdateMock: vi.fn(),
  taskDeleteManyMock: vi.fn(),
  taskCreateManyMock: vi.fn(),
  quizUpdateMock: vi.fn(),
  feedbackCreateMock: vi.fn()
}));

vi.mock("@/lib/db", () => ({
  db: {
    lesson: {
      findUnique: lessonFindUniqueMock,
      update: lessonUpdateMock
    },
    atomicTask: {
      deleteMany: taskDeleteManyMock,
      createMany: taskCreateManyMock
    },
    quiz: {
      update: quizUpdateMock
    },
    lessonFeedbackEvent: {
      create: feedbackCreateMock
    }
  }
}));

import { regenerateLesson } from "@/lib/ai/lesson-regenerator";

beforeEach(() => {
  lessonFindUniqueMock.mockReset();
  lessonUpdateMock.mockReset();
  taskDeleteManyMock.mockReset();
  taskCreateManyMock.mockReset();
  quizUpdateMock.mockReset();
  feedbackCreateMock.mockReset();
});

test("keeps milestone goal but simplifies lesson when too hard", async () => {
  lessonFindUniqueMock.mockResolvedValue({
    id: "lesson_1",
    milestoneId: "milestone_1",
    regenerationCount: 0,
    title: "Day 1: 跑通你的第一个 Python for AI 工作流练习",
    whyItMatters: "先把环境和最小可运行脚本跑通。",
    completionCriteria: "你能运行 hello world 和一个假 AI 脚本。",
    tasks: [
      { id: "task_1", orderIndex: 1, title: "确认 Python 环境", instructions: "安装 Python 3 并确认版本。", estimatedMinutes: 10 },
      { id: "task_2", orderIndex: 2, title: "运行 hello world", instructions: "创建 hello.py 并运行它。", estimatedMinutes: 10 },
      { id: "task_3", orderIndex: 3, title: "做一个假 AI CLI", instructions: "创建一个读取输入并返回固定回答的脚本。", estimatedMinutes: 15 }
    ],
    quiz: {
      id: "quiz_1",
      kind: "single_choice",
      question: "今天这一课最重要的结果是什么？",
      correctAnswer: "先把本地 Python 脚本跑通"
    }
  });
  lessonUpdateMock.mockResolvedValue({
    id: "lesson_1",
    milestoneId: "milestone_1",
    regenerationCount: 1,
    generatedFromReason: "too_hard"
  });

  const result = await regenerateLesson({
    lessonId: "lesson_1",
    reason: "too_hard",
    regenerationCount: 0
  });

  expect(result.changeSummary).toMatch(/简化任务|补充前置知识/);
  expect(result.milestoneId).toBe("milestone_1");
  expect(feedbackCreateMock).toHaveBeenCalledWith({
    data: {
      lessonId: "lesson_1",
      reason: "too_hard"
    }
  });
});
