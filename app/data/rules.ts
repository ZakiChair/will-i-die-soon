import type {
  RiskApplicability,
  RiskCondition,
  RiskFactorDefinition,
  RiskGroup,
  RiskRule,
} from "../lib/types";

const allCountries: RiskApplicability = { countries: "all" };
const adults: RiskApplicability = { minAge: 18, countries: "all" };

function equals(
  questionId: string,
  value: string | number | boolean,
): RiskCondition {
  return { questionId, operator: "equals", value };
}

function includes(questionId: string, value: string): RiskCondition {
  return { questionId, operator: "includes", value };
}

function includesAny(
  questionId: string,
  values: ReadonlyArray<string>,
): RiskCondition {
  return { any: values.map((value) => includes(questionId, value)) };
}

function equalsAny(
  questionId: string,
  values: ReadonlyArray<string>,
): RiskCondition {
  return { any: values.map((value) => equals(questionId, value)) };
}

function lessThan(
  questionId: string,
  value: number,
  validMin: number,
  validMax: number,
): RiskCondition {
  return { questionId, operator: "less-than", value, validMin, validMax };
}

function factor(
  questionId: string,
  label: string,
  condition: RiskCondition,
): RiskFactorDefinition {
  return { questionId, label, condition };
}

function urgentRule(
  id: string,
  questionId: string,
  title: string,
  emergencyKind: NonNullable<RiskRule["emergencyKind"]>,
  sourceIds: ReadonlyArray<string>,
  factorLabel: string,
  dedupeKey: string,
): RiskRule {
  const condition = equals(questionId, true);
  return {
    id,
    group: "immediate-red-flags",
    title,
    copy: "Seek emergency care now.",
    inputs: [questionId],
    sourceIds: [
      ...new Set([
        ...sourceIds,
        "whoBasicEmergencyCare",
        "us911EmergencyAssistance",
        "nhsWhenToCall999",
        "swissEmergencyNumbers",
      ]),
    ],
    evidenceTier: "authoritative-safety",
    urgency: "urgent",
    signal: "urgent",
    condition,
    factors: [factor(questionId, factorLabel, condition)],
    applicability: allCountries,
    dedupeKey,
    emergencyKind,
  };
}

const immediateRedFlagRules: RiskRule[] = [
  urgentRule(
    "urgent-chest",
    "urgent_chest_discomfort_now",
    "Immediate cardiopulmonary action",
    "chest",
    ["nhsChestPain", "whoBasicEmergencyCare"],
    "Confirmed new or severe chest discomfort now",
    "cardiopulmonary-emergency",
  ),
  urgentRule(
    "urgent-breathing",
    "urgent_breathing_now",
    "Immediate cardiopulmonary action",
    "breathing",
    ["nhsShortnessOfBreath", "nhsChildFirstAid", "whoBasicEmergencyCare"],
    "Confirmed severe breathing difficulty now",
    "cardiopulmonary-emergency",
  ),
  urgentRule(
    "urgent-stroke",
    "urgent_stroke_signs_now",
    "Immediate stroke-sign action",
    "stroke",
    ["nhsStroke", "whoBasicEmergencyCare"],
    "Confirmed sudden stroke-like signs now or within 24 hours",
    "neurologic-emergency",
  ),
  urgentRule(
    "urgent-severe-allergy",
    "urgent_severe_allergy_now",
    "Immediate severe-allergy action",
    "severe-allergy",
    ["nhsAnaphylaxis", "whoBasicEmergencyCare"],
    "Confirmed airway, breathing, or collapse signs of severe allergy now",
    "severe-allergy",
  ),
  urgentRule(
    "urgent-overdose-poisoning",
    "urgent_overdose_poisoning_now",
    "Immediate poisoning or overdose action",
    "overdose-poisoning",
    ["nhsPoisoning", "fophUfiEmergency", "whoBasicEmergencyCare"],
    "Confirmed suspected overdose, poisoning, or unresponsiveness now",
    "poisoning-emergency",
  ),
  urgentRule(
    "urgent-severe-bleeding",
    "urgent_severe_bleeding_now",
    "Immediate severe-bleeding action",
    "severe-bleeding",
    ["nhsFirstAid", "whoBasicEmergencyCare"],
    "Confirmed severe bleeding that is not stopping now",
    "bleeding-emergency",
  ),
  urgentRule(
    "urgent-self-harm",
    "urgent_self_harm_now",
    "Immediate personal-safety action",
    "self-harm",
    ["niceSelfHarm", "samhsa988", "whoSuicide"],
    "Confirmed immediate danger of self-harm or inability to stay safe",
    "self-harm-emergency",
  ),
  {
    id: "urgent-adolescent-pregnancy-safety",
    group: "immediate-red-flags",
    title: "Immediate pregnancy or safeguarding action",
    copy: "Get urgent pregnancy or safeguarding help now.",
    inputs: ["pregnancy_relevant", "adolescent_pregnancy_urgent_safety"],
    sourceIds: [
      "whoPregnancyHealthServices",
      "whoBasicEmergencyCare",
      "us911EmergencyAssistance",
      "nhsWhenToCall999",
      "swissEmergencyNumbers",
    ],
    evidenceTier: "guideline-action",
    urgency: "urgent",
    signal: "urgent",
    condition: {
      all: [
        equals("pregnancy_relevant", true),
        equals("adolescent_pregnancy_urgent_safety", true),
      ],
    },
    factors: [
      factor(
        "pregnancy_relevant",
        "Pregnancy, trying to conceive, or breastfeeding may be relevant",
        equals("pregnancy_relevant", true),
      ),
      factor(
        "adolescent_pregnancy_urgent_safety",
        "Severe pregnancy-related symptom or current pressure or safety concern reported",
        equals("adolescent_pregnancy_urgent_safety", true),
      ),
    ],
    applicability: { minAge: 13, maxAge: 17, countries: "all" },
    dedupeKey: "pregnancy-safety-emergency",
    emergencyKind: "pregnancy-safety",
  },
];

const shortSleep = lessThan("usual_sleep_hours", 7, 0, 24);
const sleepyOften: RiskCondition = {
  any: [
    equals("sleep_daytime_sleepiness", "often"),
    equals("sleep_daytime_sleepiness", "daily"),
  ],
};
const lowInterest: RiskCondition = {
  any: [
    equals("low_interest_frequency", "more_than_half"),
    equals("low_interest_frequency", "nearly_every_day"),
  ],
};
const lowMood: RiskCondition = {
  any: [
    equals("mood_low_frequency", "more_than_half"),
    equals("mood_low_frequency", "nearly_every_day"),
  ],
};
const lowActivity = lessThan("weekly_moderate_activity_minutes", 150, 0, 10080);
const lowStrength = lessThan("movement_strength_days", 2, 0, 7);

const cardiovascularRules: RiskRule[] = [
  {
    id: "blood-pressure-salt-context",
    group: "cardiovascular",
    title: "Blood-pressure and salt context",
    copy:
      "Frequent added salt alongside known high blood pressure may be worth discussing during routine care.",
    inputs: ["diagnosed_high_blood_pressure", "diet_added_salt"],
    sourceIds: ["whoHealthyDiet"],
    evidenceTier: "guideline-action",
    urgency: "long-term",
    signal: "worth-attention",
    condition: {
      all: [equals("diagnosed_high_blood_pressure", true), equals("diet_added_salt", "daily")],
    },
    factors: [
      factor(
        "diagnosed_high_blood_pressure",
        "Clinician-reported high blood pressure",
        equals("diagnosed_high_blood_pressure", true),
      ),
      factor(
        "diet_added_salt",
        "Adds salt at the table daily",
        equals("diet_added_salt", "daily"),
      ),
    ],
    applicability: adults,
  },
  {
    id: "exertional-chest-pain-review",
    group: "cardiovascular",
    title: "Effort-related chest discomfort",
    copy:
      "Chest pain, tightness, or heaviness that comes on with effort and eases with rest is the typical pattern of angina and is worth discussing promptly with a clinician, even between episodes.",
    inputs: ["exertional_chest_pain"],
    sourceIds: ["nhsAngina", "escPrevention2021"],
    evidenceTier: "guideline-action",
    urgency: "prompt-review",
    signal: "high-signal",
    condition: equals("exertional_chest_pain", true),
    factors: [
      factor(
        "exertional_chest_pain",
        "Effort-related chest discomfort that eases with rest",
        equals("exertional_chest_pain", true),
      ),
    ],
    applicability: adults,
  },
  {
    id: "exertional-leg-pain-review",
    group: "cardiovascular",
    title: "Walking-related leg pain",
    copy:
      "Cramping leg pain that starts with walking and stops within minutes of standing still is the typical pattern of peripheral arterial disease and is worth discussing with a clinician.",
    inputs: ["exertional_leg_pain"],
    sourceIds: ["nhsPeripheralArterialDisease", "escPrevention2021"],
    evidenceTier: "guideline-action",
    urgency: "prompt-review",
    signal: "high-signal",
    condition: equals("exertional_leg_pain", true),
    factors: [
      factor(
        "exertional_leg_pain",
        "Walking-induced leg pain relieved by rest",
        equals("exertional_leg_pain", true),
      ),
    ],
    applicability: adults,
  },
  {
    id: "irregular-palpitations-review",
    group: "cardiovascular",
    title: "Unexplained irregular palpitations",
    copy:
      "Episodes of an irregular, fluttering, or racing heartbeat that are not explained by exercise or a fright are worth discussing with a clinician, who can check the rhythm during an episode.",
    inputs: ["palpitations_irregular"],
    sourceIds: ["nhsHeartPalpitations", "nhsAtrialFibrillation"],
    evidenceTier: "guideline-action",
    urgency: "prompt-review",
    signal: "worth-attention",
    condition: equals("palpitations_irregular", true),
    factors: [
      factor(
        "palpitations_irregular",
        "Unexplained irregular or racing heartbeat episodes",
        equals("palpitations_irregular", true),
      ),
    ],
    applicability: adults,
  },
  {
    id: "atrial-fibrillation-review",
    group: "cardiovascular",
    title: "Known irregular heart rhythm",
    copy:
      "A clinician-diagnosed irregular heart rhythm such as atrial fibrillation deserves regular follow-up of stroke-prevention treatment and rhythm control; the cardiovascular risk score shown elsewhere does not cover it.",
    inputs: ["diagnosed_conditions_core"],
    sourceIds: ["nhsAtrialFibrillation", "escPrevention2021"],
    evidenceTier: "guideline-action",
    urgency: "long-term",
    signal: "worth-attention",
    condition: includes("diagnosed_conditions_core", "atrial_fibrillation"),
    factors: [
      factor(
        "diagnosed_conditions_core",
        "Clinician-diagnosed atrial fibrillation or irregular rhythm",
        includes("diagnosed_conditions_core", "atrial_fibrillation"),
      ),
    ],
    applicability: adults,
  },
];

const sleepRules: RiskRule[] = [
  {
    id: "adult-short-sleep",
    group: "sleep",
    title: "Short sleep pattern",
    copy:
      "Regularly sleeping under seven hours may be associated with poorer health and is worth discussing if it persists or affects daytime function.",
    inputs: ["usual_sleep_hours", "sleep_daytime_sleepiness"],
    sourceIds: ["cdcAdultSleep"],
    evidenceTier: "guideline-action",
    urgency: "long-term",
    signal: "worth-attention",
    condition: shortSleep,
    factors: [
      factor(
        "usual_sleep_hours",
        "Usually sleeps under 7 hours in 24 hours",
        shortSleep,
      ),
      factor(
        "sleep_daytime_sleepiness",
        "Often struggles to stay awake during quiet daytime activities",
        sleepyOften,
      ),
    ],
    applicability: adults,
  },
  {
    id: "sleep-breathing-review",
    group: "sleep",
    title: "Observed sleep-breathing pattern",
    copy:
      "Observed snoring, choking, or breathing pauses with daytime sleepiness may be associated with disrupted sleep and are worth discussing with a clinician.",
    inputs: ["sleep_snoring", "sleep_daytime_sleepiness"],
    sourceIds: ["nhsSleepApnoea", "nhsDaytimeSleepiness"],
    evidenceTier: "guideline-action",
    urgency: "prompt-review",
    signal: "high-signal",
    condition: { all: [equals("sleep_snoring", "yes"), sleepyOften] },
    factors: [
      factor(
        "sleep_snoring",
        "Observed loud snoring, choking, or breathing pauses",
        equals("sleep_snoring", "yes"),
      ),
      factor(
        "sleep_daytime_sleepiness",
        "Frequent daytime sleepiness",
        sleepyOften,
      ),
    ],
    applicability: adults,
    dedupeKey: "sleep-breathing",
  },
];

const respiratoryRules: RiskRule[] = [
  {
    id: "breathlessness-review",
    group: "respiratory",
    title: "Changed breathlessness with activity",
    copy:
      "Breathlessness with less activity than before is worth discussing promptly with a clinician, especially if it is worsening.",
    inputs: ["breathlessness_activity"],
    sourceIds: ["nhsShortnessOfBreath", "whoBasicEmergencyCare"],
    evidenceTier: "guideline-action",
    urgency: "prompt-review",
    signal: "high-signal",
    condition: equals("breathlessness_activity", true),
    factors: [
      factor(
        "breathlessness_activity",
        "Becomes breathless with less activity than before",
        equals("breathlessness_activity", true),
      ),
    ],
    applicability: adults,
    dedupeKey: "cardiopulmonary-emergency",
  },
];

const mentalWellbeingRules: RiskRule[] = [
  {
    id: "low-mood-support",
    group: "mental-wellbeing",
    title: "Low mood and interest pattern",
    copy:
      "Frequent low mood or loss of interest is worth discussing with a health professional or trusted support person.",
    inputs: ["low_interest_frequency", "mood_low_frequency"],
    sourceIds: ["niceDepression", "whoDepression"],
    evidenceTier: "guideline-action",
    urgency: "support",
    signal: "worth-attention",
    condition: { any: [lowInterest, lowMood] },
    factors: [
      factor("low_interest_frequency", "Frequent loss of interest or pleasure", lowInterest),
      factor("mood_low_frequency", "Frequent low or hopeless mood", lowMood),
    ],
    applicability: adults,
    dedupeKey: "self-harm-emergency",
  },
  {
    id: "child-feeling-support",
    group: "mental-wellbeing",
    title: "Support requested",
    copy:
      "Ask a trusted adult or health professional for help talking about how things have been feeling.",
    inputs: ["child_feeling_support"],
    sourceIds: [
      "nhsChildMentalHealthSupport",
      "whoChildYoungPeopleMentalHealthServices",
    ],
    evidenceTier: "guideline-action",
    urgency: "support",
    signal: "worth-attention",
    condition: equals("child_feeling_support", true),
    factors: [
      factor(
        "child_feeling_support",
        "Requested help talking to a trusted adult or health professional",
        equals("child_feeling_support", true),
      ),
    ],
    applicability: { minAge: 5, maxAge: 12, countries: "all" },
  },
];

const adolescentNicotineSupport = equalsAny("adolescent_nicotine_support", [
  "general_information",
  "find_service",
]);
const adolescentAlcoholSupport = equalsAny("adolescent_alcohol_support", [
  "general_information",
  "find_service",
]);
const adolescentCannabisSupport = equalsAny("adolescent_cannabis_support", [
  "general_information",
  "find_service",
]);
const adolescentOtherDrugSupport = equalsAny("adolescent_other_drug_support", [
  "general_information",
  "find_service",
]);
const alcoholUseGate = equalsAny("alcohol_frequency", [
  "monthly_or_less",
  "two_to_four_monthly",
  "two_to_three_weekly",
  "four_plus_weekly",
]);
const adolescentOtherDrugGate: RiskCondition = {
  any: [
    equals("uses_nonmedical_stimulants", true),
    equals("uses_nonmedical_opioids", true),
    equals("uses_psychedelics", true),
    equals("uses_other_recreational_drugs", true),
  ],
};
const adolescentSubstanceGate: RiskCondition = {
  any: [
    equals("current_tobacco_nicotine", true),
    alcoholUseGate,
    equals("uses_cannabis", true),
    adolescentOtherDrugGate,
  ],
};
const adolescentNicotineSupportRoute: RiskCondition = {
  all: [equals("current_tobacco_nicotine", true), adolescentNicotineSupport],
};
const adolescentAlcoholSupportRoute: RiskCondition = {
  all: [alcoholUseGate, adolescentAlcoholSupport],
};
const adolescentCannabisSupportRoute: RiskCondition = {
  all: [equals("uses_cannabis", true), adolescentCannabisSupport],
};
const adolescentOtherDrugSupportRoute: RiskCondition = {
  all: [adolescentOtherDrugGate, adolescentOtherDrugSupport],
};
const adolescentImmediateRedFlagRules: RiskRule[] = [
  {
    id: "urgent-adolescent-substance-safety",
    group: "immediate-red-flags",
    title: "Immediate substance-related safety action",
    copy: "Seek emergency care now.",
    inputs: [
      "current_tobacco_nicotine",
      "alcohol_frequency",
      "uses_cannabis",
      "uses_nonmedical_stimulants",
      "uses_nonmedical_opioids",
      "uses_psychedelics",
      "uses_other_recreational_drugs",
      "adolescent_substance_severe_timing",
    ],
    sourceIds: [
      "whoBasicEmergencyCare",
      "us911EmergencyAssistance",
      "nhsWhenToCall999",
      "swissEmergencyNumbers",
    ],
    evidenceTier: "guideline-action",
    urgency: "urgent",
    signal: "urgent",
    condition: {
      all: [
        adolescentSubstanceGate,
        equals("adolescent_substance_severe_timing", "happening_now"),
      ],
    },
    factors: [
      factor(
        "adolescent_substance_severe_timing",
        "Current severe substance-related symptom or immediate safety concern reported",
        equals("adolescent_substance_severe_timing", "happening_now"),
      ),
    ],
    applicability: { minAge: 13, maxAge: 17, countries: "all" },
    dedupeKey: "substance-emergency",
    emergencyKind: "substance-safety",
  },
];

const dependencyRules: RiskRule[] = [
  {
    id: "alcohol-control-support",
    group: "dependency",
    title: "Alcohol support signal",
    copy:
      "Concern about control, withdrawal, or responsibilities is worth discussing with a clinician or confidential support service.",
    inputs: ["alcohol_detail_control_concern"],
    sourceIds: ["niaaaAlcoholControl", "fophAddictionHelp"],
    evidenceTier: "guideline-action",
    urgency: "support",
    signal: "worth-attention",
    condition: equals("alcohol_detail_control_concern", true),
    factors: [
      factor(
        "alcohol_detail_control_concern",
        "Reported concern about alcohol control, withdrawal, or responsibilities",
        equals("alcohol_detail_control_concern", true),
      ),
    ],
    applicability: adults,
  },
  {
    id: "nicotine-support",
    group: "dependency",
    title: "Current tobacco or nicotine use",
    copy:
      "Current tobacco or nicotine use may be associated with long-term health harms; support is available if reducing or stopping is a goal.",
    inputs: ["current_tobacco_nicotine"],
    sourceIds: ["whoTobacco", "fophAddictionHelp"],
    evidenceTier: "guideline-action",
    urgency: "support",
    signal: "worth-attention",
    condition: equals("current_tobacco_nicotine", true),
    factors: [
      factor(
        "current_tobacco_nicotine",
        "Current tobacco or nicotine use",
        equals("current_tobacco_nicotine", true),
      ),
    ],
    applicability: adults,
  },
  {
    id: "adolescent-substance-support",
    group: "dependency",
    title: "Adolescent substance-use support requested",
    copy:
      "General information or help finding an age-appropriate health service is available without treating the disclosed use as a diagnosis or score.",
    inputs: [
      "current_tobacco_nicotine",
      "alcohol_frequency",
      "uses_cannabis",
      "uses_nonmedical_stimulants",
      "uses_nonmedical_opioids",
      "uses_psychedelics",
      "uses_other_recreational_drugs",
      "adolescent_nicotine_support",
      "adolescent_alcohol_support",
      "adolescent_cannabis_support",
      "adolescent_other_drug_support",
    ],
    sourceIds: ["whoAdolescentFriendlyServices", "samhsaYouthSubstanceSupport"],
    evidenceTier: "guideline-action",
    urgency: "support",
    signal: "worth-attention",
    condition: {
      any: [
        adolescentNicotineSupportRoute,
        adolescentAlcoholSupportRoute,
        adolescentCannabisSupportRoute,
        adolescentOtherDrugSupportRoute,
      ],
    },
    factors: [
      factor(
        "adolescent_nicotine_support",
        "Requested nicotine or tobacco information or service help",
        adolescentNicotineSupportRoute,
      ),
      factor(
        "adolescent_alcohol_support",
        "Requested alcohol information or service help",
        adolescentAlcoholSupportRoute,
      ),
      factor(
        "adolescent_cannabis_support",
        "Requested cannabis information or service help",
        adolescentCannabisSupportRoute,
      ),
      factor(
        "adolescent_other_drug_support",
        "Requested other-drug information or service help",
        adolescentOtherDrugSupportRoute,
      ),
    ],
    applicability: { minAge: 13, maxAge: 17, countries: "all" },
  },
  {
    id: "adolescent-substance-safety-support",
    group: "dependency",
    title: "Adolescent substance-safety follow-up",
    copy:
      "A collapse, seizure, severe breathing problem, chest symptom, or safety concern related to substance use during the past year, but not happening now, is worth sharing promptly with a trusted adult and qualified health professional.",
    inputs: [
      "current_tobacco_nicotine",
      "alcohol_frequency",
      "uses_cannabis",
      "uses_nonmedical_stimulants",
      "uses_nonmedical_opioids",
      "uses_psychedelics",
      "uses_other_recreational_drugs",
      "adolescent_substance_severe_timing",
    ],
    sourceIds: [
      "whoAdolescentFriendlyServices",
      "samhsaYouthSubstanceSupport",
      "cdcPolysubstanceOverdose",
    ],
    evidenceTier: "guideline-action",
    urgency: "support",
    signal: "high-signal",
    condition: {
      all: [
        adolescentSubstanceGate,
        equals("adolescent_substance_severe_timing", "past_year_not_now"),
      ],
    },
    factors: [
      factor(
        "adolescent_substance_severe_timing",
        "Resolved past-year severe substance-related safety event reported",
        equals("adolescent_substance_severe_timing", "past_year_not_now"),
      ),
    ],
    applicability: { minAge: 13, maxAge: 17, countries: "all" },
  },
];

const glpRecognizedProduct = equalsAny("glp1_detail_product_identity", [
  "zepbound_tirzepatide",
  "wegovy_semaglutide",
  "saxenda_liraglutide",
  "trulicity_dulaglutide",
]);
const glpRetinopathyLabelProduct = equalsAny(
  "glp1_detail_product_identity",
  ["zepbound_tirzepatide", "wegovy_semaglutide", "trulicity_dulaglutide"],
);
const glpLabelSources: NonNullable<RiskRule["conditionalSources"]> = [
  {
    sourceId: "dailymedZepboundTirzepatide",
    condition: equals("glp1_detail_product_identity", "zepbound_tirzepatide"),
  },
  {
    sourceId: "dailymedWegovySemaglutide",
    condition: equals("glp1_detail_product_identity", "wegovy_semaglutide"),
  },
  {
    sourceId: "dailymedSaxendaLiraglutide",
    condition: equals("glp1_detail_product_identity", "saxenda_liraglutide"),
  },
  {
    sourceId: "dailymedTrulicityDulaglutide",
    condition: equals("glp1_detail_product_identity", "trulicity_dulaglutide"),
  },
];
const glpAllergy: RiskCondition = {
  all: [
    equals("uses_glp1", true),
    glpRecognizedProduct,
    includes("glp1_detail_current_symptoms", "allergy"),
  ],
};
const glpGastrointestinal: RiskCondition = {
  all: [
    equals("uses_glp1", true),
    glpRecognizedProduct,
    {
      any: [
        includes("glp1_detail_current_symptoms", "abdominal"),
        includes("glp1_detail_current_symptoms", "vomiting"),
      ],
    },
  ],
};
const glpGlucoseSymptoms: RiskCondition = {
  all: [
    equals("uses_glp1", true),
    glpRecognizedProduct,
    equals("glp1_detail_glucose_medicines", true),
    includes("glp1_detail_current_symptoms", "fainting"),
  ],
};
const glpDiabetesVision: RiskCondition = {
  all: [
    equals("uses_glp1", true),
    glpRetinopathyLabelProduct,
    equals("glp1_detail_indication", "diabetes"),
    includes("glp1_detail_current_symptoms", "vision"),
  ],
};
const glpRelevantHistory = includesAny("glp1_detail_relevant_history", [
  "pancreatitis",
  "gallbladder",
  "gastroparesis",
  "kidney",
  "eye",
  "men2",
]);
const glpHistoryReview: RiskCondition = {
  all: [
    equals("uses_glp1", true),
    glpRecognizedProduct,
    {
      any: [
        includesAny("glp1_detail_relevant_history", [
          "pancreatitis",
          "gallbladder",
          "gastroparesis",
          "kidney",
          "men2",
        ]),
        {
          all: [
            glpRetinopathyLabelProduct,
            includes("glp1_detail_relevant_history", "eye"),
          ],
        },
      ],
    },
  ],
};
const glpPregnancyProcedure = includesAny("glp1_detail_procedure_pregnancy", [
  "pregnant",
  "trying",
  "breastfeeding",
  "procedure",
]);
const glpPregnancyProcedureReview: RiskCondition = {
  all: [
    equals("uses_glp1", true),
    glpRecognizedProduct,
    glpPregnancyProcedure,
  ],
};
const isotretinoinPhysicalSymptoms = includesAny("isotretinoin_detail_symptoms", [
  "head_vision",
  "abdominal",
  "rash",
]);
const isotretinoinPhysicalReview: RiskCondition = {
  all: [equals("uses_isotretinoin", true), isotretinoinPhysicalSymptoms],
};
const isotretinoinMoodReview: RiskCondition = {
  all: [
    equals("uses_isotretinoin", true),
    includes("isotretinoin_detail_symptoms", "mood"),
  ],
};
const isotretinoinPregnancyProgramContext: RiskCondition = {
  any: [
    equals("isotretinoin_detail_program_pregnancy", "not_complete"),
    equals("pregnancy_relevant", true),
  ],
};
const isotretinoinPregnancyProgramReview: RiskCondition = {
  all: [equals("uses_isotretinoin", true), isotretinoinPregnancyProgramContext],
};
const oralMinoxidil: RiskCondition = {
  any: [
    equals("minoxidil_detail_route_product", "oral"),
    equals("minoxidil_detail_route_product", "both"),
  ],
};
const minoxidilCardiacSymptoms: RiskCondition = {
  any: [
    includes("minoxidil_detail_cardiac_symptoms", "chest"),
    includes("minoxidil_detail_cardiac_symptoms", "heartbeat"),
    includes("minoxidil_detail_cardiac_symptoms", "faint"),
    includes("minoxidil_detail_cardiac_symptoms", "breath"),
    includes("minoxidil_detail_cardiac_symptoms", "fluid"),
  ],
};
const topicalMinoxidil: RiskCondition = equalsAny("minoxidil_detail_route_product", [
  "topical",
  "both",
]);
const topicalMinoxidilScalpReview: RiskCondition = {
  all: [
    equals("uses_minoxidil", true),
    topicalMinoxidil,
    equals("minoxidil_detail_hair_scalp_context", "one_or_more"),
  ],
};
const topicalMinoxidilSymptomReview: RiskCondition = {
  all: [equals("uses_minoxidil", true), topicalMinoxidil, minoxidilCardiacSymptoms],
};
const researchProductStorageConcerns = includesAny(
  "research_detail_storage_symptoms",
  ["warm", "damaged"],
);
const researchProductReactionConcerns = includesAny("research_detail_storage_symptoms", [
  "site",
  "systemic",
]);
const researchProductConditionReview: RiskCondition = {
  all: [
    equals("uses_research_peptides", true),
    researchProductReactionConcerns,
  ],
};
const researchProductStorageReview: RiskCondition = {
  all: [
    equals("uses_research_peptides", true),
    researchProductStorageConcerns,
  ],
};
const anabolicCardiorespiratorySymptoms = includesAny("anabolic_detail_symptoms", [
  "chest_breath",
]);
const anabolicCardiorespiratoryReview: RiskCondition = {
  all: [equals("uses_anabolic_steroids", true), anabolicCardiorespiratorySymptoms],
};
const anabolicLegSymptomReview: RiskCondition = {
  all: [
    equals("uses_anabolic_steroids", true),
    includes("anabolic_detail_symptoms", "leg_swelling"),
  ],
};
const anabolicNeurologicReview: RiskCondition = {
  all: [
    equals("uses_anabolic_steroids", true),
    includes("anabolic_detail_symptoms", "neurologic"),
  ],
};
const anabolicMoodReview: RiskCondition = {
  all: [
    equals("uses_anabolic_steroids", true),
    includes("anabolic_detail_symptoms", "mood"),
  ],
};
const cannabisUnwantedEffectReview: RiskCondition = {
  all: [equals("uses_cannabis", true), equals("cannabis_detail_effects", true)],
};
const stimulantSymptomReview: RiskCondition = {
  all: [
    equals("uses_nonmedical_stimulants", true),
    equals("stimulant_detail_symptoms", true),
  ],
};
const opioidMixingReview: RiskCondition = {
  all: [
    equals("uses_nonmedical_opioids", true),
    equals("opioid_detail_mixing", true),
  ],
};
const psychedelicAftereffectReview: RiskCondition = {
  all: [
    equals("uses_psychedelics", true),
    equals("psychedelic_detail_aftereffects", true),
  ],
};
const recreationalDrugEffectReview: RiskCondition = {
  all: [
    equals("uses_other_recreational_drugs", true),
    equals("recreational_detail_unwanted_effect", true),
  ],
};

const medicationReviewRules: RiskRule[] = [
  {
    id: "glp1-severe-allergy",
    group: "medication-substance-review",
    title: "Severe-allergy symptom review while using a GLP-1 medicine",
    copy:
      "Severe allergic symptoms reported while using a GLP-1 medicine are worth prompt clinical review; use the current severe-allergy question for call-now routing.",
    inputs: [
      "uses_glp1",
      "glp1_detail_product_identity",
      "glp1_detail_current_symptoms",
    ],
    sourceIds: ["nhsAnaphylaxis"],
    conditionalSources: glpLabelSources,
    evidenceTier: "authoritative-safety",
    urgency: "prompt-review",
    signal: "high-signal",
    condition: glpAllergy,
    factors: [
      factor("uses_glp1", "Current GLP-1 medicine use", equals("uses_glp1", true)),
      factor(
        "glp1_detail_current_symptoms",
        "Severe allergic symptoms reported while using it",
        includes("glp1_detail_current_symptoms", "allergy"),
      ),
    ],
    applicability: adults,
    dedupeKey: "severe-allergy",
  },
  {
    id: "glp1-gastrointestinal-review",
    group: "medication-substance-review",
    title: "GLP-1 symptom review",
    copy:
      "Severe abdominal symptoms or persistent vomiting or diarrhoea while using a GLP-1 medicine are worth prompt clinical review.",
    inputs: [
      "uses_glp1",
      "glp1_detail_product_identity",
      "glp1_detail_current_symptoms",
    ],
    sourceIds: [],
    conditionalSources: glpLabelSources,
    evidenceTier: "authoritative-safety",
    urgency: "prompt-review",
    signal: "high-signal",
    condition: glpGastrointestinal,
    factors: [
      factor("uses_glp1", "Current GLP-1 medicine use", equals("uses_glp1", true)),
      factor(
        "glp1_detail_current_symptoms",
        "Severe or persistent abdominal or gastrointestinal symptoms",
        {
          any: [
            includes("glp1_detail_current_symptoms", "abdominal"),
            includes("glp1_detail_current_symptoms", "vomiting"),
          ],
        },
      ),
    ],
    applicability: adults,
  },
  {
    id: "glp1-glucose-symptom-review",
    group: "medication-substance-review",
    title: "GLP-1 and glucose-medicine symptom review",
    copy:
      "Fainting, confusion, sweating, or shaking reported alongside insulin or a sulfonylurea is worth prompt clinical review; these answers do not establish low blood glucose.",
    inputs: [
      "uses_glp1",
      "glp1_detail_product_identity",
      "glp1_detail_glucose_medicines",
      "glp1_detail_current_symptoms",
    ],
    sourceIds: [],
    conditionalSources: glpLabelSources,
    evidenceTier: "authoritative-safety",
    urgency: "prompt-review",
    signal: "high-signal",
    condition: glpGlucoseSymptoms,
    factors: [
      factor("uses_glp1", "Current GLP-1 medicine use", equals("uses_glp1", true)),
      factor(
        "glp1_detail_glucose_medicines",
        "Insulin or sulfonylurea use also reported",
        equals("glp1_detail_glucose_medicines", true),
      ),
      factor(
        "glp1_detail_current_symptoms",
        "Fainting, confusion, sweating, or shaking reported",
        includes("glp1_detail_current_symptoms", "fainting"),
      ),
    ],
    applicability: adults,
  },
  {
    id: "glp1-diabetes-vision-review",
    group: "medication-substance-review",
    title: "Vision-change review during GLP-1 use for diabetes",
    copy:
      "Vision change reported during GLP-1 use for diabetes is worth prompt review with a qualified clinician or eye-care professional.",
    inputs: [
      "uses_glp1",
      "glp1_detail_product_identity",
      "glp1_detail_indication",
      "glp1_detail_current_symptoms",
    ],
    sourceIds: [],
    conditionalSources: glpLabelSources,
    evidenceTier: "authoritative-safety",
    urgency: "prompt-review",
    signal: "high-signal",
    condition: glpDiabetesVision,
    factors: [
      factor("uses_glp1", "Current GLP-1 medicine use", equals("uses_glp1", true)),
      factor(
        "glp1_detail_indication",
        "Diabetes reported as the treatment context",
        equals("glp1_detail_indication", "diabetes"),
      ),
      factor(
        "glp1_detail_current_symptoms",
        "Vision change reported while using it",
        includes("glp1_detail_current_symptoms", "vision"),
      ),
    ],
    applicability: adults,
  },
  {
    id: "glp1-history-review",
    group: "medication-substance-review",
    title: "GLP-1 relevant-history review",
    copy:
      "The reported medical history is worth discussing with the prescriber; this route does not decide whether the medicine is suitable.",
    inputs: [
      "uses_glp1",
      "glp1_detail_product_identity",
      "glp1_detail_relevant_history",
    ],
    sourceIds: [],
    conditionalSources: glpLabelSources,
    evidenceTier: "authoritative-safety",
    urgency: "prompt-review",
    signal: "worth-attention",
    condition: glpHistoryReview,
    factors: [
      factor("uses_glp1", "Current GLP-1 medicine use", equals("uses_glp1", true)),
      factor(
        "glp1_detail_relevant_history",
        "One or more label-relevant history items reported",
        glpRelevantHistory,
      ),
    ],
    applicability: adults,
  },
  {
    id: "glp1-pregnancy-procedure-review",
    group: "medication-substance-review",
    title: "GLP-1 pregnancy or procedure context",
    copy:
      "Pregnancy, trying to conceive, breastfeeding, or planned deep sedation or anaesthesia is worth prompt review with the prescriber or procedural team.",
    inputs: [
      "uses_glp1",
      "glp1_detail_product_identity",
      "glp1_detail_procedure_pregnancy",
    ],
    sourceIds: ["nhsPregnancyMedicines"],
    conditionalSources: glpLabelSources,
    evidenceTier: "authoritative-safety",
    urgency: "prompt-review",
    signal: "high-signal",
    condition: glpPregnancyProcedureReview,
    factors: [
      factor("uses_glp1", "Current GLP-1 medicine use", equals("uses_glp1", true)),
      factor(
        "glp1_detail_procedure_pregnancy",
        "Pregnancy, breastfeeding, or a planned procedure reported",
        glpPregnancyProcedure,
      ),
    ],
    applicability: adults,
  },
  {
    id: "isotretinoin-physical-symptom-review",
    group: "medication-substance-review",
    title: "Isotretinoin physical-symptom review",
    copy:
      "Severe headache or vision change, severe abdominal symptoms, or a blistering or peeling rash during isotretinoin use is worth prompt clinical review.",
    inputs: ["uses_isotretinoin", "isotretinoin_detail_symptoms"],
    sourceIds: ["fdaIsotretinoin"],
    evidenceTier: "authoritative-safety",
    urgency: "prompt-review",
    signal: "high-signal",
    condition: isotretinoinPhysicalReview,
    factors: [
      factor(
        "uses_isotretinoin",
        "Current oral isotretinoin use",
        equals("uses_isotretinoin", true),
      ),
      factor(
        "isotretinoin_detail_symptoms",
        "A label-relevant physical symptom was reported",
        isotretinoinPhysicalSymptoms,
      ),
    ],
    applicability: adults,
  },
  {
    id: "isotretinoin-mood-review",
    group: "medication-substance-review",
    title: "Mood or behaviour review during isotretinoin use",
    copy:
      "Mood, behaviour, or safety changes reported during isotretinoin use are worth prompt clinical and personal-safety review.",
    inputs: ["uses_isotretinoin", "isotretinoin_detail_symptoms"],
    sourceIds: ["fdaIsotretinoin", "niceSelfHarm"],
    evidenceTier: "authoritative-safety",
    urgency: "prompt-review",
    signal: "high-signal",
    condition: isotretinoinMoodReview,
    factors: [
      factor(
        "uses_isotretinoin",
        "Current oral isotretinoin use",
        equals("uses_isotretinoin", true),
      ),
      factor(
        "isotretinoin_detail_symptoms",
        "Mood, behaviour, or safety change reported",
        includes("isotretinoin_detail_symptoms", "mood"),
      ),
    ],
    applicability: adults,
    dedupeKey: "self-harm-emergency",
  },
  {
    id: "isotretinoin-pregnancy-program-review",
    group: "medication-substance-review",
    title: "Isotretinoin pregnancy-safety context",
    copy:
      "A relevant or incomplete pregnancy-safety context during isotretinoin use is worth prompt review through the required local clinician-led programme.",
    inputs: [
      "uses_isotretinoin",
      "isotretinoin_detail_program_pregnancy",
      "pregnancy_relevant",
    ],
    sourceIds: ["fdaIsotretinoin", "nhsPregnancyMedicines"],
    evidenceTier: "authoritative-safety",
    urgency: "prompt-review",
    signal: "high-signal",
    condition: isotretinoinPregnancyProgramReview,
    factors: [
      factor(
        "uses_isotretinoin",
        "Current oral isotretinoin use",
        equals("uses_isotretinoin", true),
      ),
      factor(
        "isotretinoin_detail_program_pregnancy",
        "Required pregnancy-safety steps reported as incomplete",
        equals("isotretinoin_detail_program_pregnancy", "not_complete"),
      ),
      factor(
        "pregnancy_relevant",
        "Pregnancy, trying to conceive, or breastfeeding may be relevant",
        equals("pregnancy_relevant", true),
      ),
    ],
    applicability: adults,
  },
  {
    id: "oral-minoxidil-symptom-review",
    group: "medication-substance-review",
    title: "Oral minoxidil symptom review",
    copy:
      "Cardiovascular symptoms reported while using oral minoxidil are worth prompt clinical review.",
    inputs: [
      "uses_minoxidil",
      "minoxidil_detail_route_product",
      "minoxidil_detail_cardiac_symptoms",
    ],
    sourceIds: ["fdaOralMinoxidil"],
    evidenceTier: "authoritative-safety",
    urgency: "prompt-review",
    signal: "high-signal",
    condition: {
      all: [equals("uses_minoxidil", true), oralMinoxidil, minoxidilCardiacSymptoms],
    },
    factors: [
      factor("uses_minoxidil", "Current minoxidil use", equals("uses_minoxidil", true)),
      factor(
        "minoxidil_detail_route_product",
        "Oral minoxidil route reported",
        oralMinoxidil,
      ),
      factor(
        "minoxidil_detail_cardiac_symptoms",
        "Cardiovascular symptoms reported while using it",
        minoxidilCardiacSymptoms,
      ),
    ],
    applicability: adults,
    dedupeKey: "cardiopulmonary-emergency",
  },
  {
    id: "topical-minoxidil-scalp-review",
    group: "medication-substance-review",
    title: "Topical minoxidil hair and scalp context",
    copy:
      "Sudden, patchy, unexplained hair loss or an inflamed scalp is worth clinical review before relying on a topical scalp product.",
    inputs: [
      "uses_minoxidil",
      "minoxidil_detail_route_product",
      "minoxidil_detail_hair_scalp_context",
    ],
    sourceIds: ["fdaTopicalMinoxidil"],
    evidenceTier: "authoritative-safety",
    urgency: "prompt-review",
    signal: "worth-attention",
    condition: topicalMinoxidilScalpReview,
    factors: [
      factor("uses_minoxidil", "Current minoxidil use", equals("uses_minoxidil", true)),
      factor(
        "minoxidil_detail_route_product",
        "Topical scalp route reported",
        topicalMinoxidil,
      ),
      factor(
        "minoxidil_detail_hair_scalp_context",
        "One or more hair-loss or scalp concerns reported",
        equals("minoxidil_detail_hair_scalp_context", "one_or_more"),
      ),
    ],
    applicability: adults,
  },
  {
    id: "topical-minoxidil-symptom-review",
    group: "medication-substance-review",
    title: "Topical minoxidil symptom review",
    copy:
      "Chest symptoms, rapid heartbeat, faintness, breathlessness, swelling, or sudden weight gain reported during topical minoxidil use are worth prompt clinical review.",
    inputs: [
      "uses_minoxidil",
      "minoxidil_detail_route_product",
      "minoxidil_detail_cardiac_symptoms",
    ],
    sourceIds: ["fdaTopicalMinoxidil"],
    evidenceTier: "authoritative-safety",
    urgency: "prompt-review",
    signal: "high-signal",
    condition: topicalMinoxidilSymptomReview,
    factors: [
      factor("uses_minoxidil", "Current minoxidil use", equals("uses_minoxidil", true)),
      factor(
        "minoxidil_detail_route_product",
        "Topical scalp route reported",
        topicalMinoxidil,
      ),
      factor(
        "minoxidil_detail_cardiac_symptoms",
        "Cardiovascular symptoms reported while using it",
        minoxidilCardiacSymptoms,
      ),
    ],
    applicability: adults,
    dedupeKey: "cardiopulmonary-emergency",
  },
  {
    id: "systemic-steroid-illness-review",
    group: "medication-substance-review",
    title: "Systemic corticosteroid illness context",
    copy:
      "Infection, severe illness, surgery, or major injury during systemic corticosteroid use is worth prompt prescriber or clinical review.",
    inputs: ["uses_systemic_corticosteroids", "corticosteroid_detail_infection_context"],
    sourceIds: ["eseEndocrineSocietyGlucocorticoidAdrenalInsufficiency"],
    evidenceTier: "authoritative-safety",
    urgency: "prompt-review",
    signal: "high-signal",
    condition: {
      all: [
        equals("uses_systemic_corticosteroids", true),
        {
          any: [
            includes("corticosteroid_detail_infection_context", "infection"),
            includes("corticosteroid_detail_infection_context", "exposure"),
            includes("corticosteroid_detail_infection_context", "illness"),
            includes("corticosteroid_detail_infection_context", "surgery"),
          ],
        },
      ],
    },
    factors: [
      factor(
        "uses_systemic_corticosteroids",
        "Current or recently stopped systemic corticosteroid use",
        equals("uses_systemic_corticosteroids", true),
      ),
      factor(
        "corticosteroid_detail_infection_context",
        "Illness, infection, exposure, surgery, or injury context reported",
        {
          any: [
            includes("corticosteroid_detail_infection_context", "infection"),
            includes("corticosteroid_detail_infection_context", "exposure"),
            includes("corticosteroid_detail_infection_context", "illness"),
            includes("corticosteroid_detail_infection_context", "surgery"),
          ],
        },
      ),
    ],
    applicability: adults,
  },
  {
    id: "systemic-steroid-omission-review",
    group: "medication-substance-review",
    title: "Systemic corticosteroid omission symptoms",
    copy:
      "Severe weakness, fainting, repeated vomiting, or acute illness reported after an omission in ongoing systemic corticosteroid treatment warrants prompt assessment by the prescriber or an urgent care service. This prototype cannot identify the cause or supply a dosing plan.",
    inputs: [
      "uses_systemic_corticosteroids",
      "corticosteroid_detail_missed_or_stopped",
      "corticosteroid_detail_omission_symptoms",
    ],
    sourceIds: [
      "fdaPrednisone",
      "mhraSteroidEmergencyCard",
      "eseEndocrineSocietyGlucocorticoidAdrenalInsufficiency",
    ],
    evidenceTier: "authoritative-safety",
    urgency: "prompt-review",
    signal: "high-signal",
    condition: {
      all: [
        equals("uses_systemic_corticosteroids", true),
        equals("corticosteroid_detail_missed_or_stopped", true),
        equals("corticosteroid_detail_omission_symptoms", true),
      ],
    },
    factors: [
      factor(
        "uses_systemic_corticosteroids",
        "Current or recently stopped systemic corticosteroid use",
        equals("uses_systemic_corticosteroids", true),
      ),
      factor(
        "corticosteroid_detail_missed_or_stopped",
        "A missed dose or recent stop after ongoing use was reported",
        equals("corticosteroid_detail_missed_or_stopped", true),
      ),
      factor(
        "corticosteroid_detail_omission_symptoms",
        "Severe weakness, fainting, repeated vomiting, or acute illness followed the omission",
        equals("corticosteroid_detail_omission_symptoms", true),
      ),
    ],
    applicability: adults,
  },
  {
    id: "research-product-source-review",
    group: "medication-substance-review",
    title: "Uncertain research-product source",
    copy:
      "This assessment cannot verify the identity or quality of a product from an unauthorized online source, a research-use-only seller, or an unknown source. The exact package and source are worth reviewing with a pharmacist or qualified clinician.",
    inputs: ["uses_research_peptides", "research_detail_source"],
    sourceIds: ["fdaUnapprovedDrugs", "whoSubstandardFalsifiedMedicalProducts"],
    evidenceTier: "evidence-limited-association",
    urgency: "prompt-review",
    signal: "worth-attention",
    condition: {
      all: [
        equals("uses_research_peptides", true),
        {
          any: [
            equals("research_detail_source", "unauthorized_online"),
            equals("research_detail_source", "research_use_only"),
            equals("research_detail_source", "unknown"),
          ],
        },
      ],
    },
    factors: [
      factor(
        "uses_research_peptides",
        "Current research, unapproved, or compounded injectable use",
        equals("uses_research_peptides", true),
      ),
      factor(
        "research_detail_source",
        "Unauthorized online, research-use-only, or unknown source",
        {
          any: [
            equals("research_detail_source", "unauthorized_online"),
            equals("research_detail_source", "research_use_only"),
            equals("research_detail_source", "unknown"),
          ],
        },
      ),
    ],
    applicability: adults,
  },
  {
    id: "research-product-condition-review",
    group: "medication-substance-review",
    title: "Research-product reaction review",
    copy:
      "Worsening injection-site or unexpected whole-body symptoms after a research, unapproved, or compounded product are worth prompt clinical review; this does not establish product identity or cause.",
    inputs: ["uses_research_peptides", "research_detail_storage_symptoms"],
    sourceIds: ["fdaProductProblems"],
    evidenceTier: "evidence-limited-association",
    urgency: "prompt-review",
    signal: "high-signal",
    condition: researchProductConditionReview,
    factors: [
      factor(
        "uses_research_peptides",
        "Current research, unapproved, or compounded injectable use",
        equals("uses_research_peptides", true),
      ),
      factor(
        "research_detail_storage_symptoms",
        "Injection-site or whole-body concern reported",
        researchProductReactionConcerns,
      ),
    ],
    applicability: adults,
  },
  {
    id: "research-product-storage-review",
    group: "medication-substance-review",
    title: "Research-product storage or packaging review",
    copy:
      "A warm or damaged product cannot be assessed without its exact product-specific storage and packaging instructions. Compare the label and ask a pharmacist, qualified clinician, or manufacturer before relying on it.",
    inputs: ["uses_research_peptides", "research_detail_storage_symptoms"],
    sourceIds: ["fdaMedicationStorage"],
    evidenceTier: "evidence-limited-association",
    urgency: "prompt-review",
    signal: "worth-attention",
    condition: researchProductStorageReview,
    factors: [
      factor(
        "uses_research_peptides",
        "Current research, unapproved, or compounded injectable use",
        equals("uses_research_peptides", true),
      ),
      factor(
        "research_detail_storage_symptoms",
        "Warm delivery or damaged packaging reported",
        researchProductStorageConcerns,
      ),
    ],
    applicability: adults,
  },
  {
    id: "anabolic-cardiorespiratory-review",
    group: "medication-substance-review",
    title: "AAS or SARM chest or breathing symptom review",
    copy:
      "Chest or breathing symptoms reported during anabolic, SARM, or bodybuilding-product use are worth prompt clinical review.",
    inputs: ["uses_anabolic_steroids", "anabolic_detail_symptoms"],
    sourceIds: ["fdaBodybuildingProducts", "fdaSarmsWarning"],
    evidenceTier: "authoritative-safety",
    urgency: "prompt-review",
    signal: "high-signal",
    condition: anabolicCardiorespiratoryReview,
    factors: [
      factor(
        "uses_anabolic_steroids",
        "Current anabolic, SARM, or steroid-like product use",
        equals("uses_anabolic_steroids", true),
      ),
      factor(
        "anabolic_detail_symptoms",
        "Chest pain or breathlessness reported",
        anabolicCardiorespiratorySymptoms,
      ),
    ],
    applicability: adults,
    dedupeKey: "cardiopulmonary-emergency",
  },
  {
    id: "anabolic-leg-symptom-review",
    group: "medication-substance-review",
    title: "AAS or SARM one-sided leg symptom review",
    copy:
      "One-sided leg swelling or pain reported during anabolic, SARM, or bodybuilding-product use is worth prompt clinical review.",
    inputs: ["uses_anabolic_steroids", "anabolic_detail_symptoms"],
    sourceIds: ["fdaBodybuildingProducts", "fdaSarmsWarning"],
    evidenceTier: "authoritative-safety",
    urgency: "prompt-review",
    signal: "high-signal",
    condition: anabolicLegSymptomReview,
    factors: [
      factor(
        "uses_anabolic_steroids",
        "Current anabolic, SARM, or steroid-like product use",
        equals("uses_anabolic_steroids", true),
      ),
      factor(
        "anabolic_detail_symptoms",
        "One-sided leg swelling or pain reported",
        includes("anabolic_detail_symptoms", "leg_swelling"),
      ),
    ],
    applicability: adults,
  },
  {
    id: "anabolic-neurologic-review",
    group: "medication-substance-review",
    title: "AAS or SARM neurologic symptom review",
    copy:
      "Sudden neurologic symptoms reported during anabolic, SARM, or bodybuilding-product use are worth prompt clinical review.",
    inputs: ["uses_anabolic_steroids", "anabolic_detail_symptoms"],
    sourceIds: ["fdaBodybuildingProducts", "fdaSarmsWarning", "nhsStroke"],
    evidenceTier: "authoritative-safety",
    urgency: "prompt-review",
    signal: "high-signal",
    condition: anabolicNeurologicReview,
    factors: [
      factor(
        "uses_anabolic_steroids",
        "Current anabolic, SARM, or steroid-like product use",
        equals("uses_anabolic_steroids", true),
      ),
      factor(
        "anabolic_detail_symptoms",
        "Sudden neurologic symptom reported",
        includes("anabolic_detail_symptoms", "neurologic"),
      ),
    ],
    applicability: adults,
    dedupeKey: "neurologic-emergency",
  },
  {
    id: "anabolic-mood-review",
    group: "medication-substance-review",
    title: "AAS or SARM mood and behaviour review",
    copy:
      "Severe mood or behaviour change reported during anabolic, SARM, or bodybuilding-product use is worth prompt clinical and personal-safety review.",
    inputs: ["uses_anabolic_steroids", "anabolic_detail_symptoms"],
    sourceIds: ["fdaBodybuildingProducts", "fdaSarmsWarning", "niceSelfHarm"],
    evidenceTier: "authoritative-safety",
    urgency: "prompt-review",
    signal: "high-signal",
    condition: anabolicMoodReview,
    factors: [
      factor(
        "uses_anabolic_steroids",
        "Current anabolic, SARM, or steroid-like product use",
        equals("uses_anabolic_steroids", true),
      ),
      factor(
        "anabolic_detail_symptoms",
        "Severe mood or behaviour change reported",
        includes("anabolic_detail_symptoms", "mood"),
      ),
    ],
    applicability: adults,
    dedupeKey: "self-harm-emergency",
  },
  {
    id: "cannabis-unwanted-effect-review",
    group: "medication-substance-review",
    title: "Cannabis unwanted-effect review",
    copy:
      "Unwanted anxiety, confusion, vomiting, or difficulty functioning after cannabis use is worth prompt clinical or support review.",
    inputs: ["uses_cannabis", "cannabis_detail_effects"],
    sourceIds: ["cdcCannabisEffects"],
    evidenceTier: "guideline-action",
    urgency: "prompt-review",
    signal: "worth-attention",
    condition: cannabisUnwantedEffectReview,
    factors: [
      factor("uses_cannabis", "Cannabis use in the past year", equals("uses_cannabis", true)),
      factor(
        "cannabis_detail_effects",
        "Unwanted anxiety, confusion, vomiting, or functional difficulty reported",
        equals("cannabis_detail_effects", true),
      ),
    ],
    applicability: adults,
  },
  {
    id: "stimulant-symptom-review",
    group: "medication-substance-review",
    title: "Non-prescribed stimulant symptom review",
    copy:
      "Chest pain, fainting, severe agitation, or overheating during or after non-prescribed stimulant use can need prompt clinical review; this answer does not establish that symptoms are current.",
    inputs: ["uses_nonmedical_stimulants", "stimulant_detail_symptoms"],
    sourceIds: ["fdaStimulantMisuse", "cdcStimulantOverdose"],
    evidenceTier: "authoritative-safety",
    urgency: "prompt-review",
    signal: "high-signal",
    condition: stimulantSymptomReview,
    factors: [
      factor(
        "uses_nonmedical_stimulants",
        "Non-prescribed stimulant use in the past year",
        equals("uses_nonmedical_stimulants", true),
      ),
      factor(
        "stimulant_detail_symptoms",
        "Chest pain, fainting, severe agitation, or overheating reported",
        equals("stimulant_detail_symptoms", true),
      ),
    ],
    applicability: adults,
    dedupeKey: "cardiopulmonary-emergency",
  },
  {
    id: "opioid-mixing-safety-review",
    group: "medication-substance-review",
    title: "Opioid and sedative mixing safety",
    copy:
      "Combining opioids with alcohol, benzodiazepines, sleeping medicines, or other sedatives may increase the risk of dangerous sedation and breathing problems and is worth prompt safety review.",
    inputs: ["uses_nonmedical_opioids", "opioid_detail_mixing"],
    sourceIds: ["fdaOpioidSedativeMixing", "cdcPolysubstanceOverdose"],
    evidenceTier: "authoritative-safety",
    urgency: "prompt-review",
    signal: "high-signal",
    condition: opioidMixingReview,
    factors: [
      factor(
        "uses_nonmedical_opioids",
        "Non-prescribed or differently used opioid in the past year",
        equals("uses_nonmedical_opioids", true),
      ),
      factor(
        "opioid_detail_mixing",
        "Opioid combined with alcohol or another sedative",
        equals("opioid_detail_mixing", true),
      ),
    ],
    applicability: adults,
  },
  {
    id: "psychedelic-aftereffect-review",
    group: "medication-substance-review",
    title: "Persistent psychedelic or dissociative after-effect review",
    copy:
      "Persistent perceptual changes, panic, confusion, or difficulty functioning have been reported after psychedelic or dissociative use; a qualified clinical or mental-health professional can help review them without assuming a cause.",
    inputs: ["uses_psychedelics", "psychedelic_detail_aftereffects"],
    sourceIds: ["nidaPsychedelicAfterEffects"],
    evidenceTier: "evidence-limited-association",
    urgency: "support",
    signal: "worth-attention",
    condition: psychedelicAftereffectReview,
    factors: [
      factor(
        "uses_psychedelics",
        "Psychedelic or dissociative use in the past year",
        equals("uses_psychedelics", true),
      ),
      factor(
        "psychedelic_detail_aftereffects",
        "Persistent perceptual, panic, confusion, or functional effects reported",
        equals("psychedelic_detail_aftereffects", true),
      ),
    ],
    applicability: adults,
  },
  {
    id: "recreational-drug-effect-review",
    group: "medication-substance-review",
    title: "Unexpected recreational or unknown-drug effect review",
    copy:
      "An unexpected or severe effect after a recreational or unknown drug is worth prompt clinical review because the product contents and interaction context may be uncertain.",
    inputs: ["uses_other_recreational_drugs", "recreational_detail_unwanted_effect"],
    sourceIds: ["cdcPolysubstanceOverdose", "nhsPoisoning"],
    evidenceTier: "guideline-action",
    urgency: "prompt-review",
    signal: "high-signal",
    condition: recreationalDrugEffectReview,
    factors: [
      factor(
        "uses_other_recreational_drugs",
        "Recreational or unknown-drug use in the past year",
        equals("uses_other_recreational_drugs", true),
      ),
      factor(
        "recreational_detail_unwanted_effect",
        "Unexpected or severe effect reported",
        equals("recreational_detail_unwanted_effect", true),
      ),
    ],
    applicability: adults,
  },
];

const anabolicLiverSymptoms: RiskCondition = {
  all: [
    equals("uses_anabolic_steroids", true),
    includes("anabolic_detail_symptoms", "jaundice"),
  ],
};

const liverRules: RiskRule[] = [
  {
    id: "anabolic-liver-symptom-review",
    group: "liver",
    title: "Liver-related symptom review during bodybuilding-product use",
    copy:
      "Yellow skin or eyes or dark urine during anabolic, SARM, or bodybuilding-product use is worth prompt clinical review.",
    inputs: ["uses_anabolic_steroids", "anabolic_detail_symptoms"],
    sourceIds: ["fdaBodybuildingProducts", "fdaSarmsWarning", "nhsJaundice"],
    evidenceTier: "authoritative-safety",
    urgency: "prompt-review",
    signal: "high-signal",
    condition: anabolicLiverSymptoms,
    factors: [
      factor(
        "uses_anabolic_steroids",
        "Current anabolic, SARM, or steroid-like product use",
        equals("uses_anabolic_steroids", true),
      ),
      factor(
        "anabolic_detail_symptoms",
        "Yellow skin or eyes or dark urine reported",
        includes("anabolic_detail_symptoms", "jaundice"),
      ),
    ],
    applicability: adults,
  },
];

const skinHairRules: RiskRule[] = [
  {
    id: "changing-skin-mark-review",
    group: "skin-hair",
    title: "Changing or non-healing skin mark",
    copy:
      "A new, changing, bleeding, or non-healing skin mark is worth discussing promptly with a clinician.",
    inputs: ["sun_changing_mole"],
    sourceIds: ["nhsChangingMole"],
    evidenceTier: "guideline-action",
    urgency: "prompt-review",
    signal: "high-signal",
    condition: equals("sun_changing_mole", true),
    factors: [
      factor(
        "sun_changing_mole",
        "New, changing, bleeding, or non-healing skin mark",
        equals("sun_changing_mole", true),
      ),
    ],
    applicability: adults,
  },
];

const reproductiveRules: RiskRule[] = [
  {
    id: "sexual-safety-support",
    group: "reproductive-health",
    title: "Sexual consent and safety support",
    copy:
      "Worry about pressure, consent, or safety in a sexual situation deserves confidential, person-led support. A qualified health professional or specialist support service can help; use the immediate-safety route if there is current danger.",
    inputs: ["sexual_contact_safety"],
    sourceIds: [
      "nhsSexualAssaultSupport",
      "whoSexualViolenceSurvivorCare",
      "whoChildAdolescentSexualAbuse",
    ],
    evidenceTier: "guideline-action",
    urgency: "support",
    signal: "worth-attention",
    condition: equals("sexual_contact_safety", true),
    factors: [
      factor(
        "sexual_contact_safety",
        "Worry about pressure, consent, or safety in a sexual situation",
        equals("sexual_contact_safety", true),
      ),
    ],
    applicability: { minAge: 13, countries: "all" },
  },
  {
    id: "pregnancy-new-concern-review",
    group: "reproductive-health",
    title: "New pregnancy or postpartum concern",
    copy:
      "A new or worsening concern during pregnancy or after birth is worth prompt assessment by a qualified pregnancy-care professional. This route does not identify a cause or severity.",
    inputs: ["pregnancy_relevant", "pregnancy_new_concern"],
    sourceIds: [
      "cdcPregnantPostpartum",
      "whoPregnancyHealthServices",
      "whoPostpartumHealthServices",
    ],
    evidenceTier: "guideline-action",
    urgency: "prompt-review",
    signal: "high-signal",
    condition: {
      all: [
        equals("pregnancy_relevant", true),
        equals("pregnancy_new_concern", true),
      ],
    },
    factors: [
      factor(
        "pregnancy_relevant",
        "Pregnancy, trying to conceive, breastfeeding, or a recent pregnancy may be relevant",
        equals("pregnancy_relevant", true),
      ),
      factor(
        "pregnancy_new_concern",
        "New or worsening concern during pregnancy or after birth",
        equals("pregnancy_new_concern", true),
      ),
    ],
    applicability: adults,
  },
  {
    id: "pregnancy-care-safety-support",
    group: "reproductive-health",
    title: "Pregnancy care and safety support",
    copy:
      "Limited access to pregnancy care or not feeling safe and supported is worth confidential, practical support from a qualified health professional or specialist service. Use the immediate-safety route if there is current danger.",
    inputs: [
      "pregnancy_relevant",
      "pregnancy_care_access",
      "pregnancy_feeling_safe",
    ],
    sourceIds: ["whoPregnancyHealthServices"],
    evidenceTier: "guideline-action",
    urgency: "support",
    signal: "worth-attention",
    condition: {
      all: [
        equals("pregnancy_relevant", true),
        {
          any: [
            equals("pregnancy_care_access", false),
            equals("pregnancy_feeling_safe", false),
          ],
        },
      ],
    },
    factors: [
      factor(
        "pregnancy_care_access",
        "No current access to a maternity or pregnancy-care professional",
        equals("pregnancy_care_access", false),
      ),
      factor(
        "pregnancy_feeling_safe",
        "Does not currently feel safe and supported",
        equals("pregnancy_feeling_safe", false),
      ),
    ],
    applicability: adults,
  },
  {
    id: "pregnancy-medicine-review",
    group: "reproductive-health",
    title: "Pregnancy-related medicine review",
    copy:
      "Medicines reported as not yet reviewed for a current pregnancy-related context are worth review with a qualified clinician, midwife, or pharmacist. This prototype does not determine medication suitability or supply dosing guidance.",
    inputs: ["pregnancy_relevant", "pregnancy_medication_review"],
    sourceIds: [
      "nhsPregnancyMedicines",
      "cdcMedicinePregnancy",
      "whoPregnancyMedicineSafety",
      "whoMedicationWithoutHarm",
    ],
    evidenceTier: "authoritative-safety",
    urgency: "prompt-review",
    signal: "high-signal",
    condition: {
      all: [
        equals("pregnancy_relevant", true),
        equalsAny("pregnancy_medication_review", ["planned", "no"]),
      ],
    },
    factors: [
      factor(
        "pregnancy_relevant",
        "Pregnancy, trying to conceive, breastfeeding, or a recent pregnancy may be relevant",
        equals("pregnancy_relevant", true),
      ),
      factor(
        "pregnancy_medication_review",
        "Qualified medicine review is absent or only planned",
        equalsAny("pregnancy_medication_review", ["planned", "no"]),
      ),
    ],
    applicability: adults,
  },
  {
    id: "minor-pregnancy-support",
    group: "reproductive-health",
    title: "Pregnancy-related support",
    copy:
      "Pregnancy-related questions can be discussed with a qualified, adolescent-friendly local health service. Ask what privacy rules apply before sharing details; this route does not determine pregnancy or give medicine advice.",
    inputs: ["pregnancy_relevant"],
    sourceIds: ["whoAdolescentFriendlyServices"],
    evidenceTier: "guideline-action",
    urgency: "support",
    signal: "worth-attention",
    condition: equals("pregnancy_relevant", true),
    factors: [
      factor(
        "pregnancy_relevant",
        "A pregnancy-related question or support need was reported",
        equals("pregnancy_relevant", true),
      ),
    ],
    applicability: { minAge: 13, maxAge: 17, countries: "all" },
    dedupeKey: "pregnancy-safety-emergency",
  },
];

const musculoskeletalRules: RiskRule[] = [
  {
    id: "adult-movement-pattern",
    group: "musculoskeletal",
    title: "Weekly movement pattern",
    copy:
      "Lower weekly aerobic or strength activity may be associated with poorer long-term health; personal limitations and safe options are worth discussing.",
    inputs: ["weekly_moderate_activity_minutes", "movement_strength_days"],
    sourceIds: ["cdcAdultActivity", "whoPhysicalActivity"],
    evidenceTier: "guideline-action",
    urgency: "long-term",
    signal: "worth-attention",
    condition: { any: [lowActivity, lowStrength] },
    factors: [
      factor(
        "weekly_moderate_activity_minutes",
        "Reports under 150 minutes of moderate or vigorous activity per week",
        lowActivity,
      ),
      factor(
        "movement_strength_days",
        "Reports muscle-strengthening activity on fewer than 2 days per week",
        lowStrength,
      ),
    ],
    applicability: adults,
  },
];

const preventiveRules: RiskRule[] = [
  {
    id: "eating-distress-support",
    group: "preventive-follow-up",
    title: "Eating-related distress",
    copy:
      "Distress from restriction, bingeing, fear, or food rules is worth discussing with a qualified health professional or support service.",
    inputs: ["diet_restriction_concern"],
    sourceIds: ["niceEatingDisorders"],
    evidenceTier: "guideline-action",
    urgency: "support",
    signal: "worth-attention",
    condition: equals("diet_restriction_concern", true),
    factors: [
      factor(
        "diet_restriction_concern",
        "Eating rules, restriction, bingeing, or fear causes distress",
        equals("diet_restriction_concern", true),
      ),
    ],
    applicability: adults,
  },
  {
    id: "cancer-alarm-signs-review",
    group: "preventive-follow-up",
    title: "New alarm sign worth prompt assessment",
    copy:
      "A new alarm sign such as unexplained weight loss, blood in stool or urine, coughing up blood, a growing lump, a lasting change in bowel habit, new difficulty swallowing, or unusual bleeding warrants prompt clinical assessment under suspected-cancer guidance. Most such signs turn out to have another cause.",
    inputs: ["cancer_alarm_signs"],
    sourceIds: ["niceSuspectedCancer"],
    evidenceTier: "guideline-action",
    urgency: "prompt-review",
    signal: "high-signal",
    condition: includesAny("cancer_alarm_signs", [
      "unexplained_weight_loss",
      "blood_in_stool_or_urine",
      "coughing_blood",
      "new_lump",
      "persistent_bowel_change",
      "swallowing_difficulty",
      "postmenopausal_or_unusual_bleeding",
    ]),
    factors: [
      factor(
        "cancer_alarm_signs",
        "Unexplained weight loss",
        includes("cancer_alarm_signs", "unexplained_weight_loss"),
      ),
      factor(
        "cancer_alarm_signs",
        "Blood in stool or urine",
        includes("cancer_alarm_signs", "blood_in_stool_or_urine"),
      ),
      factor(
        "cancer_alarm_signs",
        "Coughing up blood",
        includes("cancer_alarm_signs", "coughing_blood"),
      ),
      factor(
        "cancer_alarm_signs",
        "A new lump that is growing or does not go away",
        includes("cancer_alarm_signs", "new_lump"),
      ),
      factor(
        "cancer_alarm_signs",
        "A change in bowel habit lasting more than three weeks",
        includes("cancer_alarm_signs", "persistent_bowel_change"),
      ),
      factor(
        "cancer_alarm_signs",
        "New or worsening difficulty swallowing",
        includes("cancer_alarm_signs", "swallowing_difficulty"),
      ),
      factor(
        "cancer_alarm_signs",
        "Bleeding after menopause or other unusual bleeding",
        includes("cancer_alarm_signs", "postmenopausal_or_unusual_bleeding"),
      ),
    ],
    applicability: adults,
  },
];

export type RiskRuleGroupDefinition = {
  label: string;
  auditNote: string;
  rules: ReadonlyArray<RiskRule>;
};

export const riskRuleGroups: Readonly<Record<RiskGroup, RiskRuleGroupDefinition>> = {
  "immediate-red-flags": {
    label: "Immediate red flags",
    auditNote: "Uses exact structured current-safety answers only.",
    rules: [...immediateRedFlagRules, ...adolescentImmediateRedFlagRules],
  },
  cardiovascular: {
    label: "Cardiovascular signals",
    auditNote:
      "Qualitative symptom and diagnosis routes only; the SCORE2 estimate is produced by the separate validated-score module.",
    rules: cardiovascularRules,
  },
  metabolic: {
    label: "Metabolic signals",
    auditNote:
      "No qualitative rule: type 2 diabetes risk is covered by the FINDRISC score and confirmed laboratory markers in the validated-score module.",
    rules: [],
  },
  sleep: {
    label: "Sleep",
    auditNote: "Uses adult guideline actions and preserves missing daytime context.",
    rules: sleepRules,
  },
  respiratory: {
    label: "Respiratory",
    auditNote: "Keeps current emergencies separate from non-urgent change over time.",
    rules: respiratoryRules,
  },
  liver: {
    label: "Liver",
    auditNote: "Uses structured symptom tokens; printed laboratory strings are omitted.",
    rules: liverRules,
  },
  kidney: {
    label: "Kidney",
    auditNote:
      "No qualitative rule: kidney function is classified from confirmed eGFR in the validated-score module, never from printed strings.",
    rules: [],
  },
  "mental-wellbeing": {
    label: "Mental wellbeing",
    auditNote: "Correlated mood inputs form one support leaf and are not diagnostic.",
    rules: mentalWellbeingRules,
  },
  dependency: {
    label: "Dependency support",
    auditNote: "Offers non-judgmental support without inferring a disorder.",
    rules: dependencyRules,
  },
  "medication-substance-review": {
    label: "Medication and substance review",
    auditNote: "Requires exact class gates and structured options; free text is never parsed.",
    rules: medicationReviewRules,
  },
  "preventive-follow-up": {
    label: "Preventive follow-up",
    auditNote: "Uses direct support prompts rather than inferred screening schedules.",
    rules: preventiveRules,
  },
  "skin-hair": {
    label: "Skin and hair",
    auditNote: "Routes a directly reported changing lesion without diagnosis.",
    rules: skinHairRules,
  },
  "reproductive-health": {
    label: "Reproductive health",
    auditNote: "Keeps pregnancy context supportive and outside probability models.",
    rules: reproductiveRules,
  },
  musculoskeletal: {
    label: "Musculoskeletal health",
    auditNote: "Groups aerobic and strength activity into one adult context leaf.",
    rules: musculoskeletalRules,
  },
};

export const riskRules: ReadonlyArray<RiskRule> = Object.values(riskRuleGroups).flatMap(
  (group) => group.rules,
);
