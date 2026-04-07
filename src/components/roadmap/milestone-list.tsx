import type { RoadmapMilestone } from "@/lib/ai/plan-generator";

type MilestoneListProps = {
  milestones: RoadmapMilestone[];
};

export function MilestoneList({ milestones }: MilestoneListProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {milestones.map((milestone) => (
        <article
          className="rounded-[1.75rem] border border-stone-200 bg-white p-6 shadow-sm"
          data-testid="milestone-card"
          key={milestone.index}
        >
          <p className="text-xs uppercase tracking-[0.25em] text-stone-500">Milestone {milestone.index}</p>
          <h2 className="mt-3 text-2xl font-semibold text-stone-900">{milestone.title}</h2>
          <p className="mt-3 text-sm leading-6 text-stone-600">{milestone.outcome}</p>
          <p className="mt-6 text-sm font-medium text-stone-900">
            当前状态：{milestone.status === "active" ? "进行中" : "待开始"}
          </p>
        </article>
      ))}
    </div>
  );
}
