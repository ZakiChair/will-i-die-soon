"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useI18n } from "../i18n/context";
import {
  localizeActions,
  localizeProtectiveRoots,
  localizePurityScore,
  localizeRiskLeaves,
} from "../i18n/presentation";
import type {
  PresentedAdultPurityScoreResult,
  PresentedInsufficientCoverageResult,
} from "../i18n/presentation";
import { uiCopyKeys } from "../i18n/ui-copy";
import { createRedactedExport } from "../lib/export";
import type { ConfirmedLabValue } from "../lib/labs";
import { prototypePolicy } from "../lib/release-policy";
import { evaluateRisks } from "../lib/risk-engine";
import { buildActionPlan, calculatePurityScore } from "../lib/scoring";
import type { ActionItem } from "../lib/scoring";
import type { AnalysisDepth, AnswerMap, ProfileContext, RiskLeaf } from "../lib/types";
import { ExpressResults } from "./express-results";
import { RiskTree } from "./risk-tree";

export type ResultsProps = {
  readonly answers: AnswerMap;
  readonly assessmentDepth: AnalysisDepth;
  readonly confirmedLabs: ReadonlyArray<ConfirmedLabValue>;
  readonly profile: ProfileContext;
  readonly onRestart: () => void;
};

const SUPPORT_QUESTION_IDS = [
  "adolescent_pregnancy_support",
  "adolescent_nicotine_support",
  "adolescent_alcohol_support",
  "adolescent_cannabis_support",
  "adolescent_other_drug_support",
] as const;

function UrgentSummary({ leaves }: { readonly leaves: ReadonlyArray<RiskLeaf> }) {
  const { t } = useI18n();
  if (leaves.length === 0) return null;
  return (
    <section className="results-urgent" role="alert" aria-labelledby="results-urgent-title">
      <p className="data-label">{t("results.urgent.eyebrow")}</p>
      <h2 id="results-urgent-title">{t("results.urgent.title")}</h2>
      <ul>
        {leaves.map((leaf) => (
          <li key={leaf.id}>
            <strong>{leaf.title}</strong>
            <p>{leaf.copy}</p>
          </li>
        ))}
      </ul>
      <p>{t("results.urgent.boundary")}</p>
    </section>
  );
}

function ScoreLedger({ score }: { readonly score: PresentedAdultPurityScoreResult }) {
  const { t } = useI18n();
  return (
    <section className="score-sheet" aria-labelledby="score-title">
      <p className="data-label">{t("score.version", { version: score.scoreVersion })}</p>
      <h2 id="score-title">{score.label}</h2>
      <p className="score-sheet__readout">
        {t("score.readout", { score: score.score, coverage: score.coverage })}
      </p>
      <p className="score-sheet__scope">{t("score.scope")}</p>
      <div className="score-categories">
        {score.categories.map((category) => (
          <details key={category.id} className="score-category">
            <summary>
              <span>{category.label}</span>
              <span>
                {t("score.category.assessed", {
                  earned: category.earnedPoints,
                  assessed: category.assessedPoints,
                })}
                {category.coverage === null
                  ? ` · ${t("score.category.excluded")}`
                  : ` · ${t("score.category.coverage", { coverage: category.coverage })}`}
              </span>
            </summary>
            <ul>
              {category.components.map((component) => (
                <li key={component.questionId}>
                  <strong>{component.label}</strong>
                  <span>{component.explanation}</span>
                  <span>
                    {component.status === "answered"
                      ? t("score.component.answered", {
                          earned: component.earnedPoints,
                          maximum: component.maxPoints,
                        })
                      : component.status === "excluded"
                        ? t("score.component.excluded", { maximum: component.maxPoints })
                        : t("score.component.missing", { maximum: component.maxPoints })}
                  </span>
                  <a href={component.source.url} target="_blank" rel="noreferrer">
                    {component.source.title}
                  </a>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    </section>
  );
}

function CoverageReflection({
  score,
}: {
  readonly score: PresentedInsufficientCoverageResult;
}) {
  const { t } = useI18n();
  if (score.reason === "quick-assessment") {
    return (
      <section className="score-sheet score-sheet--reflection" aria-labelledby="reflection-title">
        <p className="data-label">{t("score.quick.eyebrow")}</p>
        <h2 id="reflection-title">{t("score.quick.title")}</h2>
        <p className="score-sheet__coverage">
          {t("score.coverage", { coverage: score.coverage })}
        </p>
        <p>{t("score.quick.body")}</p>
      </section>
    );
  }
  return (
    <section className="score-sheet score-sheet--reflection" aria-labelledby="coverage-title">
      <p className="data-label">{t("score.gate.eyebrow", { version: score.scoreVersion })}</p>
      <h2 id="coverage-title">{score.label}</h2>
      <p className="score-sheet__coverage">
        {t("score.coverage", { coverage: score.coverage })}
      </p>
      <p>{t("score.gate.body")}</p>
      {score.reason === "unresolved-core-gate" ? <p>{t("score.gate.core")}</p> : null}
    </section>
  );
}

function AdolescentHabitsMap({ answers }: { readonly answers: AnswerMap }) {
  const { t } = useI18n();
  const goingWell = [
    answers.reliable_social_support === true ? t("adolescent.goingWell.support") : null,
    answers.stress_recovery_practice === "often" ||
    answers.stress_recovery_practice === "daily"
      ? t("adolescent.goingWell.stress")
      : null,
    answers.circadian_morning_light === true ? t("adolescent.goingWell.light") : null,
  ].filter((item): item is string => item !== null);
  const optionalHabit =
    answers.stress_recovery_practice === "never" ||
    answers.stress_recovery_practice === "rarely"
      ? t("adolescent.optional.stress")
      : answers.reliable_social_support === false
        ? t("adolescent.optional.support")
        : t("adolescent.optional.fallback");
  const support = SUPPORT_QUESTION_IDS.flatMap((questionId) => {
    const answer = answers[questionId];
    const topic = t(uiCopyKeys.adolescentSupport[questionId]);
    if (answer === "find_service") return [t("adolescent.support.service", { topic })];
    if (answer === "general_information") return [t("adolescent.support.info", { topic })];
    return [];
  });

  return (
    <section className="habits-map" aria-labelledby="habits-map-title">
      <p className="data-label">{t("adolescent.eyebrow")}</p>
      <h2 id="habits-map-title">{t("adolescent.title")}</h2>
      <p>{t("adolescent.intro")}</p>
      <div className="habits-map__cards">
        <article>
          <h3>{t("adolescent.goingWell.title")}</h3>
          {goingWell.length > 0 ? (
            <ul>{goingWell.map((item) => <li key={item}>{item}</li>)}</ul>
          ) : (
            <p>{t("adolescent.goingWell.fallback")}</p>
          )}
        </article>
        <article>
          <h3>{t("adolescent.optional.title")}</h3>
          <p>{optionalHabit}</p>
        </article>
        <article>
          <h3>{t("adolescent.support.title")}</h3>
          {support.length > 0 ? (
            <ul>{support.map((item) => <li key={item}>{item}</li>)}</ul>
          ) : (
            <p>{t("adolescent.support.fallback")}</p>
          )}
        </article>
      </div>
      <p>{t("adolescent.share")}</p>
    </section>
  );
}

function ChildGuide({ onRestart }: { readonly onRestart: () => void }) {
  const { t } = useI18n();
  return (
    <section className="child-guide" aria-labelledby="child-guide-title">
      <p className="data-label">{t("child.eyebrow")}</p>
      <h2 id="child-guide-title">{t("child.title")}</h2>
      <p>{t("child.body")}</p>
      <button type="button" onClick={onRestart}>{t("results.restartClear")}</button>
    </section>
  );
}

function PrivateResultsHandoff({
  onReveal,
  onRestart,
}: {
  readonly onReveal: () => void;
  readonly onRestart: () => void;
}) {
  const { t } = useI18n();
  return (
    <section className="private-results-handoff" aria-labelledby="private-results-title">
      <p className="data-label">{t("handoff.eyebrow")}</p>
      <h2 id="private-results-title">{t("handoff.title")}</h2>
      <p>{t("handoff.body")}</p>
      <div className="private-results-handoff__actions">
        <button type="button" onClick={onReveal}>{t("handoff.show")}</button>
        <button type="button" onClick={onRestart}>{t("results.restartClear")}</button>
      </div>
    </section>
  );
}

function ActionPlan({ actions }: { readonly actions: ReadonlyArray<ActionItem> }) {
  const { t } = useI18n();
  if (actions.length === 0) return null;
  return (
    <section className="action-plan" aria-labelledby="action-plan-title">
      <p className="data-label">{t("actions.eyebrow")}</p>
      <h2 id="action-plan-title">{t("actions.title")}</h2>
      <ol>
        {actions.map((action) => (
          <li key={action.id}>
            <h3>{action.title}</h3>
            <p><strong>{t("actions.reason")}</strong> {action.reason}</p>
            <p><strong>{t("actions.next")}</strong> {action.nextStep}</p>
            <ul className="action-plan__sources" aria-label={t("actions.sources")}>
              {action.sources.map((source) => (
                <li key={`${source.publisher}:${source.title}:${source.url}`}>
                  <a href={source.url} target="_blank" rel="noreferrer">
                    {source.title} — {source.publisher}
                  </a>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ConfirmedLabs({ values }: { readonly values: ReadonlyArray<ConfirmedLabValue> }) {
  const { t } = useI18n();
  if (values.length === 0) return null;
  return (
    <section className="confirmed-labs" role="region" aria-labelledby="confirmed-labs-title">
      <p className="data-label">{t("labsConfirmed.eyebrow")}</p>
      <h2 id="confirmed-labs-title">{t("labsConfirmed.title")}</h2>
      <p>{t("labsConfirmed.body")}</p>
      <div className="confirmed-labs__table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">{t("labsConfirmed.marker")}</th>
              <th scope="col">{t("labsConfirmed.value")}</th>
              <th scope="col">{t("labsConfirmed.range")}</th>
              <th scope="col">{t("labsConfirmed.date")}</th>
              <th scope="col">{t("labsConfirmed.fasting")}</th>
            </tr>
          </thead>
          <tbody>
            {values.map((value, index) => (
              <tr key={`${value.reviewed.marker}-${value.reviewed.collectionDate}-${index}`}>
                <th scope="row">{t(uiCopyKeys.labMarker[value.reviewed.marker])}</th>
                <td>{value.reviewed.valueText} {value.reviewed.unit}</td>
                <td>{value.reviewed.referenceRange}</td>
                <td>{value.reviewed.collectionDate}</td>
                <td>{t(uiCopyKeys.fasting[value.reviewed.fastingStatus])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function Results({
  answers,
  assessmentDepth,
  confirmedLabs,
  profile,
  onRestart,
}: ResultsProps) {
  const { locale, t } = useI18n();
  const needsPrivateHandoff =
    profile.age >= 13 && profile.age < 18 && profile.assistedMinor === true;
  const [includeRawAnswers, setIncludeRawAnswers] = useState(false);
  const [privateResultsVisible, setPrivateResultsVisible] = useState(
    () => !needsPrivateHandoff,
  );
  const revealedResultsHeading = useRef<HTMLHeadingElement>(null);
  const leaves = useMemo(
    () => evaluateRisks(answers, profile, prototypePolicy),
    [answers, profile],
  );
  const score = useMemo(
    () =>
      calculatePurityScore(answers, {
        ageYears: profile.age,
        assessmentDepth,
      }),
    [answers, assessmentDepth, profile.age],
  );
  const actions = useMemo(
    () => assessmentDepth === "express" ? [] : buildActionPlan(leaves, score),
    [assessmentDepth, leaves, score],
  );
  const presentedLeaves = useMemo(
    () => localizeRiskLeaves(leaves, locale, profile),
    [leaves, locale, profile],
  );
  const presentedScore = useMemo(
    () => localizePurityScore(score, locale),
    [locale, score],
  );
  const presentedActions = useMemo(
    () => localizeActions(actions, locale),
    [actions, locale],
  );
  const roots = useMemo(
    () => localizeProtectiveRoots(answers, locale),
    [answers, locale],
  );
  const urgentLeaves = presentedLeaves.filter((leaf) => leaf.urgency === "urgent");
  const report = useMemo(
    () => ({
      subjectAgeYears: profile.age,
      assessmentDepth,
      score: presentedScore,
      riskLeaves: presentedLeaves,
      actions: presentedActions,
      confirmedLabs,
      answers,
    }),
    [
      answers,
      assessmentDepth,
      confirmedLabs,
      presentedActions,
      presentedLeaves,
      presentedScore,
      profile.age,
    ],
  );

  useEffect(() => {
    if (needsPrivateHandoff && privateResultsVisible) {
      revealedResultsHeading.current?.focus();
    }
  }, [needsPrivateHandoff, privateResultsVisible]);

  function downloadJson() {
    const blob = createRedactedExport(report, {
      includeRawAnswers: profile.age >= 18 && includeRawAnswers,
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = t("export.filename");
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const depthLabel = t(uiCopyKeys.depth[assessmentDepth]);
  const presentedDepth = locale === "fr" ? depthLabel.toLocaleLowerCase("fr") : depthLabel;

  return (
    <section className="journey results" aria-labelledby="results-title">
      <header className="journey__header results__header">
        <div className="wordmark">Will I Die <strong>Soon?</strong></div>
        <p className="prototype-label data-label">
          {t("results.header", { depth: presentedDepth })}
        </p>
      </header>
      <div className="results__intro">
        <p className="data-label">{t("results.eyebrow")}</p>
        <h1 id="results-title">{t("results.title")}</h1>
        <p>{t("results.intro")}</p>
      </div>

      <UrgentSummary leaves={urgentLeaves} />

      {profile.age < 13 ? (
        <ChildGuide onRestart={onRestart} />
      ) : !privateResultsVisible ? (
        <PrivateResultsHandoff
          onReveal={() => setPrivateResultsVisible(true)}
          onRestart={onRestart}
        />
      ) : (
        <>
          {assessmentDepth === "express" ? (
            <ExpressResults answers={answers} />
          ) : (
            <>
              <section className="results-canopy" aria-labelledby="results-canopy-title">
                <div className="section-heading">
                  <p className="data-label">{t("results.canopy.eyebrow")}</p>
                  <h2 id="results-canopy-title" ref={revealedResultsHeading} tabIndex={-1}>
                    {t("results.canopy.title")}
                  </h2>
                </div>
                <RiskTree leaves={presentedLeaves} protectiveRoots={roots} />
              </section>

              {profile.age < 18 ? (
                <AdolescentHabitsMap answers={answers} />
              ) : presentedScore.kind === "adult-score" ? (
                <ScoreLedger score={presentedScore} />
              ) : presentedScore.kind === "insufficient-coverage" ? (
                <CoverageReflection score={presentedScore} />
              ) : null}

              {profile.age >= 18 ? <ActionPlan actions={presentedActions} /> : null}
            </>
          )}
          <ConfirmedLabs values={confirmedLabs} />

          <section className="result-tools" aria-labelledby="result-tools-title">
            <p className="data-label">{t("tools.eyebrow")}</p>
            <h2 id="result-tools-title">{t("tools.title")}</h2>
            <p>{t("tools.body")}</p>
            {profile.age >= 18 ? (
              <label className="result-tools__raw-toggle">
                <input
                  type="checkbox"
                  checked={includeRawAnswers}
                  onChange={(event) => setIncludeRawAnswers(event.target.checked)}
                />
                <span>
                  {t("tools.raw")}
                  <small>{t("tools.raw.help")}</small>
                </span>
              </label>
            ) : null}
            <div className="result-tools__actions">
              <button type="button" onClick={() => window.print()}>
                {t("tools.print")}
              </button>
              <button type="button" onClick={downloadJson}>{t("tools.download")}</button>
              <button type="button" onClick={onRestart}>{t("tools.restart")}</button>
            </div>
          </section>
        </>
      )}
    </section>
  );
}
