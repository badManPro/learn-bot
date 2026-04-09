import { useEffect, useState } from "react";

import type { LessonContract, PlanContract } from "@learn-bot/ai-contracts";

import type { DesktopSession } from "../../shared/contracts";

export default function App() {
  const [session, setSession] = useState<DesktopSession | null>(null);
  const [planPreview, setPlanPreview] = useState<PlanContract | null>(null);
  const [lessonPreview, setLessonPreview] = useState<LessonContract | null>(null);

  useEffect(() => {
    let disposed = false;

    void Promise.all([
      window.desktopApi.auth.session.get(),
      window.desktopApi.plan.generate(),
      window.desktopApi.lesson.generate()
    ]).then(([nextSession, nextPlan, nextLesson]) => {
      if (disposed) {
        return;
      }

      setSession(nextSession);
      setPlanPreview(nextPlan);
      setLessonPreview(nextLesson);
    });

    return () => {
      disposed = true;
    };
  }, []);

  return (
    <main className="min-h-screen bg-stone-950 px-8 py-10 text-stone-100">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-stone-400">Learn Bot Desktop</p>
          <h1 className="text-4xl font-semibold">Phase 1 desktop shell</h1>
          <p className="max-w-2xl text-sm leading-6 text-stone-300">
            This window proves the Electron shell, preload API, and mocked orchestration boundaries are wired.
          </p>
        </header>

        <section className="rounded-[1.75rem] border border-stone-800 bg-stone-900/70 p-6">
          <div className="flex items-center justify-between gap-6">
            <div className="space-y-2">
              <h2 className="text-lg font-medium">Auth boundary</h2>
              <p className="text-sm text-stone-300">
                Status: <span className="font-medium text-white">{session?.status ?? "loading"}</span>
              </p>
              <p className="text-sm text-stone-300">
                Workspace: <span className="font-medium text-white">{session?.workspaceId ?? "not selected"}</span>
              </p>
              <p className="text-sm text-stone-400">{session?.loginHint ?? "Loading desktop session..."}</p>
            </div>
            <button
              className="rounded-full border border-stone-700 bg-stone-100 px-5 py-3 text-sm font-medium text-stone-950"
              onClick={() => void window.desktopApi.auth.login().then((value) => setSession(value))}
              type="button"
            >
              Login with ChatGPT
            </button>
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-stone-800 bg-stone-900/70 p-6">
          <h2 className="text-lg font-medium">Phase 1 orchestration preview</h2>
          <p className="mt-3 text-sm text-stone-300">{planPreview?.currentStrategy ?? "Loading plan preview..."}</p>
          <div className="mt-4 grid gap-6 lg:grid-cols-2">
            <article className="rounded-3xl border border-stone-800 bg-stone-950/60 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-stone-500">Plan.generate</p>
              <h3 className="mt-3 text-2xl font-semibold text-white">{planPreview?.planTitle ?? "Loading..."}</h3>
              <p className="mt-3 text-sm leading-6 text-stone-300">{planPreview?.goalSummary}</p>
              <ul className="mt-4 flex flex-wrap gap-2 text-xs text-stone-200">
                {planPreview?.tags.map((tag) => (
                  <li className="rounded-full border border-stone-700 px-3 py-2" key={tag}>
                    {tag}
                  </li>
                ))}
              </ul>
              <ol className="mt-5 space-y-3 text-sm text-stone-200">
                {planPreview?.milestones.map((milestone) => (
                  <li className="rounded-2xl border border-stone-800 p-4" key={milestone.index}>
                    <p className="font-medium text-white">
                      {milestone.index}. {milestone.title}
                    </p>
                    <p className="mt-1 text-stone-400">{milestone.outcome}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.2em] text-stone-500">{milestone.status}</p>
                  </li>
                ))}
              </ol>
            </article>

            <article className="rounded-3xl border border-stone-800 bg-stone-950/60 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-stone-500">Lesson.generate</p>
              <h3 className="mt-3 text-2xl font-semibold text-white">{lessonPreview?.title ?? "Loading..."}</h3>
              <p className="mt-3 text-sm leading-6 text-stone-300">{lessonPreview?.whyItMatters}</p>
              <ul className="mt-5 space-y-3 text-sm text-stone-200">
                {lessonPreview?.tasks.map((task) => (
                  <li className="rounded-2xl border border-stone-800 p-4" key={task.title}>
                    <p className="font-medium text-white">{task.title}</p>
                    <p className="mt-1 text-stone-400">{task.instructions}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.2em] text-stone-500">
                      {task.estimatedMinutes} min
                    </p>
                  </li>
                ))}
              </ul>
              <div className="mt-5 rounded-2xl border border-stone-800 p-4 text-sm text-stone-300">
                <p className="font-medium text-white">Quiz checkpoint</p>
                <p className="mt-2">{lessonPreview?.quiz.question}</p>
                <p className="mt-2 text-stone-500">Correct answer is stored in the shared lesson contract.</p>
              </div>
            </article>
          </div>
          <ul className="mt-4 flex flex-wrap gap-3 text-sm text-stone-200">
            {planPreview?.warnings.map((warning) => (
              <li className="rounded-full border border-amber-700/60 px-3 py-2 text-amber-200" key={warning}>
                {warning}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
