"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type { Map as MapboxMap, GeoJSONSource } from "mapbox-gl";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import {
  analyses,
  branches,
  candidates,
  cellPoint,
  cellRing,
  competitors,
  distanceLabel,
  lngLat,
  type CandidateId,
  type Distance,
} from "@/lib/study";
import { SyntheticMap } from "./synthetic-map";
import { Disclosure } from "./ui/collapsible";

export interface MapHandle {
  capture(): Promise<{ url: string; width: number; height: number }>;
}
interface Props {
  site: CandidateId;
  distance: Distance;
  onSelect: (id: CandidateId) => void;
  informationOpen: boolean;
  onInformationOpenChange: (open: boolean) => void;
}
const collection = (features: Feature[]): FeatureCollection => ({
  type: "FeatureCollection",
  features,
});
const feature = (
  geometry: Geometry,
  properties: Record<string, string> = {},
): Feature => ({ type: "Feature", geometry, properties });

function areaData(site: CandidateId, distance: Distance) {
  const analysis = analyses[distance][site];
  return collection(
    [...analysis.cells].map((key) =>
      feature(
        { type: "Polygon", coordinates: [cellRing(key)] },
        { kind: analysis.covered.has(key) ? "covered" : "new" },
      ),
    ),
  );
}

function color(token: string): string {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = getComputedStyle(document.documentElement)
    .getPropertyValue(token)
    .trim();
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  return `rgba(${r},${g},${b},${a / 255})`;
}

function captureCanvas(map: MapboxMap, distance: Distance, site: CandidateId) {
  const source = map.getCanvas();
  if (!source.width || !source.height)
    throw new Error("The map has no rendered image.");
  const canvas = document.createElement("canvas");
  const scale = Math.min(1600 / source.width, 950 / source.height);
  const imageWidth = Math.round(source.width * scale);
  const imageHeight = Math.round(source.height * scale);
  canvas.width = 1600;
  canvas.height = imageHeight + 150;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas capture is unavailable.");
  ctx.fillStyle = color("--color-paper");
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(
    source,
    0,
    0,
    source.width,
    source.height,
    (1600 - imageWidth) / 2,
    0,
    imageWidth,
    imageHeight,
  );
  const bodyFont = getComputedStyle(document.body).fontFamily;
  ctx.fillStyle = color("--color-ink");
  ctx.font = `500 25px ${bodyFont}`;
  ctx.fillText(
    `GeoMaxx | Site ${site} catchment | ${distanceLabel(distance)} synthetic walking network`,
    35,
    imageHeight + 45,
  );
  const items = [
    ["--color-map-new", "Candidate coverage"],
    ["--color-map-covered", "Already covered"],
    ["--color-ink", "Existing branches"],
  ];
  items.forEach(([token, label], index) => {
    const x = 35 + index * 490;
    ctx.fillStyle = color(token);
    ctx.fillRect(x, imageHeight + 70, 21, 21);
    ctx.fillStyle = color("--color-ink");
    ctx.font = `400 22px ${bodyFont}`;
    ctx.fillText(label, x + 34, imageHeight + 89);
  });
  ctx.font = `400 19px ${bodyFont}`;
  ctx.fillText(
    "Fictional sites and analysis overlays. Real basemap; no real routing or sales forecast.",
    35,
    imageHeight + 130,
  );
  return {
    url: canvas.toDataURL("image/png"),
    width: canvas.width,
    height: canvas.height,
  };
}

const MapPane = forwardRef<MapHandle, Props>(function MapPane(
  { site, distance, onSelect, informationOpen, onInformationOpenChange },
  ref,
) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const propsRef = useRef({ site, distance, onSelect });
  const [status, setStatus] = useState("Preparing the map…");
  const [ready, setReady] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [mode, setMode] = useState<"satellite" | "3d">("satellite");
  const modeRef = useRef(mode);
  const [switching, setSwitching] = useState(false);
  const [styleRevision, setStyleRevision] = useState(0);
  const [tileWarning, setTileWarning] = useState("");
  const [warningDismissed, setWarningDismissed] = useState(false);
  useEffect(() => {
    propsRef.current = { site, distance, onSelect };
  }, [site, distance, onSelect]);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    if (!token) {
      setStatus("Jakarta basemap unavailable. Showing the synthetic network.");
      return;
    }
    let disposed = false;
    let map: MapboxMap | null = null;
    let loaded = false;
    const timeout = window.setTimeout(() => {
      if (!loaded && !disposed) {
        setStatus(
          "The basemap did not load. The synthetic network and comparison remain available.",
        );
        setReady(false);
      }
    }, 18000);
    async function initialize() {
      try {
        const { default: mapboxgl } = await import("mapbox-gl");
        if (disposed || !container.current) return;
        if (!mapboxgl.supported())
          throw new Error("WebGL is unavailable in this browser.");
        map = new mapboxgl.Map({
          container: container.current,
          accessToken: token,
          style: modeRef.current === "3d" ? "mapbox://styles/mapbox/standard" : "mapbox://styles/mapbox/standard-satellite",
          config: { basemap: { lightPreset: "day", showPointOfInterestLabels: false } },
          center: lngLat([-7, -3]),
          zoom: 14.4,
          preserveDrawingBuffer: true,
          attributionControl: true,
          bearing: modeRef.current === "3d" ? -24 : 0,
          pitch: modeRef.current === "3d" ? 58 : 0,
        });
        mapRef.current = map;
        map.addControl(
          new mapboxgl.NavigationControl({ visualizePitch: true }),
          "top-right",
        );
        map.addControl(
          new mapboxgl.ScaleControl({ unit: "metric" }),
          "bottom-right",
        );
        map.on("click", "candidates", (event) => {
          const id = event.features?.[0]?.properties?.id;
          if (id === "A" || id === "B" || id === "C") propsRef.current.onSelect(id);
        });
        map.on("mouseenter", "candidates", () => {
          if (map) map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", "candidates", () => {
          if (map) map.getCanvas().style.cursor = "";
        });
        map.on("style.load", () => {
          if (disposed || !map) return;
          const current = propsRef.current;
          map.addSource("study-area", {
            type: "geojson",
            data: areaData(current.site, current.distance),
          });
          map.addLayer({
            id: "study-area",
            type: "fill",
            source: "study-area",
            paint: {
              "fill-color": [
                "match",
                ["get", "kind"],
                "covered",
                color("--color-map-covered"),
                color("--color-map-new"),
              ],
              "fill-opacity": 0.46,
            },
          });
          map.addSource("barrier", {
            type: "geojson",
            data: collection([
              feature({
                type: "LineString",
                coordinates: [lngLat([4.5, -35]), lngLat([4.5, 8.5])],
              }),
              feature({
                type: "LineString",
                coordinates: [lngLat([4.5, 9.5]), lngLat([4.5, 35])],
              }),
            ]),
          });
          map.addLayer({
            id: "barrier",
            type: "line",
            source: "barrier",
            paint: {
              "line-color": color("--color-map-barrier"),
              "line-width": 4,
              "line-dasharray": [2, 1],
            },
          });
          map.addSource("crossing", {
            type: "geojson",
            data: feature({
              type: "LineString",
              coordinates: [lngLat([3, 9]), lngLat([6, 9])],
            }),
          });
          map.addLayer({
            id: "crossing",
            type: "line",
            source: "crossing",
            paint: { "line-color": color("--color-ink"), "line-width": 4 },
          });
          map.addSource("places", {
            type: "geojson",
            data: collection([
              ...candidates.map((candidate) =>
                feature(
                  { type: "Point", coordinates: lngLat(candidate.node) },
                  { id: candidate.id, label: candidate.id, kind: "candidate" },
                ),
              ),
              ...branches.map((branch) =>
                feature(
                  { type: "Point", coordinates: lngLat(branch.node) },
                  { id: branch.id, label: branch.id, kind: "branch" },
                ),
              ),
              ...competitors.map((competitor) =>
                feature(
                  { type: "Point", coordinates: lngLat(competitor.node) },
                  { id: competitor.id, label: "", kind: "competitor" },
                ),
              ),
            ]),
          });
          map.addLayer({
            id: "competitors",
            type: "circle",
            source: "places",
            filter: ["==", ["get", "kind"], "competitor"],
            paint: {
              "circle-radius": 4,
              "circle-color": color("--color-paper"),
              "circle-stroke-color": color("--color-map-competitor"),
              "circle-stroke-width": 2,
            },
          });
          map.addLayer({
            id: "branches",
            type: "circle",
            source: "places",
            filter: ["==", ["get", "kind"], "branch"],
            paint: {
              "circle-radius": 7,
              "circle-color": color("--color-ink"),
              "circle-stroke-color": color("--color-paper"),
              "circle-stroke-width": 2,
            },
          });
          map.addLayer({
            id: "candidates",
            type: "circle",
            source: "places",
            filter: ["==", ["get", "kind"], "candidate"],
            paint: {
              "circle-radius": 15,
              "circle-color": color("--color-accent"),
              "circle-stroke-color": color("--color-paper"),
              "circle-stroke-width": 3,
            },
          });
          const fonts = getComputedStyle(document.documentElement)
            .getPropertyValue("--map-glyph-fonts")
            .split(",")
            .map((font) => font.trim().replaceAll('"', ""));
          map.addLayer({
            id: "candidate-labels",
            type: "symbol",
            source: "places",
            filter: ["==", ["get", "kind"], "candidate"],
            layout: {
              "text-field": ["get", "label"],
              "text-font": fonts,
              "text-size": 13,
              "text-allow-overlap": true,
            },
            paint: { "text-color": color("--color-accent-ink") },
          });
          map.addLayer({
            id: "branch-labels",
            type: "symbol",
            source: "places",
            filter: ["==", ["get", "kind"], "branch"],
            layout: {
              "text-field": ["get", "label"],
              "text-font": fonts,
              "text-size": 12,
              "text-offset": [0, 1.5],
              "text-allow-overlap": true,
            },
            paint: {
              "text-color": color("--color-ink"),
              "text-halo-color": color("--color-paper"),
              "text-halo-width": 2,
            },
          });
          setStyleRevision((value) => value + 1);
          map.once("idle", () => {
            if (disposed) return;
            loaded = true;
            window.clearTimeout(timeout);
            setReady(true);
            setSwitching(false);
            setStatus(`${modeRef.current === "3d" ? "3D Jakarta basemap" : "Jakarta satellite basemap"} with synthetic analysis overlays`);
          });
          map.resize();
        });
        map.on("error", (event) => {
          if (disposed) return;
          if ("status" in event.error && event.error.status === 429) {
            setTileWarning("Mapbox’s request limit was reached. Some map tiles are unavailable. Try again later.");
          }
          if (!disposed && (!loaded || !map?.getSource("study-area"))) {
            setReady(false);
            setSwitching(false);
            setStatus(
              "The basemap is unavailable. Check the token and connection, or use the synthetic network.",
            );
          }
        });
        map.on("webglcontextlost", () => {
          if (!disposed) {
            setReady(false);
            setStatus(
              "The map lost its graphics context. The comparison remains available.",
            );
          }
        });
      } catch (error) {
        if (!disposed) {
          setReady(false);
          setStatus(
            `${error instanceof Error ? error.message : "The map could not start."} Showing the synthetic network.`,
          );
        }
      }
    }
    void initialize();
    return () => {
      disposed = true;
      window.clearTimeout(timeout);
      map?.remove();
      mapRef.current = null;
    };
  }, [attempt]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !map.getSource("study-area")) return;
    (map.getSource("study-area") as GeoJSONSource)?.setData(
      areaData(site, distance),
    );
    map.setPaintProperty("candidates", "circle-stroke-width", [
      "case",
      ["==", ["get", "id"], site],
      5,
      2,
    ]);
    const cells = candidates.flatMap((candidate) => [...analyses[distance][candidate.id].cells].map(cellPoint));
    const min = lngLat([
      Math.min(...cells.map(([x]) => x)) - 2,
      Math.min(...cells.map(([, y]) => y)) - 2,
    ]);
    const max = lngLat([
      Math.max(...cells.map(([x]) => x)) + 2,
      Math.max(...cells.map(([, y]) => y)) + 2,
    ]);
    const fit = () => {
      if (!map.getSource("study-area") || !container.current) return;
      map.resize();
      map.fitBounds([min, max], {
        padding: container.current.clientWidth > 900
          ? { top: 70, bottom: Math.min(370, container.current.clientHeight * 0.44), left: 330, right: 385 }
          : { top: 220, bottom: 55, left: 35, right: 55 },
        pitch: modeRef.current === "3d" ? 58 : 0,
        bearing: modeRef.current === "3d" ? -24 : 0,
        duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 250,
      });
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(container.current!);
    return () => observer.disconnect();
  }, [site, distance, ready, styleRevision]);

  function changeMode(next: typeof mode) {
    const map = mapRef.current;
    if (!map || !ready || switching || next === mode) return;
    modeRef.current = next;
    setMode(next);
    setTileWarning("");
    setWarningDismissed(false);
    setSwitching(true);
    setStatus(`Loading ${next === "3d" ? "3D city view" : "satellite imagery"}…`);
    map.setStyle(next === "3d" ? "mapbox://styles/mapbox/standard" : "mapbox://styles/mapbox/standard-satellite", {
      localFontFamily: null,
      localIdeographFontFamily: "sans-serif",
      config: { basemap: { lightPreset: "day", showPointOfInterestLabels: false } },
    });
  }

  useEffect(() => {
    if (!switching) return;
    const timeout = window.setTimeout(() => {
      setReady(false);
      setSwitching(false);
      setStatus("The map view did not load. Retry the map or continue with the synthetic network.");
    }, 18000);
    return () => window.clearTimeout(timeout);
  }, [switching]);

  useImperativeHandle(
    ref,
    () => ({
      capture: async () => {
        const map = mapRef.current;
        if (!map || !ready || switching)
          throw new Error(
            "Map image omitted: the Jakarta basemap is unavailable. The evidence brief is complete without it.",
          );
        const camera = {
          center: map.getCenter(),
          zoom: map.getZoom(),
          bearing: map.getBearing(),
          pitch: map.getPitch(),
          padding: map.getPadding(),
        };
        const allCells = candidates.flatMap((candidate) =>
          [...analyses[distance][candidate.id].cells].map(cellPoint),
        );
        const min = lngLat([
          Math.min(...allCells.map(([x]) => x)) - 2,
          Math.min(...allCells.map(([, y]) => y)) - 2,
        ]);
        const max = lngLat([
          Math.max(...allCells.map(([x]) => x)) + 2,
          Math.max(...allCells.map(([, y]) => y)) + 2,
        ]);
        try {
          await new Promise<void>((resolve, reject) => {
            const timeout = window.setTimeout(() => {
              map.off("idle", done);
              reject(
                new Error(
                  "Map image omitted: the map did not finish rendering. Try again from the workspace.",
                ),
              );
            }, 9000);
            const done = () => {
              window.clearTimeout(timeout);
              resolve();
            };
            map.once("idle", done);
            map.fitBounds([min, max], { padding: 45, retainPadding: false, duration: 0, pitch: 0, bearing: 0 });
            map.triggerRepaint();
          });
          return captureCanvas(map, distance, site);
        } finally {
          map.jumpTo(camera);
        }
      },
    }),
    [distance, ready, site, switching],
  );

  return (
    <section className="map-panel" aria-label="Location map" data-map-mode={mode}>
      <div className="map-stage">
        <div
          ref={container}
          className={`mapbox-host ${ready ? "is-ready" : ""}`}
          aria-label="Mapbox map of Jakarta with fictional candidate overlays"
        />
        {!ready && (
          <SyntheticMap site={site} distance={distance} onSelect={onSelect} />
        )}
      </div>
      <div className="map-utilities">
        <div className="map-view-controls" role="group" aria-label="Map view" aria-busy={switching} data-tour="map-controls">
          <button aria-pressed={mode === "satellite"} disabled={!ready || switching} onClick={() => changeMode("satellite")}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="m3 7 9-4 9 4-9 4-9-4Zm0 5 9 4 9-4M3 17l9 4 9-4" /></svg>2D satellite</button>
          <button aria-pressed={mode === "3d"} disabled={!ready || switching} onClick={() => changeMode("3d")}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="m12 3 9 5v9l-9 5-9-5V8l9-5Zm0 10v9M3 8l9 5 9-5M12 3v10" /></svg>3D view</button>
        </div>
      <Disclosure className="map-information floating-panel" title="Map legend & context" open={informationOpen} onOpenChange={onInformationOpenChange}>
        <div className="map-heading">
          <h2>Location context</h2>
          <span className="map-mode">{ready ? "Jakarta basemap" : "Synthetic network"}</span>
        </div>
        <div className="map-key">
          <span>
            <i className="key-new" />
            Candidate catchment
          </span>
          <span>
            <i className="key-covered" />
            Already covered
          </span>
          <span>
            <i className="key-branch" />
            Own branch
          </span>
          <span>
            <i className="key-competitor" />
            Competitor
          </span>
        </div>
      <div className="map-caption">
        <p role="status">{status}</p>
      </div>
      <Disclosure className="method-note" title="How to read this map">
        <p>
          The basemap is geographic context. All site locations, competitors,
          branch records, the barrier, and pedestrian links are fictional.
          Catchments use a synthetic 50 m network, not real Jakarta routing.
          Filled area shared with our branch network indicates spatial exposure;
          sales impact is unestimated.
        </p>
      </Disclosure>
      </Disclosure>
      {!ready && <div className="map-availability"><p role="status">{status}</p>{process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN && <button className="text-button" onClick={() => setAttempt((value) => value + 1)}>Retry map</button>}</div>}
      {switching && <p className="map-availability" role="status">{status}</p>}
      </div>
      {tileWarning && !warningDismissed && (
        <div className="map-tile-warning" role="status">
          <p>{tileWarning}</p>
          <button className="icon-button" aria-label="Dismiss map warning" onClick={() => setWarningDismissed(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" /></svg>
          </button>
        </div>
      )}
    </section>
  );
});

export default MapPane;
