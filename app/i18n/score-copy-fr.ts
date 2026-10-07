import type { ScoreCategoryId } from "../lib/scoring";

export const ESSENTIAL_EIGHT_LABEL_FR =
  "Life's Essential 8 — score de santé cardiovasculaire, pas un verdict de mortalité.";

export const scoreCategoryLabelsFr: Readonly<Record<ScoreCategoryId, string>> = {
  diet: "Alimentation",
  "physical-activity": "Activité physique",
  nicotine: "Exposition à la nicotine",
  sleep: "Santé du sommeil",
  "body-mass-index": "Indice de masse corporelle",
  "blood-lipids": "Lipides sanguins",
  "blood-glucose": "Glycémie",
  "blood-pressure": "Pression artérielle",
};

export const scoreComponentLabelsFr: Readonly<Record<string, string>> = {
  diet_pattern: "Profil alimentaire (questionnaire de type méditerranéen)",
  weekly_moderate_activity_minutes: "Activité hebdomadaire en équivalent modéré",
  current_tobacco_nicotine: "Exposition à la nicotine",
  usual_sleep_hours: "Durée habituelle du sommeil",
  body_mass_index: "Indice de masse corporelle",
  "lab:non_hdl_cholesterol": "Cholestérol non-HDL",
  "lab:glycaemic_status": "Statut glycémique",
  blood_pressure_systolic: "Pression artérielle",
};

export const scoreComponentExplanationsFr: Readonly<Record<string, string>> = {
  // Alimentation
  "All five diet items are needed to place the diet pattern.":
    "Les cinq questions alimentaires sont nécessaires pour situer le profil alimentaire.",
  "Your diet items place you in the top band of the Mediterranean-style screener (15–16 of 16).":
    "Vos réponses alimentaires vous situent dans la tranche la plus élevée du questionnaire de type méditerranéen (15–16 sur 16).",
  "Your diet items place you in the second band of the Mediterranean-style screener (12–14 of 16).":
    "Vos réponses alimentaires vous situent dans la deuxième tranche du questionnaire de type méditerranéen (12–14 sur 16).",
  "Your diet items place you in the middle band of the Mediterranean-style screener (8–11 of 16).":
    "Vos réponses alimentaires vous situent dans la tranche intermédiaire du questionnaire de type méditerranéen (8–11 sur 16).",
  "Your diet items place you in the fourth band of the Mediterranean-style screener (4–7 of 16).":
    "Vos réponses alimentaires vous situent dans la quatrième tranche du questionnaire de type méditerranéen (4–7 sur 16).",
  "Your diet items place you in the lowest band of the Mediterranean-style screener (0–3 of 16).":
    "Vos réponses alimentaires vous situent dans la tranche la plus basse du questionnaire de type méditerranéen (0–3 sur 16).",
  // Activité physique
  "Weekly moderate activity minutes were not answered with a valid value.":
    "Les minutes hebdomadaires d'activité modérée n'ont pas reçu de valeur valide.",
  "You reported at least 150 moderate-equivalent minutes a week (vigorous minutes count double).":
    "Vous déclarez au moins 150 minutes hebdomadaires en équivalent modéré (les minutes intenses comptent double).",
  "You reported 120–149 moderate-equivalent minutes a week.":
    "Vous déclarez 120 à 149 minutes hebdomadaires en équivalent modéré.",
  "You reported 90–119 moderate-equivalent minutes a week.":
    "Vous déclarez 90 à 119 minutes hebdomadaires en équivalent modéré.",
  "You reported 60–89 moderate-equivalent minutes a week.":
    "Vous déclarez 60 à 89 minutes hebdomadaires en équivalent modéré.",
  "You reported 30–59 moderate-equivalent minutes a week.":
    "Vous déclarez 30 à 59 minutes hebdomadaires en équivalent modéré.",
  "You reported 1–29 moderate-equivalent minutes a week.":
    "Vous déclarez 1 à 29 minutes hebdomadaires en équivalent modéré.",
  "You reported no moderate or vigorous activity in a usual week.":
    "Vous ne déclarez aucune activité modérée ou intense au cours d'une semaine habituelle.",
  // Nicotine
  "You reported using only prescribed nicotine replacement in a quit plan, scored like a quit under one year ago.":
    "Vous déclarez utiliser uniquement un substitut nicotinique prescrit dans un plan d'arrêt, compté comme un arrêt datant de moins d'un an.",
  "You reported current tobacco, vaping, or other nicotine use.":
    "Vous déclarez une consommation actuelle de tabac, de produits de vapotage ou d'une autre forme de nicotine.",
  "You reported never smoking regularly and no current nicotine use.":
    "Vous déclarez n'avoir jamais fumé régulièrement et n'utiliser aucune nicotine actuellement.",
  "You reported stopping smoking five or more years ago.":
    "Vous déclarez avoir arrêté de fumer il y a cinq ans ou plus.",
  "You reported stopping smoking one to under five years ago.":
    "Vous déclarez avoir arrêté de fumer il y a un à moins de cinq ans.",
  "You reported stopping smoking under one year ago.":
    "Vous déclarez avoir arrêté de fumer il y a moins d'un an.",
  "The current nicotine context was not resolved.":
    "Le contexte actuel de consommation de nicotine n'a pas été précisé.",
  "Past smoking history, or the time since quitting, was not answered.":
    "L'historique tabagique, ou le délai depuis l'arrêt, n'a pas été renseigné.",
  "Current tobacco or nicotine use was not answered.":
    "La consommation actuelle de tabac ou de nicotine n'a pas été renseignée.",
  // Sommeil
  "Usual sleep hours were not answered with a valid value.":
    "La durée habituelle du sommeil n'a pas reçu de valeur valide.",
  "You reported seven to under nine hours of usual sleep.":
    "Vous déclarez habituellement entre sept et moins de neuf heures de sommeil.",
  "You reported nine to under ten hours of usual sleep.":
    "Vous déclarez habituellement entre neuf et moins de dix heures de sommeil.",
  "You reported six to under seven hours of usual sleep.":
    "Vous déclarez habituellement entre six et moins de sept heures de sommeil.",
  "You reported ten or more hours of usual sleep.":
    "Vous déclarez habituellement dix heures de sommeil ou plus.",
  "You reported five to under six hours of usual sleep.":
    "Vous déclarez habituellement entre cinq et moins de six heures de sommeil.",
  "You reported four to under five hours of usual sleep.":
    "Vous déclarez habituellement entre quatre et moins de cinq heures de sommeil.",
  "You reported under four hours of usual sleep.":
    "Vous déclarez habituellement moins de quatre heures de sommeil.",
  // IMC
  "Height and weight are both needed to compute body-mass index.":
    "La taille et le poids sont tous deux nécessaires pour calculer l'indice de masse corporelle.",
  "Your body-mass index is under 25 kg/m².":
    "Votre indice de masse corporelle est inférieur à 25 kg/m².",
  "Your body-mass index is between 25 and 29.9 kg/m².":
    "Votre indice de masse corporelle est compris entre 25 et 29,9 kg/m².",
  "Your body-mass index is between 30 and 34.9 kg/m².":
    "Votre indice de masse corporelle est compris entre 30 et 34,9 kg/m².",
  "Your body-mass index is between 35 and 39.9 kg/m².":
    "Votre indice de masse corporelle est compris entre 35 et 39,9 kg/m².",
  "Your body-mass index is 40 kg/m² or more.":
    "Votre indice de masse corporelle est de 40 kg/m² ou plus.",
  // Lipides
  "Confirmed total and HDL cholesterol results are needed to compute non-HDL cholesterol.":
    "Des résultats confirmés de cholestérol total et de HDL sont nécessaires pour calculer le cholestérol non-HDL.",
  "Your non-HDL cholesterol is under 130 mg/dL (3.4 mmol/L).":
    "Votre cholestérol non-HDL est inférieur à 130 mg/dL (3,4 mmol/L).",
  "Your non-HDL cholesterol is 130–159 mg/dL (3.4–4.1 mmol/L).":
    "Votre cholestérol non-HDL est compris entre 130 et 159 mg/dL (3,4–4,1 mmol/L).",
  "Your non-HDL cholesterol is 160–189 mg/dL (4.1–4.9 mmol/L).":
    "Votre cholestérol non-HDL est compris entre 160 et 189 mg/dL (4,1–4,9 mmol/L).",
  "Your non-HDL cholesterol is 190–219 mg/dL (4.9–5.7 mmol/L).":
    "Votre cholestérol non-HDL est compris entre 190 et 219 mg/dL (4,9–5,7 mmol/L).",
  "Your non-HDL cholesterol is 220 mg/dL (5.7 mmol/L) or more.":
    "Votre cholestérol non-HDL est de 220 mg/dL (5,7 mmol/L) ou plus.",
  // Glycémie
  "Diagnosed conditions were not answered, so diabetes status is unknown.":
    "Les affections diagnostiquées n'ont pas été renseignées\u00a0; le statut diabétique est donc inconnu.",
  "A confirmed HbA1c result is needed to score glucose with diagnosed diabetes.":
    "Un résultat confirmé d'HbA1c est nécessaire pour noter la glycémie en cas de diabète diagnostiqué.",
  "You reported diagnosed diabetes with an HbA1c under 7 %.":
    "Vous avez déclaré un diabète diagnostiqué avec une HbA1c inférieure à 7 %.",
  "You reported diagnosed diabetes with an HbA1c of 7–7.9 %.":
    "Vous avez déclaré un diabète diagnostiqué avec une HbA1c de 7 à 7,9 %.",
  "You reported diagnosed diabetes with an HbA1c of 8–8.9 %.":
    "Vous avez déclaré un diabète diagnostiqué avec une HbA1c de 8 à 8,9 %.",
  "You reported diagnosed diabetes with an HbA1c of 9–9.9 %.":
    "Vous avez déclaré un diabète diagnostiqué avec une HbA1c de 9 à 9,9 %.",
  "You reported diagnosed diabetes with an HbA1c of 10 % or more.":
    "Vous avez déclaré un diabète diagnostiqué avec une HbA1c de 10 % ou plus.",
  "No diagnosed diabetes and an HbA1c under 5.7 %.":
    "Aucun diabète diagnostiqué et une HbA1c inférieure à 5,7 %.",
  "No diagnosed diabetes and an HbA1c of 5.7–6.4 %, the prediabetes range.":
    "Aucun diabète diagnostiqué et une HbA1c de 5,7 à 6,4 %, dans la zone de prédiabète.",
  "No diagnosed diabetes but an HbA1c of 6.5 % or more, which is in the diabetes range and deserves clinical confirmation.":
    "Aucun diabète diagnostiqué mais une HbA1c de 6,5 % ou plus, dans la zone du diabète, ce qui mérite une confirmation clinique.",
  "No diagnosed diabetes and a fasting glucose under 100 mg/dL (5.6 mmol/L).":
    "Aucun diabète diagnostiqué et une glycémie à jeun inférieure à 100 mg/dL (5,6 mmol/L).",
  "No diagnosed diabetes and a fasting glucose of 100–125 mg/dL (5.6–6.9 mmol/L), the prediabetes range.":
    "Aucun diabète diagnostiqué et une glycémie à jeun de 100 à 125 mg/dL (5,6–6,9 mmol/L), dans la zone de prédiabète.",
  "No diagnosed diabetes but a fasting glucose of 126 mg/dL (7.0 mmol/L) or more, which is in the diabetes range and deserves clinical confirmation.":
    "Aucun diabète diagnostiqué mais une glycémie à jeun de 126 mg/dL (7,0 mmol/L) ou plus, dans la zone du diabète, ce qui mérite une confirmation clinique.",
  "A confirmed HbA1c or fasting glucose result is needed to score glucose.":
    "Un résultat confirmé d'HbA1c ou de glycémie à jeun est nécessaire pour noter la glycémie.",
  // Pression artérielle
  "A recent systolic and diastolic reading are both needed to score blood pressure.":
    "Une mesure récente de la systolique et de la diastolique est nécessaire pour noter la pression artérielle.",
  "Your reading is under 120/80 mmHg.":
    "Votre mesure est inférieure à 120/80 mmHg.",
  "Your systolic reading is 120–129 mmHg with a diastolic under 80.":
    "Votre systolique est comprise entre 120 et 129 mmHg avec une diastolique inférieure à 80.",
  "Your reading is in the 130–139 systolic or 80–89 diastolic range.":
    "Votre mesure se situe dans la zone 130–139 de systolique ou 80–89 de diastolique.",
  "Your reading is in the 140–159 systolic or 90–99 diastolic range.":
    "Votre mesure se situe dans la zone 140–159 de systolique ou 90–99 de diastolique.",
  "Your reading is 160 systolic or 100 diastolic mmHg or more.":
    "Votre mesure atteint 160 mmHg de systolique ou 100 mmHg de diastolique, ou plus.",
};

// Suffixes ajoutés par le moteur après l'explication de base (pénalités LE8).
export const scoreExplanationSuffixesFr: Readonly<Record<string, string>> = {
  "Twenty points are removed because someone smokes indoors at your home.":
    "Vingt points sont retirés parce qu'une personne fume à l'intérieur de votre domicile.",
  "Twenty points are removed because you take a statin.":
    "Vingt points sont retirés parce que vous prenez une statine.",
  "Twenty points are removed because you take blood-pressure medicine.":
    "Vingt points sont retirés parce que vous prenez un médicament contre l'hypertension.",
};

export const scoreLedgerExplanationsFr: Readonly<Record<string, string>> = {
  "This score applies the American Heart Association Life's Essential 8 cut-points to your answers and confirmed laboratory values.":
    "Ce score applique les seuils Life's Essential 8 de l'American Heart Association à vos réponses et à vos résultats de laboratoire confirmés.",
  "Each metric is scored 0–100 as published; the total is the unweighted mean of the metrics that could be assessed.":
    "Chaque métrique est notée de 0 à 100 selon la publication\u00a0; le total est la moyenne non pondérée des métriques évaluables.",
  "Missing metrics reduce coverage rather than earning zero points; the full score needs all eight metrics.":
    "Les métriques manquantes réduisent la couverture au lieu de valoir zéro\u00a0; le score complet nécessite les huit métriques.",
};

export type ActionCopyTranslation = {
  readonly title: string;
  readonly nextStep: string;
};

export const actionCopyFr: Readonly<Record<ScoreCategoryId, ActionCopyTranslation>> = {
  diet: {
    title: "Choisissez une étape pratique concernant vos habitudes alimentaires",
    nextStep:
      "Choisissez un ajout ou un remplacement réalisable, comme une portion quotidienne de légumes, un choix de céréales complètes ou une boisson sucrée en moins, sans objectif calorique ni règle restrictive.",
  },
  "physical-activity": {
    title: "Choisissez une étape réalisable concernant le mouvement",
    nextStep:
      "Ajoutez un bloc d'activité modérée que vous pouvez tenir, comme une marche rapide de 20 à 30 minutes plus souvent\u00a0; les minutes intenses comptent double vers la cible de 150 minutes.",
  },
  nicotine: {
    title: "Choisissez le soutien lié au tabac ou à la nicotine qui vous convient",
    nextStep:
      "Si vous souhaitez modifier votre consommation actuelle, renseignez-vous auprès d'un service local qualifié, d'un pharmacien ou d'un professionnel de santé\u00a0; associer accompagnement et traitement double environ les chances d'arrêt.",
  },
  sleep: {
    title: "Choisissez une étape concernant votre routine de sommeil",
    nextStep:
      "Protégez une plage de sommeil régulière permettant sept à neuf heures, et parlez à un professionnel de santé d'un sommeil durablement court, long ou non réparateur.",
  },
  "body-mass-index": {
    title: "Replacez le poids et la composition corporelle dans leur contexte",
    nextStep:
      "L'indice de masse corporelle n'est qu'une métrique sur huit\u00a0; si vous souhaitez agir, un professionnel de santé ou un diététicien peut vous aider à définir un plan réaliste et non restrictif.",
  },
  "blood-lipids": {
    title: "Faites le point sur vos résultats de cholestérol avec un professionnel de santé",
    nextStep:
      "Un cholestérol non-HDL au-dessus de la cible mérite d'être discuté\u00a0; les mesures de mode de vie et, le cas échéant, les décisions de traitement relèvent de cette conversation.",
  },
  "blood-glucose": {
    title: "Faites le point sur vos résultats de glycémie avec un professionnel de santé",
    nextStep:
      "Un résultat en zone de prédiabète ou au-dessus de la cible mérite une conversation sur la confirmation, le suivi et les options de prévention.",
  },
  "blood-pressure": {
    title: "Faites recontrôler votre pression artérielle",
    nextStep:
      "Une mesure au-dessus de 120/80 mmHg mérite d'être répétée et, à partir de 130/80, une conversation avec un professionnel de santé sur la suite\u00a0; ne modifiez aucun médicament sur la base de ce rapport.",
  },
};

export const protectiveRootLabelsFr: Readonly<Record<string, string>> = {
  "A person you can contact for practical or emotional support":
    "Une personne que vous pouvez contacter pour obtenir un soutien pratique ou émotionnel",
  "A regular balance or coordination practice":
    "Une pratique régulière d'équilibre ou de coordination",
  "Outdoor or bright light after waking":
    "Une exposition à la lumière extérieure ou vive après le réveil",
  "A known route to timely wellbeing support":
    "Un moyen connu d'obtenir rapidement un soutien pour le bien-être",
  "A sense of community or shared activity":
    "Un sentiment d'appartenance à une communauté ou à une activité collective",
  "A current medicine list shared with a clinician or pharmacist":
    "Une liste à jour des médicaments partagée avec un professionnel de santé ou un pharmacien",
  "A regular brief stress-management practice":
    "Une pratique régulière et brève de gestion du stress",
};
