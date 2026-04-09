import type { Plan } from "@prisma/client";
import type { LessonContract, PlanContract, RoadmapMilestone } from "@learn-bot/ai-contracts";
import { generatePlan, generatePythonLesson } from "@learn-bot/ai-orchestrator";

import { db } from "@/lib/db";
import { goalPathToDomainPackId } from "@/lib/ai/goal-paths";

import {
  buildPlanGenerationRequest,
  createWebStructuredModel,
  isSupportedGoalPath,
  parseStoredLessonContract,
  parseStoredPlanContract,
  resolveLessonModel,
  resolvePlanModel,
  stringifyContract
} from "./runtime";

export type CurrentPlanSnapshot = {
  plan: Plan;
  planContract: PlanContract;
  milestones: RoadmapMilestone[];
  currentLessonId: string | null;
  currentLesson: LessonContract | null;
};

async function generateInitialArtifacts(input: Parameters<typeof buildPlanGenerationRequest>[0]) {
  const client = createWebStructuredModel();
  const request = buildPlanGenerationRequest(input);
  const planContract = await generatePlan({
    client,
    input: request,
    model: resolvePlanModel()
  });
  const lessonContract =
    planContract.domainId === "python"
      ? await generatePythonLesson({
          client,
          input: {
            ...request,
            plan: planContract,
            generationMode: "initial",
            lessonHistory: []
          },
          model: resolveLessonModel()
        })
      : null;

  return {
    planContract,
    lessonContract
  };
}

export async function ensureCurrentPlanForUser(userId: string): Promise<CurrentPlanSnapshot | null> {
  const profile = await db.learningProfile.findUnique({
    where: { userId }
  });

  if (!profile || !isSupportedGoalPath(profile.goalPath)) {
    return null;
  }

  const goalPath = profile.goalPath;
  const expectedDomainId = goalPathToDomainPackId(goalPath);

  const existingPlan = await db.plan.findFirst({
    where: {
      userId,
      status: "active"
    },
    include: {
      lessons: {
        where: {
          status: "active"
        },
        orderBy: {
          dayIndex: "asc"
        },
        take: 1
      }
    }
  });

  const existingPlanContract = parseStoredPlanContract(existingPlan?.contractJson);
  const existingLessonRecord = existingPlan?.lessons[0];
  const existingLessonContract = parseStoredLessonContract(existingLessonRecord?.contractJson);
  const existingPlanMatchesGoal = existingPlan?.goalPath === goalPath && existingPlanContract?.domainId === expectedDomainId;
  const existingPlanSupportsLesson = existingPlanContract?.domainId === "python";

  if (
    existingPlan &&
    existingPlanContract &&
    existingPlanMatchesGoal &&
    (!existingPlanSupportsLesson || (existingLessonRecord && existingLessonContract))
  ) {
    return {
      plan: existingPlan,
      planContract: existingPlanContract,
      milestones: existingPlanContract.milestones,
      currentLessonId: existingPlanSupportsLesson ? (existingLessonRecord?.id ?? null) : null,
      currentLesson: existingPlanSupportsLesson ? (existingLessonContract ?? null) : null
    };
  }

  const { planContract, lessonContract } = await generateInitialArtifacts(profile);
  const activeMilestone = planContract.milestones.find((milestone) => milestone.status === "active") ?? planContract.milestones[0];

  if (!activeMilestone) {
    throw new Error("Generated roadmap did not include an active milestone.");
  }

  return db.$transaction(async (tx) => {
    const plan = existingPlan
      ? await tx.plan.update({
          where: { id: existingPlan.id },
          data: {
            goalPath,
            targetStartDate: new Date(),
            targetEndDate: profile.targetDeadline,
            currentMilestoneIndex: activeMilestone.index,
            daysInactiveCount: 0,
            contractJson: stringifyContract(planContract)
          }
        })
      : await tx.plan.create({
          data: {
            userId,
            goalPath,
            status: "active",
            targetStartDate: new Date(),
            targetEndDate: profile.targetDeadline,
            currentMilestoneIndex: activeMilestone.index,
            daysInactiveCount: 0,
            contractJson: stringifyContract(planContract)
          }
        });

    if (existingPlan) {
      await tx.lesson.deleteMany({
        where: { planId: existingPlan.id }
      });
      await tx.milestone.deleteMany({
        where: { planId: existingPlan.id }
      });
    }

    const milestoneRecords = await Promise.all(
      planContract.milestones.map((milestone) =>
        tx.milestone.create({
          data: {
            planId: plan.id,
            index: milestone.index,
            title: milestone.title,
            outcome: milestone.outcome,
            status: milestone.status
          }
        })
      )
    );

    const activeMilestoneRecord =
      milestoneRecords.find((milestone) => milestone.index === activeMilestone.index) ?? milestoneRecords[0];

    if (!activeMilestoneRecord) {
      throw new Error("Persisted roadmap contains no milestone records.");
    }

    const createdLesson = lessonContract
      ? await tx.lesson.create({
          data: {
            planId: plan.id,
            milestoneId: activeMilestoneRecord.id,
            dayIndex: 1,
            title: lessonContract.title,
            whyItMatters: lessonContract.whyItMatters,
            completionCriteria: lessonContract.completionCriteria,
            contractJson: stringifyContract(lessonContract),
            status: "active",
            tasks: {
              create: lessonContract.tasks.map((task, index) => ({
                orderIndex: index + 1,
                title: task.title,
                instructions: task.instructions,
                estimatedMinutes: task.estimatedMinutes,
                status: "pending"
              }))
            },
            quiz: {
              create: {
                kind: lessonContract.quiz.kind,
                question: lessonContract.quiz.question,
                optionsJson: JSON.stringify(lessonContract.quiz.options),
                correctAnswer: lessonContract.quiz.correctAnswer
              }
            }
          }
        })
      : null;

    return {
      plan,
      planContract,
      milestones: planContract.milestones,
      currentLessonId: createdLesson?.id ?? null,
      currentLesson: lessonContract
    };
  });
}
