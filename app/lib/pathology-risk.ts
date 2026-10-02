import { evidenceSources } from "../data/evidence";
import { questionBank } from "../data/questions";
import { canonicalUnit, type ConfirmedLabValue, type LabMarker } from "./labs";
import { PATHOLOGY_RULESET_VERSION } from "./release-policy";
import type {
  AnalysisDepth,
  AnswerMap,
  AnswerValue,
  DementiaFactor,
  DementiaFactorId,
  DementiaFamilyHistory,
  EvidenceSource,
  LabClassification,
  PathologyHabitGain,
  PathologyHabitId,
  PathologyInstrumentId,
  PathologyNotApplicableReason,
  PathologyRangeBound,
  PathologyRiskLevel,
  PathologyScoreInput,
  PathologyScoreRange,
  PathologyScoreResult,
  PathologySynthesis,
  ProfileContext,
  ReleasePolicy,
} from "./types";

export { PATHOLOGY_RULESET_VERSION };

export type PathologySourceId = keyof typeof evidenceSources;

const questionsById = new Map(questionBank.map((question) => [question.id, question]));

/** Countries the app offers that fall in the ESC "low risk" SCORE2 region. */
const LOW_RISK_REGION_COUNTRIES = new Set(["CH", "GB"]);

const PLAUSIBLE = {
  heightCm: { min: 100, max: 250 },
  weightKg: { min: 25, max: 400 },
  waistCm: { min: 40, max: 250 },
  neckCm: { min: 20, max: 80 },
  systolic: { min: 60, max: 260 },
  weeklyMinutes: { min: 0, max: 10080 },
  plantPortions: { min: 0, max: 50 },
  drinks: { min: 0, max: 100 },
  totalCholesterolMmol: { min: 1, max: 20 },
  hdlMmol: { min: 0.1, max: 5 },
  ldlMmol: { min: 0.1, max: 15 },
} as const;

// ---------------------------------------------------------------------------
// Answer readers (structured answers only; free text is never interpreted)
// ---------------------------------------------------------------------------

function rawAnswer(answers: AnswerMap, id: string): AnswerValue | undefined {
  return Object.prototype.hasOwnProperty.call(answers, id) ? answers[id] : undefined;
}

function readBoolean(answers: AnswerMap, id: string): boolean | undefined {
  const value = rawAnswer(answers, id);
  return questionsById.get(id)?.answerType === "boolean" && typeof value === "boolean"
    ? value
    : undefined;
}

function readNumber(
  answers: AnswerMap,
  id: string,
  range: { readonly min: number; readonly max: number },
): number | undefined {
  const question = questionsById.get(id);
  const value = rawAnswer(answers, id);
  if (!question || (question.answerType !== "number" && question.answerType !== "scale")) {
    return undefined;
  }
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return value >= range.min && value <= range.max ? value : undefined;
}

function readSingle(answers: AnswerMap, id: string): string | undefined {
  const question = questionsById.get(id);
  const value = rawAnswer(answers, id);
  if (question?.answerType !== "single" || typeof value !== "string") return undefined;
  return question.options?.some((option) => option.value === value) ? value : undefined;
}

function readMulti(answers: AnswerMap, id: string): ReadonlyArray<string> | undefined {
  const question = questionsById.get(id);
  const value = rawAnswer(answers, id);
  if (question?.answerType !== "multi" || !Array.isArray(value) || value.length === 0) {
    return undefined;
  }
  const allowed = new Set(question.options?.map((option) => option.value) ?? []);
  const valid =
    value.every((item) => typeof item === "string" && allowed.has(item)) &&
    new Set(value).size === value.length &&
    !(value.includes("none") && value.length > 1);
  return valid ? value : undefined;
}

// ---------------------------------------------------------------------------
// Confirmed laboratory values
// ---------------------------------------------------------------------------

function latestLab(
  labs: ReadonlyArray<ConfirmedLabValue>,
  marker: LabMarker,
): ConfirmedLabValue | undefined {
  return labs
    .filter((lab) => lab.reviewed.marker === marker)
    .reduce<ConfirmedLabValue | undefined>(
      (latest, lab) =>
        latest === undefined || lab.reviewed.collectionDate >= latest.reviewed.collectionDate
          ? lab
          : latest,
      undefined,
    );
}

function labValueIn(lab: ConfirmedLabValue, unit: string): number | undefined {
  if (canonicalUnit(lab.reviewed.unit) === unit && Number.isFinite(lab.reviewed.value)) {
    return lab.reviewed.value;
  }
  if (canonicalUnit(lab.normalized.unit) === unit && Number.isFinite(lab.normalized.value)) {
    return lab.normalized.value;
  }
  return undefined;
}

function labInputId(marker: LabMarker): string {
  return `lab:${marker}`;
}

// ---------------------------------------------------------------------------
// Shared derived context
// ---------------------------------------------------------------------------

type SexAtBirth = "male" | "female" | "intersex";

type Derived<T> = {
  readonly value: T | undefined;
  readonly inputs: ReadonlyArray<PathologyScoreInput>;
  /** Question ids that would resolve an undefined value. */
  readonly missing: ReadonlyArray<string>;
};

type EvaluationContext = {
  readonly answers: AnswerMap;
  readonly profile: ProfileContext;
  readonly labs: ReadonlyArray<ConfirmedLabValue>;
  readonly policy: ReleasePolicy;
  readonly sex: SexAtBirth | undefined;
  readonly bodyMassIndex: Derived<number>;
  readonly currentSmoker: Derived<boolean>;
  readonly hypertension: Derived<boolean>;
  readonly systolic: number | undefined;
  readonly diagnosedConditions: ReadonlyArray<string> | undefined;
};

function deriveBodyMassIndex(answers: AnswerMap): Derived<number> {
  const height = readNumber(answers, "height_cm", PLAUSIBLE.heightCm);
  const weight = readNumber(answers, "weight_kg", PLAUSIBLE.weightKg);
  const missing = [
    ...(height === undefined ? ["height_cm"] : []),
    ...(weight === undefined ? ["weight_kg"] : []),
  ];
  if (height === undefined || weight === undefined) {
    return { value: undefined, inputs: [], missing };
  }
  const value = Math.round((weight / (height / 100) ** 2) * 10) / 10;
  return {
    value,
    inputs: [{ id: "derived:body_mass_index", value, derived: true }],
    missing: [],
  };
}

/**
 * SCORE2 and COPD-PS mean smoked tobacco. Prescribed nicotine replacement in a
 * quit plan, and vaping or smokeless products alone, do not count as smoking.
 */
function deriveCurrentSmoker(answers: AnswerMap): Derived<boolean> {
  const current = readBoolean(answers, "current_tobacco_nicotine");
  if (current === undefined) {
    return { value: undefined, inputs: [], missing: ["current_tobacco_nicotine"] };
  }
  const inputs: PathologyScoreInput[] = [{ id: "current_tobacco_nicotine", value: current }];
  if (!current) return { value: false, inputs, missing: [] };

  const context = readSingle(answers, "tobacco_nicotine_context");
  if (context !== undefined) inputs.push({ id: "tobacco_nicotine_context", value: context });
  const products = readMulti(answers, "tobacco_detail_products");
  if (products !== undefined) {
    inputs.push({ id: "tobacco_detail_products", value: products.join(", ") });
  }
  const nicotineReplacementOnly = context === "only_prescribed_nrt_quit_plan";
  const smokelessOnly =
    products !== undefined &&
    products.every((product) => product === "vape" || product === "smokeless");
  const value = !nicotineReplacementOnly && !smokelessOnly;
  return {
    value,
    inputs: [...inputs, { id: "derived:current_smoker", value, derived: true }],
    missing: [],
  };
}

function deriveHypertension(answers: AnswerMap, systolic: number | undefined): Derived<boolean> {
  const diagnosed = readBoolean(answers, "diagnosed_high_blood_pressure");
  const medication = readBoolean(answers, "bp_medication_ever");
  const inputs: PathologyScoreInput[] = [];
  if (diagnosed !== undefined) inputs.push({ id: "diagnosed_high_blood_pressure", value: diagnosed });
  if (medication !== undefined) inputs.push({ id: "bp_medication_ever", value: medication });
  if (systolic !== undefined) inputs.push({ id: "blood_pressure_systolic", value: systolic });

  const positive = diagnosed === true || medication === true || (systolic !== undefined && systolic >= 140);
  if (!positive && diagnosed === undefined) {
    return { value: undefined, inputs, missing: ["diagnosed_high_blood_pressure"] };
  }
  return {
    value: positive,
    inputs: [...inputs, { id: "derived:hypertension", value: positive, derived: true }],
    missing: [],
  };
}

function buildContext(
  answers: AnswerMap,
  profile: ProfileContext,
  labs: ReadonlyArray<ConfirmedLabValue>,
  policy: ReleasePolicy,
): EvaluationContext {
  const sex = readSingle(answers, "sex_assigned_at_birth") as SexAtBirth | undefined;
  const systolic = readNumber(answers, "blood_pressure_systolic", PLAUSIBLE.systolic);
  return {
    answers,
    profile,
    labs,
    policy,
    sex,
    bodyMassIndex: deriveBodyMassIndex(answers),
    currentSmoker: deriveCurrentSmoker(answers),
    hypertension: deriveHypertension(answers, systolic),
    systolic,
    diagnosedConditions: readMulti(answers, "diagnosed_conditions_core"),
  };
}

// ---------------------------------------------------------------------------
// Input collection and result builders
// ---------------------------------------------------------------------------

/** A "not sure" option is an honest answer, but the instrument has no point value for it. */
const UNSCORED_OPTIONS = {
  sleep_snoring: "unknown",
  sleep_witnessed_apnea: "unknown",
  family_diabetes: "unsure",
} as const satisfies Readonly<Record<string, string>>;

class InputCollector {
  readonly inputs: PathologyScoreInput[] = [];
  readonly missing: string[] = [];

  constructor(private readonly context: EvaluationContext) {}

  age(): number {
    const { age } = this.context.profile;
    this.inputs.push({ id: "profile:age", value: age });
    return age;
  }

  sex(): SexAtBirth | undefined {
    return this.record("sex_assigned_at_birth", this.context.sex);
  }

  boolean(id: string): boolean | undefined {
    return this.record(id, readBoolean(this.context.answers, id));
  }

  number(id: string, range: { readonly min: number; readonly max: number }): number | undefined {
    return this.record(id, readNumber(this.context.answers, id, range));
  }

  single(id: string): string | undefined {
    return this.record(id, readSingle(this.context.answers, id));
  }

  knownSingle(id: keyof typeof UNSCORED_OPTIONS): string | undefined {
    const value = readSingle(this.context.answers, id);
    return this.record(id, value === UNSCORED_OPTIONS[id] ? undefined : value);
  }

  derived<T>(derivation: Derived<T>): T | undefined {
    this.inputs.push(...derivation.inputs);
    this.missing.push(...derivation.missing);
    return derivation.value;
  }

  lab(marker: LabMarker, unit: string, range: { readonly min: number; readonly max: number }): number | undefined {
    const lab = latestLab(this.context.labs, marker);
    const value = lab ? labValueIn(lab, unit) : undefined;
    const plausible = value !== undefined && value >= range.min && value <= range.max ? value : undefined;
    return this.record(labInputId(marker), plausible);
  }

  private record<T extends string | number | boolean>(id: string, value: T | undefined): T | undefined {
    if (value === undefined) this.missing.push(id);
    else this.inputs.push({ id, value });
    return value;
  }
}

function notApplicable(
  instrument: PathologyInstrumentId,
  sourceIds: ReadonlyArray<PathologySourceId>,
  reason: PathologyNotApplicableReason,
  inputs: ReadonlyArray<PathologyScoreInput>,
): PathologyScoreResult {
  return { instrument, sourceIds, status: "not-applicable", reason, inputs };
}

function incomplete(
  instrument: PathologyInstrumentId,
  sourceIds: ReadonlyArray<PathologySourceId>,
  collector: InputCollector,
  conditionalInputs: ReadonlyArray<string> = [],
): PathologyScoreResult {
  return {
    instrument,
    sourceIds,
    status: "incomplete",
    inputs: collector.inputs,
    missingInputs: [...new Set(collector.missing)],
    ...(conditionalInputs.length > 0 ? { conditionalInputs } : {}),
  };
}

type CompleteDetails = {
  category: string;
  level: PathologyRiskLevel;
  points?: number;
  maxPoints?: number;
  riskPercent?: number;
  riskHorizonYears?: number;
  modifiers?: ReadonlyArray<string>;
};

function complete(
  instrument: PathologyInstrumentId,
  sourceIds: ReadonlyArray<PathologySourceId>,
  collector: InputCollector,
  details: CompleteDetails,
  policy: ReleasePolicy,
): PathologyScoreResult {
  const { riskPercent, riskHorizonYears, modifiers, ...rest } = details;
  return {
    instrument,
    sourceIds,
    status: "complete",
    inputs: collector.inputs,
    ...rest,
    modifiers: modifiers ?? [],
    ...(policy.allowValidatedProbabilities && riskPercent !== undefined
      ? { riskPercent, riskHorizonYears }
      : {}),
  };
}

type PointBand = {
  readonly max: number;
  readonly category: string;
  readonly level: PathologyRiskLevel;
  readonly riskPercent: number;
};

function bandFor(bands: ReadonlyArray<PointBand>, points: number): PointBand {
  return bands.find((band) => points <= band.max) ?? bands[bands.length - 1];
}

// ---------------------------------------------------------------------------
// FINDRISC (type 2 diabetes, 10-year risk)
// ---------------------------------------------------------------------------

const FINDRISC_SOURCES: ReadonlyArray<PathologySourceId> = ["findriscLindstrom2003"];
const FINDRISC_BANDS: ReadonlyArray<PointBand> = [
  { max: 6, category: "low", level: "low", riskPercent: 1 },
  { max: 11, category: "slightly-elevated", level: "moderate", riskPercent: 4 },
  { max: 14, category: "moderate", level: "moderate", riskPercent: 17 },
  { max: 20, category: "high", level: "high", riskPercent: 33 },
  { max: 26, category: "very-high", level: "very-high", riskPercent: 50 },
];

function evaluateFindrisc(context: EvaluationContext): PathologyScoreResult {
  if (context.diagnosedConditions?.includes("diabetes")) {
    return notApplicable("findrisc", FINDRISC_SOURCES, "diagnosed-condition", [
      { id: "diagnosed_conditions_core", value: "diabetes" },
    ]);
  }
  const collector = new InputCollector(context);
  const sex = collector.sex();
  if (sex === "intersex") {
    return notApplicable("findrisc", FINDRISC_SOURCES, "sex-not-supported", collector.inputs);
  }

  let points = 0;
  const age = collector.age();
  points += age < 45 ? 0 : age < 55 ? 2 : age < 65 ? 3 : 4;

  const bmi = collector.derived(context.bodyMassIndex);
  if (bmi !== undefined) points += bmi < 25 ? 0 : bmi <= 30 ? 1 : 3;

  const waist = collector.number("waist_circumference_cm", PLAUSIBLE.waistCm);
  if (waist !== undefined && sex !== undefined) {
    points +=
      sex === "male"
        ? waist < 94 ? 0 : waist <= 102 ? 3 : 4
        : waist < 80 ? 0 : waist <= 88 ? 3 : 4;
  }

  const dailyActivity = readBoolean(context.answers, "daily_activity_30_min");
  if (dailyActivity !== undefined) {
    collector.inputs.push({ id: "daily_activity_30_min", value: dailyActivity });
    points += dailyActivity ? 0 : 2;
  } else {
    const weekly = readNumber(context.answers, "weekly_moderate_activity_minutes", PLAUSIBLE.weeklyMinutes);
    if (weekly === undefined) {
      collector.missing.push("daily_activity_30_min");
    } else {
      const active = weekly >= 150;
      collector.inputs.push({ id: "daily_activity_30_min", value: active, derived: true });
      points += active ? 0 : 2;
    }
  }

  const plantPortions = readNumber(context.answers, "plant_food_frequency", PLAUSIBLE.plantPortions);
  if (plantPortions === undefined) {
    collector.missing.push("plant_food_frequency");
  } else {
    const daily = plantPortions >= 1;
    collector.inputs.push({ id: "derived:daily_fruit_vegetables", value: daily, derived: true });
    points += daily ? 0 : 1;
  }

  // The Quick queue asks about diagnosed hypertension but not about its
  // medication; a negative diagnosis makes "no blood-pressure medication"
  // derivable there, mirroring the daily-activity derivation above.
  const medicationAnswer = readBoolean(context.answers, "bp_medication_ever");
  let bloodPressureMedication: boolean | undefined;
  if (medicationAnswer !== undefined) {
    collector.inputs.push({ id: "bp_medication_ever", value: medicationAnswer });
    bloodPressureMedication = medicationAnswer;
  } else if (readBoolean(context.answers, "diagnosed_high_blood_pressure") === false) {
    collector.inputs.push({ id: "bp_medication_ever", value: false, derived: true });
    bloodPressureMedication = false;
  } else {
    collector.missing.push("bp_medication_ever");
  }
  if (bloodPressureMedication) points += 2;
  const highGlucose = collector.boolean("glucose_high_ever");
  if (highGlucose) points += 5;
  const family = collector.knownSingle("family_diabetes");
  points += family === "first_degree" ? 5 : family === "other_relatives" ? 3 : 0;

  if (collector.missing.length > 0) return incomplete("findrisc", FINDRISC_SOURCES, collector);
  const band = bandFor(FINDRISC_BANDS, points);
  return complete(
    "findrisc",
    FINDRISC_SOURCES,
    collector,
    {
      points,
      maxPoints: 26,
      category: band.category,
      level: band.level,
      riskPercent: band.riskPercent,
      riskHorizonYears: 10,
    },
    context.policy,
  );
}

// ---------------------------------------------------------------------------
// SCORE2 / SCORE2-OP (fatal and non-fatal cardiovascular disease, 10-year risk)
// ---------------------------------------------------------------------------

type Score2Coefficients = {
  readonly age: number;
  readonly smoking: number;
  readonly systolic: number;
  readonly totalCholesterol: number;
  readonly hdl: number;
  readonly ageSmoking: number;
  readonly ageSystolic: number;
  readonly ageTotalCholesterol: number;
  readonly ageHdl: number;
  readonly baselineSurvival: number;
  /** Subtracted from the linear predictor (SCORE2-OP centres it on the mean). */
  readonly meanLinearPredictor: number;
  readonly lowRiskRegion: { readonly scale1: number; readonly scale2: number };
};

// Coefficients as published in the SCORE2 and SCORE2-OP supplementary material
// (Eur Heart J 2021). Diabetes terms are omitted: people with diabetes are
// routed to `diagnosed-condition` because SCORE2-Diabetes is out of scope.
const SCORE2: Readonly<Record<"male" | "female", Score2Coefficients>> = {
  male: {
    age: 0.3742,
    smoking: 0.6012,
    systolic: 0.2777,
    totalCholesterol: 0.1458,
    hdl: -0.2698,
    ageSmoking: -0.0755,
    ageSystolic: -0.0255,
    ageTotalCholesterol: -0.0281,
    ageHdl: 0.0426,
    baselineSurvival: 0.9605,
    meanLinearPredictor: 0,
    lowRiskRegion: { scale1: -0.5699, scale2: 0.7476 },
  },
  female: {
    age: 0.4648,
    smoking: 0.7744,
    systolic: 0.3131,
    totalCholesterol: 0.1002,
    hdl: -0.2606,
    ageSmoking: -0.1088,
    ageSystolic: -0.0277,
    ageTotalCholesterol: -0.0226,
    ageHdl: 0.0613,
    baselineSurvival: 0.9776,
    meanLinearPredictor: 0,
    lowRiskRegion: { scale1: -0.738, scale2: 0.7019 },
  },
};

const SCORE2_OP: Readonly<Record<"male" | "female", Score2Coefficients>> = {
  male: {
    age: 0.0634,
    smoking: 0.3524,
    systolic: 0.0094,
    totalCholesterol: 0.085,
    hdl: -0.3564,
    ageSmoking: -0.0247,
    ageSystolic: -0.0005,
    ageTotalCholesterol: 0.0073,
    ageHdl: 0.0091,
    baselineSurvival: 0.7576,
    meanLinearPredictor: 0.0929,
    lowRiskRegion: { scale1: -0.34, scale2: 1.19 },
  },
  female: {
    age: 0.0789,
    smoking: 0.4921,
    systolic: 0.0102,
    totalCholesterol: 0.0605,
    hdl: -0.304,
    ageSmoking: -0.0255,
    ageSystolic: -0.0004,
    ageTotalCholesterol: -0.0009,
    ageHdl: 0.0154,
    baselineSurvival: 0.8082,
    meanLinearPredictor: 0.229,
    lowRiskRegion: { scale1: -0.52, scale2: 1.01 },
  },
};

type Score2Predictors = {
  readonly age: number;
  readonly smoker: boolean;
  readonly systolic: number;
  readonly totalCholesterol: number;
  readonly hdl: number;
};

function recalibrate(risk: number, scale: { scale1: number; scale2: number }): number {
  return 1 - Math.exp(-Math.exp(scale.scale1 + scale.scale2 * Math.log(-Math.log(1 - risk))));
}

function linearPredictor(
  model: Score2Coefficients,
  centred: { age: number; systolic: number; totalCholesterol: number; hdl: number },
  smoker: boolean,
): number {
  const smoking = smoker ? 1 : 0;
  return (
    model.age * centred.age +
    model.smoking * smoking +
    model.systolic * centred.systolic +
    model.totalCholesterol * centred.totalCholesterol +
    model.hdl * centred.hdl +
    model.ageSmoking * centred.age * smoking +
    model.ageSystolic * centred.age * centred.systolic +
    model.ageTotalCholesterol * centred.age * centred.totalCholesterol +
    model.ageHdl * centred.age * centred.hdl -
    model.meanLinearPredictor
  );
}

/** Ten-year risk (0–1) for the ESC low-risk region. */
export function score2TenYearRisk(sex: "male" | "female", predictors: Score2Predictors): number {
  const older = predictors.age >= 70;
  const model = older ? SCORE2_OP[sex] : SCORE2[sex];
  const centred = older
    ? {
        age: predictors.age - 73,
        systolic: predictors.systolic - 150,
        totalCholesterol: predictors.totalCholesterol - 6,
        hdl: predictors.hdl - 1.4,
      }
    : {
        age: (predictors.age - 60) / 5,
        systolic: (predictors.systolic - 120) / 20,
        totalCholesterol: predictors.totalCholesterol - 6,
        hdl: (predictors.hdl - 1.3) / 0.5,
      };
  const uncalibrated = 1 - model.baselineSurvival ** Math.exp(linearPredictor(model, centred, predictors.smoker));
  return recalibrate(uncalibrated, model.lowRiskRegion);
}

function score2Category(age: number, riskPercent: number): { category: string; level: PathologyRiskLevel } {
  const [high, veryHigh] = age < 50 ? [2.5, 7.5] : age < 70 ? [5, 10] : [7.5, 15];
  if (riskPercent < high) return { category: "low-to-moderate", level: "low" };
  if (riskPercent < veryHigh) return { category: "high", level: "high" };
  return { category: "very-high", level: "very-high" };
}

function evaluateScore2(context: EvaluationContext): PathologyScoreResult {
  const age = context.profile.age;
  const sources: ReadonlyArray<PathologySourceId> =
    age >= 70 ? ["score2OpEsc2021", "escPrevention2021"] : ["score2Esc2021", "escPrevention2021"];
  const ageInput: PathologyScoreInput = { id: "profile:age", value: age };
  if (age < 40 || age > 89) {
    return notApplicable("score2", sources, "age-out-of-range", [ageInput]);
  }
  if (context.diagnosedConditions?.includes("diabetes")) {
    return notApplicable("score2", sources, "diagnosed-condition", [
      ageInput,
      { id: "diagnosed_conditions_core", value: "diabetes" },
    ]);
  }
  const establishedCvd = readBoolean(context.answers, "cvd_event_history");
  if (establishedCvd === true) {
    return notApplicable("score2", sources, "established-cvd", [
      ageInput,
      { id: "cvd_event_history", value: true },
    ]);
  }
  if (context.sex === "intersex") {
    return notApplicable("score2", sources, "sex-not-supported", [
      ageInput,
      { id: "sex_assigned_at_birth", value: "intersex" },
    ]);
  }
  const country = context.profile.countryCode.trim().toUpperCase();
  if (!LOW_RISK_REGION_COUNTRIES.has(country)) {
    return notApplicable("score2", sources, "region-not-calibrated", [
      ageInput,
      { id: "profile:country", value: country },
    ]);
  }

  const collector = new InputCollector(context);
  collector.age();
  const recordedSex = collector.sex();
  const sex = recordedSex === "male" || recordedSex === "female" ? recordedSex : undefined;
  if (context.diagnosedConditions === undefined) collector.missing.push("diagnosed_conditions_core");
  else collector.inputs.push({ id: "diagnosed_conditions_core", value: context.diagnosedConditions.join(", ") });
  collector.boolean("cvd_event_history");
  const smoker = collector.derived(context.currentSmoker);
  const systolic = collector.number("blood_pressure_systolic", PLAUSIBLE.systolic);
  const totalCholesterol = collector.lab("total_cholesterol", "mmol/L", PLAUSIBLE.totalCholesterolMmol);
  const hdl = collector.lab("hdl_cholesterol", "mmol/L", PLAUSIBLE.hdlMmol);

  if (
    collector.missing.length > 0 ||
    sex === undefined ||
    smoker === undefined ||
    systolic === undefined ||
    totalCholesterol === undefined ||
    hdl === undefined
  ) {
    return incomplete("score2", sources, collector);
  }

  const risk = score2TenYearRisk(sex, { age, smoker, systolic, totalCholesterol, hdl });
  const riskPercent = Math.round(risk * 1000) / 10;
  const reportedModifiers = (["family_early_cvd", "inflammatory_condition", "statin_current"] as const).filter(
    (id) => readBoolean(context.answers, id) === true,
  );
  for (const id of reportedModifiers) collector.inputs.push({ id, value: true });
  // ESC treats established atherosclerotic disease and moderate/severe CKD as high or
  // very-high risk outright, but the diagnosed-conditions options are too broad to
  // exclude the estimate, so declared conditions are surfaced as reading modifiers.
  const modifiers: string[] = [...reportedModifiers];
  if (context.diagnosedConditions?.includes("heart_vascular")) modifiers.push("declared_heart_vascular");
  if (context.diagnosedConditions?.includes("kidney")) modifiers.push("declared_kidney");

  return complete(
    "score2",
    sources,
    collector,
    { ...score2Category(age, riskPercent), riskPercent, riskHorizonYears: 10, modifiers },
    context.policy,
  );
}

// ---------------------------------------------------------------------------
// STOP-Bang (obstructive sleep apnoea)
// ---------------------------------------------------------------------------

const STOP_BANG_SOURCES: ReadonlyArray<PathologySourceId> = ["stopBangChung2008", "stopBangChung2016"];

function evaluateStopBang(context: EvaluationContext): PathologyScoreResult {
  if (context.diagnosedConditions?.includes("sleep_apnoea")) {
    return notApplicable("stop-bang", STOP_BANG_SOURCES, "diagnosed-condition", [
      { id: "diagnosed_conditions_core", value: "sleep_apnoea" },
    ]);
  }
  const collector = new InputCollector(context);
  const snoring = collector.knownSingle("sleep_snoring");
  const sleepiness = collector.single("sleep_daytime_sleepiness");
  const witnessed = collector.knownSingle("sleep_witnessed_apnea");
  const pressure = collector.derived(context.hypertension);
  const bmi = collector.derived(context.bodyMassIndex);
  const age = collector.age();
  const neck = collector.number("neck_circumference_cm", PLAUSIBLE.neckCm);
  const sex = collector.sex();

  if (
    collector.missing.length > 0 ||
    snoring === undefined ||
    sleepiness === undefined ||
    witnessed === undefined ||
    pressure === undefined ||
    bmi === undefined ||
    neck === undefined ||
    sex === undefined
  ) {
    return incomplete("stop-bang", STOP_BANG_SOURCES, collector);
  }

  const stop = [
    snoring === "yes",
    sleepiness === "often" || sleepiness === "daily",
    witnessed === "yes",
    pressure,
  ].filter(Boolean).length;
  const male = sex === "male";
  const largeBody = bmi > 35;
  const largeNeck = neck > 40;
  const points = stop + [largeBody, age > 50, largeNeck, male].filter(Boolean).length;
  const high = points >= 5 || (stop >= 2 && (male || largeBody || largeNeck));
  const band = high
    ? { category: "high", level: "high" as const }
    : points <= 2
      ? { category: "low", level: "low" as const }
      : { category: "intermediate", level: "moderate" as const };

  return complete(
    "stop-bang",
    STOP_BANG_SOURCES,
    collector,
    { points, maxPoints: 8, ...band },
    context.policy,
  );
}

// ---------------------------------------------------------------------------
// AUDIT-C (hazardous alcohol use)
// ---------------------------------------------------------------------------

const AUDIT_C_SOURCES: ReadonlyArray<PathologySourceId> = ["auditCBush1998", "auditCBradley2007"];
const AUDIT_FREQUENCY_POINTS: Readonly<Record<string, number>> = {
  never: 0,
  monthly_or_less: 1,
  two_to_four_monthly: 2,
  two_to_three_weekly: 3,
  four_plus_weekly: 4,
};
const AUDIT_HEAVY_EPISODE_POINTS: Readonly<Record<string, number>> = {
  never: 0,
  less_monthly: 1,
  monthly: 2,
  weekly: 3,
  daily: 4,
};

function auditTypicalAmountPoints(drinks: number): number {
  return drinks <= 2 ? 0 : drinks <= 4 ? 1 : drinks <= 6 ? 2 : drinks <= 9 ? 3 : 4;
}

function evaluateAuditC(context: EvaluationContext): PathologyScoreResult {
  const collector = new InputCollector(context);
  const frequency = collector.single("alcohol_frequency");
  if (frequency === undefined) {
    return incomplete("audit-c", AUDIT_C_SOURCES, collector, [
      "alcohol_detail_typical_amount",
      "alcohol_detail_heavy_episode",
    ]);
  }

  let points = AUDIT_FREQUENCY_POINTS[frequency] ?? 0;
  if (frequency !== "never") {
    const typical = collector.number("alcohol_detail_typical_amount", PLAUSIBLE.drinks);
    const heavy = collector.single("alcohol_detail_heavy_episode");
    if (typical === undefined || heavy === undefined) {
      return incomplete("audit-c", AUDIT_C_SOURCES, collector);
    }
    points += auditTypicalAmountPoints(typical) + (AUDIT_HEAVY_EPISODE_POINTS[heavy] ?? 0);
  }
  if (context.sex !== undefined) collector.inputs.push({ id: "sex_assigned_at_birth", value: context.sex });
  const threshold = context.sex === "female" ? 3 : 4;
  const positive = points >= threshold;

  return complete(
    "audit-c",
    AUDIT_C_SOURCES,
    collector,
    {
      points,
      maxPoints: 12,
      category: positive ? "positive" : "negative",
      level: positive ? "moderate" : "low",
    },
    context.policy,
  );
}

// ---------------------------------------------------------------------------
// PHQ-2 and GAD-2 (two-item depression and anxiety screens)
// ---------------------------------------------------------------------------

const TWO_WEEK_FREQUENCY_POINTS: Readonly<Record<string, number>> = {
  not_at_all: 0,
  several_days: 1,
  more_than_half: 2,
  nearly_every_day: 3,
};

function evaluateTwoItemScreen(
  context: EvaluationContext,
  instrument: "phq-2" | "gad-2",
  questionIds: readonly [string, string],
  sources: ReadonlyArray<PathologySourceId>,
): PathologyScoreResult {
  const collector = new InputCollector(context);
  const first = collector.single(questionIds[0]);
  const second = collector.single(questionIds[1]);
  if (first === undefined || second === undefined) return incomplete(instrument, sources, collector);

  const points = (TWO_WEEK_FREQUENCY_POINTS[first] ?? 0) + (TWO_WEEK_FREQUENCY_POINTS[second] ?? 0);
  const positive = points >= 3;
  return complete(
    instrument,
    sources,
    collector,
    {
      points,
      maxPoints: 6,
      category: positive ? "positive" : "negative",
      level: positive ? "moderate" : "low",
    },
    context.policy,
  );
}

// ---------------------------------------------------------------------------
// COPD-PS (COPD population screener)
// ---------------------------------------------------------------------------

const COPD_PS_SOURCES: ReadonlyArray<PathologySourceId> = ["copdPsMartinez2008"];
const COPD_BREATHLESS_POINTS: Readonly<Record<string, number>> = {
  none: 0,
  little: 0,
  some: 1,
  most: 2,
  all: 2,
};
const COPD_PHLEGM_POINTS: Readonly<Record<string, number>> = {
  never: 0,
  occasional_colds: 0,
  few_days_month: 1,
  most_days_week: 1,
  every_day: 2,
};
const COPD_ACTIVITY_LIMIT_POINTS: Readonly<Record<string, number>> = {
  strongly_disagree: 0,
  disagree: 0,
  unsure: 0,
  agree: 1,
  strongly_agree: 2,
};

/** COPD-PS item 4: at least 100 cigarettes in a lifetime, reconstructed from current and former smoking. */
function deriveEverSmoked(context: EvaluationContext): Derived<boolean> {
  const former = readBoolean(context.answers, "smoking_history_former");
  const current = context.currentSmoker.value;
  const inputs: PathologyScoreInput[] = [];
  if (former !== undefined) inputs.push({ id: "smoking_history_former", value: former });
  if (current !== undefined) inputs.push(...context.currentSmoker.inputs);

  if (former === true || current === true) {
    return { value: true, inputs: [...inputs, { id: "derived:ever_smoked", value: true, derived: true }], missing: [] };
  }
  if (former === false && current === false) {
    return { value: false, inputs: [...inputs, { id: "derived:ever_smoked", value: false, derived: true }], missing: [] };
  }
  return {
    value: undefined,
    inputs,
    missing: [
      ...(former === undefined ? ["smoking_history_former"] : []),
      ...(current === undefined ? ["current_tobacco_nicotine"] : []),
    ],
  };
}

function evaluateCopdPs(context: EvaluationContext): PathologyScoreResult {
  const age = context.profile.age;
  if (age < 35) {
    return notApplicable("copd-ps", COPD_PS_SOURCES, "age-out-of-range", [{ id: "profile:age", value: age }]);
  }
  const collector = new InputCollector(context);
  const breathless = collector.single("copd_breathless_frequency");
  const phlegm = collector.single("copd_phlegm");
  const limit = collector.single("copd_activity_limit");
  const everSmoked = collector.derived(deriveEverSmoked(context));
  collector.age();

  if (breathless === undefined || phlegm === undefined || limit === undefined || everSmoked === undefined) {
    return incomplete("copd-ps", COPD_PS_SOURCES, collector);
  }

  const points =
    (COPD_BREATHLESS_POINTS[breathless] ?? 0) +
    (COPD_PHLEGM_POINTS[phlegm] ?? 0) +
    (COPD_ACTIVITY_LIMIT_POINTS[limit] ?? 0) +
    (everSmoked ? 2 : 0) +
    (age < 50 ? 0 : age < 60 ? 1 : 2);
  const positive = points >= 5;
  return complete(
    "copd-ps",
    COPD_PS_SOURCES,
    collector,
    {
      points,
      maxPoints: 10,
      category: positive ? "screen-positive" : "below-threshold",
      level: positive ? "moderate" : "low",
    },
    context.policy,
  );
}

// ---------------------------------------------------------------------------
// CAIDE (20-year dementia risk in midlife)
// ---------------------------------------------------------------------------

const CAIDE_SOURCES: ReadonlyArray<PathologySourceId> = ["caideKivipelto2006"];
const CAIDE_BANDS: ReadonlyArray<PointBand> = [
  { max: 5, category: "low", level: "low", riskPercent: 1 },
  { max: 7, category: "slightly-elevated", level: "moderate", riskPercent: 1.9 },
  { max: 9, category: "moderate", level: "moderate", riskPercent: 4.2 },
  { max: 11, category: "high", level: "high", riskPercent: 7.4 },
  { max: 15, category: "very-high", level: "very-high", riskPercent: 16.4 },
];
const CAIDE_EDUCATION_POINTS: Readonly<Record<string, number>> = {
  ten_plus: 0,
  seven_to_nine: 2,
  six_or_less: 3,
};

function evaluateCaide(context: EvaluationContext): PathologyScoreResult {
  const age = context.profile.age;
  if (age < 40 || age > 64) {
    return notApplicable("caide", CAIDE_SOURCES, "age-out-of-range", [{ id: "profile:age", value: age }]);
  }
  const collector = new InputCollector(context);
  collector.age();
  const sex = collector.sex();
  const education = collector.single("education_years");
  const systolic = collector.number("blood_pressure_systolic", PLAUSIBLE.systolic);
  const bmi = collector.derived(context.bodyMassIndex);
  const totalCholesterol = collector.lab("total_cholesterol", "mmol/L", PLAUSIBLE.totalCholesterolMmol);
  const weekly = readNumber(context.answers, "weekly_moderate_activity_minutes", PLAUSIBLE.weeklyMinutes);
  if (weekly === undefined) collector.missing.push("weekly_moderate_activity_minutes");
  else collector.inputs.push({ id: "derived:physically_inactive", value: weekly < 60, derived: true });

  if (
    collector.missing.length > 0 ||
    sex === undefined ||
    education === undefined ||
    systolic === undefined ||
    bmi === undefined ||
    totalCholesterol === undefined ||
    weekly === undefined
  ) {
    return incomplete("caide", CAIDE_SOURCES, collector);
  }

  const points =
    (age < 47 ? 0 : age <= 53 ? 3 : 4) +
    (CAIDE_EDUCATION_POINTS[education] ?? 0) +
    (sex === "male" ? 1 : 0) +
    (systolic > 140 ? 2 : 0) +
    (bmi > 30 ? 2 : 0) +
    (totalCholesterol > 6.5 ? 2 : 0) +
    (weekly < 60 ? 1 : 0);
  const band = bandFor(CAIDE_BANDS, points);
  return complete(
    "caide",
    CAIDE_SOURCES,
    collector,
    {
      points,
      maxPoints: 15,
      category: band.category,
      level: band.level,
      riskPercent: band.riskPercent,
      riskHorizonYears: 20,
    },
    context.policy,
  );
}

// ---------------------------------------------------------------------------
// Laboratory classifications (published categories, not risks)
// ---------------------------------------------------------------------------

const ADA_SOURCES: ReadonlyArray<PathologySourceId> = ["adaDiagnosisStandards2025"];
const KDIGO_SOURCES: ReadonlyArray<PathologySourceId> = ["kdigoCkd2024"];

function classifyLabs(labs: ReadonlyArray<ConfirmedLabValue>): LabClassification[] {
  const classifications: LabClassification[] = [];

  const hba1c = latestLab(labs, "hba1c");
  const hba1cPercent = hba1c ? labValueIn(hba1c, "%") : undefined;
  if (hba1cPercent !== undefined) {
    classifications.push({
      marker: "hba1c",
      value: hba1cPercent,
      unit: "%",
      category: hba1cPercent < 5.7 ? "normal" : hba1cPercent < 6.5 ? "prediabetes-range" : "diabetes-range",
      sourceIds: ADA_SOURCES,
    });
  }

  const glucose = latestLab(labs, "glucose");
  const glucoseMmol = glucose ? labValueIn(glucose, "mmol/L") : undefined;
  if (glucose && glucoseMmol !== undefined) {
    classifications.push({
      marker: "glucose",
      value: glucoseMmol,
      unit: "mmol/L",
      category:
        glucose.reviewed.fastingStatus === "not_fasting"
          ? "not-fasting"
          : glucose.reviewed.fastingStatus === "not_stated"
            ? "fasting-unknown"
            : glucoseMmol < 5.6
              ? "normal"
              : glucoseMmol < 7
                ? "prediabetes-range"
                : "diabetes-range",
      sourceIds: ADA_SOURCES,
    });
  }

  const egfr = latestLab(labs, "egfr");
  const egfrValue = egfr ? labValueIn(egfr, "mL/min/1.73m²") : undefined;
  if (egfrValue !== undefined) {
    classifications.push({
      marker: "egfr",
      value: egfrValue,
      unit: "mL/min/1.73m²",
      category:
        egfrValue >= 90 ? "g1" : egfrValue >= 60 ? "g2" : egfrValue >= 45 ? "g3a" : egfrValue >= 30 ? "g3b" : egfrValue >= 15 ? "g4" : "g5",
      sourceIds: KDIGO_SOURCES,
    });
  }

  return classifications;
}

// ---------------------------------------------------------------------------
// Lancet Commission modifiable dementia factors (context, no percentage)
// ---------------------------------------------------------------------------

const DEMENTIA_SOURCES: ReadonlyArray<PathologySourceId> = ["lancetDementia2024"];

function dementiaFactor(
  id: DementiaFactorId,
  value: boolean | undefined,
  inputs: ReadonlyArray<string>,
): DementiaFactor {
  return { id, status: value === undefined ? "unanswered" : value ? "present" : "absent", inputs };
}

function positiveScreen(scores: ReadonlyArray<PathologyScoreResult>, instrument: PathologyInstrumentId): boolean | undefined {
  const score = scores.find((candidate) => candidate.instrument === instrument);
  return score?.status === "complete" ? score.category === "positive" : undefined;
}

/**
 * The Lancet factor is heavy drinking (> 21 UK units a week), not the hazardous-use
 * screen threshold, so the factor needs an AUDIT-C total of 8 or more.
 */
function heavyDrinking(scores: ReadonlyArray<PathologyScoreResult>): boolean | undefined {
  const score = scores.find((candidate) => candidate.instrument === "audit-c");
  return score?.status === "complete" && score.points !== undefined ? score.points >= 8 : undefined;
}

function anyKnown(...values: ReadonlyArray<boolean | undefined>): boolean | undefined {
  if (values.some((value) => value === true)) return true;
  return values.some((value) => value !== undefined) ? false : undefined;
}

function dementiaFactors(
  context: EvaluationContext,
  scores: ReadonlyArray<PathologyScoreResult>,
): DementiaFactor[] {
  const { answers } = context;
  const education = readSingle(answers, "education_years");
  const weekly = readNumber(answers, "weekly_moderate_activity_minutes", PLAUSIBLE.weeklyMinutes);
  const loneliness = readSingle(answers, "social_loneliness");
  const contact = readSingle(answers, "social_contact_frequency");
  const diagnosedHighCholesterol = readBoolean(answers, "diagnosed_high_cholesterol");
  const ldlLab = latestLab(context.labs, "ldl_cholesterol");
  const ldlRaw = ldlLab ? labValueIn(ldlLab, "mmol/L") : undefined;
  const ldl =
    ldlRaw !== undefined && ldlRaw >= PLAUSIBLE.ldlMmol.min && ldlRaw <= PLAUSIBLE.ldlMmol.max ? ldlRaw : undefined;
  const bmi = context.bodyMassIndex.value;

  return [
    dementiaFactor("less-education", education === undefined ? undefined : education !== "ten_plus", ["education_years"]),
    dementiaFactor("hearing-loss", readBoolean(answers, "hearing_difficulty"), ["hearing_difficulty"]),
    dementiaFactor(
      "high-ldl",
      anyKnown(diagnosedHighCholesterol, ldl === undefined ? undefined : ldl > 3),
      ["diagnosed_high_cholesterol", labInputId("ldl_cholesterol")],
    ),
    dementiaFactor(
      "depression",
      anyKnown(positiveScreen(scores, "phq-2"), readBoolean(answers, "depression_history")),
      ["low_interest_frequency", "mood_low_frequency", "depression_history"],
    ),
    dementiaFactor("head-injury", readBoolean(answers, "head_injury_history"), ["head_injury_history"]),
    dementiaFactor("physical-inactivity", weekly === undefined ? undefined : weekly < 150, ["weekly_moderate_activity_minutes"]),
    dementiaFactor(
      "diabetes",
      context.diagnosedConditions === undefined ? undefined : context.diagnosedConditions.includes("diabetes"),
      ["diagnosed_conditions_core"],
    ),
    dementiaFactor("smoking", context.currentSmoker.value, ["current_tobacco_nicotine"]),
    dementiaFactor("hypertension", context.hypertension.value, ["diagnosed_high_blood_pressure", "bp_medication_ever", "blood_pressure_systolic"]),
    dementiaFactor("obesity", bmi === undefined ? undefined : bmi >= 30, ["height_cm", "weight_kg"]),
    dementiaFactor("excessive-alcohol", heavyDrinking(scores), ["alcohol_frequency", "alcohol_detail_typical_amount", "alcohol_detail_heavy_episode"]),
    dementiaFactor(
      "social-isolation",
      anyKnown(
        loneliness === undefined ? undefined : loneliness === "often" || loneliness === "daily",
        contact === undefined ? undefined : contact === "never" || contact === "rarely",
      ),
      ["social_loneliness", "social_contact_frequency"],
    ),
    dementiaFactor("air-pollution", readBoolean(answers, "environment_air_pollution"), ["environment_air_pollution"]),
    dementiaFactor("vision-loss", readBoolean(answers, "vision_difficulty"), ["vision_difficulty"]),
  ];
}

function dementiaFamilyHistory(answers: AnswerMap): DementiaFamilyHistory {
  const reported = readBoolean(answers, "dementia_family_history");
  return reported === undefined ? "unanswered" : reported ? "reported" : "not-reported";
}

// ---------------------------------------------------------------------------
// Ranges over missing answers and habit gains at an equal profile
// ---------------------------------------------------------------------------

type Evaluator = (context: EvaluationContext) => PathologyScoreResult;
type CompleteScore = Extract<PathologyScoreResult, { status: "complete" }>;
type IncompleteScore = Extract<PathologyScoreResult, { status: "incomplete" }>;
/** Re-runs one instrument with some answers replaced; everything else stays as answered. */
type Reevaluate = (replacements: AnswerMap) => PathologyScoreResult;

const RANGE_MAX_MISSING = 2;

/** Numeric answers probed on each side of every scoring threshold that reads them. */
const RANGE_PROBES: Readonly<Record<string, ReadonlyArray<number>>> = {
  waist_circumference_cm: [70, 85, 98, 110],
  neck_circumference_cm: [35, 45],
  plant_food_frequency: [0, 2],
  weekly_moderate_activity_minutes: [0, 60, 150],
  alcohol_detail_typical_amount: [1, 3, 5, 7, 10],
};

const LEVEL_RANK: Readonly<Record<PathologyRiskLevel, number>> = {
  low: 0,
  moderate: 1,
  high: 2,
  "very-high": 3,
};

/**
 * Values a missing answer could take. Sex, body size, blood pressure, labs and
 * multiple-choice answers are never enumerated: they stay genuinely unknown.
 */
function possibleAnswers(id: string): ReadonlyArray<AnswerValue> | undefined {
  if (id === "sex_assigned_at_birth") return undefined;
  const probes = RANGE_PROBES[id];
  if (probes) return probes;
  const question = questionsById.get(id);
  if (question?.answerType === "boolean") return [true, false];
  if (question?.answerType !== "single") return undefined;
  const unscored: string | undefined = UNSCORED_OPTIONS[id as keyof typeof UNSCORED_OPTIONS];
  return question.options?.map((option) => option.value).filter((value) => value !== unscored);
}

function combinations(
  ids: ReadonlyArray<string>,
  values: ReadonlyArray<ReadonlyArray<AnswerValue>>,
): AnswerMap[] {
  return ids.reduce<AnswerMap[]>(
    (partials, id, index) =>
      partials.flatMap((partial) => values[index].map((value) => ({ ...partial, [id]: value }))),
    [{}],
  );
}

function bound(
  category: string,
  level: PathologyRiskLevel,
  points: number | undefined,
  riskPercent: number | undefined,
): PathologyRangeBound {
  return {
    category,
    level,
    ...(points !== undefined ? { points } : {}),
    ...(riskPercent !== undefined ? { riskPercent } : {}),
  };
}

function rangeFor(score: IncompleteScore, reevaluate: Reevaluate): PathologyScoreRange | undefined {
  const ids = score.missingInputs;
  if (ids.length === 0 || ids.length > RANGE_MAX_MISSING) return undefined;
  const values: Array<ReadonlyArray<AnswerValue>> = [];
  for (const id of ids) {
    const candidates = possibleAnswers(id);
    if (!candidates || candidates.length === 0) return undefined;
    values.push(candidates);
  }

  const outcomes: CompleteScore[] = [];
  for (const replacements of combinations(ids, values)) {
    const outcome = reevaluate(replacements);
    // An answer that excludes the instrument or opens further questions leaves no honest range.
    if (outcome.status !== "complete") return undefined;
    outcomes.push(outcome);
  }

  const byLevel = [...outcomes].sort(
    (left, right) =>
      LEVEL_RANK[left.level] - LEVEL_RANK[right.level] ||
      (left.points ?? left.riskPercent ?? 0) - (right.points ?? right.riskPercent ?? 0),
  );
  const lowest = byLevel[0];
  const highest = byLevel[byLevel.length - 1];
  const points = outcomes.flatMap((outcome) => (outcome.points === undefined ? [] : [outcome.points]));
  const percents = outcomes.flatMap((outcome) => (outcome.riskPercent === undefined ? [] : [outcome.riskPercent]));
  return {
    low: bound(
      lowest.category,
      lowest.level,
      points.length > 0 ? Math.min(...points) : undefined,
      percents.length > 0 ? Math.min(...percents) : undefined,
    ),
    high: bound(
      highest.category,
      highest.level,
      points.length > 0 ? Math.max(...points) : undefined,
      percents.length > 0 ? Math.max(...percents) : undefined,
    ),
    ...(lowest.maxPoints !== undefined ? { maxPoints: lowest.maxPoints } : {}),
    ...(percents.length > 0 && lowest.riskHorizonYears !== undefined
      ? { riskHorizonYears: lowest.riskHorizonYears }
      : {}),
  };
}

type HabitRule = {
  readonly id: PathologyHabitId;
  readonly applies: (score: CompleteScore) => boolean;
  readonly replacements: AnswerMap;
};

function usedValue(score: CompleteScore, inputId: string): PathologyScoreInput["value"] | undefined {
  return score.inputs.find((input) => input.id === inputId)?.value;
}

/** Declared habits each instrument scores; weight and waist are deliberately left out. */
const HABIT_RULES: Partial<Record<PathologyInstrumentId, ReadonlyArray<HabitRule>>> = {
  findrisc: [
    {
      id: "daily-activity",
      applies: (score) => usedValue(score, "daily_activity_30_min") === false,
      replacements: { daily_activity_30_min: true },
    },
    {
      id: "daily-fruit-vegetables",
      applies: (score) => usedValue(score, "derived:daily_fruit_vegetables") === false,
      replacements: { plant_food_frequency: 1 },
    },
  ],
  caide: [
    {
      id: "weekly-activity",
      applies: (score) => usedValue(score, "derived:physically_inactive") === true,
      replacements: { weekly_moderate_activity_minutes: 150 },
    },
  ],
  score2: [
    {
      id: "no-smoking",
      applies: (score) => usedValue(score, "derived:current_smoker") === true,
      replacements: { current_tobacco_nicotine: false },
    },
  ],
};

function gainFor(score: CompleteScore, reevaluate: Reevaluate): PathologyHabitGain | undefined {
  const rules = (HABIT_RULES[score.instrument] ?? []).filter((rule) => rule.applies(score));
  if (rules.length === 0) return undefined;
  const healthier = reevaluate(Object.assign({}, ...rules.map((rule) => rule.replacements)));
  if (healthier.status !== "complete") return undefined;
  const better =
    healthier.riskPercent !== undefined && score.riskPercent !== undefined
      ? healthier.riskPercent < score.riskPercent
      : healthier.category !== score.category;
  if (!better) return undefined;
  return {
    habits: rules.map((rule) => rule.id),
    ...bound(healthier.category, healthier.level, healthier.points, healthier.riskPercent),
  };
}

function withEstimates(score: PathologyScoreResult, reevaluate: Reevaluate): PathologyScoreResult {
  if (score.status === "incomplete") {
    const range = rangeFor(score, reevaluate);
    return range ? { ...score, range } : score;
  }
  if (score.status === "complete") {
    const gain = gainFor(score, reevaluate);
    return gain ? { ...score, gain } : score;
  }
  return score;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const EVALUATORS: ReadonlyArray<Evaluator> = [
  evaluateScore2,
  evaluateFindrisc,
  evaluateStopBang,
  evaluateCopdPs,
  evaluateCaide,
  evaluateAuditC,
  (context) =>
    evaluateTwoItemScreen(context, "phq-2", ["low_interest_frequency", "mood_low_frequency"], ["phq2Kroenke2003"]),
  (context) =>
    evaluateTwoItemScreen(context, "gad-2", ["anxiety_worry_frequency", "anxiety_control_worry"], ["gad2Kroenke2007"]),
];

export function evaluatePathologyRisk(
  answers: AnswerMap,
  profile: ProfileContext,
  confirmedLabs: ReadonlyArray<ConfirmedLabValue>,
  policy: ReleasePolicy,
): PathologySynthesis {
  if (!Number.isFinite(profile.age) || profile.age < 18) {
    return {
      rulesetVersion: PATHOLOGY_RULESET_VERSION,
      scores: [],
      labClassifications: [],
      dementiaFactors: [],
      dementiaFamilyHistory: "unanswered",
      dementiaSourceIds: [],
    };
  }
  const context = buildContext(answers, profile, confirmedLabs, policy);
  const scores: PathologyScoreResult[] = EVALUATORS.map((evaluate) =>
    withEstimates(evaluate(context), (replacements) =>
      evaluate(buildContext({ ...answers, ...replacements }, profile, confirmedLabs, policy)),
    ),
  );
  return {
    rulesetVersion: PATHOLOGY_RULESET_VERSION,
    scores,
    labClassifications: classifyLabs(confirmedLabs),
    dementiaFactors: dementiaFactors(context, scores),
    dementiaFamilyHistory: dementiaFamilyHistory(answers),
    dementiaSourceIds: DEMENTIA_SOURCES,
  };
}

export function resolvePathologySources(ids: ReadonlyArray<string>): EvidenceSource[] {
  return ids.flatMap((id) => {
    const source = evidenceSources[id as PathologySourceId];
    return source ? [source] : [];
  });
}

const DEPTH_ORDER: ReadonlyArray<AnalysisDepth> = ["quick", "detailed", "deep"];

/** Shallowest assessment depth that asks a question, or undefined for labs and profile inputs. */
export function shallowestDepthFor(inputId: string): AnalysisDepth | undefined {
  const question = questionsById.get(inputId);
  if (!question) return undefined;
  return DEPTH_ORDER.find((depth) => question.tiers.includes(depth));
}
