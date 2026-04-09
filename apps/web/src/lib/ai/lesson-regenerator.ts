import type { ReplanReason } from "@prisma/client";
import { LessonSchema, type LessonContract as LessonPayload } from "@learn-bot/ai-contracts";

import { db } from "@/lib/db";

type RegenerateLessonInput = {
  lessonId: string;
  reason: ReplanReason;
  regenerationCount: number;
};

export type RegenerateLessonResult = {
  lessonId: string;
  milestoneId: string;
  regenerationCount: number;
  changeSummary: string;
  lesson: LessonPayload;
};

function buildSimplifiedTasks(tasks: LessonPayload["tasks"]) {
  return tasks.slice(0, 2).map((task, index) => ({
    title: index === 0 ? `简化版：${task.title}` : task.title,
    instructions:
      index === 0
        ? `先只做最小版本。${task.instructions} 如果卡住，只要求自己完成最基础的可运行结果。`
        : `把范围缩小到最关键的一步。${task.instructions}`,
    estimatedMinutes: 10 as const
  }));
}

function parseQuizOptions(optionsJson: string | undefined, correctAnswer: string) {
  if (!optionsJson) {
    return [correctAnswer, "立刻开始复杂重构"];
  }

  const parsed = JSON.parse(optionsJson) as string[];

  return parsed.length >= 2 ? parsed : [correctAnswer, "立刻开始复杂重构"];
}

function buildRegeneratedLessonPayload(currentLesson: {
  title: string;
  whyItMatters: string;
  completionCriteria: string;
  tasks: Array<{
    title: string;
    instructions: string;
    estimatedMinutes: number;
  }>;
  quiz: {
    question: string;
    optionsJson?: string;
    correctAnswer: string;
  };
}) {
  return LessonSchema.parse({
    title: `${currentLesson.title}（已简化）`,
    whyItMatters: `${currentLesson.whyItMatters} 这次先把门槛降下来，只保留最必要的起步动作。`,
    completionCriteria: `先完成一个更小的闭环：${currentLesson.completionCriteria}`,
    tasks: buildSimplifiedTasks(currentLesson.tasks),
    quiz: {
      kind: "single_choice",
      question: currentLesson.quiz.question,
      options: parseQuizOptions(currentLesson.quiz.optionsJson, currentLesson.quiz.correctAnswer),
      correctAnswer: currentLesson.quiz.correctAnswer
    }
  });
}

export async function regenerateLesson({
  lessonId,
  reason,
  regenerationCount
}: RegenerateLessonInput): Promise<RegenerateLessonResult | null> {
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: {
      tasks: {
        orderBy: {
          orderIndex: "asc"
        }
      },
      quiz: true
    }
  });

  if (!lesson || !lesson.quiz) {
    return null;
  }

  const regeneratedLesson = buildRegeneratedLessonPayload({
    title: lesson.title,
    whyItMatters: lesson.whyItMatters,
    completionCriteria: lesson.completionCriteria,
    tasks: lesson.tasks.map((task) => ({
      title: task.title,
      instructions: task.instructions,
      estimatedMinutes: task.estimatedMinutes
    })),
    quiz: {
      question: lesson.quiz.question,
      optionsJson: lesson.quiz.optionsJson,
      correctAnswer: lesson.quiz.correctAnswer
    }
  });

  await db.lessonFeedbackEvent.create({
    data: {
      lessonId,
      reason
    }
  });

  await db.lesson.update({
    where: { id: lessonId },
    data: {
      title: regeneratedLesson.title,
      whyItMatters: regeneratedLesson.whyItMatters,
      completionCriteria: regeneratedLesson.completionCriteria,
      regenerationCount: regenerationCount + 1,
      generatedFromReason: reason,
      status: "active"
    }
  });

  await db.atomicTask.deleteMany({
    where: { lessonId }
  });

  await db.atomicTask.createMany({
    data: regeneratedLesson.tasks.map((task, index) => ({
      lessonId,
      orderIndex: index + 1,
      title: task.title,
      instructions: task.instructions,
      estimatedMinutes: task.estimatedMinutes,
      status: "pending"
    }))
  });

  await db.quiz.update({
    where: { lessonId },
    data: {
      question: regeneratedLesson.quiz.question,
      optionsJson: JSON.stringify(regeneratedLesson.quiz.options),
      correctAnswer: regeneratedLesson.quiz.correctAnswer
    }
  });

  return {
    lessonId,
    milestoneId: lesson.milestoneId,
    regenerationCount: regenerationCount + 1,
    changeSummary: "已为你简化任务，并补充前置知识提醒。",
    lesson: regeneratedLesson
  };
}
