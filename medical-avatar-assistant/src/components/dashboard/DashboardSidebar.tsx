import { Link } from "react-router-dom";
import {
  DASHBOARD_TABS,
  type DashboardTabId,
} from "./dashboardTabs";
import styles from "./DashboardSidebar.module.css";

interface DashboardSidebarProps {
  activeTab: DashboardTabId;
  onTabChange: (tab: DashboardTabId) => void;
}

export function DashboardSidebar({
  activeTab,
  onTabChange,
}: DashboardSidebarProps) {
  return (
    <aside className={styles.sidebar} aria-label="Dashboard navigation">
      <div className={styles.sidebarHeader}>
        <p className={styles.sidebarTitle}>Dashboard</p>
      </div>

      <ul className={styles.nav} role="tablist">
        {DASHBOARD_TABS.map((tab) => (
          <li key={tab.id}>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`${styles.navButton} ${
                activeTab === tab.id ? styles.navButtonActive : ""
              }`}
              onClick={() => onTabChange(tab.id)}
            >
              <span className={styles.navLabel}>{tab.label}</span>
              <span className={styles.navDescription}>{tab.description}</span>
            </button>
          </li>
        ))}
      </ul>

      <div className={styles.sidebarFooter}>
        <Link to="/consultation" className={styles.consultLink}>
          Start consultation
        </Link>
      </div>
    </aside>
  );
}
