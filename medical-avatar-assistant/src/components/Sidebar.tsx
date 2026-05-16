import { NearbyPlacesPanel } from "./NearbyPlacesPanel";
import { PatientResources } from "./PatientResources";
import styles from "./Sidebar.module.css";

export function Sidebar() {
  return (
    <aside className={styles.sidebar} aria-label="Session tools">
      <NearbyPlacesPanel />

      <PatientResources />

      <div className={styles.trust}>
        <ShieldIcon />
        <p>
          Choose a different agent with <strong>Change agent</strong>, or set{" "}
          <code>BEY_AGENT_ID_NELLY</code> (and similar) in <code>.env</code> on
          the server, then use <strong>Retry</strong> above the video panel.
        </p>
      </div>
    </aside>
  );
}

function ShieldIcon() {
  return (
    <svg
      className={styles.shieldIcon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
