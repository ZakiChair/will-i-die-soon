export type RiskRuleCopyTranslation = {
  readonly title: string;
  readonly copy: string;
};

export const riskRuleCopyFr: Readonly<Record<string, RiskRuleCopyTranslation>> = {
  "urgent-chest": {
    title: "Action cardiopulmonaire immédiate",
    copy: "Obtenez des soins d'urgence maintenant.",
  },
  "urgent-breathing": {
    title: "Action cardiopulmonaire immédiate",
    copy: "Obtenez des soins d'urgence maintenant.",
  },
  "urgent-stroke": {
    title: "Action immédiate face à des signes d'AVC",
    copy: "Obtenez des soins d'urgence maintenant.",
  },
  "urgent-severe-allergy": {
    title: "Action immédiate face à une allergie grave",
    copy: "Obtenez des soins d'urgence maintenant.",
  },
  "urgent-overdose-poisoning": {
    title: "Action immédiate face à une intoxication ou un surdosage",
    copy: "Obtenez des soins d'urgence maintenant.",
  },
  "urgent-severe-bleeding": {
    title: "Action immédiate face à un saignement grave",
    copy: "Obtenez des soins d'urgence maintenant.",
  },
  "urgent-self-harm": {
    title: "Action immédiate pour votre sécurité personnelle",
    copy: "Obtenez de l'aide d'urgence maintenant.",
  },
  "urgent-adolescent-pregnancy-safety": {
    title: "Action immédiate liée à la grossesse ou à la protection",
    copy: "Obtenez maintenant une aide urgente liée à la grossesse ou à votre protection.",
  },
  "urgent-adolescent-substance-safety": {
    title: "Action immédiate liée à la sécurité en cas de consommation de substances",
    copy: "Obtenez des soins d'urgence maintenant.",
  },
  "blood-pressure-salt-context": {
    title: "Contexte de tension artérielle et de consommation de sel",
    copy:
      "L'ajout fréquent de sel en présence d'une hypertension connue mérite d'être discuté lors d'un suivi de routine.",
  },
  "exertional-chest-pain-review": {
    title: "Gêne thoracique liée à l'effort",
    copy:
      "Une douleur, une oppression ou une lourdeur thoracique qui survient à l'effort et s'estompe au repos est le tableau typique de l'angine de poitrine et mérite d'être discutée rapidement avec un professionnel de santé, même entre les épisodes.",
  },
  "exertional-leg-pain-review": {
    title: "Douleur des jambes liée à la marche",
    copy:
      "Une douleur à type de crampe qui apparaît à la marche et cesse en quelques minutes d'arrêt est le tableau typique de l'artériopathie des membres inférieurs et mérite d'être discutée avec un professionnel de santé.",
  },
  "irregular-palpitations-review": {
    title: "Palpitations irrégulières inexpliquées",
    copy:
      "Des épisodes de battements cardiaques irréguliers, de palpitations ou d'accélération du cœur non expliqués par un effort ou une frayeur méritent d'être discutés avec un professionnel de santé, qui pourra vérifier le rythme pendant un épisode.",
  },
  "atrial-fibrillation-review": {
    title: "Trouble du rythme cardiaque connu",
    copy:
      "Un trouble du rythme diagnostiqué par un professionnel de santé, comme une fibrillation auriculaire, mérite un suivi régulier du traitement de prévention de l'AVC et du contrôle du rythme\u00a0; le score de risque cardiovasculaire affiché ailleurs ne le couvre pas.",
  },
  "adult-short-sleep": {
    title: "Habitude de sommeil court",
    copy:
      "Dormir régulièrement moins de sept heures peut être associé à une moins bonne santé et mérite d'être discuté si cela persiste ou affecte le fonctionnement pendant la journée.",
  },
  "sleep-breathing-review": {
    title: "Respiration observée pendant le sommeil",
    copy:
      "Des ronflements, étouffements ou pauses respiratoires observés avec une somnolence diurne peuvent être associés à un sommeil perturbé et méritent d'être discutés avec un professionnel de santé.",
  },
  "breathlessness-review": {
    title: "Modification de l'essoufflement à l'effort",
    copy:
      "Un essoufflement apparaissant pour un effort moindre qu'auparavant mérite d'être discuté rapidement avec un professionnel de santé, surtout s'il s'aggrave.",
  },
  "anabolic-liver-symptom-review": {
    title: "Examen de symptômes hépatiques pendant l'utilisation de produits de musculation",
    copy:
      "Une coloration jaune de la peau ou des yeux, ou des urines foncées, pendant l'utilisation d'un produit anabolisant, d'un SARM ou d'un produit de musculation mérite une évaluation clinique rapide.",
  },
  "low-mood-support": {
    title: "Schéma de baisse de l'humeur et de l'intérêt",
    copy:
      "Une humeur souvent basse ou une perte fréquente d'intérêt mérite d'être discutée avec un professionnel de santé ou une personne de confiance.",
  },
  "child-feeling-support": {
    title: "Soutien demandé",
    copy:
      "Demandez à un adulte de confiance ou à un professionnel de santé de vous aider à parler de ce que vous ressentez.",
  },
  "alcohol-control-support": {
    title: "Signal indiquant un besoin de soutien lié à l'alcool",
    copy:
      "Une préoccupation concernant le contrôle, le sevrage ou les responsabilités mérite d'être discutée avec un professionnel de santé ou un service de soutien confidentiel.",
  },
  "nicotine-support": {
    title: "Consommation actuelle de tabac ou de nicotine",
    copy:
      "La consommation actuelle de tabac ou de nicotine peut être associée à des effets nocifs à long terme\u00a0; un soutien est disponible si réduire ou arrêter constitue votre objectif.",
  },
  "adolescent-substance-support": {
    title: "Soutien demandé par un adolescent concernant la consommation de substances",
    copy:
      "Des informations générales ou une aide pour trouver un service de santé adapté à l'âge sont disponibles, sans considérer la consommation déclarée comme un diagnostic ni comme un score.",
  },
  "adolescent-substance-safety-support": {
    title: "Suivi de sécurité lié à la consommation de substances chez un adolescent",
    copy:
      "Des événements graves liés à une consommation de substances — malaise avec perte de connaissance, crise convulsive, difficulté respiratoire grave, symptôme thoracique ou inquiétude concernant la sécurité — survenus au cours de l'année écoulée mais absents actuellement méritent d'être signalés rapidement à un adulte de confiance et à un professionnel de santé qualifié.",
  },
  "glp1-severe-allergy": {
    title: "Examen de symptômes d'allergie grave pendant l'utilisation d'un médicament GLP-1",
    copy:
      "Des symptômes allergiques graves signalés pendant l'utilisation d'un médicament GLP-1 méritent une évaluation clinique rapide\u00a0; utilisez la question sur l'allergie grave actuelle pour l'orientation vers une aide immédiate.",
  },
  "glp1-gastrointestinal-review": {
    title: "Examen de symptômes pendant l'utilisation d'un GLP-1",
    copy:
      "Des symptômes abdominaux graves, ou des vomissements ou diarrhées persistants pendant l'utilisation d'un médicament GLP-1, méritent une évaluation clinique rapide.",
  },
  "glp1-glucose-symptom-review": {
    title: "Examen de symptômes liés à un GLP-1 et à des médicaments agissant sur la glycémie",
    copy:
      "Un évanouissement, une confusion, des sueurs ou des tremblements signalés avec de l'insuline ou une sulfonylurée méritent une évaluation clinique rapide\u00a0; ces réponses n'établissent pas une glycémie basse.",
  },
  "glp1-diabetes-vision-review": {
    title: "Examen d'une modification de la vision pendant l'utilisation d'un GLP-1 pour le diabète",
    copy:
      "Une modification de la vision signalée pendant l'utilisation d'un GLP-1 pour le diabète mérite une évaluation rapide par un professionnel de santé qualifié ou un professionnel des soins oculaires.",
  },
  "glp1-history-review": {
    title: "Examen des antécédents pertinents pour un GLP-1",
    copy:
      "Les antécédents médicaux déclarés méritent d'être discutés avec le prescripteur\u00a0; cette voie ne détermine pas si le médicament convient.",
  },
  "glp1-pregnancy-procedure-review": {
    title: "Contexte de grossesse ou d'intervention pendant l'utilisation d'un GLP-1",
    copy:
      "Une grossesse, un projet de grossesse, l'allaitement, une sédation profonde planifiée ou une anesthésie planifiée méritent un examen rapide avec le prescripteur ou l'équipe chargée de l'intervention.",
  },
  "isotretinoin-physical-symptom-review": {
    title: "Examen de symptômes physiques pendant l'utilisation d'isotretinoin",
    copy:
      "Pendant l'utilisation d'isotretinoin, de graves maux de tête ou une modification de la vision, des symptômes abdominaux graves, ou une éruption avec cloques ou desquamation méritent une évaluation clinique rapide.",
  },
  "isotretinoin-mood-review": {
    title: "Examen de l'humeur ou du comportement pendant l'utilisation d'isotretinoin",
    copy:
      "Des changements touchant l'humeur, le comportement ou la sécurité personnelle, signalés pendant l'utilisation d'isotretinoin, méritent une évaluation clinique rapide et un examen de la sécurité personnelle.",
  },
  "isotretinoin-pregnancy-program-review": {
    title: "Contexte de sécurité lié à la grossesse pendant l'utilisation d'isotretinoin",
    copy:
      "Un contexte de sécurité lié à la grossesse pertinent ou incomplet pendant l'utilisation d'isotretinoin mérite un examen rapide dans le cadre du programme local requis et dirigé par un professionnel de santé.",
  },
  "oral-minoxidil-symptom-review": {
    title: "Examen de symptômes pendant l'utilisation de minoxidil oral",
    copy:
      "Des symptômes cardiovasculaires signalés pendant l'utilisation de minoxidil oral méritent une évaluation clinique rapide.",
  },
  "topical-minoxidil-symptom-review": {
    title: "Examen de symptômes pendant l'utilisation de minoxidil topique",
    copy:
      "Des symptômes thoraciques, un rythme cardiaque rapide, une sensation de faiblesse, un essoufflement, un gonflement ou une prise de poids soudaine signalés pendant l'utilisation de minoxidil topique méritent une évaluation clinique rapide.",
  },
  "systemic-steroid-illness-review": {
    title: "Contexte de maladie pendant l'utilisation d'un corticostéroïde systémique",
    copy:
      "Une infection, une maladie grave, une intervention chirurgicale ou une blessure importante pendant l'utilisation d'un corticostéroïde systémique mérite un examen rapide par le prescripteur ou un professionnel de santé.",
  },
  "systemic-steroid-omission-review": {
    title: "Symptômes après omission d'un corticostéroïde systémique",
    copy:
      "Une faiblesse grave, un évanouissement, des vomissements répétés ou une maladie aiguë signalés après l'omission d'un traitement continu par corticostéroïde systémique justifient une évaluation rapide par le prescripteur ou un service de soins urgents. Ce prototype ne peut ni en déterminer la cause ni fournir un schéma posologique.",
  },
  "research-product-source-review": {
    title: "Source incertaine d'un produit de recherche",
    copy:
      "Cette évaluation ne peut pas vérifier l'identité ni la qualité d'un produit provenant d'une source en ligne non autorisée, d'un vendeur réservant le produit à la recherche ou d'une source inconnue. L'emballage exact et la source méritent d'être examinés avec un pharmacien ou un professionnel de santé qualifié.",
  },
  "research-product-condition-review": {
    title: "Examen d'une réaction à un produit de recherche",
    copy:
      "Une aggravation au point d'injection ou des symptômes généraux inattendus après un produit de recherche, non autorisé ou préparé en pharmacie méritent une évaluation clinique rapide\u00a0; cela n'établit ni l'identité du produit ni la cause.",
  },
  "research-product-storage-review": {
    title: "Examen du stockage ou de l'emballage d'un produit de recherche",
    copy:
      "Un produit reçu chaud ou endommagé ne peut pas être évalué sans ses instructions exactes de stockage et d'emballage. Comparez l'étiquette et demandez conseil à un pharmacien, à un professionnel de santé qualifié ou au fabricant avant de vous y fier.",
  },
  "anabolic-cardiorespiratory-review": {
    title: "Examen de symptômes thoraciques ou respiratoires pendant l'utilisation d'AAS ou de SARM",
    copy:
      "Des symptômes thoraciques ou respiratoires signalés pendant l'utilisation d'un produit anabolisant, d'un SARM ou d'un produit de musculation méritent une évaluation clinique rapide.",
  },
  "anabolic-leg-symptom-review": {
    title: "Examen d'un symptôme unilatéral de la jambe pendant l'utilisation d'AAS ou de SARM",
    copy:
      "Un gonflement ou une douleur d'un seul côté de la jambe, signalés pendant l'utilisation d'un produit anabolisant, d'un SARM ou d'un produit de musculation, méritent une évaluation clinique rapide.",
  },
  "anabolic-neurologic-review": {
    title: "Examen de symptômes neurologiques pendant l'utilisation d'AAS ou de SARM",
    copy:
      "Des symptômes neurologiques soudains signalés pendant l'utilisation d'un produit anabolisant, d'un SARM ou d'un produit de musculation méritent une évaluation clinique rapide.",
  },
  "anabolic-mood-review": {
    title: "Examen de l'humeur et du comportement pendant l'utilisation d'AAS ou de SARM",
    copy:
      "Un changement grave de l'humeur ou du comportement signalé pendant l'utilisation d'un produit anabolisant, d'un SARM ou d'un produit de musculation mérite une évaluation clinique rapide et un examen de la sécurité personnelle.",
  },
  "cannabis-unwanted-effect-review": {
    title: "Examen d'effets indésirables du cannabis",
    copy:
      "Une anxiété, une confusion, des vomissements ou une difficulté à fonctionner après la consommation de cannabis mérite une évaluation clinique ou un soutien rapide.",
  },
  "stimulant-symptom-review": {
    title: "Examen de symptômes liés à un stimulant non prescrit",
    copy:
      "Une douleur thoracique, un évanouissement, une agitation grave ou une surchauffe pendant ou après l'utilisation d'un stimulant non prescrit peut nécessiter une évaluation clinique rapide\u00a0; cette réponse n'établit pas que les symptômes sont actuels.",
  },
  "opioid-mixing-safety-review": {
    title: "Sécurité lors de l'association d'un opioïde et de sédatifs",
    copy:
      "Associer des opioïdes à de l'alcool, des benzodiazépines, des somnifères ou d'autres sédatifs peut augmenter le risque de sédation dangereuse et de problèmes respiratoires et mérite un examen rapide de la sécurité.",
  },
  "psychedelic-aftereffect-review": {
    title: "Examen d'effets persistants après un psychédélique ou un dissociatif",
    copy:
      "Des changements perceptifs persistants, de la panique, de la confusion ou une difficulté à fonctionner ont été signalés après l'utilisation de psychédéliques ou de dissociatifs\u00a0; un professionnel de santé qualifié ou un professionnel de la santé mentale peut aider à les examiner sans présumer de leur cause.",
  },
  "recreational-drug-effect-review": {
    title: "Examen d'un effet inattendu d'une drogue récréative ou inconnue",
    copy:
      "Un effet inattendu ou grave après une drogue récréative ou inconnue mérite une évaluation clinique rapide, car le contenu du produit et le contexte d'interaction peuvent être incertains.",
  },
  "eating-distress-support": {
    title: "Souffrance liée à l'alimentation",
    copy:
      "Une souffrance liée à la restriction, aux crises alimentaires, à la peur ou aux règles alimentaires mérite d'être discutée avec un professionnel de santé qualifié ou un service de soutien.",
  },
  "cancer-alarm-signs-review": {
    title: "Nouveau signe d'alerte méritant une évaluation rapide",
    copy:
      "Un nouveau signe d'alerte tel qu'une perte de poids inexpliquée, du sang dans les selles ou les urines, des crachats de sang, une grosseur qui grandit, un changement durable du transit, une difficulté nouvelle à avaler ou des saignements inhabituels justifie une évaluation clinique rapide selon les recommandations sur les suspicions de cancer. La plupart de ces signes ont finalement une autre cause.",
  },
  "changing-skin-mark-review": {
    title: "Marque cutanée qui change ou ne guérit pas",
    copy:
      "Une marque cutanée nouvelle, changeante, qui saigne ou ne guérit pas mérite d'être discutée rapidement avec un professionnel de santé.",
  },
  "sexual-safety-support": {
    title: "Soutien lié au consentement et à la sécurité sexuelle",
    copy:
      "Une inquiétude concernant des pressions subies, le consentement ou la sécurité dans une situation sexuelle mérite un soutien confidentiel centré sur la personne. Un professionnel de santé qualifié ou un service spécialisé peut aider\u00a0; utilisez la voie de sécurité immédiate en cas de danger actuel.",
  },
  "pregnancy-new-concern-review": {
    title: "Nouvelle préoccupation pendant la grossesse ou après l'accouchement",
    copy:
      "Une préoccupation nouvelle ou qui s'aggrave pendant la grossesse ou après l'accouchement mérite une évaluation rapide par un professionnel qualifié des soins de grossesse. Cette voie n'en détermine ni la cause ni la gravité.",
  },
  "pregnancy-care-safety-support": {
    title: "Soutien pour les soins et la sécurité pendant la grossesse",
    copy:
      "Un accès limité aux soins de grossesse ou le fait de ne pas se sentir en sécurité et soutenu mérite un soutien confidentiel et pratique auprès d'un professionnel de santé qualifié ou d'un service spécialisé. Utilisez la voie de sécurité immédiate en cas de danger actuel.",
  },
  "pregnancy-medicine-review": {
    title: "Examen des médicaments dans un contexte lié à la grossesse",
    copy:
      "Les médicaments qui n'ont pas encore été examinés dans le contexte actuel lié à la grossesse méritent un examen avec un professionnel de santé qualifié, une sage-femme ou un pharmacien. Ce prototype ne détermine pas si un médicament convient et ne fournit pas de conseil posologique.",
  },
  "minor-pregnancy-support": {
    title: "Soutien lié à la grossesse",
    copy:
      "Les questions liées à la grossesse peuvent être discutées avec un service de santé local qualifié et adapté aux adolescents. Demandez quelles règles de confidentialité s'appliquent avant de communiquer des détails\u00a0; cette voie ne détermine pas une grossesse et ne donne pas de conseil sur les médicaments.",
  },
  "adult-movement-pattern": {
    title: "Habitudes hebdomadaires de mouvement",
    copy:
      "Une activité aérobie ou de renforcement hebdomadaire plus faible peut être associée à une moins bonne santé à long terme\u00a0; les limites personnelles et les options sûres méritent d'être discutées.",
  },
  "pregnancy-complication-cardiovascular-context": {
    title: "Antécédents de grossesse comme facteur aggravant cardiovasculaire",
    copy:
      "Une pré-éclampsie ou une hypertension pendant une grossesse, un diabète gestationnel ou un accouchement prématuré doublent environ le risque cardiovasculaire ultérieur et sont considérés comme des facteurs aggravants dans les recommandations de prévention\u00a0; ils méritent d'être mentionnés lors des contrôles de tension, de glycémie et de cholestérol, même de nombreuses années plus tard.",
  },
  "early-menopause-cardiovascular-context": {
    title: "Ménopause précoce comme facteur aggravant cardiovasculaire",
    copy:
      "Une ménopause avant 45 ans est associée à un risque cardiovasculaire ultérieur plus élevé et figure parmi les facteurs aggravants des recommandations de prévention\u00a0; elle mérite d'être mentionnée lors du bilan de tension, de cholestérol et de glycémie.",
  },
  "erectile-difficulty-vascular-review": {
    title: "Difficulté érectile persistante comme signal vasculaire",
    copy:
      "Une difficulté érectile présente la plupart du temps précède souvent de plusieurs années les symptômes coronariens\u00a0; le consensus recommande une évaluation du risque cardiovasculaire plutôt qu'un traitement isolé, et le sujet mérite d'être abordé avec un professionnel de santé.",
  },
  "lung-cancer-screening-eligibility": {
    title: "Éligibilité possible au dépistage du cancer du poumon",
    copy:
      "Un tabagisme important d'environ 20 paquets-années ou plus, en cours ou arrêté depuis moins de 15 ans, correspond au profil pour lequel un scanner thoracique faible dose annuel est recommandé entre 50 et 80 ans. L'éligibilité et la disponibilité locale méritent d'être vérifiées avec un professionnel de santé\u00a0; le total de paquets-années est ici approximé à partir des cigarettes par jour et des années de tabagisme.",
  },
  "secondhand-smoke-exposure": {
    title: "Tabagisme passif régulier au domicile",
    copy:
      "Une exposition régulière à la fumée de tabac d'autres personnes au domicile est associée à davantage de maladies cardiaques, d'AVC, de cancers du poumon et d'affections respiratoires\u00a0; il n'existe pas de seuil sans risque, et un domicile entièrement sans fumée est la mesure de protection recommandée par l'OMS.",
  },
  "slow-walking-pace-review": {
    title: "Allure de marche habituelle lente",
    copy:
      "Une allure de marche habituelle jugée lente est l'un des prédicteurs simples les plus forts de la mortalité toutes causes et cardiovasculaire dans les grandes cohortes, indépendamment du poids et des minutes d'activité\u00a0; améliorer en sécurité la vitesse de marche et la force, et rechercher une cause traitable comme un essoufflement, une douleur ou un trouble de l'équilibre, méritent d'être discutés.",
  },
  "falls-risk-review": {
    title: "Dépistage du risque de chute positif",
    copy:
      "Une chute dans l'année écoulée, une sensation d'instabilité ou la peur de tomber sont les trois questions de dépistage qui signalent un risque accru de nouvelles chutes et de blessures après 60 ans. Les recommandations préconisent un bilan de la marche, de la force et de l'équilibre, une revue des médicaments et un contrôle de la vue et des dangers du domicile\u00a0; ils méritent d'être demandés à un professionnel de santé.",
  },
  "polypharmacy-review": {
    title: "Cinq médicaments réguliers ou plus",
    copy:
      "Prendre cinq médicaments réguliers ou plus est associé à davantage d'effets indésirables, de chutes et d'hospitalisations, et le risque augmente encore à partir de dix. Une revue structurée des médicaments avec un professionnel de santé ou un pharmacien, vérifiant à quoi sert encore chaque médicament et si certains peuvent être simplifiés ou arrêtés, mérite d'être demandée au moins une fois par an.",
  },
  "high-risk-medication-review": {
    title: "Classe de médicaments à fort taux d'effets graves",
    copy:
      "Les anticoagulants, l'insuline et les sulfamides hypoglycémiants, les antalgiques opioïdes et les sédatifs-hypnotiques représentent la majorité des admissions aux urgences pour effets indésirables médicamenteux, principalement par saignement, hypoglycémie, sédation excessive et chutes. Une surveillance régulière, un plan clair en cas de dose oubliée ou doublée et une liste de médicaments partagée et à jour méritent d'être confirmés avec le prescripteur ou le pharmacien.",
  },
  "financial-strain-support": {
    title: "Difficultés financières pesant sur la santé",
    copy:
      "Avoir souvent du mal à couvrir ses besoins de base est l'un des déterminants sociaux de la santé les plus puissants et est associé à des soins retardés, à un moins bon contrôle des maladies chroniques et à une mortalité plus élevée. Les travailleurs sociaux, les services de santé communautaires et les dispositifs d'aide aux frais de médicaments ou aux prestations peuvent aider\u00a0; un professionnel de santé ou un pharmacien peut aussi adapter le suivi et le traitement à ce qui est abordable.",
  },
};

export const riskFactorLabelsFr: Readonly<Record<string, string>> = {
  "Confirmed new or severe chest discomfort now":
    "Gêne thoracique nouvelle ou grave confirmée actuellement",
  "Confirmed severe breathing difficulty now":
    "Difficulté respiratoire grave confirmée actuellement",
  "Confirmed sudden stroke-like signs now or within 24 hours":
    "Signes soudains évoquant un AVC confirmés actuellement ou au cours des dernières 24 heures",
  "Confirmed airway, breathing, or collapse signs of severe allergy now":
    "Signes confirmés actuellement d'allergie grave touchant les voies respiratoires ou la respiration, ou entraînant un malaise avec perte de connaissance",
  "Confirmed suspected overdose, poisoning, or unresponsiveness now":
    "Suspicion confirmée actuellement de surdosage, d'intoxication ou d'absence de réaction",
  "Confirmed severe bleeding that is not stopping now":
    "Saignement grave qui ne s'arrête pas confirmé actuellement",
  "Confirmed immediate danger of self-harm or inability to stay safe":
    "Danger immédiat confirmé d'auto-agression ou impossibilité de rester en sécurité",
  "Pregnancy, trying to conceive, or breastfeeding may be relevant":
    "Une grossesse, un projet de grossesse ou l'allaitement peuvent être pertinents",
  "Severe pregnancy-related symptom or current pressure or safety concern reported":
    "Symptôme grave lié à la grossesse, pressions subies actuellement ou inquiétude concernant la sécurité signalés",
  "Current severe substance-related symptom or immediate safety concern reported":
    "Symptôme grave actuel lié à une substance ou inquiétude de sécurité immédiate signalé",
  "Clinician-reported high blood pressure":
    "Hypertension signalée par un professionnel de santé",
  "Adds salt at the table daily": "Ajout quotidien de sel à table",
  "Usually sleeps under 7 hours in 24 hours":
    "Sommeil habituel inférieur à 7 heures sur 24",
  "Often struggles to stay awake during quiet daytime activities":
    "Difficulté fréquente à rester éveillé pendant des activités calmes en journée",
  "Observed loud snoring, choking, or breathing pauses":
    "Ronflements forts, étouffements ou pauses respiratoires observés",
  "Frequent daytime sleepiness": "Somnolence diurne fréquente",
  "Becomes breathless with less activity than before":
    "Essoufflement pour un effort moindre qu'auparavant",
  "Effort-related chest discomfort that eases with rest":
    "Gêne thoracique liée à l'effort et calmée par le repos",
  "Walking-induced leg pain relieved by rest":
    "Douleur des jambes déclenchée par la marche et soulagée par le repos",
  "Unexplained irregular or racing heartbeat episodes":
    "Épisodes inexpliqués de battements cardiaques irréguliers ou rapides",
  "Clinician-diagnosed atrial fibrillation or irregular rhythm":
    "Fibrillation auriculaire ou trouble du rythme diagnostiqué par un professionnel de santé",
  "Unexplained weight loss": "Perte de poids inexpliquée",
  "Blood in stool or urine": "Sang dans les selles ou les urines",
  "Coughing up blood": "Crachats de sang",
  "A new lump that is growing or does not go away":
    "Une nouvelle grosseur qui grandit ou ne disparaît pas",
  "A change in bowel habit lasting more than three weeks":
    "Un changement du transit intestinal depuis plus de trois semaines",
  "New or worsening difficulty swallowing":
    "Difficulté à avaler nouvelle ou qui s'aggrave",
  "Bleeding after menopause or other unusual bleeding":
    "Saignements après la ménopause ou autres saignements inhabituels",
  "Current anabolic, SARM, or steroid-like product use":
    "Utilisation actuelle d'un produit anabolisant, d'un SARM ou d'un produit apparenté aux stéroïdes",
  "Yellow skin or eyes or dark urine reported":
    "Coloration jaune de la peau ou des yeux, ou urines foncées, signalée",
  "Frequent loss of interest or pleasure": "Perte fréquente d'intérêt ou de plaisir",
  "Frequent low or hopeless mood": "Humeur souvent basse ou sans espoir",
  "Requested help talking to a trusted adult or health professional":
    "Aide demandée pour parler à un adulte de confiance ou à un professionnel de santé",
  "Reported concern about alcohol control, withdrawal, or responsibilities":
    "Préoccupation signalée concernant le contrôle de l'alcool, le sevrage ou les responsabilités",
  "Current tobacco or nicotine use": "Consommation actuelle de tabac ou de nicotine",
  "Requested nicotine or tobacco information or service help":
    "Informations ou aide pour trouver un service demandées au sujet de la nicotine ou du tabac",
  "Requested alcohol information or service help":
    "Informations ou aide pour trouver un service demandées au sujet de l'alcool",
  "Requested cannabis information or service help":
    "Informations ou aide pour trouver un service demandées au sujet du cannabis",
  "Requested other-drug information or service help":
    "Informations ou aide pour trouver un service demandées au sujet d'autres drogues",
  "Resolved past-year severe substance-related safety event reported":
    "Événement grave de sécurité lié à une substance, survenu au cours de l'année écoulée et désormais résolu, signalé",
  "Current GLP-1 medicine use": "Utilisation actuelle d'un médicament GLP-1",
  "Severe allergic symptoms reported while using it":
    "Symptômes allergiques graves signalés pendant son utilisation",
  "Severe or persistent abdominal or gastrointestinal symptoms":
    "Symptômes abdominaux ou gastro-intestinaux graves ou persistants",
  "Insulin or sulfonylurea use also reported":
    "Utilisation d'insuline ou d'une sulfonylurée également signalée",
  "Fainting, confusion, sweating, or shaking reported":
    "Évanouissement, confusion, sueurs ou tremblements signalés",
  "Diabetes reported as the treatment context":
    "Diabète signalé comme contexte du traitement",
  "Vision change reported while using it":
    "Modification de la vision signalée pendant son utilisation",
  "One or more label-relevant history items reported":
    "Un ou plusieurs éléments d'antécédents pertinents pour la notice signalés",
  "Pregnancy, breastfeeding, or a planned procedure reported":
    "Grossesse, allaitement ou intervention planifiée signalés",
  "Current oral isotretinoin use": "Utilisation actuelle d'isotretinoin oral",
  "A label-relevant physical symptom was reported":
    "Symptôme physique pertinent pour la notice signalé",
  "Mood, behaviour, or safety change reported":
    "Changement signalé touchant l'humeur, le comportement ou la sécurité personnelle",
  "Required pregnancy-safety steps reported as incomplete":
    "Étapes requises de sécurité liée à la grossesse signalées comme incomplètes",
  "Current minoxidil use": "Utilisation actuelle de minoxidil",
  "Oral minoxidil route reported": "Voie orale du minoxidil signalée",
  "Cardiovascular symptoms reported while using it":
    "Symptômes cardiovasculaires signalés pendant son utilisation",
  "Topical scalp route reported": "Application topique sur le cuir chevelu signalée",
  "Current or recently stopped systemic corticosteroid use":
    "Utilisation actuelle ou arrêt récent d'un corticostéroïde systémique",
  "Illness, infection, exposure, surgery, or injury context reported":
    "Contexte de maladie, d'infection, d'exposition, d'intervention chirurgicale ou de blessure signalé",
  "A missed dose or recent stop after ongoing use was reported":
    "Dose omise ou arrêt récent après une utilisation continue signalé",
  "Severe weakness, fainting, repeated vomiting, or acute illness followed the omission":
    "Faiblesse grave, évanouissement, vomissements répétés ou maladie aiguë après l'omission",
  "Current research, unapproved, or compounded injectable use":
    "Utilisation actuelle d'un produit injectable de recherche, non autorisé ou préparé en pharmacie",
  "Unauthorized online, research-use-only, or unknown source":
    "Source en ligne non autorisée, réservée à la recherche ou inconnue",
  "Injection-site or whole-body concern reported":
    "Préoccupation au point d'injection ou concernant l'ensemble du corps signalée",
  "Warm delivery or damaged packaging reported":
    "Livraison chaude ou emballage endommagé signalé",
  "Chest pain or breathlessness reported": "Douleur thoracique ou essoufflement signalé",
  "One-sided leg swelling or pain reported":
    "Gonflement ou douleur d'un seul côté de la jambe signalés",
  "Sudden neurologic symptom reported": "Symptôme neurologique soudain signalé",
  "Severe mood or behaviour change reported":
    "Changement grave de l'humeur ou du comportement signalé",
  "Cannabis use in the past year": "Consommation de cannabis au cours de l'année écoulée",
  "Unwanted anxiety, confusion, vomiting, or functional difficulty reported":
    "Anxiété, confusion, vomissements ou difficultés à fonctionner signalés comme effets indésirables",
  "Non-prescribed stimulant use in the past year":
    "Utilisation d'un stimulant non prescrit au cours de l'année écoulée",
  "Chest pain, fainting, severe agitation, or overheating reported":
    "Douleur thoracique, évanouissement, agitation grave ou surchauffe signalés",
  "Non-prescribed or differently used opioid in the past year":
    "Opioïde non prescrit ou utilisé autrement que prescrit au cours de l'année écoulée",
  "Opioid combined with alcohol or another sedative":
    "Opioïde associé à de l'alcool ou à un autre sédatif",
  "Psychedelic or dissociative use in the past year":
    "Utilisation d'un psychédélique ou d'un dissociatif au cours de l'année écoulée",
  "Persistent perceptual, panic, confusion, or functional effects reported":
    "Effets perceptifs persistants, panique, confusion ou difficultés fonctionnelles signalés",
  "Recreational or unknown-drug use in the past year":
    "Utilisation d'une drogue récréative ou inconnue au cours de l'année écoulée",
  "Unexpected or severe effect reported": "Effet inattendu ou grave signalé",
  "Eating rules, restriction, bingeing, or fear causes distress":
    "Règles alimentaires, restriction, crises alimentaires ou peur causant une souffrance",
  "New, changing, bleeding, or non-healing skin mark":
    "Marque cutanée nouvelle, changeante, qui saigne ou ne guérit pas",
  "Worry about pressure, consent, or safety in a sexual situation":
    "Inquiétude concernant des pressions subies, le consentement ou la sécurité dans une situation sexuelle",
  "Pregnancy, trying to conceive, breastfeeding, or a recent pregnancy may be relevant":
    "Une grossesse, un projet de grossesse, l'allaitement ou une grossesse récente peuvent être pertinents",
  "New or worsening concern during pregnancy or after birth":
    "Préoccupation nouvelle ou qui s'aggrave pendant la grossesse ou après l'accouchement",
  "No current access to a maternity or pregnancy-care professional":
    "Aucun accès actuel à un professionnel des soins de maternité ou de grossesse",
  "Does not currently feel safe and supported":
    "Ne se sent pas actuellement en sécurité et soutenu",
  "Qualified medicine review is absent or only planned":
    "Examen des médicaments par un professionnel qualifié absent ou seulement planifié",
  "A pregnancy-related question or support need was reported":
    "Question ou besoin de soutien lié à la grossesse signalé",
  "Reports under 150 minutes of moderate or vigorous activity per week":
    "Moins de 150 minutes d'activité modérée ou intense déclarées par semaine",
  "Reports muscle-strengthening activity on fewer than 2 days per week":
    "Activité de renforcement musculaire déclarée moins de 2 jours par semaine",
  "Pre-eclampsia or high blood pressure during a pregnancy":
    "Pré-éclampsie ou hypertension pendant une grossesse",
  "Gestational diabetes": "Diabète gestationnel",
  "Delivery before 37 weeks": "Accouchement avant 37 semaines",
  "Menopause before age 45": "Ménopause avant 45 ans",
  "Erectile difficulty often or always": "Difficulté érectile souvent ou toujours",
  "Cigarettes per day and years smoked approximate 20 pack-years or more":
    "Les cigarettes par jour et les années de tabagisme approchent 20 paquets-années ou plus",
  "Years smoked contribute to the approximate pack-year total":
    "Les années de tabagisme contribuent au total approximatif de paquets-années",
  "Currently uses tobacco or nicotine": "Consomme actuellement du tabac ou de la nicotine",
  "Former smoker": "Ancien fumeur ou ancienne fumeuse",
  "Quit less than 15 years ago": "Arrêt depuis moins de 15 ans",
  "Regularly exposed to other people's smoke at home":
    "Régulièrement exposé à la fumée d'autres personnes au domicile",
  "Self-rated slow usual walking pace": "Allure de marche habituelle jugée lente",
  "Fell in the past year": "A chuté au cours de l'année écoulée",
  "Feels unsteady when standing or walking":
    "Se sent instable debout ou en marchant",
  "Worries about falling": "S'inquiète de tomber",
  "Takes regular prescription medicines": "Prend des médicaments sur ordonnance régulièrement",
  "Takes five to nine regular medicines": "Prend cinq à neuf médicaments réguliers",
  "Takes ten or more regular medicines": "Prend dix médicaments réguliers ou plus",
  "Takes an anticoagulant": "Prend un anticoagulant",
  "Takes insulin or a sulfonylurea": "Prend de l'insuline ou un sulfamide hypoglycémiant",
  "Takes an opioid painkiller": "Prend un antalgique opioïde",
  "Takes a sleeping tablet or benzodiazepine":
    "Prend un somnifère ou une benzodiazépine",
  "Often or always struggles to cover basic needs":
    "A souvent ou toujours du mal à couvrir ses besoins de base",
};
