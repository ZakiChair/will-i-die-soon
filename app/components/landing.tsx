"use client";

import Image from "next/image";
import { useState } from "react";
import { useDecorativeMotion } from "../hooks/use-decorative-motion";
import { useI18n } from "../i18n/context";
import { type UiCopyKey, uiCopyKeys } from "../i18n/ui-copy";
import type { AnalysisDepth } from "../lib/types";

type LandingProps = {
  onStart: (depth: AnalysisDepth) => void;
};

const depths: ReadonlyArray<{
  id: AnalysisDepth;
  detailKey: UiCopyKey;
  descriptionKey: UiCopyKey;
}> = [
  {
    id: "express",
    detailKey: "depth.express.detail",
    descriptionKey: "depth.express.description",
  },
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

function CanopyPoster({ covered = false }: { readonly covered?: boolean }) {
  return (
    <Image
      className={`landing__canopy-poster${
        covered ? " landing__canopy-poster--covered" : ""
      }`}
      src="/media/canopy-hero.webp"
      alt=""
      aria-hidden="true"
      width={1920}
      height={1080}
      sizes="(max-width: 850px) calc(100vw - 40px), 48vw"
      loading="eager"
      fetchPriority="high"
      decoding="async"
      draggable={false}
      unoptimized
    />
  );
}

function AnimatedCanopyMedia() {
  const [videoReady, setVideoReady] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <>
      <CanopyPoster covered={videoReady} />
      <video
        className={`landing__canopy-video${
          videoReady ? " landing__canopy-video--ready" : ""
        }`}
        aria-hidden="true"
        tabIndex={-1}
        autoPlay
        muted
        loop
        playsInline
        preload="none"
        poster="/media/canopy-hero.webp"
        disablePictureInPicture
        onCanPlay={() => {
          if (!failed) setVideoReady(true);
        }}
        onError={() => {
          setVideoReady(false);
          setFailed(true);
        }}
      >
        <source src="/media/canopy-loop.mp4" type="video/mp4" />
      </video>
    </>
  );
}

export function Landing({ onStart }: LandingProps) {
  const { locale, t } = useI18n();
  const motionAllowed = useDecorativeMotion();

  return (
    <div className="landing">
      <header className="landing__header">
        <div className="wordmark">
          Will I Die <strong>Soon?</strong>
        </div>
        <div className="prototype-label data-label">
          {t("landing.prototype")}
        </div>
      </header>

      <div className="landing__main">
        <section className="landing__hero" aria-labelledby="landing-title">
          <div>
            <p className="landing__kicker data-label">{t("landing.kicker")}</p>
            <h1 id="landing-title">
              {t("landing.title.before")}<span>{t("landing.title.after")}</span>
            </h1>
            <p className="landing__intro">{t("landing.intro")}</p>
            <div className="landing__rule" aria-hidden="true" />
          </div>
          <div className="landing__canopy-stage">
            <div className="landing__canopy-media" aria-hidden="true">
              {motionAllowed ? (
                <AnimatedCanopyMedia />
              ) : (
                <CanopyPoster />
              )}
            </div>
          </div>
        </section>

        <section className="depth-section" aria-labelledby="depth-title">
          <div className="section-heading">
            <p className="data-label">{t("landing.pace.eyebrow")}</p>
            <h2 id="depth-title">{t("landing.pace.title")}</h2>
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

        <section className="privacy-panel" aria-labelledby="privacy-title">
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

      <footer className="landing__footnote">
        {t("landing.urgent")}
      </footer>
    </div>
  );
}
