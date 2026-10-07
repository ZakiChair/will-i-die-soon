import type { Locale } from "./types";

export const CURATED_QUESTION_PROMPT_IDS = [
  "urgent_breathing_now",
  "adolescent_substance_severe_timing",
  "urgent_severe_allergy_now",
  "corticosteroid_detail_infection_context",
  "urgent_stroke_signs_now",
  "isotretinoin_detail_symptoms",
  "glp1_detail_relevant_history",
  "minoxidil_detail_cardiac_symptoms",
] as const;

export type CuratedQuestionPromptId =
  (typeof CURATED_QUESTION_PROMPT_IDS)[number];

export type QuestionPromptPresentation = Readonly<{
  title: string;
  detail?: string;
}>;

type CompleteQuestionPromptPresentation = Readonly<
  Required<QuestionPromptPresentation> & { completePrompt: string }
>;

const curatedQuestionPromptPresentations = {
  urgent_breathing_now: {
    en: {
      completePrompt: "Are you struggling to breathe, unable to speak normally, or turning blue or grey right now, or is a child grunting, sucking in under the ribs, limp, or not responding normally?",
      title: "Are there signs of severe breathing difficulty right now?",
      detail: "Struggling to breathe, being unable to speak normally, or turning blue or grey; or, for a child, grunting, sucking in under the ribs, becoming limp, or not responding normally.",
    },
    fr: {
      completePrompt: "Avez-vous actuellement de grandes difficultés à respirer, êtes-vous incapable de parler normalement, ou votre peau devient-elle bleue ou grise ? Ou bien un enfant gémit-il en respirant, sa poitrine se creuse-t-elle sous les côtes, devient-il mou ou réagit-il de façon anormale ?",
      title: "Y a-t-il actuellement des signes de détresse respiratoire grave ?",
      detail: "Grande difficulté à respirer, impossibilité de parler normalement, peau bleue ou grise ; ou, chez un enfant, geignement respiratoire, creusement sous les côtes, mollesse ou réaction anormale.",
    },
  },
  adolescent_substance_severe_timing: {
    en: {
      completePrompt: "Are collapse, a seizure, severe breathing trouble, chest pain, or another immediate substance-related safety concern happening now, or did one happen during the past twelve months?",
      title: "When did the serious substance-related event happen?",
      detail: "Collapse, a seizure, severe breathing trouble, chest pain, or another immediate substance-related safety concern — happening now or during the past twelve months.",
    },
    fr: {
      completePrompt: "Un effondrement ou une perte de connaissance, une convulsion, de graves difficultés respiratoires, une douleur thoracique ou un autre problème de sécurité immédiat lié à une substance se produit-il actuellement, ou l'un de ces événements s'est-il produit au cours des douze derniers mois ?",
      title: "Quand l’événement grave lié à une substance s’est-il produit ?",
      detail: "Effondrement ou perte de connaissance, convulsion, graves difficultés respiratoires, douleur thoracique ou autre problème de sécurité immédiat lié à une substance — actuellement ou au cours des douze derniers mois.",
    },
  },
  urgent_severe_allergy_now: {
    en: {
      completePrompt: "Do you have sudden swelling of the lips, mouth, tongue, or throat, trouble breathing or swallowing, or collapse right now?",
      title: "Are there signs of a severe allergic reaction right now?",
      detail: "Sudden swelling of the lips, mouth, tongue, or throat; trouble breathing or swallowing; or collapse.",
    },
    fr: {
      completePrompt: "Avez-vous actuellement un gonflement soudain des lèvres, de la bouche, de la langue ou de la gorge, des difficultés à respirer ou à avaler, ou vous effondrez-vous ou perdez-vous connaissance ?",
      title: "Y a-t-il actuellement des signes de réaction allergique grave ?",
      detail: "Gonflement soudain des lèvres, de la bouche, de la langue ou de la gorge ; difficultés à respirer ou à avaler ; effondrement ou perte de connaissance.",
    },
  },
  corticosteroid_detail_infection_context: {
    en: {
      completePrompt: "Do you have fever or infection signs, recent chickenpox or shingles exposure, severe illness, surgery, or major injury?",
      title: "While using corticosteroids, do any infection or major physical-stress situations apply?",
      detail: "Fever or infection signs; recent chickenpox or shingles exposure; severe illness; surgery; or major injury.",
    },
    fr: {
      completePrompt: "Avez-vous de la fièvre ou des signes d'infection, avez-vous été récemment exposé à la varicelle ou au zona, ou avez-vous une maladie sévère, une intervention chirurgicale ou une blessure grave ?",
      title: "Pendant l’utilisation de corticostéroïdes, l’une de ces situations d’infection ou de stress physique important s’applique-t-elle ?",
      detail: "Fièvre ou signes d’infection ; exposition récente à la varicelle ou au zona ; maladie sévère ; intervention chirurgicale ; ou blessure grave.",
    },
  },
  urgent_stroke_signs_now: {
    en: {
      completePrompt: "Have you had sudden facial droop, one-sided weakness, or new trouble speaking within the last 24 hours, even if the signs have stopped?",
      title: "Have there been possible stroke signs in the last 24 hours?",
      detail: "Sudden facial droop, one-sided weakness, or new trouble speaking — even if the signs have stopped.",
    },
    fr: {
      completePrompt: "Avez-vous eu un affaissement soudain du visage, une faiblesse unilatérale ou de nouvelles difficultés à parler au cours des dernières 24 heures, même si les signes ont disparu ?",
      title: "Y a-t-il eu des signes possibles d’AVC au cours des dernières 24 heures ?",
      detail: "Affaissement soudain du visage, faiblesse d’un seul côté ou nouvelles difficultés à parler — même si les signes ont disparu.",
    },
  },
  isotretinoin_detail_symptoms: {
    en: {
      completePrompt: "Have you had severe headache, vision change, severe abdominal pain, mood or behavior change, or a blistering rash?",
      title: "Have you had any serious symptoms while using isotretinoin?",
      detail: "Severe headache; vision change; severe abdominal pain; mood or behavior change; or a blistering rash.",
    },
    fr: {
      completePrompt: "Avez-vous eu de sévères maux de tête, un changement de vision, une douleur abdominale sévère, un changement d'humeur ou de comportement, ou une éruption cutanée avec des cloques ?",
      title: "Avez-vous eu des symptômes graves pendant l’utilisation d’isotrétinoïne ?",
      detail: "Maux de tête sévères ; changement de vision ; douleur abdominale sévère ; changement d’humeur ou de comportement ; ou éruption cutanée avec des cloques.",
    },
  },
  glp1_detail_relevant_history: {
    en: {
      completePrompt: "Have you had pancreatitis, gallbladder disease, severe delayed stomach emptying, kidney disease, diabetic eye disease, or MEN2?",
      title: "Do any of these medical-history factors apply to you?",
      detail: "Pancreatitis; gallbladder disease; severe delayed stomach emptying; kidney disease; diabetic eye disease; or MEN2.",
    },
    fr: {
      completePrompt: "Avez-vous eu une pancréatite, une maladie de la vésicule biliaire, un retard sévère de la vidange gastrique, une maladie rénale, une atteinte oculaire diabétique ou une MEN2 ?",
      title: "L’un de ces éléments de vos antécédents médicaux s’applique-t-il ?",
      detail: "Pancréatite ; maladie de la vésicule biliaire ; retard sévère de la vidange gastrique ; maladie rénale ; atteinte oculaire diabétique ; ou MEN2.",
    },
  },
  minoxidil_detail_cardiac_symptoms: {
    en: {
      completePrompt: "Have you had chest pain, rapid heartbeat, faintness, breathlessness, swelling, or sudden weight gain while using it?",
      title: "Have you had any concerning symptoms while using minoxidil?",
      detail: "Chest pain; rapid heartbeat; faintness; breathlessness; swelling; or sudden weight gain.",
    },
    fr: {
      completePrompt: "Pendant son utilisation, avez-vous eu une douleur thoracique, un rythme cardiaque rapide, un étourdissement ou un évanouissement, un essoufflement, un gonflement ou une prise de poids soudaine ?",
      title: "Avez-vous eu des symptômes préoccupants pendant l’utilisation de minoxidil ?",
      detail: "Douleur thoracique ; rythme cardiaque rapide ; étourdissement ou évanouissement ; essoufflement ; gonflement ; ou prise de poids soudaine.",
    },
  },
} as const satisfies Readonly<
  Record<
    CuratedQuestionPromptId,
    Readonly<Record<Locale, CompleteQuestionPromptPresentation>>
  >
>;

const curatedQuestionPromptIds = new Set<string>(CURATED_QUESTION_PROMPT_IDS);

const commonQuestionPromptPresentations = {
  usual_sleep_hours: {
    en: {
      completePrompt: "How many hours do you usually sleep in a 24-hour period?",
      title: "How long do you usually sleep?",
      detail: "Count your total sleep over 24 hours. Answer in hours.",
    },
    fr: {
      completePrompt: "Combien d'heures dormez-vous habituellement sur une période de 24 heures ?",
      title: "Combien de temps dormez-vous habituellement ?",
      detail: "Comptez votre sommeil sur une période de 24 heures. Répondez en heures.",
    },
  },
  sleep_refreshed: {
    en: {
      completePrompt: "How refreshed do you usually feel within an hour of waking?",
      title: "How rested do you feel after waking?",
      detail: "Think about how you usually feel within an hour of waking, from 0 (not at all rested) to 10 (fully rested).",
    },
    fr: {
      completePrompt: "Dans quelle mesure vous sentez-vous généralement reposé dans l'heure qui suit votre réveil ?",
      title: "À quel point vous sentez-vous reposé au réveil ?",
      detail: "Pensez à votre ressenti habituel dans l'heure qui suit le réveil, de 0 (pas du tout reposé) à 10 (complètement reposé).",
    },
  },
  reported_vo2_max_ml_kg_min: {
    en: {
      completePrompt: "What is your most recent measured or device-estimated VO₂ max?",
      title: "What is your latest VO₂ max value?",
      detail: "Use your most recent measured or device-estimated value, in ml/kg/min. You can skip if you do not know it.",
    },
    fr: {
      completePrompt: "Quel est votre VO₂ max le plus récent, mesuré ou estimé par un appareil ?",
      title: "Quelle est votre dernière valeur de VO₂ max ?",
      detail: "Indiquez votre dernière valeur mesurée ou estimée par un appareil, en ml/kg/min. Vous pouvez passer si vous ne la connaissez pas.",
    },
  },
  chair_stand_30s_count: {
    en: {
      completePrompt: "How many times can you stand up fully from a chair and sit back down in 30 seconds, arms crossed over your chest?",
      title: "How many chair stands can you do in 30 seconds?",
      detail: "Sit in the middle of a stable chair without armrests, feet flat, arms crossed over your chest. Count full stands in 30 seconds. Skip the test if you feel unsteady or are alone without support.",
    },
    fr: {
      completePrompt: "Combien de fois pouvez-vous vous lever complètement d'une chaise et vous rasseoir en 30 secondes, bras croisés sur la poitrine ?",
      title: "Combien de levers de chaise réussissez-vous en 30 secondes ?",
      detail: "Asseyez-vous au milieu d'une chaise stable sans accoudoirs, pieds à plat, bras croisés sur la poitrine. Comptez les levers complets en 30 secondes. Passez le test si vous vous sentez instable ou si vous êtes seul sans appui.",
    },
  },
  squat_one_rep_max_kg: {
    en: {
      completePrompt: "What is the heaviest squat you have already completed for one repetition?",
      title: "What is your heaviest completed squat?",
      detail: "Optional. Use the heaviest weight you have already completed for one repetition, in kilograms. Do not attempt a new maximal lift; leave the answer blank if you do not know it.",
    },
    fr: {
      completePrompt: "Quel est le squat le plus lourd que vous ayez déjà effectué pour une répétition ?",
      title: "Quelle est votre charge maximale déjà soulevée au squat ?",
      detail: "Facultatif. Indiquez la charge du squat le plus lourd déjà effectué sur une répétition, en kilogrammes. Ne tentez pas de nouvelle charge maximale ; laissez la réponse vide si vous ne la connaissez pas.",
    },
  },
  deadlift_one_rep_max_kg: {
    en: {
      completePrompt: "What is the heaviest deadlift you have already completed for one repetition?",
      title: "What is your heaviest completed deadlift?",
      detail: "Optional. Use the heaviest weight you have already completed for one repetition, in kilograms. Do not attempt a new maximal lift; leave the answer blank if you do not know it.",
    },
    fr: {
      completePrompt: "Quel est le soulevé de terre le plus lourd que vous ayez déjà effectué pour une répétition ?",
      title: "Quelle est votre charge maximale déjà soulevée au soulevé de terre ?",
      detail: "Facultatif. Indiquez la charge du soulevé de terre le plus lourd déjà effectué sur une répétition, en kilogrammes. Ne tentez pas de nouvelle charge maximale ; laissez la réponse vide si vous ne la connaissez pas.",
    },
  },
  height_cm: {
    en: {
      completePrompt: "What is your current height in centimetres?",
      title: "How tall are you?",
      detail: "Enter your current height in centimetres.",
    },
    fr: {
      completePrompt: "Quelle est votre taille actuelle en centimètres ?",
      title: "Quelle est votre taille ?",
      detail: "Indiquez votre taille actuelle en centimètres.",
    },
  },
  weight_kg: {
    en: {
      completePrompt: "What is your current weight in kilograms?",
      title: "What is your current weight?",
      detail: "Answer in kilograms. You can prefer not to answer.",
    },
    fr: {
      completePrompt: "Quel est votre poids actuel en kilogrammes ?",
      title: "Quel est votre poids actuel ?",
      detail: "Répondez en kilogrammes. Vous pouvez préférer ne pas répondre.",
    },
  },
  plant_food_frequency: {
    en: {
      completePrompt: "On a typical day, how many portions of vegetables and fruit do you eat?",
      title: "How many portions of fruit and vegetables do you eat?",
      detail: "Think about a typical day. Give the total number of portions of vegetables and fruit.",
    },
    fr: {
      completePrompt: "Au cours d'une journée typique, combien de portions de légumes et de fruits mangez-vous ?",
      title: "Combien de portions de fruits et légumes mangez-vous ?",
      detail: "Pensez à une journée habituelle. Indiquez le nombre total de portions de légumes et de fruits.",
    },
  },
  diet_ultra_processed: {
    en: {
      completePrompt: "How often are packaged ready meals, sweets, crisps, or fast food your main meal?",
      title: "How often is your main meal highly processed?",
      detail: "Consider packaged ready meals, sweets, crisps or fast food when they form your main meal.",
    },
    fr: {
      completePrompt: "À quelle fréquence les plats cuisinés emballés, les friandises, les chips ou la restauration rapide constituent-ils votre repas principal ?",
      title: "À quelle fréquence votre repas principal est-il très transformé ?",
      detail: "Pensez aux plats cuisinés emballés, aux friandises, aux chips ou à la restauration rapide lorsqu'ils constituent votre repas principal.",
    },
  },
  weekly_moderate_activity_minutes: {
    en: {
      completePrompt: "About how many minutes of moderate-intensity activity, such as brisk walking or easy cycling, do you get in a usual week?",
      title: "How many minutes of moderate activity do you get each week?",
      detail: "Count minutes of moderate activity, such as brisk walking or easy cycling, in a usual week. Vigorous activity is asked separately.",
    },
    fr: {
      completePrompt: "Environ combien de minutes d'activité d'intensité modérée, comme la marche rapide ou le vélo tranquille, pratiquez-vous au cours d'une semaine habituelle ?",
      title: "Combien de minutes d'activité modérée pratiquez-vous chaque semaine ?",
      detail: "Comptez les minutes d'activité modérée, comme la marche rapide ou le vélo tranquille, au cours d'une semaine habituelle. L'activité intense est demandée séparément.",
    },
  },
  weekly_vigorous_activity_minutes: {
    en: {
      completePrompt: "About how many minutes of vigorous activity that makes you breathe hard, such as running or fast cycling, do you get in a usual week?",
      title: "How many minutes of vigorous activity do you get each week?",
      detail: "Count minutes of activity that makes you breathe hard, such as running or fast cycling, in a usual week. Enter 0 if none.",
    },
    fr: {
      completePrompt: "Environ combien de minutes d'activité intense qui vous essouffle, comme la course ou le vélo rapide, pratiquez-vous au cours d'une semaine habituelle ?",
      title: "Combien de minutes d'activité intense pratiquez-vous chaque semaine ?",
      detail: "Comptez les minutes d'activité qui vous essouffle, comme la course ou le vélo rapide, au cours d'une semaine habituelle. Indiquez 0 si aucune.",
    },
  },
  movement_strength_days: {
    en: {
      completePrompt: "On how many days per week do you do muscle-strengthening activity?",
      title: "On how many days do you strengthen your muscles?",
      detail: "Count days in a usual week, from 0 to 7.",
    },
    fr: {
      completePrompt: "Combien de jours par semaine pratiquez-vous des activités de renforcement musculaire ?",
      title: "Combien de jours pratiquez-vous du renforcement musculaire ?",
      detail: "Comptez les jours dans une semaine habituelle, de 0 à 7.",
    },
  },
  sedentary_total_hours: {
    en: {
      completePrompt: "About how many waking hours do you spend sitting or reclining on a typical day?",
      title: "How much of your day do you spend sitting or reclining?",
      detail: "Count waking hours on a typical day. Do not count time asleep.",
    },
    fr: {
      completePrompt: "Environ combien d'heures d'éveil passez-vous assis ou allongé au cours d'une journée typique ?",
      title: "Combien de temps passez-vous assis ou allongé ?",
      detail: "Comptez les heures d'éveil dans une journée habituelle. N'incluez pas le temps de sommeil.",
    },
  },
  // Measurement steps follow the WHO STEPS manual (part 3, section 5) and the NHS blood-pressure test page.
  waist_circumference_cm: {
    en: {
      completePrompt: "What is your waist circumference in centimetres, measured at the midpoint?",
      title: "What is your waist circumference?",
      detail: "Standing, at the end of a normal breath out, place a tape measure horizontally midway between your lowest rib and the top of your hip bone, often around the navel, without squeezing. Answer in centimetres.",
    },
    fr: {
      completePrompt: "Quel est votre tour de taille en centimètres, mesuré au milieu\u00a0?",
      title: "Quel est votre tour de taille ?",
      detail: "Debout, en fin d'expiration normale, placez un mètre ruban à l'horizontale à mi-distance entre la dernière côte et le haut de l'os de la hanche, souvent au niveau du nombril, sans serrer. Répondez en centimètres.",
    },
  },
  neck_circumference_cm: {
    en: {
      completePrompt: "What is your neck circumference in centimetres, if you know it?",
      title: "What is your neck circumference?",
      detail: "Place a tape measure around your neck just below the Adam's apple, without squeezing. Answer in centimetres, or skip if you cannot measure it.",
    },
    fr: {
      completePrompt: "Quel est votre tour de cou en centimètres, si vous le connaissez\u00a0?",
      title: "Quel est votre tour de cou ?",
      detail: "Placez un mètre ruban autour du cou, juste sous la pomme d'Adam, sans serrer. Répondez en centimètres, ou passez si vous ne pouvez pas le mesurer.",
    },
  },
  has_recent_blood_pressure: {
    en: {
      completePrompt: "Do you know a blood-pressure reading taken within the past year?",
      title: "Do you know a recent blood-pressure reading?",
      detail: "A reading from the past year counts. If you have none, a pharmacy, a doctor or a validated home monitor can measure it in a few minutes.",
    },
    fr: {
      completePrompt: "Connaissez-vous une mesure de tension artérielle prise au cours de l'année écoulée\u00a0?",
      title: "Connaissez-vous une mesure récente de votre tension ?",
      detail: "Une mesure de l'année écoulée convient. Sinon, une pharmacie, un médecin ou un tensiomètre validé la mesurent en quelques minutes.",
    },
  },
  blood_pressure_systolic: {
    en: {
      completePrompt: "What was the systolic, or top, number of your most recent blood-pressure reading?",
      title: "What was the top number of your latest blood-pressure reading?",
      detail: "The systolic value is the first, higher number, in mmHg: 125 for a reading of 125/80. A reliable reading is taken seated after a few minutes of rest, with the arm supported at heart level.",
    },
    fr: {
      completePrompt: "Quel était le chiffre systolique, ou maximum, de votre lecture de tension artérielle la plus récente\u00a0?",
      title: "Quel était le chiffre du haut de votre dernière mesure de tension ?",
      detail: "La systolique est le premier chiffre, le plus élevé, en mmHg : 125 pour une tension de 125/80, parfois notée 12,5/8. Une mesure fiable se prend assis après quelques minutes de repos, le bras posé à hauteur du cœur.",
    },
  },
  blood_pressure_diastolic: {
    en: {
      completePrompt: "What was the diastolic, or bottom, number of that same blood-pressure reading?",
      title: "What was the bottom number of that blood-pressure reading?",
      detail: "The diastolic value is the second, lower number, in mmHg: 80 for a reading of 125/80.",
    },
    fr: {
      completePrompt: "Quel était le chiffre diastolique, ou minimum, de cette même mesure de tension artérielle ?",
      title: "Quel était le chiffre du bas de cette mesure de tension ?",
      detail: "La diastolique est le second chiffre, le plus bas, en mmHg : 80 pour une tension de 125/80, parfois notée 12,5/8.",
    },
  },
} as const satisfies Readonly<Record<string, Readonly<Record<Locale, CompleteQuestionPromptPresentation>>>>;

export const COMMON_QUESTION_PROMPT_IDS = Object.keys(commonQuestionPromptPresentations);

function fallback(completePrompt: string): QuestionPromptPresentation {
  return { title: completePrompt };
}

export function getQuestionPromptPresentation(
  questionId: string,
  locale: Locale,
  completePrompt: string,
): QuestionPromptPresentation {
  const presentation = curatedQuestionPromptIds.has(questionId)
    ? curatedQuestionPromptPresentations[questionId as CuratedQuestionPromptId][locale]
    : commonQuestionPromptPresentations[questionId as keyof typeof commonQuestionPromptPresentations]?.[locale];
  if (
    !presentation ||
    presentation.completePrompt !== completePrompt ||
    !presentation.title.trim() ||
    !presentation.detail.trim()
  ) {
    return fallback(completePrompt);
  }
  return { title: presentation.title, detail: presentation.detail };
}
