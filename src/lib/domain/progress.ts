import { db } from "@/lib/db";
import { ROUTES } from "@/lib/routes";

export function getNextVisibleTaskIndex(taskCompletionState: boolean[]): number | null {
  const nextPendingIndex = taskCompletionState.findIndex((isCompleted) => !isCompleted);

  return nextPendingIndex === -1 ? null : nextPendingIndex;
}

type SubmitQuizAnswerInput = {
  lessonId: string;
  answer: string;
};

type SubmitQuizAnswerResult = {
  status: "correct" | "incorrect" | "missing_quiz";
  redirectTo: string | null;
};

export async function submitQuizAnswer({
  lessonId,
  answer
}: SubmitQuizAnswerInput): Promise<SubmitQuizAnswerResult> {
  const quiz = await db.quiz.findUnique({
    where: { lessonId },
    select: {
      correctAnswer: true,
      lessonId: true
    }
  });

  if (!quiz) {
    return {
      status: "missing_quiz",
      redirectTo: null
    };
  }

  if (quiz.correctAnswer !== answer) {
    return {
      status: "incorrect",
      redirectTo: null
    };
  }

  await db.lesson.update({
    where: { id: quiz.lessonId },
    data: { status: "completed" }
  });

  return {
    status: "correct",
    redirectTo: ROUTES.lessonComplete(lessonId)
  };
}

export type LessonCompletionSummary = {
  lessonTitle: string;
  completedTaskTitles: string[];
  currentMilestoneTitle: string;
  completedLessonCount: number;
  totalLessonCount: number;
};

export async function getLessonCompletionSummary(lessonId: string): Promise<LessonCompletionSummary | null> {
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: {
      tasks: {
        orderBy: {
          orderIndex: "asc"
        }
      },
      milestone: {
        include: {
          lessons: {
            orderBy: {
              dayIndex: "asc"
            },
            select: {
              id: true,
              status: true
            }
          }
        }
      }
    }
  });

  if (!lesson) {
    return null;
  }

  const completedLessonCount = lesson.milestone.lessons.filter(
    (milestoneLesson) => milestoneLesson.status === "completed"
  ).length;

  return {
    lessonTitle: lesson.title,
    completedTaskTitles: lesson.tasks
      .filter((task) => task.status === "completed")
      .map((task) => task.title),
    currentMilestoneTitle: lesson.milestone.title,
    completedLessonCount,
    totalLessonCount: lesson.milestone.lessons.length
  };
}
