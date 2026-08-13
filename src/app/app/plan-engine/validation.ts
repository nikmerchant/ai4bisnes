import type { ContentCalendarInputs, MarketingPlanInputs, PlanArtifact, PlanItem } from "./types";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const STATUSES = new Set(["planned", "drafted", "approved", "scheduled", "published", "skipped"]);

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function extractJson(raw: string): unknown {
  if (raw.length > 262144) throw new Error("Jawapan terlalu panjang. Had maksimum ialah 256 KB.");
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start < 0 || end <= start) throw new Error("Kami tidak menemui data kalendar dalam jawapan tersebut.");
    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      throw new Error("Jawapan AI belum dalam format yang boleh disusun. Salin semula keseluruhan jawapan.");
    }
  }
}

function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function normalizeItem(value: unknown, index: number, startDate: string): PlanItem {
  if (!isObject(value)) throw new Error(`Item ${index + 1} tidak dapat dibaca.`);
  const date = validDate(value.date) ? value.date : addDays(startDate, index);
  const headline = text(value.headline ?? value.title ?? value.idea, 240);
  if (!headline) throw new Error(`Item ${index + 1} tiada tajuk kandungan.`);
  const status = text(value.status, 20);
  return {
    date,
    day_number: Number.isInteger(value.day_number) ? Number(value.day_number) : index + 1,
    position: Number.isInteger(value.position) ? Number(value.position) : 0,
    item_kind: value.item_kind === "action" ? "action" : "content",
    channel: text(value.channel ?? value.platform, 60),
    format: text(value.format, 60),
    pillar: text(value.pillar ?? value.theme, 100),
    objective: text(value.objective, 100),
    headline,
    details: text(value.details ?? value.description, 2000),
    caption: text(value.caption, 5000),
    cta: text(value.cta, 500),
    status: STATUSES.has(status) ? (status as PlanItem["status"]) : "planned",
  };
}

export function parsePlanResponse(raw: string, expectedKind: PlanArtifact["plan_kind"]): PlanArtifact {
  const value = extractJson(raw);
  if (!isObject(value)) throw new Error("Jawapan AI mesti mengandungi satu pelan.");
  if (value.schema_version !== 1) throw new Error("Versi jawapan AI tidak disokong.");
  if (value.plan_kind !== expectedKind) throw new Error("Jenis pelan dalam jawapan AI tidak sepadan.");
  if (!validDate(value.start_date) || !validDate(value.end_date)) throw new Error("Tarikh mula atau tamat tidak sah.");
  const startDate = value.start_date;
  const endDate = value.end_date;
  if (!Array.isArray(value.items) || value.items.length < 1 || value.items.length > 60) {
    throw new Error("Jawapan mesti mempunyai antara 1 hingga 60 item.");
  }
  const endLimit = addDays(startDate, 30);
  if (endDate < startDate || endDate > endLimit) throw new Error("Julat pelan tidak boleh melebihi 31 hari.");
  const items = value.items.map((item, index) => normalizeItem(item, index, startDate));
  for (const item of items) {
    if (item.date < startDate || item.date > endDate) {
      throw new Error(`Tarikh ${item.date} berada di luar julat pelan.`);
    }
  }
  return {
    schema_version: 1,
    plan_kind: expectedKind,
    title: text(value.title, 200) || "Pelan AI4Bisnes",
    start_date: startDate,
    end_date: endDate,
    items,
  };
}

export function validateCalendarInputs(value: unknown): ContentCalendarInputs {
  if (!isObject(value) || !validDate(value.startDate)) throw new Error("Tarikh mula diperlukan.");
  const platforms = Array.isArray(value.platforms)
    ? value.platforms.filter((item): item is string => typeof item === "string").map((item) => item.slice(0, 40)).slice(0, 5)
    : [];
  if (!platforms.length) throw new Error("Pilih sekurang-kurangnya satu platform.");
  const allowedFrequency = ["3 seminggu", "5 seminggu", "Setiap hari"] as const;
  if (!allowedFrequency.includes(value.frequency as (typeof allowedFrequency)[number])) throw new Error("Kekerapan tidak sah.");
  const objective = text(value.objective, 120);
  if (!objective) throw new Error("Matlamat kandungan diperlukan.");
  return {
    startDate: value.startDate,
    platforms,
    frequency: value.frequency as ContentCalendarInputs["frequency"],
    objective,
    notes: text(value.notes, 1000),
  };
}

export function validateMarketingPlanInputs(value: unknown): MarketingPlanInputs {
  if (!isObject(value) || !validDate(value.startDate)) throw new Error("Tarikh mula diperlukan.");
  const channels = Array.isArray(value.channels)
    ? value.channels.filter((item): item is string => typeof item === "string").map((item) => item.slice(0, 40)).slice(0, 6)
    : [];
  if (!channels.length) throw new Error("Pilih sekurang-kurangnya satu saluran.");
  const objective = text(value.objective, 120);
  if (!objective) throw new Error("Matlamat pemasaran diperlukan.");
  const allowedIntensity = ["Ringan", "Sederhana", "Agresif"] as const;
  if (!allowedIntensity.includes(value.intensity as (typeof allowedIntensity)[number])) throw new Error("Tahap aktiviti tidak sah.");
  return {
    startDate: value.startDate,
    objective,
    channels,
    promotion: text(value.promotion, 500),
    intensity: value.intensity as MarketingPlanInputs["intensity"],
  };
}

export function validateArtifactForUpdate(value: unknown, kind: PlanArtifact["plan_kind"] = "content_calendar"): PlanArtifact {
  return parsePlanResponse(JSON.stringify(value), kind);
}
