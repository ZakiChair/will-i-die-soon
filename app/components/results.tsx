"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { createRedactedExport } from "../lib/export";
import type { ConfirmedLabValue, LabMarker } from "../lib/labs";
import { prototypePolicy } from "../lib/release-policy";
import { evaluateRisks } from "../lib/risk-engine";
import {
  PURITY_SCORE_LABEL,
  buildActionPlan,
  calculatePurityScore,
} from "../lib/scoring";
import type { ActionItem, PurityScoreResult } from "../lib/scoring";
import type { AnalysisDepth, AnswerMap, ProfileContext, RiskLeaf } from "../lib/types";
import { RiskTree } from "./risk-tree";

export type ResultsProps = {
  readonly answers: AnswerMap;
  readonly assessmentDepth: AnalysisDepth;
  readonly confirmedLabs: ReadonlyArray<ConfirmedLabValue>;
  readonly profile: ProfileContext;
  readonly onRestart: () => void;
};

const LAB_LABELS: Readonly<Record<LabMarker, string>> = {
  glucose: "Glucose",
  total_cholesterol: "Total cholesterol",
  hdl_cholesterol: "HDL cholesterol",
  ldl_cholesterol: "LDL cholesterol",
  triglycerides: "Triglycerides",
  hba1c: "HbA1c",
  creatinine_serum: "Creatinine",
  hemoglobin_blood: "Hemoglobin",
  ferritin: "Ferritin",
  vitamin_d_25oh: "Vitamin D (25-OH)",
  alt: "ALT",
  ast: "AST",
  egfr: "eGFR",
  tsh: "TSH",
};

const SUPPORT_LABELS: Readonly<Record<string, string>> = {
  adolescent_pregnancy_support: "pregnancy-related health",
  adolescent_nicotine_support: "nicotine or tobacco",
  adolescent_alcohol_support: "alcohol",
  adolescent_cannabis_support: "cannabis",
  adolescent_other_drug_support: "other substances",
};

function protectiveRoots(answers: AnswerMap): string[] {
  const candidates = [
    answers.reliable_social_support === true
      ? "A person you can contact for practical or emotional support"
      : null,
    answers.hydration_heat_access === true
      ? "Reliable drinking-water access during heat or activity"
      : null,
    answers.movement_balance_training === true
      ? "A regular balance or coordination practice"
      : null,
    answers.circadian_morning_light === true
      ? "Outdoor or bright light after waking"
      : null,
    answers.mood_support_access === true
      ? "A known route to timely wellbeing support"
      : null,
    answers.social_community_belonging === true
      ? "A sense of community or shared activity"
      : null,
    answers.vaccinations_records_available === true
      ? "Vaccination records available for review"
      : null,
    answers.interaction_shared_list === true
      ? "A current medicine list shared with a clinician or pharmacist"
      : null,
    answers.stress_recovery_practice === "often" ||
    answers.stress_recovery_practice === "daily"
      ? "A regular brief stress-management practice"
      : null,
  ];
  return candidates.filter((candidate): candidate is string => candidate !== null);
}

function UrgentSummary({ leaves }: { readonly leaves: ReadonlyArray<RiskLeaf> }) {
  if (leaves.length === 0) return null;
  return (
    <section className="results-urgent" role="alert" aria-labelledby="results-urgent-title">
      <p className="data-label">Immediate signals first</p>
      <h2 id="results-urgent-title">Act on these immediate signals now</h2>
      <ul>
        {leaves.map((leaf) => (
          <li key={leaf.id}>
            <strong>{leaf.title}</strong>
            <p>{leaf.copy}</p>
          </li>
        ))}
      </ul>
      <p>This local report cannot contact a service or another person for you.</p>
    </section>
  );
}

function ScoreLedger({ score }: { readonly score: Extract<PurityScoreResult, { kind: "adult-score" }> }) {
  return (
    <section className="score-sheet" aria-labelledby="score-title">
      <p className="data-label">Versioned habit ledger / {score.scoreVersion}</p>
      <h2 id="score-title">{PURITY_SCORE_LABEL}</h2>
      <p className="score-sheet__readout">
        {score.score} / 100 · {score.coverage}% answer coverage
      </p>
      <p className="score-sheet__scope">
        This number summarizes answered, modifiable habits only. It is not mortality,
        longevity, health status, personal worth, disease probability, diagnosis,
        treatment need, or a medicine recommendation.
      </p>
      <div className="score-categories">
        {score.categories.map((category) => (
          <details key={category.id} className="score-category">
            <summary>
              <span>{category.label}</span>
              <span>
                {category.earnedPoints} / {category.assessedPoints} assessed
                {category.coverage === null ? " · excluded" : ` · ${category.coverage}% component coverage`}
              </span>
            </summary>
            <ul>
              {category.components.map((component) => (
                <li key={component.questionId}>
                  <strong>{component.label}</strong>
                  <span>{component.explanation}</span>
                  <span>
                    {component.status === "answered"
                      ? `${component.earnedPoints} of ${component.maxPoints} mapped points`
                      : component.status === "excluded"
                        ? `Excluded from numerator and denominator; ${component.maxPoints} possible points named by this component`
                        : `Missing; ${component.maxPoints} possible points affect coverage only`}
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
  readonly score: Extract<PurityScoreResult, { kind: "insufficient-coverage" }>;
}) {
  if (score.reason === "quick-assessment") {
    return (
      <section className="score-sheet score-sheet--reflection" aria-labelledby="reflection-title">
        <p className="data-label">Quick habits reflection</p>
        <h2 id="reflection-title">Wellness habits reflection</h2>
        <p className="score-sheet__coverage">{score.coverage}% answer coverage</p>
        <p>
          Quick does not calculate a number. Choose Detailed or Deep in a new assessment if
          you want the transparent adult habit ledger and enough questions are answered.
        </p>
      </section>
    );
  }
  return (
    <section className="score-sheet score-sheet--reflection" aria-labelledby="coverage-title">
      <p className="data-label">Coverage gate / {score.scoreVersion}</p>
      <h2 id="coverage-title">{PURITY_SCORE_LABEL}</h2>
      <p className="score-sheet__coverage">{score.coverage}% answer coverage</p>
      <p>Answer more wellness-habit questions to calculate this index.</p>
      {score.reason === "unresolved-core-gate" ? (
        <p>The tobacco/nicotine or alcohol gate needs a mapped answer before a number can appear.</p>
      ) : null}
    </section>
  );
}

function AdolescentHabitsMap({ answers }: { readonly answers: AnswerMap }) {
  const goingWell = [
    answers.reliable_social_support === true
      ? "You reported someone you can contact for practical or emotional support."
      : null,
    answers.stress_recovery_practice === "often" ||
    answers.stress_recovery_practice === "daily"
      ? "You reported regularly practising a brief stress-management skill."
      : null,
    answers.circadian_morning_light === true
      ? "You reported getting outdoor or bright light after waking."
      : null,
  ].filter((item): item is string => item !== null);
  const optionalHabit =
    answers.stress_recovery_practice === "never" ||
    answers.stress_recovery_practice === "rarely"
      ? "If you want, choose one brief stress-management practice and try it for a few minutes today."
      : answers.reliable_social_support === false
        ? "If it feels safe, choose one trusted person or service you could contact when you need support."
        : "You can choose whether there is any habit you want to explore; no card is ranked.";
  const support = Object.entries(SUPPORT_LABELS).flatMap(([questionId, label]) => {
    const answer = answers[questionId];
    if (answer === "find_service") return [`You asked for help finding a ${label} service.`];
    if (answer === "general_information") return [`You asked for general ${label} information.`];
    return [];
  });

  return (
    <section className="habits-map" aria-labelledby="habits-map-title">
      <p className="data-label">Private adolescent reflection</p>
      <h2 id="habits-map-title">My Health Habits Map</h2>
      <p>
        These cards are not ranked and do not compare you with adults or other young people.
      </p>
      <div className="habits-map__cards">
        <article>
          <h3>Things going well</h3>
          {goingWell.length > 0 ? (
            <ul>{goingWell.map((item) => <li key={item}>{item}</li>)}</ul>
          ) : (
            <p>You completed a private reflection and kept control of what you shared.</p>
          )}
        </article>
        <article>
          <h3>One habit you could choose to work on</h3>
          <p>{optionalHabit}</p>
        </article>
        <article>
          <h3>Support you asked for</h3>
          {support.length > 0 ? (
            <ul>{support.map((item) => <li key={item}>{item}</li>)}</ul>
          ) : (
            <p>You did not request extra support in the answers shown here.</p>
          )}
        </article>
      </div>
      <p>
        You can choose to discuss any card with a parent, guardian, or another trusted adult.
      </p>
    </section>
  );
}

function ChildGuide({ onRestart }: { readonly onRestart: () => void }) {
  return (
    <section className="child-guide" aria-labelledby="child-guide-title">
      <p className="data-label">General information only</p>
      <h2 id="child-guide-title">A guide for you and your adult helper</h2>
      <p>
        Review general sleep, food, movement, feelings, and safety questions with a parent,
        guardian, or trusted adult. Ask a qualified local health service when you need
        personal guidance.
      </p>
      <button type="button" onClick={onRestart}>Restart and clear</button>
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
  return (
    <section className="private-results-handoff" aria-labelledby="private-results-title">
      <p className="data-label">Private handoff</p>
      <h2 id="private-results-title">Your private results are ready</h2>
      <p>
        If an adult helped with the questions, ask them to hand the device back. Move to a
        private place if it is safe. You choose what to view and what to share.
      </p>
      <div className="private-results-handoff__actions">
        <button type="button" onClick={onReveal}>Show my private results</button>
        <button type="button" onClick={onRestart}>Restart and clear</button>
      </div>
    </section>
  );
}

function ActionPlan({ actions }: { readonly actions: ReadonlyArray<ActionItem> }) {
  if (actions.length === 0) return null;
  return (
    <section className="action-plan" aria-labelledby="action-plan-title">
      <p className="data-label">At most three first steps</p>
      <h2 id="action-plan-title">Actions you can choose</h2>
      <ol>
        {actions.map((action) => (
          <li key={action.id}>
            <h3>{action.title}</h3>
            <p><strong>Why this appears:</strong> {action.reason}</p>
            <p><strong>Voluntary next step:</strong> {action.nextStep}</p>
            <ul className="action-plan__sources" aria-label="Sources">
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
  if (values.length === 0) return null;
  return (
    <section className="confirmed-labs" role="region" aria-labelledby="confirmed-labs-title">
      <p className="data-label">Copied, reviewed context</p>
      <h2 id="confirmed-labs-title">Confirmed lab context</h2>
      <p>
        These are the values you reviewed locally. This report does not classify or interpret
        them and they do not affect the habit index or qualitative rules.
      </p>
      <div className="confirmed-labs__table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Marker</th>
              <th scope="col">Reported value</th>
              <th scope="col">Laboratory range</th>
              <th scope="col">Collection date</th>
              <th scope="col">Fasting note</th>
            </tr>
          </thead>
          <tbody>
            {values.map((value, index) => (
              <tr key={`${value.reviewed.marker}-${value.reviewed.collectionDate}-${index}`}>
                <th scope="row">{LAB_LABELS[value.reviewed.marker]}</th>
                <td>{value.reviewed.valueText} {value.reviewed.unit}</td>
                <td>{value.reviewed.referenceRange}</td>
                <td>{value.reviewed.collectionDate}</td>
                <td>{value.reviewed.fastingStatus.replaceAll("_", " ")}</td>
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
  const actions = useMemo(() => buildActionPlan(leaves, score), [leaves, score]);
  const roots = useMemo(() => protectiveRoots(answers), [answers]);
  const urgentLeaves = leaves.filter((leaf) => leaf.urgency === "urgent");
  const report = useMemo(
    () => ({
      subjectAgeYears: profile.age,
      assessmentDepth,
      score,
      riskLeaves: leaves,
      actions,
      confirmedLabs,
      answers,
    }),
    [actions, answers, assessmentDepth, confirmedLabs, leaves, profile.age, score],
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
    anchor.download = "health-risk-explorer-report.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="journey results" aria-labelledby="results-title">
      <header className="journey__header results__header">
        <div className="wordmark">Will I Die <strong>Soon?</strong></div>
        <p className="prototype-label data-label">
          {assessmentDepth[0].toUpperCase() + assessmentDepth.slice(1)} assessment / local results
        </p>
      </header>
      <div className="results__intro">
        <p className="data-label">Your field notes</p>
        <h1 id="results-title">Your health map, with the reasons attached.</h1>
        <p>
          Qualitative signals, habit coverage, and copied lab context remain separate so one
          cannot silently change another.
        </p>
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
          <section className="results-canopy" aria-labelledby="results-canopy-title">
            <div className="section-heading">
              <p className="data-label">Signal navigation</p>
              <h2 id="results-canopy-title" ref={revealedResultsHeading} tabIndex={-1}>
                A living canopy you can inspect.
              </h2>
            </div>
            <RiskTree leaves={leaves} protectiveRoots={roots} />
          </section>

          {profile.age < 18 ? (
            <AdolescentHabitsMap answers={answers} />
          ) : score.kind === "adult-score" ? (
            <ScoreLedger score={score} />
          ) : score.kind === "insufficient-coverage" ? (
            <CoverageReflection score={score} />
          ) : null}

          {profile.age >= 18 ? <ActionPlan actions={actions} /> : null}
          <ConfirmedLabs values={confirmedLabs} />

          <section className="result-tools" aria-labelledby="result-tools-title">
            <p className="data-label">Local handoff</p>
            <h2 id="result-tools-title">Keep or clear these results.</h2>
            <p>
              Printing opens your browser&apos;s local print dialog. The default JSON contains
              interpreted output only.
            </p>
            {profile.age >= 18 ? (
              <label className="result-tools__raw-toggle">
                <input
                  type="checkbox"
                  checked={includeRawAnswers}
                  onChange={(event) => setIncludeRawAnswers(event.target.checked)}
                />
                <span>
                  Include structured raw answers in JSON
                  <small>Free text and private file metadata remain excluded.</small>
                </span>
              </label>
            ) : null}
            <div className="result-tools__actions">
              <button type="button" onClick={() => window.print()}>
                Print or save as PDF
              </button>
              <button type="button" onClick={downloadJson}>Download JSON</button>
              <button type="button" onClick={onRestart}>Restart from the beginning</button>
            </div>
          </section>
        </>
      )}
    </section>
  );
}
