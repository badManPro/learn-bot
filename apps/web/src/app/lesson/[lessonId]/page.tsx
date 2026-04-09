import { LessonShell } from "@/components/lesson/lesson-shell";
import { db } from "@/lib/db";
import { getLessonPreview, lessonPayloadSchema } from "@/lib/ai/lesson-generator";

const REGENERATION_MESSAGE = "已为你简化任务，并补充前置知识提醒。";

type LessonPageProps = {
  params: Promise<{
    lessonId: string;
  }>;
};

export default async function LessonPage({ params }: LessonPageProps) {
  const { lessonId } = await params;
  const lessonRecord = await db.lesson.findUnique({
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

  if (!lessonRecord || !lessonRecord.quiz) {
    return <LessonShell key={lessonId} lesson={getLessonPreview()} />;
  }

  const lesson = lessonPayloadSchema.parse({
    lessonId: lessonRecord.id,
    title: lessonRecord.title,
    whyThisNow: lessonRecord.whyItMatters,
    whyItMatters: lessonRecord.whyItMatters,
    estimatedTotalMinutes: lessonRecord.tasks.reduce((sum, task) => sum + task.estimatedMinutes, 0),
    completionContract: {
      summary: lessonRecord.completionCriteria,
      passCriteria: ["完成所有必要任务并通过自检"],
      failCriteria: ["仍无法得到可验证的输出"]
    },
    completionCriteria: lessonRecord.completionCriteria,
    materialsNeeded: ["Python 3", "终端"],
    tasks: lessonRecord.tasks.map((task) => ({
      id: `task_${task.orderIndex}`,
      title: task.title,
      type: task.orderIndex === lessonRecord.tasks.length ? "verification" : "coding",
      instructions: task.instructions,
      expectedOutput: "完成当前任务并得到一个可验证的结果。",
      estimatedMinutes: task.estimatedMinutes,
      verificationMethod: task.orderIndex === lessonRecord.tasks.length ? "self_check" : "compare_output",
      skipPolicy: "never_skip"
    })),
    ifBlocked: [
      {
        trigger: "任务超过 10 分钟仍无进展",
        response: "先退回到当前任务的最小可运行版本，再继续。"
      }
    ],
    reflectionPrompt: "完成这节课后，哪一步最容易复用到下一节？",
    nextDefaultAction: {
      label: "继续当前里程碑的下一节",
      rationale: "当前 lesson 已围绕同一里程碑组织，完成后直接继续能减少切换成本。"
    },
    quiz: {
      kind: lessonRecord.quiz.kind,
      question: lessonRecord.quiz.question,
      options: JSON.parse(lessonRecord.quiz.optionsJson) as string[],
      correctAnswer: lessonRecord.quiz.correctAnswer
    }
  });

  return (
    <LessonShell
      key={lessonId}
      lesson={lesson}
      lessonId={lessonId}
      regenerationCount={lessonRecord.regenerationCount}
      regenerationMessage={lessonRecord.regenerationCount > 0 ? REGENERATION_MESSAGE : null}
    />
  );
}
