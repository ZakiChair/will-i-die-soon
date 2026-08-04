"use client";

import Image from "next/image";
import { useI18n } from "../i18n/context";
import { uiCopyKeys } from "../i18n/ui-copy";
import { HEALTH_PILLARS, type HealthPillar } from "../lib/health-pillars";

export type IntermissionProps = {
  pillar: HealthPillar;
  completed: number;
  total: number;
  onContinue: () => void;
};

function artworkFor(pillar: HealthPillar) {
  switch (pillar) {
    case "cardio-energy":
      return { id: "cardio", src: "/media/canopy-hero.webp" } as const;
    case "strength-neural":
      return { id: "recovery", src: "/media/recovery-intermission.webp" } as const;
    case "sleep-circadian":
      return { id: "sleep", src: "/media/sleep-intermission.webp" } as const;
    case "nutrition-metabolic":
      return { id: "metabolism", src: "/media/metabolism-intermission.webp" } as const;
  }
}

export function Intermission({
  pillar,
  onContinue,
}: IntermissionProps) {
  const { t } = useI18n();
  const artwork = artworkFor(pillar);
  const current = HEALTH_PILLARS.indexOf(pillar) + 1;

  return (
    <section
      className={`intermission intermission--${artwork.id}`}
      aria-labelledby="intermission-title"
    >
      <div className="intermission__media" aria-hidden="true">
        <Image
          src={artwork.src}
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
