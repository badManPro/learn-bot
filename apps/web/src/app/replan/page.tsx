import type { ReplanReason } from "@prisma/client";

import { generateWebReplanPreview } from "@/lib/ai/replan-runtime";
import { getOrCreateGuestUserId } from "@/lib/session";

const REPLAN_REASONS: ReplanReason[] = ["inactive", "too_hard", "pace_too_fast", "wrong_goal"];

function resolveReason(value: string | string[] | undefined): ReplanReason {
  const normalized = Array.isArray(value) ? value[0] : value;

  return REPLAN_REASONS.includes(normalized as ReplanReason) ? (normalized as ReplanReason) : "inactive";
}

type ReplanPageProps = {
  searchParams?: Promise<{
    reason?: string | string[];
  }>;
};

export default async function ReplanPage({ searchParams }: ReplanPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const reason = resolveReason(resolvedSearchParams.reason);

  try {
    const guestUserId = await getOrCreateGuestUserId();
    const preview = await generateWebReplanPreview(guestUserId, reason);

    if (!preview) {
      return (
        <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-16">
          <div className="max-w-3xl space-y-4">
            <p className="text-sm uppercase tracking-[0.3em] text-stone-500">Replan</p>
            <h1 className="text-4xl font-semibold text-stone-900">当前没有可重新规划的 active lesson。</h1>
            <p className="text-base leading-7 text-stone-600">
              Web 端现在只展示真实 AI 生成的 replan。请先生成 roadmap 和 lesson，再回来查看 replan 建议。
            </p>
          </div>
        </main>
      );
    }

    return (
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-16">
        <div className="max-w-3xl space-y-4">
          <p className="text-sm uppercase tracking-[0.3em] text-stone-500">Replan</p>
          <h1 className="text-4xl font-semibold text-stone-900">先看清系统给出的诊断，再决定是否替换当前 lesson。</h1>
          <p className="text-base text-stone-600">
            当前页面已经切到真实 AI replan preview，不再展示旧的 deterministic mode 卡片。
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          {REPLAN_REASONS.map((candidate) => (
            <a
              className={`rounded-full border px-4 py-2 text-sm font-medium ${
                candidate === reason
                  ? "border-stone-900 bg-stone-900 text-white"
                  : "border-stone-300 bg-white text-stone-700"
              }`}
              href={`/replan?reason=${candidate}`}
              key={candidate}
            >
              {candidate}
            </a>
          ))}
        </div>

        <section className="mt-8 rounded-[1.75rem] border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-stone-500">Current lesson</p>
          <h2 className="mt-2 text-2xl font-semibold text-stone-900">{preview.context.currentLesson.title}</h2>
          <p className="mt-3 text-sm leading-6 text-stone-600">{preview.context.currentLesson.whyThisNow}</p>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          <article className="rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-stone-900">Diagnosis</h3>
            <p className="mt-3 text-sm leading-6 text-stone-600">{preview.replan.diagnosis}</p>
            <h4 className="mt-5 text-sm font-medium uppercase tracking-[0.2em] text-stone-500">Pace change</h4>
            <p className="mt-2 text-sm leading-6 text-stone-600">{preview.replan.paceChange}</p>
            <h4 className="mt-5 text-sm font-medium uppercase tracking-[0.2em] text-stone-500">Milestone adjustment</h4>
            <p className="mt-2 text-sm leading-6 text-stone-600">{preview.replan.milestoneAdjustment}</p>
          </article>

          <article className="rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-stone-900">{preview.replan.replacementLessonTitle}</h3>
            <p className="mt-3 text-sm leading-6 text-stone-600">{preview.replan.replacementLesson.reason}</p>
            <dl className="mt-4 space-y-3 text-sm text-stone-600">
              <div>
                <dt className="font-medium text-stone-900">Focus</dt>
                <dd>{preview.replan.replacementLesson.focus}</dd>
              </div>
              <div>
                <dt className="font-medium text-stone-900">First step</dt>
                <dd>{preview.replan.replacementLesson.firstStep}</dd>
              </div>
              <div>
                <dt className="font-medium text-stone-900">Replacement seed</dt>
                <dd>
                  {preview.replan.replacementLessonSeed.lessonType} / {preview.replan.replacementLessonSeed.objective}
                </dd>
              </div>
            </dl>
          </article>
        </section>

        <section className="mt-8 rounded-[1.75rem] border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-emerald-950">User-facing message</h2>
          <p className="mt-3 text-sm leading-6 text-emerald-900">{preview.replan.userMessage}</p>

          <form action="/api/plan/replan" className="mt-6" method="post">
            <input name="reason" type="hidden" value={reason} />
            <button
              className="rounded-full bg-emerald-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-emerald-800"
              type="submit"
            >
              应用这个 replan 并替换当前 lesson
            </button>
          </form>
        </section>
      </main>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Web replan runtime is unavailable.";

    return (
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-16">
        <div className="max-w-3xl space-y-4">
          <p className="text-sm uppercase tracking-[0.3em] text-stone-500">Replan</p>
          <h1 className="text-4xl font-semibold text-stone-900">当前无法生成真实 replan。</h1>
          <p className="text-base leading-7 text-stone-600">{message}</p>
        </div>
      </main>
    );
  }
}
