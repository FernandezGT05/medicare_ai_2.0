import { useCallback, useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  deleteDashboardVisit,
  fetchDashboard,
  fetchOnboarding,
  finalizeConsultationRecord,
  finalizePendingConsultation,
  regenerateConsultationSummary,
} from "../api/client";
import { DashboardFollowUps } from "../components/dashboard/DashboardFollowUps";
import { DashboardHealth } from "../components/dashboard/DashboardHealth";
import { DashboardHistory } from "../components/dashboard/DashboardHistory";
import { DashboardOverview } from "../components/dashboard/DashboardOverview";
import { DashboardProfile } from "../components/dashboard/DashboardProfile";
import { DashboardReminders } from "../components/dashboard/DashboardReminders";
import { DashboardSidebar } from "../components/dashboard/DashboardSidebar";
import {
  DEFAULT_DASHBOARD_TAB,
  isDashboardTabId,
  type DashboardTabId,
} from "../components/dashboard/dashboardTabs";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { useAuth } from "../context/AuthContext";
import { useSession } from "../context/SessionContext";
import type {
  DashboardStats,
  FollowUpItem,
  HistoryListItem,
  HistoryPendingItem,
} from "../types/api";
import layout from "../App.module.css";
import styles from "./DashboardPage.module.css";

const EMPTY_STATS: DashboardStats = {
  totalVisits: 0,
  completedVisits: 0,
  pendingVisits: 0,
  lastVisitAt: null,
  specialtyBreakdown: [],
  recentTopics: [],
};

export function DashboardPage() {
  const { isAuthenticated, isSigningOut, authReady, user } = useAuth();
  const { setPriorConsultationId } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get("tab");
  const activeTab: DashboardTabId = isDashboardTabId(tabParam)
    ? tabParam
    : DEFAULT_DASHBOARD_TAB;

  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [items, setItems] = useState<HistoryListItem[]>([]);
  const [pending, setPending] = useState<HistoryPendingItem[]>([]);
  const [followUps, setFollowUps] = useState<FollowUpItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [finalizingId, setFinalizingId] = useState<string | null>(null);
  const [finalizingLatest, setFinalizingLatest] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    void fetchOnboarding()
      .then((data) => setNeedsOnboarding(!data.completed))
      .catch(() => setNeedsOnboarding(false))
      .finally(() => setOnboardingChecked(true));
  }, [isAuthenticated]);

  const setActiveTab = (tab: DashboardTabId) => {
    setSearchParams(tab === DEFAULT_DASHBOARD_TAB ? {} : { tab }, { replace: true });
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDashboard();
      setStats(data.stats ?? EMPTY_STATS);
      setItems(data.history ?? []);
      setPending(data.pending ?? []);
      setFollowUps(data.followUps ?? []);
      setSelectedId((prev) =>
        prev && data.history.some((h) => h.consultationId === prev)
          ? prev
          : (data.history[0]?.consultationId ?? null),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard.");
      setStats(EMPTY_STATS);
      setItems([]);
      setPending([]);
      setFollowUps([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      void load();
    }
  }, [isAuthenticated, load]);

  useEffect(() => {
    const onFocus = () => {
      if (isAuthenticated) {
        void load();
      }
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [isAuthenticated, load]);

  if (!authReady) {
    return null;
  }

  if (!isAuthenticated) {
    if (isSigningOut) return null;
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  if (onboardingChecked && needsOnboarding) {
    return <Navigate to="/onboarding" state={{ from: location }} replace />;
  }

  const handleUseForConsultation = () => {
    const selected = items.find((i) => i.consultationId === selectedId);
    if (!selected) return;
    setPriorConsultationId(selected.consultationId);
    navigate("/consultation");
  };

  const handleFinalize = async (consultationId: string) => {
    setFinalizingId(consultationId);
    setError(null);
    try {
      await finalizeConsultationRecord(consultationId);
      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not create summary.",
      );
    } finally {
      setFinalizingId(null);
    }
  };

  const handleFinalizeLatest = async () => {
    setFinalizingLatest(true);
    setError(null);
    try {
      await finalizePendingConsultation();
      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not create summary.",
      );
    } finally {
      setFinalizingLatest(false);
    }
  };

  const handleRegenerate = async (consultationId: string) => {
    setRegeneratingId(consultationId);
    setError(null);
    try {
      await regenerateConsultationSummary(consultationId);
      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not regenerate summary.",
      );
    } finally {
      setRegeneratingId(null);
    }
  };

  const handleDelete = async (consultationId: string) => {
    if (!window.confirm("Delete this visit from your medical history?")) return;
    setDeletingId(consultationId);
    try {
      await deleteDashboardVisit(consultationId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeletingId(null);
    }
  };

  const renderPanel = () => {
    if (loading && activeTab !== "profile") {
      return (
        <p className={styles.loadingMessage} role="status">
          Loading dashboard…
        </p>
      );
    }

    switch (activeTab) {
      case "overview":
        return (
          <DashboardOverview stats={stats} pendingCount={pending.length} />
        );
      case "history":
        return (
          <DashboardHistory
            items={items}
            pending={pending}
            loading={loading}
            error={error}
            selectedId={selectedId}
            onSelect={setSelectedId}
            finalizingId={finalizingId}
            finalizingLatest={finalizingLatest}
            regeneratingId={regeneratingId}
            deletingId={deletingId}
            onFinalizeLatest={() => void handleFinalizeLatest()}
            onFinalize={(id) => void handleFinalize(id)}
            onRegenerate={(id) => void handleRegenerate(id)}
            onDelete={(id) => void handleDelete(id)}
            onUseForConsultation={handleUseForConsultation}
            onRefresh={() => void load()}
          />
        );
      case "follow-ups":
        return <DashboardFollowUps followUps={followUps} />;
      case "profile":
        return <DashboardProfile />;
      case "reminders":
        return <DashboardReminders />;
      case "health":
        return <DashboardHealth />;
      default:
        return (
          <DashboardOverview stats={stats} pendingCount={pending.length} />
        );
    }
  };

  return (
    <div className={layout.layout}>
      <Header />
      <main className={`${layout.main} ${styles.shell}`}>
        <div className={styles.pageIntro}>
          <p className={layout.eyebrow}>Your health hub</p>
          <h1 className={styles.pageTitle}>
            Care <em>dashboard</em>
          </h1>
          {user?.email && (
            <p className={styles.signedInAs}>Signed in as {user.email}</p>
          )}
        </div>

        <div className={styles.workspace}>
          <DashboardSidebar activeTab={activeTab} onTabChange={setActiveTab} />
          <div className={styles.content}>{renderPanel()}</div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
