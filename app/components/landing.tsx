"use client";

import { useCallback, useRef, useState } from "react";

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
  const [atlasFailed, setAtlasFailed] = useState(false);
  const activeScene = useLandingTimeline(atlasExperienceRef, atlasFailed);
  useSectionReveal(landingRef);
  const startExpress = () => onStart("express");
  const handleAtlasImageFailure = useCallback(() => setAtlasFailed(true), []);

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
            <p className="data-label" data-hero-item>
              <span data-hero-handoff>{t("landing.atlas.hero.eyebrow")}</span>
            </p>
            <div className="landing__hero-title-mask" data-hero-title-mask>
              <h1 data-hero-item id="landing-title">
                <span data-hero-handoff data-hero-title>{t("landing.atlas.hero.title")}</span>
              </h1>
            </div>
            <p data-hero-item>
              <span data-hero-handoff>{t("landing.atlas.hero.body")}</span>
            </p>
            <button
              className="landing__primary-cta"
              data-hero-item
              type="button"
              onClick={startExpress}
            >
              {t("landing.atlas.hero.cta")}
            </button>
            <p className="landing__scroll-hint" data-hero-item>
              <span data-hero-handoff>{t("landing.atlas.hero.scroll")}</span>
            </p>
          </div>
          <div className="landing__atlas-decorative">
            <DecorativeSectionBoundary fallback={<HumanAtlasStaticStory />}>
              <HumanAtlasScroll
                activeScene={activeScene}
                motionDisabled={atlasFailed}
                onImageFailure={handleAtlasImageFailure}
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
          <h2 id="atlas-conversion-title" data-reveal-item>{t("landing.atlas.conversion.title")}</h2>
          <p data-reveal-item>{t("landing.atlas.conversion.body")}</p>
          <button className="landing__primary-cta" type="button" onClick={startExpress} data-reveal-item>
            {t("landing.atlas.conversion.cta")}
          </button>
          <span aria-hidden="true" className="reveal-rule" data-reveal-item="rule" />
        </section>

        <section className="depth-section" aria-labelledby="depth-title">
          <div className="section-heading" data-reveal="heading">
            <p className="data-label" data-reveal-item>{t("landing.atlas.other.eyebrow")}</p>
            <h2 id="depth-title" data-reveal-item>{t("landing.atlas.other.title")}</h2>
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
