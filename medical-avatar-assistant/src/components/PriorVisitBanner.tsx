import { useSession } from "../context/SessionContext";
import styles from "./PriorVisitBanner.module.css";

export function PriorVisitBanner() {
  const { priorVisit, clearPriorConsultation } = useSession();

  if (!priorVisit) {
    return null;
  }

  const dateLabel = new Date(priorVisit.startedAt).toLocaleDateString(undefined, {
    dateStyle: "medium",
  });

  return (
    <div className={styles.banner} role="status">
      <p className={styles.text}>
        Using context from <strong>{dateLabel}</strong> (
        {priorVisit.specialtyLabel}). The assistant will ask if anything has
        changed.
      </p>
      <button
        type="button"
        className={styles.clearBtn}
        onClick={clearPriorConsultation}
      >
        Don&apos;t use prior visit
      </button>
    </div>
  );
}
