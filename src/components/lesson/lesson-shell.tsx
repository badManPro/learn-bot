import type { LessonPayload } from "@/lib/ai/lesson-generator";

import { QuizCard } from "@/components/lesson/quiz-card";
import { TaskCard } from "@/components/lesson/task-card";

type LessonShellProps = {
  lesson: LessonPayload;
};

export function LessonShell({ lesson }: LessonShellProps) {
  const [firstTask, ...remainingTasks] = lesson.tasks;

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-16">
      <div className="max-w-3xl space-y-4">
        <p className="text-sm uppercase tracking-[0.3em] text-stone-500">Today Lesson</p>
        <h1 className="text-4xl font-semibold text-stone-900">{lesson.title}</h1>
        <p className="text-base text-stone-600">{lesson.whyItMatters}</p>
      </div>

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
