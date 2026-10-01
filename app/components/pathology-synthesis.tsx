"use client";

import { questionBank } from "../data/questions";
import { useI18n } from "../i18n/context";
import { labCategoryLabel, pathologyCategoryLabel, pathologyCopy } from "../i18n/pathology-copy";
import { localizeQuestion } from "../i18n/questions-fr";
import type { Locale } from "../i18n/types";
import { resolvePathologySources, shallowestDepthFor } from "../lib/pathology-risk";
import type {
  AnalysisDepth,
  AnswerMap,
  PathologyInstrumentId,
  PathologyScoreInput,
  PathologyScoreResult,
  PathologySynthesis,
  Question,
} from "../lib/types";

type PathologySynthesisProps = Readonly<{
  synthesis: PathologySynthesis;
  depth: AnalysisDepth;
  answers: AnswerMap;
}>;

const questionsById = new Map(questionBank.map((question) => [question.id, question]));

/** Instruments whose publication includes an absolute risk the policy may withhold. */
const PERCENT_INSTRUMENTS: ReadonlySet<PathologyInstrumentId> = new Set(["findrisc", "score2", "caide"]);

const STATUS_ORDER: Readonly<Record<PathologyScoreResult["status"], number>> = {
  complete: 0,
  incomplete: 1,
  "not-applicable": 2,
};

function inputLabel(id: string, locale: Locale): string {
  const label = pathologyCopy[locale].inputLabels[id];
  if (label) return label;
  const question = questionsById.get(id);
  return question ? localizeQuestion(question, locale).prompt : id;
}

function inputValueText(input: PathologyScoreInput, locale: Locale): string {
  const copy = pathologyCopy[locale];
  if (typeof input.value === "boolean") return input.value ? copy.yes : copy.no;
  if (typeof input.value === "number") {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(input.value);
  }
  const question = questionsById.get(input.id);
  if (!question?.options) return input.value;
  const labels = new Map(localizeQuestion(question, locale).options?.map((option) => [option.value, option.label]));
  return input.value
    .split(", ")
    .map((value) => labels.get(value) ?? value)
    .join(", ");
}

const DEPTH_RANK: Readonly<Record<AnalysisDepth, number>> = {
  express: 0,
  quick: 1,
  detailed: 2,
  deep: 3,
};

function missingOrigin(
  id: string,
  locale: Locale,
  depth: AnalysisDepth,
  answers: AnswerMap,
): string {
  const copy = pathologyCopy[locale];
  if (id.startsWith("lab:")) return copy.missingFromLab;
  if (id.startsWith("profile:")) return copy.missingFromProfile;
  // The question was in the queue but left unanswered or answered "not sure".
  if (Object.hasOwn(answers, id)) return copy.missingSkipped;
  const shallowest = shallowestDepthFor(id);
  if (shallowest === undefined) return copy.missingUnavailable;
  if (DEPTH_RANK[shallowest] > DEPTH_RANK[depth]) {
    return copy.missingFrom(copy.depths[shallowest]);
  }
  // The current depth could have asked it: either a branch stayed closed or the
  // queue budget went elsewhere, so the tier label alone would mislead.
  const gate = firstGateId(questionsById.get(id)?.condition);
  return gate ? copy.missingAfter(inputLabel(gate, locale)) : copy.missingUnavailable;
}

function firstGateId(condition: Question["condition"]): string | undefined {
  if (!condition) return undefined;
  if ("questionId" in condition) return condition.questionId;
  const children = "all" in condition ? condition.all : condition.any;
  for (const child of children) {
    const gate = firstGateId(child);
    if (gate) return gate;
  }
  return undefined;
}

function SourceList({ ids, label }: { readonly ids: ReadonlyArray<string>; readonly label: string }) {
  const sources = resolvePathologySources(ids);
  if (sources.length === 0) return null;
  return (
    <ul className="pathology-score__sources" aria-label={label}>
      {sources.map((source) => (
        <li key={source.id}>
          <a href={source.url} target="_blank" rel="noreferrer">
            {source.title} — {source.publisher}
          </a>
        </li>
      ))}
    </ul>
  );
}

function ScoreCard({
  score,
  depth,
  answers,
}: {
  readonly score: PathologyScoreResult;
  readonly depth: AnalysisDepth;
  readonly answers: AnswerMap;
}) {
  const { locale } = useI18n();
  const copy = pathologyCopy[locale];
  const instrument = copy.instruments[score.instrument];
  const percent = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 });
  const derivedInputs = score.inputs.filter((input) => input.derived);
  const answeredInputs = score.inputs.filter((input) => !input.derived);

  return (
    <li
      className="pathology-score"
      data-instrument={score.instrument}
      data-status={score.status}
      data-level={score.status === "complete" ? score.level : undefined}
      data-reveal-item
    >
      <div className="pathology-score__identity">
        <h3>{instrument.pathology}</h3>
        <p className="pathology-score__instrument">{instrument.instrument}</p>
        <p className="pathology-score__status">
          {score.status === "complete"
            ? copy.statusComplete
            : score.status === "incomplete"
              ? copy.statusIncomplete
              : copy.statusNotApplicable}
        </p>
      </div>

      <div className="pathology-score__reading">
        {score.status === "complete" ? (
          <>
            <p className="pathology-score__category">
              <strong>{pathologyCategoryLabel(locale, score.instrument, score.category)}</strong>
              <span>{copy.levels[score.level]}</span>
            </p>
            {score.points !== undefined && score.maxPoints !== undefined ? (
              <p className="pathology-score__points">{copy.pointsReadout(score.points, score.maxPoints)}</p>
            ) : null}
            {score.riskPercent !== undefined && score.riskHorizonYears !== undefined ? (
              <p className="pathology-score__percent">
                {copy.percentReadout(percent.format(score.riskPercent / 100), score.riskHorizonYears)}
              </p>
            ) : PERCENT_INSTRUMENTS.has(score.instrument) ? (
              <p className="pathology-score__percent pathology-score__percent--withheld">{copy.percentWithheld}</p>
            ) : null}
            <p className="pathology-score__boundary">{instrument.boundary}</p>
            {score.modifiers.length > 0 ? (
              <div className="pathology-score__modifiers">
                <h4>{copy.modifiersHeading}</h4>
                <ul>
                  {score.modifiers.map((modifier) => (
                    <li key={modifier}>{copy.modifiers[modifier] ?? modifier}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        ) : score.status === "incomplete" ? (
          <>
            <p className="pathology-score__boundary">{instrument.boundary}</p>
            <div className="pathology-score__missing">
              <h4>{copy.missingHeading}</h4>
              <ul>
                {score.missingInputs.map((id) => {
                  const origin = missingOrigin(id, locale, depth, answers);
                  return (
                    <li key={id}>
                      <span>{inputLabel(id, locale)}</span>
                      {origin ? <small>{origin}</small> : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          </>
        ) : (
          <p className="pathology-score__reason">{copy.notApplicable[score.reason]}</p>
        )}
      </div>

      <div className="pathology-score__evidence">
        {answeredInputs.length > 0 || derivedInputs.length > 0 ? (
          <details className="pathology-score__inputs">
            <summary>{copy.inputsHeading}</summary>
            <dl>
              {[...answeredInputs, ...derivedInputs].map((input, index) => (
                <div key={`${input.id}-${index}`} data-derived={input.derived ? "true" : undefined}>
                  <dt>
                    {inputLabel(input.id, locale)}
                    {input.derived ? <em> · {copy.derivedTag}</em> : null}
                  </dt>
                  <dd>{inputValueText(input, locale)}</dd>
                </div>
              ))}
            </dl>
          </details>
        ) : null}
        <SourceList ids={score.sourceIds} label={copy.sourcesHeading} />
      </div>
    </li>
  );
}

export function PathologySynthesisSection({ synthesis, depth, answers }: PathologySynthesisProps) {
  const { locale } = useI18n();
  const copy = pathologyCopy[locale];
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  if (synthesis.scores.length === 0) return null;

  const scores = [...synthesis.scores].sort(
    (left, right) => STATUS_ORDER[left.status] - STATUS_ORDER[right.status],
  );
  const present = synthesis.dementiaFactors.filter((factor) => factor.status === "present");
  const absent = synthesis.dementiaFactors.filter((factor) => factor.status === "absent");
  const unanswered = synthesis.dementiaFactors.filter((factor) => factor.status === "unanswered");

  return (
    <section
      id="pathology-synthesis"
      className="pathology-synthesis"
      aria-labelledby="pathology-synthesis-title"
    >
      <div className="pathology-synthesis__heading" data-reveal="heading">
        <p className="data-label" data-reveal-item>{copy.eyebrow}</p>
        <h2 id="pathology-synthesis-title" data-reveal-item>{copy.title}</h2>
        <p data-reveal-item>{copy.intro}</p>
        <p className="pathology-synthesis__version" data-reveal-item>
          {copy.rulesetVersion(synthesis.rulesetVersion)}
        </p>
      </div>

      <ol className="pathology-scores" data-reveal="group">
        {scores.map((score) => (
          <ScoreCard key={score.instrument} score={score} depth={depth} answers={answers} />
        ))}
      </ol>

      {synthesis.labClassifications.length > 0 ? (
        <section className="pathology-labs" aria-labelledby="pathology-labs-title">
          <div className="pathology-labs__heading" data-reveal="heading">
            <h3 id="pathology-labs-title" data-reveal-item>{copy.labsTitle}</h3>
            <p data-reveal-item>{copy.labsIntro}</p>
          </div>
          <div className="pathology-labs__table-wrap" data-reveal="group">
            <table data-reveal-item>
              <thead>
                <tr>
                  <th scope="col">{copy.labMarker}</th>
                  <th scope="col">{copy.labValue}</th>
                  <th scope="col">{copy.labCategory}</th>
                </tr>
              </thead>
              <tbody>
                {synthesis.labClassifications.map((classification) => (
                  <tr key={classification.marker} data-category={classification.category}>
                    <th scope="row">{inputLabel(`lab:${classification.marker}`, locale)}</th>
                    <td>
                      {number.format(classification.value)} {classification.unit}
                    </td>
                    <td>
                      {labCategoryLabel(locale, classification.marker, classification.category)}
                      <SourceList ids={classification.sourceIds} label={copy.sourcesHeading} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {synthesis.dementiaFactors.length > 0 ? (
        <section className="pathology-factors" aria-labelledby="pathology-factors-title">
          <div className="pathology-factors__heading" data-reveal="heading">
            <h3 id="pathology-factors-title" data-reveal-item>{copy.dementiaTitle}</h3>
            <p data-reveal-item>{copy.dementiaIntro}</p>
            <p className="pathology-factors__summary" data-reveal-item>
              {copy.dementiaSummary(present.length, absent.length, unanswered.length)}
            </p>
            <p
              className="pathology-factors__family-history"
              data-family-history={synthesis.dementiaFamilyHistory}
              data-reveal-item
            >
              {copy.dementiaFamilyHistory[synthesis.dementiaFamilyHistory]}
            </p>
          </div>
          <ul className="pathology-factors__list" data-reveal="group">
            {[...present, ...absent, ...unanswered].map((factor) => (
              <li key={factor.id} data-status={factor.status} data-reveal-item>
                <span>{copy.dementiaFactors[factor.id]}</span>
                <strong>
                  {factor.status === "present"
                    ? copy.dementiaPresent
                    : factor.status === "absent"
                      ? copy.dementiaAbsent
                      : copy.dementiaUnanswered}
                </strong>
              </li>
            ))}
          </ul>
          <SourceList ids={synthesis.dementiaSourceIds} label={copy.sourcesHeading} />
        </section>
      ) : null}

      <p className="pathology-synthesis__boundary">{copy.boundary}</p>
    </section>
  );
}
