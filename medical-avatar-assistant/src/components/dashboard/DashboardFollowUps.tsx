import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { FollowUpItem } from "../../types/api";
import { useSession } from "../../context/SessionContext";
import {
  formatFollowUpDate,
  formatFollowUpDateShort,
  normalizeFollowUpItem,
  stepsForItem,
} from "./followUpDisplay";
import panel from "./DashboardPanel.module.css";
import styles from "./DashboardFollowUps.module.css";

interface DashboardFollowUpsProps {
  followUps: FollowUpItem[];
}

function NextStepsList({
  item,
  className,
  itemClassName,
}: {
  item: FollowUpItem;
  className?: string;
  itemClassName?: string;
}) {
  const steps = stepsForItem(item);
  if (steps.length === 0) return null;

  return (
    <ul className={className}>
      {steps.map((step) => (
        <li key={step} className={itemClassName}>
          {step}
        </li>
      ))}
    </ul>
  );
}

export function DashboardFollowUps({ followUps }: DashboardFollowUpsProps) {
  const navigate = useNavigate();
  const { setPriorConsultationId } = useSession();
  const [historyOpen, setHistoryOpen] = useState(false);

  const normalized = (followUps ?? []).map((item) => normalizeFollowUpItem(item));
  const latest = normalized[0] ?? null;
  const history = normalized.slice(1);

  const handleUseVisit = (consultationId: string) => {
    setPriorConsultationId(consultationId);
    navigate("/consultation");
  };

  return (
    <div className={panel.panel} role="tabpanel" aria-label="Follow-ups">
      <header className={panel.panelHeader}>
        <h2 className={panel.panelTitle}>Follow-ups</h2>
        <p className={panel.panelSubhead}>
          Next steps from your consultation summaries — start with your most
          recent visit below.
        </p>
      </header>

      {normalized.length === 0 ? (
        <p className={styles.empty}>
          No next steps yet. After you complete a consultation and generate a
          summary, actionable follow-ups from that visit will appear here.{" "}
          <Link to="/consultation">Start a consultation</Link> or open the{" "}
          <strong>History</strong> tab to generate a pending summary.
        </p>
      ) : (
        <>
          <section className={styles.latest} aria-label="Most recent next steps">
            <span className={styles.latestBadge}>Latest visit</span>
            <h3 className={styles.latestTitle}>What to do next</h3>
            {latest && (
              <>
                <p className={styles.latestMeta}>
                  From your visit on{" "}
                  <strong>{formatFollowUpDate(latest.startedAt)}</strong>
                  {" · "}
                  <strong>{latest.specialtyLabel}</strong>
                  {" · "}
                  {latest.agentLabel}
                </p>

                <p className={styles.stepsHeading}>Your next steps</p>
                {stepsForItem(latest).length > 0 ? (
                  <NextStepsList
                    item={latest}
                    className={styles.stepsList}
                    itemClassName={styles.stepItem}
                  />
                ) : (
                  <p className={styles.noSteps}>
                    No specific next steps were captured for this visit. Check
                    the full summary in History for guidance discussed.
                  </p>
                )}

                <div className={styles.latestActions}>
                  <button
                    type="button"
                    className={styles.btnPrimary}
                    onClick={() => handleUseVisit(latest.consultationId)}
                  >
                    Continue with this context
                  </button>
                  <button
                    type="button"
                    className={styles.btnSecondary}
                    onClick={() => navigate("/dashboard?tab=history")}
                  >
                    View full summary
                  </button>
                </div>
              </>
            )}
          </section>

          {history.length > 0 && (
            <section className={styles.historySection} aria-label="Previous follow-ups">
              <button
                type="button"
                className={styles.historyToggle}
                aria-expanded={historyOpen}
                onClick={() => setHistoryOpen((open) => !open)}
              >
                <span>
                  <span className={styles.historyToggleLabel}>
                    Previous follow-ups
                  </span>
                  <span className={styles.historyToggleHint}>
                    {" "}
                    ({history.length} older visit
                    {history.length === 1 ? "" : "s"})
                  </span>
                </span>
                <span
                  className={`${styles.chevron} ${historyOpen ? styles.chevronOpen : ""}`}
                  aria-hidden
                >
                  ▼
                </span>
              </button>

              {historyOpen && (
                <ul className={styles.historyList}>
                  {history.map((item) => {
                    const steps = stepsForItem(item);
                    const preview =
                      steps[0] ?? item.followUp ?? "No steps recorded";
                    return (
                      <li key={item.consultationId} className={styles.historyCard}>
                        <div className={styles.historyCardMeta}>
                          <span className={styles.historyDate}>
                            {formatFollowUpDateShort(item.startedAt)}
                          </span>
                          <span className={styles.historySpecialty}>
                            {item.specialtyLabel}
                          </span>
                        </div>
                        <p className={styles.historyPreview}>{preview}</p>
                        {steps.length > 1 && (
                          <ul className={styles.historySteps}>
                            {steps.slice(1, 4).map((step) => (
                              <li key={step}>{step}</li>
                            ))}
                            {steps.length > 4 && (
                              <li>+{steps.length - 4} more</li>
                            )}
                          </ul>
                        )}
                        <button
                          type="button"
                          className={styles.linkBtn}
                          onClick={() => handleUseVisit(item.consultationId)}
                        >
                          Use for next consultation
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
