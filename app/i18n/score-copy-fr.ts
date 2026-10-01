import type { ScoreCategoryId } from "../lib/scoring";

export const PURITY_SCORE_LABEL_FR =
  "Purity Score — habitudes de bien-être, pas un verdict sur la santé.";

export const scoreCategoryLabelsFr: Readonly<Record<ScoreCategoryId, string>> = {
  "tobacco-nicotine": "Évitement du tabac et de la nicotine",
  alcohol: "Habitudes de consommation d'alcool",
  "movement-sitting": "Mouvement et temps passé assis",
  nutrition: "Habitudes alimentaires",
  sleep: "Routine de sommeil",
  recovery: "Pratique de gestion du stress",
  "preventive-followup": "Suivi préventif choisi",
  "medication-safety": "Comportements favorisant la sécurité des médicaments",
};

export const scoreComponentLabelsFr: Readonly<Record<string, string>> = {
  current_tobacco_nicotine: "Évitement actuel du tabac et de la nicotine",
  alcohol_frequency: "Fréquence de consommation d'alcool",
  alcohol_detail_typical_amount: "Quantité habituelle",
  alcohol_detail_heavy_episode: "Fréquence des épisodes de consommation importante",
  weekly_moderate_activity_minutes: "Activité modérée ou intense hebdomadaire",
  movement_strength_days: "Jours d'activité de renforcement",
  movement_walking_days: "Jours de marche rapide",
  sedentary_total_hours: "Temps quotidien passé assis ou allongé",
  plant_food_frequency: "Portions de légumes et de fruits",
  diet_whole_grains: "Choix de céréales complètes",
  diet_legumes: "Repas contenant des légumineuses",
  diet_processed_meat: "Fréquence de consommation de viande transformée",
  diet_sugary_drinks: "Fréquence de consommation de boissons sucrées",
  usual_sleep_hours: "Durée habituelle du sommeil",
  sleep_refreshed: "Sensation de repos au réveil",
  circadian_bedtime_variation: "Variation de l'heure du coucher",
  stress_recovery_practice: "Brève pratique de gestion du stress",
  preventive_followup_action: "Suivi préventif choisi",
  med_detail_prescriber_followup: "Suivi par le prescripteur",
  adherence_missed_doses: "Habitudes de prise des doses",
  interaction_shared_list: "Liste partagée des médicaments",
};

export const scoreComponentExplanationsFr: Readonly<Record<string, string>> = {
  "This component was not answered with a valid value.":
    "Ce composant n'a pas reçu de valeur valide.",
  "This component was not answered with a mapped option.":
    "Ce composant n'a pas reçu de réponse parmi les options prévues.",
  "You reported no current tobacco or nicotine use.":
    "Vous ne déclarez aucune consommation actuelle de tabac ou de nicotine.",
  "Prescribed nicotine replacement in a quit plan is excluded from this component.":
    "Un substitut nicotinique prescrit dans le cadre d'un plan d'arrêt est exclu de ce composant.",
  "You reported current tobacco, vaping, or other nicotine use.":
    "Vous déclarez une consommation actuelle de tabac, de produits de vapotage ou d'une autre forme de nicotine.",
  "You reported no alcohol use.": "Vous ne déclarez aucune consommation d'alcool.",
  "You reported alcohol use monthly or less.":
    "Vous déclarez consommer de l'alcool au plus une fois par mois.",
  "You reported alcohol use two to four times a month.":
    "Vous déclarez consommer de l'alcool deux à quatre fois par mois.",
  "You reported alcohol use two to three times a week.":
    "Vous déclarez consommer de l'alcool deux à trois fois par semaine.",
  "You reported alcohol use four or more times a week.":
    "Vous déclarez consommer de l'alcool au moins quatre fois par semaine.",
  "Typical amount is fully assessed because no alcohol use was reported.":
    "La quantité habituelle est entièrement évaluée puisqu'aucune consommation d'alcool n'est déclarée.",
  "You reported up to one standard drink on a usual drinking day.":
    "Vous déclarez boire au plus un verre standard lors d'une journée habituelle de consommation.",
  "You reported more than one and up to two standard drinks.":
    "Vous déclarez boire plus d'un et jusqu'à deux verres standard.",
  "You reported more than two and up to three standard drinks.":
    "Vous déclarez boire plus de deux et jusqu'à trois verres standard.",
  "You reported more than three standard drinks.":
    "Vous déclarez boire plus de trois verres standard.",
  "Heavy episodes are fully assessed because no alcohol use was reported.":
    "Les épisodes de consommation importante sont entièrement évalués puisqu'aucune consommation d'alcool n'est déclarée.",
  "You reported no heavy drinking episodes.":
    "Vous ne déclarez aucun épisode de consommation importante.",
  "You reported a heavy episode less than monthly.":
    "Vous déclarez un épisode de consommation importante moins d'une fois par mois.",
  "You reported a heavy episode monthly.":
    "Vous déclarez un épisode de consommation importante chaque mois.",
  "You reported a heavy episode weekly.":
    "Vous déclarez un épisode de consommation importante chaque semaine.",
  "You reported a heavy episode daily or almost daily.":
    "Vous déclarez un épisode de consommation importante chaque jour ou presque.",
  "You reported no moderate or vigorous activity in a usual week.":
    "Vous ne déclarez aucune activité modérée ou intense au cours d'une semaine habituelle.",
  "You reported 1–74 minutes of weekly activity.":
    "Vous déclarez 1 à 74 minutes d'activité par semaine.",
  "You reported 75–149 minutes of weekly activity.":
    "Vous déclarez 75 à 149 minutes d'activité par semaine.",
  "You reported at least 150 minutes of weekly activity.":
    "Vous déclarez au moins 150 minutes d'activité par semaine.",
  "You reported no strength-activity days.":
    "Vous ne déclarez aucun jour d'activité de renforcement.",
  "You reported one strength-activity day.":
    "Vous déclarez un jour d'activité de renforcement.",
  "You reported at least two strength-activity days.":
    "Vous déclarez au moins deux jours d'activité de renforcement.",
  "You reported no brisk-walking days.":
    "Vous ne déclarez aucun jour de marche rapide.",
  "You reported one or two brisk-walking days.":
    "Vous déclarez un ou deux jours de marche rapide.",
  "You reported three or four brisk-walking days.":
    "Vous déclarez trois ou quatre jours de marche rapide.",
  "You reported at least five brisk-walking days.":
    "Vous déclarez au moins cinq jours de marche rapide.",
  "You reported up to four waking hours sitting or reclining.":
    "Vous déclarez jusqu'à quatre heures éveillées passées en position assise ou allongée.",
  "You reported more than four and under seven sedentary hours.":
    "Vous déclarez plus de quatre et moins de sept heures de sédentarité.",
  "You reported seven to under ten sedentary hours.":
    "Vous déclarez entre sept heures et moins de dix heures de sédentarité.",
  "You reported ten or more sedentary hours.":
    "Vous déclarez au moins dix heures de sédentarité.",
  "You reported no vegetable or fruit portions on a typical day.":
    "Vous ne déclarez aucune portion de légumes ou de fruits lors d'une journée habituelle.",
  "You reported one or two vegetable or fruit portions.":
    "Vous déclarez une ou deux portions de légumes ou de fruits.",
  "You reported three or four vegetable or fruit portions.":
    "Vous déclarez trois ou quatre portions de légumes ou de fruits.",
  "You reported at least five vegetable or fruit portions.":
    "Vous déclarez au moins cinq portions de légumes ou de fruits.",
  "You reported never choosing whole grains.":
    "Vous déclarez ne jamais choisir de céréales complètes.",
  "You reported rarely choosing whole grains.":
    "Vous déclarez choisir rarement des céréales complètes.",
  "You reported sometimes choosing whole grains.":
    "Vous déclarez choisir parfois des céréales complètes.",
  "You reported often choosing whole grains.":
    "Vous déclarez choisir souvent des céréales complètes.",
  "You reported choosing whole grains daily or almost daily.":
    "Vous déclarez choisir des céréales complètes chaque jour ou presque.",
  "You reported no legume meals in a usual week.":
    "Vous ne déclarez aucun repas contenant des légumineuses au cours d'une semaine habituelle.",
  "You reported one legume meal in a usual week.":
    "Vous déclarez un repas contenant des légumineuses au cours d'une semaine habituelle.",
  "You reported two legume meals in a usual week.":
    "Vous déclarez deux repas contenant des légumineuses au cours d'une semaine habituelle.",
  "You reported at least three legume meals in a usual week.":
    "Vous déclarez au moins trois repas contenant des légumineuses au cours d'une semaine habituelle.",
  "You reported never eating processed meat.":
    "Vous déclarez ne jamais consommer de viande transformée.",
  "You reported rarely eating processed meat.":
    "Vous déclarez consommer rarement de la viande transformée.",
  "You reported sometimes eating processed meat.":
    "Vous déclarez consommer parfois de la viande transformée.",
  "You reported often eating processed meat.":
    "Vous déclarez consommer souvent de la viande transformée.",
  "You reported eating processed meat daily or almost daily.":
    "Vous déclarez consommer de la viande transformée chaque jour ou presque.",
  "You reported no sugary drinks in a usual week.":
    "Vous ne déclarez aucune boisson sucrée au cours d'une semaine habituelle.",
  "You reported one sugary drink in a usual week.":
    "Vous déclarez une boisson sucrée au cours d'une semaine habituelle.",
  "You reported two or three sugary drinks in a usual week.":
    "Vous déclarez deux ou trois boissons sucrées au cours d'une semaine habituelle.",
  "You reported four to six sugary drinks in a usual week.":
    "Vous déclarez quatre à six boissons sucrées au cours d'une semaine habituelle.",
  "You reported seven or more sugary drinks in a usual week.":
    "Vous déclarez au moins sept boissons sucrées au cours d'une semaine habituelle.",
  "You reported under six hours of usual sleep.":
    "Vous déclarez habituellement moins de six heures de sommeil.",
  "You reported six to under seven hours of usual sleep.":
    "Vous déclarez habituellement entre six heures et moins de sept heures de sommeil.",
  "You reported at least seven hours of usual sleep.":
    "Vous déclarez habituellement au moins sept heures de sommeil.",
  "You placed refreshed sleep in the 0–2 band.":
    "Vous situez la sensation de repos après le sommeil dans la plage de 0 à 2.",
  "You placed refreshed sleep in the 3–4 band.":
    "Vous situez la sensation de repos après le sommeil dans la plage de 3 à 4.",
  "You placed refreshed sleep in the 5–6 band.":
    "Vous situez la sensation de repos après le sommeil dans la plage de 5 à 6.",
  "You placed refreshed sleep in the 7–8 band.":
    "Vous situez la sensation de repos après le sommeil dans la plage de 7 à 8.",
  "You placed refreshed sleep in the 9–10 band.":
    "Vous situez la sensation de repos après le sommeil dans la plage de 9 à 10.",
  "You reported up to one hour of bedtime variation.":
    "Vous déclarez une variation de l'heure du coucher allant jusqu'à une heure.",
  "You reported more than one and up to two hours of bedtime variation.":
    "Vous déclarez une variation de l'heure du coucher de plus d'une heure et jusqu'à deux heures.",
  "You reported more than two and up to three hours of bedtime variation.":
    "Vous déclarez une variation de l'heure du coucher de plus de deux heures et jusqu'à trois heures.",
  "You reported more than three hours of bedtime variation.":
    "Vous déclarez une variation de l'heure du coucher supérieure à trois heures.",
  "You reported never practising a brief stress-management skill.":
    "Vous déclarez ne jamais pratiquer une brève technique de gestion du stress.",
  "You reported rarely practising a brief stress-management skill.":
    "Vous déclarez pratiquer rarement une brève technique de gestion du stress.",
  "You reported sometimes practising a brief stress-management skill.":
    "Vous déclarez pratiquer parfois une brève technique de gestion du stress.",
  "You reported often practising a brief stress-management skill.":
    "Vous déclarez pratiquer souvent une brève technique de gestion du stress.",
  "You reported practising a brief stress-management skill daily or almost daily.":
    "Vous déclarez pratiquer une brève technique de gestion du stress chaque jour ou presque.",
  "You reported that no routine follow-up was personally due.":
    "Vous déclarez qu'aucun suivi de routine ne s'appliquait à votre situation.",
  "You reported an access or safety barrier to a personally chosen follow-up.":
    "Vous déclarez un obstacle d'accès ou de sécurité concernant un suivi choisi personnellement.",
  "The chosen follow-up action was not answered.":
    "Aucune réponse n'a été donnée concernant l'action de suivi choisie.",
  "You reported completing a personally due follow-up.":
    "Vous déclarez avoir effectué un suivi qui s'appliquait à votre situation.",
  "You reported booking or contacting a service about a personally due follow-up.":
    "Vous déclarez avoir pris rendez-vous ou contacté un service au sujet d'un suivi qui s'appliquait à votre situation.",
  "You reported not yet acting on a personally due follow-up.":
    "Vous déclarez ne pas encore avoir agi concernant un suivi qui s'appliquait à votre situation.",
  "Whether a chosen preventive follow-up applies is unresolved.":
    "Il reste à déterminer si le suivi préventif choisi s'applique à votre situation.",
  "This component does not apply because you reported no current prescription medicines.":
    "Ce composant ne s'applique pas, car vous ne déclarez aucun médicament sur ordonnance actuellement.",
  "Current prescription-medicine use is unresolved.":
    "L'utilisation actuelle de médicaments sur ordonnance n'est pas établie.",
  "You reported no current access to prescriber follow-up.":
    "Vous déclarez ne pas avoir actuellement accès à un suivi par le prescripteur.",
  "You reported prescriber follow-up for all current medicines.":
    "Vous déclarez un suivi par le prescripteur pour tous les médicaments actuels.",
  "You reported prescriber follow-up for some current medicines.":
    "Vous déclarez un suivi par le prescripteur pour certains médicaments actuels.",
  "You reported no prescriber follow-up for current medicines.":
    "Vous ne déclarez aucun suivi par le prescripteur pour les médicaments actuels.",
  "A medicine access or use barrier was reported, so dose-taking is excluded.":
    "Un obstacle à l'accès aux médicaments ou à leur utilisation a été signalé\u00a0; ce composant relatif aux habitudes de prise est donc exclu du calcul.",
  "You reported never missing, delaying, or repeating a dose.":
    "Vous déclarez ne jamais omettre, retarder ou répéter une dose.",
  "You reported rarely missing, delaying, or repeating a dose.":
    "Vous déclarez omettre, retarder ou répéter rarement une dose.",
  "You reported this happening a few times a month.":
    "Vous déclarez que cela se produit quelques fois par mois.",
  "You reported this happening at least weekly.":
    "Vous déclarez que cela se produit au moins chaque semaine.",
  "You reported that a clinician or pharmacist has a current medicine list.":
    "Vous déclarez qu'un professionnel de santé ou un pharmacien dispose d'une liste à jour de vos médicaments.",
  "You reported that no clinician or pharmacist has a current medicine list.":
    "Vous déclarez qu'aucun professionnel de santé ni pharmacien ne dispose d'une liste à jour de vos médicaments.",
  "A shared current medicine list was not answered.":
    "Aucune réponse n'a été donnée concernant une liste à jour et partagée des médicaments.",
};

export const scoreLedgerExplanationsFr: Readonly<Record<string, string>> = {
  "This transparent index uses only answered, modifiable wellness habits.":
    "Cet indice transparent utilise uniquement les habitudes de bien-être modifiables pour lesquelles une réponse a été fournie.",
  "The point weights are product choices, not disease probabilities or clinical coefficients.":
    "La pondération des points relève de choix de conception du produit, et non de probabilités de maladie ni de coefficients cliniques.",
  "Missing answers reduce coverage rather than earning zero points.":
    "Les réponses manquantes réduisent la couverture au lieu d'attribuer zéro point.",
};

export type ActionCopyTranslation = {
  readonly title: string;
  readonly nextStep: string;
};

export const actionCopyFr: Readonly<Record<ScoreCategoryId, ActionCopyTranslation>> = {
  "tobacco-nicotine": {
    title: "Choisissez le soutien lié au tabac ou à la nicotine qui vous convient",
    nextStep:
      "Si vous souhaitez modifier votre consommation actuelle, choisissez une première étape volontaire\u00a0: renseignez-vous auprès d'un service local qualifié, d'un pharmacien ou d'un professionnel de santé sur les options de soutien.",
  },
  alcohol: {
    title: "Choisissez une étape concernant vos habitudes de consommation d'alcool",
    nextStep:
      "Si vous souhaitez modifier ces habitudes, choisissez une occasion réalisable sans alcool ou demandez un soutien sans jugement auprès d'un service local qualifié.",
  },
  "movement-sitting": {
    title: "Choisissez une étape réalisable concernant le mouvement ou le temps passé assis",
    nextStep:
      "Choisissez un petit changement de mouvement ou une pause dans le temps passé assis qui soit adapté à votre corps, à votre accès, à votre travail et à votre sécurité.",
  },
  nutrition: {
    title: "Choisissez une étape pratique concernant vos habitudes alimentaires",
    nextStep:
      "Choisissez un ajout ou un remplacement réalisable à partir des habitudes déclarées, sans objectif calorique ni règle alimentaire restrictive.",
  },
  sleep: {
    title: "Choisissez une étape concernant votre routine de sommeil",
    nextStep:
      "Choisissez un changement de routine réalisable, par exemple préserver votre temps de sommeil ou rendre l'heure du coucher plus régulière.",
  },
  recovery: {
    title: "Essayez une brève pratique de gestion du stress",
    nextStep:
      "Choisissez de vous ancrer, de vous décrocher des pensées difficiles, d'agir en accord avec vos valeurs, d'être bienveillant ou de faire de la place à ce que vous ressentez, puis pratiquez pendant quelques minutes aujourd'hui.",
  },
  "preventive-followup": {
    title: "Faites une étape concernant le suivi choisi",
    nextStep:
      "Si cela reste réalisable et sûr, choisissez de contacter le service concerné ou de prendre rendez-vous.",
  },
  "medication-safety": {
    title: "Renforcez une routine de sécurité des médicaments",
    nextStep:
      "Choisissez une étape réalisable, comme mettre à jour votre liste de médicaments ou poser une question à un pharmacien ou au prescripteur\u00a0; ne modifiez pas une dose sur la base de ce rapport.",
  },
};

export const bookedPreventiveActionCopyFr: ActionCopyTranslation = {
  title: "Poursuivez le suivi déjà engagé",
  nextStep:
    "Un rendez-vous est déjà pris ou un service a déjà été contacté\u00a0; si cela reste réalisable et sûr, choisissez une petite étape qui vous aide à vous y rendre ou à vous préparer.",
};

export const accessSupportCopyFr: ActionCopyTranslation = {
  title: "Commencez par un soutien pratique concernant l'accès et la sécurité",
  nextStep:
    "Si vous souhaitez un soutien, choisissez un service local qualifié, un pharmacien, un professionnel de santé ou une personne de confiance capable de tenir compte de l'obstacle indiqué.",
};

export const accessSupportReasonClausesFr: Readonly<Record<string, string>> = {
  "Chosen preventive follow-up: You reported an access or safety barrier to a personally chosen follow-up.":
    `${scoreCategoryLabelsFr["preventive-followup"]}\u00a0: ${scoreComponentExplanationsFr["You reported an access or safety barrier to a personally chosen follow-up."]}`,
  "Medication-safety behaviour: You reported no current access to prescriber follow-up.":
    `${scoreCategoryLabelsFr["medication-safety"]}\u00a0: ${scoreComponentExplanationsFr["You reported no current access to prescriber follow-up."]}`,
  "Medication-safety behaviour: A medicine access or use barrier was reported, so dose-taking is excluded.":
    `${scoreCategoryLabelsFr["medication-safety"]}\u00a0: ${scoreComponentExplanationsFr["A medicine access or use barrier was reported, so dose-taking is excluded."]}`,
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
