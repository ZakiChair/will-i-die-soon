"use client";

import { useMemo } from "react";

import { useI18n } from "../i18n/context";
import type { HealthPillar } from "../lib/health-pillars";
import { estimateLongevity } from "../lib/longevity";
import type { AnswerMap, ProfileContext } from "../lib/types";

export type LongevitySynthesisProps = {
  readonly answers: AnswerMap;
  readonly profile: ProfileContext;
};

const PILLAR_COLOR_CLASS: Readonly<Record<HealthPillar, string>> = {
  "cardio-energy": "longevity__bar-fill--cardio",
  "strength-neural": "longevity__bar-fill--strength",
  "sleep-circadian": "longevity__bar-fill--sleep",
  "nutrition-metabolic": "longevity__bar-fill--nutrition",
};

function formatYears(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function LongevitySynthesis({ answers, profile }: LongevitySynthesisProps) {
  const { t } = useI18n();
  const estimate = useMemo(
    () => estimateLongevity(answers, profile),
    [answers, profile],
  );

  const deltaYears = useMemo(() => {
    if (estimate.estimatedDeathAge === null || estimate.baselineDeathAge === null) {
      return null;
    }
    return Math.round((estimate.estimatedDeathAge - estimate.baselineDeathAge) * 10) / 10;
  }, [estimate.baselineDeathAge, estimate.estimatedDeathAge]);

  const coveragePercent = Math.round(estimate.coverage * 100);

  return (
    <section className="longevity" aria-labelledby="longevity-title">
      <div className="section-heading" data-reveal="heading">
        <p className="data-label" data-reveal-item>{t("longevity.eyebrow")}</p>
        <h2 id="longevity-title" data-reveal-item>{t("longevity.title")}</h2>
        <p data-reveal-item>{t("longevity.intro")}</p>
      </div>

      {estimate.eligible &&
      estimate.estimatedDeathAge !== null &&
      estimate.range !== null ? (
        <div className="longevity__hero" data-reveal="single">
          <p className="data-label">{t("longevity.age.label")}</p>
          <p className="longevity__age">
            {t("longevity.age.years", {
              age: Math.round(estimate.estimatedDeathAge),
            })}
          </p>
          <p className="longevity__range">
            {t("longevity.age.range", {
              low: Math.round(estimate.range.low),
              high: Math.round(estimate.range.high),
            })}
          </p>
          <p className="longevity__baseline">
            {t("longevity.age.baseline", {
              baseline: Math.round(estimate.baselineDeathAge ?? 0),
            })}
            {" · "}
            {deltaYears === null || Math.abs(deltaYears) < 0.5
              ? t("longevity.age.delta.neutral")
              : deltaYears > 0
                ? t("longevity.age.delta.positive", { years: formatYears(deltaYears) })
                : t("longevity.age.delta.negative", {
                    years: formatYears(Math.abs(deltaYears)),
                  })}
          </p>
          <p className="longevity__coverage">
            {t("longevity.coverage", { coverage: coveragePercent })}
          </p>
        </div>
      ) : (
        <div className="longevity__hero longevity__hero--locked" data-reveal="single">
          <p className="data-label">{t("longevity.age.label")}</p>
          <p>{t("longevity.ineligible")}</p>
        </div>
      )}

      <div className="longevity__pillars" data-reveal="group">
        <h3 data-reveal-item>{t("longevity.pillars.title")}</h3>
        <ul aria-label={t("longevity.pillars.aria")}>
          {estimate.pillars.map((pillar) => (
            <li key={pillar.pillar} className="longevity__bar-row" data-reveal-item>
              <span className="longevity__bar-label">
                {t(`pillar.${pillar.pillar}.short`)}
              </span>
              <span
                className="longevity__bar-track"
                role="img"
                aria-label={
                  pillar.score === null
                    ? `${t(`pillar.${pillar.pillar}.short`)}: ${t("longevity.pillars.unanswered")}`
                    : `${t(`pillar.${pillar.pillar}.short`)}: ${t("longevity.pillars.score", { score: pillar.score })}`
                }
              >
                {pillar.score !== null ? (
                  <span
                    className={`longevity__bar-fill ${PILLAR_COLOR_CLASS[pillar.pillar]}`}
                    style={{ width: `${Math.max(2, pillar.score)}%` }}
                  />
                ) : null}
              </span>
              <span className="longevity__bar-value">
                {pillar.score === null
                  ? t("longevity.pillars.unanswered")
                  : t("longevity.pillars.score", { score: pillar.score })}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {estimate.causes.length > 0 ? (
        <div className="longevity__causes" data-reveal="group">
          <h3 data-reveal-item>{t("longevity.causes.title")}</h3>
          <p data-reveal-item>{t("longevity.causes.body")}</p>
          <ol data-reveal-item>
            {estimate.causes.map((cause) => (
              <li key={cause.cause}>
                <span>{t(`longevity.cause.${cause.cause}`)}</span>
                <strong>{t("longevity.causes.share", { share: cause.share })}</strong>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      <div className="longevity__facts" data-reveal="group">
        {estimate.fitnessAgeDelta !== null ? (
          <p data-reveal-item>
            {Math.abs(estimate.fitnessAgeDelta) < 2
              ? t("longevity.fitness.aligned")
              : estimate.fitnessAgeDelta < 0
                ? t("longevity.fitness.younger", {
                    years: formatYears(Math.abs(estimate.fitnessAgeDelta)),
                  })
                : t("longevity.fitness.older", {
                    years: formatYears(estimate.fitnessAgeDelta),
                  })}
          </p>
        ) : null}

        {estimate.gains.length > 0 ? (
          <div data-reveal-item>
            <h3>{t("longevity.gains.title")}</h3>
            <ul className="longevity__gains">
              {estimate.gains.map((gain) => (
                <li key={gain.id}>
                  <strong>{t("longevity.gains.years", { years: formatYears(gain.years) })}</strong>
                  <span>{t(`longevity.gain.${gain.id}`)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {estimate.adjustments.length > 0 ? (
        <details className="longevity__ledger" data-reveal="single">
          <summary>{t("longevity.ledger.title")}</summary>
          <ul>
            {estimate.adjustments.map((adjustment) => (
              <li key={adjustment.id}>
                <span>{t(`longevity.adj.${adjustment.id}`)}</span>
                <strong>
                  {adjustment.years >= 0
                    ? t("longevity.ledger.years.positive", {
                        years: formatYears(adjustment.years),
                      })
                    : t("longevity.ledger.years.negative", {
                        years: formatYears(Math.abs(adjustment.years)),
                      })}
                </strong>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
