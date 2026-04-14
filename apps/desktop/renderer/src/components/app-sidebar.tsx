import type { LessonContract, PlanContract, ReplanContract } from "@learn-bot/ai-contracts";

import { TAB_META, formatSessionStatus, statusTone, type AppTab } from "../lib/desktop-display";

type AppSidebarProps = {
  activeTab: AppTab;
  lessonHistoryCount: number;
  lessonPreview: LessonContract | null;
  onTabChange: (tab: AppTab) => void;
  planPreview: PlanContract | null;
  replanPreview: ReplanContract | null;
  sessionState: "anonymous" | "authenticated" | "loading" | "pending";
};

const NAV_ORDER: AppTab[] = ["today", "roadmap", "settings"];

export function AppSidebar({
  activeTab,
  lessonHistoryCount,
  lessonPreview,
  onTabChange,
  planPreview,
  replanPreview,
  sessionState
}: AppSidebarProps) {
  return (
    <aside className="app-sidebar">
      <div className="app-sidebar__brand">
        <div className="brand-badge">LB</div>
        <div className="brand-copy">
          <strong>Learn Bot</strong>
          <span>Desktop learning cockpit</span>
        </div>
      </div>

      <section className="sidebar-status">
        <div>
          <p className="section-label">Session</p>
          <h2>{formatSessionStatus(sessionState)}</h2>
        </div>
        <span className={statusTone(sessionState)}>{formatSessionStatus(sessionState)}</span>
      </section>

      <nav aria-label="Desktop sections" className="app-nav">
        {NAV_ORDER.map((tab) => {
          const meta = TAB_META[tab];
          const active = tab === activeTab;

          return (
            <button
              aria-current={active ? "page" : undefined}
              className={`app-nav__item ${active ? "is-active" : ""}`}
              key={tab}
              onClick={() => onTabChange(tab)}
              type="button"
            >
              <span className="app-nav__label">{meta.statusLabel}</span>
              <span className="app-nav__description">{meta.description}</span>
            </button>
          );
        })}
      </nav>

      <section className="sidebar-snapshot">
        <article className="snapshot-card">
          <span className="snapshot-card__label">路线图</span>
          <strong className="snapshot-card__value">
            {planPreview ? `${planPreview.milestones.length} 个里程碑` : "尚未生成"}
          </strong>
        </article>
        <article className="snapshot-card">
          <span className="snapshot-card__label">今日课程</span>
          <strong className="snapshot-card__value">{lessonPreview ? "已生成" : "等待生成"}</strong>
        </article>
        <article className="snapshot-card">
          <span className="snapshot-card__label">历史课程</span>
          <strong className="snapshot-card__value">{lessonHistoryCount} 条</strong>
        </article>
        <article className="snapshot-card">
          <span className="snapshot-card__label">恢复建议</span>
          <strong className="snapshot-card__value">{replanPreview ? "已准备" : "暂无"}</strong>
        </article>
      </section>

      <p className="sidebar-footnote">当前生成结果会自动保存到本机，下次打开桌面端会继续恢复。</p>
    </aside>
  );
}
