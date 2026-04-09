import type { CurrentLevel, PaceMode, Plan, GoalPath } from "@prisma/client";
import type { LessonContract as LessonPayload, RoadmapMilestone } from "@learn-bot/ai-contracts";

import { db } from "@/lib/db";
import { generateFirstLessonPayload } from "@/lib/ai/lesson-generator";
import { derivePaceMode } from "@/lib/domain/replan";

export type PlanGenerationInput = {
  goalPath: GoalPath;
  goalText: string;
  currentLevel: CurrentLevel;
  weeklyTimeBudgetMinutes: number;
  targetDeadline: string;
  mbti?: string | null;
  paceMode: PaceMode;
};

export type PlanGenerationOutput = {
  milestones: RoadmapMilestone[];
  firstLesson: LessonPayload;
};

type CurrentPlanSnapshot = {
  plan: Plan;
  milestones: RoadmapMilestone[];
  currentLessonId: string | null;
};

function enrichMilestones(milestones: Array<{ index: number; title: string; outcome: string; status: RoadmapMilestone["status"] }>) {
  const defaultsByIndex = new Map(buildMilestones().map((milestone) => [milestone.index, milestone]));

  return milestones.map((milestone) => {
    const fallback = defaultsByIndex.get(milestone.index);

    return {
      id: fallback?.id ?? `milestone-${milestone.index}`,
      index: milestone.index,
      title: milestone.title,
      purpose: fallback?.purpose ?? milestone.outcome,
      outcome: milestone.outcome,
      prerequisites: fallback?.prerequisites ?? [],
      successCriteria: fallback?.successCriteria ?? [milestone.outcome],
      recommendedWeeks: fallback?.recommendedWeeks ?? 1,
      lessonTypes: fallback?.lessonTypes ?? ["practice"],
      status: milestone.status
    } satisfies RoadmapMilestone;
  });
}

function buildMilestones(): RoadmapMilestone[] {
  return [
    {
      id: "environment-bootstrap",
      index: 1,
      title: "打通 Python 起步环境",
      purpose: "建立一个稳定、可重复执行的 Python 练习环境，避免后续学习被环境问题打断。",
      outcome: "能在本地稳定运行 Python 脚本和简单命令行交互。",
      prerequisites: [],
      successCriteria: ["终端能输出 Python 版本", "可以独立运行一个最小脚本"],
      recommendedWeeks: 1,
      lessonTypes: ["setup", "practice"],
      status: "active"
    },
    {
      id: "first-working-tool",
      index: 2,
      title: "完成第一个假 AI 命令行助手",
      purpose: "把输入、处理、输出串成一个闭环，建立对脚本工作流的直觉。",
      outcome: "做出一个可输入问题并返回固定答案的 CLI 小工具。",
      prerequisites: ["environment-bootstrap"],
      successCriteria: ["脚本能读取用户输入", "脚本能输出稳定结果"],
      recommendedWeeks: 1,
      lessonTypes: ["practice", "project"],
      status: "pending"
    },
    {
      id: "workflow-variants",
      index: 3,
      title: "做出两个可修改变体",
      purpose: "开始抽象和复用，把一个练习扩展成多个可修改场景。",
      outcome: "把 CLI 小工具改成两个不同场景的变体，形成 30 天内的阶段成果。",
      prerequisites: ["first-working-tool"],
      successCriteria: ["至少完成两个变体", "每个变体都能独立运行"],
      recommendedWeeks: 2,
      lessonTypes: ["project", "review"],
      status: "pending"
    }
  ];
}

export function generatePlanBlueprint(input: PlanGenerationInput): PlanGenerationOutput {
  const effectivePaceMode =
    input.paceMode === "default"
      ? derivePaceMode({
          mbti: input.mbti,
          weeklyTimeBudgetMinutes: input.weeklyTimeBudgetMinutes
        })
      : input.paceMode;

  return {
    milestones: buildMilestones(),
    firstLesson: generateFirstLessonPayload({
      currentLevel: input.currentLevel,
      goalText: input.goalText,
      paceMode: effectivePaceMode
    })
  };
}

export function getRoadmapPreview(): PlanGenerationOutput {
  return generatePlanBlueprint({
    goalPath: "python_for_ai_workflows",
    goalText: "我想学 Python 做 AI 工作流",
    currentLevel: "zero",
    weeklyTimeBudgetMinutes: 240,
    targetDeadline: "2026-05-05",
    mbti: null,
    paceMode: "default"
  });
}

export async function ensureCurrentPlanForUser(userId: string): Promise<CurrentPlanSnapshot | null> {
  const profile = await db.learningProfile.findUnique({
    where: { userId }
  });

  const goalPath = profile?.goalPath;

  if (!profile || !goalPath) {
    return null;
  }

  return db.$transaction(async (tx) => {
    const existingPlan = await tx.plan.findFirst({
      where: {
        userId,
        status: "active"
      },
      include: {
        milestones: {
          orderBy: { index: "asc" }
        },
        lessons: {
          where: {
            status: "active"
          },
          orderBy: { dayIndex: "asc" },
          take: 1
        }
      }
    });

    if (existingPlan) {
      return {
        plan: existingPlan,
        milestones: enrichMilestones(existingPlan.milestones),
        currentLessonId: existingPlan.lessons[0]?.id ?? null
      };
    }

    const blueprint = generatePlanBlueprint({
      goalPath,
      goalText: profile.goalText,
      currentLevel: profile.currentLevel,
      weeklyTimeBudgetMinutes: profile.weeklyTimeBudgetMinutes,
      targetDeadline: profile.targetDeadline.toISOString().slice(0, 10),
      mbti: profile.mbti,
      paceMode: profile.paceMode
    });

    const plan = await tx.plan.create({
      data: {
        userId,
        goalPath,
        status: "active",
        targetStartDate: new Date(),
        targetEndDate: profile.targetDeadline,
        currentMilestoneIndex: 1,
        daysInactiveCount: 0
      }
    });

    const milestones = await Promise.all(
      blueprint.milestones.map((milestone) =>
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

    const firstMilestone = milestones[0];
    const lesson = blueprint.firstLesson;

    const createdLesson = await tx.lesson.create({
      data: {
        planId: plan.id,
        milestoneId: firstMilestone.id,
        dayIndex: 1,
        title: lesson.title,
        whyItMatters: lesson.whyItMatters,
        completionCriteria: lesson.completionCriteria,
        status: "active",
        tasks: {
          create: lesson.tasks.map((task, index) => ({
            orderIndex: index + 1,
            title: task.title,
            instructions: task.instructions,
            estimatedMinutes: task.estimatedMinutes,
            status: "pending"
          }))
        },
        quiz: {
          create: {
            kind: lesson.quiz.kind,
            question: lesson.quiz.question,
            optionsJson: JSON.stringify(lesson.quiz.options),
            correctAnswer: lesson.quiz.correctAnswer
          }
        }
      }
    });

    return {
      plan,
      milestones: enrichMilestones(milestones),
      currentLessonId: createdLesson.id
    };
  });
}
