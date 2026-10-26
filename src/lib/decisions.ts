import {
  BASELINE,
  candidateIds,
  type CandidateId,
  type Disposition,
  type Distance,
} from "./study";

export interface Draft {
  disposition: Disposition | "";
  rationale: string;
  checks: string;
}
export interface Basis {
  distance: Distance;
  baseline: string;
}
export interface Recommendation extends Draft {
  disposition: Disposition;
  basis: Basis;
  savedAt: string;
}
export interface StudyState {
  version: 1;
  drafts: Partial<Record<CandidateId, Draft>>;
  recommendations: Partial<Record<CandidateId, Recommendation>>;
}
export const STORAGE_KEY = "geomaxx-study-v1";
export const emptyState = (): StudyState => ({
  version: 1,
  drafts: {},
  recommendations: {},
});
export const emptyDraft = (): Draft => ({
  disposition: "",
  rationale: "",
  checks: "",
});

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isDraft(value: unknown): value is Draft {
  return (
    isObject(value) &&
    ["", "visit", "hold", "reject"].includes(value.disposition as string) &&
    typeof value.rationale === "string" &&
    value.rationale.length <= 4000 &&
    typeof value.checks === "string" &&
    value.checks.length <= 4000
  );
}
function isRecommendation(value: unknown): value is Recommendation {
  return (
    isDraft(value) &&
    value.disposition !== "" &&
    value.rationale.trim().length > 0 &&
    isObject(value) &&
    isObject(value.basis) &&
    (value.basis.distance === 500 || value.basis.distance === 1000) &&
    typeof value.basis.baseline === "string" &&
    value.basis.baseline.length <= 150 &&
    typeof value.savedAt === "string" &&
    Number.isFinite(Date.parse(value.savedAt))
  );
}

export function restoreState(raw: string): StudyState {
  if (raw.length > 100_000) throw new Error("Stored study is too large.");
  const value: unknown = JSON.parse(raw);
  if (
    !isObject(value) ||
    value.version !== 1 ||
    !isObject(value.drafts) ||
    !isObject(value.recommendations)
  )
    throw new Error("Stored study format is not supported.");
  const restored = emptyState();
  for (const id of candidateIds) {
    const draft = value.drafts[id];
    const recommendation = value.recommendations[id];
    if (draft !== undefined) {
      if (!isDraft(draft)) throw new Error("A stored draft is invalid.");
      restored.drafts[id] = {
        disposition: draft.disposition,
        rationale: draft.rationale,
        checks: draft.checks,
      };
    }
    if (recommendation !== undefined) {
      if (!isRecommendation(recommendation))
        throw new Error("A stored recommendation is invalid.");
      restored.recommendations[id] = {
        disposition: recommendation.disposition,
        rationale: recommendation.rationale,
        checks: recommendation.checks,
        basis: {
          distance: recommendation.basis.distance,
          baseline: recommendation.basis.baseline,
        },
        savedAt: recommendation.savedAt,
      };
      restored.drafts[id] ??= {
        disposition: recommendation.disposition,
        rationale: recommendation.rationale,
        checks: recommendation.checks,
      };
    }
  }
  return restored;
}

export function matchesBasis(
  recommendation: Recommendation,
  distance: Distance,
): boolean {
  return (
    recommendation.basis.distance === distance &&
    recommendation.basis.baseline === BASELINE
  );
}
export function draftChanged(
  draft: Draft,
  recommendation?: Recommendation,
): boolean {
  return !recommendation
    ? Boolean(draft.disposition || draft.rationale || draft.checks)
    : draft.disposition !== recommendation.disposition ||
        draft.rationale !== recommendation.rationale ||
        draft.checks !== recommendation.checks;
}

export function briefIssues(state: StudyState, distance: Distance): string[] {
  const issues: string[] = [];
  let visits = 0;
  for (const id of candidateIds) {
    const saved = state.recommendations[id];
    if (!saved) {
      issues.push(`Site ${id}: recommendation and rationale needed.`);
      continue;
    }
    if (!matchesBasis(saved, distance))
      issues.push(`Site ${id}: review the saved analysis basis.`);
    if (draftChanged(state.drafts[id] ?? saved, saved))
      issues.push(`Site ${id}: save the edited recommendation.`);
    if (saved.disposition === "visit") visits++;
  }
  if (visits > 2)
    issues.push(
      "The task allows up to two field visits. Revise one visit recommendation.",
    );
  return issues;
}

export interface ViewState {
  site: CandidateId;
  distance: Distance;
  view: "workspace" | "brief";
  panel: "evidence" | "decision";
}
export function parseView(params: {
  get(name: string): string | null;
}): ViewState {
  const site = params.get("site");
  return {
    site: candidateIds.includes(site as CandidateId)
      ? (site as CandidateId)
      : "A",
    distance: params.get("distance") === "1000" ? 1000 : 500,
    view: params.get("view") === "brief" ? "brief" : "workspace",
    panel: params.get("panel") === "decision" ? "decision" : "evidence",
  };
}
