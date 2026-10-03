# Estimations complétables : fourchettes, « X sur 100 », gain à profil égal et orientation

Demande du propriétaire (2 octobre 2026) : prototype privé maintenant, public plus tard. Estimer chaque pathologie aussi souvent que possible avec des chiffres frappants mais honnêtes, pour orienter vers un professionnel et vers l'activité, l'alimentation et le sommeil. Phase 1 sans nouveau modèle (ce document), puis phase 2 (SCORE2 toutes régions, OMS 2019, SCORE2-Diabetes, autres pays) après validation de la liste par le propriétaire.

## Constat de départ

- La synthèse `pathology-scores-v1` produit huit instruments. Avec le jeu de réponses de test FINDRISC (profondeur Quick), un seul est complet ; six sont « incomplets » et n'affichent que la liste des entrées manquantes, sans aucune piste chiffrée ni moyen de compléter sans recommencer le questionnaire.
- Express (9 questions, sans sexe, tabac ni alcool) n'affiche aucune synthèse : `Results` passe `pathologyRisk = null`.
- Les pourcentages publiés (FINDRISC, SCORE2, CAIDE) sont affichés en « % à N ans », une forme peu lisible pour le grand public. Aucune carte ne dit quoi faire du résultat.
- Les questions de mesure (tour de taille, tour de cou, tension) n'expliquent pas comment mesurer ; le bouton « Je ne connais pas cette mesure » ferme la porte sans piste.

## Périmètre

1. **Compléter mes estimations** : après les résultats (Express compris, adultes seulement), poser uniquement les questions manquantes, instrument par instrument ou toutes à la fois, avec l'import de bilan pour les entrées `lab:*`. Les réponses complètent l'évaluation en place ; tout le résultat est recalculé.
2. **Fourchettes** : quand il manque au plus deux réponses déclaratives, afficher l'intervalle des résultats possibles (points, catégories et, si la politique l'autorise, pourcentages publiés).
3. **« X sur 100 »** : pictogramme de 100 personnes et phrase « environ X sur 100 » pour les instruments à pourcentage publié ; **gain à profil égal** : même calcul avec les habitudes saines (activité, fruits et légumes, arrêt du tabac), le reste inchangé.
4. **Orientation par pathologie** : une conduite à tenir courte et sourcée par instrument et catégorie.
5. **Aide à la mesure** pour le tour de taille, le tour de cou et la tension systolique.

Hors périmètre (phase 2) : nouveaux modèles et régions SCORE2, nouveaux pays et ressources locales. Aucun chiffre n'est produit pour les mineurs, hors des âges validés (SCORE2 < 40 ans, CAIDE hors 40–64 ans, COPD-PS < 35 ans) ni sans tension mesurée.

## Fourchettes (`range` sur un résultat `incomplete`)

Le statut reste `incomplete` : une fourchette n'est pas un score. Elle est calculée en réévaluant l'instrument lui-même avec chaque valeur possible des réponses manquantes ; aucune logique de score n'est dupliquée.

- Conditions : au plus **deux** entrées manquantes, toutes « énumérables » ; **chaque** combinaison doit donner un résultat `complete`. Si une combinaison rend l'instrument non applicable (par exemple `cvd_event_history = oui` pour SCORE2) ou en ouvre d'autres (fréquence d'alcool inconnue), aucune fourchette n'est affichée.
- Entrées énumérables : questions oui/non et à choix unique (toutes les options notées ; l'option « je ne sais pas » des items `sleep_snoring`, `sleep_witnessed_apnea` et `family_diabetes` est exclue puisqu'elle n'est pas notée), plus quatre nombres sondés à chaque seuil de cotation :

| Entrée | Valeurs sondées | Seuils couverts |
| --- | --- | --- |
| `waist_circumference_cm` | 70, 85, 98, 110 | FINDRISC femmes < 80 / 80–88 / > 88 ; hommes < 94 / 94–102 / > 102 |
| `neck_circumference_cm` | 35, 45 | STOP-Bang > 40 cm |
| `plant_food_frequency` | 0, 2 | FINDRISC ≥ 1 portion par jour |
| `weekly_moderate_activity_minutes` | 0, 60, 150 | CAIDE < 60 min ; dérivation FINDRISC ≥ 150 min |
| `alcohol_detail_typical_amount` | 1, 3, 5, 7, 10 | AUDIT-C 1–2 / 3–4 / 5–6 / 7–9 / ≥ 10 |

- Jamais énumérés : sexe (identité, pas une inconnue de mesure), taille et poids, tension systolique et valeurs de laboratoire (une tension ou un bilan inconnus sont eux-mêmes un signal : on invite à mesurer), questions à choix multiples.
- Sortie : `range = { low, high, maxPoints?, riskHorizonYears? }` ; `low`/`high` = `{ category, level, points?, riskPercent? }`. Les points et pourcentages sont le minimum et le maximum observés ; les catégories sont celles des résultats de niveau le plus bas et le plus haut (STOP-Bang peut classer « élevé » avec moins de points qu'« intermédiaire »). Les pourcentages suivent `policy.allowValidatedProbabilities` comme les résultats complets.
- Si `low.category === high.category`, la catégorie est **certaine** malgré les réponses manquantes ; l'interface le dit et affiche l'orientation correspondante.

## Gain à profil égal (`gain` sur un résultat `complete`)

Même instrument, mêmes âge, sexe, mesures et antécédents ; seules les habitudes défavorables déclarées sont remplacées par l'habitude saine :

| Instrument | Habitude (`PathologyHabitId`) | Condition | Réponse substituée |
| --- | --- | --- | --- |
| FINDRISC | `daily-activity` | `daily_activity_30_min` vaut non (déclaré ou dérivé) | `daily_activity_30_min = true` |
| FINDRISC | `daily-fruit-vegetables` | fruits et légumes non quotidiens | `plant_food_frequency = 1` |
| CAIDE | `weekly-activity` | inactivité dérivée (< 60 min) | `weekly_moderate_activity_minutes = 150` (recommandation OMS) |
| SCORE2 / SCORE2-OP | `no-smoking` | tabagisme actuel dérivé | `current_tobacco_nicotine = false` |

- Le gain n'existe que si le résultat sain est complet et meilleur : pourcentage plus bas quand les deux en ont un, sinon catégorie différente. Sortie : `gain = { habits, category, level, points?, riskPercent? }`.
- Le poids et le tour de taille sont exclus : ce ne sont pas des habitudes immédiates et l'écart mélangerait des effets ; la copie ne doit pas stigmatiser.
- Formulation imposée : comparaison de scores, pas une promesse. « Au même âge et avec les mêmes mesures, avec ces habitudes, le score correspondrait à X sur 100. » Les instruments sont des scores de prédiction, pas des modèles causaux.

## « X sur 100 » (présentation seulement)

- Instruments : FINDRISC, CAIDE, SCORE2, et seulement si `riskPercent` est présent. « Environ N sur 100 » avec N = pourcentage arrondi ; sous 1 %, « environ N sur 1 000 » sans pictogramme.
- Pictogramme : grille 10 × 10 décorative (`aria-hidden`), la phrase porte l'information. Fourchette : bas plein, écart hachuré. Gain : deux grilles côte à côte « aujourd'hui » et « avec ces habitudes ». Impression : couleurs forcées (`print-color-adjust: exact`) et contours visibles.
- Événements nommés : diabète de type 2 (10 ans), infarctus ou AVC mortel ou non (10 ans), démence (20 ans).

## Orientation (`app/lib/pathology-orientation.ts`)

Fonction pure `pathologyOrientation(score)` : identifiant d'orientation pour un résultat complet ou une fourchette certaine, sinon `undefined`. Les textes sont dans `pathology-copy.ts`, les sources dans le module.

| Instrument | Catégories | Identifiant | Message (résumé) | Sources |
| --- | --- | --- | --- | --- |
| FINDRISC | faible, légèrement élevé | `findrisc-keep-habits` | viser 30 min d'activité par jour et légumes ou fruits chaque jour : les deux items du score que l'on contrôle | Lindström 2003 ; OMS activité ; OMS alimentation |
| FINDRISC | modéré | `findrisc-habits-and-clinician` | activité, alimentation, poids ; en parler à un médecin ou une infirmière | Lindström 2003 ; ADA 2025 |
| FINDRISC | élevé, très élevé | `findrisc-glucose-test` | faire mesurer la glycémie ou l'HbA1c par un professionnel | ADA 2025 ; Lindström 2003 |
| SCORE2 | faible à modéré | `score2-keep-habits` | bouger, manger équilibré, contrôler tension et cholestérol à intervalles réguliers ; si l'on fume, arrêter est la mesure la plus efficace | ESC 2021 ; OMS activité ; OMS tabac |
| SCORE2 | élevé, très élevé | `score2-clinician` | bilan cardiovasculaire avec un médecin : à ce niveau, l'ESC envisage de traiter tension et cholestérol ; arrêter le tabac | ESC 2021 ; OMS tabac |
| STOP-Bang | faible, intermédiaire | `stop-bang-watch-symptoms` | si ronflement, pauses respiratoires ou somnolence persistent, en parler à un médecin | NHS apnée du sommeil |
| STOP-Bang | élevé | `stop-bang-sleep-assessment` | en parler à un médecin : un test du sommeil (domicile ou centre) confirme ou écarte l'apnée ; prudence au volant si somnolence | NHS apnée du sommeil |
| COPD-PS | sous le seuil | `copd-watch-symptoms` | toux, crachats ou essoufflement persistants : consulter | NHS BPCO diagnostic |
| COPD-PS | positif | `copd-spirometry` | demander une spirométrie (test du souffle) ; arrêter de fumer est la mesure la plus utile | NHS BPCO diagnostic ; OMS tabac |
| CAIDE | toutes | `caide-heart-and-activity` | ce qui protège le cœur protège le cerveau : tension, cholestérol, activité, tabac | Lancet 2024 ; NHS tension |
| AUDIT-C | positif | `audit-c-support` | en parler à un médecin ou à un service d'aide ; si la consommation est quotidienne et forte, ne pas arrêter d'un coup sans avis (risque de sevrage) | NHS aide alcool |
| PHQ-2 | positif | `phq-2-clinician` | en parler à un médecin ou un psychologue : un entretien et un questionnaire complet (PHQ-9) confirment ou non | NICE dépression ; OMS dépression |
| GAD-2 | positif | `gad-2-clinician` | en parler à un médecin : un entretien et le GAD-7 confirment ou non | NHS anxiété généralisée |

L'orientation dépend de la catégorie seule, pas des habitudes déclarées : chaque message reste juste pour qui a déjà l'habitude comme pour qui ne l'a pas (« viser », « si l'on fume »), car une personne qui fume peut être en catégorie faible à modéré. Les identifiants (`*-keep-habits`) sont ceux de l'export et ne changent pas avec le texte.

Pas d'orientation pour les dépistages négatifs AUDIT-C, PHQ-2 et GAD-2 (rien à ajouter au résultat). Les messages restent génériques (« un médecin ») : les ressources nationales viennent en phase 2. Le formulaire FINDRISC grand public (Association finlandaise du diabète) donne les mêmes conduites, mais aucune URL stable n'a pu être vérifiée ; ADA 2025 et Lindström 2003 servent de sources.

## Compléter mes estimations (`app/lib/pathology-follow-up.ts` + `app/components/pathology-follow-up.tsx`)

Module pur : `buildFollowUpPlan(synthesis, answers, profile, scope)` → étapes ordonnées.

- Pour chaque entrée manquante des instruments `incomplete` du périmètre (un instrument ou tous) :
  - question éligible (âge, sexe, condition remplie) → étape `question` ;
  - question cachée par une condition simple (`questionId`) → d'abord la question-porte, puis la question elle-même dès qu'elle devient éligible (tension : `has_recent_blood_pressure` puis `blood_pressure_systolic`). Une porte déjà répondue « non » est reproposée une fois avec l'aide à la mesure ;
  - `lab:*` → une seule étape `labs` (import de bilan existant, titre en `h3`) placée en dernier.
- Ordre : priorité du questionnaire, porte avant cible. Chaque étape indique les estimations qu'elle débloque.
- Compteur « au plus » : une par étape (l'import de bilan compte pour une), plus les questions cachées qu'une porte peut ouvrir (`opens`). Tant que la fréquence de consommation d'alcool est inconnue, AUDIT-C déclare ses deux questions de détail dans `conditionalInputs` : elles sont comptées derrière `alcohol_frequency`, jamais posées directement. Les détails tabac, qu'aucun score ne lit, ne sont pas comptés. Propriété testée : chaque réponse fait baisser le compteur d'au moins un.
- Une étape répondue ou passée n'est pas reproposée pendant la session (la réponse « je ne sais pas » reste un choix honnête). Retour possible à l'étape précédente.
- Après chaque réponse : les réponses inéligibles sont élaguées comme dans le questionnaire, puis `evaluateRisks` est relancé ; un signal urgent ferme le parcours et place le focus sur le résumé urgent. Contrat testé : aucune question proposée par ce parcours ne déclenche une règle urgente chez un adulte.
- Interface : invitation en tête de la section (« N questions pour compléter K estimations », bouton « Tout compléter ») et bouton « Compléter cette estimation (n questions) » sur chaque carte incomplète. Le parcours s'affiche dans la section, question par question (`QuestionPrompt` + `QuestionControl`), avec le focus sur la question. À la fin, focus sur un message « Estimations mises à jour » avec un lien vers la carte concernée.
- Express : la section « Pathologies probables » s'affiche aussi (adultes), avec un lien de navigation. `Results` garde les réponses et bilans dans un état local initialisé par les props : le parent ne les modifie jamais après le montage. L'export et l'impression reflètent les réponses ajoutées.

## Aide à la mesure

Présentations de questions (titre + détail) pour :

- `waist_circumference_cm` : debout, ruban horizontal à mi-distance entre la dernière côte et le haut de l'os de la hanche (souvent au niveau du nombril), en fin d'expiration normale (OMS STEPS, partie 3 section 5).
- `neck_circumference_cm` : ruban autour du cou, juste sous la pomme d'Adam, sans serrer (STOP-Bang).
- `blood_pressure_systolic` : chiffre du haut ; mesure assis après quelques minutes de repos, bras posé à hauteur du cœur ; pharmacie, médecin ou tensiomètre validé (NHS).

## Export et versions

- `PATHOLOGY_RULESET_VERSION = "pathology-scores-v2"` ; `RESULT_REPORT_VERSION = "health-risk-explorer-report-v4"`.
- Par score : `range` (incomplet), `gain` (complet, identifiants d'habitudes), `orientation` (identifiant). Seuls des identifiants et des valeurs interprétées franchissent la frontière d'export, jamais les réponses brutes.
- Les rapports Express adultes portent désormais `pathologyRisk`, puisque la synthèse y est affichée.

## Sources ajoutées (`app/data/evidence.ts`, revue du 2 octobre 2026)

| Clé | Source | URL |
| --- | --- | --- |
| `whoStepsPhysicalMeasurements` | OMS, STEPS Surveillance Manual, partie 3 section 5 | https://cdn.who.int/media/docs/default-source/ncds/ncd-surveillance/steps/part3-section5.pdf |
| `nhsBloodPressureTest` | NHS, Blood pressure test (revue 25 nov. 2025) | https://www.nhs.uk/tests-and-treatments/blood-pressure-test/ |
| `nhsCopdDiagnosis` | NHS, COPD diagnosis (revue 11 avr. 2023) | https://www.nhs.uk/conditions/chronic-obstructive-pulmonary-disease-copd/diagnosis/ |
| `nhsAlcoholSupport` | NHS, Alcohol support (revue 17 août 2026) | https://www.nhs.uk/live-well/alcohol-advice/alcohol-support/ |
| `nhsGeneralisedAnxiety` | NHS, Generalised anxiety disorder (revue 22 oct. 2024) | https://www.nhs.uk/mental-health/conditions/generalised-anxiety-disorder-gad/ |

Réutilisées : `nhsSleepApnoea`, `whoPhysicalActivity`, `whoHealthyDiet`, `whoTobacco`, `niceDepression`, `whoDepression`, `escPrevention2021`, `adaDiagnosisStandards2025`, `lancetDementia2024`, `findriscLindstrom2003`.

Les quatre pages NHS sont citées par les orientations. `whoStepsPhysicalMeasurements` fonde le texte d'aide au tour de taille, qui n'affiche pas de liste de sources : le registre de preuves le classe donc « inactif ».

## Tests

- Moteur : fourchette FINDRISC (tour de taille seul manquant) ; aucune fourchette au-delà de deux manques, pour la tension, les bilans ou si une combinaison est non applicable ; catégorie certaine AUDIT-C ; STOP-Bang ronflement inconnu ; pourcentages retirés sans autorisation ; gains FINDRISC, CAIDE et SCORE2, absence de gain pour un non-fumeur ou un profil déjà sain.
- Orientation : table complète, dépistages négatifs sans orientation, sources résolues.
- Parcours : ordre, porte avant cible, porte « non » reproposée, étape bilan, périmètre par instrument, compteur majorant (détails d'alcool comptés, propriété « chaque réponse fait baisser le compteur »), contrat « pas de règle urgente adulte ».
- Interface : « X sur 100 », gain, fourchette, orientation, parcours qui complète une carte, Express avec section et lien, aide à la mesure ; accord au singulier d'une fourchette à une réponse manquante et de l'étape bilan qui complète une seule estimation ; conseil de catégorie faible juste pour une personne qui fume.
- Impression : `app/results-design.test.ts` vérifie que les cartes s'impriment en blocs coupés entre leurs parties.
- Export : versions, `range`, `gain`, `orientation`, aucune valeur brute.

## Protocole

Rôle exécutant, conception écrite avant le code, tests d'abord ; branche `feat/phase1-estimations` fusionnée en avance rapide dans `main` ; le push déclenche le déploiement Vercel ; QA navigateur locale puis en production. Portes : `tsc`, `lint`, `vitest`, `vinext build`, `next build`, `git diff --check`.
