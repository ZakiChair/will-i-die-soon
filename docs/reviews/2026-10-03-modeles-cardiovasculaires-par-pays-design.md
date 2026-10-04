# Phase 2 : modèles cardiovasculaires par pays, SCORE2-Diabetes, PREVENT, tables OMS 2019 et ressources d'urgence

Demande du propriétaire (2 et 3 octobre 2026), liste validée : France, Belgique, Luxembourg, Maroc, Algérie, Tunisie, Canada, puis tous les pays pour lesquels une donnée publiée existe ; SCORE2-Diabetes oui ; États-Unis = PREVENT (AHA 2023) ; autres pays = tables OMS 2019 de leur région (lecture de la case imprimée, approuvée). Suite de `2026-10-02-estimations-completables-design.md`.

## Constat de départ

- Le sélecteur de pays propose CH, GB, US et « autre ». SCORE2 n'est calculé que pour CH et GB (région ESC à bas risque) ; tout autre pays, France ou Allemagne comprises, reçoit `region-not-calibrated`.
- Une personne diabétique reçoit `diagnosed-condition` sur la carte SCORE2 ; le message (« un professionnel a déjà diagnostiqué cette pathologie ») est faux pour une carte cardiovasculaire.
- Numéros d'urgence : CH (144, 145), GB (999), US (911, 988) seulement. Le 988 anglais n'est pas conditionné à sa source (le français l'est) et `emergencyNumber` est dupliqué dans `risk-engine.ts` et `presentation.ts`.

## Périmètre

1. Module pays : codes ISO, région ESC, région OMS, sélecteur élargi EN/FR.
2. Une seule carte cardiovasculaire par personne, modèle choisi par le pays, l'âge et le diabète.
3. SCORE2 et SCORE2-OP dans les quatre régions ESC ; termes diabète de SCORE2-OP.
4. SCORE2-Diabetes (40–69 ans, diabète de type 2), deux questions nouvelles, HbA1c et DFGe du bilan.
5. PREVENT pour les États-Unis, une question nouvelle (traitement antihypertenseur actuel).
6. Tables OMS 2019 pour les 21 régions, avec et sans laboratoire.
7. Urgences : numéros, lignes de crise et centres antipoison vérifiés à la source, une seule implémentation pour l'anglais et le français.

Hors périmètre : PREVENT à 30 ans et modèles étendus (HbA1c, UACR, indice social), SCORE2-Asia-Pacific, SCORE2-CKD, recalibration OMS par pays (constantes non publiées), ressources sans source officielle (Maroc, Algérie, Tunisie pour la crise et l'antipoison, Italie, ligne de crise luxembourgeoise qui n'est pas ouverte en continu).

## Pays (`app/data/countries.ts`)

- Codes proposés = union des régions ESC (page HeartScore de l'ESC), des 21 régions des tables OMS 2019 (listes imprimées sur chaque table régionale) et des États-Unis ; plus `OTHER`. `ProfileContext.countryCode` reste une chaîne ; le code est normalisé (`trim`, majuscules) à un seul endroit.
- Par pays : `escRegion?` et `whoRegion?`. Régions ESC :

| Région | Pays |
| --- | --- |
| Bas risque | BE, CH, DK, ES, FR, GB, IL, LU, NL, NO |
| Risque modéré | AT, CY, DE, FI, GR, IE, IS, IT, MT, PT, SE, SI, SM |
| Haut risque | AL, BA, CZ, EE, HR, HU, KZ, PL, SK, TR |
| Très haut risque | AM, AZ, BG, BY, DZ, EG, GE, KG, LB, LT, LV, LY, MA, MD, ME, MK, RO, RS, RU, SY, TN, UA, UZ |

- Sélecteur : libellés `Intl.DisplayNames` dans la langue de l'interface, tri `Intl.Collator`, « Autre pays ou région » en dernier. Les clés `country.CH/GB/US` de `ui-copy` disparaissent ; `country.OTHER` reste.

## Choix du modèle cardiovasculaire

| Pays | Âge | Situation | Instrument (`variant`) |
| --- | --- | --- | --- |
| Région ESC | 40–69 | sans diabète | `score2` (`score2`) |
| Région ESC | 40–69 | diabète de type 2 | `score2` (`score2-diabetes`) |
| Région ESC | 40–69 | diabète de type 1 ou autre | `score2` non applicable `diabetes-type-not-covered` |
| Région ESC | 70–89 | avec ou sans diabète | `score2` (`score2-op`) |
| États-Unis | 30–79 | | `prevent` |
| Autre pays d'une région OMS | 40–74 | cholestérol total confirmé, ou diabète | `who-cvd` (`laboratory`) |
| Autre pays d'une région OMS | 40–74 | sans cholestérol ni diabète | `who-cvd` (`non-laboratory`) |
| `OTHER` | | | `who-cvd` non applicable `region-not-calibrated` |

- Priorité ESC, puis PREVENT, puis OMS : le Maroc, l'Algérie et la Tunisie (région ESC très haut risque) reçoivent SCORE2 ; le Canada la table OMS « Amérique du Nord à revenu élevé ».
- Pour tous : antécédent d'infarctus, d'AVC ou de revascularisation → `established-cvd` ; intersexe → `sex-not-supported` ; hors âge → `age-out-of-range`.
- Le pays ne change pas pendant la session : la carte garde son identifiant. Déclarer un diabète ou importer un cholestérol change la `variant`, jamais la carte (le parcours « Compléter » garde sa cible). Les résultats portent `variant` et `region` (région ESC ou OMS) quand ils sont connus.

## SCORE2 et SCORE2-OP, quatre régions

- Coefficients inchangés. Recalibration `p = 1 − exp(−exp(scale1 + scale2 · ln(−ln(1 − p0))))` avec les échelles publiées (SCORE2 : lettre Hageman tableau 1, identique au tableau S1 de SCORE2-Diabetes, au fichier Excel officiel et au paquet R RiskScorescvd ; SCORE2-OP : tableau 1 des méthodes supplémentaires).

| Région | SCORE2 hommes | SCORE2 femmes | SCORE2-OP hommes | SCORE2-OP femmes |
| --- | --- | --- | --- | --- |
| Bas | −0,5699 / 0,7476 | −0,7380 / 0,7019 | −0,34 / 1,19 | −0,52 / 1,01 |
| Modéré | −0,1565 / 0,8009 | −0,3143 / 0,7701 | 0,01 / 1,25 | −0,10 / 1,10 |
| Haut | 0,3207 / 0,9360 | 0,5710 / 0,9369 | 0,08 / 1,15 | 0,38 / 1,09 |
| Très haut | 0,5836 / 0,8294 | 0,9412 / 0,8329 | 0,05 / 0,70 | 0,38 / 0,69 |

- SCORE2-OP reçoit ses termes diabète (hommes 0,4245 et âge × diabète −0,0174 ; femmes 0,601 et −0,0107). Les exemples du tableau 3 des méthodes supplémentaires utilisent d'autres échelles, apparemment d'une version antérieure ; les cibles de test sont celles de la figure S9, que les échelles du tableau 1 reproduisent.
- Catégories ESC 2021 par âge inchangées (< 50 ans : 2,5 / 7,5 % ; 50–69 : 5 / 10 % ; ≥ 70 : 7,5 / 15 %).
- Diabète à 70 ans ou plus : modulateur `diabetes-esc-classification` (les recommandations ESC 2021 classent aussi le risque d'une personne diabétique selon l'ancienneté du diabète, l'atteinte d'organe et l'athérosclérose établie).
- Note : à 40 ans, la région « haut risque » donne un risque plus bas que « modéré » (hommes 1,11 contre 1,38 %) ; cela découle des échelles publiées.

## SCORE2-Diabetes (40–69 ans, diabète de type 2)

- Prédicteurs SCORE2 avec les coefficients propres au modèle, plus âge au diagnostic `(âge − 50) / 5`, HbA1c `(mmol/mol − 31) / 9,34`, DFGe `(ln DFGe − 4,5) / 0,15`, son carré, et les interactions HbA1c × âge et DFGe × âge ; survies de base 0,9605 / 0,9776 ; mêmes échelles régionales que SCORE2.
- Questions nouvelles, condition `diagnosed_conditions_core` inclut `diabetes`, 40–69 ans, profondeurs rapide à approfondie :
  - `diabetes_type` : type 2, type 1, autre forme, je ne sais pas (non noté, donc manquant) ;
  - `diabetes_age_at_diagnosis` : âge en années, au plus l'âge actuel.
- Bilan : HbA1c en mmol/mol (la conversion depuis le pourcentage existe), DFGe en mL/min/1,73 m².
- Catégories ESC 2023 : < 5 % faible, 5–< 10 % modéré, 10–< 20 % élevé, ≥ 20 % très élevé.
- Modulateur `egfr-below-45` : un DFGe inférieur à 45 place le risque à élevé ou très élevé quelle que soit l'estimation.
- Tant que le diabète n'est pas renseigné, les deux questions sont comptées derrière `diagnosed_conditions_core` (`conditionalInputs`), comme les détails d'alcool d'AUDIT-C. L'HbA1c et le DFGe y sont aussi comptés comme une étape de bilan possible, sauf si un import de bilan est déjà prévu : le plan n'en compte qu'un.

## PREVENT (États-Unis)

- Équations de base à 10 ans (Khan et al., Circulation 2024), transcrites du code R officiel de l'AHA. Affiché : PREVENT-ASCVD (infarctus et AVC, mortels ou non), régression logistique.
- Entrées : sexe, âge 30–79, cholestérol total et HDL, pression systolique, diabète déclaré, tabac, DFGe, traitement antihypertenseur actuel, statine actuelle. Le calcul se fait en mmol/L avec le facteur 0,02586 du code officiel, identique à celui de l'import de bilan.
- Bornes du modèle : cholestérol total 130–320 mg/dL (3,36–8,28 mmol/L), HDL 20–100 mg/dL (0,52–2,59), pression systolique 90–200 mmHg, DFGe 15–140 ; hors bornes → non applicable `outside-validated-range`. Une valeur comprise dans l'une ou l'autre unité imprimée est acceptée : 3,36 mmol/L passe comme 130 mg/dL, 321 mg/dL est refusé.
- Question nouvelle `bp_medication_current` (condition `bp_medication_ever` = oui, profondeurs détaillée et approfondie) ; « non » dérivé si `bp_medication_ever` = non ou si l'hypertension n'a pas été diagnostiquée, comme pour FINDRISC.
- Catégories ACC/AHA 2026 (dyslipidémies) : < 3 % faible, 3–< 5 % limite, 5–< 10 % intermédiaire, ≥ 10 % élevé.
- Modulateurs : `family_early_cvd`, `inflammatory_condition`. La statine est un prédicteur, pas un modulateur.

## Tables OMS 2019

- Données : les 21 tables régionales imprimées de l'OMS (2019) pour l'article Lancet Glob Health 2019;7:e1332-45, soit 20 PDF régionaux de deux pages publiés sur le site de l'OMS et, pour l'Asie de l'Est, l'annexe 2 de l'article hébergée par l'OMS (deux pages, même mise en page). `scripts/generate-who-cvd-charts.py` transcrit chaque case imprimée avec `pdftotext` : 29 400 cases avec laboratoire (région × sexe × diabète × tabac × 7 âges × 5 pressions × 5 cholestérols) et 14 700 sans laboratoire (indice de masse corporelle à la place du cholestérol, sans diabète). Contrôles : en-tête de région de chaque page, 20 valeurs par ligne, aucune case qui baisse quand l'âge, la pression, le cholestérol ou l'IMC, le tabac ou le diabète augmentent (`app/data/who-cvd-charts.test.ts`), lignes relues contre les PDF pour trois régions, et les deux vecteurs du texte principal ci-dessous. Encodage : deux chiffres par case, une chaîne par région, sexe, diabète et tabac (`app/data/who-cvd-charts.ts`).
- Bandes, bornes inférieures incluses : âge 40–44 … 70–74 ; pression < 120, 120–139, 140–159, 160–179, ≥ 180 mmHg ; cholestérol total < 4, 4–4,9, 5–5,9, 6–6,9, ≥ 7 mmol/L ; IMC < 20, 20–24, 25–29, 30–35, ≥ 35.
- Choix de la table : avec laboratoire dès qu'un cholestérol total est confirmé ; sinon sans laboratoire, sauf diabète déclaré : la table sans laboratoire n'en tient pas compte, le cholestérol est alors demandé. Choix de conception de l'application, pas une règle de l'OMS.
- Résultat : `riskPercent` = valeur imprimée dans la case ; 0 se lit « moins de 1 % » et « moins de 1 sur 100 ». Catégorie = bande de couleur de l'OMS (< 5, 5–< 10, 10–< 20, 20–< 30, ≥ 30 %). L'OMS ne nomme pas ces bandes : aucune étiquette de niveau n'est affichée ; le niveau interne ne sert qu'au tri et à la couleur.
- Vecteur publié : homme de 60 ans, fumeur, sans diabète, pression 140, cholestérol 5 : 11 % en Amérique latine andine, 30 % en Asie centrale (texte principal de l'article) ; la lecture de case donne 11 et 30.

## Urgences et ressources nationales (`app/data/emergency-contacts.ts`)

Une table par pays, lue par `risk-engine.ts` et `presentation.ts`. Un numéro n'apparaît que si une source retenue pour la règle couvre le pays (`operationalCountries`), comme aujourd'hui ; une ligne de crise ou antipoison exige sa propre source.

| Pays | Urgence | Ligne de crise (auto-agression) | Antipoison | Sources |
| --- | --- | --- | --- | --- |
| États-Unis | 911 | 988, appel ou SMS | | 911.gov ; SAMHSA |
| Royaume-Uni | 999 | | | NHS |
| Suisse | 144 | 143 (La Main Tendue) | 145 | ch.ch ; 143.ch ; OFSP |
| France | 15 | 3114 | | service-public.fr ; 3114.fr |
| Canada | 911 | 988, appel ou SMS | | CRTC ; 988.ca |
| Belgique | 112 | 0800 32 123 (français), 1813 (néerlandais) | 070 245 245 | Commission européenne ; Centre de prévention du suicide ; Zelfmoordlijn ; Centre Antipoisons |
| Luxembourg | 112 | | 8002-5500 | Commission européenne ; Centre Antipoisons |
| Autres membres de l'UE | 112 | | | Commission européenne |
| Autres pays, `OTHER` | service d'urgence local | | | OMS |

- Un numéro n'apparaît que si la feuille a retenu la source qui le publie et que cette source couvre le pays ; une source d'un autre pays ne le remplace pas (le 112 de la Commission ne remplace pas le 15).
- Le 988 anglais exige désormais la source SAMHSA, comme le français.
- Suisse, 143 : ni ch.ch ni l'OFSP ne publient le numéro dans une page vérifiable ; la source est le site de l'opérateur (La Main Tendue), comme 3114.fr et 988.ca.
- Canada, antipoison : le 1-844 POISON-X a été lancé avec quatre des cinq centres canadiens, le Québec garde son propre numéro (infopoison.ca) ; la couverture nationale ne peut pas être affirmée, le numéro n'est pas affiché.
- Maroc, Algérie, Tunisie : aucune source nationale vérifiée (seulement l'ambassade de France), donc « service d'urgence local ».
- Les sources d'urgence s'ajoutent à toutes les règles urgentes par une liste unique (`urgentRule`, règle de grossesse adolescente et règle des substances) ; les sources de crise à la règle d'auto-agression, les sources antipoison à la règle d'intoxication.

## Copie, synthèse et orientation

- Ligne d'instrument selon la `variant` : « SCORE2 (ESC 2021) », « SCORE2-OP (ESC 2021) », « SCORE2-Diabetes (ESC 2023) », « PREVENT-ASCVD (AHA 2023) », « Tables OMS 2019, avec laboratoire » ou « sans laboratoire » ; ligne de calibration : « Région ESC à risque modéré », « Région OMS : Afrique du Nord et Moyen-Orient ».
- Catégories : SCORE2 garde les siennes, SCORE2-Diabetes ajoute « faible » et « modéré » ; PREVENT : faible, limite, intermédiaire, élevé ; OMS : bandes en pourcentage. Pas d'étiquette de niveau pour PREVENT ni pour l'OMS (leurs catégories sont déjà nommées).
- « X sur 100 » et gain « arrêt du tabac » pour les trois instruments ; l'événement nommé reste « infarctus ou AVC, mortel ou non, dans les 10 ans ».
- Raisons nouvelles : `diabetes-type-not-covered`, `outside-validated-range` ; `region-not-calibrated` devient « choisissez votre pays au début pour obtenir une estimation ».

| Instrument | Catégories | Identifiant | Message (résumé) | Sources |
| --- | --- | --- | --- | --- |
| SCORE2, SCORE2-OP | inchangé | `score2-keep-habits`, `score2-clinician` | inchangé | ESC 2021 ; OMS activité ; OMS tabac |
| SCORE2-Diabetes | faible, modéré | `score2-diabetes-keep-care` | garder le suivi du diabète (tension, cholestérol, HbA1c, reins) ; bouger ; arrêter de fumer | ESC 2023 ; OMS activité ; OMS tabac |
| SCORE2-Diabetes | élevé, très élevé | `score2-diabetes-clinician` | en parler à son médecin ou à l'équipe de diabétologie : objectifs de cholestérol plus stricts, médicaments du diabète qui protègent aussi le cœur | ESC 2023 ; OMS tabac |
| PREVENT | faible | `prevent-keep-habits` | bouger, manger équilibré, contrôler tension et cholestérol ; arrêter de fumer | ACC/AHA 2026 ; OMS activité ; OMS tabac |
| PREVENT | limite, intermédiaire, élevé | `prevent-clinician` | en parler à un médecin : à ce niveau, la recommandation ACC/AHA 2026 envisage un traitement hypocholestérolémiant | ACC/AHA 2026 ; OMS tabac |
| OMS | toutes | `who-cvd-prevention` | mêmes leviers quelle que soit la bande ; montrer le résultat à un médecin ou une infirmière, l'OMS a conçu ces tables pour la prévention en soins primaires | OMS HEARTS ; OMS activité ; OMS tabac |

## Export et versions

- `PATHOLOGY_RULESET_VERSION = "pathology-scores-v3"` ; `RESULT_REPORT_VERSION = "health-risk-explorer-report-v5"` : `variant` et `region` par score, instruments `prevent` et `who-cvd`, raisons nouvelles. Toujours aucun contenu de réponse brute.

## Sources ajoutées (revue du 3 octobre 2026)

| Clé | Source | URL |
| --- | --- | --- |
| `escHeartScoreRegions` | ESC HeartScore, pays par région de risque | https://www.heartscore.org/en_GB/heartscore-europe-risk-regions |
| `score2DiabetesEsc2023` | SCORE2-Diabetes, Eur Heart J 2023 | https://doi.org/10.1093/eurheartj/ehad260 |
| `escDiabetes2023` | ESC 2023, maladies cardiovasculaires et diabète | https://doi.org/10.1093/eurheartj/ehad192 |
| `preventKhan2024` | PREVENT, Circulation 2024 | https://doi.org/10.1161/CIRCULATIONAHA.123.067626 |
| `accAhaDyslipidemia2026` | ACC/AHA 2026, dyslipidémies | https://doi.org/10.1161/CIR.0000000000001423 |
| `whoCvdCharts2019` | Tables OMS 2019, Lancet Glob Health | https://doi.org/10.1016/S2214-109X(19)30318-3 |
| `whoHeartsRiskBased` | OMS HEARTS, prise en charge fondée sur le risque | https://www.who.int/publications/i/item/9789240001367 |
| `eu112` | Commission européenne, numéro 112 | https://digital-strategy.ec.europa.eu/en/policies/112 |
| `servicePublicEmergencyNumbers` | Service-Public.fr, numéros d'urgence | https://www.service-public.gouv.fr/particuliers/vosdroits/F33954?lang=en |
| `france3114` | 3114, numéro national de prévention du suicide | https://3114.fr/ |
| `crtc911` | CRTC, services 9-1-1 | https://crtc.gc.ca/eng/phone/911/ |
| `canada988` | 9-8-8, ligne d'aide en cas de crise suicidaire | https://988.ca/ |
| `swiss143` | La Main Tendue, nous contacter | https://www.143.ch/en/a-conversation-often-helps/ |
| `belgiumPoisonCentre` | Centre Antipoisons (Belgique, Luxembourg) | https://www.centreantipoisons.be/humains/ |
| `belgiumSuicidePrevention` | Centre de prévention du suicide, 0800 32 123 | https://www.preventionsuicide.be/la-ligne-decoute-0800-32-123 |
| `belgiumZelfmoordlijn` | Zelfmoordlijn 1813 | https://www.zelfmoord1813.be/ik-heb-hulp-nodig/bellen-met-de-zelfmoordlijn |

Les sources SCORE2, SCORE2-OP et ESC 2021 couvrent désormais tous les pays des régions ESC.

## Tests

- Pays : chaque code est un ISO alpha-2 unique, chaque pays proposé a une région ESC, une région OMS ou PREVENT ; régions ESC identiques à HeartScore ; sélecteur EN/FR trié, « autre » en dernier.
- SCORE2 : vecteurs des quatre régions (4 profils × 2 sexes) ; exemple ESC conservé ; SCORE2-OP figure S9 (75 ans, bas et très haut risque) ; diabète dans SCORE2-OP.
- SCORE2-Diabetes : profil par défaut du fichier Excel officiel (4 régions × 2 sexes, à 0,01 point près), profils défavorable et favorable ; type 1 non applicable ; type inconnu incomplet ; questions comptées derrière le diabète.
- PREVENT : quatre lignes de `test_data_base.csv` et la vignette du paquet officiel (ASCVD) ; bornes ; dérivation du traitement antihypertenseur.
- OMS : vecteur publié (11 et 30 %), lecture des bandes aux bornes, table sans laboratoire, diabète sans cholestérol, case 0 lue « moins de 1 sur 100 ».
- Urgences : numéro et source par pays, lignes de crise et antipoison gatées par leur source en anglais et en français, 988 anglais gaté, aucun numéro pour le Maroc ni pour `OTHER`.
- Parcours « Compléter » : propriété « chaque réponse fait baisser le compteur » avec des profils FR, DE, CA, MA et US ; aucune question nouvelle ne déclenche de règle urgente.
- Export : versions, `variant`, `region`.

## Protocole

Rôle exécutant, conception écrite avant le code, tests d'abord avec les vecteurs publiés ; branche `feat/phase2-models` fusionnée en avance rapide dans `main` ; le push déclenche le déploiement Vercel ; QA navigateur locale puis en production. Portes : `tsc`, `lint`, `vitest`, `vinext build`, `next build`, `git diff --check`.
