import { buildReplanResult, type ReplanMode } from "@/lib/domain/replan";

const REPLAN_MODES: ReplanMode[] = ["continue", "light", "rearrange"];

export default function ReplanPage() {
  const options = REPLAN_MODES.map((mode) => buildReplanResult({ mode, reason: "inactive" }));
  const recommendation = options.find((option) => option.mode === "rearrange");

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-16">
      <div className="max-w-3xl space-y-4">
        <p className="text-sm uppercase tracking-[0.3em] text-stone-500">Replan</p>
        <h1 className="text-4xl font-semibold text-stone-900">连续几天没学也没关系，先把节奏重新排顺。</h1>
        <p className="text-base text-stone-600">
          默认建议是重新安排：插入一节复习课，降低近期负担，并把后续时间线拉长一点。
        </p>
      </div>

      {recommendation ? (
        <section className="mt-8 rounded-[1.75rem] border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-emerald-950">推荐方案：{recommendation.recommendedMode}</h2>
          <p className="mt-3 text-sm leading-6 text-emerald-900">{recommendation.summary}</p>
        </section>
      ) : null}

      <section className="mt-10 grid gap-4 md:grid-cols-3">
        {options.map((option) => (
          <article className="rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm" key={option.mode}>
            <h3 className="text-lg font-semibold capitalize text-stone-900">{option.mode}</h3>
            <p className="mt-3 text-sm leading-6 text-stone-600">{option.summary}</p>
            <dl className="mt-4 space-y-2 text-sm text-stone-500">
              <div>
                <dt className="font-medium text-stone-700">延长周期</dt>
                <dd>{option.extendScheduleDays} 天</dd>
              </div>
              <div>
                <dt className="font-medium text-stone-700">插入复习课</dt>
                <dd>{option.insertReviewLesson ? "是" : "否"}</dd>
              </div>
              <div>
                <dt className="font-medium text-stone-700">新节奏</dt>
                <dd>{option.nextPaceMode ?? "保持当前节奏"}</dd>
              </div>
            </dl>
          </article>
        ))}
      </section>
    </main>
  );
}
