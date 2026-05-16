import { Link } from "react-router-dom";
import type { DashboardStats } from "../../types/api";
import panel from "./DashboardPanel.module.css";
import page from "../../pages/DashboardPage.module.css";

interface DashboardOverviewProps {
  stats: DashboardStats;
  pendingCount: number;
}

export function DashboardOverview({ stats, pendingCount }: DashboardOverviewProps) {
  return (
    <div className={panel.panel} role="tabpanel" aria-label="Overview">
      <header className={panel.panelHeader}>
        <h2 className={panel.panelTitle}>Overview</h2>
        <p className={panel.panelSubhead}>
          A snapshot of your consultation activity and recurring topics.
        </p>
      </header>

      <section className={page.statsGrid} aria-label="Visit statistics">
        <article className={page.statCard}>
          <p className={page.statValue}>{stats.totalVisits}</p>
          <p className={page.statLabel}>Total visits</p>
        </article>
        <article className={page.statCard}>
          <p className={page.statValue}>{stats.completedVisits}</p>
          <p className={page.statLabel}>Summarized</p>
        </article>
        <article className={page.statCard}>
          <p className={page.statValue}>{stats.pendingVisits}</p>
          <p className={page.statLabel}>Awaiting summary</p>
        </article>
        <article className={page.statCard}>
          <p className={page.statValue}>
            {stats.lastVisitAt
              ? new Date(stats.lastVisitAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })
              : "—"}
          </p>
          <p className={page.statLabel}>Last visit</p>
        </article>
      </section>

      {pendingCount > 0 && (
        <p className={page.pendingBanner}>
          You have {pendingCount} visit{pendingCount === 1 ? "" : "s"} waiting for
          a summary. Open <strong>History</strong> to generate them.
        </p>
      )}

      {(stats.specialtyBreakdown.length > 0 || stats.recentTopics.length > 0) && (
        <section className={page.insights} aria-label="Care insights">
          {stats.specialtyBreakdown.length > 0 && (
            <div className={page.insightBlock}>
              <h3 className={page.insightTitle}>Specialties consulted</h3>
              <ul className={page.chipList}>
                {stats.specialtyBreakdown.map((entry) => (
                  <li key={entry.specialty} className={page.chipMuted}>
                    {entry.specialtyLabel} ({entry.count})
                  </li>
                ))}
              </ul>
            </div>
          )}
          {stats.recentTopics.length > 0 && (
            <div className={page.insightBlock}>
              <h3 className={page.insightTitle}>Recent topics</h3>
              <ul className={page.chipList}>
                {stats.recentTopics.map((topic) => (
                  <li key={topic} className={page.chip}>
                    {topic}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <section className={page.quickActions} aria-label="Quick actions">
        <Link to="/consultation" className={page.btnPrimary}>
          Start a consultation
        </Link>
      </section>
    </div>
  );
}
