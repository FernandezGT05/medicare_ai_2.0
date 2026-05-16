import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  createReminder,
  deleteReminder,
  fetchReminders,
  updateReminder,
} from "../../api/client";
import type { ReminderItem, ReminderKind } from "../../types/api";
import {
  formatDashboardDateTime,
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from "./dashboardDate";
import panel from "./DashboardPanel.module.css";
import styles from "./DashboardShared.module.css";

const KIND_OPTIONS: { value: ReminderKind; label: string }[] = [
  { value: "appointment", label: "Appointment" },
  { value: "medication", label: "Medication" },
  { value: "follow_up", label: "Follow-up" },
  { value: "custom", label: "Custom" },
];

const KIND_LABEL: Record<ReminderKind, string> = {
  appointment: "Appointment",
  medication: "Medication",
  follow_up: "Follow-up",
  custom: "Custom",
};

export function DashboardReminders() {
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<ReminderKind>("appointment");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueAt, setDueAt] = useState(() => toDatetimeLocalValue());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchReminders();
      setReminders(data.reminders);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reminders.");
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
      await createReminder({
        kind,
        title: title.trim(),
        notes: notes.trim() || null,
        dueAt: fromDatetimeLocalValue(dueAt),
      });
      setTitle("");
      setNotes("");
      setDueAt(toDatetimeLocalValue());
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save reminder.");
    } finally {
      setSaving(false);
    }
  };

  const toggleComplete = async (item: ReminderItem) => {
    try {
      await updateReminder(item.id, { completed: !item.completedAt });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update reminder.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteReminder(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete reminder.");
    }
  };

  const upcoming = reminders.filter((r) => !r.completedAt);
  const completed = reminders.filter((r) => r.completedAt);

  return (
    <div className={panel.panel} role="tabpanel" aria-label="Reminders">
      <header className={panel.panelHeader}>
        <h2 className={panel.panelTitle}>Reminders</h2>
        <p className={panel.panelSubhead}>
          Appointments, medications, and care tasks — tied to your schedule.
        </p>
      </header>

      <form className={styles.form} onSubmit={(e) => void handleCreate(e)}>
        <h3 className={styles.formTitle}>Add reminder</h3>
        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="reminder-kind">
              Type
            </label>
            <select
              id="reminder-kind"
              className={styles.select}
              value={kind}
              onChange={(e) => setKind(e.target.value as ReminderKind)}
            >
              {KIND_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="reminder-due">
              Due
            </label>
            <input
              id="reminder-due"
              type="datetime-local"
              className={styles.input}
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              required
            />
          </div>
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="reminder-title">
            Title
          </label>
          <input
            id="reminder-title"
            type="text"
            className={styles.input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Refill prescription"
            maxLength={120}
            required
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="reminder-notes">
            Notes (optional)
          </label>
          <textarea
            id="reminder-notes"
            className={styles.textarea}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={500}
            rows={2}
          />
        </div>
        <button type="submit" className={styles.btnPrimary} disabled={saving}>
          {saving ? "Saving…" : "Add reminder"}
        </button>
      </form>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className={styles.empty}>Loading reminders…</p>
      ) : reminders.length === 0 ? (
        <p className={styles.empty}>
          No reminders yet. Add one above to track appointments, medications, or
          follow-ups.
        </p>
      ) : (
        <>
          {upcoming.length > 0 && (
            <section>
              <h3 className={styles.sectionTitle}>Upcoming</h3>
              <ul className={styles.list}>
                {upcoming.map((item) => (
                  <ReminderCard
                    key={item.id}
                    item={item}
                    onToggle={() => void toggleComplete(item)}
                    onDelete={() => void handleDelete(item.id)}
                  />
                ))}
              </ul>
            </section>
          )}
          {completed.length > 0 && (
            <section style={{ marginTop: "1.5rem" }}>
              <h3 className={styles.sectionTitle}>Completed</h3>
              <ul className={styles.list}>
                {completed.map((item) => (
                  <ReminderCard
                    key={item.id}
                    item={item}
                    done
                    onToggle={() => void toggleComplete(item)}
                    onDelete={() => void handleDelete(item.id)}
                  />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function ReminderCard({
  item,
  done,
  onToggle,
  onDelete,
}: {
  item: ReminderItem;
  done?: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <li className={`${styles.card} ${done ? styles.cardDone : ""}`}>
      <div className={styles.cardHeader}>
        <h4
          className={`${styles.cardTitle} ${done ? styles.cardTitleDone : ""}`}
        >
          {item.title}
        </h4>
        <span className={styles.badge}>{KIND_LABEL[item.kind]}</span>
      </div>
      <p className={styles.meta}>Due {formatDashboardDateTime(item.dueAt)}</p>
      {item.notes && <p className={styles.notes}>{item.notes}</p>}
      <div className={styles.actions}>
        <button type="button" className={styles.btnGhost} onClick={onToggle}>
          {done ? "Mark incomplete" : "Mark done"}
        </button>
        <button type="button" className={styles.btnDanger} onClick={onDelete}>
          Delete
        </button>
      </div>
    </li>
  );
}
