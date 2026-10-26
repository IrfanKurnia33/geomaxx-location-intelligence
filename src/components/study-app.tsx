"use client";

import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  analyses,
  BASELINE,
  branches,
  candidates,
  candidateIds,
  distanceLabel,
  money,
  percent,
  type CandidateId,
  type Distance,
} from "@/lib/study";
import {
  briefIssues,
  draftChanged,
  emptyDraft,
  matchesBasis,
  parseView,
  type Draft,
  type ViewState,
} from "@/lib/decisions";
import { useBrowserStudy } from "@/lib/browser-study";
import { Brief, type MapImage } from "./brief";
import type { MapHandle } from "./map-pane";
import { Collapsible, CollapsibleContent, CollapsibleTrigger, Disclosure } from "./ui/collapsible";
import { AnimatedNumber } from "./ui/animated-number";
import { ProductTour } from "./product-tour";
import Image from "next/image";

const MapPane = dynamic(() => import("./map-pane"), {
  ssr: false,
  loading: () => (
    <div className="map-loading" role="status">
      Preparing location context…
    </div>
  ),
});

function Icon({ name }: { name: "map" | "print" | "back" | "brief" | "collapse" }) {
  const paths = {
    map: "m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Zm6-2v16m6-14v16",
    print: "M6 9V3h12v6M6 17H3V9h18v8h-3M6 14h12v7H6v-7",
    back: "m12 5-7 7 7 7M5 12h15",
    brief: "M6 3h9l4 4v14H6V3Zm8 0v5h5M9 12h7m-7 4h7",
    collapse: "m7 10 5 5 5-5",
  };
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}

export default function StudyApp({ initialView }: { initialView: ViewState }) {
  const [view, setView] = useState(initialView);
  const {
    state,
    setState,
    hydrated,
    storageMessage,
    storageError,
    invalidStorage,
    retryStorage: retryBrowserStorage,
  } = useBrowserStudy();
  const [formError, setFormError] = useState("");
  const [preparing, setPreparing] = useState(false);
  const [image, setImage] = useState<MapImage | null>(null);
  const [imageMessage, setImageMessage] = useState("");
  const [studyOpen, setStudyOpen] = useState(true);
  const [candidateOpen, setCandidateOpen] = useState(true);
  const [lowerPanel, setLowerPanel] = useState<"map" | "comparison" | null>("map");
  const comparisonOpen = lowerPanel === "comparison";
  const map = useRef<MapHandle>(null);
  const inspectionHeading = useRef<HTMLHeadingElement>(null);
  const activeView = useRef(view);
  const candidate = candidates.find((item) => item.id === view.site)!;
  const analysis = analyses[view.distance][view.site];
  const draft = state.drafts[view.site] ?? emptyDraft();
  const recommendation = state.recommendations[view.site];
  const issues = briefIssues(state, view.distance);
  const assessed = candidateIds.filter(
    (id) => state.recommendations[id],
  ).length;

  useEffect(() => {
    const onPopState = () => {
      setView(parseView(new URLSearchParams(location.search)));
      setFormError("");
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    activeView.current = view;
  }, [view]);

  const navigate = useCallback(
    (next: Partial<ViewState>) => {
      const updated = { ...view, ...next };
      const params = new URLSearchParams(location.search);
      Object.entries(updated).forEach(([key, value]) =>
        params.set(key, String(value)),
      );
      window.history.pushState(null, "", `?${params.toString()}`);
      setView(updated);
      setFormError("");
      if (next.site || next.panel) setCandidateOpen(true);
      if (next.site)
        window.requestAnimationFrame(() => inspectionHeading.current?.focus());
    },
    [view],
  );

  const select = useCallback(
    (id: CandidateId, panel: ViewState["panel"] = "evidence") => {
      navigate({ site: id, panel });
    },
    [navigate],
  );

  function editDraft(values: Partial<Draft>) {
    setState((current) => ({
      ...current,
      drafts: {
        ...current.drafts,
        [view.site]: {
          ...(current.drafts[view.site] ?? emptyDraft()),
          ...values,
        },
      },
    }));
    setFormError("");
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.disposition || !draft.rationale.trim()) {
      setFormError(
        "Choose a recommendation and write its rationale before saving.",
      );
      document
        .getElementById(
          !draft.disposition ? "recommendation-choice" : "rationale",
        )
        ?.focus();
      return;
    }
    const saved = {
      ...draft,
      disposition: draft.disposition,
      rationale: draft.rationale.trim(),
      basis: { distance: view.distance, baseline: BASELINE },
      savedAt: new Date().toISOString(),
    };
    setState((current) => ({
      ...current,
      drafts: {
        ...current.drafts,
        [view.site]: {
          disposition: saved.disposition,
          rationale: saved.rationale,
          checks: saved.checks,
        },
      },
      recommendations: { ...current.recommendations, [view.site]: saved },
    }));
    setFormError("");
  }

  async function reviewBrief() {
    setPreparing(true);
    setImage(null);
    const unchanged = () =>
      activeView.current.site === view.site &&
      activeView.current.distance === view.distance &&
      activeView.current.view === "workspace";
    try {
      const captured = await map.current?.capture();
      if (!captured)
        throw new Error(
          "Map image omitted: the map is not ready. The textual brief remains available.",
        );
      if (unchanged()) {
        setImage({ ...captured, distance: view.distance, site: view.site });
        setImageMessage("");
      }
    } catch (error) {
      if (unchanged())
        setImageMessage(
          error instanceof Error
            ? error.message
            : "Map image could not be captured. The textual brief remains available.",
        );
    } finally {
      setPreparing(false);
      if (unchanged()) {
        navigate({ view: "brief" });
        window.scrollTo({ top: 0, behavior: "instant" });
      }
    }
  }

  function retryStorage() {
    if (
      invalidStorage &&
      !window.confirm(
        "Replace the unreadable stored draft with the current study? The original stored text will be replaced.",
      )
    )
      return;
    retryBrowserStorage();
  }

  function decisionStatus(id: CandidateId) {
    const saved = state.recommendations[id];
    if (!saved) return "Unassessed";
    if (draftChanged(state.drafts[id] ?? saved, saved)) return "Unsaved edits";
    if (!matchesBasis(saved, view.distance)) return "Review needed";
    return { visit: "Visit", hold: "Hold", reject: "Reject" }[
      saved.disposition
    ];
  }

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to workspace
      </a>
      <header className="app-header no-print">
        <div className="header-inner">
          <button
            className="wordmark"
            onClick={() =>
              navigate({
                site: "A",
                distance: 500,
                view: "workspace",
                panel: "evidence",
              })
            }
            aria-label="GeoMaxx workspace"
          >
            <Image src="/brand/logomark.svg" alt="" width={30} height={30} priority />
            GeoMaxx
          </button>
          <span className="header-divider" />
          <span className="workspace-name">Expansion workspace</span>
          <span className="header-study">Duren Sawit, Jakarta</span>
          <span className="storage-status" role="status">
            {hydrated ? storageMessage : "Loading browser draft…"}
          </span>
          {view.view === "workspace" && <ProductTour enabled={hydrated && !storageError} onPrepare={() => { setStudyOpen(true); setCandidateOpen(true); setLowerPanel("comparison"); }} />}
        </div>
      </header>
      <main id="main" className={`app-main ${view.view === "workspace" ? "map-workspace" : "brief-workspace"}`}>
        {storageError && (
          <div className="storage-warning no-print" role="alert">
            <p>{storageMessage}</p>
            <button className="text-button" onClick={retryStorage}>
              {invalidStorage
                ? "Replace unreadable draft"
                : "Retry browser storage"}
            </button>
          </div>
        )}
        <div className="study-heading no-print" hidden={view.view === "workspace"}>
          <div>
            <h1>Duren Sawit expansion</h1>
            <p>Compare locations. Make the case for a field visit.</p>
          </div>
          <div className="brief-actions">
            {view.view === "brief" ? (
              <>
                <button
                  className="button"
                  onClick={() => navigate({ view: "workspace" })}
                >
                  <Icon name="back" />
                  Workspace
                </button>
                <button
                  className="button primary"
                  onClick={() => window.print()}
                >
                  <Icon name="print" />
                  Print / save PDF
                </button>
              </>
            ) : null}
          </div>
        </div>
        <div
          className="workspace"
          hidden={view.view !== "workspace"}
          inert={preparing}
          aria-busy={preparing}
        >
          <Collapsible className="study-toolbar floating-panel" open={studyOpen} onOpenChange={setStudyOpen} data-tour="study">
            <div className="study-title">
              <div><h1>Duren Sawit expansion</h1><p>Compare locations. Make the case for a field visit.</p></div>
              <CollapsibleTrigger className="icon-button panel-toggle" aria-label={studyOpen ? "Collapse study settings" : "Expand study settings"}><Icon name="collapse" /></CollapsibleTrigger>
            </div>
            <CollapsibleContent open={studyOpen} className="panel-content" contentClassName="study-settings">
            <div className="study-location">
              <Icon name="map" />
              <span>Duren Sawit, East Jakarta</span>
            </div>
            <fieldset className="distance-control">
              <legend>Walking network</legend>
              {([500, 1000] as Distance[]).map((distance) => (
                <label key={distance}>
                  <input
                    type="radio"
                    name="distance"
                    value={distance}
                    checked={view.distance === distance}
                    onChange={() => {
                      setImage(null);
                      navigate({ distance });
                    }}
                  />
                  <span>{distanceLabel(distance)}</span>
                </label>
              ))}
            </fieldset>
            <div className="study-disclosure">
              <span className="sample-tag">Synthetic study</span>
              <span>Baseline 26 Oct 2026</span>
            </div>
            <p className="study-fiction">
              Fictional sites, branch records, and pedestrian geometry.
            </p>
            </CollapsibleContent>
          </Collapsible>
          <div className="workspace-grid">
            {view.view === "workspace" && (
              <MapPane
                ref={map}
                site={view.site}
                distance={view.distance}
                onSelect={select}
                informationOpen={lowerPanel === "map"}
                onInformationOpenChange={(open) => setLowerPanel(open ? "map" : null)}
              />
            )}
            <Collapsible asChild open={candidateOpen} onOpenChange={setCandidateOpen}>
            <aside className="candidate-panel floating-panel" aria-label="Selected candidate" data-tour="candidate">
              <div className="candidate-heading">
                <span className="inspector-site-letter" aria-hidden="true">{candidate.id}</span>
                <div>
                  <h2 ref={inspectionHeading} tabIndex={-1}>
                    {candidate.name}
                  </h2>
                  <p>{candidate.location}</p>
                </div>
                <span className="decision-state" data-testid="selected-status">
                  {decisionStatus(candidate.id)}
                </span>
                <CollapsibleTrigger className="icon-button panel-toggle" aria-label={candidateOpen ? "Collapse candidate panel" : "Expand candidate panel"}><Icon name="collapse" /></CollapsibleTrigger>
              </div>
              <CollapsibleContent open={candidateOpen} className="candidate-content panel-content" contentClassName="candidate-content-inner">
              <nav className="panel-tabs" aria-label="Candidate details">
                <button
                  aria-pressed={view.panel === "evidence"}
                  onClick={() => navigate({ panel: "evidence" })}
                >
                  Evidence
                </button>
                <button
                  aria-pressed={view.panel === "decision"}
                  onClick={() => navigate({ panel: "decision" })}
                >
                  Recommendation
                </button>
              </nav>
              <div className="panel-body">
                {view.panel === "evidence" ? (
                  <>
                    <dl className="exposure-summary">
                      <div>
                        <dt>Candidate area already covered</dt>
                        <dd><AnimatedNumber value={analysis.coverage} format={percent} /></dd>
                      </div>
                      <div>
                        <dt>Own branches affected</dt>
                        <dd>{analysis.affected.length}</dd>
                      </div>
                    </dl>
                    <div className="exposure-bar" aria-hidden="true"><span style={{ transform: `scaleX(${analysis.coverage})` }} /></div>
                    <div className="exposure-legend"><span><i className="key-covered" />Already covered</span><span><i className="key-new" />Additional coverage</span></div>
                    <p className="metric-explanation">
                      Area of this candidate’s catchment covered by existing
                      branches. Sales impact is unestimated.
                    </p>
                    <Disclosure className="evidence-group" title="Access and field checks">
                      <p>{candidate.access}</p>
                      <p className="evidence-gap">{candidate.gap}.</p>
                    </Disclosure>
                    <Disclosure className="evidence-group" title="Existing branches">
                      {analysis.affected.length ? (
                        analysis.affected.map((affected) => {
                          const branch = branches.find(
                            (item) => item.id === affected.id,
                          )!;
                          return (
                            <Disclosure className="branch-record" key={branch.id} title={<>
                                <span>{branch.id}</span>
                                <span>
                                  {percent(affected.branchShare)} branch
                                  exposure
                                </span>
                              </>}>
                              <div className="branch-record-body">
                                <p>
                                  {percent(affected.branchShare)} of {branch.id}
                                  ’s catchment is shared with {candidate.name}.
                                </p>
                                <dl>
                                  <div>
                                    <dt>Average daily sales</dt>
                                    <dd>{money(branch.dailySales)}</dd>
                                  </div>
                                  <div>
                                    <dt>Sales trend</dt>
                                    <dd>{branch.trend ?? "Unavailable"}</dd>
                                  </div>
                                </dl>
                                <p>{branch.capacity}.</p>
                                <p className="source-line">
                                  Synthetic operations record. {branch.period}.
                                </p>
                              </div>
                            </Disclosure>
                          );
                        })
                      ) : (
                        <p>
                          No modeled overlap at {distanceLabel(view.distance)}.
                          This does not establish zero cannibalization risk.
                        </p>
                      )}
                      {candidate.id === "B" &&
                        !analysis.affected.some(
                          (branch) => branch.id === "E03",
                        ) && (
                          <Disclosure className="branch-record" title={<>
                              <span>E03</span>
                              <span>Nearby, outside shared coverage</span>
                            </>}>
                            <div className="branch-record-body">
                              <p>{candidate.access}</p>
                              <p>
                                {branches[2].capacity}. {branches[2].period}.
                              </p>
                              <p className="source-line">
                                Synthetic operations and network records.
                              </p>
                            </div>
                          </Disclosure>
                        )}
                    </Disclosure>
                    <Disclosure className="evidence-group" title="Sources and limitations">
                      {candidate.evidence.map((evidence) => (
                        <Disclosure className="evidence-record" key={evidence.id} title={evidence.title}>
                          <div>
                            <p>{evidence.value}</p>
                            <p className="source-line">
                              {evidence.source}. {evidence.period}.{" "}
                              {evidence.kind}, synthetic.
                            </p>
                            <p className="evidence-gap">
                              {evidence.limitation}
                            </p>
                          </div>
                        </Disclosure>
                      ))}
                    </Disclosure>
                    <Disclosure className="sensitivity" title="Compare distance assumptions">
                      <table>
                        <caption>Candidate area already covered</caption>
                        <thead>
                          <tr>
                            <th scope="col">Network distance</th>
                            <th scope="col">Area covered</th>
                            <th scope="col">Own branches</th>
                          </tr>
                        </thead>
                        <tbody>
                          {([500, 1000] as Distance[]).map((distance) => (
                            <tr key={distance}>
                              <th scope="row">{distanceLabel(distance)}</th>
                              <td>
                                {percent(
                                  analyses[distance][view.site].coverage,
                                )}
                              </td>
                              <td>
                                {analyses[distance][view.site].affected
                                  .map((branch) => branch.id)
                                  .join(", ") || "None"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <p>
                        One synthetic network, two distance assumptions.
                        Observed record values do not change when the analysis
                        boundary changes.
                      </p>
                    </Disclosure>
                  </>
                ) : (
                  <form onSubmit={save} noValidate className="decision-form">
                    <h3>Your field-visit recommendation</h3>
                    <p>Record the tradeoff and what still needs checking.</p>
                    {recommendation &&
                      !matchesBasis(recommendation, view.distance) && (
                        <p className="notice">
                          Review needed. The saved recommendation uses{" "}
                          {distanceLabel(recommendation.basis.distance)}
                          {recommendation.basis.baseline !== BASELINE
                            ? " and an older baseline"
                            : ""}
                          . Saving confirms the current{" "}
                          {distanceLabel(view.distance)} basis.
                        </p>
                      )}
                    <label htmlFor="recommendation-choice">
                      Recommendation <span className="muted">(required)</span>
                    </label>
                    <select
                      id="recommendation-choice"
                      name="recommendation"
                      value={draft.disposition}
                      aria-required="true"
                      aria-invalid={Boolean(formError && !draft.disposition)}
                      aria-describedby="decision-help"
                      onChange={(event) =>
                        editDraft({
                          disposition: event.target
                            .value as Draft["disposition"],
                        })
                      }
                    >
                      <option value="">Choose a recommendation</option>
                      <option value="visit">Visit</option>
                      <option value="hold">Hold for evidence</option>
                      <option value="reject">Reject from shortlist</option>
                    </select>
                    <label htmlFor="rationale">
                      Rationale <span className="muted">(required)</span>
                    </label>
                    <textarea
                      id="rationale"
                      name="rationale"
                      maxLength={4000}
                      value={draft.rationale}
                      aria-required="true"
                      aria-invalid={Boolean(
                        formError && !draft.rationale.trim(),
                      )}
                      aria-describedby="decision-help"
                      onChange={(event) =>
                        editDraft({ rationale: event.target.value })
                      }
                    />
                    <label htmlFor="checks">
                      Open checks and data requests
                    </label>
                    <textarea
                      id="checks"
                      name="checks"
                      maxLength={4000}
                      value={draft.checks}
                      onChange={(event) =>
                        editDraft({ checks: event.target.value })
                      }
                    />
                    <p
                      className="decision-help"
                      id="decision-help"
                      role={formError ? "alert" : undefined}
                    >
                      {formError ||
                        "Source limitations are retained automatically. No requests are sent."}
                    </p>
                    <div className="decision-basis">
                      <span>Saving against {distanceLabel(view.distance)}</span>
                      <span>26 Oct 2026 baseline</span>
                    </div>
                    <button
                      type="submit"
                      className="button primary"
                      disabled={!hydrated}
                    >
                      Save recommendation
                    </button>
                    <p className="decision-save-state" role="status">
                      {recommendation &&
                      !draftChanged(draft, recommendation) &&
                      matchesBasis(recommendation, view.distance)
                        ? "Recommendation saved. You can revise it at any time."
                        : "Draft changes are kept separately until you save the recommendation."}
                    </p>
                  </form>
                )}
              </div>
              {view.panel === "evidence" && (
                <div className="panel-footer">
                  <button
                    className="button primary"
                    onClick={() => navigate({ panel: "decision" })}
                  >
                    Record recommendation
                  </button>
                </div>
              )}
              </CollapsibleContent>
            </aside>
            </Collapsible>
            <Collapsible asChild open={comparisonOpen} onOpenChange={(open) => setLowerPanel(open ? "comparison" : null)}>
            <section
              className="comparison floating-panel"
              aria-labelledby="comparison-heading"
              data-tour="comparison"
            >
              <div className="comparison-heading">
                <span className="comparison-icon" aria-hidden="true"><Icon name="map" /></span>
                <h2 id="comparison-heading">Candidate comparison</h2>
                <span className="comparison-count">{assessed} of 3 assessed</span>
                <CollapsibleTrigger className="icon-button panel-toggle" aria-label={comparisonOpen ? "Collapse comparison" : "Expand comparison"}><Icon name="collapse" /></CollapsibleTrigger>
              </div>
              <CollapsibleContent open={comparisonOpen} className="panel-content">
              <div className="table-wrap">
                <table className="candidate-table">
                  <caption className="visually-hidden">
                    Three fictional candidates, compared on the same{" "}
                    {distanceLabel(view.distance)} walking-network assumption
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Candidate</th>
                      <th scope="col">Demand evidence</th>
                      <th scope="col">
                        Already covered <span>Candidate area</span>
                      </th>
                      <th scope="col">Own branches</th>
                      <th scope="col">
                        Competitors <span>Mapped records</span>
                      </th>
                      <th scope="col">Evidence gap</th>
                      <th scope="col">Recommendation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidates.map((item) => {
                      const data = analyses[view.distance][item.id];
                      return (
                        <tr
                          key={item.id}
                          className={view.site === item.id ? "is-selected" : ""}
                        >
                          <th scope="row" data-label="Candidate">
                            <button
                              className="site-select"
                              aria-label={`Inspect ${item.name}`}
                              aria-pressed={view.site === item.id}
                              onClick={() => select(item.id)}
                            >
                              <span className="site-letter">{item.id}</span>
                              <span>
                                {item.name}
                                <small>{item.location}</small>
                              </span>
                            </button>
                          </th>
                          <td data-label="Demand evidence">
                            {item.id === "C"
                              ? "One evening count"
                              : "Residential context"}
                            <small>
                              Synthetic{" "}
                              {item.id === "C" ? "observation" : "record"}
                            </small>
                          </td>
                          <td
                            data-label="Already covered"
                            className="coverage-cell"
                          >
                            <strong><AnimatedNumber value={data.coverage} format={percent} /></strong>
                            <span className="coverage-track" aria-hidden="true">
                              <span
                                style={{ transform: `scaleX(${data.coverage})` }}
                              />
                            </span>
                          </td>
                          <td data-label="Own branches">
                            {data.affected
                              .map((branch) => branch.id)
                              .join(", ") || "No modeled overlap"}
                          </td>
                          <td data-label="Competitors">
                            {data.competitors.length}
                          </td>
                          <td className="gap-cell" data-label="Evidence gap">
                            {item.gap}
                          </td>
                          <td data-label="Recommendation">
                            <button
                              className="recommendation-link"
                              onClick={() =>
                                navigate({ site: item.id, panel: "decision" })
                              }
                            >
                              {decisionStatus(item.id)}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="comparison-footer">
                <p>
                  Sales impact is unestimated. Prioritize visits with a written
                  rationale.
                </p>
                <span>Up to 2 field visits</span>
              </div>
              </CollapsibleContent>
            </section>
            </Collapsible>
          </div>
          <div className="study-actions" data-tour="brief">
            <div className="brief-action-status"><span>Decision brief</span><small>Up to 2 field visits</small></div>
            <button className="button primary" onClick={() => void reviewBrief()} disabled={preparing || !hydrated} aria-busy={preparing}>
              <Icon name="brief" />{preparing ? "Preparing brief…" : "Review brief"}
            </button>
          </div>
          <footer className="workspace-footer">
            <span>Working draft, stored in this browser</span>
            <button
              className="text-button"
              onClick={() => void reviewBrief()}
              disabled={preparing || !hydrated}
            >
              {issues.length ? "Review draft brief" : "Review completed brief"}
            </button>
          </footer>
        </div>
        {view.view === "brief" && (
          <Brief
            state={state}
            distance={view.distance}
            image={image}
            imageMessage={imageMessage}
            onEdit={(site) => {
              navigate({ site, view: "workspace", panel: "decision" });
              window.scrollTo({ top: 0, behavior: "instant" });
            }}
          />
        )}
      </main>
    </>
  );
}
