"use client";

const generationSteps = [
  {
    title: "解析目标与截止时间",
    description: "识别你的学习方向、当前基础和每周节奏。"
  },
  {
    title: "拆成三段可执行里程碑",
    description: "把大目标压缩成更容易持续推进的阶段路线。"
  },
  {
    title: "生成今天就能开始的一课",
    description: "确保打开 roadmap 后，立刻知道第一步做什么。"
  }
];

const roadmapPreviewCards = [
  {
    eyebrow: "Week 1",
    title: "起步定位",
    points: ["补齐关键基础概念", "做出第一个最小成果"]
  },
  {
    eyebrow: "Week 2-3",
    title: "核心突破",
    points: ["围绕目标堆叠核心技能", "用阶段练习巩固输出"]
  },
  {
    eyebrow: "Week 4",
    title: "实战落地",
    points: ["把技能串成完整闭环", "收口成可复用的方法"]
  }
];

function truncateGoal(goalText: string) {
  if (goalText.length <= 22) {
    return goalText;
  }

  return `${goalText.slice(0, 22)}…`;
}

function formatWeeklyCommitment(value: string) {
  const minutes = Number(value);

  if (!Number.isFinite(minutes) || minutes <= 0) {
    return null;
  }

  const hours = minutes / 60;
  const formatted = Number.isInteger(hours) ? `${hours}` : hours.toFixed(1);
  return `每周投入 ${formatted} 小时`;
}

function formatDeadline(value: string) {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return `目标截止 ${new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric"
  }).format(date)}`;
}

type RoadmapGenerationDialogProps = {
  activeStep: number;
  goalText: string;
  isOpen: boolean;
  targetDeadline: string;
  weeklyTimeBudgetMinutes: string;
};

export function RoadmapGenerationDialog({
  activeStep,
  goalText,
  isOpen,
  targetDeadline,
  weeklyTimeBudgetMinutes
}: RoadmapGenerationDialogProps) {
  if (!isOpen) {
    return null;
  }

  const weeklyCommitment = formatWeeklyCommitment(weeklyTimeBudgetMinutes);
  const deadline = formatDeadline(targetDeadline);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/60 p-4 backdrop-blur-md sm:items-center sm:p-6">
      <div
        aria-labelledby="roadmap-generation-title"
        aria-modal="true"
        className="roadmap-generation-shell relative w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/10 text-stone-50 shadow-[0_30px_120px_rgba(15,23,42,0.45)]"
        role="dialog"
      >
        <div className="relative grid gap-8 p-6 sm:grid-cols-[1.05fr_0.95fr] sm:p-8">
          <section className="relative z-10">
            <p className="text-xs font-medium uppercase tracking-[0.35em] text-amber-200/70">AI Roadmap Engine</p>
            <h2 className="mt-4 max-w-xl text-3xl font-semibold leading-tight text-white sm:text-4xl" id="roadmap-generation-title">
              {goalText ? `正在为「${truncateGoal(goalText)}」生成路线图` : "正在生成你的学习路线图"}
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-stone-300 sm:text-base">
              正在把你的目标拆成里程碑、节奏和今天的第一步。路线图生成后会自动进入 roadmap 页面。
            </p>

            <div className="mt-6 flex flex-wrap gap-3 text-xs text-stone-200/90">
              {weeklyCommitment ? <span className="rounded-full border border-white/10 bg-white/10 px-3 py-2">{weeklyCommitment}</span> : null}
              {deadline ? <span className="rounded-full border border-white/10 bg-white/10 px-3 py-2">{deadline}</span> : null}
              <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-amber-100">路线图构建中</span>
            </div>

            <div className="mt-8 space-y-3">
              {generationSteps.map((step, index) => {
                const stateClass =
                  index === activeStep ? "is-active" : index < activeStep ? "is-complete" : "is-pending";

                return (
                  <div className={`roadmap-generation-step ${stateClass}`} key={step.title}>
                    <span aria-hidden="true" className="roadmap-generation-step-dot" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white sm:text-base">{step.title}</p>
                      <p className="mt-1 text-sm leading-6 text-stone-300">{step.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="relative z-10">
            <div className="roadmap-generation-preview rounded-[1.75rem] border border-white/10 bg-white/5 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-stone-400">Roadmap Preview</p>
                  <p className="mt-2 text-lg font-semibold text-white">正在编排你的 30 天路线</p>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs text-emerald-100">
                  <span aria-hidden="true" className="h-2 w-2 rounded-full bg-emerald-300" />
                  生成中
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                {roadmapPreviewCards.map((card, index) => (
                  <article
                    className="roadmap-generation-card rounded-[1.5rem] border border-white/10 bg-stone-950/30 p-4"
                    key={card.title}
                    style={{ animationDelay: `${index * 180}ms` }}
                  >
                    <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-stone-400">
                      <span>{card.eyebrow}</span>
                      <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] text-stone-300">Milestone</span>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold text-white">{card.title}</h3>
                    <div className="roadmap-generation-card-line mt-4" />
                    <ul className="mt-4 space-y-2 text-sm leading-6 text-stone-300">
                      {card.points.map((point) => (
                        <li className="flex items-start gap-2" key={point}>
                          <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 rounded-full bg-amber-200" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
