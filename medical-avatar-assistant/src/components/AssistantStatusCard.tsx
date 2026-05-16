import { branding } from "../config/branding";
import { useSession } from "../context/SessionContext";
import styles from "./AssistantStatusCard.module.css";

export function AssistantStatusCard() {
  const {
    loading,
    connected,
    error,
    retry,
    agent,
    selectedSpecialty,
  } = useSession();
  const name = agent?.name ?? branding.agentName;
  const greeting = agent?.greeting?.trim();
  const showGreeting = connected && Boolean(greeting);

  if (!selectedSpecialty) {
    return (
      <div className={styles.card} role="status">
        <span className={styles.liveDot} aria-hidden />
        <p className={styles.body}>
          <span className={styles.readyTitle}>{branding.appName}</span>
          <span className={styles.readyMeta}>
            {" "}
            · Pick a consultation type and agent on the consultation page
          </span>
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`${styles.card} ${styles.cardLoading}`} role="status">
        <span className={styles.liveDot} aria-hidden />
        <p className={styles.body}>Connecting to {name}…</p>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className={`${styles.card} ${styles.cardError}`} role="alert">
        <p className={styles.body}>{error ?? "API not configured."}</p>
        <button type="button" className={styles.retryBtn} onClick={retry}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={styles.card} role="status" aria-live="polite">
      <span
        className={styles.liveDot}
        aria-hidden
        title="Agent is live"
      />
      {showGreeting ? (
        <>
          <span className={styles.label}>Your assistant says</span>
          <p className={`${styles.body} ${styles.bodyQuote}`}>“{greeting}”</p>
        </>
      ) : (
        <p className={styles.body}>
          <span className={styles.readyTitle}>{name} is ready</span>
        </p>
      )}
    </div>
  );
}
