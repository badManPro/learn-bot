import { notFound } from "next/navigation";

import { getLessonCompletionSummary } from "@/lib/domain/progress";

type LessonCompletePageProps = {
  params: Promise<{
    lessonId: string;
  }>;
};

export default async function LessonCompletePage({ params }: LessonCompletePageProps) {
  const { lessonId } = await params;
  const summary = await getLessonCompletionSummary(lessonId);

  if (!summary) {
    notFound();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col px-6 py-16">
      <div className="max-w-3xl space-y-4">
        <p className="text-sm uppercase tracking-[0.3em] text-stone-500">Lesson Complete</p>
        <h1 className="text-4xl font-semibold text-stone-900">已完成今天的学习</h1>
        <p className="text-base text-stone-600">{summary.lessonTitle}</p>
      </div>

      <section className="mt-10 rounded-[1.75rem] border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-stone-900">你今天完成了什么</h2>
        <ul className="mt-4 space-y-3 text-sm text-stone-600">
          {summary.completedTaskTitles.map((taskTitle) => (
            <li className="rounded-2xl border border-stone-200 px-4 py-3" key={taskTitle}>
              {taskTitle}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8 rounded-[1.75rem] border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-stone-900">当前阶段进度</h2>
        <p className="mt-3 text-base text-stone-700">{summary.currentMilestoneTitle}</p>
        <p className="mt-2 text-sm text-stone-600">
          {summary.completedLessonCount} / {summary.totalLessonCount}
        </p>
      </section>
    </main>
  );
}
