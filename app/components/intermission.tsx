"use client";

import Image from "next/image";
import type { HealthDomain } from "../lib/types";

export type IntermissionProps = {
  completedDomain: HealthDomain;
  completed: number;
  total: number;
  onContinue: () => void;
};

function domainLabel(domain: HealthDomain) {
  return domain.replaceAll("-", " ");
}

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
        <p className="data-label">Milestone · {completed} of {total}</p>
        <h1 id="intermission-title">A moment to let the map settle.</h1>
        <p>
          You have completed the {domainLabel(completedDomain)} section. Your answers
          are still here in this browser session.
        </p>
        <button className="primary-action" type="button" onClick={onContinue} autoFocus>
          Continue assessment
        </button>
      </div>
    </section>
  );
}
