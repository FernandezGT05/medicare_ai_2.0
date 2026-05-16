export interface CatalogAgent {
  id: string;
  displayName: string;
  imageUrl: string;
}

export const AGENT_CATALOG: CatalogAgent[] = [
  {
    id: "nelly",
    displayName: "Nelly",
    imageUrl: "/images/agents/nelly.png",
  },
  {
    id: "yuruo",
    displayName: "Yuruo",
    imageUrl: "/images/agents/yuruo.png",
  },
  {
    id: "alan",
    displayName: "Alan",
    imageUrl: "/images/agents/alan.png",
  },
  {
    id: "jerome",
    displayName: "Jerome",
    imageUrl: "/images/agents/jerome.png",
  },
];

export function getCatalogAgent(catalogId: string): CatalogAgent | undefined {
  return AGENT_CATALOG.find((a) => a.id === catalogId);
}
