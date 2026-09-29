"use client";

import { useId } from "react";
import { useI18n } from "../i18n/context";
import { resultsExplorerCopy } from "../i18n/results-explorer-copy";
import type { AdultPurityScoreResult, PublicInsufficientCoverageResult, PurityScoreResult } from "../lib/scoring";

export type DistributionScore =
  | Pick<AdultPurityScoreResult, "kind" | "score">
  | Pick<PublicInsufficientCoverageResult, "kind" | "reason">
  | Extract<PurityScoreResult, { kind: "not-available" }>;

const LEFT = 36;
const RIGHT = 684;
const xPosition = (value: number) => LEFT + (value / 100) * (RIGHT - LEFT);

export function ScoreDistribution({ score }: { readonly score: DistributionScore }) {
  const { locale } = useI18n();
  const copy = resultsExplorerCopy[locale];
  const id = useId();
  const value = score.kind === "adult-score" && Number.isFinite(score.score) && score.score >= 0 && score.score <= 100
    ? score.score : null;
  const formattedScore = value === null ? "" : new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);
  const missingReason = score.kind === "insufficient-coverage" ? score.reason : "invalid";

  return (
    <section id="score-distribution" className="score-distribution score-position" aria-labelledby="score-distribution-title">
      <div className="score-distribution__heading">
        <h3 id="score-distribution-title">{copy.referenceTitle}</h3>
      </div>
      {value === null ? (
        <div className="score-distribution__empty">
          <h4>{copy.unavailableTitle}</h4>
          <p>{copy.unavailable[missingReason]}</p>
        </div>
      ) : (
        <>
          <div className="score-position__readout" role="meter" aria-label={copy.axisLabel}
            aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} aria-valuetext={`${formattedScore} / 100`}>
            <strong>{formattedScore}</strong><span> / 100</span>
          </div>
          <p className="score-position__meaning">{copy.referenceIntro}</p>
          <figure className="score-distribution__figure">
            <svg className="score-distribution__chart" viewBox="0 0 720 120" role="img" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`}>
              <title id={`${id}-title`}>{copy.chartTitle}</title>
              <desc id={`${id}-description`}>{copy.chartDescription(formattedScore)}</desc>
              <rect className="score-position__track" x={LEFT} y="42" width={RIGHT - LEFT} height="28" rx="14" />
              {value > 0 ? <rect className="score-position__fill" x={LEFT} y="42" width={xPosition(value) - LEFT} height="28" rx="14" /> : null}
              {[0, 25, 50, 75, 100].map((tick) => (
                <line key={tick} className="score-distribution__axis" x1={xPosition(tick)} x2={xPosition(tick)} y1="82" y2="93" />
              ))}
              <line className="score-distribution__marker" x1={xPosition(value)} x2={xPosition(value)} y1="22" y2="78" />
              <circle className="score-distribution__marker-dot" cx={xPosition(value)} cy="56" r="10" />
            </svg>
            <div className="score-distribution__ticks" aria-hidden="true">{[0, 25, 50, 75, 100].map((tick) => <span key={tick}>{tick}</span>)}</div>
            <figcaption className="score-position__endpoints"><span>{copy.lowEnd}</span><span>{copy.highEnd}</span></figcaption>
          </figure>
          <p className="score-position__boundary">{copy.referenceBoundary}</p>
        </>
      )}
    </section>
  );
}
