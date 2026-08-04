"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useDecorativeMotion } from "../hooks/use-decorative-motion";
import { useI18n } from "../i18n/context";
import { uiCopyKeys } from "../i18n/ui-copy";
import { HEALTH_PILLARS, type HealthPillar } from "../lib/health-pillars";

export type IntermissionProps = {
  pillar: HealthPillar;
  completed: number;
  total: number;
  onContinue: () => void;
};

type PillarMedia = {
  readonly id: string;
  readonly poster: string;
  readonly video?: string;
};

const PILLAR_MEDIA: Readonly<Record<HealthPillar, PillarMedia>> = {
  "cardio-energy": {
    id: "cardio",
    poster: "/media/cardio-intermission.webp",
    video: "/media/cardio-intermission.mp4",
  },
  "strength-neural": { id: "recovery", poster: "/media/recovery-intermission.webp" },
  "sleep-circadian": { id: "sleep", poster: "/media/sleep-intermission.webp" },
  "nutrition-metabolic": { id: "metabolism", poster: "/media/metabolism-intermission.webp" },
};

function IntermissionPoster({
  poster,
  covered = false,
  onError,
}: {
  readonly poster: string;
  readonly covered?: boolean;
  readonly onError?: () => void;
}) {
  return (
    <span onErrorCapture={onError ? () => onError() : undefined}>
      <Image
        className={`intermission__poster${
          covered ? " intermission__poster--covered" : ""
        }`}
        src={poster}
        alt=""
        aria-hidden="true"
        width={1920}
        height={1080}
        sizes="(max-width: 560px) calc(100vw - 32px), (max-width: 850px) calc(100vw - 84px), 1040px"
        loading="lazy"
        decoding="async"
        draggable={false}
        unoptimized
      />
    </span>
  );
}

function AnimatedIntermissionMedia({
  poster,
  video,
  posterFailed,
  onPosterError,
}: Required<Pick<PillarMedia, "poster" | "video">> & {
  readonly posterFailed: boolean;
  readonly onPosterError: () => void;
}) {
  const [videoReady, setVideoReady] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <>
      {!posterFailed ? (
        <IntermissionPoster
          poster={poster}
          covered={videoReady}
          onError={onPosterError}
        />
      ) : null}
      <video
        className={`intermission__video${
          videoReady ? " intermission__video--ready" : ""
        }`}
        aria-hidden="true"
        tabIndex={-1}
        autoPlay
        muted
        loop
        playsInline
        preload="none"
        poster={poster}
        disablePictureInPicture
        onCanPlay={() => {
          if (!failed) setVideoReady(true);
        }}
        onError={() => {
          setVideoReady(false);
          setFailed(true);
        }}
      >
        <source src={video} type="video/mp4" />
      </video>
    </>
  );
}

export function Intermission({
  pillar,
  onContinue,
}: IntermissionProps) {
  const { t } = useI18n();
  const motionAllowed = useDecorativeMotion();
  const heading = useRef<HTMLHeadingElement>(null);
  const [posterFailed, setPosterFailed] = useState(false);
  const artwork = PILLAR_MEDIA[pillar];
  const current = HEALTH_PILLARS.indexOf(pillar) + 1;
  const showVideo = motionAllowed && Boolean(artwork.video);

  useEffect(() => {
    heading.current?.focus();
  }, []);

  return (
    <section
      className={`intermission intermission--${artwork.id}${
        posterFailed ? " intermission--poster-failed" : ""
      }`}
      aria-labelledby="intermission-title"
    >
      <div
        className={`intermission__media${
          posterFailed ? " intermission__media--poster-failed" : ""
        }`}
        aria-hidden="true"
      >
        {showVideo && artwork.video ? (
          <AnimatedIntermissionMedia
            poster={artwork.poster}
            video={artwork.video}
            posterFailed={posterFailed}
            onPosterError={() => setPosterFailed(true)}
          />
        ) : (
          !posterFailed ? (
            <IntermissionPoster
              poster={artwork.poster}
              onError={() => setPosterFailed(true)}
            />
          ) : null
        )}
      </div>
      <div className="intermission__panel">
        <p className="data-label">
          {t("intermission.eyebrow", { current: String(current).padStart(2, "0") })}
        </p>
        <h1 id="intermission-title" ref={heading} tabIndex={-1}>
          {t("intermission.title", { pillar: t(uiCopyKeys.pillar[pillar]) })}
        </h1>
        <p>{t("intermission.body")}</p>
        <button className="primary-action" type="button" onClick={onContinue}>
          {t("intermission.continue")}
        </button>
      </div>
    </section>
  );
}
