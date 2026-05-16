import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { HistoryListItem, HistoryPendingItem } from "../../types/api";
import { matchesHistorySearch } from "./historySearch";
import panel from "./DashboardPanel.module.css";
import searchStyles from "./DashboardHistory.module.css";
import page from "../../pages/DashboardPage.module.css";

function formatVisitDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

interface DashboardHistoryProps {
  items: HistoryListItem[];
  pending: HistoryPendingItem[];
  loading: boolean;
  error: string | null;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  finalizingId: string | null;
  finalizingLatest: boolean;
  regeneratingId: string | null;
  deletingId: string | null;
  onFinalizeLatest: () => void;
  onFinalize: (id: string) => void;
  onRegenerate: (id: string) => void;
  onDelete: (id: string) => void;
  onUseForConsultation: () => void;
  onRefresh: () => void;
}

export function DashboardHistory({
  items,
  pending,
  loading,
  error,
  selectedId,
  onSelect,
  finalizingId,
  finalizingLatest,
  regeneratingId,
  deletingId,
  onFinalizeLatest,
  onFinalize,
  onRegenerate,
  onDelete,
  onUseForConsultation,
  onRefresh,
}: DashboardHistoryProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredItems = useMemo(
    () => items.filter((item) => matchesHistorySearch(searchQuery, item)),
    [items, searchQuery],
  );

  const filteredPending = useMemo(
    () => pending.filter((item) => matchesHistorySearch(searchQuery, item)),
    [pending, searchQuery],
  );

  const hasSearch = searchQuery.trim().length > 0;
  const displayItems = hasSearch ? filteredItems : items;
  const displayPending = hasSearch ? filteredPending : pending;
  const selected =
    displayItems.find((i) => i.consultationId === selectedId) ?? null;

  useEffect(() => {
    if (!hasSearch) return;
    if (
      selectedId &&
      filteredItems.some((item) => item.consultationId === selectedId)
    ) {
      return;
    }
    const nextId = filteredItems[0]?.consultationId ?? null;
    if (nextId !== selectedId) {
      onSelect(nextId);
    }
  }, [filteredItems, hasSearch, onSelect, selectedId]);

  const handleSelect = (id: string) => {
    onSelect(id);
  };

  const clearSearch = () => setSearchQuery("");

  return (
    <div className={panel.panel} role="tabpanel" aria-label="Medical history">
      <header className={panel.panelHeader}>
        <h2 className={panel.panelTitle}>History</h2>
        <p className={panel.panelSubhead}>
          Summaries from past consultations. Select a visit to review details or
          carry context into your next session.
        </p>
      </header>

      {loading ? (
        <p className={page.message} role="status">
          Loading history…
        </p>
      ) : (
        <>
          <section className={page.pending} aria-label="Save visit summary">
            <h3 className={page.pendingTitle}>Save a visit summary</h3>
            <p className={page.pendingHint}>
              After you finish a Bey consultation, wait about 10 seconds, then
              generate your summary here. Use <strong>End consultation</strong> on
              the consultation page when you are done chatting.
            </p>
            <div className={page.pendingActions}>
              <button
                type="button"
                className={page.btnPrimary}
                disabled={finalizingLatest || Boolean(finalizingId)}
                onClick={onFinalizeLatest}
              >
                {finalizingLatest
                  ? "Generating summary…"
                  : "Generate summary for latest visit"}
              </button>
              <button
                type="button"
                className={page.btnSecondary}
                onClick={onRefresh}
              >
                Refresh
              </button>
            </div>

            {displayPending.length > 0 && (
              <ul className={page.pendingList}>
                {displayPending.map((p) => (
                  <li key={p.consultationId} className={page.pendingItem}>
                    <div>
                      <span className={page.listDate}>
                        {formatVisitDate(p.startedAt)}
                      </span>
                      <span className={page.listMeta}>
                        {p.specialtyLabel} · {p.agentLabel} · {p.status}
                      </span>
                    </div>
                    <button
                      type="button"
                      className={page.btnOutline}
                      disabled={
                        finalizingId === p.consultationId || finalizingLatest
                      }
                      onClick={() => onFinalize(p.consultationId)}
                    >
                      {finalizingId === p.consultationId
                        ? "Generating…"
                        : "Generate for this visit"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {error && (
            <div className={page.messageError} role="alert">
              <p>{error}</p>
            </div>
          )}

          {(items.length > 0 || pending.length > 0) && (
            <section
              className={searchStyles.searchBar}
              aria-label="Search visit history"
            >
              <div className={searchStyles.searchRow}>
                <input
                  type="search"
                  className={searchStyles.searchInput}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search summaries, topics, specialty, agent…"
                  aria-label="Search visit history"
                />
                {hasSearch && (
                  <button
                    type="button"
                    className={searchStyles.searchClear}
                    onClick={clearSearch}
                  >
                    Clear
                  </button>
                )}
              </div>
              {hasSearch && (
                <p className={searchStyles.searchMeta} role="status">
                  {filteredItems.length} visit
                  {filteredItems.length === 1 ? "" : "s"} found
                  {filteredPending.length > 0 &&
                    ` · ${filteredPending.length} pending`}
                </p>
              )}
            </section>
          )}

          {items.length === 0 && pending.length === 0 && !error ? (
            <div className={page.empty}>
              <p>No completed summaries yet.</p>
              <Link to="/consultation" className={page.btnPrimary}>
                Start a consultation
              </Link>
            </div>
          ) : hasSearch &&
            filteredItems.length === 0 &&
            filteredPending.length === 0 ? (
            <div className={searchStyles.searchEmpty}>
              <p>No visits match &ldquo;{searchQuery.trim()}&rdquo;.</p>
              <button
                type="button"
                className={page.btnSecondary}
                onClick={clearSearch}
              >
                Clear search
              </button>
            </div>
          ) : displayItems.length > 0 ? (
            <div className={page.grid}>
              <ul className={page.list} aria-label="Past visits">
                {displayItems.map((item) => (
                  <li key={item.consultationId}>
                    <button
                      type="button"
                      className={`${page.listItem} ${
                        selectedId === item.consultationId
                          ? page.listItemActive
                          : ""
                      }`}
                      onClick={() => handleSelect(item.consultationId)}
                    >
                      <span className={page.listDate}>
                        {formatVisitDate(item.startedAt)}
                      </span>
                      <span className={page.listMeta}>
                        {item.specialtyLabel} · {item.agentLabel}
                      </span>
                      <span className={page.listPreview}>{item.summary}</span>
                    </button>
                  </li>
                ))}
              </ul>

              {selected && (
                <article className={page.detail} aria-label="Visit details">
                  <header className={page.detailHeader}>
                    <h3 className={page.detailTitle}>
                      {formatVisitDate(selected.startedAt)}
                    </h3>
                    <p className={page.detailMeta}>
                      {selected.specialtyLabel} · {selected.agentLabel}
                    </p>
                  </header>

                  <section>
                    <h4 className={page.sectionLabel}>Summary</h4>
                    <p>{selected.summary}</p>
                  </section>

                  {selected.topics.length > 0 && (
                    <section>
                      <h4 className={page.sectionLabel}>Topics</h4>
                      <ul className={page.bullets}>
                        {selected.topics.map((t) => (
                          <li key={t}>{t}</li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {selected.adviceGiven.length > 0 && (
                    <section>
                      <h4 className={page.sectionLabel}>Guidance discussed</h4>
                      <ul className={page.bullets}>
                        {selected.adviceGiven.map((a) => (
                          <li key={a}>{a}</li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {selected.followUp && (
                    <section>
                      <h4 className={page.sectionLabel}>Follow-up</h4>
                      <p>{selected.followUp}</p>
                    </section>
                  )}

                  <div className={page.actions}>
                    <button
                      type="button"
                      className={page.btnPrimary}
                      onClick={onUseForConsultation}
                    >
                      Use for next consultation
                    </button>
                    <button
                      type="button"
                      className={page.btnSecondary}
                      disabled={regeneratingId === selected.consultationId}
                      onClick={() => onRegenerate(selected.consultationId)}
                    >
                      {regeneratingId === selected.consultationId
                        ? "Regenerating…"
                        : "Regenerate summary"}
                    </button>
                    <button
                      type="button"
                      className={page.btnDanger}
                      disabled={deletingId === selected.consultationId}
                      onClick={() => onDelete(selected.consultationId)}
                    >
                      {deletingId === selected.consultationId
                        ? "Deleting…"
                        : "Delete visit"}
                    </button>
                  </div>
                </article>
              )}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
