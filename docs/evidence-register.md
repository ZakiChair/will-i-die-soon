# Evidence register

Register audit date: **2026-08-03**. This document describes the exact checked-in private-research prototype. It is an inventory of transparent rule outputs and source consumption, not a claim that the product or any rule is clinically validated.

## Policy and release boundary

The running results route selects `prototypePolicy`: audience `private-research`, qualitative rules enabled, prompt-review and urgent signals enabled, and validated probabilities disabled. The public-wellness and regulated policies in source are separate policy foundations and are not active release modes. A public wellness release needs a new content, privacy, security, regulatory, and access review. Any regulated module additionally needs a named jurisdiction, frozen validated model version, exact eligibility, endpoint and horizon, test vectors, rights, quality/risk management, and the relevant conformity work.

All active outputs are deterministic checks over declared questionnaire IDs. There is no hidden model, remote inference, learned weighting, mortality predictor, life-expectancy estimate, or date-of-death estimate. No rule emits a numeric disease probability. The active inventory contains **zero `validated-estimate` rules**; a publication's presence does not activate a model.

An evidence tier classifies what a specific output/rule is permitted to say. It does **not** label a publication as intrinsically “authoritative,” “guideline,” or “limited.” The same publication could support outputs with different allowed claims. Here, `authoritative-safety` permits a regulator/public-health safety warning without a probability; `guideline-action` permits a measurement, screening, support, or clinician-discussion action; and `evidence-limited-association` permits qualitative context only.

## Inventory summary

- **54 active rules** across **14 declared groups**; **12 groups are nonempty**. `metabolic` and `kidney` are deliberately empty because no safe standalone rule has been qualified for their current inputs.
- Group counts in declared enum order: **9 / 1 / 0 / 2 / 1 / 1 / 0 / 2 / 4 / 26 / 1 / 1 / 5 / 1**.
- Evidence tiers: **29 authoritative-safety**, **21 guideline-action**, **4 evidence-limited-association**, **0 validated-estimate**.
- Urgency: **9 urgent**, **31 prompt-review**, **3 long-term**, **11 support**.
- Signals: **9 urgent**, **27 high-signal**, **18 worth-attention**, **0 low-signal**.
- `app/data/evidence.ts` declares **71** sources and **71 unique URLs**. Rules reference **65** records; **6** are inactive. There are no unknown source references.
- Rule use contains **146 source occurrences**: **122 base/direct** occurrences across **61 distinct** source IDs, plus **24 conditional** occurrences across **4 distinct** product-label source IDs. Combined rule consumption is **65 distinct** source IDs.
- The Purity Score uses **8 supplemental `ScoreSource` records** outside the evidence registry. Across rule evidence plus score evidence there are **73 active source records** and **70 unique URLs** because three score URLs exactly match registry URLs.

## Rule groups

All nonempty groups below are enabled under the selected private-research policy and evaluated only for a matching declared population and condition.

| Group | Rules | Status |
| --- | ---: | --- |
| `immediate-red-flags` | 9 | enabled |
| `cardiovascular` | 1 | enabled |
| `metabolic` | 0 | empty; no standalone rule released |
| `sleep` | 2 | enabled |
| `respiratory` | 1 | enabled |
| `liver` | 1 | enabled |
| `kidney` | 0 | empty; no standalone rule released |
| `mental-wellbeing` | 2 | enabled |
| `dependency` | 4 | enabled |
| `medication-substance-review` | 26 | enabled |
| `preventive-follow-up` | 1 | enabled |
| `skin-hair` | 1 | enabled |
| `reproductive-health` | 5 | enabled |
| `musculoskeletal` | 1 | enabled |

## Complete rule register

Population is the exact rule-level applicability. `all` means all questionnaire countries, not that every linked service or product label operates in every country. Conditional source IDs are selected only when their exact product condition matches.

| Rule ID | Group | Tier | Urgency | Signal | Applicable population | Source IDs |
| --- | --- | --- | --- | --- | --- | --- |
| `urgent-chest` | `immediate-red-flags` | `authoritative-safety` | `urgent` | `urgent` | `countries: all` | `nhsChestPain`, `whoBasicEmergencyCare`, `us911EmergencyAssistance`, `nhsWhenToCall999`, `swissEmergencyNumbers` |
| `urgent-breathing` | `immediate-red-flags` | `authoritative-safety` | `urgent` | `urgent` | `countries: all` | `nhsShortnessOfBreath`, `nhsChildFirstAid`, `whoBasicEmergencyCare`, `us911EmergencyAssistance`, `nhsWhenToCall999`, `swissEmergencyNumbers` |
| `urgent-stroke` | `immediate-red-flags` | `authoritative-safety` | `urgent` | `urgent` | `countries: all` | `nhsStroke`, `whoBasicEmergencyCare`, `us911EmergencyAssistance`, `nhsWhenToCall999`, `swissEmergencyNumbers` |
| `urgent-severe-allergy` | `immediate-red-flags` | `authoritative-safety` | `urgent` | `urgent` | `countries: all` | `nhsAnaphylaxis`, `whoBasicEmergencyCare`, `us911EmergencyAssistance`, `nhsWhenToCall999`, `swissEmergencyNumbers` |
| `urgent-overdose-poisoning` | `immediate-red-flags` | `authoritative-safety` | `urgent` | `urgent` | `countries: all` | `nhsPoisoning`, `fophUfiEmergency`, `whoBasicEmergencyCare`, `us911EmergencyAssistance`, `nhsWhenToCall999`, `swissEmergencyNumbers` |
| `urgent-severe-bleeding` | `immediate-red-flags` | `authoritative-safety` | `urgent` | `urgent` | `countries: all` | `nhsFirstAid`, `whoBasicEmergencyCare`, `us911EmergencyAssistance`, `nhsWhenToCall999`, `swissEmergencyNumbers` |
| `urgent-self-harm` | `immediate-red-flags` | `authoritative-safety` | `urgent` | `urgent` | `countries: all` | `niceSelfHarm`, `samhsa988`, `whoSuicide`, `whoBasicEmergencyCare`, `us911EmergencyAssistance`, `nhsWhenToCall999`, `swissEmergencyNumbers` |
| `urgent-adolescent-pregnancy-safety` | `immediate-red-flags` | `guideline-action` | `urgent` | `urgent` | ages 13–17; `countries: all` | `whoPregnancyHealthServices`, `whoBasicEmergencyCare`, `us911EmergencyAssistance`, `nhsWhenToCall999`, `swissEmergencyNumbers` |
| `urgent-adolescent-substance-safety` | `immediate-red-flags` | `guideline-action` | `urgent` | `urgent` | ages 13–17; `countries: all` | `whoBasicEmergencyCare`, `us911EmergencyAssistance`, `nhsWhenToCall999`, `swissEmergencyNumbers` |
| `blood-pressure-salt-context` | `cardiovascular` | `guideline-action` | `long-term` | `worth-attention` | age 18+; `countries: all` | `whoHealthyDiet` |
| `adult-short-sleep` | `sleep` | `guideline-action` | `long-term` | `worth-attention` | age 18+; `countries: all` | `cdcAdultSleep` |
| `sleep-breathing-review` | `sleep` | `guideline-action` | `prompt-review` | `high-signal` | age 18+; `countries: all` | `nhsSleepApnoea`, `nhsDaytimeSleepiness` |
| `breathlessness-review` | `respiratory` | `guideline-action` | `prompt-review` | `high-signal` | age 18+; `countries: all` | `nhsShortnessOfBreath`, `whoBasicEmergencyCare` |
| `anabolic-liver-symptom-review` | `liver` | `authoritative-safety` | `prompt-review` | `high-signal` | age 18+; `countries: all` | `fdaBodybuildingProducts`, `fdaSarmsWarning`, `nhsJaundice` |
| `low-mood-support` | `mental-wellbeing` | `guideline-action` | `support` | `worth-attention` | age 18+; `countries: all` | `niceDepression`, `whoDepression` |
| `child-feeling-support` | `mental-wellbeing` | `guideline-action` | `support` | `worth-attention` | ages 5–12; `countries: all` | `nhsChildMentalHealthSupport`, `whoChildYoungPeopleMentalHealthServices` |
| `alcohol-control-support` | `dependency` | `guideline-action` | `support` | `worth-attention` | age 18+; `countries: all` | `niaaaAlcoholControl`, `fophAddictionHelp` |
| `nicotine-support` | `dependency` | `guideline-action` | `support` | `worth-attention` | age 18+; `countries: all` | `whoTobacco`, `fophAddictionHelp` |
| `adolescent-substance-support` | `dependency` | `guideline-action` | `support` | `worth-attention` | ages 13–17; `countries: all` | `whoAdolescentFriendlyServices`, `samhsaYouthSubstanceSupport` |
| `adolescent-substance-safety-support` | `dependency` | `guideline-action` | `support` | `high-signal` | ages 13–17; `countries: all` | `whoAdolescentFriendlyServices`, `samhsaYouthSubstanceSupport`, `cdcPolysubstanceOverdose` |
| `glp1-severe-allergy` | `medication-substance-review` | `authoritative-safety` | `prompt-review` | `high-signal` | age 18+; `countries: all` | `nhsAnaphylaxis`; conditional: `dailymedZepboundTirzepatide`, `dailymedWegovySemaglutide`, `dailymedSaxendaLiraglutide`, `dailymedTrulicityDulaglutide` |
| `glp1-gastrointestinal-review` | `medication-substance-review` | `authoritative-safety` | `prompt-review` | `high-signal` | age 18+; `countries: all` | conditional: `dailymedZepboundTirzepatide`, `dailymedWegovySemaglutide`, `dailymedSaxendaLiraglutide`, `dailymedTrulicityDulaglutide` |
| `glp1-glucose-symptom-review` | `medication-substance-review` | `authoritative-safety` | `prompt-review` | `high-signal` | age 18+; `countries: all` | conditional: `dailymedZepboundTirzepatide`, `dailymedWegovySemaglutide`, `dailymedSaxendaLiraglutide`, `dailymedTrulicityDulaglutide` |
| `glp1-diabetes-vision-review` | `medication-substance-review` | `authoritative-safety` | `prompt-review` | `high-signal` | age 18+; `countries: all` | conditional: `dailymedZepboundTirzepatide`, `dailymedWegovySemaglutide`, `dailymedSaxendaLiraglutide`, `dailymedTrulicityDulaglutide` |
| `glp1-history-review` | `medication-substance-review` | `authoritative-safety` | `prompt-review` | `worth-attention` | age 18+; `countries: all` | conditional: `dailymedZepboundTirzepatide`, `dailymedWegovySemaglutide`, `dailymedSaxendaLiraglutide`, `dailymedTrulicityDulaglutide` |
| `glp1-pregnancy-procedure-review` | `medication-substance-review` | `authoritative-safety` | `prompt-review` | `high-signal` | age 18+; `countries: all` | `nhsPregnancyMedicines`; conditional: `dailymedZepboundTirzepatide`, `dailymedWegovySemaglutide`, `dailymedSaxendaLiraglutide`, `dailymedTrulicityDulaglutide` |
| `isotretinoin-physical-symptom-review` | `medication-substance-review` | `authoritative-safety` | `prompt-review` | `high-signal` | age 18+; `countries: all` | `fdaIsotretinoin` |
| `isotretinoin-mood-review` | `medication-substance-review` | `authoritative-safety` | `prompt-review` | `high-signal` | age 18+; `countries: all` | `fdaIsotretinoin`, `niceSelfHarm` |
| `isotretinoin-pregnancy-program-review` | `medication-substance-review` | `authoritative-safety` | `prompt-review` | `high-signal` | age 18+; `countries: all` | `fdaIsotretinoin`, `nhsPregnancyMedicines` |
| `oral-minoxidil-symptom-review` | `medication-substance-review` | `authoritative-safety` | `prompt-review` | `high-signal` | age 18+; `countries: all` | `fdaOralMinoxidil` |
| `topical-minoxidil-scalp-review` | `medication-substance-review` | `authoritative-safety` | `prompt-review` | `worth-attention` | age 18+; `countries: all` | `fdaTopicalMinoxidil` |
| `topical-minoxidil-symptom-review` | `medication-substance-review` | `authoritative-safety` | `prompt-review` | `high-signal` | age 18+; `countries: all` | `fdaTopicalMinoxidil` |
| `systemic-steroid-illness-review` | `medication-substance-review` | `authoritative-safety` | `prompt-review` | `high-signal` | age 18+; `countries: all` | `eseEndocrineSocietyGlucocorticoidAdrenalInsufficiency` |
| `systemic-steroid-omission-review` | `medication-substance-review` | `authoritative-safety` | `prompt-review` | `high-signal` | age 18+; `countries: all` | `fdaPrednisone`, `mhraSteroidEmergencyCard`, `eseEndocrineSocietyGlucocorticoidAdrenalInsufficiency` |
| `research-product-source-review` | `medication-substance-review` | `evidence-limited-association` | `prompt-review` | `worth-attention` | age 18+; `countries: all` | `fdaUnapprovedDrugs`, `whoSubstandardFalsifiedMedicalProducts` |
| `research-product-condition-review` | `medication-substance-review` | `evidence-limited-association` | `prompt-review` | `high-signal` | age 18+; `countries: all` | `fdaProductProblems` |
| `research-product-storage-review` | `medication-substance-review` | `evidence-limited-association` | `prompt-review` | `worth-attention` | age 18+; `countries: all` | `fdaMedicationStorage` |
| `anabolic-cardiorespiratory-review` | `medication-substance-review` | `authoritative-safety` | `prompt-review` | `high-signal` | age 18+; `countries: all` | `fdaBodybuildingProducts`, `fdaSarmsWarning` |
| `anabolic-leg-symptom-review` | `medication-substance-review` | `authoritative-safety` | `prompt-review` | `high-signal` | age 18+; `countries: all` | `fdaBodybuildingProducts`, `fdaSarmsWarning` |
| `anabolic-neurologic-review` | `medication-substance-review` | `authoritative-safety` | `prompt-review` | `high-signal` | age 18+; `countries: all` | `fdaBodybuildingProducts`, `fdaSarmsWarning`, `nhsStroke` |
| `anabolic-mood-review` | `medication-substance-review` | `authoritative-safety` | `prompt-review` | `high-signal` | age 18+; `countries: all` | `fdaBodybuildingProducts`, `fdaSarmsWarning`, `niceSelfHarm` |
| `cannabis-unwanted-effect-review` | `medication-substance-review` | `guideline-action` | `prompt-review` | `worth-attention` | age 18+; `countries: all` | `cdcCannabisEffects` |
| `stimulant-symptom-review` | `medication-substance-review` | `authoritative-safety` | `prompt-review` | `high-signal` | age 18+; `countries: all` | `fdaStimulantMisuse`, `cdcStimulantOverdose` |
| `opioid-mixing-safety-review` | `medication-substance-review` | `authoritative-safety` | `prompt-review` | `high-signal` | age 18+; `countries: all` | `fdaOpioidSedativeMixing`, `cdcPolysubstanceOverdose` |
| `psychedelic-aftereffect-review` | `medication-substance-review` | `evidence-limited-association` | `support` | `worth-attention` | age 18+; `countries: all` | `nidaPsychedelicAfterEffects` |
| `recreational-drug-effect-review` | `medication-substance-review` | `guideline-action` | `prompt-review` | `high-signal` | age 18+; `countries: all` | `cdcPolysubstanceOverdose`, `nhsPoisoning` |
| `eating-distress-support` | `preventive-follow-up` | `guideline-action` | `support` | `worth-attention` | age 18+; `countries: all` | `niceEatingDisorders` |
| `changing-skin-mark-review` | `skin-hair` | `guideline-action` | `prompt-review` | `high-signal` | age 18+; `countries: all` | `nhsChangingMole` |
| `sexual-safety-support` | `reproductive-health` | `guideline-action` | `support` | `worth-attention` | age 13+; `countries: all` | `nhsSexualAssaultSupport`, `whoSexualViolenceSurvivorCare`, `whoChildAdolescentSexualAbuse` |
| `pregnancy-new-concern-review` | `reproductive-health` | `guideline-action` | `prompt-review` | `high-signal` | age 18+; `countries: all` | `cdcPregnantPostpartum`, `whoPregnancyHealthServices`, `whoPostpartumHealthServices` |
| `pregnancy-care-safety-support` | `reproductive-health` | `guideline-action` | `support` | `worth-attention` | age 18+; `countries: all` | `whoPregnancyHealthServices` |
| `pregnancy-medicine-review` | `reproductive-health` | `authoritative-safety` | `prompt-review` | `high-signal` | age 18+; `countries: all` | `nhsPregnancyMedicines`, `cdcMedicinePregnancy`, `whoPregnancyMedicineSafety`, `whoMedicationWithoutHarm` |
| `minor-pregnancy-support` | `reproductive-health` | `guideline-action` | `support` | `worth-attention` | ages 13–17; `countries: all` | `whoAdolescentFriendlyServices` |
| `adult-movement-pattern` | `musculoskeletal` | `guideline-action` | `long-term` | `worth-attention` | age 18+; `countries: all` | `cdcAdultActivity`, `whoPhysicalActivity` |

## Complete source registry

`Provenance` is the publisher/regulator jurisdiction recorded in source, not an automatic country restriction. `Applicability` is the source population declared in code. Country-specific operational emergency links remain country-gated by the engine even when a rule's overall output population is `all`. “Conditional-only” means a label is consumed only after its exact product condition matches. Inactive records are reviewed inventory entries but are not consumed by any current rule.

| Registry key / source ID | Title; publisher | Exact URL | Reviewed | Provenance | Applicability | Consumption |
| --- | --- | --- | --- | --- | --- | --- |
| `nhsChestPain` / `nhs-chest-pain` | Chest pain; NHS | <https://www.nhs.uk/conditions/chest-pain/> | 2026-08-03 | `GB` | `countries: all` | active — direct |
| `nhsShortnessOfBreath` / `nhs-shortness-of-breath` | Shortness of breath; NHS | <https://www.nhs.uk/symptoms/shortness-of-breath/> | 2026-08-03 | `GB` | `countries: all` | active — direct |
| `nhsStroke` / `nhs-stroke-symptoms` | Symptoms of a stroke; NHS | <https://www.nhs.uk/conditions/stroke/symptoms/> | 2026-08-03 | `GB` | `countries: all` | active — direct |
| `nhsAnaphylaxis` / `nhs-anaphylaxis` | Anaphylaxis; NHS | <https://www.nhs.uk/conditions/anaphylaxis/> | 2026-08-03 | `GB` | `countries: all` | active — direct |
| `nhsPoisoning` / `nhs-poisoning` | Poisoning; NHS | <https://www.nhs.uk/conditions/poisoning/> | 2026-08-03 | `GB` | `countries: all` | active — direct |
| `nhsFirstAid` / `nhs-first-aid` | First aid; NHS | <https://www.nhs.uk/tests-and-treatments/first-aid/> | 2026-08-03 | `GB` | `countries: all` | active — direct |
| `nhsChildFirstAid` / `nhs-child-first-aid` | What to do if your child has an accident; NHS | <https://www.nhs.uk/baby/first-aid-and-safety/first-aid/what-to-do-if-your-child-has-an-accident/> | 2026-08-03 | `GB` | `maxAge: 17; countries: all` | active — direct |
| `samhsa988` / `samhsa-988-faqs` | 988 Frequently Asked Questions; Substance Abuse and Mental Health Services Administration | <https://www.samhsa.gov/mental-health/988/faqs> | 2026-08-03 | `US` | `countries: US` | active — direct |
| `us911EmergencyAssistance` / `us-911-emergency-assistance` | Calling 911; National 911 Program | <https://www.911.gov/calling-911/> | 2026-08-03 | `US` | `countries: US` | active — direct |
| `nhsWhenToCall999` / `nhs-when-to-call-999` | When to call 999; NHS | <https://www.nhs.uk/nhs-services/urgent-and-emergency-care-services/when-to-call-999/> | 2026-08-03 | `GB` | `countries: GB` | active — direct |
| `swissEmergencyNumbers` / `swiss-emergency-numbers` | Emergencies and danger; Swiss Confederation, cantons and communes | <https://www.ch.ch/en/safety-and-justice/emergencies-and-danger/> | 2026-08-03 | `CH` | `countries: CH` | active — direct |
| `niceSelfHarm` / `nice-self-harm` | Self-harm: assessment, management and preventing recurrence; NICE | <https://www.nice.org.uk/guidance/ng225> | 2026-08-03 | `GB` | `countries: all` | active — direct |
| `whoBasicEmergencyCare` / `who-basic-emergency-care` | WHO-ICRC Basic Emergency Care: approach to the acutely ill and injured; WHO / ICRC | <https://www.who.int/publications/i/item/9789241513081> | 2026-08-03 | `all` | `countries: all` | active — direct |
| `whoSuicide` / `who-suicide` | Suicide; World Health Organization | <https://www.who.int/news-room/fact-sheets/detail/suicide> | 2026-08-03 | `all` | `countries: all` | active — direct |
| `cdcAdultSleep` / `cdc-adult-sleep` | About Sleep and Your Heart Health; Centers for Disease Control and Prevention | <https://www.cdc.gov/heart-disease/about/sleep-and-heart-health.html> | 2026-08-03 | `US` | `minAge: 18; countries: all` | active — direct |
| `nhsSleepApnoea` / `nhs-sleep-apnoea` | Sleep apnoea; NHS | <https://www.nhs.uk/conditions/sleep-apnoea/> | 2026-08-03 | `GB` | `countries: all` | active — direct |
| `nhsDaytimeSleepiness` / `nhs-daytime-sleepiness` | Excessive daytime sleepiness (hypersomnia); NHS | <https://www.nhs.uk/conditions/excessive-daytime-sleepiness-hypersomnia/> | 2026-08-03 | `GB` | `countries: all` | active — direct |
| `whoTobacco` / `who-tobacco` | Tobacco; World Health Organization | <https://www.who.int/news-room/fact-sheets/detail/tobacco> | 2026-08-03 | `all` | `countries: all` | active — direct |
| `cdcAdultActivity` / `cdc-adult-activity` | Adult Activity: An Overview; Centers for Disease Control and Prevention | <https://www.cdc.gov/physical-activity-basics/guidelines/adults.html> | 2026-08-03 | `US` | `minAge: 18; countries: all` | active — direct |
| `whoPhysicalActivity` / `who-physical-activity-guidelines` | WHO guidelines on physical activity and sedentary behaviour; World Health Organization | <https://www.who.int/publications/i/item/9789240015128> | 2026-08-03 | `all` | `countries: all` | active — direct |
| `whoHealthyDiet` / `who-healthy-diet` | Healthy diet; World Health Organization | <https://www.who.int/news-room/fact-sheets/detail/healthy-diet> | 2026-08-03 | `all` | `countries: all` | active — direct |
| `niceEatingDisorders` / `nice-eating-disorders` | Eating disorders: recognition and treatment; NICE | <https://www.nice.org.uk/guidance/ng69> | 2026-08-03 | `GB` | `countries: all` | active — direct |
| `niceDepression` / `nice-depression-adults` | Depression in adults: treatment and management; NICE | <https://www.nice.org.uk/guidance/ng222/chapter/Recommendations> | 2026-08-03 | `GB` | `minAge: 18; countries: all` | active — direct |
| `whoDepression` / `who-depression` | Depressive disorder (depression); World Health Organization | <https://www.who.int/news-room/fact-sheets/detail/depression> | 2026-08-03 | `all` | `countries: all` | active — direct |
| `nhsChildMentalHealthSupport` / `nhs-child-mental-health-support` | Children and young people's mental health services; NHS | <https://www.nhs.uk/mental-health/children-and-young-adults/mental-health-support/mental-health-services/> | 2026-08-03 | `GB` | `maxAge: 17; countries: GB` | active — direct |
| `whoChildYoungPeopleMentalHealthServices` / `who-child-young-people-mental-health-services` | Mental health of children and young people: service guidance; WHO / UNICEF | <https://www.who.int/publications/i/item/9789240100374/> | 2026-08-03 | `all` | `minAge: 5; maxAge: 17; countries: all` | active — direct |
| `niaaaAlcoholControl` / `niaaa-alcohol-control` | What are the symptoms of alcohol use disorder?; National Institute on Alcohol Abuse and Alcoholism | <https://rethinkingdrinking.niaaa.nih.gov/how-much-too-much/what-are-symptoms-alcohol-use-disorder-aud> | 2026-08-03 | `US` | `countries: all` | active — direct |
| `cdcCannabisEffects` / `cdc-cannabis-effects` | Cannabis Frequently Asked Questions; Centers for Disease Control and Prevention | <https://www.cdc.gov/cannabis/faq/> | 2026-08-03 | `US` | `countries: all` | active — direct |
| `fdaStimulantMisuse` / `fda-stimulant-misuse` | FDA updating warnings to improve safe use of prescription stimulants; U.S. Food and Drug Administration | <https://www.fda.gov/drugs/drug-safety-communications/fda-updating-warnings-improve-safe-use-prescription-stimulants-used-treat-adhd-and-other-conditions> | 2026-08-03 | `US` | `countries: all` | active — direct |
| `cdcStimulantOverdose` / `cdc-stimulant-overdose` | A Stimulant Guide: Answers to Emerging Questions About Stimulants in the Context of the Overdose Epidemic; CDC | <https://www.cdc.gov/overdose-prevention/media/pdfs/2024/03/CDC-Stimulant-Guide.pdf> | 2026-08-03 | `US` | `countries: all` | active — direct |
| `fdaOpioidSedativeMixing` / `fda-opioid-sedative-mixing` | New Safety Measures for Opioids and Benzodiazepines; U.S. Food and Drug Administration | <https://www.fda.gov/drugs/food-and-drug-administration-overdose-prevention-framework/new-safety-measures-announced-opioid-analgesics-prescription-opioid-cough-products-and> | 2026-08-03 | `US` | `countries: all` | active — direct |
| `cdcPolysubstanceOverdose` / `cdc-polysubstance-overdose` | Polysubstance Overdose; Centers for Disease Control and Prevention | <https://www.cdc.gov/overdose-prevention/about/polysubstance-overdose.html> | 2026-08-03 | `US` | `countries: all` | active — direct |
| `nidaPsychedelicAfterEffects` / `nida-psychedelic-after-effects` | Hallucinogens and Dissociative Drugs Research Report; National Institute on Drug Abuse | <https://nida.nih.gov/sites/default/files/rrhalluc.pdf> | 2026-08-03 | `US` | `countries: all` | active — direct |
| `whoAdolescentFriendlyServices` / `who-adolescent-friendly-services` | Making health services adolescent friendly; World Health Organization | <https://www.who.int/publications/i/item/9789241503594> | 2026-08-03 | `all` | `minAge: 10; maxAge: 19; countries: all` | active — direct |
| `samhsaYouthSubstanceSupport` / `samhsa-youth-substance-support` | Mental Health, Drug and Alcohol: Support for Teens and Young Adults; SAMHSA | <https://www.samhsa.gov/find-support/how-to-cope/teens-young-adults> | 2026-08-03 | `US` | `minAge: 13; maxAge: 25; countries: US` | active — direct |
| `nhsJaundice` / `nhs-jaundice` | Jaundice; NHS | <https://www.nhs.uk/conditions/jaundice/> | 2026-08-03 | `GB` | `countries: all` | active — direct |
| `cdcStiTesting` / `cdc-sti-testing` | Getting Tested for STIs; Centers for Disease Control and Prevention | <https://www.cdc.gov/sti/testing/index.html> | 2026-08-03 | `US` | `countries: all` | **inactive** |
| `nhsChangingMole` / `nhs-changing-mole` | Moles; NHS | <https://www.nhs.uk/conditions/moles/> | 2026-08-03 | `GB` | `countries: all` | active — direct |
| `nhsSexualAssaultSupport` / `nhs-sexual-assault-support` | Help after rape and sexual assault; NHS | <https://www.nhs.uk/live-well/sexual-health/help-after-rape-and-sexual-assault/> | 2026-08-03 | `GB` | `minAge: 13; countries: GB` | active — direct |
| `whoSexualViolenceSurvivorCare` / `who-sexual-violence-survivor-care` | Clinical management of rape and intimate partner violence in emergencies: a training curriculum for health workers, facilitator guide; WHO | <https://www.who.int/publications/i/item/9789240100213> | 2026-08-03 | `all` | `minAge: 18; countries: all` | active — direct |
| `whoChildAdolescentSexualAbuse` / `who-child-adolescent-sexual-abuse` | Responding to children and adolescents who have been sexually abused: WHO clinical guidelines; WHO | <https://www.who.int/publications/i/item/9789241550147> | 2026-08-03 | `all` | `maxAge: 17; countries: all` | active — direct |
| `nhsPregnancyMedicines` / `nhs-pregnancy-medicines` | Medicines in pregnancy; NHS | <https://www.nhs.uk/pregnancy/keeping-well/medicines/> | 2026-08-03 | `GB` | `countries: GB` | active — direct |
| `whoPregnancyHealthServices` / `who-pregnancy-health-services` | Getting the health services you need: during pregnancy; WHO | <https://www.who.int/tools/your-life-your-health/life-phase/pregnancy--birth-and-after-childbirth/getting-the-health-services-you-need-during-pregnancy> | 2026-08-03 | `all` | `countries: all` | active — direct |
| `whoPostpartumHealthServices` / `who-postpartum-health-services` | Getting the health services you need: after childbirth; WHO | <https://www.who.int/tools/your-life-your-health/life-phase/pregnancy--birth-and-after-childbirth/getting-the-health-services-you-need-after-childbirth> | 2026-08-03 | `all` | `countries: all` | active — direct |
| `cdcPregnantPostpartum` / `cdc-pregnant-postpartum` | Pregnant and Postpartum Women; Centers for Disease Control and Prevention | <https://www.cdc.gov/hearher/pregnant-postpartum/index.html> | 2026-08-03 | `US` | `countries: US` | active — direct |
| `cdcMedicinePregnancy` / `cdc-medicine-pregnancy` | Medicine and Pregnancy: An Overview; Centers for Disease Control and Prevention | <https://www.cdc.gov/medicine-and-pregnancy/about/index.html> | 2026-08-03 | `US` | `countries: US` | active — direct |
| `whoPregnancyMedicineSafety` / `who-pregnancy-medicine-safety` | Safety before and during pregnancy and after baby arrives; WHO | <https://www.who.int/teams/regulation-prequalification/regulation-and-safety/pharmacovigilance/guidance/operations/safety-in-pregnancy> | 2026-08-03 | `all` | `countries: all` | active — direct |
| `whoMedicationWithoutHarm` / `who-medication-without-harm` | Medication Without Harm; WHO | <https://www.who.int/initiatives/medication-without-harm> | 2026-08-03 | `all` | `countries: all` | active — direct |
| `dailymedZepboundTirzepatide` / `dailymed-zepbound-tirzepatide` | ZEPBOUND — tirzepatide injection / KWIKPEN; DailyMed, U.S. National Library of Medicine | <https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=487cd7e7-434c-4925-99fa-aa80b1cc776b&version=38> | 2026-08-03 | `US` | `countries: all` | active — conditional-only |
| `dailymedWegovySemaglutide` / `dailymed-wegovy-semaglutide` | WEGOVY — semaglutide injection/tablet; DailyMed, U.S. National Library of Medicine | <https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=ee06186f-2aa3-4990-a760-757579d8f77b&version=19> | 2026-08-03 | `US` | `countries: all` | active — conditional-only |
| `dailymedSaxendaLiraglutide` / `dailymed-saxenda-liraglutide` | SAXENDA — liraglutide injection; DailyMed, U.S. National Library of Medicine | <https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=3946d389-0926-4f77-a708-0acb8153b143&version=22> | 2026-08-03 | `US` | `countries: all` | active — conditional-only |
| `dailymedTrulicityDulaglutide` / `dailymed-trulicity-dulaglutide` | TRULICITY — dulaglutide injection; DailyMed, U.S. National Library of Medicine | <https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=463050bd-2b1c-40f5-b3c3-0a04bb433309&version=60> | 2026-08-03 | `US` | `countries: all` | active — conditional-only |
| `fdaUnapprovedGlp1` / `fda-unapproved-glp1` | FDA's concerns with unapproved GLP-1 drugs used for weight loss; U.S. Food and Drug Administration | <https://www.fda.gov/drugs/drug-alerts-and-statements/fdas-concerns-unapproved-glp-1-drugs-used-weight-loss> | 2026-08-03 | `US` | `countries: all` | **inactive** |
| `fdaUnapprovedDrugs` / `fda-unapproved-drugs` | FDA's Concerns About Unapproved Drugs; U.S. Food and Drug Administration | <https://www.fda.gov/drugs/unapproved-drugs/fdas-concerns-about-unapproved-drugs> | 2026-08-03 | `US` | `countries: US` | active — direct |
| `whoSubstandardFalsifiedMedicalProducts` / `who-substandard-falsified-medical-products` | Substandard and falsified medical products; World Health Organization | <https://www.who.int/news-room/fact-sheets/detail/substandard-and-falsified-medical-products> | 2026-08-03 | `all` | `countries: all` | active — direct |
| `fdaCompoundedRisks` / `fda-compounded-risks` | Understanding the Risks of Compounded Drugs; U.S. Food and Drug Administration | <https://www.fda.gov/drugs/human-drug-compounding/understanding-risks-compounded-drugs> | 2026-08-03 | `US` | `countries: all` | **inactive** |
| `cdcInjectionSafety` / `cdc-injection-safety` | Safe Injection Practices and Your Health; Centers for Disease Control and Prevention | <https://www.cdc.gov/injection-safety/about/index.html> | 2026-08-03 | `US` | `countries: all` | **inactive** |
| `fdaMedicationStorage` / `fda-medicine-storage` | Safe Drug Use After a Natural Disaster; U.S. Food and Drug Administration | <https://www.fda.gov/drugs/emergency-preparedness-drugs/safe-drug-use-after-natural-disaster> | 2026-08-03 | `US` | `countries: all` | active — direct |
| `fdaProductProblems` / `fda-product-problems` | Product Problems; U.S. Food and Drug Administration | <https://www.fda.gov/safety/reporting-serious-problems-fda/product-problems> | 2026-08-03 | `US` | `countries: all` | active — direct |
| `fdaIsotretinoin` / `fda-isotretinoin-label` | Isotretinoin capsule prescribing information; DailyMed / U.S. FDA | <https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=28948c32-a598-4bb5-bdb5-efbd87214d98> | 2026-08-03 | `US` | `countries: all` | active — direct |
| `fdaTopicalMinoxidil` / `fda-topical-minoxidil` | Minoxidil topical solution 5% Drug Facts; DailyMed / U.S. FDA | <https://dailymed.nlm.nih.gov/dailymed/fda/fdaDrugXsl.cfm?setid=a05bc954-d369-4eb6-8a7d-d68955af874f&type=display> | 2026-08-03 | `US` | `countries: all` | active — direct |
| `fdaOralMinoxidil` / `fda-oral-minoxidil` | Minoxidil tablet prescribing information; DailyMed / U.S. FDA | <https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=f0dae476-8d0b-4d0c-a505-ad51bf27a1c8&version=11> | 2026-08-03 | `US` | `countries: all` | active — direct |
| `fdaBodybuildingProducts` / `fda-bodybuilding-products` | Caution: Bodybuilding Products Can Be Risky; U.S. Food and Drug Administration | <https://www.fda.gov/consumers/consumer-updates/caution-bodybuilding-products-can-be-risky> | 2026-08-03 | `US` | `countries: all` | active — direct |
| `fdaSarmsWarning` / `fda-sarms-warning` | Certain bodybuilding products put consumers at risk; U.S. Food and Drug Administration | <https://www.fda.gov/drugs/fraudulent-products/certain-bodybuilding-products-put-consumers-risk-heart-attack-stroke-serious-liver-damage-and-more> | 2026-08-03 | `US` | `countries: all` | active — direct |
| `fdaPrednisone` / `fda-prednisone-label` | Rayos (prednisone) prescribing information; U.S. Food and Drug Administration | <https://www.accessdata.fda.gov/drugsatfda_docs/label/2024/202020s013lbl.pdf> | 2026-08-03 | `US` | `countries: US` | active — direct |
| `eseEndocrineSocietyGlucocorticoidAdrenalInsufficiency` / `ese-endocrine-society-glucocorticoid-adrenal-insufficiency` | Glucocorticoid-Induced Adrenal Insufficiency; European Society of Endocrinology / Endocrine Society | <https://www.endocrine.org/clinical-practice-guidelines/glucocorticoid-induced-adrenal-insufficiency> | 2026-08-03 | `all` | `countries: all` | active — direct |
| `mhraSteroidEmergencyCard` / `mhra-steroid-emergency-card` | Steroid Emergency Card to support early recognition and treatment of adrenal crisis in adults; NHS England & NHS Improvement / MHRA | <https://www.cas.mhra.gov.uk/ViewandAcknowledgment/ViewAlert.aspx?AlertID=103082> | 2026-08-03 | `GB` | `minAge: 18; countries: GB` | active — direct |
| `mhraCorticosteroids` / `mhra-corticosteroids` | Corticosteroids: early psychiatric side-effects; Medicines and Healthcare products Regulatory Agency | <https://www.gov.uk/drug-safety-update/corticosteroids-early-psychiatric-side-effects> | 2026-08-03 | `GB` | `countries: all` | **inactive** |
| `fdaCompoundedSemaglutide` / `fda-compounded-semaglutide` | Dosing errors associated with compounded injectable semaglutide products; U.S. Food and Drug Administration | <https://www.fda.gov/drugs/human-drug-compounding/fda-alerts-health-care-providers-compounders-and-patients-dosing-errors-associated-compounded> | 2026-08-03 | `US` | `countries: all` | **inactive** |
| `fophAddictionHelp` / `foph-addiction-help` | Addiction support services; Swiss Federal Office of Public Health | <https://www.bag.admin.ch/de/hilfsangebote-sucht> | 2026-08-03 | `CH` | `countries: CH` | active — direct |
| `fophUfiEmergency` / `foph-ufi-emergency` | The UFI code: rapid aid in an emergency; Swiss Federal Office of Public Health | <https://www.bag.admin.ch/en/the-ufi-code-rapid-aid-in-an-emergency> | 2026-08-03 | `CH` | `countries: CH` | active — direct |

## Supplemental Purity Score sources

The following eight records are consumed by the adult Purity Score and action planner outside `app/data/evidence.ts`. This documentation supplies their release classification without changing the established `ScoreSource` or export schema: **audit/review date 2026-08-03; output tier `guideline-action`; applicable output population age 18+ in all questionnaire countries; selected policy private-research**. They support a transparent wellness-habit index, never a disease probability, diagnosis, mortality estimate, or pediatric score.

| Score key | Title; publisher | Exact URL | Registry overlap | Consumption |
| --- | --- | --- | --- | --- |
| `tobacco` | Tobacco; World Health Organization | <https://www.who.int/news-room/fact-sheets/detail/tobacco> | `whoTobacco` | active — score |
| `alcohol` | Alcohol; World Health Organization | <https://www.who.int/news-room/fact-sheets/detail/alcohol> | none | active — score |
| `movement` | Physical activity; World Health Organization | <https://www.who.int/europe/news-room/fact-sheets/item/physical-activity> | none | active — score |
| `nutrition` | Healthy diet; World Health Organization | <https://www.who.int/news-room/fact-sheets/detail/healthy-diet> | `whoHealthyDiet` | active — score |
| `sleep` | About sleep; Centers for Disease Control and Prevention | <https://www.cdc.gov/sleep/about/index.html> | none | active — score |
| `recovery` | Doing What Matters in Times of Stress: An Illustrated Guide; World Health Organization | <https://www.who.int/publications/i/item/9789240003927> | none | active — score |
| `preventive` | Primary health care; World Health Organization | <https://www.who.int/health-topics/primary-health-care> | none | active — score |
| `medication` | Medication Without Harm; World Health Organization | <https://www.who.int/initiatives/medication-without-harm> | `whoMedicationWithoutHarm` | active — score |

## Audit interpretation

The six inactive records are `cdcStiTesting`, `fdaUnapprovedGlp1`, `fdaCompoundedRisks`, `cdcInjectionSafety`, `mhraCorticosteroids`, and `fdaCompoundedSemaglutide`. Inactive means “not consumed by a current rule,” not invalid or unreviewed. The four DailyMed product labels are conditional-only. No source key used by a rule is missing from the registry, and no duplicate URL exists within either registry. Three URLs overlap between the active evidence registry and supplemental score table, producing the combined **73 active records / 70 unique URLs** total.
