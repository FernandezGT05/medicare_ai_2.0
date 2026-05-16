export type DashboardTabId =
  | "overview"
  | "history"
  | "follow-ups"
  | "profile"
  | "reminders"
  | "health";

export interface DashboardTab {
  id: DashboardTabId;
  label: string;
  description: string;
}

export const DASHBOARD_TABS: DashboardTab[] = [
  {
    id: "overview",
    label: "Overview",
    description: "Stats and care insights",
  },
  {
    id: "history",
    label: "History",
    description: "Past consultation summaries",
  },
  {
    id: "follow-ups",
    label: "Follow-ups",
    description: "Next steps from your visits",
  },
  {
    id: "profile",
    label: "Profile",
    description: "Your account details",
  },
  {
    id: "reminders",
    label: "Reminders",
    description: "Appointments and care tasks",
  },
  {
    id: "health",
    label: "Health log",
    description: "Medications and vitals",
  },
];

export const DEFAULT_DASHBOARD_TAB: DashboardTabId = "overview";

export function isDashboardTabId(value: string | null): value is DashboardTabId {
  return DASHBOARD_TABS.some((tab) => tab.id === value);
}
