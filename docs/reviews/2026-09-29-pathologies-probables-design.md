# Pathologies probables : scores validés et refonte de la banque de questions

Demande : conclure sur les pathologies les plus probables à partir du questionnaire, en affichant des scores publiés avec leur catégorie de risque et, lorsque l'instrument le fournit, le pourcentage à 10 ans (FINDRISC, SCORE2). Supprimer les questions que rien ne lit, réécrire le Quick 20 et rééquilibrer Detailed 50 / Deep. Décision utilisateur du 29 septembre 2026 : tout en une passe.

## Constat de départ (audit du 29 septembre 2026)

- 254 questions ; 68 lues par le moteur de règles, 25 par le Purity Score ; 134 (53 %) ne sont lues par aucun calcul affiché ; 37 en texte libre jamais analysées (dont 14 valeurs de laboratoire dactylographiées alors que l'import de bilan produit déjà des valeurs structurées `ConfirmedLabValue`).
- Groupes `metabolic` et `kidney` sans règle ; aucune règle `validated-estimate` ; `prototypePolicy.allowValidatedProbabilities = false`.
- Quick 20 : 5 questions sans consommateur ; Detailed 50 : 22 questions de contexte seul.

## Périmètre

1. Nouveau module pur `app/lib/pathology-risk.ts` : instruments publiés, calculés à partir des réponses structurées, du profil et des valeurs de laboratoire confirmées.
2. `prototypePolicy.allowValidatedProbabilities` passe à `true`. `publicWellnessPolicy` reste à `false`. Quand la politique interdit les probabilités, le module renvoie points et catégorie sans pourcentage.
3. Banque de questions : suppression des 37 questions texte et des orphelines sans valeur clinique ; ajout de 19 questions structurées requises par les instruments ou par des drapeaux rouges sourcés ; Quick 20 réécrit ; Detailed 50 rééquilibré ; Deep conserve la garantie « ≥ 150 questions de base éligibles » pour tout adulte, homme compris. *(Garantie Deep remplacée par la deuxième passe : Deep = toutes les questions éligibles, minimum 80, adultes seulement.)*
4. Import de bilan : `ConfirmedLabValue[]` devient la seule source numérique (plus aucune réponse `lab_value_*` écrite).
5. Cinq nouvelles règles `prompt-review` / `long-term` pour les nouveaux drapeaux rouges (angor d'effort, claudication, palpitations irrégulières, fibrillation atriale diagnostiquée, signes d'alarme oncologiques).
6. Résultats : nouvelle section « Pathologies probables » pour les adultes (hors Express), export JSON v3, copie EN/FR, registre de preuves et README mis à jour.

Hors périmètre : mortalité, espérance de vie, Pooled Cohort Equations (États-Unis), FRAX, SCORE2-Diabetes, changement des profondeurs (9 / 20 / 50 / 150–200) et des parcours mineurs. *(Les deux derniers points sont entrés dans le périmètre lors de la deuxième passe, à la demande de l'utilisateur : minimums 9 / 10 / 30 / 80, Deep réservé aux adultes, mineurs « jusqu'à » 20 / 50.)*

## Architecture du module `pathology-risk.ts`

```ts
evaluatePathologyRisk(answers, profile, confirmedLabs, policy): PathologySynthesis
```

- Renvoie `{ scores, labClassifications, dementiaFactors, rulesetVersion: "pathology-scores-v1" }`. Pour `profile.age < 18` : tableaux vides (instruments adultes).
- `PathologyScoreResult` discriminé par `status` : `complete` (points, `maxPoints`, `category`, `level` low/moderate/high/very-high, `riskPercent?` + `riskHorizonYears?` uniquement si `policy.allowValidatedProbabilities`), `incomplete` (`missingInputs` : identifiants de questions ou marqueurs `lab:total_cholesterol`), `not-applicable` (`reason` : `age-out-of-range`, `diagnosed-condition`, `established-cvd`, `sex-not-supported`, `region-not-calibrated`).
- Chaque résultat liste ses `inputs` `{ id, value, derived?: true }` pour l'affichage transparent ; `derived` marque les entrées reconstituées (voir FINDRISC).
- Aucune prose dans le module : titres, catégories, libellés d'entrées et limites sont dans `app/i18n/pathology-copy.ts` (EN/FR). Les pourcentages ne transitent jamais par `RiskLeaf.copy` ; le contrat `assertEvidenceContract` reste inchangé.
- Sources : entrées `EvidenceSource` ajoutées à `app/data/evidence.ts` (Lindström & Tuomilehto 2003 ; SCORE2 et SCORE2-OP, Eur Heart J 2021 ; Chung STOP-Bang ; Bush AUDIT-C ; Kroenke PHQ-2 ; Kroenke GAD-2 ; Martinez COPD-PS ; Kivipelto CAIDE ; ADA Standards of Care ; KDIGO 2024 ; Lancet Commission 2024).

### Instruments et correspondance exacte des entrées

| Instrument | Pathologie | Applicabilité | Entrées (question → item) | Sortie |
| --- | --- | --- | --- | --- |
| FINDRISC | Diabète de type 2 | 18+ ; exclu si `diagnosed_conditions_core` inclut `diabetes` | âge (profil) ; IMC (`height_cm`, `weight_kg`) ; tour de taille par sexe (`waist_circumference_cm`, `sex_assigned_at_birth`) ; activité ≥ 30 min/j (`daily_activity_30_min`, sinon dérivé de `weekly_moderate_activity_minutes ≥ 150`) ; fruits/légumes quotidiens (dérivé de `plant_food_frequency ≥ 1`) ; `bp_medication_ever` ; `glucose_high_ever` ; `family_diabetes` (no / other_relatives / first_degree) | 0–26 ; < 7 faible 1 % ; 7–11 légèrement élevé 4 % ; 12–14 modéré 17 % ; 15–20 élevé 33 % ; > 20 très élevé 50 % (risque à 10 ans) |
| SCORE2 / SCORE2-OP | Maladie cardiovasculaire fatale et non fatale | 40–69 / 70–89 ; sexe male/female ; région faible risque pour CH et GB, `region-not-calibrated` pour US et OTHER ; exclu si diabète déclaré ou `cvd_event_history` | âge, sexe, tabagisme actuel (`current_tobacco_nicotine` ∧ contexte ≠ TSN seul ∧ produits ≠ vape/sans fumée uniquement), `blood_pressure_systolic`, cholestérol total et HDL en mmol/L depuis `confirmedLabs` | risque à 10 ans en % ; catégories ESC 2021 : < 50 ans 2,5 / 7,5 % ; 50–69 ans 5 / 10 % ; ≥ 70 ans 7,5 / 15 % ; modificateurs affichés : `family_early_cvd`, `inflammatory_condition`, `statin_current` |
| STOP-Bang | Apnées obstructives du sommeil | 18+ ; exclu si `diagnosed_conditions_core` inclut `sleep_apnoea` | S `sleep_snoring = yes` ; T `sleep_daytime_sleepiness ∈ {often, daily}` ; O `sleep_witnessed_apnea = yes` ; P `diagnosed_high_blood_pressure ∨ bp_medication_ever ∨ SBP ≥ 140` ; B IMC > 35 ; A âge > 50 ; N `neck_circumference_cm > 40` ; G sexe masculin | 0–8 ; 0–2 faible, 3–4 intermédiaire, ≥ 5 élevé ; élevé aussi si STOP ≥ 2 et (homme ∨ IMC > 35 ∨ cou > 40) |
| AUDIT-C | Consommation d'alcool à risque | 18+ | `alcohol_frequency` (0–4) ; `alcohol_detail_typical_amount` (1–2 → 0, 3–4 → 1, 5–6 → 2, 7–9 → 3, ≥ 10 → 4) ; `alcohol_detail_heavy_episode` (0–4) ; `never` ⇒ 0 sans questions détaillées | 0–12 ; positif ≥ 3 femmes, ≥ 4 autres |
| PHQ-2 | Dépression | 18+ | `low_interest_frequency`, `mood_low_frequency` (0–3 chacun) | 0–6 ; positif ≥ 3 |
| GAD-2 | Anxiété | 18+ | `anxiety_worry_frequency`, `anxiety_control_worry` | 0–6 ; positif ≥ 3 |
| COPD-PS | BPCO | 35+ | `copd_breathless_frequency` (0/0/1/2/2) ; `copd_phlegm` (0/0/1/1/2) ; `copd_activity_limit` (0/0/0/1/2) ; ≥ 100 cigarettes dérivé de `smoking_history_former ∨ tabagisme actuel` (2) ; âge 35–49 → 0, 50–59 → 1, ≥ 60 → 2 | 0–10 ; ≥ 5 dépistage spirométrique conseillé |
| CAIDE (modèle 1) | Démence à 20 ans | 40–64 | âge (< 47 → 0, 47–53 → 3, > 53 → 4) ; `education_years` (≥ 10 → 0, 7–9 → 2, ≤ 6 → 3) ; sexe (H 1) ; SBP > 140 → 2 ; IMC > 30 → 2 ; cholestérol total > 6,5 mmol/L → 2 (labo) ; inactivité dérivée de `weekly_moderate_activity_minutes < 60` → 1 | 0–15 ; 0–5 1,0 % ; 6–7 1,9 % ; 8–9 4,2 % ; 10–11 7,4 % ; 12–15 16,4 % |

SCORE2 (40–69) : variables centrées `(âge−60)/5`, `(SBP−120)/20`, `CT−6`, `(HDL−1,3)/0,5`, terme diabète nul ; survie de base 0,9605 (H) / 0,9776 (F) ; recalibration région faible risque `scale1/scale2` = −0,5699 / 0,7476 (H), −0,7380 / 0,7019 (F). SCORE2-OP (70–89) : `âge−73`, `SBP−150`, `CT−6`, `HDL−1,4` ; survie 0,7576 (H) / 0,8082 (F) ; prédicteur moyen soustrait 0,0929 (H) / 0,229 (F) ; échelles faible risque −0,34 / 1,19 (H), −0,52 / 1,01 (F). Vecteur de test de référence : homme 50 ans fumeur, SBP 140, CT 6,3, HDL 1,4, région faible → 6,3 % (exemple travaillé du supplément ESC, reproduit par le paquet CRAN `RiskScorescvd`).

### Classifications de laboratoire (catégories publiées, pas des risques)

- HbA1c : < 5,7 % normal ; 5,7–6,4 % zone prédiabète ; ≥ 6,5 % zone diabète (ADA ; conversion mmol/mol via `reviewed.unit`).
- Glycémie : uniquement si `fastingStatus = fasting` ; < 5,6 mmol/L ; 5,6–6,9 ; ≥ 7,0 (ADA).
- DFG estimé : G1 ≥ 90 ; G2 60–89 ; G3a 45–59 ; G3b 30–44 ; G4 15–29 ; G5 < 15 mL/min/1,73 m² (KDIGO ; une seule valeur ne définit pas une maladie rénale chronique).

### Facteurs modifiables de démence (Lancet 2024, contexte sans pourcentage)

Facteurs évalués à partir des réponses existantes ou ajoutées : éducation (`education_years`), audition (`hearing_difficulty`), vision (`vision_difficulty`), traumatisme crânien (`head_injury_history`), hypertension, tabagisme, obésité, dépression (PHQ-2 positif ou `depression_history`), inactivité, diabète, alcool (AUDIT-C ≥ 8), isolement social (`social_loneliness`), pollution (`environment_air_pollution`), LDL élevé (`diagnosed_high_cholesterol`). Sortie : facteurs présents / évalués / non renseignés.

## Banque de questions

### Suppressions (58)

- Texte libre, jamais analysé (37) : `gender_identity_optional`, `ancestry_optional`, `sleep_naps`, `stimulant_detail_recent_pattern`, `psychedelic_detail_products`, `recreational_detail_identity`, `anabolic_detail_products_route`, `anabolic_detail_source_stack`, `med_detail_names`, `med_detail_routes`, `med_detail_indications`, `med_detail_timing_status`, `glp1_detail_product_source`, `corticosteroid_detail_product_route`, `corticosteroid_detail_stop_plan`, `corticosteroid_detail_monitoring`, `research_detail_label`, `research_detail_device_units`, `isotretinoin_detail_interactions_monitoring`, `minoxidil_detail_indication_prescriber`, `otc_current_products`, `supplement_current_products`, `labs_collection_date`, et les 14 `lab_value_*`.
- Orphelines sans usage clinique (21) : `hydration_daily_fluid`, `hydration_thirst`, `hydration_dark_urine`, `hydration_heat_access`, `dental_brushing`, `dental_between_teeth`, `dental_visit_access`, `vaccinations_flu_recent`, `vaccinations_reaction_history`, `vaccinations_records_available`, `environment_cooking_ventilation`, `work_protective_equipment`, `labs_fasting_status`, `labs_reference_ranges_available`, `labs_clinician_reviewed`, `pain_interference`, `supplement_source_testing`, `blood_pressure_diastolic`, `blood_pressure_measurement_place`, `blood_pressure_multiple_readings`, `blood_pressure_home_device_validation`.
- Domaines retirés (plus aucune question) : `hydration`, `lab-values`, `supplements` — retirés de `HealthDomain`, `DEFAULT_PILLAR_BY_DOMAIN`, `uiCopyKeys.domain` et des copies EN/FR. Racines protectrices « accès à l'eau » et « carnet de vaccination » retirées de `presentation.ts`.

### Ajouts (19, tous structurés, adultes, neutres quant au sexe)

| ID | Domaine | Type | Niveaux | Consommateur |
| --- | --- | --- | --- | --- |
| `glucose_high_ever` | diagnosed-conditions | boolean, 18+ | quick, detailed, deep | FINDRISC |
| `bp_medication_ever` | blood-pressure | boolean, 18+ | detailed, deep | FINDRISC, STOP-Bang |
| `daily_activity_30_min` | movement | boolean, 18+ | detailed, deep | FINDRISC |
| `sleep_witnessed_apnea` | sleep | single yes/no/unknown | detailed, deep | STOP-Bang |
| `neck_circumference_cm` | measurements | number, 18+ | detailed, deep | STOP-Bang |
| `copd_breathless_frequency` | current-symptoms | single (5), 35+ | detailed, deep | COPD-PS |
| `copd_phlegm` | current-symptoms | single (5), 35+ | detailed, deep | COPD-PS |
| `copd_activity_limit` | current-symptoms | single (5), 35+ | detailed, deep | COPD-PS |
| `education_years` | demographics | single (3), 18+ | detailed, deep | CAIDE, Lancet |
| `head_injury_history` | cognition | boolean, 18+ | deep | Lancet |
| `depression_history` | mood | boolean, 18+ | deep | Lancet, contexte PHQ-2 |
| `dementia_family_history` | family-history | boolean, 18+ | deep | contexte démence |
| `statin_current` | prescription-medications | boolean, 18+ | detailed, deep | SCORE2 (traitement hypolipémiant) |
| `cvd_event_history` | diagnosed-conditions | boolean, 18+ | detailed, deep | SCORE2 (exclusion prévention secondaire) |
| `inflammatory_condition` | diagnosed-conditions | boolean, 18+ | deep | modificateur SCORE2 |
| `exertional_chest_pain` | current-symptoms | boolean, 18+ | detailed, deep | règle `exertional-chest-pain-review` |
| `exertional_leg_pain` | current-symptoms | boolean, 18+ | deep | règle `exertional-leg-pain-review` |
| `palpitations_irregular` | current-symptoms | boolean, 18+ | deep | règle `irregular-palpitations-review` |
| `cancer_alarm_signs` | current-symptoms | multi (7 + none), 18+ | detailed, deep | règle `cancer-alarm-signs-review` |

### Restructurations (identifiants conservés)

- `family_diabetes` : boolean → single `no` / `other_relatives` / `first_degree` / `unsure` (item FINDRISC) ; niveaux quick, detailed, deep.
- `diagnosed_conditions_core` : options ajoutées `atrial_fibrillation`, `sleep_apnoea` (règle `atrial-fibrillation-review`, exclusion STOP-Bang).
- `sleep_snoring` : reformulé en ronflement bruyant seul (item S) ; valeurs `yes` / `no` / `unknown` inchangées ; la règle `sleep-breathing-review` reste valide.
- `preventive_vision_check` → `vision_difficulty` (boolean, facteur Lancet) ; `preventive_hearing_check` → `hearing_difficulty` (boolean).
- `waist_circumference_cm` : passe en quick (18+).
- `blood_pressure_systolic` : reste conditionnel à `has_recent_blood_pressure`, niveaux detailed, deep.
- Déplacements vers deep seul : `urgent_overdose_poisoning_now`, `urgent_severe_bleeding_now`, `urgent_severe_allergy_now`, `breathlessness_activity`, `persistent_fatigue`, `recurrent_dizziness`, `uses_systemic_corticosteroids`, `family_early_cvd` (detailed, deep), `squat_one_rep_max_kg` et `deadlift_one_rep_max_kg` (express, deep).
- Déplacements vers quick : `urgent_stroke_signs_now`, `urgent_self_harm_now`, `mood_low_frequency`, `diagnosed_high_blood_pressure`.
- Retirés de quick (restent detailed/deep) : `preventive_visit_recency`, `has_recent_blood_pressure`, `pregnancy_relevant` et `sexual_contact_safety` restent quick mais ne rentrent dans les 20 que pour les 13–17 ans (voir priorités).

### Quick 20 (adulte, tout sexe)

Ordre de priorité : `sex_assigned_at_birth` 1, `height_cm` 2, `weight_kg` 3, `waist_circumference_cm` 3.5, `diagnosed_conditions_core` 5, `diagnosed_high_blood_pressure` 5.5, `glucose_high_ever` 5.7, `family_diabetes` 5.8, `urgent_chest_discomfort_now` 6, `urgent_breathing_now` 7, `urgent_stroke_signs_now` 7.1, `urgent_self_harm_now` 7.2, `plant_food_frequency` 8, `weekly_moderate_activity_minutes` 9, `usual_sleep_hours` 10, `current_tobacco_nicotine` 11, `alcohol_frequency` 12, `has_recent_labs` 10.5 (placée avant le tabac pour que l'import de bilan ne clôture pas le chapitre Cardio ; valeur initiale prévue 14), `low_interest_frequency` 16, `mood_low_frequency` 16.5. Conditionnelle quick conservée : `tobacco_nicotine_context` 11.05.

Queue des priorités quick (entrent seulement quand des questions 18+ manquent) : `pregnancy_relevant` 16.7, `sexual_contact_safety` 16.8 (13–17 ans : remplacent taille de taille et glycémie) ; `reliable_social_support` 17.2, `sleep_snoring` 17.3, `current_medications` 17.5 (enfants ≤ 12 ans : complètent les 20 avec les quatre questions enfant ; *depuis la deuxième passe, seule `child_feeling_support` subsiste et le Quick enfant compte 17 questions*). Résultat : Quick = FINDRISC complet, PHQ-2, quatre urgences, portes tabac/alcool/bilan.

### Detailed 50 (adulte)

Les 20 quick + `reliable_social_support`, `sleep_snoring`, `current_medications`, `sexual_contact_safety` (+ `pregnancy_relevant` femme), puis par priorité : `reported_vo2_max_ml_kg_min`, `has_recent_blood_pressure`, `anxiety_worry_frequency`, `anxiety_control_worry`, `sleep_daytime_sleepiness`, `sleep_witnessed_apnea`, `neck_circumference_cm`, `bp_medication_ever`, `daily_activity_30_min`, `smoking_history_former`, `copd_*` ×3, `education_years`, `statin_current`, `cvd_event_history`, `exertional_chest_pain`, `cancer_alarm_signs`, `stress_recovery_practice`, `preventive_followup_status`, `diet_whole_grains`, `diet_legumes`, `diet_processed_meat`, `diet_sugary_drinks`, `movement_strength_days`, `movement_walking_days`, `sedentary_total_hours`, `sleep_refreshed`, `circadian_bedtime_variation`, `uses_cannabis`, `uses_nonmedical_stimulants`, `uses_nonmedical_opioids`, `uses_psychedelics`, `uses_other_recreational_drugs`. Les branches actives (contexte tabac, quantités alcool, systolique, suivi médicaments, action préventive) déplacent la queue comme aujourd'hui. Les 25 entrées du Purity Score restent toutes en detailed (couverture ≥ 70 % préservée).

*Mesure après la deuxième passe (revue du 30 septembre 2026, script sur `buildAssessmentQueue`) : la file Detailed retient les 50 questions éligibles de plus forte priorité, ce qui laisse hors Detailed, à tout âge, `statin_current` (22.2), `family_early_cvd` (22.3), `diagnosed_high_cholesterol` (22.4) et les portes substances (36.x) ; ces items ne sont posés qu'en Deep. Dès 35 ans, les trois items COPD-PS (19.1–19.3) évincent `sedentary_total_hours`, `sleep_refreshed` et `circadian_bedtime_variation` : Detailed couvre alors 14 des 17 entrées inconditionnelles du Purity Score (17 sur 17 avant 35 ans ; les 8 entrées conditionnelles s'ouvrent selon les réponses). Aucune entrée requise d'un instrument n'est concernée, donc l'indice « posée à partir de l'analyse… » reste exact. Décision de la revue : conserver les priorités (reprioriser évincerait des entrées alimentaires du Purity Score) et documenter.*

### Deep

Base éligible attendue après refonte : ≈ 152 (homme adulte), ≈ 155 (adulte sans sexe renseigné), ≈ 156 (femme) ; adolescents ≈ 110 (Deep reste indisponible avant 18 ans). Garantie testée : `buildAssessmentQueue("deep", …, { age: 18 })` et `{ age: 45, sex_assigned_at_birth: "male" }` renvoient 150. *Remplacé par la deuxième passe ci-dessous (Deep = toutes les questions éligibles, minimum 80, adultes seulement).*

### Validation des saisies

`MAXIMUM_BY_QUESTION` : ajouter `neck_circumference_cm: 80`, `waist_circumference_cm: 250` ; `neck_circumference_cm` et `waist_circumference_cm` exigent > 0 comme la taille et le poids. Unités : `unit.neck_circumference_cm` ajouté ; `unit.hydration_daily_fluid`, `unit.dental_brushing`, `unit.blood_pressure_diastolic` retirés.

## Règles ajoutées (`app/data/rules.ts`)

| ID | Groupe | Palier | Urgence | Condition | Sources |
| --- | --- | --- | --- | --- | --- |
| `exertional-chest-pain-review` | cardiovascular | guideline-action | prompt-review | `exertional_chest_pain = true` | NHS Angina |
| `exertional-leg-pain-review` | cardiovascular | guideline-action | prompt-review | `exertional_leg_pain = true` | NHS Peripheral arterial disease |
| `irregular-palpitations-review` | cardiovascular | guideline-action | prompt-review | `palpitations_irregular = true` | NHS Heart palpitations, NHS Atrial fibrillation |
| `atrial-fibrillation-review` | cardiovascular | guideline-action | long-term | `diagnosed_conditions_core` inclut `atrial_fibrillation` | NHS Atrial fibrillation |
| `cancer-alarm-signs-review` | preventive-follow-up | guideline-action | prompt-review | `cancer_alarm_signs` inclut un signe | NICE NG12 |

Total : 59 règles ; répartition par pilier [16, 23, 2, 18]. Notes d'audit `metabolic` / `kidney` : « couvert par les scores publiés du module pathology-risk (FINDRISC, HbA1c, DFG) ; aucune règle qualitative autonome ».

## Résultats, export, copie

- `app/components/pathology-synthesis.tsx` : section `#pathology-synthesis` affichée pour les adultes hors Express, entre la vue d'ensemble et le plan d'action. Par instrument : pathologie, instrument et version, catégorie, points / maximum, pourcentage et horizon si autorisés, entrées utilisées (les dérivées signalées), entrées manquantes avec la profondeur qui les pose, sources, phrase de limite (« estimation de dépistage, pas un diagnostic »). Tableau des classifications de laboratoire. Bloc facteurs de démence. Lien de navigation ajouté.
- `export.ts` : `RESULT_REPORT_VERSION = "health-risk-explorer-report-v3"`, champ `pathologyRisk` (`rulesetVersion`, `interpretation`, `scores` avec `status`, `points`, `maxPoints`, `category`, `level`, `modifiers`, `riskPercent`/`riskHorizonYears` si autorisés, `inputs`, `missingInputs` ou `reason`, `sourceIds` ; `labClassifications`, `dementiaFactors`, `dementiaFamilyHistory`, `dementiaSourceIds`). Depuis la revue du 30 septembre, chaque entrée exportée ne porte que son identifiant et l'éventuel drapeau `derived` : les valeurs restent à l'écran et ne sortent jamais dans le JSON.
- `assessment.tsx` : `finishLabImport` stocke uniquement `confirmedLabs` ; `LAB_ANSWER_IDS` et `importedAnswerIds` supprimés.
- `presentation.ts` : `localizeRiskLeaves` couvre les cinq règles (copie FR dans `risk-copy-fr.ts`).

## Tests

- Nouveau `app/lib/pathology-risk.test.ts` : vecteurs publiés (SCORE2 6,3 % ; FINDRISC 0 → 1 %, exemple 15 → 33 % ; STOP-Bang 3 → intermédiaire, STOP ≥ 2 + homme → élevé ; AUDIT-C seuils par sexe ; PHQ-2 / GAD-2 ≥ 3 ; COPD-PS ≥ 5 ; CAIDE 12 → 16,4 %), politique sans probabilité (pas de `riskPercent`), mineurs (vide), non-applicabilités, entrées manquantes nommées, conversions d'unités des laboratoires.
- Compteurs mis à jour : banque 215, conditionnelles 55, arêtes de porte recalculées, règles 59 et [16, 23, 2, 18], options « Not sure » recomptées, Deep médicaments 150 + branches recalculé, `med_detail_` = 1 en detailed.
- Adaptations : flux « Metformin » remplacé par `med_detail_prescriber_followup` ; import de bilan n'écrit plus de réponse ; contrôle texte testé sur une question synthétique ; racines protectrices supprimées ; références `gender_identity_optional`, `ancestry_optional`, `lab_value_*`, `med_detail_names`, `glp1_detail_product_source`, `corticosteroid_detail_stop_plan` retirées des tests.

## Protocole

Orchestrateur `claude-fable-5` indisponible dans cette session ; décisions d'architecture prises avec l'accord explicite de l'utilisateur (« Enchaine sur tes priorités », choix : scores publiés + catégorie + pourcentage à 10 ans ; tout en une passe). Pas de nouvelle dépendance. Revue Fable à effectuer lorsqu'il sera disponible.

## Validation prévue

`npx tsc --noEmit --incremental false --pretty false`, `npm run lint`, `npm test -- --run`, `npm run build`, `git diff --check`, puis parcours navigateur Quick / Detailed adulte (FR et EN) avec import de bilan.

## Résultat et vérifications

Implémentation terminée le 29 septembre 2026 (Node v26.7.0, npm 11.19.0), locale, non déployée.

### Compteurs obtenus

| Mesure | Avant | Après |
| --- | --- | --- |
| Questions | 254 (37 texte libre, 134 orphelines) | **215**, 0 texte libre (102 boolean, 60 single, 15 multi, 30 number, 8 scale) |
| Domaines | 47 | **44** (`hydration`, `lab-values`, `supplements` retirés) |
| Questions conditionnelles / arêtes de porte | 90 / 101 | **55 / 66** |
| Règles | 54 ([12, 23, 2, 17]) | **59** ([16, 23, 2, 18]) ; paliers 29 / 26 / 4 / 0 ; urgences 9 / 35 / 4 / 11 |
| Sources `evidence.ts` | 71 | **91** (91 URL uniques ; 71 lues par les règles, 15 par le module pathologies dont `escPrevention2021` partagée, 6 inactives inchangées) |
| Files d'attente | 9 / 20 / 50 / 150 | **9 / 20 / 50 / 150** pour adulte 18 ans sans sexe, homme 45, femme 45 ; **154** avec la branche médicaments ; Deep indisponible pour 15 ans (109 questions de base) et 9 ans (89) |
| Export | `report-v2` | **`report-v3`**, champ `pathologyRisk` |

### Écarts par rapport au contrat

- `has_recent_labs` : priorité 10.5 au lieu de 14 (voir Quick 20).
- `glucose_high_ever` : la mention de la grossesse / du diabète gestationnel est déplacée du libellé vers l'explication (`why`) en EN et FR, pour que le parcours masculin n'affiche aucun libellé de grossesse ; l'item FINDRISC reste identique.
- `family_diabetes = unsure`, `sleep_snoring = unknown`, `sleep_witnessed_apnea = unknown` : traités comme entrées manquantes (`incomplete`) et non comme réponses négatives (`InputCollector.knownSingle`).
- Facteur démence « alcool » : AUDIT-C ≥ 8 (et non simple dépistage positif), conforme au seuil > 21 unités/semaine de la Lancet Commission.
- Copie EN « asked from … depth onward » retenue pour les entrées manquantes afin d'éviter une collision avec le libellé « Quick assessment » testé ailleurs.
- Aucun autre écart : instruments, coefficients, seuils, exclusions, sources et ordre d'affichage sont ceux des tableaux ci-dessus.

### Fichiers

- Créés : `app/lib/pathology-risk.ts`, `app/lib/pathology-risk.test.ts` (55 tests), `app/i18n/pathology-copy.ts`, `app/components/pathology-synthesis.tsx`, ce document.
- Supprimés : `app/data/questions/labs.ts`, `app/i18n/questions-fr-labs.ts`.
- Modifiés : types, politique, `labs.ts` (conversions), `evidence.ts`, banque de questions (core, lifestyle, clinical, performance, substances, medications, index), copies FR, piliers, copie UI, validation, guidance, présentation, `longevity.ts`, `rules.ts`, `risk-copy-fr.ts`, `assessment.tsx`, `results.tsx`, `export.ts`, `results-design.css`, tests lib/i18n/composants, README, `docs/evidence-register.md`, `docs/privacy-and-release.md`.

### Portes exécutées

| Porte | Résultat |
| --- | --- |
| `npx tsc --noEmit --incremental false --pretty false` | 0 erreur |
| `npm run lint` | 0 erreur ; 2 avertissements préexistants hors `app/` (`.playwright-mcp`, `.remember`) |
| `npm test -- --run` | **63 fichiers / 5 535 tests**, tous verts |
| `npm run build` | 5/5 étapes ; avis de taille de chunk préexistant (`three.module` 545 kB) |
| `git diff --check` | propre |

Vecteurs publiés reproduits par `pathology-risk.test.ts` : SCORE2 homme 50 ans fumeur, SBP 140, CT 6,3, HDL 1,4, région faible → 6,3 % ; FINDRISC 0 / 15 / 26 points et bandes 1 / 33 / 50 % ; STOP-Bang 2 → faible, 3 → intermédiaire, STOP ≥ 2 + homme → élevé ; AUDIT-C 3 points positif chez la femme et négatif chez l'homme, 5 points positif chez l'homme ; PHQ-2 et GAD-2 ≥ 3 ; COPD-PS ≥ 5 ; CAIDE 12 → 16,4 % ; pourcentage retenu sous `publicWellnessPolicy` ; synthèse vide avant 18 ans ; conversions mg/dL → mmol/L et % → mmol/mol.

### Non fait

- Parcours navigateur Quick / Detailed adulte (FR et EN) avec import de bilan : non exécuté dans cette passe ; à faire avant toute publication.
- Revue Fable 5 (orchestrateur indisponible).
- Aucune sauvegarde ni déploiement Sites.

## Deuxième passe : pertinence des questions (29 septembre 2026)

### Constat

Après la première passe, un audit des consommateurs réels (entrées des 59 règles, `PURITY_SCORE_INPUT_IDS`, lectures du module `pathology-risk.ts`, composantes Express, portes de branchement, lectures `answers.<id>` dans `presentation.ts` et `results.tsx`) montrait que 84 des 215 questions n'alimentaient aucune sortie affichée. Par profondeur adulte : Quick 0 orpheline, Detailed 1, Deep 64–65 (≈ 43 % de la file). Six identifiants d'abord comptés orphelins sont en réalité lus : `dementia_family_history` (ajouté en première passe, lu nulle part → décision ci-dessous) et cinq racines protectrices affichées par la vue d'ensemble et l'arbre de risques (`reliable_social_support`, `movement_balance_training`, `circadian_morning_light`, `mood_support_access`, `social_community_belonging`).

### Décisions (accord explicite de l'utilisateur)

1. **Épurer** : supprimer les questions qu'aucune analyse affichée ne lit (78 après conservation des cinq racines protectrices et de `dementia_family_history`).
2. **Deep = toutes les questions pertinentes** : toutes les questions de base éligibles plus les branches ouvertes, plafond 200, minimum 80, **adultes uniquement**.
3. **Mineurs** : Quick et Detailed « jusqu'à » 20 / 50 (minimums 10 / 30) plutôt qu'une file complétée artificiellement ; Deep indisponible.
4. **`dementia_family_history`** : affiché comme contexte dans le bloc démence, jamais compté comme facteur.

### Suppressions (78 questions, 5 domaines)

- Cœur et cliniques : `resting_heart_rate_known`, `resting_heart_rate_bpm`, `family_cancer_patterns`, `family_sudden_death`, `preventive_visit_recency`, `persistent_fatigue`, `recurrent_dizziness`, `weight_change_six_months`, `child_trusted_adult_support`, `child_household_smoke`, `child_food_access`, `pregnancy_current_context`, `pregnancy_recent_delivery`, `preventive_primary_care_access`, `preventive_cancer_screening`, `preventive_fall_review`, `preventive_care_barrier`, `vaccinations_routine_status`, `dental_bleeding_gums`, `otc_label_dose_pattern`.
- Capacités physiques lues uniquement par `longevity.ts` (non rendu) : `grip_strength_kg`, `walking_pace_self_rated`, `stair_flights_capacity`, `chair_rise_capacity`, `pushup_max_reps`, `smoking_total_years`.
- Habitudes de contexte : `diet_nuts_seeds`, `diet_fish`, `diet_meal_regular`, `movement_daily_tasks`, `movement_limiting_condition`, `movement_recovery`, `sedentary_long_bouts`, `sedentary_work_control`, `sedentary_screen_evening`, `sleep_fall_asleep_minutes`, `sleep_awakenings`, `sleep_restless_legs`, `sleep_environment`, `circadian_wake_variation`, `circadian_shift_work`, `circadian_late_caffeine`, `stress_current_level`, `stress_control`, `stress_caregiving`, `stress_financial`, `mood_function_impact`, `anxiety_panic_episodes`, `cognition_memory_change`, `cognition_concentration`, `social_relationship_safety`.
- Travail, environnement, soleil : `work_physical_demands`, `work_airborne_exposure`, `work_noise_exposure`, `work_schedule_control`, `environment_indoor_damp`, `environment_secondhand_smoke`, `environment_safe_temperature`, `sun_burns_recent`, `sun_protection_habits`, `sun_tanning_devices`.
- Santé sexuelle et reproductive : `sexual_health_support_wanted`, `sexual_health_symptoms`, `sexual_health_testing_interest`, `sexual_function_change`, `sexual_health_clinician_access`, `reproductive_period_pattern`, `reproductive_fertility_concern`, `reproductive_menopause_change`, `reproductive_pelvic_pain`, `reproductive_screening_history`.
- Détails substances : `tobacco_detail_frequency`, `tobacco_detail_first_use`, `tobacco_detail_quit_interest`, `cannabis_detail_route`, `cannabis_detail_frequency`, `opioid_detail_recent_use`, `opioid_detail_overdose_access`.
- Domaines vidés retirés de `HealthDomain`, des piliers et de la copie UI : `dental-health`, `otc-medications`, `reproductive-health`, `vaccinations`, `work-exposures` (`reproductive-health` reste un `RiskGroup`).
- Constantes d'options devenues inutilisées supprimées ; guidance, validation, unités, overrides de piliers et `MALE_INAPPLICABLE_QUESTION_IDS` (désormais `isotretinoin_detail_program_pregnancy` seul) nettoyés. Les branches grossesse restantes étaient déjà conditionnées sur `pregnancy_relevant` : l'arbre est intact.

### Moteur (`app/lib/questionnaire.ts`)

- `DEPTH_LIMITS` inchangés (9 / 20 / 50 / 200) ; nouveaux `DEPTH_MINIMUMS` 9 / 10 / 30 / 80 et `DEEP_MINIMUM_AGE = 18`.
- Deep sélectionne toutes les questions de base éligibles puis les branches actives jusqu'au plafond (`Math.max(0, 200 − base)`) ; `getAvailableDepths`, `buildAssessmentQueue` et `reconcileAssessmentState` partagent `isDeepAvailable` / `assertDeepAvailable` (message : « Deep assessment is unavailable: adults only, n eligible base questions; at least 80 are required. »).
- Copie : `depth.deep.detail` « toutes les questions pertinentes, environ 90 plus vos suivis · 15 à 20 minutes » ; `consent.deep.unavailable` réécrit (adultes, proposer Detailed), espace insécable U+00A0 avant « ; ».

### Antécédents familiaux de démence

`types.ts` : `DementiaFamilyHistory = "reported" | "not-reported" | "unanswered"` et `PathologySynthesis.dementiaFamilyHistory` ; `pathology-risk.ts` lit `dementia_family_history` via `readBoolean` (mineurs → `unanswered`) ; copie EN/FR dans `pathology-copy.ts` ; paragraphe `.pathology-factors__family-history` sous le résumé des quatorze facteurs ; export `pathologyRisk.dementiaFamilyHistory`. Test : la valeur n'entre jamais dans le décompte des facteurs.

### Compteurs obtenus

| Mesure | Première passe | Deuxième passe |
| --- | --- | --- |
| Questions | 215 | **137** |
| Domaines | 44 | **39** |
| Conditionnelles / arêtes de porte | 55 / 66 | **44 / 54** |
| Règles / sources | 59 / 91 | 59 / 91 (inchangées) |
| Adulte 18 ans | 9 / 20 / 50 / 150 | 9 / 20 / 50 / **89** |
| Adulte 35 ans (sans sexe, homme, + médicaments) | 150 / 150 / 154 | **92 / 91 / 96** |
| 13–17 ans | 20 / 50, Deep indisponible (109 de base) | 20 / 50, Deep indisponible (61 de base, adultes seulement) |
| ≤ 12 ans accompagné | 20 / 50 | **17 / 42** |

### Fichiers

- Données : `core.ts`, `lifestyle.ts`, `clinical.ts`, `performance.ts`, `substances.ts`, `medications.ts` et leurs copies FR ; `types.ts`, `health-pillars.ts`, `ui-copy.ts`, `question-guidance.ts`, `question-validation.ts`, `questionnaire.ts`, `pathology-risk.ts`, `pathology-copy.ts`, `pathology-synthesis.tsx`, `export.ts`.
- Tests ajustés : `questionnaire`, `scoring`, `health-pillars`, `question-validation`, `question-control`, `questions-fr`, `ui-copy`, `pathology-risk`, `assessment`, `page`.
- `longevity.ts` (conservé, non rendu) nomme encore seize identifiants supprimés ; il compile et n'est pas affiché. À retirer ou réécrire si le module revient dans les résultats.

### Portes exécutées

| Porte | Résultat |
| --- | --- |
| `npx tsc --noEmit --incremental false` | 0 erreur |
| `npm run lint` | 0 erreur ; 2 avertissements préexistants dans des répertoires ignorés (`.playwright-mcp`, `.remember`) |
| `npx vitest run` | **63 fichiers / 5 527 tests**, tous verts |
| `npm run build` | 5/5 étapes ; avis de taille de chunk préexistant |
| `git diff --check` | propre |

### Non fait

- Revue Fable 5 (orchestrateur indisponible au moment de cette passe) ; les trois décisions d'architecture ci-dessus ont été prises avec l'accord explicite de l'utilisateur. *Revue effectuée le 30 septembre 2026, voir plus bas.*
- Aucune sauvegarde ni déploiement.

## Contrôle navigateur du 30 septembre 2026

Parcours exécutés contre la construction de production (`vinext start`, port 5190, Chromium headless) :

- **Quick adulte EN** (45 ans, Suisse, fumeur) : consentement, 20 questions, import manuel de trois marqueurs (cholestérol total 6,3 mmol/L, HDL 1,4 mmol/L, HbA1c 6,0 % avec dates et statut de jeûne ; la saisie native de date exige un remplissage programmatique en headless, limitation de l'outil et non de l'application). Résultats : section « Conditions » complète, classification HbA1c « zone de prédiabète », bloc démence (2 présents, 3 non rapportés, 9 sans réponse), export JSON intercepté : `health-risk-explorer-report-v3`, `pathologyRisk` complet, `dementiaFamilyHistory: "unanswered"`, aucune clé `rawAnswers` (*ce contrôle n'a pas regardé le contenu des `inputs`, qui portaient encore les valeurs des réponses ; voir la revue ci-dessous*).
- **Deep adulte EN** (35 ans) automatisé de bout en bout : « Question 1 of 92 » puis 92 questions sans blocage ; FINDRISC complet (7/26, ≈ 4 % sur 10 ans), SCORE2 et CAIDE « non applicables » (hors tranche d'âge), ligne d'antécédent familial « not reported » affichée hors décompte des facteurs.
- **Repli mineur FR** (12 ans, Deep) : statut « réservée aux adultes … au plus 50 questions admissibles », bascule « Utiliser l'analyse détaillée » → « Question 1 sur 42 ».
- **Bascule FR des résultats** : copie intégrale vérifiée (« environ 4 % », guillemets, bloc démence).
- **Hygiène** : console vide, aucune requête externe (seule une URI `data:` du sélecteur de date natif), `localStorage` / `sessionStorage` / cookies vides.

### Deux anomalies trouvées et corrigées pendant ce contrôle

1. **FINDRISC jamais complet en Quick.** L'item « médicament antihypertenseur » (`bp_medication_ever`) n'est posé qu'à partir de Detailed, ce qui contredisait l'intention « Quick couvre l'ensemble des items FINDRISC ». Correction dans `pathology-risk.ts` : quand la réponse au diagnostic d'hypertension est « non » et que la question médicament n'a pas été posée, l'absence de traitement est **dérivée** et affichée comme telle (« Blood-pressure medicine · derived »), à l'image de la dérivation existante de l'activité quotidienne. Le cas « diagnostic positif ou incertain sans réponse médicament » reste incomplet. Deux tests ajoutés.
2. **Indications d'entrées manquantes trompeuses.** Elles affichaient la profondeur la plus superficielle de la question (« posée à partir de l'analyse rapide ») même quand la file réelle ne l'avait pas posée (budget Quick attribué à la branche nicotine, branche restée fermée en Deep). Correction dans `pathology-synthesis.tsx` : l'indication dépend désormais de la profondeur et des réponses réelles — « laissée sans réponse ou marquée « pas sûr » » si la question était dans la file, « posée après « … » » avec le libellé de la porte si une branche est restée fermée, « indisponible à partir de vos réponses » sinon, l'indication de profondeur étant conservée uniquement pour les questions d'un palier plus profond. Trois tests composant ajoutés, l'expectation COPD existante mise à jour.

Portes après corrections : `tsc` 0 erreur ; `vitest` **63 fichiers / 5 532 tests** ; `lint` 0 erreur (2 avertissements préexistants hors `app/`) ; `build` 5/5 ; `git diff --check` propre. Revérifié en navigateur après reconstruction : FINDRISC complet en Quick (9/26, ≈ 4 %) avec dérivation étiquetée, indications honnêtes en EN et FR.

## Revue Fable 5 du 30 septembre 2026

Revue en deux passes (cinq lectures parallèles par lot : moteur, questionnaire et banque, UI et export, règles et sources, documentation ; puis validation indépendante de chaque constat par l'orchestrateur avec scripts de mesure hors dépôt). Verdict : pas de commit en l'état ; un constat bloquant, sept constats mineurs, deux décisions d'architecture, six corrections de documentation. Tous sont traités ci-dessous.

### Vérifié conforme

Coefficients, centrages, survie de base et recalibration « faible risque » de SCORE2 et SCORE2-OP ; FINDRISC, STOP-Bang, AUDIT-C, PHQ-2, GAD-2, COPD-PS, CAIDE, bandes ADA et KDIGO ; traitement des valeurs hors options et des réponses « pas sûr » ; synthèse vide pour les mineurs ; pourcentages conditionnés à `allowValidatedProbabilities`. Banque : 137 questions, 39 domaines, 44 conditionnelles, 54 arêtes, aucune référence pendante dans les règles, les piliers, le moteur, la validation et le guidage ; portes toutes satisfiables ; parité FR 137/137. UI : copies EN/FR exhaustives, `missingOrigin` correct pour les quatre profondeurs, aucun `undefined` rendu. Règles et sources : 59 règles et 91 sources résolues, 20 citations exactes.

### Constats et corrections

| Priorité | Constat | Correction |
| --- | --- | --- |
| P1 | L'export par défaut recopiait `inputs` avec les valeurs des réponses (`sex_assigned_at_birth`, tour de taille, systolique, tabac, humeur, alcool, âge, pays), contournant l'opt-in `includeRawAnswers` et la frontière documentée | `interpretedScore` n'exporte plus que `{ id, derived? }` ; tests inversés (`export.test.ts`, `results.test.tsx`) avec assertions négatives sur les valeurs ; test d'opt-in adulte ajouté ; docs corrigées |
| P3 | Glycémie au statut de jeûne `not_stated` classée « non à jeun » | Catégorie `fasting-unknown` distincte, copie EN/FR |
| P3 | `PLAUSIBLE.ldlMmol` inutilisé ; LDL du facteur `high-ldl` sans borne | Borne appliquée (350 mmol/L → facteur sans réponse) |
| P3 | Cinq enfants de branche dont les paliers dépassaient ceux de leur porte (3 corticostéroïdes passés en deep-only, 2 branches adolescentes) | Paliers alignés ; test d'invariant « enfant ⊆ portes » dans `health-pillars.test.ts` |
| P3 | Espaces simples avant `?` et `;` dans `depression_history` et `head_injury_history` (FR) | U+00A0 |
| P3 | `\u00a0` avant `%` dans les bandes HbA1c FR, espace avant `%` en EN | `\u202f` en FR, pas d'espace en EN |
| P3 | `reviewedAt` 2026-08-03 pour les 20 nouvelles sources alors que le registre et l'UI annoncent 2026-09-29 | `REVIEWED_AT_PATHOLOGY`, paramètre optionnel de `source()` ; 20 × 2026-09-29, 71 × 2026-08-03 |
| P3 | `longevity.ts` inatteignable, lit encore 16 questions supprimées | Décision : suppression du module, de `longevity-synthesis.tsx`, de leurs tests et clés de copie dans un commit dédié. *Fait : 4 fichiers supprimés, 61 clés `longevity.*` retirées en EN et en FR, bloc CSS `.longevity*` retiré, README et privacy mis à jour.* |

### Décisions d'architecture

- **SCORE2 et conditions déclarées.** Les options `heart_vascular` et `kidney` de `diagnosed_conditions_core` sont trop larges pour une exclusion dure ; l'ESC classe pourtant l'athérosclérose établie et l'IRC modérée ou sévère en risque élevé ou très élevé. Choix : modificateurs affichés `declared_heart_vascular` et `declared_kidney` (copie EN/FR), sans changement de l'estimation ni entrée factice.
- **Budget Detailed.** Priorités conservées ; l'écart entre l'intention de la première passe et la file mesurée est documenté (section « Detailed 50 »).
- **Validées sans changement** : Deep = toutes les questions éligibles (minimum 80, adultes) ; minimums 10 / 30 ; mineurs « jusqu'à » 20 / 50 ; dérivation `bp_medication_ever = false` depuis un diagnostic d'hypertension négatif ; cinq racines protectrices conservées ; `dementia_family_history` en contexte.

### Approximations documentées

CAIDE « inactif » = moins de 60 minutes hebdomadaires déclarées (l'instrument compte moins de deux séances de 20–30 minutes) ; AUDIT-C applique le seuil masculin quand le sexe n'est pas déclaré ; `allowValidatedProbabilities` a un second lecteur, `risk-engine.ts` (`validated-estimate`, aucune règle aujourd'hui).

### Portes après la revue

`tsc --noEmit --incremental false` 0 erreur ; `npm run lint` 0 erreur (2 avertissements préexistants hors `app/`) ; `vitest` **63 fichiers / 5 537 tests** ; `npm run build` complet ; `git diff --check` propre sur les fichiers suivis et nouveaux. Commit de la fonctionnalité puis commit séparé de suppression du module `longevity` (après suppression : 61 fichiers / 5 515 tests, les 22 tests du module en moins ; tsc, lint, build et `diff --check` inchangés), tous deux locaux à cette date (poussés et déployés le 1er octobre 2026, voir la section suivante).

## Publication du 1er octobre 2026

`main` (jusqu'au commit `d69fcd8`) a été poussé sur GitHub puis déployé par la CLI Vercel : déploiement `dpl_EawSrkFMSCgdNHgf244nqZTw5kMm`, alias `https://will-i-die-soon.vercel.app`, Next 16.3.8. Le déploiement précédent, `dpl_52zT2JsyqQACNwLyrjpyfbApQK3n` (source `415b33d`), reste la cible de retour arrière. Le dossier de publication (dépendances, scans, cible, vérifications) est dans [`privacy-and-release.md`](../privacy-and-release.md#2026-10-01-vercel-public-deployment-record).

### Contrôle navigateur sur l'alias public

Chrome réel, cache froid, réseau lent. Parcours Express complet en anglais et parcours Quick complet en français (consentement, file de questions, alerte de réponse requise sur un choix multiple vide, interludes, résultats). La section « Pathologies les plus probables à discuter » s'affiche avec :

- FINDRISC : 11 / 26 points, « risque légèrement élevé », environ 4 % sur 10 ans, conforme à la bande publiée (cohérent avec le contrôle local du 30 septembre : 9 / 26, ≈ 4 %) ;
- PHQ-2 : 2 / 6, sous le seuil ;
- SCORE2, STOP-Bang, COPD-PS et CAIDE : « estimation pas encore possible », avec les entrées manquantes nommées et la profondeur qui les pose (« analyse détaillée », « bilan sanguin importé »).

Console et erreurs de page vides ; 17 et 21 requêtes GET (une série par parcours), toutes vers l'origine de l'alias (ressources statiques et médias décoratifs) ; cookies, `localStorage`, `sessionStorage`, IndexedDB et service workers vides ; URL inchangée (`/`). Le script différé de 550 Ko est le cœur de `three` (atlas 3D), chargé après l'hydratation comme avant cette mise à jour.

### Non fait sur l'alias

Parcours Detailed et Deep, import de bilan, mise en page mobile, impression et export JSON : couverts en local le 30 septembre, non rejoués en production. Les en-têtes de sécurité du Worker ne s'appliquent pas sur Vercel (seul `strict-transport-security` est renvoyé) ; les pourcentages de maladie restent affichés sur l'alias public (`publicWellnessPolicy` non branchée) ; 17 avis d'outillage de développement subsistent. Ces trois points sont décrits dans `privacy-and-release.md` et demandent une décision et une revue propres.
