import { useEffect, useState } from "react";

import type { LessonContract, PlanContract, ReplanContract, ReplanReason, TodayLessonSeed } from "@learn-bot/ai-contracts";
import type { LessonGenerationRequest, PlanGenerationRequest, ReplanGenerationRequest } from "@learn-bot/ai-orchestrator";

import type { DesktopSession } from "../../shared/contracts";

const DEFAULT_PLAN_REQUEST: PlanGenerationRequest = {
  goalText: "我想学 Python 做 AI 自动化工作流",
  currentLevel: "zero",
  weeklyTimeBudgetMinutes: 240,
  targetDeadline: "2026-06-30",
  mbti: null
};

function formatDomainLabel(domainId: string) {
  return domainId.slice(0, 1).toUpperCase() + domainId.slice(1);
}

function supportsInteractiveDomain(domainId: string) {
  return domainId === "python" || domainId === "piano";
}

export default function App() {
  const hasDesktopApi = typeof window !== "undefined" && typeof window.desktopApi !== "undefined";
  const [session, setSession] = useState<DesktopSession | null>(null);
  const [planPreview, setPlanPreview] = useState<PlanContract | null>(null);
  const [lessonPreview, setLessonPreview] = useState<LessonContract | null>(null);
  const [lessonHistory, setLessonHistory] = useState<LessonContract[]>([]);
  const [replanPreview, setReplanPreview] = useState<ReplanContract | null>(null);
  const [bridgeError, setBridgeError] = useState<string | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [lessonError, setLessonError] = useState<string | null>(null);
  const [replanError, setReplanError] = useState<string | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [isGeneratingLesson, setIsGeneratingLesson] = useState(false);
  const [isGeneratingReplan, setIsGeneratingReplan] = useState(false);

  useEffect(() => {
    if (!hasDesktopApi) {
      setBridgeError("desktopApi preload bridge is unavailable. Check the Electron preload path and DevTools console.");
      return;
    }

    let disposed = false;

    void window.desktopApi.auth.session
      .get()
      .then((nextSession) => {
        if (!disposed) {
          setSession(nextSession);
        }
      })
      .catch((error) => {
        if (!disposed) {
          const message = error instanceof Error ? error.message : "Failed to read desktop session.";
          setBridgeError(message);
        }
      });

    return () => {
      disposed = true;
    };
  }, [hasDesktopApi]);

  function buildLessonRequest(
    plan: PlanContract,
    overrides?: Partial<Pick<LessonGenerationRequest, "generationMode" | "lessonHistory" | "lessonSeed">>
  ): LessonGenerationRequest {
    return {
      ...DEFAULT_PLAN_REQUEST,
      plan,
      generationMode: overrides?.generationMode ?? "initial",
      lessonHistory: overrides?.lessonHistory ?? lessonHistory,
      lessonSeed: overrides?.lessonSeed
    };
  }

  function buildFollowUpLessonSeed(plan: PlanContract, lesson: LessonContract): TodayLessonSeed {
    return {
      milestoneId: plan.milestones.find((item) => item.status === "active")?.id ?? plan.todayLessonSeed.milestoneId,
      lessonType: plan.todayLessonSeed.lessonType === "setup" ? "practice" : plan.todayLessonSeed.lessonType,
      objective: lesson.nextDefaultAction.label
    };
  }

  function buildReplanRequest(plan: PlanContract, lesson: LessonContract, reason: ReplanReason): ReplanGenerationRequest {
    return {
      ...DEFAULT_PLAN_REQUEST,
      plan,
      currentLesson: lesson,
      reason,
      lessonHistory
    };
  }

  async function handleGeneratePlan() {
    setIsGeneratingPlan(true);
    setPlanError(null);

    try {
      const nextPlan = await window.desktopApi.plan.generate(DEFAULT_PLAN_REQUEST);
      setPlanPreview(nextPlan);
      setLessonPreview(null);
      setLessonHistory([]);
      setReplanPreview(null);
      setLessonError(null);
      setReplanError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Plan generation failed.";
      setPlanError(message);
      setPlanPreview(null);
    } finally {
      setIsGeneratingPlan(false);
    }
  }

  async function handleGenerateLesson(
    overrides?: Partial<Pick<LessonGenerationRequest, "generationMode" | "lessonHistory" | "lessonSeed">>
  ) {
    if (!planPreview) {
      return;
    }

    setIsGeneratingLesson(true);
    setLessonError(null);
    const previousLesson = lessonPreview;
    const request = buildLessonRequest(planPreview, overrides);

    try {
      const nextLesson = await window.desktopApi.lesson.generate(request);
      if (previousLesson && !lessonHistory.some((item) => item.lessonId === previousLesson.lessonId)) {
        setLessonHistory((current) => [...current, previousLesson].slice(-3));
      }
      if (request.lessonSeed) {
        setPlanPreview((current) => (current ? { ...current, todayLessonSeed: request.lessonSeed as TodayLessonSeed } : current));
      }
      setLessonPreview(nextLesson);
      setReplanPreview(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Lesson generation failed.";
      setLessonError(message);
      setLessonPreview(null);
    } finally {
      setIsGeneratingLesson(false);
    }
  }

  async function handleGenerateFollowUpLesson() {
    if (!planPreview || !lessonPreview) {
      return;
    }

    await handleGenerateLesson({
      generationMode: "follow_up",
      lessonSeed: buildFollowUpLessonSeed(planPreview, lessonPreview),
      lessonHistory: lessonPreview ? [...lessonHistory, lessonPreview].slice(-3) : lessonHistory
    });
  }

  async function handleReplan(reason: ReplanReason) {
    if (!planPreview || !lessonPreview) {
      return;
    }

    setIsGeneratingReplan(true);
    setReplanError(null);

    try {
      const nextReplan = await window.desktopApi.plan.replan(buildReplanRequest(planPreview, lessonPreview, reason));
      setReplanPreview(nextReplan);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Replan failed.";
      setReplanError(message);
      setReplanPreview(null);
    } finally {
      setIsGeneratingReplan(false);
    }
  }

  return (
    <main className="min-h-screen bg-stone-950 px-8 py-10 text-stone-100">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-stone-400">Learn Bot Desktop</p>
          <h1 className="text-4xl font-semibold">Phase 2 orchestration slice</h1>
          <p className="max-w-3xl text-sm leading-6 text-stone-300">
            The desktop shell now keeps a typed preload bridge and runs both roadmap and lesson generation through the
            Electron main process with structured output validation.
          </p>
        </header>

        {bridgeError ? (
          <section className="rounded-[1.75rem] border border-rose-700/60 bg-rose-950/30 p-6 text-sm text-rose-100">
            <p className="font-medium">Desktop bridge error</p>
            <p className="mt-2 leading-6">{bridgeError}</p>
          </section>
        ) : null}

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
              <h2 className="text-lg font-medium">Real domain-aware plan generation</h2>
              <p className="text-sm text-stone-300">
                This button calls the Electron main process, which now chooses the plan domain from the request and
                builds the roadmap against the matching domain pack with structured output validation.
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
              {isGeneratingPlan ? "Generating..." : "Generate roadmap"}
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
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl space-y-2">
              <h2 className="text-lg font-medium">Real domain lesson generation</h2>
              <p className="text-sm text-stone-300">
                This path now uses the latest generated roadmap, the active milestone, and the learner profile to
                request a real structured lesson from the main-process orchestrator.
              </p>
              {planPreview ? (
                <div className="rounded-2xl border border-stone-800 bg-stone-950/60 p-4 text-sm text-stone-300">
                  <p>Domain: {planPreview.domainId}</p>
                  <p>Active milestone: {planPreview.milestones.find((item) => item.status === "active")?.title ?? "unknown"}</p>
                  <p>Lesson type: {planPreview.todayLessonSeed.lessonType}</p>
                  <p>Objective: {planPreview.todayLessonSeed.objective}</p>
                  <p>History count: {lessonHistory.length}</p>
                </div>
              ) : (
                <div className="rounded-2xl border border-stone-800 bg-stone-950/60 p-4 text-sm text-stone-400">
                  Generate a roadmap first so the lesson request has an active milestone and lesson seed to build from.
                </div>
              )}
            </div>
            <div className="flex flex-col gap-3">
              <button
                className="rounded-full border border-sky-300 bg-sky-200 px-5 py-3 text-sm font-medium text-sky-950 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!planPreview || !supportsInteractiveDomain(planPreview.domainId) || isGeneratingLesson}
                onClick={() => void handleGenerateLesson()}
                type="button"
              >
                {isGeneratingLesson
                  ? "Generating..."
                  : `Generate ${planPreview ? formatDomainLabel(planPreview.domainId) : "domain"} lesson`}
              </button>
              <button
                className="rounded-full border border-cyan-300 bg-cyan-200 px-5 py-3 text-sm font-medium text-cyan-950 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!lessonPreview || !planPreview || !supportsInteractiveDomain(planPreview.domainId) || isGeneratingLesson}
                onClick={() => void handleGenerateFollowUpLesson()}
                type="button"
              >
                Generate follow-up lesson
              </button>
            </div>
          </div>

          {planPreview && !supportsInteractiveDomain(planPreview.domainId) ? (
            <div className="mt-4 rounded-2xl border border-stone-800 bg-stone-950/60 p-4 text-sm text-stone-300">
              {formatDomainLabel(planPreview.domainId)} remains roadmap-only in the current shell. Lesson and replan
              generation currently support Python and Piano.
            </div>
          ) : null}

          {lessonError ? (
            <div className="mt-4 rounded-2xl border border-amber-700/60 bg-amber-950/30 p-4 text-sm text-amber-100">
              {lessonError}
            </div>
          ) : null}

          <div className="mt-4 grid gap-6 lg:grid-cols-2">
            <article className="rounded-3xl border border-stone-800 bg-stone-950/60 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-stone-500">Lesson.generate</p>
              <h3 className="mt-3 text-2xl font-semibold text-white">{lessonPreview?.title ?? "No lesson generated yet"}</h3>
              <p className="mt-3 text-sm leading-6 text-stone-300">
                {lessonPreview?.whyThisNow ?? "The generated lesson will appear here after you run the roadmap and lesson actions."}
              </p>
              <p className="mt-2 text-sm text-stone-400">
                Materials: {lessonPreview?.materialsNeeded.join(", ") ?? "Waiting for lesson output"}
              </p>
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
                <p className="mt-2">{lessonPreview?.completionContract.summary ?? "Waiting for generated lesson output."}</p>
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
                <p className="mt-2">{lessonPreview?.nextDefaultAction.label ?? "Waiting for generated lesson output."}</p>
                <p className="mt-2 text-stone-500">{lessonPreview?.nextDefaultAction.rationale}</p>
              </div>
              <div className="mt-4 rounded-2xl border border-stone-800 p-4">
                <p className="font-medium text-white">Quiz checkpoint</p>
                <p className="mt-2">{lessonPreview?.quiz.question ?? "Generate a lesson to inspect the checkpoint question."}</p>
              </div>
            </article>
          </div>

          <div className="mt-6 rounded-3xl border border-stone-800 bg-stone-950/60 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.25em] text-stone-500">Plan.replan</p>
                <h3 className="text-xl font-semibold text-white">Blocked-state replanning</h3>
                <p className="max-w-2xl text-sm leading-6 text-stone-300">
                  This path generates a structured diagnosis plus a replacement lesson seed that can be fed directly
                  back into lesson generation.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  className="rounded-full border border-stone-700 px-4 py-2 text-sm text-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!lessonPreview || !planPreview || !supportsInteractiveDomain(planPreview.domainId) || isGeneratingReplan}
                  onClick={() => void handleReplan("too_hard")}
                  type="button"
                >
                  Too hard
                </button>
                <button
                  className="rounded-full border border-stone-700 px-4 py-2 text-sm text-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!lessonPreview || !planPreview || !supportsInteractiveDomain(planPreview.domainId) || isGeneratingReplan}
                  onClick={() => void handleReplan("pace_too_fast")}
                  type="button"
                >
                  Pace too fast
                </button>
                <button
                  className="rounded-full border border-stone-700 px-4 py-2 text-sm text-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!lessonPreview || !planPreview || !supportsInteractiveDomain(planPreview.domainId) || isGeneratingReplan}
                  onClick={() => void handleReplan("inactive")}
                  type="button"
                >
                  Inactive
                </button>
              </div>
            </div>

            {replanError ? (
              <div className="mt-4 rounded-2xl border border-amber-700/60 bg-amber-950/30 p-4 text-sm text-amber-100">
                {replanError}
              </div>
            ) : null}

            {replanPreview ? (
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-stone-800 p-4 text-sm text-stone-300">
                  <p className="font-medium text-white">Diagnosis</p>
                  <p className="mt-2">{replanPreview.diagnosis}</p>
                  <p className="mt-4 font-medium text-white">User message</p>
                  <p className="mt-2">{replanPreview.userMessage}</p>
                  <p className="mt-4 font-medium text-white">Pace change</p>
                  <p className="mt-2">{replanPreview.paceChange}</p>
                  <p className="mt-4 font-medium text-white">Milestone adjustment</p>
                  <p className="mt-2">{replanPreview.milestoneAdjustment}</p>
                </div>
                <div className="rounded-2xl border border-stone-800 p-4 text-sm text-stone-300">
                  <p className="font-medium text-white">{replanPreview.replacementLessonTitle}</p>
                  <p className="mt-2">{replanPreview.replacementLesson.reason}</p>
                  <p className="mt-4">Focus: {replanPreview.replacementLesson.focus}</p>
                  <p className="mt-2">First step: {replanPreview.replacementLesson.firstStep}</p>
                  <p className="mt-4">
                    Replacement seed: {replanPreview.replacementLessonSeed.lessonType} / {replanPreview.replacementLessonSeed.objective}
                  </p>
                  <button
                    className="mt-5 rounded-full border border-emerald-300 bg-emerald-200 px-5 py-3 text-sm font-medium text-emerald-950 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isGeneratingLesson}
                    onClick={() =>
                      void handleGenerateLesson({
                        generationMode: "replacement",
                        lessonSeed: replanPreview.replacementLessonSeed,
                        lessonHistory: lessonPreview ? [...lessonHistory, lessonPreview].slice(-3) : lessonHistory
                      })
                    }
                    type="button"
                  >
                    Generate replacement lesson
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-stone-800 p-4 text-sm text-stone-400">
                Generate a lesson first, then run a replan reason to inspect the structured recovery path.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
