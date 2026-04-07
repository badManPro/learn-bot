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
    title: lessonRecord.title,
    whyItMatters: lessonRecord.whyItMatters,
    completionCriteria: lessonRecord.completionCriteria,
    tasks: lessonRecord.tasks.map((task) => ({
      title: task.title,
      instructions: task.instructions,
      estimatedMinutes: task.estimatedMinutes
    })),
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
