import { useState } from "react";
import { fetchDashboard, fetchDashboardDetail } from "../api/client";
import { downloadVisitSummary } from "../lib/visitSummaryDownload";
import { useSession } from "../context/SessionContext";
import styles from "./PatientResources.module.css";

export function PatientResources() {
  const { consultationActive, activeConsultationId, requestNearbyPlaces } =
    useSession();
  const [message, setMessage] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const handleFindClinic = () => {
    setMessage(null);
    document.getElementById("nearby-resources")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    if (!consultationActive) {
      setMessage(
        "Start your visit first, then tap Doctor / clinic under Nearby resources.",
      );
      return;
    }
    void requestNearbyPlaces("gp");
  };

  const handleDownloadSummary = async () => {
    setMessage(null);
    setDownloading(true);
    try {
      const dashboard = await fetchDashboard();
      const consultationId =
        dashboard.history.find((h) => h.summary.trim())?.consultationId ??
        activeConsultationId;

      if (!consultationId) {
        setMessage(
          "No saved summary yet. End your visit or generate a summary from the Dashboard → History tab.",
        );
        return;
      }

      const detail = await fetchDashboardDetail(consultationId);
      downloadVisitSummary(detail);
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : "Could not download summary. Try again from Dashboard → History.",
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div id="patient-resources" className={styles.card}>
      <h2 className={styles.title}>Patient resources</h2>
      <ul className={styles.list}>
        <li>
          <button
            type="button"
            className={styles.action}
            onClick={handleFindClinic}
          >
            Find a clinic near you
          </button>
          <p className={styles.hint}>
            Opens nearby search for doctors and clinics.
          </p>
        </li>
        <li>
          <button
            type="button"
            className={styles.action}
            disabled={downloading}
            onClick={() => void handleDownloadSummary()}
          >
            {downloading ? "Preparing download…" : "Download visit summary"}
          </button>
          <p className={styles.hint}>
            Saves your latest completed visit as a text file.
          </p>
        </li>
      </ul>
      {message && (
        <p className={styles.message} role="status">
          {message}
        </p>
      )}
    </div>
  );
}
