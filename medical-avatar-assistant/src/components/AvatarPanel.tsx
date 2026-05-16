import { getCatalogAgent } from "../config/agentCatalog";
import { getSpecialtyOption } from "../config/agentSpecialties";
import { useAssistantLabel } from "../hooks/useAssistantLabel";
import { useConsultationCall } from "../context/ConsultationCallContext";
import { useSession } from "../context/SessionContext";
import styles from "./AvatarPanel.module.css";

export function AvatarPanel() {
  const {
    loading,
    connected,
    agent,
    consultationActive,
    selectedSpecialty,
    selectedAgentId,
    resolveError,
    isSetupComplete,
    clearAgent,
    startConsultation,
    endConsultation,
    finalizingVisit,
    finalizeError,
  } = useSession();
  const {
    callConnecting,
    callConnected,
    callError,
    videoContainerRef,
    audioContainerRef,
    toggleMicrophone,
    micEnabled,
  } = useConsultationCall();

  const assistantLabel = useAssistantLabel();
  const catalogAgent = selectedAgentId
    ? getCatalogAgent(selectedAgentId)
    : null;
  const specialtyLabel = selectedSpecialty
    ? getSpecialtyOption(selectedSpecialty)?.title
    : null;

  const showLiveSession =
    consultationActive && (callConnecting || callConnected);
  const canStart = isSetupComplete && connected && !loading && !consultationActive;

  return (
    <section
      id="consultation"
      className={styles.panel}
      aria-label="Video consultation"
    >
      <audio ref={audioContainerRef} className={styles.agentAudio} hidden />

      <div className={styles.panelHeader}>
        <div className={styles.statusRow}>
          <span
            className={`${styles.liveDot} ${callConnected ? styles.liveDotActive : ""}`}
            aria-hidden
          />
          <span className={styles.statusLabel}>
            {loading
              ? "Connecting…"
              : callConnecting
                ? "Joining session…"
                : callConnected
                  ? `Session with ${assistantLabel}`
                  : consultationActive
                    ? "Starting session…"
                    : connected
                      ? "Ready to connect"
                      : "Offline"}
          </span>
        </div>
        {!consultationActive && (
          <button
            type="button"
            className={styles.changeAgentBtn}
            onClick={clearAgent}
          >
            Change agent
          </button>
        )}
      </div>

      <div
        className={`${styles.viewport} ${showLiveSession ? styles.viewportLive : ""}`}
      >
        {showLiveSession ? (
          <>
            <div
              ref={videoContainerRef}
              className={styles.videoStage}
            />
            {callConnected && (
              <div className={styles.viewportControls}>
                <button
                  type="button"
                  className={`${styles.mediaBtn} ${!micEnabled ? styles.mediaBtnOff : ""}`}
                  onClick={() => void toggleMicrophone()}
                  aria-label={micEnabled ? "Mute microphone" : "Unmute microphone"}
                  title={micEnabled ? "Mute microphone" : "Unmute microphone"}
                >
                  <MicIcon muted={!micEnabled} />
                  <span>{micEnabled ? "Mute" : "Unmute"}</span>
                </button>
              </div>
            )}
          </>
        ) : (
          <AvatarPlaceholder
            agentName={assistantLabel}
            connected={connected}
            loading={loading}
          />
        )}
      </div>

      <div className={styles.panelFooter}>
        {consultationActive ? (
          <button
            type="button"
            className={styles.endBtn}
            onClick={endConsultation}
          >
            End consultation
          </button>
        ) : (
          <button
            type="button"
            className={styles.startBtn}
            disabled={!canStart}
            onClick={startConsultation}
          >
            <span className={styles.startBtnIcon} aria-hidden>
              ▶
            </span>
            Begin consultation
          </button>
        )}
        <p className={styles.hint}>
          {finalizingVisit ? (
            "Saving visit summary…"
          ) : finalizeError ? (
            finalizeError
          ) : callError ? (
            callError
          ) : consultationActive ? (
            callConnected ? (
              <>
                Connected to agent <code className={styles.agentId}>{agent?.id}</code>.
                Agent replies appear in the chat as they speak. Allow microphone access
                when prompted.
              </>
            ) : (
              "Connecting to Beyond Presence…"
            )
          ) : resolveError ? (
            resolveError
          ) : connected ? (
            specialtyLabel && catalogAgent
              ? `${catalogAgent.displayName} · ${specialtyLabel} — press Begin consultation.`
              : "Press Begin consultation to start your session."
          ) : (
            "Connecting to your agent…"
          )}
        </p>
      </div>
    </section>
  );
}

function AvatarPlaceholder({
  agentName,
  connected,
  loading,
}: {
  agentName: string;
  connected: boolean;
  loading: boolean;
}) {
  return (
    <div className={styles.placeholder}>
      <div className={styles.avatarRing}>
        <div className={styles.avatarSilhouette}>
          <svg viewBox="0 0 120 140" fill="none" aria-hidden>
            <ellipse cx="60" cy="42" rx="28" ry="32" fill="currentColor" />
            <path
              d="M20 140c4-36 28-52 40-52s36 16 40 52"
              fill="currentColor"
            />
          </svg>
        </div>
        <span className={styles.pulse} aria-hidden />
      </div>
      <p className={styles.placeholderTitle}>{agentName}</p>
      <p className={styles.placeholderSub}>
        {loading
          ? "Connecting to Beyond Presence…"
          : connected
            ? "Press Begin consultation to start your session"
            : "Waiting for API connection"}
      </p>
      <div className={styles.waveform} aria-hidden>
        {Array.from({ length: 24 }).map((_, i) => (
          <span
            key={i}
            className={`${styles.waveBar} ${connected ? styles.waveBarActive : ""}`}
            style={{ animationDelay: `${i * 0.05}s` }}
          />
        ))}
      </div>
    </div>
  );
}

function MicIcon({ muted }: { muted: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      {muted ? (
        <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5v-1.5h1.5c0 1.71 1.39 3.1 3.1 3.1 1.27 0 2.36-.77 2.85-1.87l2.05 2.05V19H19v1.5H5V23h14v-2.5h1.5V19h-2.73L4.27 3z" />
      ) : (
        <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z" />
      )}
    </svg>
  );
}
