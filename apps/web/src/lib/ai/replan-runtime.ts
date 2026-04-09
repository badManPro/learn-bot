import type { ReplanReason } from "@prisma/client";
import type { LessonContract, PlanContract, ReplanContract } from "@learn-bot/ai-contracts";
import { generatePythonReplan } from "@learn-bot/ai-orchestrator";

import { db } from "@/lib/db";

import {
  buildPlanGenerationRequest,
  createWebStructuredModel,
  isSupportedGoalPath,
  parseStoredLessonContract,
  parseStoredPlanContract,
  resolveReplanModel
} from "./runtime";

export type WebReplanContext = {
  currentLessonId: string;
  currentLesson: LessonContract;
  lessonHistory: LessonContract[];
  planContract: PlanContract;
  userId: string;
};

export async function loadCurrentReplanContext(userId: string): Promise<WebReplanContext | null> {
  const profile = await db.learningProfile.findUnique({
    where: { userId }
  });

  if (!profile || !isSupportedGoalPath(profile.goalPath)) {
    return null;
  }

  const planRecord = await db.plan.findFirst({
    where: {
      userId,
      status: "active"
    },
    include: {
      lessons: {
        orderBy: {
          dayIndex: "asc"
        },
        select: {
          id: true,
          status: true,
          contractJson: true
        }
      }
    }
  });

  if (!planRecord) {
    return null;
  }

  const planContract = parseStoredPlanContract(planRecord.contractJson);

  if (!planContract) {
    return null;
  }

  const activeLessonRecord = planRecord.lessons.find((lesson) => lesson.status === "active");
  const currentLesson = parseStoredLessonContract(activeLessonRecord?.contractJson);

  if (!activeLessonRecord || !currentLesson) {
    return null;
  }

  const lessonHistory = planRecord.lessons
    .filter((lesson) => lesson.id !== activeLessonRecord.id)
    .map((lesson) => parseStoredLessonContract(lesson.contractJson))
    .filter((lesson): lesson is LessonContract => lesson !== null)
    .slice(-3);

  return {
    currentLessonId: activeLessonRecord.id,
    currentLesson,
    lessonHistory,
    planContract,
    userId
  };
}

export async function generateWebReplanPreview(userId: string, reason: ReplanReason): Promise<{
  context: WebReplanContext;
  replan: ReplanContract;
} | null> {
  const context = await loadCurrentReplanContext(userId);

  if (!context) {
    return null;
  }

  const profile = await db.learningProfile.findUnique({
    where: { userId }
  });

  if (!profile) {
    return null;
  }

  const client = createWebStructuredModel();
  const request = buildPlanGenerationRequest(profile);
  const replan = await generatePythonReplan({
    client,
    input: {
      ...request,
      plan: context.planContract,
      currentLesson: context.currentLesson,
      reason,
      lessonHistory: context.lessonHistory
    },
    model: resolveReplanModel()
  });

  return {
    context,
    replan
  };
}
