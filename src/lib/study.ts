export const candidateIds = ["A", "B", "C"] as const;
export type CandidateId = (typeof candidateIds)[number];
export type Distance = 500 | 1000;
export type Point = readonly [number, number];
export type Disposition = "visit" | "hold" | "reject";
export const BASELINE = "synthetic-network-2026-10-26-v1";
export const CELL_SIZE = 50;
export const CROSSING_ROW = 9;

export interface Evidence {
  id: string;
  title: string;
  value: string;
  source: string;
  period: string;
  kind: "Observation" | "Reported" | "Modeled";
  limitation: string;
}

export interface Candidate {
  id: CandidateId;
  name: string;
  location: string;
  node: Point;
  context: string;
  access: string;
  gap: string;
  evidence: Evidence[];
}

export interface Branch {
  id: string;
  name: string;
  node: Point;
  dailySales: number | null;
  trend: string | null;
  capacity: string;
  period: string;
}

export const candidates: Candidate[] = [
  {
    id: "A",
    name: "Site A",
    location: "Residential block 01",
    node: [-12, 6],
    context: "Established housing with activity around local services.",
    access: "Connected walking routes on the same side of the modeled barrier.",
    gap: "Capacity and parking need verification",
    evidence: [
      {
        id: "A-demand",
        title: "Residential context",
        value: "Housing and daily services are present in the example area.",
        source: "Synthetic land-use record",
        period: "Snapshot: 26 Oct 2026",
        kind: "Modeled",
        limitation:
          "Land use does not establish purchasing power or sales potential.",
      },
      {
        id: "A-capacity",
        title: "Nearby branch capacity",
        value:
          "An example operations note reports queues and constrained floor space at E01.",
        source: "Synthetic operations note, E01",
        period: "Recorded: 22 Oct 2026",
        kind: "Reported",
        limitation:
          "Verify capacity on site. Queues do not establish incremental network sales.",
      },
      {
        id: "A-access",
        title: "Physical access",
        value:
          "Frontage, motorcycle stopping space, and delivery access have not been surveyed.",
        source: "Synthetic property record",
        period: "Received: 24 Oct 2026",
        kind: "Reported",
        limitation:
          "A connected walking route does not verify parking or physical entrance conditions.",
      },
    ],
  },
  {
    id: "B",
    name: "Site B",
    location: "Residential block 02",
    node: [2, 0],
    context: "A residential pocket beside a modeled divided-road barrier.",
    access:
      "E03 is 250 m away in a straight line; the synthetic walking route is 1,150 m via the crossing.",
    gap: "Crossing and delivery access need verification",
    evidence: [
      {
        id: "B-demand",
        title: "Residential context",
        value:
          "The example pocket contains housing and everyday retail activity.",
        source: "Synthetic land-use record",
        period: "Snapshot: 26 Oct 2026",
        kind: "Modeled",
        limitation:
          "Activity is illustrative. It is not an observed customer or spending count.",
      },
      {
        id: "B-route",
        title: "Route to branch E03",
        value:
          "250 m straight-line separation; 1,150 m along the synthetic pedestrian network.",
        source: "Synthetic 50 m network, crossing at row 9",
        period: "Baseline: 26 Oct 2026",
        kind: "Modeled",
        limitation:
          "This crossing is fictional and does not describe a real Jakarta road. Verify access in the field.",
      },
      {
        id: "B-property",
        title: "Property access",
        value:
          "Frontage, parking, visibility, and delivery access remain unverified.",
        source: "Synthetic property record",
        period: "Received: 24 Oct 2026",
        kind: "Reported",
        limitation:
          "Lower spatial overlap alone does not establish a suitable store location.",
      },
    ],
  },
  {
    id: "C",
    name: "Site C",
    location: "Residential block 03",
    node: [-11, -13],
    context: "Housing with an apparently busy evening observation.",
    access: "Shares connected residential routes with branch E04.",
    gap: "Single-period count; branch trend unavailable",
    evidence: [
      {
        id: "C-traffic",
        title: "Traffic observation",
        value:
          "180 passers-by in one hour, recorded during a payday-period evening.",
        source: "Synthetic traffic-count form",
        period: "25 Sep 2026, 18:00-19:00 WIB",
        kind: "Observation",
        limitation:
          "One payday-period evening is not representative demand. Request weekday observations at other times.",
      },
      {
        id: "C-sales",
        title: "E04 sales and trend",
        value: "Recent average daily sales and trend are unavailable.",
        source: "Synthetic operations request, E04",
        period: "Requested: 24 Oct 2026",
        kind: "Reported",
        limitation:
          "Missing performance evidence is not zero sales or zero cannibalization risk.",
      },
      {
        id: "C-context",
        title: "Shared residential context",
        value:
          "Site C and E04 share part of the same modeled residential area.",
        source: "Synthetic network and land-use records",
        period: "Baseline: 26 Oct 2026",
        kind: "Modeled",
        limitation:
          "Shared geography cannot quantify customer switching. Verify customer mix and branch condition.",
      },
    ],
  },
];

export const branches: Branch[] = [
  {
    id: "E01",
    name: "Branch E01",
    node: [-14, 7],
    dailySales: 18_000_000,
    trend: "Stable",
    capacity: "Reported queues; floor space constrained",
    period: "Synthetic average: 1-21 Oct 2026",
  },
  {
    id: "E02",
    name: "Branch E02",
    node: [-6, 4],
    dailySales: 11_000_000,
    trend: "Stable",
    capacity: "Capacity not surveyed",
    period: "Synthetic average: 1-21 Oct 2026",
  },
  {
    id: "E03",
    name: "Branch E03",
    node: [7, 0],
    dailySales: 13_000_000,
    trend: "Stable",
    capacity: "Across the modeled barrier from Site B",
    period: "Synthetic average: 1-21 Oct 2026",
  },
  {
    id: "E04",
    name: "Branch E04",
    node: [-13, -12],
    dailySales: null,
    trend: null,
    capacity: "Condition not verified",
    period: "Recent performance unavailable",
  },
];

export const competitors = [
  { id: "P01", node: [-18, 4] as Point },
  { id: "P02", node: [-7, 8] as Point },
  { id: "P03", node: [0, 2] as Point },
  { id: "P04", node: [9, 2] as Point },
  { id: "P05", node: [-9, -15] as Point },
  { id: "P06", node: [-17, -10] as Point },
];

export const cellKey = (point: Point) => `${point[0]},${point[1]}`;
export const cellPoint = (key: string): Point => {
  const [x, y] = key.split(",").map(Number);
  return [x, y];
};

export function neighbors([x, y]: Point): Point[] {
  return (
    [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ] as Point[]
  ).filter(([nx, ny]) => {
    if (Math.abs(nx) > 40 || Math.abs(ny) > 40) return false;
    const crosses = (x === 4 && nx === 5) || (x === 5 && nx === 4);
    return !crosses || ny === CROSSING_ROW;
  });
}

export function walkDistances(
  origin: Point,
  limit: number,
): Map<string, number> {
  const distances = new Map([[cellKey(origin), 0]]);
  const queue: Point[] = [origin];
  for (let i = 0; i < queue.length; i++) {
    const point = queue[i];
    const nextDistance = distances.get(cellKey(point))! + CELL_SIZE;
    if (nextDistance > limit) continue;
    for (const next of neighbors(point)) {
      const key = cellKey(next);
      if (!distances.has(key)) {
        distances.set(key, nextDistance);
        queue.push(next);
      }
    }
  }
  return distances;
}

export function reachableCells(origin: Point, distance: Distance): Set<string> {
  return new Set(walkDistances(origin, distance).keys());
}

export function overlap(
  candidateCells: Set<string>,
  branchCells: { id: string; cells: Set<string> }[],
) {
  const covered = new Set<string>();
  const affected = branchCells.flatMap(({ id, cells }) => {
    const shared = [...candidateCells].filter((cell) => cells.has(cell));
    shared.forEach((cell) => covered.add(cell));
    return shared.length
      ? [
          {
            id,
            sharedCells: shared.length,
            branchShare: shared.length / cells.size,
            candidateShare: shared.length / candidateCells.size,
          },
        ]
      : [];
  });
  return { affected, covered, coverage: covered.size / candidateCells.size };
}

export function analyze(distance: Distance) {
  const branchAreas = branches.map((branch) => ({
    id: branch.id,
    cells: reachableCells(branch.node, distance),
  }));
  return Object.fromEntries(
    candidates.map((candidate) => {
      const cells = reachableCells(candidate.node, distance);
      return [
        candidate.id,
        {
          cells,
          ...overlap(cells, branchAreas),
          competitors: competitors.filter((competitor) =>
            cells.has(cellKey(competitor.node)),
          ),
          areaSqm: cells.size * CELL_SIZE * CELL_SIZE,
        },
      ];
    }),
  ) as Record<
    CandidateId,
    {
      cells: Set<string>;
      covered: Set<string>;
      coverage: number;
      affected: {
        id: string;
        sharedCells: number;
        branchShare: number;
        candidateShare: number;
      }[];
      competitors: typeof competitors;
      areaSqm: number;
    }
  >;
}

export const analyses = { 500: analyze(500), 1000: analyze(1000) };
export type Analysis = ReturnType<typeof analyze>[CandidateId];

// shortcut: a local affine display projection for fictional geometry, replace with surveyed CRS data for real analysis.
export function lngLat([x, y]: Point): [number, number] {
  const latitude = -6.234;
  return [
    106.918 +
      (x * CELL_SIZE) / (111_320 * Math.cos((latitude * Math.PI) / 180)),
    latitude + (y * CELL_SIZE) / 110_574,
  ];
}

export function cellRing(key: string): [number, number][] {
  const [x, y] = cellPoint(key);
  return [
    [x - 0.5, y - 0.5],
    [x + 0.5, y - 0.5],
    [x + 0.5, y + 0.5],
    [x - 0.5, y + 0.5],
    [x - 0.5, y - 0.5],
  ].map((point) => lngLat(point as unknown as Point));
}

export function percent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}
export function distanceLabel(distance: Distance): string {
  return distance === 500 ? "500 m" : "1 km";
}
export function money(value: number | null): string {
  return value === null
    ? "Unavailable"
    : new Intl.NumberFormat("en-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(value);
}
