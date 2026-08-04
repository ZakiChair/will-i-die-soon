"use client";

import Image from "next/image";
import { useState } from "react";
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
}: {
  readonly poster: string;
  readonly covered?: boolean;
}) {
  return (
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
  );
}

function AnimatedIntermissionMedia({ poster, video }: Required<Pick<PillarMedia, "poster" | "video">>) {
  const [videoReady, setVideoReady] = useState(false);

  return (
    <>
      <IntermissionPoster poster={poster} covered={videoReady} />
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
        onCanPlay={() => setVideoReady(true)}
        onError={() => setVideoReady(false)}
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
  const artwork = PILLAR_MEDIA[pillar];
  const current = HEALTH_PILLARS.indexOf(pillar) + 1;
  const showVideo = motionAllowed && Boolean(artwork.video);

  return (
    <section
      className={`intermission intermission--${artwork.id}`}
      aria-labelledby="intermission-title"
    >
      <div className="intermission__media" aria-hidden="true">
        {showVideo && artwork.video ? (
          <AnimatedIntermissionMedia poster={artwork.poster} video={artwork.video} />
        ) : (
          <IntermissionPoster poster={artwork.poster} />
        )}
      </div>
      <div className="intermission__panel">
        <p className="data-label">
          {t("intermission.eyebrow", { current: String(current).padStart(2, "0") })}
        </p>
        <h1 id="intermission-title">{t("intermission.title", { pillar: t(uiCopyKeys.pillar[pillar]) })}</h1>
        <p>{t("intermission.body")}</p>
        <button className="primary-action" type="button" onClick={onContinue} autoFocus>
          {t("intermission.continue")}
        </button>
      </div>
    </section>
  );
}
