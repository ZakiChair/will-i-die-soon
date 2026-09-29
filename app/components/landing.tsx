"use client";

import { useCallback, useRef, useState } from "react";

import { DecorativeSectionBoundary } from "./decorative-section-boundary";
import { HumanAtlasScroll, HumanAtlasStaticStory } from "./human-atlas-scroll";
import { useLandingTimeline } from "../hooks/use-landing-timeline";
import { useSectionReveal } from "../hooks/use-section-reveal";
import { healthHomeCopy } from "../i18n/health-home-copy";
import { HealthAxisIcon } from "./health-axis-map";
import { useI18n } from "../i18n/context";
import { type UiCopyKey, uiCopyKeys } from "../i18n/ui-copy";
import type { AnalysisDepth } from "../lib/types";

type LandingProps = {
  onStart: (depth: AnalysisDepth) => void;
};

const depths: ReadonlyArray<{
  id: Exclude<AnalysisDepth, "express">;
  detailKey: UiCopyKey;
  descriptionKey: UiCopyKey;
}> = [
  {
    id: "quick",
    detailKey: "depth.quick.detail",
    descriptionKey: "depth.quick.description",
  },
  {
    id: "detailed",
    detailKey: "depth.detailed.detail",
    descriptionKey: "depth.detailed.description",
  },
  {
    id: "deep",
    detailKey: "depth.deep.detail",
    descriptionKey: "depth.deep.description",
  },
];

export function Landing({ onStart }: LandingProps) {
  const { locale, t } = useI18n();
  const copy = healthHomeCopy[locale];
  const landingRef = useRef<HTMLDivElement>(null);
  const atlasExperienceRef = useRef<HTMLElement>(null);
  const atlasProgress = useRef(0);
  const [atlasFailed, setAtlasFailed] = useState(false);
  const activeScene = useLandingTimeline(atlasExperienceRef, atlasFailed, atlasProgress);
  useSectionReveal(landingRef);
  const startExpress = () => onStart("express");
  const handleAtlasVisualFailure = useCallback(() => setAtlasFailed(true), []);

  return (
    <div className="landing landing--health" ref={landingRef}>
      <header className="landing__header">
        <div className="wordmark">
          Will I Die <strong>Soon?</strong>
        </div>
        <div className="prototype-label data-label">{t("landing.prototype")}</div>
      </header>

      <div className="landing__main">
        <section
          aria-labelledby="landing-title"
          className="landing__atlas-experience"
          ref={atlasExperienceRef}
        >
          <div className="landing__atlas-hero">
            <p className="data-label" data-hero-item>
              <span data-hero-handoff>{copy.heroEyebrow}</span>
            </p>
            <div className="landing__hero-title-mask" data-hero-title-mask>
              <h1 data-hero-item id="landing-title">
                <span data-hero-handoff data-hero-title>{copy.heroTitle}</span>
              </h1>
            </div>
            <p data-hero-item>
              <span data-hero-handoff>{copy.heroBody}</span>
            </p>
            <div className="health-home-facts">
              <span>{copy.questionCount}</span><span>{copy.ageLabel}</span><span>{locale === "fr" ? "Sans compte" : "No account"}</span>
            </div>
            <div className="landing__hero-actions">
              <button className="landing__primary-cta" type="button" onClick={startExpress}>
                {copy.cta}
              </button>
              <a className="landing__depth-link" href="#depth-title">
                {copy.secondary}
              </a>
            </div>
            <p className="landing__scroll-hint" data-hero-item>
              <span data-hero-handoff>{copy.scrollHint}</span>
            </p>
          </div>
          <div className="landing__atlas-decorative">
            <DecorativeSectionBoundary fallback={<HumanAtlasStaticStory />}>
              <HumanAtlasScroll
                activeScene={activeScene}
                progressRef={atlasProgress}
                motionDisabled={atlasFailed}
                onVisualFailure={handleAtlasVisualFailure}
              />
            </DecorativeSectionBoundary>
          </div>
        </section>

        <section
          aria-labelledby="atlas-conversion-title"
          className="landing__atlas-conversion"
          data-reveal="heading"
        >
          <p className="data-label" data-reveal-item>{t("landing.atlas.conversion.eyebrow")}</p>
          <h2 id="atlas-conversion-title" data-reveal-item>{copy.resultTitle}</h2>
          <p data-reveal-item>{copy.resultBody}</p>
          <div className="health-output-grid" data-reveal-item>
            {copy.outputs.map((output, index) => (
              <article className="health-output" key={output.title}>
                <span className="health-output__icon"><HealthAxisIcon axis={(["breath", "energy", "strength"] as const)[index]} /></span>
                <h3>{output.title}</h3><p>{output.body}</p>
              </article>
            ))}
          </div>
          <button className="landing__primary-cta" type="button" onClick={startExpress} data-reveal-item>
            {t("landing.atlas.conversion.cta")}
          </button>
          <span aria-hidden="true" className="reveal-rule" data-reveal-item="rule" />
        </section>

        <section className="depth-section" aria-labelledby="depth-title">
          <div className="section-heading" data-reveal="heading">
            <p className="data-label" data-reveal-item>{t("landing.atlas.other.eyebrow")}</p>
            <h2 id="depth-title" tabIndex={-1} data-reveal-item>{t("landing.atlas.other.title")}</h2>
          </div>
          <div className="depth-grid" data-reveal="group">
            {depths.map((depth) => {
              const depthLabel = t(uiCopyKeys.depth[depth.id]);
              const inlineDepth =
                locale === "fr" ? depthLabel.toLocaleLowerCase("fr") : depthLabel;

              return (
                <article className={`depth-card depth-card--${depth.id}`} key={depth.id} data-reveal-item>
                  <p className="depth-card__eyebrow">{t(depth.detailKey)}</p>
                  <h3>{depthLabel}</h3>
                  <p>{t(depth.descriptionKey)}</p>
                  <button type="button" onClick={() => onStart(depth.id)}>
                    {t("depth.choose", { depth: inlineDepth })}
                  </button>
                </article>
              );
            })}
          </div>
        </section>

        <section className="privacy-panel" aria-labelledby="privacy-title">
          <div data-reveal="heading">
            <p className="privacy-panel__eyebrow" data-reveal-item>{t("landing.privacy.eyebrow")}</p>
            <h2 id="privacy-title" data-reveal-item>{t("landing.privacy.title")}</h2>
          </div>
          <dl className="privacy-panel__facts" data-reveal="group">
            <div data-reveal-item>
              <dt>{t("landing.privacy.local.title")}</dt>
              <dd>{t("landing.privacy.local.body")}</dd>
            </div>
            <div data-reveal-item>
              <dt>{t("landing.privacy.evidence.title")}</dt>
              <dd>{t("landing.privacy.evidence.body")}</dd>
            </div>
            <div data-reveal-item>
              <dt>{t("landing.privacy.boundary.title")}</dt>
              <dd>{t("landing.privacy.boundary.body")}</dd>
            </div>
          </dl>
        </section>
      </div>

      <footer className="landing__footnote" data-reveal="single" data-reveal-terminal>
        {t("landing.urgent")}
      </footer>
    </div>
  );
}
