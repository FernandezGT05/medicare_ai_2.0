import { AGENT_CATALOG } from "../config/agentCatalog";
import { getSpecialtyOption } from "../config/agentSpecialties";
import { useSession } from "../context/SessionContext";
import styles from "./AgentSelector.module.css";

export function AgentSelector() {
  const {
    selectedSpecialty,
    selectedAgentId,
    setSelectedAgentId,
    clearSpecialty,
    consultationActive,
    loading: sessionLoading,
    connected,
    error: sessionError,
    resolveError,
  } = useSession();

  const specialty = selectedSpecialty
    ? getSpecialtyOption(selectedSpecialty)
    : null;

  if (!selectedSpecialty) {
    return null;
  }

  return (
    <section
      className={styles.section}
      aria-labelledby="agent-picker-heading"
    >
      <div className={styles.headerRow}>
        <button
          type="button"
          className={styles.backBtn}
          disabled={consultationActive}
          onClick={clearSpecialty}
        >
          ← Change type
        </button>
        {specialty && (
          <span className={styles.specialtyBadge}>{specialty.title}</span>
        )}
      </div>

      <div className={styles.intro}>
        <h2 id="agent-picker-heading" className={styles.title}>
          Choose your agent
        </h2>
        <p className={styles.lead}>
          Select who you would like to speak with. Your consultation type sets
          the conversation focus.
        </p>
      </div>

      <div
        className={styles.grid}
        role="radiogroup"
        aria-labelledby="agent-picker-heading"
      >
        {AGENT_CATALOG.map((catalogAgent) => {
          const isSelected = selectedAgentId === catalogAgent.id;
          return (
            <button
              key={catalogAgent.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={consultationActive}
              className={`${styles.card} ${isSelected ? styles.cardSelected : ""}`}
              onClick={() => setSelectedAgentId(catalogAgent.id)}
            >
              <span className={styles.preview}>
                <img
                  src={catalogAgent.imageUrl}
                  alt=""
                  className={styles.previewImg}
                />
              </span>
              <span className={styles.cardTitle}>{catalogAgent.displayName}</span>
            </button>
          );
        })}
      </div>

      <div className={styles.status} role="status" aria-live="polite">
        {!selectedAgentId ? (
          <p className={styles.statusHint}>
            Tap an agent to open the conversation panel.
          </p>
        ) : sessionLoading ? (
          <p className={styles.statusHint}>Preparing your session…</p>
        ) : resolveError ? (
          <p className={styles.statusError}>{resolveError}</p>
        ) : connected ? (
          <p className={styles.statusOk}>
            <span className={styles.statusDot} aria-hidden />
            Opening conversation…
          </p>
        ) : (
          <p className={styles.statusError}>
            {sessionError ?? "Could not prepare this session."}
          </p>
        )}
      </div>
    </section>
  );
}
