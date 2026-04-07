import Link from "next/link";

import { MilestoneList } from "@/components/roadmap/milestone-list";
import { getRoadmapPreview } from "@/lib/ai/plan-generator";
import { ROUTES } from "@/lib/routes";

export default function RoadmapPage() {
  const roadmap = getRoadmapPreview();

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-16">
      <div className="max-w-3xl space-y-4">
        <p className="text-sm uppercase tracking-[0.3em] text-stone-500">30 Day Roadmap</p>
        <h1 className="text-4xl font-semibold text-stone-900">先看清 3 个里程碑，再开始今天这一课。</h1>
        <p className="text-base text-stone-600">
          首版会把你的目标收束到一条稳定路径，只展示必要的阶段成果和今天该完成的最小闭环。
        </p>
      </div>

      <div className="mt-10">
        <MilestoneList milestones={roadmap.milestones} />
      </div>

      <div className="mt-10 flex items-center gap-4">
        <Link
          className="inline-flex rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-white"
          href={ROUTES.lesson("lesson_1")}
        >
          开始今天一课
        </Link>
        <p className="text-sm text-stone-500">你也可以稍后调整每周投入时间和截止日期。</p>
      </div>
    </main>
  );
}
