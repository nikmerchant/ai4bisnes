export type PlanKind = "content_calendar" | "marketing_30d";

export type PlanItemStatus =
  | "planned"
  | "drafted"
  | "approved"
  | "scheduled"
  | "published"
  | "skipped";

export type PlanItem = {
  date: string;
  day_number: number;
  position: number;
  item_kind: "content" | "action";
  channel: string;
  format: string;
  pillar: string;
  objective: string;
  headline: string;
  details: string;
  caption: string;
  cta: string;
  status: PlanItemStatus;
};

export type PlanArtifact = {
  schema_version: 1;
  plan_kind: PlanKind;
  title: string;
  start_date: string;
  end_date: string;
  items: PlanItem[];
};

export type SavedPlan = {
  outputId: number;
  createdAt: string;
  artifact: PlanArtifact;
};

export type ContentCalendarInputs = {
  startDate: string;
  platforms: string[];
  frequency: "3 seminggu" | "5 seminggu" | "Setiap hari";
  objective: string;
  notes: string;
};

export type MarketingPlanInputs = {
  startDate: string;
  objective: string;
  channels: string[];
  promotion: string;
  intensity: "Ringan" | "Sederhana" | "Agresif";
};
