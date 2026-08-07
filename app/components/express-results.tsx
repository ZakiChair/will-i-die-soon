"use client";

import { useI18n } from "../i18n/context";
import { uiCopyKeys } from "../i18n/ui-copy";
import { buildExpressSummary } from "../lib/express-summary";
import type { AnswerMap } from "../lib/types";

export function ExpressResults({ answers }: { readonly answers: AnswerMap }) {
  const { locale, t } = useI18n();
  const summary = buildExpressSummary(answers);
  const numberFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const ratioFormat = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const missing = t("expressResults.missing");
  const metric = (value: number | null, unit: string) =>
    value === null ? missing : `${numberFormat.format(value)} ${unit}`;
  const ratio = (value: number) =>
    t("expressResults.strength.ratio", { ratio: ratioFormat.format(value) });
  const frequency = summary.nutrition.ultraProcessedFrequency === null
    ? missing
    : t(uiCopyKeys.expressFrequency[summary.nutrition.ultraProcessedFrequency]);

  return (
    <section
      className="express-results"
      aria-labelledby="express-results-title"
    >
      <div className="express-results__heading" data-reveal="heading">
        <p className="data-label" data-reveal-item>{t("expressResults.eyebrow")}</p>
        <h2 id="express-results-title" data-reveal-item>{t("expressResults.title")}</h2>
        <p className="express-results__intro" data-reveal-item>{t("expressResults.intro")}</p>
      </div>
      <p className="express-results__context-title">{t("expressResults.context.title")}</p>
      <dl className="express-results__context">
        <div>
          <dt>{t("expressResults.context.height")}</dt>
          <dd>{metric(summary.bodyContext.heightCm, "cm")}</dd>
        </div>
        <div>
          <dt>{t("expressResults.context.weight")}</dt>
          <dd>{metric(summary.bodyContext.weightKg, "kg")}</dd>
        </div>
      </dl>
      <div className="express-results__grid" data-reveal="group">
        <article className="express-result-card" data-reveal-item>
          <h3>{t("expressResults.vo2.title")}</h3>
          <p>{metric(summary.vo2Max, "ml/kg/min")}</p>
          <p>{t("expressResults.vo2.note")}</p>
        </article>
        <article className="express-result-card" data-reveal-item>
          <h3>{t("expressResults.strength.title")}</h3>
          <dl>
            <div>
              <dt>{t("expressResults.strength.squat")}</dt>
              <dd>
                {metric(summary.strength.squatKg, "kg")}
                {summary.strength.squatBodyWeightRatio === null
                  ? null
                  : <> · <span>{ratio(summary.strength.squatBodyWeightRatio)}</span></>}
              </dd>
            </div>
            <div>
              <dt>{t("expressResults.strength.deadlift")}</dt>
              <dd>
                {metric(summary.strength.deadliftKg, "kg")}
                {summary.strength.deadliftBodyWeightRatio === null
                  ? null
                  : <> · <span>{ratio(summary.strength.deadliftBodyWeightRatio)}</span></>}
              </dd>
            </div>
          </dl>
        </article>
        <article className="express-result-card" data-reveal-item>
          <h3>{t("expressResults.sleep.title")}</h3>
          <p>{t("expressResults.sleep.hours")}: {metric(summary.sleep.hours, t("expressResults.unit.hours"))}</p>
          <p>{t("expressResults.sleep.refreshed")}: {metric(summary.sleep.refreshed, "/ 10")}</p>
        </article>
        <article className="express-result-card" data-reveal-item>
          <h3>{t("expressResults.nutrition.title")}</h3>
          <p>{t("expressResults.nutrition.plants")}: {metric(summary.nutrition.plantPortions, t("expressResults.unit.portions"))}</p>
          <p>{t("expressResults.nutrition.ultraProcessed")}: {frequency}</p>
        </article>
      </div>
      <p className="express-results__boundary">{t("expressResults.boundary")}</p>
    </section>
  );
}
