"use client";

import { useI18n } from "../i18n/context";
import { uiCopyKeys } from "../i18n/ui-copy";
import { HEALTH_PILLARS, type HealthPillar } from "../lib/health-pillars";

type PillarProgressProps = {
  readonly currentPillar: HealthPillar;
};

export function PillarProgress({ currentPillar }: PillarProgressProps) {
  const { t } = useI18n();
  const current = HEALTH_PILLARS.indexOf(currentPillar);

  return (
    <section className="pillar-progress" aria-label={t("assessment.pillar.aria")}>
      <p className="pillar-progress__position">
        {t("assessment.pillar.position", {
          current: String(current + 1).padStart(2, "0"),
          pillar: t(uiCopyKeys.pillar[currentPillar]),
        })}
      </p>
      <ol className="pillar-progress__chapters">
        {HEALTH_PILLARS.map((pillar, index) => {
          const state = index < current ? "completed" : index === current ? "current" : "upcoming";

          return (
            <li
              key={pillar}
              className={`pillar-progress__chapter pillar-progress__chapter--${state}`}
              aria-current={pillar === currentPillar ? "step" : undefined}
            >
              <span className="pillar-progress__number">{String(index + 1).padStart(2, "0")}</span>
              <span className="pillar-progress__label">{t(uiCopyKeys.pillar[pillar])}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
