import type { PlanContract, RoadmapMilestone } from "@learn-bot/ai-contracts";

import { formatLessonTypeLabel, formatTargetDeadline } from "../lib/desktop-display";

type RoadmapViewProps = {
  activeMilestone: RoadmapMilestone | null;
  isGeneratingPlan: boolean;
  onGeneratePlan: () => void;
  planError: string | null;
  planPreview: PlanContract | null;
  targetDeadline: string;
};

function renderMilestoneMeta(milestone: RoadmapMilestone) {
  const prerequisites = milestone.prerequisites.length > 0 ? milestone.prerequisites.join(" · ") : "可直接进入";
  const lessonTypes = milestone.lessonTypes.map((item) => formatLessonTypeLabel(item)).join(" / ");

  return [
    `建议 ${milestone.recommendedWeeks} 周`,
    `前置 ${prerequisites}`,
    `课型 ${lessonTypes}`
  ];
}

export function RoadmapView({
  activeMilestone,
  isGeneratingPlan,
  onGeneratePlan,
  planError,
  planPreview,
  targetDeadline
}: RoadmapViewProps) {
  return (
    <div className="content-stack">
      <section className="surface-card hero-card hero-card--roadmap">
        <div className="hero-card__content">
          <p className="hero-card__eyebrow">Plan.generate</p>
          <h2>{planPreview ? planPreview.planTitle : "先把目标拆成可推进的整体路线"}</h2>
          <p>
            {planPreview
              ? planPreview.goalSummary
              : "路线图页负责把总体方向讲清楚：里程碑顺序、推进策略，以及系统今天默认从哪里切入。"}
          </p>
        </div>

        <div className="hero-card__actions">
          <button className="button button--primary" disabled={isGeneratingPlan} onClick={onGeneratePlan} type="button">
            {isGeneratingPlan ? "生成中..." : planPreview ? "重新生成路线" : "生成第一版路线"}
          </button>
          <span className="hero-card__hint">默认沿用设置页里的目标、当前水平、每周投入和截止日期。</span>
        </div>
      </section>

      {planError ? <div className="inline-note inline-note--warning">{planError}</div> : null}

      {planPreview ? (
        <>
          <section className="summary-grid">
            <article className="surface-card summary-tile">
              <span className="summary-tile__label">总周期</span>
              <strong className="summary-tile__value">{planPreview.totalEstimatedWeeks} 周</strong>
              <p className="summary-tile__meta">系统已将路径拆成稳定推进的阶段。</p>
            </article>

            <article className="surface-card summary-tile">
              <span className="summary-tile__label">当前里程碑</span>
              <strong className="summary-tile__value">{activeMilestone?.title ?? "等待开始"}</strong>
              <p className="summary-tile__meta">今天的课程会围绕这个阶段展开。</p>
            </article>

            <article className="surface-card summary-tile">
              <span className="summary-tile__label">今日入口</span>
              <strong className="summary-tile__value">{formatLessonTypeLabel(planPreview.todayLessonSeed.lessonType)}</strong>
              <p className="summary-tile__meta">{planPreview.todayLessonSeed.objective}</p>
            </article>

            <article className="surface-card summary-tile">
              <span className="summary-tile__label">目标日期</span>
              <strong className="summary-tile__value">{formatTargetDeadline(targetDeadline)}</strong>
              <p className="summary-tile__meta">当前默认节奏用于生成路线与课程。</p>
            </article>
          </section>

          <section className="split-section">
            <article className="surface-card strategy-card">
              <p className="section-label">Strategy</p>
              <h3>当前推进策略</h3>
              <p className="strategy-card__copy">{planPreview.currentStrategy}</p>
              <div className="token-row">
                {planPreview.tags.map((tag) => (
                  <span className="token" key={tag}>
                    {tag}
                  </span>
                ))}
                {planPreview.warnings.map((warning) => (
                  <span className="token token--warning" key={warning}>
                    {warning}
                  </span>
                ))}
              </div>
            </article>

            <article className="surface-card strategy-card">
              <p className="section-label">Today Seed</p>
              <h3>系统今天想让你先完成什么</h3>
              <p className="strategy-card__copy">{planPreview.todayLessonSeed.objective}</p>
              <div className="detail-list">
                <div className="detail-list__item">
                  <span>Milestone</span>
                  <strong>{planPreview.todayLessonSeed.milestoneId}</strong>
                </div>
                <div className="detail-list__item">
                  <span>Lesson type</span>
                  <strong>{formatLessonTypeLabel(planPreview.todayLessonSeed.lessonType)}</strong>
                </div>
                <div className="detail-list__item">
                  <span>Warnings</span>
                  <strong>{planPreview.warnings.length > 0 ? `${planPreview.warnings.length} 条` : "暂无"}</strong>
                </div>
              </div>
            </article>
          </section>

          <section className="timeline">
            {planPreview.milestones.map((milestone) => (
              <article
                className={`surface-card timeline-card ${milestone.status === "active" ? "is-active" : ""}`}
                key={milestone.id}
              >
                <div className="timeline-card__rail">
                  <span className="timeline-card__index">{milestone.index}</span>
                </div>

                <div className="timeline-card__content">
                  <div className="timeline-card__head">
                    <div>
                      <p className="section-label">Milestone {milestone.index}</p>
                      <h3>{milestone.title}</h3>
                    </div>
                    <span className="metric-pill">{milestone.status}</span>
                  </div>

                  <p className="timeline-card__description">{milestone.purpose}</p>

                  <div className="detail-list">
                    <div className="detail-list__item">
                      <span>Outcome</span>
                      <strong>{milestone.outcome}</strong>
                    </div>
                    <div className="detail-list__item">
                      <span>Success criteria</span>
                      <strong>{milestone.successCriteria.join(" / ")}</strong>
                    </div>
                  </div>

                  <div className="token-row">
                    {renderMilestoneMeta(milestone).map((item) => (
                      <span className="token token--soft" key={item}>
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </section>
        </>
      ) : (
        <section className="surface-card empty-panel">
          <h3 className="empty-panel__title">路线图还没建立</h3>
          <p className="empty-panel__copy">生成后，这里会展示整体策略、里程碑顺序、今天的入口以及风险提示。</p>
          <button className="button button--secondary" disabled={isGeneratingPlan} onClick={onGeneratePlan} type="button">
            {isGeneratingPlan ? "生成中..." : "开始生成路线图"}
          </button>
        </section>
      )}
    </div>
  );
}
