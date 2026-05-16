import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  fetchPlacesForConsultation,
  fetchSession,
  finalizeConsultationRecord,
  finalizePendingConsultation,
  suggestPlaces,
  startConsultationRecord,
} from "../api/client";
import { getCatalogAgent } from "../config/agentCatalog";
import type { AgentSpecialtyId } from "../config/agentSpecialties";
import { useAuth } from "./AuthContext";
import type {
  PlaceSuggestion,
  PriorVisitContext,
  SessionAgent,
  SessionResponse,
} from "../types/api";

interface SessionContextValue {
  loading: boolean;
  connected: boolean;
  error: string | null;
  resolveError: string | null;
  agent: SessionAgent | null;
  embedUrl: string | null;
  priorVisit: PriorVisitContext | null;
  priorConsultationId: string | null;
  setPriorConsultationId: (id: string | null) => void;
  clearPriorConsultation: () => void;
  selectedSpecialty: AgentSpecialtyId | null;
  selectedAgentId: string | null;
  setSelectedSpecialty: (specialty: AgentSpecialtyId) => void;
  setSelectedAgentId: (catalogAgentId: string) => void;
  clearSpecialty: () => void;
  clearAgent: () => void;
  resetConsultationSetup: () => void;
  isSetupComplete: boolean;
  consultationActive: boolean;
  activeConsultationId: string | null;
  finalizingVisit: boolean;
  finalizeError: string | null;
  startConsultation: () => void;
  endConsultation: () => void;
  retry: () => void;
  nearbyPlaces: PlaceSuggestion[];
  placesLoading: boolean;
  placesMessage: string | null;
  placesBlocked: boolean;
  placesSearchArea: { label: string; lat: number; lng: number } | null;
  /** Consultation id that `nearbyPlaces` belong to (current visit only). */
  placesConsultationId: string | null;
  pendingPlaceIntent: string | null;
  setPendingPlaceIntent: (id: string | null) => void;
  requestNearbyPlaces: (intentId?: string) => Promise<void>;
  loadPlacesForConsultation: (consultationId: string) => Promise<void>;
  clearNearbyPlaces: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

const PRIOR_VISIT_ERRORS = [
  "Prior visit not found.",
  "Prior visit has no summary yet. Pick another visit from the dashboard.",
];

export function SessionProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [consultationActive, setConsultationActive] = useState(false);
  const [activeConsultationId, setActiveConsultationId] = useState<
    string | null
  >(null);
  const [finalizingVisit, setFinalizingVisit] = useState(false);
  const [finalizeError, setFinalizeError] = useState<string | null>(null);
  const [priorConsultationId, setPriorConsultationIdState] = useState<
    string | null
  >(null);
  const [selectedSpecialty, setSelectedSpecialtyState] =
    useState<AgentSpecialtyId | null>(null);
  const [selectedAgentId, setSelectedAgentIdState] = useState<string | null>(
    null,
  );
  const agentIdRef = useRef<string | null>(null);
  const prevUserSubRef = useRef<string | null>(null);
  const [nearbyPlaces, setNearbyPlaces] = useState<PlaceSuggestion[]>([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [placesMessage, setPlacesMessage] = useState<string | null>(null);
  const [placesBlocked, setPlacesBlocked] = useState(false);
  const [placesSearchArea, setPlacesSearchArea] = useState<{
    label: string;
    lat: number;
    lng: number;
  } | null>(null);
  const [placesConsultationId, setPlacesConsultationId] = useState<
    string | null
  >(null);
  const [pendingPlaceIntent, setPendingPlaceIntent] = useState<string | null>(
    null,
  );
  const lastConsultationIdRef = useRef<string | null>(null);

  const loadSession = useCallback(
    async (
      specialty: AgentSpecialtyId,
      catalogAgentId: string,
      priorId: string | null,
    ) => {
      setLoading(true);
      setError(null);
      setResolveError(null);
      try {
        let data = await fetchSession(specialty, catalogAgentId, priorId);
        if (
          !data.connected &&
          priorId &&
          data.error &&
          PRIOR_VISIT_ERRORS.includes(data.error)
        ) {
          setPriorConsultationIdState(null);
          data = await fetchSession(specialty, catalogAgentId, null);
        }
        setSession(data);
        if (!data.connected) {
          setError(data.error ?? "Could not connect to Beyond Presence.");
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load session.";
        setError(message);
        setSession(null);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const resetConsultationSetup = useCallback(() => {
    setSelectedSpecialtyState(null);
    setSelectedAgentIdState(null);
    setSession(null);
    setError(null);
    setResolveError(null);
    setConsultationActive(false);
    setActiveConsultationId(null);
    setFinalizeError(null);
    setLoading(false);
  }, []);

  const setPriorConsultationId = useCallback((id: string | null) => {
    setPriorConsultationIdState(id);
    setSession(null);
    setConsultationActive(false);
    setError(null);
    setResolveError(null);
  }, []);

  const clearPriorConsultation = useCallback(() => {
    setPriorConsultationId(null);
  }, [setPriorConsultationId]);

  const setSelectedSpecialty = useCallback((specialty: AgentSpecialtyId) => {
    setSelectedSpecialtyState(specialty);
    setSelectedAgentIdState(null);
    setSession(null);
    setError(null);
    setResolveError(null);
    setConsultationActive(false);
    setActiveConsultationId(null);
  }, []);

  const clearSpecialty = useCallback(() => {
    setSelectedSpecialtyState(null);
    setSelectedAgentIdState(null);
    setSession(null);
    setError(null);
    setResolveError(null);
    setConsultationActive(false);
    setActiveConsultationId(null);
  }, []);

  const setSelectedAgentId = useCallback((catalogAgentId: string) => {
    if (!getCatalogAgent(catalogAgentId)) {
      setResolveError("Unknown agent selection.");
      return;
    }
    setSelectedAgentIdState(catalogAgentId);
    setConsultationActive(false);
    setActiveConsultationId(null);
    setResolveError(null);
    setError(null);
  }, []);

  const clearAgent = useCallback(() => {
    setSelectedAgentIdState(null);
    setSession(null);
    setError(null);
    setResolveError(null);
    setConsultationActive(false);
    setActiveConsultationId(null);
  }, []);

  /** Prior visit ids are per-user; clear when signing out or switching Google accounts. */
  useEffect(() => {
    if (!isAuthenticated || !user) {
      prevUserSubRef.current = null;
      setPriorConsultationIdState(null);
      setSession(null);
      setConsultationActive(false);
      setActiveConsultationId(null);
      return;
    }

    if (prevUserSubRef.current && prevUserSubRef.current !== user.sub) {
      setPriorConsultationIdState(null);
      setSession(null);
      setError(null);
      setResolveError(null);
      setConsultationActive(false);
      setActiveConsultationId(null);
    }
    prevUserSubRef.current = user.sub;
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (!isAuthenticated || !selectedSpecialty || !selectedAgentId) {
      if (!isAuthenticated) {
        setSession(null);
      }
      if (!selectedSpecialty || !selectedAgentId) {
        setSession(null);
        setResolveError(null);
        setLoading(false);
      }
      return;
    }

    if (!getCatalogAgent(selectedAgentId)) {
      setResolveError("Please select a valid agent.");
      setSession(null);
      return;
    }

    void loadSession(
      selectedSpecialty,
      selectedAgentId,
      priorConsultationId,
    );
  }, [
    isAuthenticated,
    selectedSpecialty,
    selectedAgentId,
    priorConsultationId,
    loadSession,
  ]);

  const clearNearbyPlaces = useCallback(() => {
    setNearbyPlaces([]);
    setPlacesMessage(null);
    setPlacesBlocked(false);
    setPlacesSearchArea(null);
    setPlacesConsultationId(null);
    setPendingPlaceIntent(null);
  }, []);

  const loadPlacesForConsultation = useCallback(
    async (consultationId: string) => {
      setPlacesLoading(true);
      try {
        const { places } = await fetchPlacesForConsultation(consultationId);
        setNearbyPlaces(places);
        setPlacesBlocked(false);
        setPlacesMessage(
          places.length === 0
            ? "No saved suggestions for this visit yet."
            : null,
        );
      } catch (err) {
        setPlacesMessage(
          err instanceof Error ? err.message : "Could not load places.",
        );
      } finally {
        setPlacesLoading(false);
      }
    },
    [],
  );

  const requestNearbyPlaces = useCallback(
    async (intentId?: string) => {
      if (!selectedSpecialty) return;
      if (!consultationActive || !activeConsultationId) {
        setPlacesMessage("Start your visit first, then pick a category.");
        return;
      }
      setPlacesLoading(true);
      setPlacesMessage(null);
      try {
        const result = await suggestPlaces({
          specialty: selectedSpecialty,
          consultationId: activeConsultationId,
          intentId,
        });
        setNearbyPlaces(result.places);
        setPlacesConsultationId(activeConsultationId);
        setPlacesBlocked(result.blocked);
        setPlacesMessage(result.message);
        setPlacesSearchArea(result.searchArea ?? null);
        if (result.intent?.id) {
          setPendingPlaceIntent(result.intent.id);
        }
      } catch (err) {
        setPlacesMessage(
          err instanceof Error ? err.message : "Could not find nearby places.",
        );
        setNearbyPlaces([]);
        setPlacesConsultationId(null);
      } finally {
        setPlacesLoading(false);
      }
    },
    [selectedSpecialty, consultationActive, activeConsultationId],
  );

  const runFinalize = useCallback(async (consultationId: string | null) => {
    setFinalizingVisit(true);
    setFinalizeError(null);
    const id = consultationId;
    if (id) {
      lastConsultationIdRef.current = id;
    }
    try {
      if (consultationId) {
        await finalizeConsultationRecord(consultationId);
      } else {
        await finalizePendingConsultation();
      }
      clearNearbyPlaces();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not save visit summary.";
      setFinalizeError(message);
    } finally {
      setFinalizingVisit(false);
      setActiveConsultationId(null);
    }
  }, [clearNearbyPlaces]);

  const endConsultation = useCallback(() => {
    setConsultationActive(false);
    void runFinalize(activeConsultationId);
  }, [activeConsultationId, runFinalize]);

  const agentId = session?.agent?.id ?? null;

  useEffect(() => {
    if (
      consultationActive &&
      agentIdRef.current &&
      agentId &&
      agentIdRef.current !== agentId
    ) {
      setConsultationActive(false);
    }
    agentIdRef.current = agentId;
  }, [agentId, consultationActive]);

  const isSetupComplete = Boolean(
    selectedSpecialty &&
      selectedAgentId &&
      getCatalogAgent(selectedAgentId) &&
      !resolveError,
  );

  const startConsultation = useCallback(() => {
    if (!isSetupComplete || !selectedSpecialty || !selectedAgentId) return;
    if (!session?.connected || !session.agent?.id) return;

    void (async () => {
      try {
        const { consultationId } = await startConsultationRecord({
          specialty: selectedSpecialty,
          catalogAgentId: selectedAgentId,
        });
        setActiveConsultationId(consultationId);
        lastConsultationIdRef.current = consultationId;
        clearNearbyPlaces();
        setConsultationActive(true);
        if (window.location.pathname === "/consultation") {
          document.getElementById("consultation")?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Could not start visit record.";
        setError(message);
      }
    })();
  }, [session, isSetupComplete, selectedSpecialty, selectedAgentId, clearNearbyPlaces]);

  const retry = useCallback(() => {
    if (selectedSpecialty && selectedAgentId) {
      void loadSession(
        selectedSpecialty,
        selectedAgentId,
        priorConsultationId,
      );
    }
  }, [selectedSpecialty, selectedAgentId, priorConsultationId, loadSession]);

  const value = useMemo<SessionContextValue>(
    () => ({
      loading,
      connected: Boolean(session?.connected),
      error,
      resolveError,
      agent: session?.agent ?? null,
      embedUrl: session?.embedUrl ?? null,
      priorVisit: session?.priorVisit ?? null,
      priorConsultationId,
      setPriorConsultationId,
      clearPriorConsultation,
      selectedSpecialty,
      selectedAgentId,
      setSelectedSpecialty,
      setSelectedAgentId,
      clearSpecialty,
      clearAgent,
      resetConsultationSetup,
      isSetupComplete,
      consultationActive,
      activeConsultationId,
      finalizingVisit,
      finalizeError,
      startConsultation,
      endConsultation,
      retry,
      nearbyPlaces,
      placesLoading,
      placesMessage,
      placesBlocked,
      placesSearchArea,
      placesConsultationId,
      pendingPlaceIntent,
      setPendingPlaceIntent,
      requestNearbyPlaces,
      loadPlacesForConsultation,
      clearNearbyPlaces,
    }),
    [
      loading,
      session,
      error,
      resolveError,
      priorConsultationId,
      setPriorConsultationId,
      clearPriorConsultation,
      selectedSpecialty,
      selectedAgentId,
      setSelectedSpecialty,
      setSelectedAgentId,
      clearSpecialty,
      clearAgent,
      resetConsultationSetup,
      isSetupComplete,
      consultationActive,
      activeConsultationId,
      finalizingVisit,
      finalizeError,
      startConsultation,
      endConsultation,
      retry,
      nearbyPlaces,
      placesLoading,
      placesMessage,
      placesBlocked,
      placesSearchArea,
      placesConsultationId,
      pendingPlaceIntent,
      requestNearbyPlaces,
      loadPlacesForConsultation,
      clearNearbyPlaces,
    ],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used within SessionProvider");
  }
  return ctx;
}
