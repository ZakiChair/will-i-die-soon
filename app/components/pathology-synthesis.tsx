"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";

import { questionBank } from "../data/questions";
import { useI18n } from "../i18n/context";
import {
  labCategoryLabel,
  pathologyCategoryLabel,
  pathologyCopy,
  type PercentInstrumentId,
} from "../i18n/pathology-copy";
import { localizeQuestion } from "../i18n/questions-fr";
import type { Locale } from "../i18n/types";
import { ScrollTrigger } from "../lib/gsap-client";
import type { ConfirmedLabValue } from "../lib/labs";
import {
  buildFollowUpPlan,
  followUpQuestionCount,
  type FollowUpScope,
} from "../lib/pathology-follow-up";
import { ORIENTATION_SOURCE_IDS, pathologyOrientation } from "../lib/pathology-orientation";
import { resolvePathologySources, shallowestDepthFor } from "../lib/pathology-risk";
import type {
  AnalysisDepth,
  AnswerMap,
  AnswerValue,
  PathologyHabitGain,
  PathologyInstrumentId,
  PathologyScoreInput,
  PathologyScoreRange,
  PathologyScoreResult,
  PathologySynthesis,
  ProfileContext,
  Question,
} from "../lib/types";
import { PathologyFollowUp } from "./pathology-follow-up";

/** Lets the results screen complete the incomplete scores in place. */
export type PathologyFollowUpControls = Readonly<{
  profile: ProfileContext;
  scope: FollowUpScope | null;
  onScopeChange: (scope: FollowUpScope | null) => void;
  onAnswer: (questionId: string, value: AnswerValue) => void;
  onLabs: (values: ConfirmedLabValue[]) => void;
}>;

type PathologySynthesisProps = Readonly<{
  synthesis: PathologySynthesis;
  depth: AnalysisDepth;
  answers: AnswerMap;
  followUp?: PathologyFollowUpControls;
}>;

const questionsById = new Map(questionBank.map((question) => [question.id, question]));

/** Instruments whose publication includes an absolute risk the policy may withhold. */
const PERCENT_INSTRUMENTS: ReadonlySet<PathologyInstrumentId> = new Set(["findrisc", "score2", "prevent", "who-cvd", "caide"]);

function isPercentInstrument(instrument: PathologyInstrumentId): instrument is PercentInstrumentId {
  return PERCENT_INSTRUMENTS.has(instrument);
}

const STATUS_ORDER: Readonly<Record<PathologyScoreResult["status"], number>> = {
  complete: 0,
  incomplete: 1,
  "not-applicable": 2,
};

type PeopleScale = 100 | 1000;

/** Below 1 % "N in 100" would round to zero, so the same risk is read per 1,000. */
function peopleScale(...percents: ReadonlyArray<number>): PeopleScale {
  return percents.some((percent) => percent > 0 && percent < 1) ? 1000 : 100;
}

function peopleCount(percent: number, scale: PeopleScale): number {
  return Math.min(scale, Math.max(0, Math.round((percent * scale) / 100)));
}

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

/** Decorative: the sentence next to it carries the same numbers for every reader. */
function PeopleGrid({
  filled,
  possible = 0,
  caption,
}: {
  readonly filled: number;
  readonly possible?: number;
  readonly caption?: string;
}) {
  return (
    <figure className="people-grid">
      <div className="people-grid__cells">
        {Array.from({ length: 100 }, (_, index) => (
          <span
            key={index}
            data-state={index < filled ? "filled" : index < filled + possible ? "possible" : undefined}
          />
        ))}
      </div>
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}

function RangeReading({
  score,
  range,
}: {
  readonly score: Extract<PathologyScoreResult, { status: "incomplete" }>;
  readonly range: PathologyScoreRange;
}) {
  const { locale } = useI18n();
  const copy = pathologyCopy[locale];
  const label = (category: string) => pathologyCategoryLabel(locale, score.instrument, category);
  const { low, high } = range;
  const settled = low.category === high.category;
  const lowPercent = low.riskPercent;
  const highPercent = high.riskPercent;
  const people =
    isPercentInstrument(score.instrument) &&
    lowPercent !== undefined &&
    highPercent !== undefined &&
    range.riskHorizonYears !== undefined
      ? { instrument: score.instrument, horizon: range.riskHorizonYears, scale: peopleScale(lowPercent, highPercent) }
      : undefined;
  const lowCount = people && lowPercent !== undefined ? peopleCount(lowPercent, people.scale) : 0;
  const highCount = people && highPercent !== undefined ? peopleCount(highPercent, people.scale) : 0;
  const missing = score.missingInputs.length;

  return (
    <div className="pathology-score__range">
      <h4>{copy.rangeHeading(missing)}</h4>
      <p className="pathology-score__range-category">
        <strong>
          {settled
            ? copy.rangeSettled(label(low.category), missing)
            : copy.rangeCategories(label(low.category), label(high.category))}
        </strong>
      </p>
      {low.points !== undefined && high.points !== undefined && range.maxPoints !== undefined ? (
        <p className="pathology-score__points">
          {low.points === high.points
            ? copy.pointsReadout(low.points, range.maxPoints)
            : copy.rangePoints(low.points, high.points, range.maxPoints)}
        </p>
      ) : null}
      {people ? (
        <div className="pathology-score__people">
          <p>
            {lowCount === highCount
              ? copy.people(lowCount, people.scale, people.instrument, people.horizon)
              : copy.peopleRange(lowCount, highCount, people.scale, people.instrument, people.horizon, missing)}
          </p>
          {people.scale === 100 ? (
            <div className="pathology-score__pictograms" aria-hidden="true">
              <PeopleGrid filled={lowCount} possible={highCount - lowCount} />
            </div>
          ) : null}
        </div>
      ) : null}
      <p className="pathology-score__range-note">{copy.rangeNote}</p>
    </div>
  );
}

function GainReading({
  score,
  gain,
  scale,
}: {
  readonly score: Extract<PathologyScoreResult, { status: "complete" }>;
  readonly gain: PathologyHabitGain;
  readonly scale: PeopleScale;
}) {
  const { locale } = useI18n();
  const copy = pathologyCopy[locale];
  const habits = new Intl.ListFormat(locale, { style: "long", type: "conjunction" }).format(
    gain.habits.map((habit) => copy.habits[habit]),
  );
  const withPeople =
    isPercentInstrument(score.instrument) && score.riskPercent !== undefined && gain.riskPercent !== undefined;
  const todayCount = score.riskPercent !== undefined ? peopleCount(score.riskPercent, scale) : 0;
  const gainCount = gain.riskPercent !== undefined ? peopleCount(gain.riskPercent, scale) : 0;
  const result = withPeople
    ? copy.gainPeople(gainCount, scale)
    : copy.gainCategory(
        pathologyCategoryLabel(locale, score.instrument, gain.category),
        gain.points !== undefined && score.maxPoints !== undefined
          ? copy.pointsReadout(gain.points, score.maxPoints)
          : undefined,
      );

  return (
    <div className="pathology-score__gain">
      <h4>{copy.gainHeading}</h4>
      <p>{copy.gainReadout(habits, result)}</p>
      {withPeople && scale === 100 ? (
        <div className="pathology-score__pictograms" aria-hidden="true">
          <PeopleGrid filled={todayCount} caption={copy.pictogramToday} />
          <PeopleGrid filled={gainCount} caption={copy.pictogramWithHabits} />
        </div>
      ) : null}
      <p className="pathology-score__gain-boundary">{copy.gainBoundary}</p>
    </div>
  );
}

function CompleteReading({ score }: { readonly score: Extract<PathologyScoreResult, { status: "complete" }> }) {
  const { locale } = useI18n();
  const copy = pathologyCopy[locale];
  const instrument = copy.instruments[score.instrument];
  const percent = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 });
  const percentInstrument = isPercentInstrument(score.instrument) ? score.instrument : undefined;
  const gain = score.gain;
  const scale = peopleScale(
    ...[score.riskPercent, gain?.riskPercent].filter((value): value is number => value !== undefined),
  );
  const gainShowsGrids =
    gain !== undefined && score.riskPercent !== undefined && gain.riskPercent !== undefined && scale === 100;

  return (
    <>
      <p className="pathology-score__category">
        <strong>{pathologyCategoryLabel(locale, score.instrument, score.category)}</strong>
        {score.instrument === "prevent" || score.instrument === "who-cvd" ? null : <span>{copy.levels[score.level]}</span>}
      </p>
      {score.points !== undefined && score.maxPoints !== undefined ? (
        <p className="pathology-score__points">{copy.pointsReadout(score.points, score.maxPoints)}</p>
      ) : null}
      {score.riskPercent !== undefined && score.riskHorizonYears !== undefined ? (
        <>
          <p className="pathology-score__percent">
            {/* Zero is a rounded value (a printed WHO cell, or under 0.05 % elsewhere), never no risk. */}
            {score.riskPercent === 0
              ? copy.percentReadoutUnder(percent.format(0.01), score.riskHorizonYears)
              : copy.percentReadout(percent.format(score.riskPercent / 100), score.riskHorizonYears)}
          </p>
          {percentInstrument ? (
            <div className="pathology-score__people">
              <p>
                {copy.people(peopleCount(score.riskPercent, scale), scale, percentInstrument, score.riskHorizonYears)}
              </p>
              {scale === 100 && !gainShowsGrids ? (
                <div className="pathology-score__pictograms" aria-hidden="true">
                  <PeopleGrid filled={peopleCount(score.riskPercent, scale)} />
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      ) : percentInstrument ? (
        <p className="pathology-score__percent pathology-score__percent--withheld">{copy.percentWithheld}</p>
      ) : null}
      <p className="pathology-score__boundary">
        {score.variant === "score2-diabetes" ? copy.score2DiabetesBoundary : instrument.boundary}
      </p>
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
      {gain ? <GainReading score={score} gain={gain} scale={scale} /> : null}
    </>
  );
}

function ScoreCard({
  score,
  depth,
  answers,
  followUpQuestions,
  onFollowUp,
}: {
  readonly score: PathologyScoreResult;
  readonly depth: AnalysisDepth;
  readonly answers: AnswerMap;
  readonly followUpQuestions: number;
  readonly onFollowUp?: () => void;
}) {
  const { locale } = useI18n();
  const copy = pathologyCopy[locale];
  const instrument = copy.instruments[score.instrument];
  const derivedInputs = score.inputs.filter((input) => input.derived);
  const answeredInputs = score.inputs.filter((input) => !input.derived);
  const orientation = pathologyOrientation(score);

  return (
    <li
      id={`pathology-score-${score.instrument}`}
      className="pathology-score"
      data-instrument={score.instrument}
      data-status={score.status}
      data-level={score.status === "complete" ? score.level : undefined}
      data-reveal-item
    >
      <div className="pathology-score__identity">
        <h3>{instrument.pathology}</h3>
        <p className="pathology-score__instrument">
          {score.instrument === "score2" && score.variant && score.variant in copy.score2Variant
            ? copy.score2Variant[score.variant as keyof typeof copy.score2Variant]
            : score.instrument === "who-cvd" && score.variant && score.variant in copy.whoVariant
              ? copy.whoVariant[score.variant as keyof typeof copy.whoVariant]
              : instrument.instrument}
          {score.instrument === "score2" && score.region && score.region in copy.escRegion
            ? ` · ${copy.escRegion[score.region as keyof typeof copy.escRegion]}`
            : null}
          {score.instrument === "who-cvd" && score.region && score.region in copy.whoRegion
            ? ` · ${copy.whoRegionLabel(copy.whoRegion[score.region as keyof typeof copy.whoRegion])}`
            : null}
        </p>
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
          <CompleteReading score={score} />
        ) : score.status === "incomplete" ? (
          <>
            {score.range ? <RangeReading score={score} range={score.range} /> : null}
            <p className="pathology-score__boundary">
              {score.variant === "score2-diabetes" ? copy.score2DiabetesBoundary : instrument.boundary}
            </p>
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
            {onFollowUp && followUpQuestions > 0 ? (
              <button type="button" className="pathology-score__follow-up" onClick={onFollowUp}>
                {copy.followUp.startOne(followUpQuestions)}
              </button>
            ) : null}
          </>
        ) : (
          <p className="pathology-score__reason">{copy.notApplicable[score.reason]}</p>
        )}
        {orientation ? (
          <div className="pathology-score__orientation">
            <h4>{copy.orientationHeading}</h4>
            <p>{copy.orientations[orientation]}</p>
            <SourceList ids={ORIENTATION_SOURCE_IDS[orientation]} label={copy.sourcesHeading} />
          </div>
        ) : null}
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

/** Answering follow-up questions moves later sections, so scroll-triggered reveals must re-measure. */
function useScrollTriggerRefreshOnResize(target: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const element = target.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    let frame = 0;
    let initial = true;
    const observer = new ResizeObserver(() => {
      if (initial) {
        initial = false;
        return;
      }
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (typeof ScrollTrigger.refresh === "function") ScrollTrigger.refresh();
      });
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [target]);
}

export function PathologySynthesisSection({ synthesis, depth, answers, followUp }: PathologySynthesisProps) {
  const { locale } = useI18n();
  const copy = pathologyCopy[locale];
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const section = useRef<HTMLElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const restoreFocus = useRef(false);
  const profile = followUp?.profile;
  const followUpScope = followUp?.scope ?? null;
  useScrollTriggerRefreshOnResize(section);

  const plans = useMemo(() => {
    if (!profile) return undefined;
    const all = buildFollowUpPlan(synthesis, answers, profile, "all");
    const perInstrument = new Map(
      synthesis.scores
        .filter((score) => score.status === "incomplete")
        .map((score) => [
          score.instrument,
          followUpQuestionCount(buildFollowUpPlan(synthesis, answers, profile, score.instrument)),
        ]),
    );
    return {
      questions: followUpQuestionCount(all),
      estimates: new Set(all.flatMap((step) => step.unlocks)).size,
      perInstrument,
    };
  }, [answers, profile, synthesis]);

  useEffect(() => {
    if (followUpScope === null && restoreFocus.current) {
      restoreFocus.current = false;
      title.current?.focus();
    }
  }, [followUpScope]);

  if (synthesis.scores.length === 0) return null;

  const scores = [...synthesis.scores].sort(
    (left, right) => STATUS_ORDER[left.status] - STATUS_ORDER[right.status],
  );
  const present = synthesis.dementiaFactors.filter((factor) => factor.status === "present");
  const absent = synthesis.dementiaFactors.filter((factor) => factor.status === "absent");
  const unanswered = synthesis.dementiaFactors.filter((factor) => factor.status === "unanswered");

  function closeFollowUp() {
    restoreFocus.current = true;
    followUp?.onScopeChange(null);
  }

  return (
    <section
      ref={section}
      id="pathology-synthesis"
      className="pathology-synthesis"
      aria-labelledby="pathology-synthesis-title"
    >
      <div className="pathology-synthesis__heading" data-reveal="heading">
        <p className="data-label" data-reveal-item>{copy.eyebrow}</p>
        <h2 id="pathology-synthesis-title" ref={title} tabIndex={-1} data-reveal-item>{copy.title}</h2>
        <p data-reveal-item>{copy.intro}</p>
        <p className="pathology-synthesis__version" data-reveal-item>
          {copy.rulesetVersion(synthesis.rulesetVersion)}
        </p>
      </div>

      {followUp && followUpScope !== null ? (
        <PathologyFollowUp
          key={followUpScope}
          scope={followUpScope}
          synthesis={synthesis}
          answers={answers}
          profile={followUp.profile}
          onAnswer={followUp.onAnswer}
          onLabs={followUp.onLabs}
          onClose={closeFollowUp}
        />
      ) : followUp && plans && plans.questions > 0 ? (
        <div className="pathology-follow-up-invite">
          <p>{copy.followUp.invite(plans.questions, plans.estimates)}</p>
          <button type="button" onClick={() => followUp.onScopeChange("all")}>
            {copy.followUp.startAll}
          </button>
        </div>
      ) : null}

      <ol className="pathology-scores" data-reveal="group">
        {scores.map((score) => (
          <ScoreCard
            key={score.instrument}
            score={score}
            depth={depth}
            answers={answers}
            followUpQuestions={plans?.perInstrument.get(score.instrument) ?? 0}
            onFollowUp={
              followUp && followUpScope === null ? () => followUp.onScopeChange(score.instrument) : undefined
            }
          />
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
