import type { ReplanReason } from "@prisma/client";
import { PlanSchema, type LessonContract as LessonPayload } from "@learn-bot/ai-contracts";
import { generatePythonLesson, generatePythonReplan } from "@learn-bot/ai-orchestrator";

import { db } from "@/lib/db";

import {
  buildPlanGenerationRequest,
  createWebStructuredModel,
  parseStoredLessonContract,
  parseStoredPlanContract,
  resolveLessonModel,
  resolveReplanModel,
  stringifyContract
} from "./runtime";

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

export async function regenerateLesson({
  lessonId,
  reason
}: RegenerateLessonInput): Promise<RegenerateLessonResult | null> {
  const lessonRecord = await db.lesson.findUnique({
    where: { id: lessonId },
    include: {
      plan: true
    }
  });

  if (!lessonRecord) {
    return null;
  }

  const currentLesson = parseStoredLessonContract(lessonRecord.contractJson);
  const currentPlan = parseStoredPlanContract(lessonRecord.plan.contractJson);

  if (!currentLesson || !currentPlan) {
    return null;
  }

  const profile = await db.learningProfile.findUnique({
    where: { userId: lessonRecord.plan.userId }
  });

  if (!profile) {
    return null;
  }

  const historyRecords = await db.lesson.findMany({
    where: {
      planId: lessonRecord.planId,
      NOT: {
        id: lessonId
      }
    },
    orderBy: {
      dayIndex: "asc"
    },
    select: {
      contractJson: true
    }
  });

  const lessonHistory = historyRecords
    .map((record) => parseStoredLessonContract(record.contractJson))
    .filter((record): record is LessonPayload => record !== null)
    .slice(-3);

  const client = createWebStructuredModel();
  const request = buildPlanGenerationRequest(profile);
  const replan = await generatePythonReplan({
    client,
    input: {
      ...request,
      plan: currentPlan,
      currentLesson,
      reason,
      lessonHistory
    },
    model: resolveReplanModel()
  });

  const nextPlan = PlanSchema.parse({
    ...currentPlan,
    todayLessonSeed: replan.replacementLessonSeed
  });

  const replacementLesson = await generatePythonLesson({
    client,
    input: {
      ...request,
      plan: nextPlan,
      generationMode: "replacement",
      lessonSeed: replan.replacementLessonSeed,
      lessonHistory: [...lessonHistory, currentLesson].slice(-3)
    },
    model: resolveLessonModel()
  });

  const nextRegenerationCount = lessonRecord.regenerationCount + 1;

  await db.$transaction(async (tx) => {
    await tx.lessonFeedbackEvent.create({
      data: {
        lessonId,
        reason
      }
    });

    await tx.plan.update({
      where: { id: lessonRecord.planId },
      data: {
        contractJson: stringifyContract(nextPlan),
        currentMilestoneIndex:
          nextPlan.milestones.find((milestone) => milestone.status === "active")?.index ?? lessonRecord.plan.currentMilestoneIndex
      }
    });

    await tx.lesson.update({
      where: { id: lessonId },
      data: {
        title: replacementLesson.title,
        whyItMatters: replacementLesson.whyItMatters,
        completionCriteria: replacementLesson.completionCriteria,
        contractJson: stringifyContract(replacementLesson),
        regenerationCount: nextRegenerationCount,
        generatedFromReason: reason,
        status: "active"
      }
    });

    await tx.atomicTask.deleteMany({
      where: { lessonId }
    });

    await tx.atomicTask.createMany({
      data: replacementLesson.tasks.map((task, index) => ({
        lessonId,
        orderIndex: index + 1,
        title: task.title,
        instructions: task.instructions,
        estimatedMinutes: task.estimatedMinutes,
        status: "pending"
      }))
    });

    await tx.quiz.upsert({
      where: { lessonId },
      update: {
        kind: replacementLesson.quiz.kind,
        question: replacementLesson.quiz.question,
        optionsJson: JSON.stringify(replacementLesson.quiz.options),
        correctAnswer: replacementLesson.quiz.correctAnswer
      },
      create: {
        lessonId,
        kind: replacementLesson.quiz.kind,
        question: replacementLesson.quiz.question,
        optionsJson: JSON.stringify(replacementLesson.quiz.options),
        correctAnswer: replacementLesson.quiz.correctAnswer
      }
    });
  });

  return {
    lessonId,
    milestoneId: lessonRecord.milestoneId,
    regenerationCount: nextRegenerationCount,
    changeSummary: replan.userMessage,
    lesson: replacementLesson
  };
}
