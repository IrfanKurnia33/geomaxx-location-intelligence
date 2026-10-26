import {
  analyses,
  branches,
  candidates,
  cellPoint,
  competitors,
  CROSSING_ROW,
  type CandidateId,
  type Distance,
} from "@/lib/study";

export function SyntheticMap({
  site,
  distance,
  onSelect,
}: {
  site: CandidateId;
  distance: Distance;
  onSelect: (id: CandidateId) => void;
}) {
  const analysis = analyses[distance][site];
  const position = ([x, y]: readonly number[]) => [x * 10 + 370, 350 - y * 10];
  const points = [...analysis.cells]
    .map((cell) => position(cellPoint(cell)))
    .concat(
      [...candidates, ...branches, ...competitors].map((place) =>
        position(place.node),
      ),
    );
  const left = Math.min(...points.map(([x]) => x)) - 35;
  const top = Math.min(...points.map(([, y]) => y)) - 35;
  const right = Math.max(...points.map(([x]) => x)) + 120;
  const bottom = Math.max(...points.map(([, y]) => y)) + 65;
  return (
    <svg
      className="synthetic-map"
      viewBox={`${left} ${top} ${right - left} ${bottom - top}`}
      role="group"
      aria-label="Interactive synthetic pedestrian network. Fictional geometry, not Jakarta streets."
    >
      <rect className="map-ground" width="720" height="710" />
      <g className="network-lines" aria-hidden="true">
        {Array.from({ length: 35 }, (_, i) => (i - 17) * 20).map((n) => (
          <g key={n}>
            <path d={`M${370 + n},0V710`} />
            <path d={`M0,${350 + n}H720`} />
          </g>
        ))}
      </g>
      <g aria-hidden="true">
        {[...analysis.cells].map((cell) => {
          const [x, y] = position(cellPoint(cell));
          return (
            <rect
              key={cell}
              x={x - 5}
              y={y - 5}
              width="10.05"
              height="10.05"
              className={
                analysis.covered.has(cell) ? "cell-covered" : "cell-new"
              }
            />
          );
        })}
        <path
          className="barrier-halo"
          d={`M415,0V${350 - CROSSING_ROW * 10 - 8} M415,${350 - CROSSING_ROW * 10 + 8}V710`}
        />
        <path
          className="barrier-line"
          d={`M415,0V${350 - CROSSING_ROW * 10 - 8} M415,${350 - CROSSING_ROW * 10 + 8}V710`}
        />
        <path
          className="crossing-line"
          d={`M395,${350 - CROSSING_ROW * 10}H435`}
        />
        <text className="map-label" x="440" y={355 - CROSSING_ROW * 10}>
          Modeled crossing
        </text>
        <text
          className="barrier-label"
          transform={`translate(431,${top + 20}) rotate(90)`}
        >
          Fictional barrier
        </text>
      </g>
      {competitors.map((competitor) => {
        const [x, y] = position(competitor.node);
        return (
          <g key={competitor.id} aria-hidden="true">
            <path
              className="competitor-marker"
              d={`M${x},${y - 5}l5,5 -5,5 -5,-5Z`}
            />
            <text className="map-label" x={x + 9} y={y + 4}>
              {competitor.id}
            </text>
          </g>
        );
      })}
      {branches.map((branch) => {
        const [x, y] = position(branch.node);
        return (
          <g key={branch.id} aria-hidden="true">
            <rect
              className="branch-marker"
              x={x - 6}
              y={y - 6}
              width="12"
              height="12"
              rx="2"
            />
            <text className="branch-label" x={x + 11} y={y + 5}>
              {branch.id}
            </text>
          </g>
        );
      })}
      {candidates.map((candidate) => {
        const [x, y] = position(candidate.node);
        return (
          <g
            key={candidate.id}
            className={`candidate-marker ${candidate.id === site ? "selected" : ""}`}
            role="button"
            tabIndex={0}
            aria-label={`Select ${candidate.name} on map`}
            aria-pressed={candidate.id === site}
            onClick={() => onSelect(candidate.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(candidate.id);
              }
            }}
          >
            <circle className="marker-halo" cx={x} cy={y} r="22" />
            <circle className="marker-face" cx={x} cy={y} r="15" />
            <text className="marker-letter" x={x} y={y + 5} textAnchor="middle">
              {candidate.id}
            </text>
          </g>
        );
      })}
      <g aria-hidden="true">
        <path
          className="crossing-line"
          d={`M${right - 130},${bottom - 30}v5h100v-5`}
        />
        <text className="map-label" x={right - 100} y={bottom - 5}>
          500 m
        </text>
      </g>
    </svg>
  );
}
