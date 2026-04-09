import Link from "next/link";

import { MilestoneList } from "@learn-bot/ui";

import { ensureCurrentPlanForUser } from "@/lib/ai/plan-generator";
import { ROUTES } from "@/lib/routes";
import { getOrCreateGuestUserId } from "@/lib/session";

export default async function RoadmapPage() {
  const guestUserId = await getOrCreateGuestUserId();

  try {
    const snapshot = await ensureCurrentPlanForUser(guestUserId);

    if (!snapshot) {
      return (
        <main className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-16">
          <div className="max-w-3xl space-y-4">
            <p className="text-sm uppercase tracking-[0.3em] text-stone-500">30 Day Roadmap</p>
            <h1 className="text-4xl font-semibold text-stone-900">当前还没有可生成的 roadmap。</h1>
            <p className="text-base leading-7 text-stone-600">
              请先完成 onboarding 并确保目标仍在支持范围内。Web 端现在只展示真实 AI 生成结果，不再回退到旧的 deterministic
              preview。
            </p>
          </div>
        </main>
      );
    }

    return (
      <main className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-16">
        <div className="max-w-3xl space-y-4">
          <p className="text-sm uppercase tracking-[0.3em] text-stone-500">30 Day Roadmap</p>
          <h1 className="text-4xl font-semibold text-stone-900">先看清 3 个里程碑，再开始今天这一课。</h1>
          <p className="text-base text-stone-600">
            当前 web 路径已经切到真实 AI 生成结果，只展示必要的阶段成果和今天该完成的最小闭环。
          </p>
        </div>

        <div className="mt-10">
          <MilestoneList milestones={snapshot.milestones} />
        </div>

        <div className="mt-10 flex items-center gap-4">
          {snapshot.currentLessonId ? (
            <Link
              className="inline-flex rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-white"
              href={ROUTES.lesson(snapshot.currentLessonId)}
            >
              开始今天一课
            </Link>
          ) : (
            <span className="inline-flex rounded-full bg-stone-300 px-5 py-3 text-sm font-medium text-stone-700">
              当前还没有 lesson
            </span>
          )}
          <p className="text-sm text-stone-500">你也可以稍后调整每周投入时间和截止日期。</p>
        </div>
      </main>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Web AI runtime is unavailable.";

    return (
      <main className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-16">
        <div className="max-w-3xl space-y-4">
          <p className="text-sm uppercase tracking-[0.3em] text-stone-500">30 Day Roadmap</p>
          <h1 className="text-4xl font-semibold text-stone-900">当前无法生成真实 roadmap。</h1>
          <p className="text-base leading-7 text-stone-600">{message}</p>
        </div>
      </main>
    );
  }
}
