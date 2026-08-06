"use client";

import { useRef } from "react";

import { DecorativeSectionBoundary } from "./decorative-section-boundary";
import { HumanAtlasScroll, HumanAtlasStaticStory } from "./human-atlas-scroll";
import { useLandingTimeline } from "../hooks/use-landing-timeline";
import { useSectionReveal } from "../hooks/use-section-reveal";
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
  const landingRef = useRef<HTMLDivElement>(null);
  const atlasExperienceRef = useRef<HTMLElement>(null);
  const activeScene = useLandingTimeline(atlasExperienceRef);
  useSectionReveal(landingRef);
  const startExpress = () => onStart("express");

  return (
    <div className="landing" ref={landingRef}>
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
            <p className="data-label">{t("landing.atlas.hero.eyebrow")}</p>
            <h1 id="landing-title">{t("landing.atlas.hero.title")}</h1>
            <p>{t("landing.atlas.hero.body")}</p>
            <button className="landing__primary-cta" type="button" onClick={startExpress}>
              {t("landing.atlas.hero.cta")}
            </button>
            <p className="landing__scroll-hint">{t("landing.atlas.hero.scroll")}</p>
          </div>
          <div className="landing__atlas-decorative">
            <DecorativeSectionBoundary fallback={<HumanAtlasStaticStory />}>
              <HumanAtlasScroll activeScene={activeScene} />
            </DecorativeSectionBoundary>
          </div>
        </section>

        <section
          aria-labelledby="atlas-conversion-title"
          className="landing__atlas-conversion"
          data-reveal
        >
          <p className="data-label">{t("landing.atlas.conversion.eyebrow")}</p>
          <h2 id="atlas-conversion-title">{t("landing.atlas.conversion.title")}</h2>
          <p>{t("landing.atlas.conversion.body")}</p>
          <button className="landing__primary-cta" type="button" onClick={startExpress}>
            {t("landing.atlas.conversion.cta")}
          </button>
        </section>

        <section className="depth-section" aria-labelledby="depth-title" data-reveal>
          <div className="section-heading">
            <p className="data-label">{t("landing.atlas.other.eyebrow")}</p>
            <h2 id="depth-title">{t("landing.atlas.other.title")}</h2>
          </div>
          <div className="depth-grid">
            {depths.map((depth) => {
              const depthLabel = t(uiCopyKeys.depth[depth.id]);
              const inlineDepth =
                locale === "fr" ? depthLabel.toLocaleLowerCase("fr") : depthLabel;

              return (
                <article className={`depth-card depth-card--${depth.id}`} key={depth.id}>
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

        <section className="privacy-panel" aria-labelledby="privacy-title" data-reveal>
          <div>
            <p className="privacy-panel__eyebrow">{t("landing.privacy.eyebrow")}</p>
            <h2 id="privacy-title">{t("landing.privacy.title")}</h2>
          </div>
          <dl className="privacy-panel__facts">
            <div>
              <dt>{t("landing.privacy.local.title")}</dt>
              <dd>{t("landing.privacy.local.body")}</dd>
            </div>
            <div>
              <dt>{t("landing.privacy.evidence.title")}</dt>
              <dd>{t("landing.privacy.evidence.body")}</dd>
            </div>
            <div>
              <dt>{t("landing.privacy.boundary.title")}</dt>
              <dd>{t("landing.privacy.boundary.body")}</dd>
            </div>
          </dl>
        </section>
      </div>

      <footer className="landing__footnote" data-reveal>{t("landing.urgent")}</footer>
    </div>
  );
}
