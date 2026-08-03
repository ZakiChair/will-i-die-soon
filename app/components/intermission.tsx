"use client";

import Image from "next/image";
import { useI18n } from "../i18n/context";
import { uiCopyKeys } from "../i18n/ui-copy";
import type { HealthDomain } from "../lib/types";

export type IntermissionProps = {
  completedDomain: HealthDomain;
  completed: number;
  total: number;
  onContinue: () => void;
};

const SLEEP_DOMAINS: ReadonlySet<HealthDomain> = new Set([
  "sleep",
  "circadian-rhythm",
  "stress",
  "mood",
  "anxiety",
  "cognition",
  "social-connection",
]);

const METABOLISM_DOMAINS: ReadonlySet<HealthDomain> = new Set([
  "measurements",
  "diet",
  "hydration",
  "movement",
  "sedentary-time",
  "blood-pressure",
  "blood-testing",
  "lab-values",
]);

function artworkFor(domain: HealthDomain) {
  if (SLEEP_DOMAINS.has(domain)) {
    return { id: "sleep", src: "/media/sleep-intermission.webp" } as const;
  }
  if (METABOLISM_DOMAINS.has(domain)) {
    return {
      id: "metabolism",
      src: "/media/metabolism-intermission.webp",
    } as const;
  }
  return { id: "recovery", src: "/media/recovery-intermission.webp" } as const;
}

export function Intermission({
  completedDomain,
  completed,
  total,
  onContinue,
}: IntermissionProps) {
  const { t } = useI18n();
  const artwork = artworkFor(completedDomain);

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
          {t("intermission.eyebrow", { completed, total })}
        </p>
        <h1 id="intermission-title">{t("intermission.title")}</h1>
        <p>{t("intermission.body", { domain: t(uiCopyKeys.domain[completedDomain]) })}</p>
        <button className="primary-action" type="button" onClick={onContinue} autoFocus>
          {t("intermission.continue")}
        </button>
      </div>
    </section>
  );
}
