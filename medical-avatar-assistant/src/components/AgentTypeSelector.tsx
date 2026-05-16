import { AGENT_SPECIALTY_OPTIONS } from "../config/agentSpecialties";
import { useSession } from "../context/SessionContext";
import styles from "./AgentTypeSelector.module.css";

export function AgentTypeSelector() {
  const { selectedSpecialty, setSelectedSpecialty, consultationActive } =
    useSession();

  return (
    <section
      className={styles.section}
      aria-labelledby="agent-type-heading"
    >
      <div className={styles.intro}>
        <h2 id="agent-type-heading" className={styles.title}>
          Step 1 · Choose consultation type
        </h2>
        <p className={styles.lead}>
          This sets the conversation focus. Any agent you pick next can use this
          specialty.
        </p>
      </div>

      <div
        className={styles.grid}
        role="radiogroup"
        aria-labelledby="agent-type-heading"
        aria-required="true"
      >
        {AGENT_SPECIALTY_OPTIONS.map((option) => {
          const isSelected = selectedSpecialty === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={consultationActive}
              className={`${styles.card} ${isSelected ? styles.cardSelected : ""}`}
              onClick={() => setSelectedSpecialty(option.id)}
            >
              <span className={styles.icon} aria-hidden>
                {option.icon}
              </span>
              <span className={styles.cardTitle}>{option.title}</span>
              <span className={styles.cardDesc}>{option.description}</span>
            </button>
          );
        })}
      </div>

    </section>
  );
}
