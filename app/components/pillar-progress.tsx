"use client";

import { useI18n } from "../i18n/context";
import { uiCopyKeys } from "../i18n/ui-copy";
import { HEALTH_PILLARS, type HealthPillar } from "../lib/health-pillars";

type PillarProgressProps = {
  readonly currentPillar: HealthPillar;
  readonly completedQuestions: number;
  readonly totalQuestions: number;
};

export function PillarProgress({
  currentPillar,
  completedQuestions,
  totalQuestions,
}: PillarProgressProps) {
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
      <ol>
        {HEALTH_PILLARS.map((pillar, index) => (
          <li key={pillar} aria-current={pillar === currentPillar ? "step" : undefined}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            {t(uiCopyKeys.pillarShort[pillar])}
          </li>
        ))}
      </ol>
      <progress value={completedQuestions} max={totalQuestions} />
    </section>
  );
}
