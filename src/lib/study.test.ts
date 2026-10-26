import { describe, expect, it } from "vitest";
import {
  analyses,
  branches,
  candidates,
  cellKey,
  neighbors,
  overlap,
  reachableCells,
  walkDistances,
} from "./study";

describe("synthetic pedestrian network", () => {
  it("allows a barrier crossing only at the modeled crossing", () => {
    expect(neighbors([4, 0])).not.toContainEqual([5, 0]);
    expect(neighbors([5, 0])).not.toContainEqual([4, 0]);
    expect(neighbors([4, 9])).toContainEqual([5, 9]);
    expect(neighbors([5, 9])).toContainEqual([4, 9]);
  });
  it("preserves the straight-line versus walking-route scenario for Site B", () => {
    const site = candidates.find((candidate) => candidate.id === "B")!;
    const branch = branches.find((item) => item.id === "E03")!;
    expect(
      Math.hypot(site.node[0] - branch.node[0], site.node[1] - branch.node[1]) *
        50,
    ).toBe(250);
    expect(walkDistances(site.node, 2000).get(cellKey(branch.node))).toBe(1150);
    expect(analyses[500].B.affected.map((item) => item.id)).not.toContain(
      "E03",
    );
    expect(analyses[1000].B.affected.map((item) => item.id)).toContain("E03");
  });
  it("includes the entrance, respects network distance, and nests the sensitivity area", () => {
    for (const place of [...candidates, ...branches]) {
      const near = reachableCells(place.node, 500);
      const far = reachableCells(place.node, 1000);
      expect(near.has(cellKey(place.node))).toBe(true);
      expect([...near].every((key) => far.has(key))).toBe(true);
      expect(far.size).toBeGreaterThan(near.size);
      expect(
        [...walkDistances(place.node, 500).values()].every(
          (value) => value <= 500,
        ),
      ).toBe(true);
    }
  });
});

describe("area exposure", () => {
  it("counts the branch union once and keeps the two denominators distinct", () => {
    const result = overlap(new Set(["a", "b", "c", "d"]), [
      { id: "E01", cells: new Set(["a", "b", "x"]) },
      { id: "E02", cells: new Set(["b", "c", "y", "z"]) },
    ]);
    expect(result.coverage).toBe(0.75);
    expect(result.covered.size).toBe(3);
    expect(result.affected[0].branchShare).toBeCloseTo(2 / 3);
    expect(result.affected[0].candidateShare).toBe(0.5);
    expect(result.affected[1].branchShare).toBe(0.5);
  });
  it("keeps the capacity and missing-evidence scenarios intact", () => {
    expect(analyses[500].A.coverage).toBeGreaterThan(0.5);
    expect(analyses[500].A.affected.map((item) => item.id)).toContain("E01");
    expect(analyses[500].C.affected.map((item) => item.id)).toContain("E04");
    expect(branches.find((item) => item.id === "E04")!.dailySales).toBeNull();
    expect(branches.find((item) => item.id === "E04")!.trend).toBeNull();
  });
  it("has bounded, reproducible area and competitor counts", () => {
    for (const distance of [500, 1000] as const)
      for (const candidate of candidates) {
        const area = analyses[distance][candidate.id];
        expect(area.coverage).toBeGreaterThanOrEqual(0);
        expect(area.coverage).toBeLessThanOrEqual(1);
        expect(area.areaSqm).toBe(area.cells.size * 2500);
        expect(
          area.competitors.every((item) => area.cells.has(cellKey(item.node))),
        ).toBe(true);
        expect(
          area.affected.every(
            (item) => item.branchShare > 0 && item.branchShare <= 1,
          ),
        ).toBe(true);
      }
  });
});
