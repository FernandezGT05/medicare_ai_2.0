import { branding } from "../config/branding";
import { useSession } from "../context/SessionContext";

/** Display name for the active Beyond Presence agent (from API, not hardcoded). */
export function useAssistantLabel(): string {
  const { agent } = useSession();
  return agent?.name ?? branding.agentName;
}
