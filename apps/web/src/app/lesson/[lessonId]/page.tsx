import { LessonShell } from "@/components/lesson/lesson-shell";
import { db } from "@/lib/db";
import { parseStoredLessonContract } from "@/lib/ai/runtime";

const REGENERATION_MESSAGE = "已根据你的反馈重新生成了更合适的 lesson。";

type LessonPageProps = {
  params: Promise<{
    lessonId: string;
  }>;
};

export default async function LessonPage({ params }: LessonPageProps) {
  const { lessonId } = await params;
  const lessonRecord = await db.lesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      contractJson: true,
      regenerationCount: true
    }
  });

  const lesson = parseStoredLessonContract(lessonRecord?.contractJson);

  if (!lessonRecord || !lesson) {
    return (
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-16">
        <div className="max-w-3xl space-y-4">
          <p className="text-sm uppercase tracking-[0.3em] text-stone-500">Today Lesson</p>
          <h1 className="text-4xl font-semibold text-stone-900">当前没有可读取的 lesson。</h1>
          <p className="text-base leading-7 text-stone-600">
            Web 端已经不再使用旧的 deterministic preview。请先从 roadmap 生成真实 plan，或改用 desktop
            runtime 查看最新 lesson。
          </p>
        </div>
      </main>
    );
  }

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
