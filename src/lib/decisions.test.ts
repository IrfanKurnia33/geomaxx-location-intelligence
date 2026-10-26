import { describe, expect, it } from "vitest";
import { BASELINE, candidateIds, type Disposition } from "./study";
import {
  briefIssues,
  draftChanged,
  emptyState,
  matchesBasis,
  parseView,
  restoreState,
  type Recommendation,
} from "./decisions";

const recommendation = (disposition: Disposition = "hold"): Recommendation => ({
  disposition,
  rationale: "Verify branch condition before a visit.",
  checks: "Request current branch trend.",
  basis: { distance: 500, baseline: BASELINE },
  savedAt: "2026-10-26T09:00:00.000Z",
});
function complete(disposition: Disposition) {
  const state = emptyState();
  candidateIds.forEach((id) => {
    const saved = recommendation(disposition);
    state.recommendations[id] = saved;
    state.drafts[id] = {
      disposition: saved.disposition,
      rationale: saved.rationale,
      checks: saved.checks,
    };
  });
  return state;
}

describe("recommendation readiness", () => {
  it.each(["hold", "reject"] as const)(
    "allows all-%s with zero visits",
    (disposition) =>
      expect(briefIssues(complete(disposition), 500)).toEqual([]),
  );
  it("does not confuse unassessed with hold", () =>
    expect(briefIssues(emptyState(), 500)).toHaveLength(3));
  it("flags three visits while retaining every recommendation", () => {
    const state = complete("visit");
    expect(briefIssues(state, 500)).toEqual([
      "The task allows up to two field visits. Revise one visit recommendation.",
    ]);
    expect(Object.keys(state.recommendations)).toHaveLength(3);
  });
  it("flags a changed basis and restores the match when returning", () => {
    const saved = recommendation();
    expect(matchesBasis(saved, 1000)).toBe(false);
    expect(matchesBasis(saved, 500)).toBe(true);
    expect(
      matchesBasis(
        { ...saved, basis: { distance: 500, baseline: "older-baseline" } },
        500,
      ),
    ).toBe(false);
  });
  it("keeps unfinished edits out of a ready brief", () => {
    const state = complete("hold");
    state.drafts.A!.rationale = "Changed, not confirmed yet.";
    expect(draftChanged(state.drafts.A!, state.recommendations.A)).toBe(true);
    expect(briefIssues(state, 500)).toEqual([
      "Site A: save the edited recommendation.",
    ]);
    expect(state.recommendations.A!.rationale).not.toBe(
      state.drafts.A!.rationale,
    );
  });
});

describe("browser data boundary", () => {
  it("restores decisions, unsaved edits, and an older baseline without silently relabeling", () => {
    const state = complete("hold");
    state.drafts.B!.rationale = "Unfinished wording";
    state.recommendations.C!.basis.baseline = "older-baseline";
    const restored = restoreState(JSON.stringify(state));
    expect(restored).toEqual(state);
    expect(matchesBasis(restored.recommendations.C!, 500)).toBe(false);
  });
  it.each([
    "invalid json",
    "null",
    '{"version":2,"drafts":{},"recommendations":{}}',
    '{"version":1,"drafts":{"A":{"rationale":7}},"recommendations":{}}',
  ])("rejects malformed storage: %s", (raw) =>
    expect(() => restoreState(raw)).toThrow(),
  );
  it("rejects blank rationale and malformed basis in saved recommendations", () => {
    const state = complete("hold");
    state.recommendations.A!.rationale = " ";
    expect(() => restoreState(JSON.stringify(state))).toThrow();
    state.recommendations.A = recommendation();
    (state.recommendations.A.basis as { distance: number }).distance = 750;
    expect(() => restoreState(JSON.stringify(state))).toThrow();
  });
  it("falls back safely for invalid URL values", () =>
    expect(
      parseView(new URLSearchParams("site=other&distance=750&view=other")),
    ).toEqual({
      site: "A",
      distance: 500,
      view: "workspace",
      panel: "evidence",
    }));
});
