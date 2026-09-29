"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import { useI18n } from "../i18n/context";
import { expressAssessmentCopy } from "../i18n/express-assessment-copy";
import { uiCopyKeys } from "../i18n/ui-copy";
import { buildExpressAssessment, EXPRESS_INDEX_REFERENCE, type ExpressAxis, type ExpressAxisId } from "../lib/express-assessment";
import { buildExpressSummary } from "../lib/express-summary";
import type { AnswerMap } from "../lib/types";

const COMPASS_CENTRE = 150;
const COMPASS_RADIUS = 86;
const COMPASS_DIRECTIONS: Readonly<Record<ExpressAxisId, readonly [number, number]>> = {
  cardio: [0, -1], strength: [1, 0], sleep: [0, 1], nutrition: [-1, 0],
};

function compassPoint(axis: ExpressAxisId, score: number): readonly [number, number] {
  const [dx, dy] = COMPASS_DIRECTIONS[axis];
  const radius = score / 100 * COMPASS_RADIUS;
  return [COMPASS_CENTRE + dx * radius, COMPASS_CENTRE + dy * radius];
}

function ExpressCompass({ axes, selectedAxis, onSelect, panelId }: {
  readonly axes: readonly ExpressAxis[];
  readonly selectedAxis: ExpressAxisId;
  readonly onSelect: (axis: ExpressAxisId) => void;
  readonly panelId: string;
}) {
  const { locale, t } = useI18n();
  const copy = expressAssessmentCopy[locale];
  const id = useId();
  const complete = axes.every((axis) => axis.score !== null);
  const ring = (score: number) => axes.map((axis) => compassPoint(axis.id, score).join(",")).join(" ");
  const description = axes.map((axis) => `${copy.axes[axis.id].label}: ${axis.score ?? t("expressResults.missing")}`).join("; ");

  return (
    <figure className="express-compass" data-reveal-item>
      <div className="express-compass__plot">
        <svg viewBox="0 0 300 300" role="img" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`}>
          <title id={`${id}-title`}>{copy.compassTitle}</title>
          <desc id={`${id}-description`}>{copy.compassDescription(description)}</desc>
          {[25, 50, 100].map((value) => <polygon key={value} className="express-compass__grid" points={ring(value)} fill="none" />)}
          <polygon className="express-compass__reference" points={ring(EXPRESS_INDEX_REFERENCE.axisSupport)} fill="none" strokeDasharray="5 5" />
          {axes.map((axis) => {
            const [x, y] = compassPoint(axis.id, 100);
            return <line key={axis.id} className="express-compass__axis" data-selected={axis.id === selectedAxis} x1={COMPASS_CENTRE} y1={COMPASS_CENTRE} x2={x} y2={y} />;
          })}
          {complete ? (
            <polygon className="express-compass__shape chart-trace" pathLength="1" points={axes.map((axis) => compassPoint(axis.id, axis.score!).join(",")).join(" ")} />
          ) : axes.map((axis, index) => {
            const next = axes[(index + 1) % axes.length];
            if (axis.score === null || next.score === null) return null;
            const [x1, y1] = compassPoint(axis.id, axis.score);
            const [x2, y2] = compassPoint(next.id, next.score);
            return <line key={axis.id} className="express-compass__segment chart-trace" pathLength="1" x1={x1} y1={y1} x2={x2} y2={y2} />;
          })}
          {axes.map((axis) => {
            if (axis.score === null) return null;
            const [cx, cy] = compassPoint(axis.id, axis.score);
            return <circle key={axis.id} className="express-compass__point" data-axis={axis.id} data-status={axis.status} data-selected={axis.id === selectedAxis} cx={cx} cy={cy} r={axis.id === selectedAxis ? 6 : 4} />;
          })}
        </svg>
        <div className="express-compass__labels" aria-hidden="true">
          {axes.map((axis) => (
            <div className="express-compass__label" data-axis={axis.id} data-status={axis.status} data-selected={axis.id === selectedAxis} key={axis.id}>
              <span>{copy.axes[axis.id].label}</span>
              <strong>{axis.score === null ? t("expressResults.missing") : axis.score}</strong>
            </div>
          ))}
        </div>
      </div>
      <figcaption className="express-compass__legend">
        <span>{copy.compassProfile}</span>
        <span>{copy.compassReference}</span>
        <small>{copy.compassScale}</small>
        {!complete ? <small>{copy.compassMissing}</small> : null}
      </figcaption>
      <div className="express-compass__controls" role="group" aria-label={copy.compassExplore} aria-describedby={`${id}-help`}>
        {axes.map((axis) => (
          <button key={axis.id} type="button" data-axis={axis.id}
            aria-pressed={axis.id === selectedAxis} aria-controls={panelId}
            onClick={() => onSelect(axis.id)} onFocus={() => onSelect(axis.id)}
            onPointerEnter={(event) => { if (event.pointerType === "mouse") onSelect(axis.id); }}>
            <span>{copy.axes[axis.id].label}</span>
            <strong>{axis.score === null ? t("expressResults.missing") : `${axis.score} / 100`}</strong>
          </button>
        ))}
      </div>
      <p className="express-compass__help" id={`${id}-help`}>{copy.compassHelp}</p>
    </figure>
  );
}

export function ExpressResults({ answers, ageYears }: { readonly answers: AnswerMap; readonly ageYears: number }) {
  const { locale, t } = useI18n();
  const copy = expressAssessmentCopy[locale];
  const [selectedAxisId, setSelectedAxisId] = useState<ExpressAxisId>("cardio");
  const inspectorId = useId();
  const scaleNoteId = useId();
  const assessment = useMemo(() => buildExpressAssessment(answers, { ageYears }), [answers, ageYears]);
  const summary = useMemo(() => buildExpressSummary(answers), [answers]);
  const numberFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const ratioFormat = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const missing = t("expressResults.missing");
  const metric = (value: number | null, unit: string) => value === null ? missing : `${numberFormat.format(value)} ${unit}`;
  const ratio = (value: number) => t("expressResults.strength.ratio", { ratio: ratioFormat.format(value) });
  const frequency = summary.nutrition.ultraProcessedFrequency === null
    ? missing : t(uiCopyKeys.expressFrequency[summary.nutrition.ultraProcessedFrequency]);
  const listFormat = new Intl.ListFormat(locale, { style: "long", type: "conjunction" });
  const axisNames = (status: ExpressAxis["status"]) => listFormat.format(assessment.axes
    .filter((axis) => axis.status === status).map((axis) => copy.axes[axis.id].label));
  const supports = axisNames("support");
  const attention = axisNames("attention");
  const improvements = axisNames("improve");
  const portrait = copy.portraits[assessment.profile];
  const firstPriority = assessment.priorities[0];

  if (assessment.kind === "not-available") {
    return (
      <section id="results-overview" className="express-results" aria-labelledby="express-results-title">
        <h2 id="express-results-title">{copy.title}</h2>
        <p>{copy.adultOnly}</p>
      </section>
    );
  }

  const selectedAxis = assessment.axes.find((axis) => axis.id === selectedAxisId)!;
  const selectedAxisCopy = copy.axes[selectedAxis.id];
  const selectedSignal = copy.signals[selectedAxis.signals[0] ?? "complete-measurements"];

  const rawReadings: Record<ExpressAxisId, ReactNode> = {
    cardio: <><p>{metric(summary.vo2Max, "ml/kg/min")}</p><p>{t("expressResults.vo2.note")}</p></>,
    strength: (
      <dl>
        <div><dt>{t("expressResults.strength.squat")}</dt><dd>{metric(summary.strength.squatKg, "kg")}{summary.strength.squatBodyWeightRatio === null ? null : <> · <span>{ratio(summary.strength.squatBodyWeightRatio)}</span></>}</dd></div>
        <div><dt>{t("expressResults.strength.deadlift")}</dt><dd>{metric(summary.strength.deadliftKg, "kg")}{summary.strength.deadliftBodyWeightRatio === null ? null : <> · <span>{ratio(summary.strength.deadliftBodyWeightRatio)}</span></>}</dd></div>
      </dl>
    ),
    sleep: <>
      <p>{t("expressResults.sleep.hours")}: {metric(summary.sleep.hours !== null && summary.sleep.hours <= 24 ? summary.sleep.hours : null, t("expressResults.unit.hours"))}</p>
      <p>{t("expressResults.sleep.refreshed")}: {metric(summary.sleep.refreshed !== null && summary.sleep.refreshed <= 10 ? summary.sleep.refreshed : null, "/ 10")}</p>
    </>,
    nutrition: <>
      <p>{t("expressResults.nutrition.plants")}: {metric(summary.nutrition.plantPortions, t("expressResults.unit.portions"))}</p>
      <p>{t("expressResults.nutrition.ultraProcessed")}: {frequency}</p>
    </>,
  };

  return (
    <section id="results-overview" className="express-results" aria-labelledby="express-results-title">
      <div className="express-results__heading" data-reveal="heading">
        <p className="data-label" data-reveal-item>{copy.eyebrow}</p>
        <h2 id="express-results-title" data-reveal-item>{copy.title}</h2>
        <p className="express-results__intro" data-reveal-item>{copy.intro}</p>
      </div>

      <div className="express-profile" data-reveal="group">
        <div className="express-profile__summary" data-reveal-item>
          <p className="express-profile__index-label">{copy.indexLabel}</p>
          {assessment.score === null
            ? <p className="express-profile__no-index">{copy.noIndex}</p>
            : <output className="express-profile__score" aria-label={copy.indexLabel}>{assessment.score} <span>/ 100</span></output>}
          {assessment.score !== null ? (
            <div className="express-profile__scale">
              <div className="express-profile__scale-track" role="meter" aria-label={copy.scaleLabel}
                aria-valuemin={0} aria-valuemax={100} aria-valuenow={assessment.score} aria-describedby={scaleNoteId}>
                <span className="express-profile__scale-fill" style={{ width: `${assessment.score}%` }} />
                <span className="express-profile__scale-marker" style={{ left: `${assessment.score}%` }} />
              </div>
              <div className="express-profile__scale-labels">
                <span><strong>0</strong><span>{copy.scaleLow}</span></span>
                <span><strong>100</strong><span>{copy.scaleHigh}</span></span>
              </div>
              <p id={scaleNoteId}>{copy.scaleNote}</p>
            </div>
          ) : null}
          <span className="express-profile__status" data-kind={assessment.kind}>{copy.kind[assessment.kind]}</span>
          <p className="express-profile__coverage">{copy.coverage(assessment.interpretableComponentCount, assessment.answeredCount)}</p>
          {assessment.kind === "partial-index" ? <p className="express-profile__insight">{copy.partialNote}</p> : null}
          {assessment.kind === "insufficient-inputs" ? <p className="express-profile__insight">{copy.insufficientNote}</p> : null}
          <div className="express-profile__portrait" data-profile={assessment.profile}>
            <h3>{portrait.title}</h3>
            <p>{portrait.summary}</p>
            <p>{supports ? copy.supportSentence(supports) : copy.noSupport}</p>
            {attention ? <p>{copy.attentionSentence(attention)}</p> : improvements ? <p>{copy.improveSentence(improvements)}</p> : null}
            {firstPriority ? <p className="express-profile__insight">{copy.nextSentence(copy.signals[firstPriority].title)}</p> : null}
          </div>
        </div>
        <ExpressCompass axes={assessment.axes} selectedAxis={selectedAxisId} onSelect={setSelectedAxisId} panelId={inspectorId} />
      </div>
      <section id={inspectorId} className="express-axis-inspector" data-axis={selectedAxis.id} data-status={selectedAxis.status} aria-labelledby={`${inspectorId}-title`}>
        <div className="express-axis-inspector__readout">
          <h3 id={`${inspectorId}-title`}>{copy.axisPanelTitle(selectedAxisCopy.label)}</h3>
          <p className="express-axis-inspector__score">{selectedAxis.score === null ? missing : <><strong>{selectedAxis.score}</strong> <span>/ 100</span></>}</p>
          <span className="express-result-card__status">{copy.status[selectedAxis.status]}</span>
          <p className="express-result-card__coverage">{copy.axisCoverage(selectedAxis.availableComponents, selectedAxis.totalComponents)}</p>
        </div>
        <p>{selectedAxis.score === null ? selectedAxisCopy.missing : selectedSignal.reason}</p>
        <div className="express-axis-inspector__action">
          <p>{selectedSignal.action}</p>
          <a href={`#express-axis-${selectedAxis.id}`}>{copy.axisReadingsLink(selectedAxisCopy.label)}</a>
        </div>
      </section>
      <p className="express-results__boundary">{copy.fixedReferences}</p>

      <p className="express-results__context-title">{t("expressResults.context.title")}</p>
      <dl className="express-results__context">
        <div><dt>{t("expressResults.context.height")}</dt><dd>{metric(summary.bodyContext.heightCm, "cm")}</dd></div>
        <div><dt>{t("expressResults.context.weight")}</dt><dd>{metric(summary.bodyContext.weightKg, "kg")}</dd></div>
      </dl>
      <div className="express-results__grid" data-reveal="group">
        {assessment.axes.map((axis) => {
          const axisCopy = copy.axes[axis.id];
          const signal = copy.signals[axis.signals[0] ?? "complete-measurements"];
          return (
            <article className="express-result-card" data-axis={axis.id} data-status={axis.status} aria-labelledby={`express-axis-${axis.id}`} key={axis.id} data-reveal-item>
              <div className="express-result-card__overview">
                <h3 id={`express-axis-${axis.id}`} tabIndex={-1}>{axisCopy.label}</h3>
                <p className="express-result-card__score">{axis.score === null ? missing : <><strong>{axis.score}</strong> <span>/ 100</span></>}</p>
                <span className="express-result-card__status">{copy.status[axis.status]}</span>
                {axis.score !== null ? (
                  <div className="express-result-card__bar" role="meter" aria-label={copy.axisScore(axisCopy.label)} aria-valuemin={0} aria-valuemax={100} aria-valuenow={axis.score}>
                    <span className="express-result-card__bar-fill" style={{ width: `${axis.score}%` }} />
                  </div>
                ) : null}
                <p className="express-result-card__coverage">{copy.axisCoverage(axis.availableComponents, axis.totalComponents)}</p>
              </div>
              <div className="express-result-card__detail">
                <div className="express-result-card__reading">{rawReadings[axis.id]}</div>
                <p>{axis.score === null ? axisCopy.missing : signal.reason}</p>
                <p className="express-result-card__action">{signal.action}</p>
              </div>
            </article>
          );
        })}
      </div>

      <section id="express-priorities" className="express-priorities" aria-labelledby="express-priorities-title">
        <div className="express-priorities__heading" data-reveal="heading">
          <h2 id="express-priorities-title" data-reveal-item>{copy.prioritiesTitle}</h2>
          <p data-reveal-item>{copy.prioritiesIntro}</p>
        </div>
        <div className="express-priorities__grid" role="list" data-reveal="group">
          {assessment.priorities.map((priority, index) => (
            <div className="express-priority" role="listitem" key={priority} data-reveal-item>
              <span className="express-priority__number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <h3>{copy.signals[priority].title}</h3>
              <p>{copy.signals[priority].reason}</p>
              <p>{copy.signals[priority].action}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="express-method" className="express-method" aria-labelledby="express-method-title" data-reveal="single">
        <details>
          <summary id="express-method-title">{copy.methodTitle}</summary>
          <p>{copy.methodIntro}</p>
          <p>{copy.methodWeight}</p>
          <ul>{[copy.methodCardio, copy.methodStrength, copy.methodSleep, copy.methodNutrition].map((formula) => <li key={formula}>{formula}</li>)}</ul>
          <p>{copy.methodMissing}</p>
          <p>{copy.methodStatus}</p>
          <p>{copy.methodPortrait}</p>
          <p>{copy.sourceNote}</p>
          <ul>
            <li><a href="https://www.cdc.gov/sleep/about/index.html" target="_blank" rel="noreferrer">{copy.sleepSource}</a></li>
            <li><a href="https://www.who.int/news-room/fact-sheets/detail/healthy-diet" target="_blank" rel="noreferrer">{copy.dietSource}</a></li>
          </ul>
        </details>
      </section>
    </section>
  );
}
