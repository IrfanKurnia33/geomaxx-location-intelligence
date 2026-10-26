import {
  analyses,
  BASELINE,
  branches,
  candidates,
  distanceLabel,
  money,
  percent,
  type Distance,
} from "@/lib/study";
import { briefIssues, matchesBasis, type StudyState } from "@/lib/decisions";

export interface MapImage {
  url: string;
  width: number;
  height: number;
  distance: Distance;
  site: string;
}

export function Brief({
  state,
  distance,
  image,
  imageMessage,
  onEdit,
}: {
  state: StudyState;
  distance: Distance;
  image: MapImage | null;
  imageMessage: string;
  onEdit: (site: "A" | "B" | "C") => void;
}) {
  const issues = briefIssues(state, distance);
  return (
    <article className="brief" aria-label="Field-visit decision brief">
      <header className="brief-heading">
        <div>
          <h1>Field-visit decision brief</h1>
          <p>Duren Sawit, East Jakarta</p>
        </div>
        <strong
          className={`brief-status ${issues.length ? "needs-review" : "ready"}`}
          data-testid="brief-status"
        >
          {issues.length ? "Draft" : "Ready for review"}
        </strong>
      </header>
      <div className="brief-basis">
        <span>{distanceLabel(distance)} walking-network assumption</span>
        <span>Baseline: 26 Oct 2026</span>
        <span>Synthetic study</span>
      </div>
      <p className="brief-disclosure">
        All candidate properties, own branches, competitors, access geometry,
        and commercial evidence are fictional. This is a recommendation for
        field verification. Sales impact is unestimated.
      </p>
      {issues.length > 0 && (
        <section
          className="brief-issues"
          aria-label="Items needed to finish the brief"
        >
          <h2>Items needing review</h2>
          <ul>
            {issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </section>
      )}
      {image && image.distance === distance ? (
        <figure className="brief-map">
          {/* The image is generated from the Mapbox canvas; Next image optimization adds no value to a data URL. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.url}
            width={image.width}
            height={image.height}
            alt={`Study overview showing Site ${image.site}'s synthetic catchment at ${distanceLabel(distance)}`}
          />
          <figcaption>
            Map image: Site {image.site} catchment, with all three candidates
            for geographic context.{" "}
            <a
              className="mapboxgl-ctrl-logo brief-mapbox-logo"
              href="https://www.mapbox.com/"
              aria-label="Mapbox"
            />{" "}
            © <a href="https://www.mapbox.com/about/maps/">Mapbox</a> ©{" "}
            <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>.{" "}
            <a href="https://www.mapbox.com/map-feedback/">Improve this map</a>.
          </figcaption>
        </figure>
      ) : (
        <p className="brief-map-omitted">
          {imageMessage ||
            "Map image not captured. Return to the workspace to prepare a map image; the textual brief remains available."}
        </p>
      )}
      {candidates.map((candidate) => {
        const saved = state.recommendations[candidate.id];
        const analysis = analyses[distance][candidate.id];
        const draft = state.drafts[candidate.id];
        const current = saved && matchesBasis(saved, distance);
        return (
          <section className="brief-candidate" key={candidate.id}>
            <div className="brief-candidate-title">
              <h2>{candidate.name}</h2>
              <strong>
                {saved
                  ? { visit: "Visit", hold: "Hold", reject: "Reject" }[
                      saved.disposition
                    ]
                  : "Unassessed"}
              </strong>
              <button
                className="text-button no-print"
                onClick={() => onEdit(candidate.id)}
              >
                Edit {candidate.name}
              </button>
            </div>
            <p className="muted">{candidate.location}, fictional property</p>
            <h3>Recommendation rationale</h3>
            <p className="preserve-lines">
              {saved?.rationale || "No recommendation has been saved."}
            </p>
            {saved && !current && (
              <p className="notice">
                Review needed: the recommendation was saved under{" "}
                {distanceLabel(saved.basis.distance)}, baseline{" "}
                {saved.basis.baseline}. The comparison below uses the current{" "}
                {distanceLabel(distance)} basis.
              </p>
            )}
            {draft &&
              saved &&
              (draft.rationale !== saved.rationale ||
                draft.disposition !== saved.disposition ||
                draft.checks !== saved.checks) && (
                <p className="notice">
                  Unsaved edits are not included in this recommendation. Return
                  to the candidate to save them.
                </p>
              )}
            <dl className="brief-metrics">
              <div>
                <dt>Candidate area already covered</dt>
                <dd>{percent(analysis.coverage)}</dd>
              </div>
              <div>
                <dt>Mapped competitors in catchment</dt>
                <dd>{analysis.competitors.length} synthetic records</dd>
              </div>
              <div>
                <dt>Sales impact</dt>
                <dd>Unestimated</dd>
              </div>
            </dl>
            <p className="brief-access">
              <strong>Access:</strong> {candidate.access}
            </p>
            <h3>Existing-branch exposure</h3>
            {analysis.affected.length ? (
              <ul className="brief-branches">
                {analysis.affected.map((affected) => {
                  const branch = branches.find(
                    (item) => item.id === affected.id,
                  )!;
                  return (
                    <li key={branch.id}>
                      <strong>{branch.id}:</strong>{" "}
                      {percent(affected.branchShare)} of this existing branch’s
                      catchment is shared with the candidate. Average daily
                      sales: {money(branch.dailySales)}. Trend:{" "}
                      {branch.trend ?? "Unavailable"}. {branch.capacity}.{" "}
                      {branch.period}. Source: synthetic operations records.
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p>
                No overlap with the four modeled branch catchments at this
                assumption. This does not establish zero cannibalization risk.
              </p>
            )}
            <p className="brief-sensitivity">
              <strong>Sensitivity reference:</strong> candidate area already
              covered is {percent(analyses[500][candidate.id].coverage)} at 500
              m and {percent(analyses[1000][candidate.id].coverage)} at 1 km.
              These are synthetic network assumptions.
            </p>
            <h3>Open checks and data requests</h3>
            <p className="preserve-lines">
              {saved?.checks.trim() ||
                "No additional checks recorded. The evidence limitations below still apply."}
            </p>
            <h3>Evidence and limitations</h3>
            <ul className="brief-evidence">
              {candidate.evidence.map((evidence) => (
                <li key={evidence.id}>
                  <strong>{evidence.title}:</strong> {evidence.value}{" "}
                  <span>
                    {evidence.source}. {evidence.period}. {evidence.kind},
                    synthetic.
                  </span>{" "}
                  <em>{evidence.limitation}</em>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      <footer className="brief-footnote">
        Method: candidate overlap is shared area divided by candidate area,
        using the union of existing-branch catchments. Existing-branch exposure
        uses each branch’s area as its denominator. Reachability is computed on
        a fictional 50 m pedestrian grid; these values are not measured customer
        switching. Baseline ID: {BASELINE}.
      </footer>
    </article>
  );
}
