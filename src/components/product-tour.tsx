"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useRef, useState, type CSSProperties } from "react";

const STORAGE_KEY = "geomaxx-tour-v1";
const steps = [
  { target: "study", title: "Set the study boundary", text: "Compare the same 500 m or 1 km walking network across all three fictional sites. Changing distance updates every candidate together." },
  { target: "map-controls", title: "Explore the location", text: "Switch between satellite imagery and a 3D city view. Select a candidate marker to inspect it. The basemap is real; the analysis geometry is fictional." },
  { target: "comparison", title: "Compare all three candidates", text: "See shared coverage, nearby branches, competitors, and evidence gaps side by side. Select a site to inspect it; collapse this panel for more map space." },
  { target: "candidate", title: "Build your recommendation", text: "Inspect sources and field checks in Evidence. In Recommendation, choose visit, hold, or reject, then save your rationale. Drafts stay in this browser." },
  { target: "brief", title: "Take the case to review", text: "Review your decision brief, resolve any outstanding checks, then print or save a PDF. Up to two field visits are allowed; recommending none is valid." },
] as const;

export function ProductTour({ enabled, onPrepare }: { enabled: boolean; onPrepare: () => void }) {
  const [welcome, setWelcome] = useState(false);
  const [step, setStep] = useState<number | null>(null);
  const [spotlight, setSpotlight] = useState<CSSProperties>();
  const launch = useRef<HTMLButtonElement>(null);
  const current = step === null ? null : steps[step];

  useEffect(() => {
    if (!enabled) return;
    const frame = requestAnimationFrame(() => {
      try { setWelcome(!localStorage.getItem(STORAGE_KEY)); }
      catch { setWelcome(true); }
    });
    return () => cancelAnimationFrame(frame);
  }, [enabled]);

  useEffect(() => {
    if (!current) return;
    const target = document.querySelector<HTMLElement>(`[data-tour="${current.target}"]`);
    if (!target) return;
    target.scrollIntoView({ block: "nearest", behavior: "instant" });
    const update = () => {
      const bounds = target.getBoundingClientRect();
      setSpotlight({ left: bounds.left - 5, top: bounds.top - 5, width: bounds.width + 10, height: bounds.height + 10 });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(target);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [current]);

  function remember() {
    setWelcome(false);
    try { localStorage.setItem(STORAGE_KEY, "seen"); } catch { /* The tour works without browser storage. */ }
  }

  function start() {
    onPrepare();
    setWelcome(false);
    setStep(0);
  }

  function finish() {
    remember();
    setStep(null);
  }

  return (
    <>
      <button ref={launch} className="tour-launch" onClick={start} disabled={!enabled}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="m10 8 6 4-6 4V8Z" /></svg>
        Product tour
      </button>
      {welcome && enabled && (
        <aside className="tour-welcome no-print" aria-label="Welcome to GeoMaxx">
          <div><strong>First time here?</strong><p>Get to know your expansion workspace.</p></div>
          <button className="text-button" onClick={start}>Start tour</button>
          <button className="icon-button" aria-label="Dismiss welcome" onClick={remember}>×</button>
        </aside>
      )}
      <Dialog.Root open={step !== null} onOpenChange={(open) => { if (!open) finish(); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="tour-overlay no-print">
            {spotlight && <div className="tour-spotlight" style={spotlight} />}
          </Dialog.Overlay>
          <Dialog.Content
            className="tour-dialog no-print"
            data-placement={current?.target}
            onCloseAutoFocus={(event) => { event.preventDefault(); launch.current?.focus(); }}
          >
            <div className="tour-step-label"><span>Workspace guide</span><span>{(step ?? 0) + 1} / {steps.length}</span></div>
            <Dialog.Title>{current?.title}</Dialog.Title>
            <Dialog.Description>{current?.text}</Dialog.Description>
            <div className="tour-progress" aria-hidden="true">{steps.map((item, index) => <span key={item.target} className={index <= (step ?? 0) ? "is-complete" : ""} />)}</div>
            <div className="tour-actions">
              <button className="text-button" onClick={finish}>Skip tour</button>
              <div>
                <button className="button" disabled={step === 0} onClick={() => setStep((value) => Math.max(0, (value ?? 0) - 1))}>Back</button>
                <button className="button primary" onClick={() => step === steps.length - 1 ? finish() : setStep((value) => (value ?? 0) + 1)}>{step === steps.length - 1 ? "Explore workspace" : "Next"}</button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
