"use client";

import { useI18n } from "../i18n/context";
import type { PresentedEssentialEightResult } from "../i18n/presentation";
import { resultsExplorerCopy } from "../i18n/results-explorer-copy";
import { resultsSummaryCopy } from "../i18n/results-summary-copy";
import type { RiskLeaf } from "../lib/types";
import { ScoreDistribution } from "./score-distribution";

type ResultsOverviewProps = Readonly<{
  leaves: ReadonlyArray<RiskLeaf>;
  protectiveRoots: ReadonlyArray<string>;
  score: PresentedEssentialEightResult;
}>;

export function ResultsOverview({ leaves, protectiveRoots, score }: ResultsOverviewProps) {
  const { locale } = useI18n();
  const explorer = resultsExplorerCopy[locale];
  const copy = resultsSummaryCopy[locale];
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const percent = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 });
  const priority = leaves.find((leaf) => leaf.urgency === "urgent")
    ?? leaves.find((leaf) => leaf.urgency === "prompt-review");
  const status = priority?.urgency === "urgent" ? "urgent" : priority ? "review" : "habits";
  const topic = priority ? undefined : leaves[0];
  const domains = score.kind === "adult-score"
    ? score.categories.map((category) => ({
      ...category,
      value: category.assessedPoints > 0 ? Math.round(category.earnedPoints / category.assessedPoints * 1000) / 10 : null,
    }))
    : [];
  const assessedDomains = domains.filter((category) => category.value !== null);
  const strongest = assessedDomains.reduce<typeof assessedDomains[number] | undefined>(
    (best, category) => !best || category.value! > best.value! ? category : best, undefined,
  );
  const weakest = assessedDomains.reduce<typeof assessedDomains[number] | undefined>(
    (lowest, category) => !lowest || category.value! < lowest.value! ? category : lowest, undefined,
  );
  const allReached = assessedDomains.length > 0
    && assessedDomains.every((category) => category.earnedPoints >= category.assessedPoints);
  const coverageOnly = score.kind === "insufficient-coverage";
  const rows = score.kind === "adult-score" ? domains.map((category) => ({
    id: category.id,
    label: category.label,
    coverage: category.coverage,
    value: category.value,
    detail: category.assessedPoints > 0
      ? copy.assessedPoints(number.format(category.earnedPoints), number.format(category.assessedPoints))
      : null,
  })) : score.kind === "insufficient-coverage" ? score.answeredCategories.map((category) => ({
    id: category.id,
    label: category.label,
    coverage: category.coverage,
    value: category.answeredComponents > 0 ? category.coverage : null,
    detail: null,
  })) : [];

  return (
    <section id="results-overview" className="results-overview" aria-labelledby="results-overview-title">
      <div className="results-overview__heading" data-reveal="heading">
        <p className="data-label" data-reveal-item>{explorer.overviewEyebrow}</p>
        <h2 id="results-overview-title" data-reveal-item>{explorer.overviewTitle}</h2>
      </div>
      <div className="results-overview__dashboard">
        <article className="results-overview__status" data-status={status} data-reveal="single" aria-labelledby="results-status-title">
          <p className="data-label">{copy.statusEyebrow}</p>
          <h3 id="results-status-title">{status === "urgent" ? copy.urgentTitle : status === "review" ? copy.reviewTitle : copy.habitsTitle}</h3>
          {priority ? (
            <>
              <p>{status === "urgent" ? copy.urgentBody : copy.reviewBody}</p>
              <p className="results-overview__priority"><strong>{priority.title}</strong></p>
              <a href={status === "urgent" ? "#results-urgent-title" : "#results-details"}>{status === "urgent" ? copy.urgentLink : copy.reviewLink}</a>
            </>
          ) : (
            <>
              {topic ? <div className="results-overview__priority">
                <p className="data-label">{copy.signalTitle}</p>
                <h4>{topic.title}</h4>
                <p>{topic.copy}</p>
                <a href="#results-details">{copy.reviewLink}</a>
              </div> : null}
              {allReached ? <p className="results-overview__interpretation">{copy.allReached}</p>
                : strongest && weakest ? strongest.value === weakest.value
                  ? <p className="results-overview__interpretation">{copy.equalDomains(number.format(strongest.value!))}</p>
                  : <dl className="results-overview__domain-highlights">
                    <div><dt>{copy.strongest}</dt><dd>{strongest.label}<strong>{number.format(strongest.value!)} / 100</strong></dd></div>
                    <div><dt>{copy.weakest}</dt><dd>{weakest.label}<strong>{number.format(weakest.value!)} / 100</strong></dd></div>
                  </dl>
                : <p>{score.kind === "not-available" ? copy.unavailableNote : copy.insufficientNote}</p>}
              {score.kind !== "not-available" && score.coverage < 100
                ? <p className="results-overview__coverage-note">{copy.partialNote(percent.format(score.coverage / 100))}</p>
                : null}
              <p className="results-overview__health-boundary">{topic ? copy.signalBoundary : copy.healthBoundary}</p>
            </>
          )}
        </article>
        <ScoreDistribution score={score} />
      </div>
      <p className="results-overview__boundary">{copy.mortalityBoundary}</p>
      {rows.length > 0 ? (
        <section className="results-domain-chart" aria-labelledby="results-domain-chart-title" data-mode={coverageOnly ? "coverage" : "score"}>
          <div className="results-domain-chart__heading" data-reveal="heading">
            <h3 id="results-domain-chart-title" data-reveal-item>{coverageOnly ? copy.coverageTitle : copy.domainTitle}</h3>
            <p data-reveal-item>{coverageOnly ? copy.coverageIntro : copy.domainIntro}</p>
          </div>
          <ul className="results-domain-chart__rows" data-reveal="group">
            {rows.map((row) => {
              const state = row.coverage === null ? "excluded" : row.value === null ? "missing" : "assessed";
              const valueText = state === "excluded" ? copy.excluded : state === "missing" ? copy.missing
                : coverageOnly ? percent.format(row.value! / 100) : `${number.format(row.value!)} / 100`;
              return (
                <li key={row.id} className="results-domain-row" data-domain={row.id} data-state={state} data-mode={coverageOnly ? "coverage" : "score"} data-reveal-item>
                  <div className="results-domain-row__heading"><span>{row.label}</span><strong>{valueText}</strong></div>
                  <div className="results-domain-row__track"
                    role={state === "assessed" ? coverageOnly ? "progressbar" : "meter" : undefined}
                    aria-label={state === "assessed" ? row.label : undefined}
                    aria-valuemin={state === "assessed" ? 0 : undefined}
                    aria-valuemax={state === "assessed" ? 100 : undefined}
                    aria-valuenow={state === "assessed" ? row.value! : undefined}
                    aria-valuetext={state === "assessed" ? coverageOnly
                      ? copy.coverageValue(row.label, percent.format(row.value! / 100))
                      : copy.domainValue(row.label, number.format(row.value!)) : undefined}
                    aria-hidden={state !== "assessed" || undefined}>
                    <span className="results-domain-row__fill" style={{ width: `${row.value ?? 0}%` }} />
                  </div>
                  {state === "assessed" ? <p className="results-domain-row__detail">
                    {row.detail ? `${row.detail} · ` : ""}{copy.coverage(percent.format(row.coverage! / 100))}
                  </p> : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
      {protectiveRoots.length > 0 ? (
        <div className="results-overview__support" data-reveal="single">
          <h3>{explorer.supportTitle}</h3>
          <ul>{protectiveRoots.slice(0, 3).map((root) => <li key={root}>{root}</li>)}</ul>
        </div>
      ) : null}
    </section>
  );
}
