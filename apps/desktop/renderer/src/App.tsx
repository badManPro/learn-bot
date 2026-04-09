import { useEffect, useState } from "react";

import type { LessonContract, PlanContract } from "@learn-bot/ai-contracts";
import type { PlanGenerationRequest } from "@learn-bot/ai-orchestrator";

import type { DesktopSession } from "../../shared/contracts";

const DEFAULT_PLAN_REQUEST: PlanGenerationRequest = {
  goalText: "我想学 Python 做 AI 自动化工作流",
  currentLevel: "zero",
  weeklyTimeBudgetMinutes: 240,
  targetDeadline: "2026-06-30",
  mbti: null
};

export default function App() {
  const [session, setSession] = useState<DesktopSession | null>(null);
  const [planPreview, setPlanPreview] = useState<PlanContract | null>(null);
  const [lessonPreview, setLessonPreview] = useState<LessonContract | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

  useEffect(() => {
    let disposed = false;

    void Promise.all([window.desktopApi.auth.session.get(), window.desktopApi.lesson.generate()]).then(([nextSession, nextLesson]) => {
      if (disposed) {
        return;
      }

      setSession(nextSession);
      setLessonPreview(nextLesson);
    });

    return () => {
      disposed = true;
    };
  }, []);

  async function handleGeneratePlan() {
    setIsGeneratingPlan(true);
    setPlanError(null);

    try {
      const nextPlan = await window.desktopApi.plan.generate(DEFAULT_PLAN_REQUEST);
      setPlanPreview(nextPlan);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Plan generation failed.";
      setPlanError(message);
      setPlanPreview(null);
    } finally {
      setIsGeneratingPlan(false);
    }
  }

  return (
    <main className="min-h-screen bg-stone-950 px-8 py-10 text-stone-100">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-stone-400">Learn Bot Desktop</p>
          <h1 className="text-4xl font-semibold">Phase 2 orchestration slice</h1>
          <p className="max-w-3xl text-sm leading-6 text-stone-300">
            The desktop shell now keeps a typed preload bridge, a real Python plan generation path in the main process,
            and a contract-rich lesson preview for the next migration step.
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
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl space-y-2">
              <h2 className="text-lg font-medium">Real Python plan generation</h2>
              <p className="text-sm text-stone-300">
                This button calls the Electron main process, which then invokes the OpenAI-backed Python plan
                orchestrator with structured output validation.
              </p>
              <div className="rounded-2xl border border-stone-800 bg-stone-950/60 p-4 text-sm text-stone-300">
                <p>Goal: {DEFAULT_PLAN_REQUEST.goalText}</p>
                <p>Current level: {DEFAULT_PLAN_REQUEST.currentLevel}</p>
                <p>Weekly budget: {DEFAULT_PLAN_REQUEST.weeklyTimeBudgetMinutes} minutes</p>
                <p>Deadline: {DEFAULT_PLAN_REQUEST.targetDeadline}</p>
              </div>
            </div>
            <button
              className="rounded-full border border-emerald-300 bg-emerald-200 px-5 py-3 text-sm font-medium text-emerald-950 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isGeneratingPlan}
              onClick={() => void handleGeneratePlan()}
              type="button"
            >
              {isGeneratingPlan ? "Generating..." : "Generate Python roadmap"}
            </button>
          </div>

          {planError ? (
            <div className="mt-4 rounded-2xl border border-amber-700/60 bg-amber-950/30 p-4 text-sm text-amber-100">
              {planError}
            </div>
          ) : null}

          {planPreview ? (
            <article className="mt-6 rounded-3xl border border-stone-800 bg-stone-950/60 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-stone-500">Plan.generate</p>
              <h3 className="mt-3 text-2xl font-semibold text-white">{planPreview.planTitle}</h3>
              <p className="mt-3 text-sm leading-6 text-stone-300">{planPreview.goalSummary}</p>
              <p className="mt-2 text-sm text-stone-400">Estimated timeline: {planPreview.totalEstimatedWeeks} weeks</p>
              <ul className="mt-4 flex flex-wrap gap-2 text-xs text-stone-200">
                {planPreview.tags.map((tag) => (
                  <li className="rounded-full border border-stone-700 px-3 py-2" key={tag}>
                    {tag}
                  </li>
                ))}
              </ul>
              <ol className="mt-5 space-y-3 text-sm text-stone-200">
                {planPreview.milestones.map((milestone) => (
                  <li className="rounded-2xl border border-stone-800 p-4" key={milestone.id}>
                    <p className="font-medium text-white">
                      {milestone.index}. {milestone.title}
                    </p>
                    <p className="mt-1 text-stone-400">{milestone.purpose}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.2em] text-stone-500">{milestone.status}</p>
                    <p className="mt-3 text-xs text-stone-500">
                      Success criteria: {milestone.successCriteria.join(" / ")}
                    </p>
                  </li>
                ))}
              </ol>
              <ul className="mt-4 flex flex-wrap gap-3 text-sm text-stone-200">
                {planPreview.warnings.map((warning) => (
                  <li className="rounded-full border border-amber-700/60 px-3 py-2 text-amber-200" key={warning}>
                    {warning}
                  </li>
                ))}
              </ul>
            </article>
          ) : null}
        </section>

        <section className="rounded-[1.75rem] border border-stone-800 bg-stone-900/70 p-6">
          <h2 className="text-lg font-medium">Lesson contract preview</h2>
          <div className="mt-4 grid gap-6 lg:grid-cols-2">
            <article className="rounded-3xl border border-stone-800 bg-stone-950/60 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-stone-500">Lesson.generate</p>
              <h3 className="mt-3 text-2xl font-semibold text-white">{lessonPreview?.title ?? "Loading..."}</h3>
              <p className="mt-3 text-sm leading-6 text-stone-300">{lessonPreview?.whyThisNow}</p>
              <p className="mt-2 text-sm text-stone-400">Materials: {lessonPreview?.materialsNeeded.join(", ")}</p>
              <ul className="mt-5 space-y-3 text-sm text-stone-200">
                {lessonPreview?.tasks.map((task) => (
                  <li className="rounded-2xl border border-stone-800 p-4" key={task.id}>
                    <p className="font-medium text-white">{task.title}</p>
                    <p className="mt-1 text-stone-400">{task.instructions}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.2em] text-stone-500">
                      {task.type} / {task.estimatedMinutes} min / {task.verificationMethod}
                    </p>
                  </li>
                ))}
              </ul>
            </article>

            <article className="rounded-3xl border border-stone-800 bg-stone-950/60 p-5 text-sm text-stone-300">
              <p className="text-xs uppercase tracking-[0.25em] text-stone-500">Recovery and next action</p>
              <div className="mt-3 rounded-2xl border border-stone-800 p-4">
                <p className="font-medium text-white">Completion contract</p>
                <p className="mt-2">{lessonPreview?.completionContract.summary}</p>
              </div>
              <div className="mt-4 rounded-2xl border border-stone-800 p-4">
                <p className="font-medium text-white">If blocked</p>
                <ul className="mt-2 space-y-2">
                  {lessonPreview?.ifBlocked.map((item) => (
                    <li key={item.trigger}>
                      <span className="font-medium text-stone-100">{item.trigger}</span>: {item.response}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-4 rounded-2xl border border-stone-800 p-4">
                <p className="font-medium text-white">Next default action</p>
                <p className="mt-2">{lessonPreview?.nextDefaultAction.label}</p>
                <p className="mt-2 text-stone-500">{lessonPreview?.nextDefaultAction.rationale}</p>
              </div>
              <div className="mt-4 rounded-2xl border border-stone-800 p-4">
                <p className="font-medium text-white">Quiz checkpoint</p>
                <p className="mt-2">{lessonPreview?.quiz.question}</p>
              </div>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
