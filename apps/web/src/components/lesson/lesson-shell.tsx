import type { LessonContract as LessonPayload } from "@learn-bot/ai-contracts";
import { QuizCard, RegenerationBanner, TaskCard } from "@learn-bot/ui";

type LessonShellProps = {
  lesson: LessonPayload;
  lessonId?: string;
  regenerationMessage?: string | null;
};

export function LessonShell({ lesson, lessonId, regenerationMessage }: LessonShellProps) {
  const [firstTask, ...remainingTasks] = lesson.tasks;

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-16">
      <div className="max-w-3xl space-y-4">
        <p className="text-sm uppercase tracking-[0.3em] text-stone-500">Today Lesson</p>
        <h1 className="text-4xl font-semibold text-stone-900">{lesson.title}</h1>
        <p className="text-base text-stone-600">{lesson.whyItMatters}</p>
      </div>

      {regenerationMessage ? (
        <div className="mt-8">
          <RegenerationBanner message={regenerationMessage} />
        </div>
      ) : null}

      {lessonId ? (
        <div className="mt-8 flex items-start justify-between gap-6 rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5">
          <div className="max-w-2xl space-y-2">
            <p className="text-sm font-medium text-amber-950">如果这节课太难，可以直接请求更轻量的版本。</p>
            <p className="text-sm leading-6 text-amber-900">
              系统会保留当前里程碑，只缩小任务范围并补一点前置说明。
            </p>
          </div>
          <form action="/api/lesson/regenerate" className="space-y-3" method="post">
            <input name="lessonId" type="hidden" value={lessonId} />
            <input name="reason" type="hidden" value="too_hard" />
            <button
              className="rounded-full border border-amber-300 bg-amber-100 px-5 py-3 text-sm font-medium text-amber-950 transition hover:bg-amber-200"
              type="submit"
            >
              太难了，帮我简化
            </button>
          </form>
        </div>
      ) : null}

      <section className="mt-10 rounded-[1.75rem] border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-stone-900">完成标准</h2>
        <p className="mt-3 text-sm leading-6 text-stone-600">{lesson.completionCriteria}</p>
      </section>

      <section className="mt-8 space-y-4">
        <TaskCard
          estimatedMinutes={firstTask.estimatedMinutes}
          instructions={firstTask.instructions}
          state="active"
          title={firstTask.title}
        />

        {remainingTasks.map((task) => (
          <TaskCard
            estimatedMinutes={task.estimatedMinutes}
            instructions={task.instructions}
            key={task.title}
            state="queued"
            title={task.title}
          />
        ))}
      </section>

      <div className="mt-8">
        <QuizCard options={lesson.quiz.options} question={lesson.quiz.question} />
      </div>
    </main>
  );
}
