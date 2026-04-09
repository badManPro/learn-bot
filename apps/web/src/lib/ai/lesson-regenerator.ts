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
    id: task.id,
    title: index === 0 ? `简化版：${task.title}` : task.title,
    type: task.type,
    instructions:
      index === 0
        ? `先只做最小版本。${task.instructions} 如果卡住，只要求自己完成最基础的可运行结果。`
        : `把范围缩小到最关键的一步。${task.instructions}`,
    expectedOutput: task.expectedOutput,
    estimatedMinutes: 10 as const,
    verificationMethod: task.verificationMethod,
    skipPolicy: task.skipPolicy
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
  lessonId: string;
  title: string;
  whyItMatters: string;
  completionCriteria: string;
  completionContract: LessonPayload["completionContract"];
  materialsNeeded: string[];
  ifBlocked: LessonPayload["ifBlocked"];
  reflectionPrompt: string;
  nextDefaultAction: LessonPayload["nextDefaultAction"];
  tasks: Array<{
    id: string;
    title: string;
    type: LessonPayload["tasks"][number]["type"];
    instructions: string;
    expectedOutput: string;
    estimatedMinutes: number;
    verificationMethod: LessonPayload["tasks"][number]["verificationMethod"];
    skipPolicy: LessonPayload["tasks"][number]["skipPolicy"];
  }>;
  quiz: {
    question: string;
    optionsJson?: string;
    correctAnswer: string;
  };
}) {
  const simplifiedTasks = buildSimplifiedTasks(currentLesson.tasks);

  return LessonSchema.parse({
    lessonId: currentLesson.lessonId,
    title: `${currentLesson.title}（已简化）`,
    whyThisNow: `${currentLesson.whyItMatters} 这次先把门槛降下来，只保留最必要的起步动作。`,
    whyItMatters: `${currentLesson.whyItMatters} 这次先把门槛降下来，只保留最必要的起步动作。`,
    estimatedTotalMinutes: simplifiedTasks.reduce((sum, task) => sum + task.estimatedMinutes, 0),
    completionContract: {
      summary: `先完成一个更小的闭环：${currentLesson.completionCriteria}`,
      passCriteria: currentLesson.completionContract.passCriteria,
      failCriteria: currentLesson.completionContract.failCriteria
    },
    completionCriteria: `先完成一个更小的闭环：${currentLesson.completionCriteria}`,
    materialsNeeded: currentLesson.materialsNeeded,
    tasks: simplifiedTasks,
    ifBlocked: currentLesson.ifBlocked,
    reflectionPrompt: currentLesson.reflectionPrompt,
    nextDefaultAction: currentLesson.nextDefaultAction,
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
    lessonId: lesson.id,
    title: lesson.title,
    whyItMatters: lesson.whyItMatters,
    completionCriteria: lesson.completionCriteria,
    completionContract: {
      summary: lesson.completionCriteria,
      passCriteria: ["完成一个更小但仍可运行的闭环"],
      failCriteria: ["仍然无法独立跑通脚本或验证结果"]
    },
    materialsNeeded: ["Python 3", "终端"],
    ifBlocked: [
      {
        trigger: "依然不知道从哪里开始",
        response: "只保留第一个任务，先做出一个最小可运行结果再回来。"
      }
    ],
    reflectionPrompt: "这次简化后，最容易开始的第一步是什么？",
    nextDefaultAction: {
      label: "先完成第一个最小任务",
      rationale: "先恢复执行感，再决定是否继续扩展。"
    },
    tasks: lesson.tasks.map((task) => ({
      id: `task_${task.orderIndex}`,
      title: task.title,
      type: task.orderIndex === lesson.tasks.length ? "verification" : "coding",
      instructions: task.instructions,
      expectedOutput: "完成当前任务并得到一个可检查的结果。",
      estimatedMinutes: task.estimatedMinutes,
      verificationMethod: task.orderIndex === lesson.tasks.length ? "self_check" : "compare_output",
      skipPolicy: "never_skip"
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
