import type { WhoCvdRegion } from "../data/countries";
import type { PathologyOrientationId } from "../lib/pathology-orientation";
import type {
  AnalysisDepth,
  ClassifiedLabMarker,
  DementiaFactorId,
  PathologyHabitId,
  PathologyInstrumentId,
  PathologyNotApplicableReason,
  PathologyRiskLevel,
} from "../lib/types";

/** Instruments whose publication includes an absolute risk. */
export type PercentInstrumentId = Extract<
  PathologyInstrumentId,
  "findrisc" | "score2" | "prevent" | "who-cvd" | "caide" | "lee-index" | "plcom2012"
>;

type InstrumentCopy = {
  readonly pathology: string;
  readonly instrument: string;
  readonly boundary: string;
  readonly categories: Readonly<Record<string, string>>;
};

const en = {
  navLink: "Conditions",
  eyebrow: "Published screening scores",
  title: "Most probable conditions to discuss",
  intro:
    "Each estimate below comes from a published, validated instrument applied to your structured answers and, when you imported one, your confirmed blood test. A score describes the probability of a condition in people who answer the way you did; it is not a diagnosis.",
  boundary:
    "Screening estimates, not a diagnosis. Only a clinician can confirm or rule out a condition, and a low score never excludes one.",
  rulesetVersion: (version: string) => `Score set ${version}`,
  statusComplete: "Estimate available",
  statusIncomplete: "Estimate not yet possible",
  statusNotApplicable: "Not applicable to you",
  pointsReadout: (points: number, max: number) => `${points} / ${max} points`,
  percentReadout: (percent: string, horizon: number) =>
    `about ${percent} estimated risk over ${horizon} years`,
  percentReadoutUnder: (percent: string, horizon: number) =>
    `under ${percent} estimated risk over ${horizon} years`,
  percentWithheld:
    "The published percentage is withheld in this release; the category still follows the instrument’s published thresholds.",
  inputsHeading: "Answers used",
  derivedTag: "derived",
  missingHeading: "Still needed",
  missingFrom: (depth: string) => `asked from ${depth} depth onward`,
  missingSkipped: "left unanswered or marked not sure",
  missingAfter: (gate: string) => `asked after “${gate}”`,
  missingUnavailable: "not available from your answers",
  missingFromLab: "from an imported blood test",
  missingFromProfile: "from your profile",
  modifiersHeading: "Read with these modifiers",
  modifiers: {
    family_early_cvd: "Early cardiovascular disease in a parent or sibling can place true risk above the estimate.",
    inflammatory_condition: "A chronic inflammatory condition can place true risk above the estimate.",
    statin_current: "Cholesterol-lowering treatment was in place; the score was built from untreated values, so read the estimate cautiously.",
    declared_heart_vascular: "A clinician-diagnosed heart or blood-vessel condition was reported. ESC guidance places established atherosclerotic disease at high or very high risk regardless of this estimate, which assumes no such disease.",
    declared_kidney: "A kidney condition was reported. ESC guidance places moderate or severe chronic kidney disease at high or very high risk regardless of this estimate, which assumes normal kidney function.",
    "diabetes-esc-classification": "Diabetes was reported. ESC guidance also classifies risk by its duration, organ damage and established atherosclerosis; the estimate alone does not settle that assessment.",
    "egfr-below-45": "An eGFR below 45 places clinical cardiovascular risk at high or very high regardless of the calculated SCORE2-Diabetes estimate. Discuss this with your diabetes care team.",
    "findrisc-age-extrapolated": "FINDRISC was validated in 35–64-year-olds; outside that age range the same points apply, but the estimate is an extrapolation.",
    "lee-lung-disease-proxy": "The index asked about chronic lung disease such as chronic bronchitis or emphysema; your “long-term lung condition” answer was counted as that item, which can overstate the points if the condition is asthma.",
    "plco-race-reference": "The model includes a race or ethnicity term that this questionnaire does not collect; it was left at the reference group, so the estimate can be lower or higher for other groups.",
    "plco-age-extrapolated": "PLCOm2012 was developed in 55–74-year-olds; screening programmes apply it from 50 to 80, but outside 55–74 the estimate is an extrapolation.",
    "plco-copd-proxy": "The model asks about COPD (chronic bronchitis or emphysema); your “long-term lung condition” answer was counted as COPD, which can overstate the risk if the condition is asthma.",
  } as Readonly<Record<string, string>>,
  sourcesHeading: "Sources",
  levels: {
    low: "Low",
    moderate: "Moderate",
    high: "High",
    "very-high": "Very high",
  } satisfies Readonly<Record<PathologyRiskLevel, string>>,
  score2Variant: {
    score2: "SCORE2 (ESC 2021)",
    "score2-op": "SCORE2-OP (ESC 2021)",
    "score2-diabetes": "SCORE2-Diabetes (ESC 2023)",
  },
  score2DiabetesBoundary: "Ten-year probability of a first fatal or non-fatal cardiovascular event in type 2 diabetes, calibrated for the named ESC region.",
  escRegion: {
    low: "ESC low-risk region",
    moderate: "ESC moderate-risk region",
    high: "ESC high-risk region",
    "very-high": "ESC very-high-risk region",
  },
  whoRegion: {
    "andean-latin-america": "Andean Latin America",
    australasia: "Australasia",
    caribbean: "Caribbean",
    "central-asia": "Central Asia",
    "central-europe": "Central Europe",
    "central-latin-america": "Central Latin America",
    "central-sub-saharan-africa": "Central Sub-Saharan Africa",
    "east-asia": "East Asia",
    "eastern-europe": "Eastern Europe",
    "eastern-sub-saharan-africa": "Eastern Sub-Saharan Africa",
    "high-income-asia-pacific": "High-income Asia Pacific",
    "high-income-north-america": "High-income North America",
    "north-africa-and-middle-east": "North Africa and Middle East",
    oceania: "Oceania",
    "south-asia": "South Asia",
    "southeast-asia": "Southeast Asia",
    "southern-latin-america": "Southern Latin America",
    "southern-sub-saharan-africa": "Southern Sub-Saharan Africa",
    "tropical-latin-america": "Tropical Latin America",
    "western-europe": "Western Europe",
    "western-sub-saharan-africa": "Western Sub-Saharan Africa",
  } satisfies Readonly<Record<WhoCvdRegion, string>>,
  whoRegionLabel: (region: string) => `WHO region: ${region}`,
  whoVariant: { laboratory: "WHO 2019 charts, laboratory", "non-laboratory": "WHO 2019 charts, non-laboratory" },
  notApplicable: {
    "age-out-of-range": "This instrument was validated for a different age range.",
    "diagnosed-condition": "You reported that a clinician has already diagnosed this condition, so a screening score does not apply.",
    "diabetes-type-not-covered": "SCORE2-Diabetes was validated for type 2 diabetes, not the diabetes type you reported.",
    "established-cvd": "You reported an established cardiovascular event; first-event risk scores do not apply after that.",
    "sex-not-supported": "The instrument publishes tables only for female and male sex at birth.",
    "region-not-calibrated": "Choose your country at the start to obtain an estimate calibrated for its published risk region.",
    "outside-validated-range": "A measurement lies outside the range used to validate this model; ask a clinician to interpret it instead.",
    "never-smoked": "This model was developed in people who have smoked; it does not apply to someone who has never smoked.",
  } satisfies Readonly<Record<PathologyNotApplicableReason, string>>,
  outlook: {
    title: "Estimated probabilities of major outcomes",
    intro:
      "Each line is a published, validated model applied to your answers, with its time horizon and the population it was validated in. The list covers only the outcomes for which such a model exists and fits your data; it is not a list of every cause of death, and none of these numbers is a prediction about you as an individual.",
    pending: (questions: number) =>
      `estimate pending · ${questions} question${questions > 1 ? "s" : ""} at most`,
    pendingLabs: "estimate pending · blood test needed",
    pendingQuestionsAndLabs: (questions: number) =>
      `estimate pending · ${questions} question${questions > 1 ? "s" : ""} at most and a blood test`,
    notApplicable: "not applicable to you",
    validatedIn: (population: string) => `Validated in: ${population}`,
    populations: {
      "lee-index": "US community-dwelling adults aged 50 and over (Health and Retirement Study, 1998–2002)",
      plcom2012: "US ever-smokers aged 55–74 (PLCO trial), externally validated in Europe, Canada and Australia",
      findrisc: "Finnish adults aged 35–64",
      score2: "European cohorts aged 40–89, calibrated to the ESC risk region of your country",
      prevent: "US adults aged 30–79",
      "who-cvd": "WHO 2019 charts for the region of your country",
      caide: "Finnish adults aged 40–64 followed for twenty years",
    } satisfies Readonly<Record<PercentInstrumentId, string>>,
  },
  instruments: {
    findrisc: {
      pathology: "Type 2 diabetes",
      instrument: "FINDRISC (Finnish Diabetes Risk Score)",
      boundary: "Ten-year probability of drug-treated type 2 diabetes in the validation cohort.",
      categories: {
        low: "Low risk",
        "slightly-elevated": "Slightly elevated risk",
        moderate: "Moderate risk",
        high: "High risk",
        "very-high": "Very high risk",
      },
    },
    score2: {
      pathology: "Cardiovascular disease (heart attack, stroke)",
      instrument: "SCORE2 / SCORE2-OP (ESC 2021)",
      boundary: "Ten-year probability of a first fatal or non-fatal cardiovascular event, calibrated for the named ESC region.",
      categories: {
        low: "Low risk",
        moderate: "Moderate risk",
        "low-to-moderate": "Low to moderate risk",
        high: "High risk",
        "very-high": "Very high risk",
      },
    },
    prevent: {
      pathology: "Cardiovascular disease (heart attack, stroke)",
      instrument: "PREVENT-ASCVD (AHA 2023)",
      boundary: "Ten-year risk of a first heart attack or stroke, fatal or not, from the US PREVENT base equation.",
      categories: {
        low: "Low risk",
        borderline: "Borderline risk",
        intermediate: "Intermediate risk",
        high: "High risk",
      },
    },
    "who-cvd": {
      pathology: "Cardiovascular disease (heart attack, stroke)",
      instrument: "WHO 2019 cardiovascular risk charts",
      boundary: "Printed 10-year risk band for a first fatal or non-fatal heart attack or stroke. WHO does not name these bands.",
      categories: {
        "under-5": "Under 5%",
        "5-to-9": "5% to under 10%",
        "10-to-19": "10% to under 20%",
        "20-to-29": "20% to under 30%",
        "30-plus": "30% or more",
      },
    },
    "stop-bang": {
      pathology: "Obstructive sleep apnoea",
      instrument: "STOP-Bang",
      boundary: "Screening probability of moderate to severe sleep apnoea; confirmation needs a sleep study.",
      categories: {
        low: "Low probability",
        intermediate: "Intermediate probability",
        high: "High probability",
      },
    },
    "audit-c": {
      pathology: "Hazardous alcohol use",
      instrument: "AUDIT-C",
      boundary: "Screen for hazardous drinking; a positive screen is a reason to talk, not a diagnosis of dependence.",
      categories: {
        positive: "Positive screen",
        negative: "Below threshold",
      },
    },
    "phq-2": {
      pathology: "Depression",
      instrument: "PHQ-2",
      boundary: "Two-item screen; a positive screen calls for a fuller assessment with a clinician.",
      categories: {
        positive: "Positive screen",
        negative: "Below threshold",
      },
    },
    "gad-2": {
      pathology: "Anxiety disorder",
      instrument: "GAD-2",
      boundary: "Two-item screen; a positive screen calls for a fuller assessment with a clinician.",
      categories: {
        positive: "Positive screen",
        negative: "Below threshold",
      },
    },
    "copd-ps": {
      pathology: "Chronic obstructive pulmonary disease",
      instrument: "COPD Population Screener",
      boundary: "Screen that identifies who should be offered spirometry; it does not measure lung function.",
      categories: {
        "screen-positive": "Spirometry worth requesting",
        "below-threshold": "Below screening threshold",
      },
    },
    caide: {
      pathology: "Dementia in later life",
      instrument: "CAIDE midlife dementia risk score",
      boundary: "Twenty-year probability estimated from midlife factors in the validation cohort; ages 40 to 64.",
      categories: {
        low: "Low risk",
        "slightly-elevated": "Slightly elevated risk",
        moderate: "Moderate risk",
        high: "High risk",
        "very-high": "Very high risk",
      },
    },
    "lee-index": {
      pathology: "Death from any cause within four years",
      instrument: "Lee index (JAMA 2006)",
      boundary: "Four-year all-cause mortality observed by point score in the validation cohort of community-dwelling US adults aged 50 and over; a population frequency, not an individual prediction.",
      categories: {
        low: "0–5 points: under 4% in four years",
        moderate: "6–9 points: about 15% in four years",
        high: "10–13 points: about 42% in four years",
        "very-high": "14 points or more: about 64% in four years",
      },
    },
    plcom2012: {
      pathology: "Lung cancer within six years",
      instrument: "PLCOm2012 (NEJM 2013)",
      boundary: "Six-year probability of a lung-cancer diagnosis in people who have smoked, from the PLCO trial model used to select people for low-dose CT screening.",
      categories: {
        "below-screening-threshold": "Below the 1.5% screening threshold",
        "screening-threshold-met": "At or above the 1.5% screening threshold",
      },
    },
  } satisfies Readonly<Record<PathologyInstrumentId, InstrumentCopy>>,
  labsTitle: "Confirmed blood-test classification",
  labsIntro: "Classified against published thresholds from your confirmed values; a single result never establishes a diagnosis.",
  labMarker: "Marker",
  labValue: "Value",
  labCategory: "Classification",
  labCategories: {
    hba1c: {
      normal: "Below prediabetes range",
      "prediabetes-range": "Prediabetes range (5.7–6.4%)",
      "diabetes-range": "Diabetes range (≥ 6.5%), confirmation needed",
    },
    glucose: {
      "not-fasting": "Not fasting: thresholds not applicable",
      "fasting-unknown": "Fasting status not stated: fasting thresholds not applied",
      normal: "Below prediabetes range",
      "prediabetes-range": "Impaired fasting glucose range",
      "diabetes-range": "Diabetes range, confirmation needed",
    },
    egfr: {
      g1: "G1: normal or high",
      g2: "G2: mildly decreased",
      g3a: "G3a: mildly to moderately decreased",
      g3b: "G3b: moderately to severely decreased",
      g4: "G4: severely decreased",
      g5: "G5: kidney failure range",
    },
  } satisfies Readonly<Record<ClassifiedLabMarker, Readonly<Record<string, string>>>>,
  dementiaTitle: "Modifiable dementia factors",
  dementiaIntro:
    "The Lancet Commission lists fourteen factors that together account for a large share of dementia cases. This shows which ones your answers cover; it is context, not a score.",
  dementiaPresent: "Present",
  dementiaAbsent: "Not reported",
  dementiaUnanswered: "Not answered",
  dementiaSummary: (present: number, absent: number, unanswered: number) =>
    `${present} present · ${absent} not reported · ${unanswered} not answered`,
  dementiaFamilyHistory: {
    reported:
      "You report dementia in a parent or sibling. Family history is context for a conversation with a clinician; it is not one of the modifiable factors and does not change this list.",
    "not-reported":
      "You report no dementia in a parent or sibling. Family history is context only and is not one of the modifiable factors.",
    unanswered:
      "Family history of dementia was not answered; the Deep depth asks it. It is context only and is not one of the modifiable factors.",
  },
  dementiaFactors: {
    "less-education": "Less education",
    "hearing-loss": "Hearing loss",
    "high-ldl": "High LDL cholesterol",
    depression: "Depression",
    "head-injury": "Traumatic brain injury",
    "physical-inactivity": "Physical inactivity",
    diabetes: "Diabetes",
    smoking: "Smoking",
    hypertension: "Hypertension",
    obesity: "Obesity",
    "excessive-alcohol": "Excessive alcohol",
    "social-isolation": "Social isolation",
    "air-pollution": "Air pollution",
    "vision-loss": "Untreated vision loss",
  } satisfies Readonly<Record<DementiaFactorId, string>>,
  inputLabels: {
    "profile:age": "Age",
    "profile:country": "Country",
    "derived:body_mass_index": "Body-mass index",
    "derived:current_smoker": "Current smoker",
    "derived:ever_smoked": "Ever smoked",
    "derived:hypertension": "Hypertension",
    "derived:physically_inactive": "Physically inactive",
    "derived:daily_fruit_vegetables": "Daily vegetables or fruit",
    functional_difficulties: "Difficulty with daily activities",
    heart_failure_diagnosed: "Heart failure",
    family_lung_cancer: "Lung cancer in a first-degree relative",
    education_highest_level: "Highest education level",
    smoking_cigarettes_per_day: "Cigarettes per day",
    smoking_years_total: "Years smoked",
    smoking_years_since_quit: "Years since quitting",
    "lab:total_cholesterol": "Total cholesterol",
    "lab:hdl_cholesterol": "HDL cholesterol",
    "lab:hba1c": "HbA1c",
    "lab:glucose": "Glucose",
    "lab:egfr": "eGFR",
    sex_assigned_at_birth: "Sex at birth",
    height_cm: "Height",
    weight_kg: "Weight",
    waist_circumference_cm: "Waist circumference",
    neck_circumference_cm: "Neck circumference",
    diagnosed_conditions_core: "Diagnosed conditions",
    diabetes_type: "Diabetes type",
    diabetes_age_at_diagnosis: "Age at diabetes diagnosis",
    cvd_event_history: "Previous cardiovascular event",
    diagnosed_high_blood_pressure: "Diagnosed high blood pressure",
    bp_medication_ever: "Blood-pressure medicine",
    bp_medication_current: "Current blood-pressure medicine",
    blood_pressure_systolic: "Systolic blood pressure",
    glucose_high_ever: "Previous high glucose",
    family_diabetes: "Family history of diabetes",
    daily_activity_30_min: "30 minutes of daily activity",
    weekly_moderate_activity_minutes: "Weekly activity minutes",
    plant_food_frequency: "Vegetable and fruit portions",
    current_tobacco_nicotine: "Current tobacco or nicotine",
    tobacco_nicotine_context: "Nicotine context",
    tobacco_detail_products: "Nicotine products",
    smoking_history_former: "Former regular smoking",
    alcohol_frequency: "Drinking frequency",
    alcohol_detail_typical_amount: "Typical drinks per occasion",
    alcohol_detail_heavy_episode: "Six or more drinks in one occasion",
    sleep_snoring: "Loud snoring",
    sleep_daytime_sleepiness: "Daytime sleepiness",
    sleep_witnessed_apnea: "Observed breathing pauses",
    copd_breathless_frequency: "Breathlessness in past four weeks",
    copd_phlegm: "Coughing up phlegm",
    copd_activity_limit: "Doing less because of breathing",
    education_years: "Years of education",
    low_interest_frequency: "Little interest or pleasure",
    mood_low_frequency: "Low mood",
    anxiety_worry_frequency: "Feeling anxious or on edge",
    anxiety_control_worry: "Unable to control worrying",
    family_early_cvd: "Early cardiovascular disease in family",
    inflammatory_condition: "Chronic inflammatory condition",
    statin_current: "Cholesterol-lowering medicine",
  } as Readonly<Record<string, string>>,
  yes: "Yes",
  no: "No",
  depths: {
    express: "Express",
    quick: "Quick",
    detailed: "Detailed",
    deep: "Deep",
  } satisfies Readonly<Record<AnalysisDepth, string>>,
  people: (count: number, denominator: number, instrument: PercentInstrumentId, horizon: number) => {
    const event = EN_EVENTS[instrument];
    const scale = denominator === 1000 ? "1,000" : "100";
    if (count === 0) return `Fewer than 1 in ${scale} people with this result ${event.one} within ${horizon} years.`;
    return `About ${count} in ${scale} people with this result ${count === 1 ? event.one : event.other} within ${horizon} years.`;
  },
  peopleRange: (
    low: number,
    high: number,
    denominator: number,
    instrument: PercentInstrumentId,
    horizon: number,
    missing: number,
  ) =>
    `Between ${low} and ${high} in ${denominator === 1000 ? "1,000" : "100"} people with this result ${EN_EVENTS[instrument].other} within ${horizon} years, depending on the missing answer${missing > 1 ? "s" : ""}.`,
  pictogramToday: "Today",
  pictogramWithHabits: "With these habits",
  rangeHeading: (missing: number) => `Range with ${missing} missing answer${missing > 1 ? "s" : ""}`,
  rangePoints: (low: number, high: number, max: number) => `between ${low} and ${high} / ${max} points`,
  rangeCategories: (low: string, high: string) => `from “${low}” to “${high}”`,
  rangeSettled: (category: string, missing: number) =>
    `“${category}” whatever the missing answer${missing > 1 ? "s" : ""}`,
  rangeNote: "The range covers every answer the instrument scores; answering narrows it to one result.",
  gainHeading: "Same profile, healthier habits",
  gainReadout: (habits: string, result: string) => `With ${habits}, the score would correspond to ${result}.`,
  gainPeople: (count: number, denominator: number) =>
    count === 0 ? `fewer than 1 in ${denominator === 1000 ? "1,000" : "100"}` : `about ${count} in ${denominator === 1000 ? "1,000" : "100"}`,
  gainCategory: (category: string, points?: string) => (points ? `“${category}” (${points})` : `“${category}”`),
  gainBoundary: "Same age, sex and measurements: a comparison of scores, not a promise of the result.",
  habits: {
    "daily-activity": "30 minutes of activity a day",
    "daily-fruit-vegetables": "vegetables or fruit every day",
    "weekly-activity": "150 minutes of moderate activity a week (WHO)",
    "no-smoking": "smoking stopped",
  } satisfies Readonly<Record<PathologyHabitId, string>>,
  orientationHeading: "What to do with this result",
  orientations: {
    "findrisc-keep-habits":
      "Aim for at least 30 minutes of activity a day and vegetables or fruit every day: they are the two items of this score you control.",
    "findrisc-habits-and-clinician":
      "Talk to a doctor or nurse about this score. Activity, diet and weight are the recommended levers at this level.",
    "findrisc-glucose-test":
      "Ask a doctor for a blood glucose or HbA1c test: at this level testing is recommended, because type 2 diabetes often has no symptoms at first.",
    "score2-keep-habits":
      "Be active, eat a balanced diet and have your blood pressure and cholesterol checked regularly. If you smoke, stopping is the most effective single step.",
    "score2-clinician":
      "Book a cardiovascular check-up with a doctor: at this level, ESC guidance considers treating blood pressure and cholesterol. If you smoke, stopping is the most effective single step.",
    "prevent-keep-habits":
      "Be active, eat a balanced diet and have your blood pressure and cholesterol checked. If you smoke, ask for help to stop.",
    "prevent-clinician":
      "Discuss this result with a clinician: at this level, ACC/AHA guidance considers cholesterol-lowering treatment. If you smoke, stopping remains important.",
    "who-cvd-prevention":
      "Keep working on blood pressure, diet, activity and tobacco at every risk band. Show this result to a doctor or nurse: WHO charts support prevention in primary care.",
    "score2-diabetes-keep-care":
      "Keep up your diabetes follow-up for blood pressure, cholesterol, HbA1c and kidney function. Be active, and if you smoke, ask for help to stop.",
    "score2-diabetes-clinician":
      "Discuss this estimate with your doctor or diabetes team: ESC guidance considers stricter cholesterol targets and diabetes medicines that also protect the heart.",
    "stop-bang-watch-symptoms":
      "If loud snoring, breathing pauses or daytime sleepiness persist, talk to a doctor.",
    "stop-bang-sleep-assessment":
      "Talk to a doctor: a sleep test, at home or in a sleep clinic, confirms or rules out sleep apnoea. Sleepiness raises the risk of accidents, so avoid driving when drowsy.",
    "copd-watch-symptoms": "If a cough, phlegm or breathlessness lasts, see a doctor.",
    "copd-spirometry":
      "Ask a doctor for spirometry, a breathing test that confirms or rules out COPD. If you smoke, stopping is the most useful step for your lungs.",
    "caide-heart-and-activity":
      "What protects the heart also protects the brain: have your blood pressure and cholesterol checked, stay active and avoid smoking.",
    "audit-c-support":
      "Talk to a doctor or an alcohol support service. If you drink heavily every day, do not stop suddenly without medical advice: withdrawal can be dangerous.",
    "phq-2-clinician":
      "Talk to a doctor or psychologist: a conversation and a fuller questionnaire (PHQ-9) confirm or rule out depression.",
    "gad-2-clinician":
      "Talk to a doctor: a conversation and a fuller questionnaire (GAD-7) confirm or rule out an anxiety disorder, and effective treatments exist.",
    "lee-index-keep-function":
      "Staying active, keeping your strength and walking ability, and not smoking are the items of this index you can act on. Keep your usual medical follow-up.",
    "lee-index-clinician":
      "Share this result with your doctor: it combines age, conditions and daily-activity difficulties that deserve a review of treatments, falls prevention and preventive priorities. If you smoke, stopping counts in the index at any age.",
    "plco-below-threshold":
      "At this estimate, risk-based programmes do not select for CT screening. If you smoke, stopping is the step that lowers lung-cancer risk most; see a doctor promptly for a lasting cough, coughing blood or unexplained weight loss.",
    "plco-screening":
      "Ask a doctor about low-dose CT lung-cancer screening: at this estimate, risk-based programmes offer it. If you smoke, stopping is the most effective step, and screening does not replace it.",
  } satisfies Readonly<Record<PathologyOrientationId, string>>,
  followUp: {
    title: "Complete my estimates",
    invite: (questions: number, estimates: number) =>
      `${questions} question${questions > 1 ? "s" : ""} at most could complete ${estimates} estimate${estimates > 1 ? "s" : ""}. You answer only what is missing.`,
    startAll: "Complete all",
    startOne: (questions: number) => `Complete this estimate (${questions} question${questions > 1 ? "s" : ""} at most)`,
    remaining: (questions: number) => `${questions} question${questions > 1 ? "s" : ""} left at most`,
    unlocks: (estimates: string) => `Helps estimate: ${estimates}`,
    labsStep: (estimates: number) =>
      `A recent blood test can complete ${estimates > 1 ? "these estimates" : "this estimate"}.`,
    stop: "Stop here",
    doneTitle: "Estimates updated",
    doneBody: "Your answers were added. The cards below and the rest of your results now take them into account.",
    unchangedTitle: "Nothing was added",
    unchangedBody: "Your estimates stay as they were. You can come back to these questions at any time on this page.",
    seeEstimate: "See the estimate",
    close: "Close",
  },
};

const EN_EVENTS: Readonly<Record<PercentInstrumentId, { one: string; other: string }>> = {
  findrisc: { one: "develops type 2 diabetes", other: "develop type 2 diabetes" },
  score2: { one: "has a heart attack or stroke, fatal or not,", other: "have a heart attack or stroke, fatal or not," },
  prevent: { one: "has a heart attack or stroke, fatal or not,", other: "have a heart attack or stroke, fatal or not," },
  "who-cvd": { one: "has a heart attack or stroke, fatal or not,", other: "have a heart attack or stroke, fatal or not," },
  caide: { one: "develops dementia", other: "develop dementia" },
  "lee-index": { one: "dies, from any cause,", other: "die, from any cause," },
  plcom2012: { one: "is diagnosed with lung cancer", other: "are diagnosed with lung cancer" },
};

const FR_EVENTS: Readonly<Record<PercentInstrumentId, { one: string; other: string }>> = {
  findrisc: { one: "développe un diabète de type 2", other: "développent un diabète de type 2" },
  score2: { one: "fait un infarctus ou un AVC, mortel ou non,", other: "font un infarctus ou un AVC, mortel ou non," },
  prevent: { one: "fait un infarctus ou un AVC, mortel ou non,", other: "font un infarctus ou un AVC, mortel ou non," },
  "who-cvd": { one: "fait un infarctus ou un AVC, mortel ou non,", other: "font un infarctus ou un AVC, mortel ou non," },
  caide: { one: "développe une démence", other: "développent une démence" },
  "lee-index": { one: "décède, toutes causes confondues,", other: "décèdent, toutes causes confondues," },
  plcom2012: { one: "reçoit un diagnostic de cancer du poumon", other: "reçoivent un diagnostic de cancer du poumon" },
};

const fr = {
  navLink: "Pathologies",
  eyebrow: "Scores de dépistage publiés",
  title: "Pathologies les plus probables à discuter",
  intro:
    "Chaque estimation ci-dessous provient d’un instrument publié et validé, appliqué à vos réponses structurées et, si vous l’avez importé, à votre bilan sanguin confirmé. Un score décrit la probabilité d’une pathologie chez les personnes qui répondent comme vous\u00a0; ce n’est pas un diagnostic.",
  boundary:
    "Estimations de dépistage, pas un diagnostic. Seul un professionnel de santé peut confirmer ou écarter une pathologie, et un score bas ne l’exclut jamais.",
  rulesetVersion: (version: string) => `Jeu de scores ${version}`,
  statusComplete: "Estimation disponible",
  statusIncomplete: "Estimation pas encore possible",
  statusNotApplicable: "Ne s’applique pas à vous",
  pointsReadout: (points: number, max: number) => `${points} / ${max} points`,
  percentReadout: (percent: string, horizon: number) =>
    `environ ${percent} de risque estimé sur ${horizon} ans`,
  percentReadoutUnder: (percent: string, horizon: number) =>
    `moins de ${percent} de risque estimé sur ${horizon} ans`,
  percentWithheld:
    "Le pourcentage publié n’est pas affiché dans cette version\u00a0; la catégorie suit tout de même les seuils publiés de l’instrument.",
  inputsHeading: "Réponses utilisées",
  derivedTag: "dérivée",
  missingHeading: "Encore nécessaire",
  missingFrom: (depth: string) => `posée à partir de l’analyse ${depth}`,
  missingSkipped: "laissée sans réponse ou marquée «\u00a0pas sûr\u00a0»",
  missingAfter: (gate: string) => `posée après « ${gate} »`,
  missingUnavailable: "indisponible à partir de vos réponses",
  missingFromLab: "issue d’un bilan sanguin importé",
  missingFromProfile: "issue de votre profil",
  modifiersHeading: "À lire avec ces modulateurs",
  modifiers: {
    family_early_cvd: "Une maladie cardiovasculaire précoce chez un parent, un frère ou une sœur peut placer le risque réel au-dessus de l’estimation.",
    inflammatory_condition: "Une maladie inflammatoire chronique peut placer le risque réel au-dessus de l’estimation.",
    statin_current: "Un traitement hypocholestérolémiant était en cours\u00a0; le score a été construit sur des valeurs non traitées, lisez donc l’estimation avec prudence.",
    declared_heart_vascular: "Une maladie cardiaque ou vasculaire diagnostiquée a été déclarée. Les recommandations ESC classent la maladie athéroscléreuse établie en risque élevé ou très élevé indépendamment de cette estimation, qui suppose l’absence d’une telle maladie.",
    declared_kidney: "Une maladie rénale a été déclarée. Les recommandations ESC classent l’insuffisance rénale chronique modérée ou sévère en risque élevé ou très élevé indépendamment de cette estimation, qui suppose une fonction rénale normale.",
    "diabetes-esc-classification": "Un diabète a été déclaré. Les recommandations ESC tiennent aussi compte de sa durée, de l’atteinte des organes et de l’athérosclérose établie\u00a0; l’estimation seule ne tranche pas cette évaluation.",
    "egfr-below-45": "Un DFG estimé inférieur à 45 place le risque cardiovasculaire clinique à un niveau élevé ou très élevé indépendamment du calcul SCORE2-Diabetes. Parlez-en à l’équipe qui suit votre diabète.",
    "findrisc-age-extrapolated": "Le FINDRISC a été validé entre 35 et 64 ans\u00a0; en dehors de cette plage d’âge, les mêmes points s’appliquent mais l’estimation est une extrapolation.",
    "lee-lung-disease-proxy": "L’indice interrogeait sur une maladie pulmonaire chronique (bronchite chronique, emphysème)\u00a0; votre réponse «\u00a0maladie pulmonaire de longue durée\u00a0» a été comptée pour cet item, ce qui peut surestimer les points s’il s’agit d’un asthme.",
    "plco-race-reference": "Le modèle comporte un terme d’origine ethnique que ce questionnaire ne recueille pas\u00a0; il a été laissé au groupe de référence, l’estimation peut donc être plus basse ou plus haute pour d’autres groupes.",
    "plco-age-extrapolated": "PLCOm2012 a été développé chez des 55–74 ans\u00a0; les programmes de dépistage l’appliquent de 50 à 80 ans, mais hors de 55–74 ans l’estimation est une extrapolation.",
    "plco-copd-proxy": "Le modèle interroge sur une BPCO (bronchite chronique ou emphysème)\u00a0; votre réponse «\u00a0maladie pulmonaire de longue durée\u00a0» a été comptée comme une BPCO, ce qui peut surestimer le risque s’il s’agit d’un asthme.",
  } as Readonly<Record<string, string>>,
  sourcesHeading: "Sources",
  levels: {
    low: "Faible",
    moderate: "Modéré",
    high: "Élevé",
    "very-high": "Très élevé",
  } satisfies Readonly<Record<PathologyRiskLevel, string>>,
  score2Variant: {
    score2: "SCORE2 (ESC 2021)",
    "score2-op": "SCORE2-OP (ESC 2021)",
    "score2-diabetes": "SCORE2-Diabetes (ESC 2023)",
  },
  score2DiabetesBoundary: "Probabilité à dix ans d’un premier événement cardiovasculaire fatal ou non fatal en cas de diabète de type 2, calibrée pour la région ESC indiquée.",
  escRegion: {
    low: "Région ESC à bas risque",
    moderate: "Région ESC à risque modéré",
    high: "Région ESC à haut risque",
    "very-high": "Région ESC à très haut risque",
  },
  whoRegion: {
    "andean-latin-america": "Amérique latine andine",
    australasia: "Australasie",
    caribbean: "Caraïbes",
    "central-asia": "Asie centrale",
    "central-europe": "Europe centrale",
    "central-latin-america": "Amérique latine centrale",
    "central-sub-saharan-africa": "Afrique subsaharienne centrale",
    "east-asia": "Asie de l’Est",
    "eastern-europe": "Europe de l’Est",
    "eastern-sub-saharan-africa": "Afrique subsaharienne orientale",
    "high-income-asia-pacific": "Asie-Pacifique à revenu élevé",
    "high-income-north-america": "Amérique du Nord à revenu élevé",
    "north-africa-and-middle-east": "Afrique du Nord et Moyen-Orient",
    oceania: "Océanie",
    "south-asia": "Asie du Sud",
    "southeast-asia": "Asie du Sud-Est",
    "southern-latin-america": "Amérique latine méridionale",
    "southern-sub-saharan-africa": "Afrique subsaharienne australe",
    "tropical-latin-america": "Amérique latine tropicale",
    "western-europe": "Europe occidentale",
    "western-sub-saharan-africa": "Afrique subsaharienne occidentale",
  } satisfies Readonly<Record<WhoCvdRegion, string>>,
  whoRegionLabel: (region: string) => `Région OMS\u00a0: ${region}`,
  whoVariant: { laboratory: "Tables OMS 2019, avec laboratoire", "non-laboratory": "Tables OMS 2019, sans laboratoire" },
  notApplicable: {
    "age-out-of-range": "Cet instrument a été validé pour une autre tranche d’âge.",
    "diagnosed-condition": "Vous avez indiqué qu’un professionnel de santé a déjà diagnostiqué cette pathologie\u00a0; un score de dépistage ne s’applique donc pas.",
    "diabetes-type-not-covered": "SCORE2-Diabetes a été validé pour le diabète de type 2, pas pour le type que vous avez déclaré.",
    "established-cvd": "Vous avez indiqué un événement cardiovasculaire établi\u00a0; les scores de premier événement ne s’appliquent plus ensuite.",
    "sex-not-supported": "L’instrument ne publie des tables que pour le sexe féminin et masculin à la naissance.",
    "region-not-calibrated": "Choisissez votre pays au début pour obtenir une estimation calibrée pour sa région de risque publiée.",
    "outside-validated-range": "Une mesure dépasse la plage de validation de ce modèle\u00a0; demandez plutôt son interprétation à un professionnel de santé.",
    "never-smoked": "Ce modèle a été développé chez des personnes ayant fumé\u00a0; il ne s’applique pas à quelqu’un qui n’a jamais fumé.",
  } satisfies Readonly<Record<PathologyNotApplicableReason, string>>,
  outlook: {
    title: "Probabilités estimées d’issues majeures",
    intro:
      "Chaque ligne est un modèle publié et validé, appliqué à vos réponses, avec son horizon et la population dans laquelle il a été validé. La liste ne couvre que les issues pour lesquelles un tel modèle existe et correspond à vos données\u00a0; ce n’est pas la liste de toutes les causes de décès, et aucun de ces nombres n’est une prédiction vous concernant individuellement.",
    pending: (questions: number) =>
      `estimation en attente · ${questions} question${questions > 1 ? "s" : ""} au plus`,
    pendingLabs: "estimation en attente · bilan sanguin nécessaire",
    pendingQuestionsAndLabs: (questions: number) =>
      `estimation en attente · ${questions} question${questions > 1 ? "s" : ""} au plus et un bilan sanguin`,
    notApplicable: "ne s’applique pas à vous",
    validatedIn: (population: string) => `Validé chez\u00a0: ${population}`,
    populations: {
      "lee-index": "adultes américains de 50 ans et plus vivant à domicile (Health and Retirement Study, 1998–2002)",
      plcom2012: "fumeurs et anciens fumeurs américains de 55–74 ans (essai PLCO), validé en Europe, au Canada et en Australie",
      findrisc: "adultes finlandais de 35–64 ans",
      score2: "cohortes européennes de 40–89 ans, calibrées sur la région de risque ESC de votre pays",
      prevent: "adultes américains de 30–79 ans",
      "who-cvd": "tables OMS 2019 de la région de votre pays",
      caide: "adultes finlandais de 40–64 ans suivis vingt ans",
    } satisfies Readonly<Record<PercentInstrumentId, string>>,
  },
  instruments: {
    findrisc: {
      pathology: "Diabète de type 2",
      instrument: "FINDRISC (Finnish Diabetes Risk Score)",
      boundary: "Probabilité à dix ans d’un diabète de type 2 traité par médicament dans la cohorte de validation.",
      categories: {
        low: "Risque faible",
        "slightly-elevated": "Risque légèrement élevé",
        moderate: "Risque modéré",
        high: "Risque élevé",
        "very-high": "Risque très élevé",
      },
    },
    score2: {
      pathology: "Maladie cardiovasculaire (infarctus, AVC)",
      instrument: "SCORE2 / SCORE2-OP (ESC 2021)",
      boundary: "Probabilité à dix ans d’un premier événement cardiovasculaire fatal ou non fatal, calibrée pour la région ESC indiquée.",
      categories: {
        low: "Risque faible",
        moderate: "Risque modéré",
        "low-to-moderate": "Risque faible à modéré",
        high: "Risque élevé",
        "very-high": "Risque très élevé",
      },
    },
    prevent: {
      pathology: "Maladie cardiovasculaire (infarctus, AVC)",
      instrument: "PREVENT-ASCVD (AHA 2023)",
      boundary: "Risque à dix ans d’un premier infarctus ou AVC, mortel ou non, selon l’équation de base américaine PREVENT.",
      categories: {
        low: "Risque faible",
        borderline: "Risque limite",
        intermediate: "Risque intermédiaire",
        high: "Risque élevé",
      },
    },
    "who-cvd": {
      pathology: "Maladie cardiovasculaire (infarctus, AVC)",
      instrument: "Tables OMS 2019 de risque cardiovasculaire",
      boundary: "Bande imprimée de risque à dix ans d’un premier infarctus ou AVC, mortel ou non. L’OMS ne nomme pas ces bandes.",
      categories: {
        "under-5": "Moins de 5\u202f%",
        "5-to-9": "De 5 à moins de 10\u202f%",
        "10-to-19": "De 10 à moins de 20\u202f%",
        "20-to-29": "De 20 à moins de 30\u202f%",
        "30-plus": "30\u202f% ou plus",
      },
    },
    "stop-bang": {
      pathology: "Apnée obstructive du sommeil",
      instrument: "STOP-Bang",
      boundary: "Probabilité de dépistage d’une apnée du sommeil modérée à sévère\u00a0; la confirmation demande une étude du sommeil.",
      categories: {
        low: "Probabilité faible",
        intermediate: "Probabilité intermédiaire",
        high: "Probabilité élevée",
      },
    },
    "audit-c": {
      pathology: "Consommation d’alcool à risque",
      instrument: "AUDIT-C",
      boundary: "Dépistage d’une consommation à risque\u00a0; un dépistage positif est une raison d’en parler, pas un diagnostic de dépendance.",
      categories: {
        positive: "Dépistage positif",
        negative: "Sous le seuil",
      },
    },
    "phq-2": {
      pathology: "Dépression",
      instrument: "PHQ-2",
      boundary: "Dépistage en deux items\u00a0; un résultat positif appelle une évaluation plus complète avec un professionnel de santé.",
      categories: {
        positive: "Dépistage positif",
        negative: "Sous le seuil",
      },
    },
    "gad-2": {
      pathology: "Trouble anxieux",
      instrument: "GAD-2",
      boundary: "Dépistage en deux items\u00a0; un résultat positif appelle une évaluation plus complète avec un professionnel de santé.",
      categories: {
        positive: "Dépistage positif",
        negative: "Sous le seuil",
      },
    },
    "copd-ps": {
      pathology: "Bronchopneumopathie chronique obstructive (BPCO)",
      instrument: "COPD Population Screener",
      boundary: "Dépistage qui identifie à qui proposer une spirométrie\u00a0; il ne mesure pas la fonction pulmonaire.",
      categories: {
        "screen-positive": "Spirométrie à demander",
        "below-threshold": "Sous le seuil de dépistage",
      },
    },
    caide: {
      pathology: "Démence plus tard dans la vie",
      instrument: "Score CAIDE de risque de démence à mi-vie",
      boundary: "Probabilité à vingt ans estimée à partir de facteurs de mi-vie dans la cohorte de validation\u00a0; 40 à 64 ans.",
      categories: {
        low: "Risque faible",
        "slightly-elevated": "Risque légèrement élevé",
        moderate: "Risque modéré",
        high: "Risque élevé",
        "very-high": "Risque très élevé",
      },
    },
    "lee-index": {
      pathology: "Décès toutes causes dans les quatre ans",
      instrument: "Indice de Lee (JAMA 2006)",
      boundary: "Mortalité toutes causes à quatre ans observée par score de points dans la cohorte de validation d’adultes américains de 50 ans et plus vivant à domicile\u00a0; une fréquence de population, pas une prédiction individuelle.",
      categories: {
        low: "0–5 points\u00a0: moins de 4\u202f% en quatre ans",
        moderate: "6–9 points\u00a0: environ 15\u202f% en quatre ans",
        high: "10–13 points\u00a0: environ 42\u202f% en quatre ans",
        "very-high": "14 points ou plus\u00a0: environ 64\u202f% en quatre ans",
      },
    },
    plcom2012: {
      pathology: "Cancer du poumon dans les six ans",
      instrument: "PLCOm2012 (NEJM 2013)",
      boundary: "Probabilité à six ans d’un diagnostic de cancer du poumon chez les personnes ayant fumé, selon le modèle de l’essai PLCO utilisé pour sélectionner les candidats au dépistage par scanner faible dose.",
      categories: {
        "below-screening-threshold": "Sous le seuil de dépistage de 1,5\u202f%",
        "screening-threshold-met": "Au seuil de dépistage de 1,5\u202f% ou au-dessus",
      },
    },
  } satisfies Readonly<Record<PathologyInstrumentId, InstrumentCopy>>,
  labsTitle: "Classification du bilan sanguin confirmé",
  labsIntro: "Classée selon des seuils publiés à partir de vos valeurs confirmées\u00a0; un résultat isolé n’établit jamais un diagnostic.",
  labMarker: "Marqueur",
  labValue: "Valeur",
  labCategory: "Classification",
  labCategories: {
    hba1c: {
      normal: "Sous la zone de prédiabète",
      "prediabetes-range": "Zone de prédiabète (5,7–6,4\u202f%)",
      "diabetes-range": "Zone de diabète (≥ 6,5\u202f%), confirmation nécessaire",
    },
    glucose: {
      "not-fasting": "Non à jeun\u00a0: seuils non applicables",
      "fasting-unknown": "Statut à jeun non précisé\u00a0: seuils à jeun non appliqués",
      normal: "Sous la zone de prédiabète",
      "prediabetes-range": "Zone de glycémie à jeun altérée",
      "diabetes-range": "Zone de diabète, confirmation nécessaire",
    },
    egfr: {
      g1: "G1\u00a0: normal ou élevé",
      g2: "G2\u00a0: légèrement diminué",
      g3a: "G3a\u00a0: légèrement à modérément diminué",
      g3b: "G3b\u00a0: modérément à sévèrement diminué",
      g4: "G4\u00a0: sévèrement diminué",
      g5: "G5\u00a0: zone d’insuffisance rénale",
    },
  } satisfies Readonly<Record<ClassifiedLabMarker, Readonly<Record<string, string>>>>,
  dementiaTitle: "Facteurs de démence modifiables",
  dementiaIntro:
    "La Commission Lancet recense quatorze facteurs qui expliquent ensemble une large part des cas de démence. Voici ceux que vos réponses couvrent\u00a0; c’est un contexte, pas un score.",
  dementiaPresent: "Présent",
  dementiaAbsent: "Non rapporté",
  dementiaUnanswered: "Sans réponse",
  dementiaSummary: (present: number, absent: number, unanswered: number) =>
    `${present} présent(s) · ${absent} non rapporté(s) · ${unanswered} sans réponse`,
  dementiaFamilyHistory: {
    reported:
      "Vous signalez une démence chez un parent, un frère ou une sœur. L’antécédent familial est un élément de contexte à aborder avec un clinicien\u00a0; ce n’est pas un facteur modifiable et il ne change pas cette liste.",
    "not-reported":
      "Vous ne signalez aucune démence chez un parent, un frère ou une sœur. L’antécédent familial est un simple contexte et ne fait pas partie des facteurs modifiables.",
    unanswered:
      "L’antécédent familial de démence n’a pas été renseigné\u00a0; l’analyse approfondie pose cette question. C’est un simple contexte, pas un facteur modifiable.",
  },
  dementiaFactors: {
    "less-education": "Scolarité plus courte",
    "hearing-loss": "Perte d’audition",
    "high-ldl": "LDL-cholestérol élevé",
    depression: "Dépression",
    "head-injury": "Traumatisme crânien",
    "physical-inactivity": "Inactivité physique",
    diabetes: "Diabète",
    smoking: "Tabagisme",
    hypertension: "Hypertension",
    obesity: "Obésité",
    "excessive-alcohol": "Alcool en excès",
    "social-isolation": "Isolement social",
    "air-pollution": "Pollution de l’air",
    "vision-loss": "Perte de vision non traitée",
  } satisfies Readonly<Record<DementiaFactorId, string>>,
  inputLabels: {
    "profile:age": "Âge",
    "profile:country": "Pays",
    "derived:body_mass_index": "Indice de masse corporelle",
    "derived:current_smoker": "Fumeur actuel",
    "derived:ever_smoked": "A déjà fumé",
    "derived:hypertension": "Hypertension",
    "derived:physically_inactive": "Inactif physiquement",
    "derived:daily_fruit_vegetables": "Légumes ou fruits quotidiens",
    functional_difficulties: "Difficultés dans les activités quotidiennes",
    heart_failure_diagnosed: "Insuffisance cardiaque",
    family_lung_cancer: "Cancer du poumon chez un parent au premier degré",
    education_highest_level: "Niveau d’études le plus élevé",
    smoking_cigarettes_per_day: "Cigarettes par jour",
    smoking_years_total: "Années de tabagisme",
    smoking_years_since_quit: "Années depuis l’arrêt",
    "lab:total_cholesterol": "Cholestérol total",
    "lab:hdl_cholesterol": "Cholestérol HDL",
    "lab:hba1c": "HbA1c",
    "lab:glucose": "Glycémie",
    "lab:egfr": "DFG estimé",
    sex_assigned_at_birth: "Sexe à la naissance",
    height_cm: "Taille",
    weight_kg: "Poids",
    waist_circumference_cm: "Tour de taille",
    neck_circumference_cm: "Tour de cou",
    diagnosed_conditions_core: "Affections diagnostiquées",
    diabetes_type: "Type de diabète",
    diabetes_age_at_diagnosis: "Âge au diagnostic du diabète",
    cvd_event_history: "Événement cardiovasculaire antérieur",
    diagnosed_high_blood_pressure: "Hypertension diagnostiquée",
    bp_medication_ever: "Médicament contre l’hypertension",
    bp_medication_current: "Traitement actuel de la tension",
    blood_pressure_systolic: "Tension artérielle systolique",
    glucose_high_ever: "Glycémie élevée antérieure",
    family_diabetes: "Antécédents familiaux de diabète",
    daily_activity_30_min: "30 minutes d’activité quotidienne",
    weekly_moderate_activity_minutes: "Minutes d’activité hebdomadaires",
    plant_food_frequency: "Portions de légumes et de fruits",
    current_tobacco_nicotine: "Tabac ou nicotine actuel",
    tobacco_nicotine_context: "Contexte nicotinique",
    tobacco_detail_products: "Produits nicotiniques",
    smoking_history_former: "Tabagisme régulier passé",
    alcohol_frequency: "Fréquence de consommation d’alcool",
    alcohol_detail_typical_amount: "Verres par occasion",
    alcohol_detail_heavy_episode: "Six verres ou plus en une occasion",
    sleep_snoring: "Ronflement bruyant",
    sleep_daytime_sleepiness: "Somnolence diurne",
    sleep_witnessed_apnea: "Pauses respiratoires observées",
    copd_breathless_frequency: "Essoufflement sur quatre semaines",
    copd_phlegm: "Crachats de glaires",
    copd_activity_limit: "Activité réduite par la respiration",
    education_years: "Années d’études",
    low_interest_frequency: "Peu d’intérêt ou de plaisir",
    mood_low_frequency: "Humeur basse",
    anxiety_worry_frequency: "Nervosité ou anxiété",
    anxiety_control_worry: "Inquiétudes incontrôlables",
    family_early_cvd: "Maladie cardiovasculaire précoce dans la famille",
    inflammatory_condition: "Maladie inflammatoire chronique",
    statin_current: "Médicament hypocholestérolémiant",
  } as Readonly<Record<string, string>>,
  yes: "Oui",
  no: "Non",
  depths: {
    express: "express",
    quick: "rapide",
    detailed: "détaillée",
    deep: "approfondie",
  } satisfies Readonly<Record<AnalysisDepth, string>>,
  people: (count: number, denominator: number, instrument: PercentInstrumentId, horizon: number) => {
    const event = FR_EVENTS[instrument];
    const scale = denominator === 1000 ? "1\u00a0000" : "100";
    if (count === 0) return `Moins d’une personne sur ${scale} ayant ce résultat ${event.one} dans les ${horizon} ans.`;
    return count === 1
      ? `Environ 1 personne sur ${scale} ayant ce résultat ${event.one} dans les ${horizon} ans.`
      : `Environ ${count} personnes sur ${scale} ayant ce résultat ${event.other} dans les ${horizon} ans.`;
  },
  peopleRange: (
    low: number,
    high: number,
    denominator: number,
    instrument: PercentInstrumentId,
    horizon: number,
    missing: number,
  ) =>
    `Entre ${low} et ${high} personnes sur ${denominator === 1000 ? "1\u00a0000" : "100"} ayant ce résultat ${FR_EVENTS[instrument].other} dans les ${horizon} ans, ${missing > 1 ? "selon les réponses manquantes" : "selon la réponse manquante"}.`,
  pictogramToday: "Aujourd’hui",
  pictogramWithHabits: "Avec ces habitudes",
  rangeHeading: (missing: number) =>
    `Fourchette avec ${missing} réponse${missing > 1 ? "s" : ""} manquante${missing > 1 ? "s" : ""}`,
  rangePoints: (low: number, high: number, max: number) => `entre ${low} et ${high} / ${max} points`,
  rangeCategories: (low: string, high: string) => `de «\u00a0${low}\u00a0» à «\u00a0${high}\u00a0»`,
  rangeSettled: (category: string, missing: number) =>
    `«\u00a0${category}\u00a0» ${missing > 1 ? "quelles que soient les réponses manquantes" : "quelle que soit la réponse manquante"}`,
  rangeNote: "La fourchette couvre toutes les réponses que l’instrument note\u00a0; répondre la réduit à un seul résultat.",
  gainHeading: "Même profil, habitudes plus saines",
  gainReadout: (habits: string, result: string) => `Avec ${habits}, le score correspondrait à ${result}.`,
  gainPeople: (count: number, denominator: number) =>
    count === 0
      ? `moins de 1 sur ${denominator === 1000 ? "1\u00a0000" : "100"}`
      : `environ ${count} sur ${denominator === 1000 ? "1\u00a0000" : "100"}`,
  gainCategory: (category: string, points?: string) =>
    points ? `«\u00a0${category}\u00a0» (${points})` : `«\u00a0${category}\u00a0»`,
  gainBoundary: "Mêmes âge, sexe et mesures\u00a0: une comparaison de scores, pas une promesse de résultat.",
  habits: {
    "daily-activity": "30 minutes d’activité par jour",
    "daily-fruit-vegetables": "des légumes ou des fruits chaque jour",
    "weekly-activity": "150 minutes d’activité modérée par semaine (OMS)",
    "no-smoking": "l’arrêt du tabac",
  } satisfies Readonly<Record<PathologyHabitId, string>>,
  orientationHeading: "Que faire de ce résultat",
  orientations: {
    "findrisc-keep-habits":
      "Visez au moins 30 minutes d’activité par jour et des légumes ou des fruits chaque jour\u00a0: ce sont les deux items de ce score que vous contrôlez.",
    "findrisc-habits-and-clinician":
      "Parlez de ce score à un médecin ou à une infirmière. Activité physique, alimentation et poids sont les leviers recommandés à ce niveau.",
    "findrisc-glucose-test":
      "Demandez à un médecin une glycémie ou une HbA1c\u00a0: à ce niveau, un dépistage est recommandé, car le diabète de type 2 ne donne souvent aucun symptôme au début.",
    "score2-keep-habits":
      "Bougez régulièrement, mangez équilibré et faites contrôler votre tension et votre cholestérol à intervalles réguliers. Si vous fumez, arrêter est la mesure la plus efficace.",
    "score2-clinician":
      "Prévoyez un bilan cardiovasculaire avec un médecin\u00a0: à ce niveau, les recommandations ESC envisagent de traiter la tension et le cholestérol. Si vous fumez, arrêter est la mesure la plus efficace.",
    "prevent-keep-habits":
      "Bougez régulièrement, mangez équilibré et faites contrôler votre tension et votre cholestérol. Si vous fumez, demandez de l’aide pour arrêter.",
    "prevent-clinician":
      "Parlez de ce résultat à un professionnel de santé\u00a0: à ce niveau, les recommandations ACC/AHA envisagent un traitement hypocholestérolémiant. Si vous fumez, arrêter reste important.",
    "who-cvd-prevention":
      "Agissez sur la tension, l’alimentation, l’activité physique et le tabac quelle que soit la bande de risque. Montrez ce résultat à un médecin ou une infirmière\u00a0: les tables OMS soutiennent la prévention en soins primaires.",
    "score2-diabetes-keep-care":
      "Poursuivez votre suivi du diabète pour la tension, le cholestérol, l’HbA1c et la fonction rénale. Bougez régulièrement et, si vous fumez, demandez de l’aide pour arrêter.",
    "score2-diabetes-clinician":
      "Parlez de cette estimation à votre médecin ou à l’équipe de diabétologie\u00a0: les recommandations ESC envisagent des objectifs de cholestérol plus stricts et des traitements du diabète qui protègent aussi le cœur.",
    "stop-bang-watch-symptoms":
      "Si un ronflement fort, des pauses respiratoires ou une somnolence dans la journée persistent, parlez-en à un médecin.",
    "stop-bang-sleep-assessment":
      "Parlez-en à un médecin\u00a0: un test du sommeil, à domicile ou en centre, confirme ou écarte l’apnée. La somnolence augmente le risque d’accident\u00a0: évitez de conduire en cas de somnolence.",
    "copd-watch-symptoms": "Si une toux, des crachats ou un essoufflement durent, consultez un médecin.",
    "copd-spirometry":
      "Demandez à un médecin une spirométrie, un test du souffle qui confirme ou écarte une BPCO. Si vous fumez, arrêter est la mesure la plus utile pour vos poumons.",
    "caide-heart-and-activity":
      "Ce qui protège le cœur protège aussi le cerveau\u00a0: faites contrôler tension et cholestérol, gardez une activité régulière et évitez le tabac.",
    "audit-c-support":
      "Parlez-en à un médecin ou à un service d’aide en alcoologie. Si vous buvez beaucoup chaque jour, n’arrêtez pas d’un coup sans avis médical\u00a0: le sevrage peut être dangereux.",
    "phq-2-clinician":
      "Parlez-en à un médecin ou à un psychologue\u00a0: un entretien et un questionnaire plus complet (PHQ-9) confirment ou écartent une dépression.",
    "gad-2-clinician":
      "Parlez-en à un médecin\u00a0: un entretien et un questionnaire plus complet (GAD-7) confirment ou écartent un trouble anxieux, et des traitements efficaces existent.",
    "lee-index-keep-function":
      "Rester actif, garder sa force et sa capacité de marche et ne pas fumer sont les items de cet indice sur lesquels vous pouvez agir. Gardez votre suivi médical habituel.",
    "lee-index-clinician":
      "Montrez ce résultat à votre médecin\u00a0: il combine l’âge, des maladies et des difficultés dans les activités quotidiennes qui méritent une revue des traitements, de la prévention des chutes et des priorités de prévention. Si vous fumez, arrêter compte dans l’indice à tout âge.",
    "plco-below-threshold":
      "À cette estimation, les programmes fondés sur le risque ne sélectionnent pas pour un dépistage par scanner. Si vous fumez, arrêter est la mesure qui réduit le plus le risque de cancer du poumon\u00a0; consultez rapidement en cas de toux durable, de crachats de sang ou d’amaigrissement inexpliqué.",
    "plco-screening":
      "Demandez à un médecin un dépistage du cancer du poumon par scanner faible dose\u00a0: à cette estimation, les programmes fondés sur le risque le proposent. Si vous fumez, arrêter reste la mesure la plus efficace, et le dépistage ne la remplace pas.",
  } satisfies Readonly<Record<PathologyOrientationId, string>>,
  followUp: {
    title: "Compléter mes estimations",
    invite: (questions: number, estimates: number) =>
      `${questions} question${questions > 1 ? "s" : ""} au plus peu${questions > 1 ? "vent" : "t"} compléter ${estimates} estimation${estimates > 1 ? "s" : ""}. Vous ne répondez qu’à ce qui manque.`,
    startAll: "Tout compléter",
    startOne: (questions: number) =>
      `Compléter cette estimation (${questions} question${questions > 1 ? "s" : ""} au plus)`,
    remaining: (questions: number) =>
      `${questions} question${questions > 1 ? "s" : ""} restante${questions > 1 ? "s" : ""} au plus`,
    unlocks: (estimates: string) => `Utile pour\u00a0: ${estimates}`,
    labsStep: (estimates: number) =>
      `Un bilan sanguin récent peut compléter ${estimates > 1 ? "ces estimations" : "cette estimation"}.`,
    stop: "Arrêter ici",
    doneTitle: "Estimations mises à jour",
    doneBody: "Vos réponses ont été ajoutées. Les cartes ci-dessous et le reste de vos résultats en tiennent compte.",
    unchangedTitle: "Rien n’a été ajouté",
    unchangedBody: "Vos estimations restent inchangées. Vous pouvez revenir à ces questions à tout moment sur cette page.",
    seeEstimate: "Voir l’estimation",
    close: "Fermer",
  },
} satisfies typeof en;

export const pathologyCopy = { en, fr };
export type PathologyCopy = typeof en;

export function pathologyCategoryLabel(
  locale: keyof typeof pathologyCopy,
  instrument: PathologyInstrumentId,
  category: string,
): string {
  const categories: Readonly<Record<string, string>> = pathologyCopy[locale].instruments[instrument].categories;
  return categories[category] ?? category;
}

export function labCategoryLabel(
  locale: keyof typeof pathologyCopy,
  marker: ClassifiedLabMarker,
  category: string,
): string {
  const categories: Readonly<Record<string, string>> = pathologyCopy[locale].labCategories[marker];
  return categories[category] ?? category;
}
