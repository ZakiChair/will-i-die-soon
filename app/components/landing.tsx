"use client";

import { useEffect, useState } from "react";
import { LivingCanopy } from "./living-canopy";

export type AnalysisDepth = "quick" | "detailed" | "deep";

type LandingProps = {
  onStart: (depth: AnalysisDepth) => void;
};

const depths: ReadonlyArray<{
  id: AnalysisDepth;
  label: string;
  detail: string;
  description: string;
}> = [
  {
    id: "quick",
    label: "Quick",
    detail: "20 core signals · about 3 minutes",
    description: "A concise map of current signals and protective roots.",
  },
  {
    id: "detailed",
    label: "Detailed",
    detail: "50 questions · about 8 minutes",
    description: "A broader look at habits, context, and follow-up questions.",
  },
  {
    id: "deep",
    label: "Deep",
    detail: "150–200 adaptive questions · 20–30 minutes",
    description: "A paced, domain-by-domain exploration with more context.",
  },
];

export function Landing({ onStart }: LandingProps) {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      return;
    }

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(media.matches);

    updatePreference();
    media.addEventListener("change", updatePreference);
    return () => media.removeEventListener("change", updatePreference);
  }, []);

  return (
    <div className="landing">
      <header className="landing__header">
        <div className="wordmark">
          Will I Die <strong>Soon?</strong>
        </div>
        <div className="prototype-label data-label">
          Private research prototype / local-only
        </div>
      </header>

      <div className="landing__main">
        <section className="landing__hero" aria-labelledby="landing-title">
          <div>
            <p className="landing__kicker data-label">A calmer way to inspect uncertainty</p>
            <h1 id="landing-title">
              Your health is not a verdict.<span>It is a map.</span>
            </h1>
            <p className="landing__intro">
              Explore health signals and modifiable factors in your browser.
              This prototype gives you a paced, explainable view—not a diagnosis,
              prediction, or final word about your future.
            </p>
            <div className="landing__rule" aria-hidden="true" />
          </div>
          <LivingCanopy progress={0.28} tone="calm" reducedMotion={reducedMotion} />
        </section>

        <section className="depth-section" aria-labelledby="depth-title">
          <div className="section-heading">
            <p className="data-label">Choose your pace</p>
            <h2 id="depth-title">The same map, with room for different questions.</h2>
          </div>
          <div className="depth-grid">
            {depths.map((depth) => (
              <article className="depth-card" key={depth.id}>
                <p className="depth-card__eyebrow">{depth.detail}</p>
                <h3>{depth.label}</h3>
                <p>{depth.description}</p>
                <button type="button" onClick={() => onStart(depth.id)}>
                  Choose {depth.label}
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="privacy-panel" aria-labelledby="privacy-title">
          <div>
            <p className="privacy-panel__eyebrow">Private by design</p>
            <h2 id="privacy-title">Your answers stay in this browser session.</h2>
          </div>
          <dl className="privacy-panel__facts">
            <div>
              <dt>Local only</dt>
              <dd>No account, backend, analytics, cookies, or answer storage.</dd>
            </div>
            <div>
              <dt>Evidence first</dt>
              <dd>Every later signal is designed to show its evidence tier, inputs, and limits.</dd>
            </div>
            <div>
              <dt>Clear boundary</dt>
              <dd>This private prototype explores patterns; it does not diagnose or predict death.</dd>
            </div>
          </dl>
        </section>
      </div>

      <footer className="landing__footnote">
        If you think you may be in immediate danger, contact local emergency services now.
      </footer>
    </div>
  );
}
