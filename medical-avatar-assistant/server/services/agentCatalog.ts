import { optional } from "../config.js";

export const CATALOG_AGENT_IDS = ["nelly", "yuruo", "alan", "jerome"] as const;

export type CatalogAgentId = (typeof CATALOG_AGENT_IDS)[number];

export function isCatalogAgentId(value: string): value is CatalogAgentId {
  return (CATALOG_AGENT_IDS as readonly string[]).includes(value);
}

const DEFAULT_BEY_AGENT_IDS: Record<CatalogAgentId, string> = {
  nelly: "f8efcdd2-2f3f-4fd8-a067-d0376394cabb",
  yuruo: "043a6f54-b04d-49d6-af01-b4ccb5f79359",
  alan: "15a39700-f708-4a12-9ab1-eca028d35f5d",
  jerome: "f373bf15-973b-4075-a0c1-127ab719aac0",
};

const ENV_KEYS: Record<CatalogAgentId, string> = {
  nelly: "BEY_AGENT_ID_NELLY",
  yuruo: "BEY_AGENT_ID_YURUO",
  alan: "BEY_AGENT_ID_ALAN",
  jerome: "BEY_AGENT_ID_JEROME",
};

/** Resolve a UI catalog agent id to a Beyond Presence agent UUID. */
export function resolveCatalogAgentBeyId(catalogId: string): string | null {
  if (!isCatalogAgentId(catalogId)) {
    return null;
  }

  const fromEnv = optional(ENV_KEYS[catalogId]);
  return fromEnv ?? DEFAULT_BEY_AGENT_IDS[catalogId];
}

export const CATALOG_AGENT_LABELS: Record<CatalogAgentId, string> = {
  nelly: "Nelly",
  yuruo: "Yuruo",
  alan: "Alan",
  jerome: "Jerome",
};

export interface CatalogAgentHealthEntry {
  configured: boolean;
  beyAgentId: string | null;
}

export type CatalogAgentHealth = Record<CatalogAgentId, CatalogAgentHealthEntry>;

/** Per-catalog-agent configuration for /api/health and startup logs. */
export function getCatalogAgentHealth(): CatalogAgentHealth {
  const result = {} as CatalogAgentHealth;
  for (const id of CATALOG_AGENT_IDS) {
    const beyAgentId = resolveCatalogAgentBeyId(id);
    result[id] = { configured: Boolean(beyAgentId), beyAgentId };
  }
  return result;
}
