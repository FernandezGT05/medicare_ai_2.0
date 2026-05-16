import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  createHealthLogEntry,
  deleteHealthLogEntry,
  fetchHealthLog,
} from "../../api/client";
import type { HealthLogEntry, HealthLogKind, HealthProfile } from "../../types/api";
import {
  formatDashboardDateTime,
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from "./dashboardDate";
import panel from "./DashboardPanel.module.css";
import styles from "./DashboardShared.module.css";

const KIND_OPTIONS: { value: HealthLogKind; label: string }[] = [
  { value: "medication", label: "Medication" },
  { value: "vital", label: "Vital sign" },
  { value: "symptom", label: "Symptom" },
  { value: "note", label: "Note" },
];

const KIND_LABEL: Record<HealthLogKind, string> = {
  medication: "Medication",
  vital: "Vital",
  symptom: "Symptom",
  note: "Note",
};

type FilterKind = HealthLogKind | "all";

export function DashboardHealth() {
  const [entries, setEntries] = useState<HealthLogEntry[]>([]);
  const [profile, setProfile] = useState<HealthProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKind>("all");
  const [kind, setKind] = useState<HealthLogKind>("vital");
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState("");
  const [notes, setNotes] = useState("");
  const [recordedAt, setRecordedAt] = useState(() => toDatetimeLocalValue());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchHealthLog();
      setEntries(data.entries);
      setProfile(data.profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load health log.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await createHealthLogEntry({
        kind,
        title: title.trim(),
        value: value.trim() || null,
        unit: unit.trim() || null,
        notes: notes.trim() || null,
        recordedAt: fromDatetimeLocalValue(recordedAt),
      });
      setTitle("");
      setValue("");
      setUnit("");
      setNotes("");
      setRecordedAt(toDatetimeLocalValue());
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save entry.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteHealthLogEntry(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete entry.");
    }
  };

  const filtered =
    filter === "all" ? entries : entries.filter((e) => e.kind === filter);

  const allergies = profile?.allergies ?? [];
  const profileBits: string[] = [];
  if (allergies.length > 0) {
    profileBits.push(`Allergies: ${allergies.join(", ")}`);
  }
  if (profile?.weightKg != null) {
    profileBits.push(`Weight: ${profile.weightKg} kg`);
  }
  if (profile?.heightCm != null) {
    profileBits.push(`Height: ${profile.heightCm} cm`);
  }

  return (
    <div className={panel.panel} role="tabpanel" aria-label="Health log">
      <header className={panel.panelHeader}>
        <h2 className={panel.panelTitle}>Health log</h2>
        <p className={panel.panelSubhead}>
          Track medications, vitals, symptoms, and notes over time.
        </p>
      </header>

      {profileBits.length > 0 && (
        <div className={styles.profileSummary}>
          <p className={styles.profileSummaryTitle}>From your profile</p>
          <ul className={styles.profileList}>
            {profileBits.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      <form className={styles.form} onSubmit={(e) => void handleCreate(e)}>
        <h3 className={styles.formTitle}>Add entry</h3>
        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="log-kind">
              Type
            </label>
            <select
              id="log-kind"
              className={styles.select}
              value={kind}
              onChange={(e) => setKind(e.target.value as HealthLogKind)}
            >
              {KIND_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="log-date">
              Date & time
            </label>
            <input
              id="log-date"
              type="datetime-local"
              className={styles.input}
              value={recordedAt}
              onChange={(e) => setRecordedAt(e.target.value)}
              required
            />
          </div>
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="log-title">
            Title
          </label>
          <input
            id="log-title"
            type="text"
            className={styles.input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              kind === "vital"
                ? "e.g. Blood pressure"
                : kind === "medication"
                  ? "e.g. Ibuprofen"
                  : "Short description"
            }
            maxLength={120}
            required
          />
        </div>
        {(kind === "vital" || kind === "medication") && (
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="log-value">
                {kind === "vital" ? "Reading" : "Dose"}
              </label>
              <input
                id="log-value"
                type="text"
                className={styles.input}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={kind === "vital" ? "120/80" : "500 mg"}
                maxLength={80}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="log-unit">
                Unit
              </label>
              <input
                id="log-unit"
                type="text"
                className={styles.input}
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder={kind === "vital" ? "mmHg" : "mg"}
                maxLength={20}
              />
            </div>
          </div>
        )}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="log-notes">
            Notes (optional)
          </label>
          <textarea
            id="log-notes"
            className={styles.textarea}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={500}
            rows={2}
          />
        </div>
        <button type="submit" className={styles.btnPrimary} disabled={saving}>
          {saving ? "Saving…" : "Add entry"}
        </button>
      </form>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <div className={styles.filterRow}>
        <button
          type="button"
          className={`${styles.filterChip} ${filter === "all" ? styles.filterChipActive : ""}`}
          onClick={() => setFilter("all")}
        >
          All
        </button>
        {KIND_OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            className={`${styles.filterChip} ${filter === o.value ? styles.filterChipActive : ""}`}
            onClick={() => setFilter(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className={styles.empty}>Loading health log…</p>
      ) : filtered.length === 0 ? (
        <p className={styles.empty}>
          No entries yet{filter !== "all" ? " for this type" : ""}. Add one above
          to start tracking.
        </p>
      ) : (
        <ul className={styles.list}>
          {filtered.map((entry) => (
            <li key={entry.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <h4 className={styles.cardTitle}>{entry.title}</h4>
                <span className={styles.badge}>{KIND_LABEL[entry.kind]}</span>
              </div>
              <p className={styles.meta}>
                {formatDashboardDateTime(entry.recordedAt)}
                {entry.value && (
                  <>
                    {" "}
                    · <strong>{entry.value}</strong>
                    {entry.unit ? ` ${entry.unit}` : ""}
                  </>
                )}
              </p>
              {entry.notes && <p className={styles.notes}>{entry.notes}</p>}
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.btnDanger}
                  onClick={() => void handleDelete(entry.id)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
