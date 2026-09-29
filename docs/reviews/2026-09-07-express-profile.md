# Bilan Express : profil, indice forme et habitudes

Date : 7 septembre 2026. Version de méthode : `express-index-v1`.

Statut : extension implémentée et vérifiée localement. Aperçu compilé : `http://localhost:5190/`. Aucun enregistrement, publication ou déploiement Sites. Cette évolution complète la [revue initiale de la refonte](2026-09-07-revue-globale-et-proposition-front.md) sans réécrire ses constats historiques.

## Résultat attendu et périmètre

Le bilan Express restitue désormais un indice sur 100, lorsque la couverture le permet, un portrait qualifié, quatre axes et jusqu'à trois priorités explicables. Les mesures déclarées restent consultables. Les neuf questions, leurs identifiants, unités, choix et règles de sélection ne changent pas.

Il s'agit d'un indice conventionnel de **forme et habitudes**, distinct du score d'habitudes détaillé nommé Purity Score. Le calcul du Purity Score garde sa porte Express : état `insufficient-coverage`, raison `express-assessment`, sans score adulte disponible. Le nouvel indice ne contourne pas cette règle et ne modifie ni le moteur de risques ni ses priorités immédiates.

Le nouveau bilan n'est ni un diagnostic, ni une probabilité de maladie, ni une estimation de longévité. Un profil favorable décrit les critères de cet indice et ne certifie pas la santé d'une personne. Une vigilance sommeil/alimentation ne désigne pas un niveau de risque médical. Un résultat cardio/force inférieur au repère ne produit jamais un diagnostic ou une catégorie de risque.

## Neuf réponses, sept composantes, quatre axes

Le calcul est disponible uniquement si l'âge est un entier de 18 à 120 ans inclus. Un âge absent, non fini, fractionnaire ou hors de cette plage donne `not-available`, un score `null`, quatre axes manquants, des compteurs à zéro, un profil `incomplete` et aucune priorité.

| Réponse canonique | Validation du calcul direct | Utilisation |
| --- | --- | --- |
| `reported_vo2_max_ml_kg_min` | Nombre fini strictement positif | Une composante cardio |
| `squat_one_rep_max_kg` | Nombre fini strictement positif | Une composante force, avec poids valide |
| `deadlift_one_rep_max_kg` | Nombre fini strictement positif | Une composante force, avec poids valide |
| `usual_sleep_hours` | Nombre fini de 0 à 24 inclus | Une composante sommeil |
| `sleep_refreshed` | Nombre fini de 0 à 10 inclus | Une composante sommeil |
| `height_cm` | Nombre fini strictement positif | Couverture des réponses uniquement |
| `weight_kg` | Nombre fini strictement positif | Dénominateur des deux composantes force |
| `plant_food_frequency` | Nombre fini positif ou nul | Une composante alimentation |
| `diet_ultra_processed` | `never`, `rarely`, `sometimes`, `often` ou `daily` | Une composante alimentation |

Le calcul ne convertit pas les chaînes numériques et ne transforme jamais une absence, une valeur invalide ou `null` en zéro. Les zéros explicitement valides pour le sommeil, le ressenti et les portions sont de vraies réponses. Les valeurs atypiques mais sémantiquement valides sont conservées ; les bornes ne définissent pas une normalité médicale.

`answeredCount` compte les réponses valides parmi les neuf. `interpretableComponentCount` compte les composantes calculables parmi les sept, réparties en 1 cardio, 2 force, 2 sommeil et 2 alimentation. `scoredAxisCount` compte les axes ayant au moins une composante. Une taille manquante peut donc laisser les sept composantes disponibles et donner un indice complet avec 8/9 réponses. Un poids manquant empêche les deux rapports de force, même si les charges restent comptées parmi les réponses valides.

## Formules et références fixes

Toutes les composantes sont bornées entre 0 et 100. Les ratios de force sont calculés à partir des valeurs non arrondies, indépendamment du ratio abrégé affiché dans l'interface.

| Axe / composante | Formule de points |
| --- | --- |
| Cardio : VO₂ max déclarée | `min(100, VO₂ / 50 × 100)` ; VO₂ en ml/kg/min |
| Force : squat | `min(100, (charge / poids) / 1 × 100)` ; charge et poids en kg |
| Force : soulevé de terre | `min(100, (charge / poids) / 1,5 × 100)` |
| Sommeil : durée | `max(0, 100 − 25 × max(7 − h, h − borneHaute, 0))` |
| Sommeil : ressenti de récupération | `ressenti × 10` |
| Alimentation : portions de fruits et légumes | `min(100, portions / 5 × 100)` |
| Alimentation : fréquence des repas ultra-transformés | Jamais : 100 ; rarement : 80 ; parfois : 50 ; souvent : 25 ; chaque jour : 0 |

La fenêtre de durée utilisée par le produit est 7–9 heures de 18 à 64 ans, puis 7–8 heures à partir de 65 ans. À 35 ans, les durées de 3, 6, 7, 9 et 10 heures donnent respectivement 0, 75, 100, 100 et 75 points. À 65 ans, 9 heures donnent 75 points et 13 heures donnent 0 point. Une durée extrême ne reçoit donc pas automatiquement le maximum.

Chaque axe est la moyenne de ses composantes disponibles. Le score global est la moyenne des **axes disponibles, avec le même poids par axe**, calculée avant arrondi. Les sept composantes n'ont donc pas chacune le même poids dans le résultat final. Les valeurs publiques des axes et du score global sont arrondies avec `Math.round`, chacune à partir de sa valeur réelle. Les décisions de statut et de profil utilisent les valeurs réelles avant arrondi.

| Couverture | `kind` | Score global |
| --- | --- | --- |
| Âge adulte valide, moins de 4 composantes ou moins de 2 axes | `insufficient-inputs` | `null` ; les axes disponibles restent lisibles |
| Au moins 4 composantes et 2 axes, mais moins de 7 composantes | `partial-index` | Moyenne des axes disponibles ; indice provisoire |
| Les 7 composantes disponibles | `complete-index` | Moyenne des quatre axes |
| Âge non admissible | `not-available` | `null` |

Les constantes exportées sous `EXPRESS_INDEX_REFERENCE` sont : `cardioVo2: 50`, `squatBodyWeight: 1`, `deadliftBodyWeight: 1.5`, `plantPortions: 5`, `axisSupport: 75`, `profileAxisMinimum: 60`, `minimumComponents: 4`, `minimumAxes: 2`, `sleepHourlyPenalty: 25`, et `processedPoints: { never: 100, rarely: 80, sometimes: 50, often: 25, daily: 0 }`. La version de méthode fixe également les fenêtres de sommeil et les autres règles décrites ici.

## Portée des sources et calibration

Les repères VO₂ max de 50 ml/kg/min, squat à une fois le poids et soulevé de terre à 1,5 fois le poids sont des **choix du produit**. Ils ne sont pas des normes par âge, sexe, niveau d'entraînement ou méthode de mesure. L'Express ne dispose pas de ces informations complètes et n'égalise pas la précision d'une mesure en laboratoire, d'une estimation d'appareil et d'une charge déclarée. Aucune cohorte n'est utilisée. Les consignes restent de reprendre une mesure déjà connue et de ne pas effectuer de nouvel effort maximal pour répondre.

Le CDC indique au moins 7 heures pour les 18–60 ans, 7–9 heures pour les 61–64 ans et 7–8 heures à partir de 65 ans. La borne supérieure de 9 heures utilisée ici avant 61 ans est donc une convention du produit. Le CDC ne valide ni cette borne pour les 18–60 ans, ni la pénalité de 25 points par heure, ni le seuil de ressenti. [CDC — About Sleep](https://www.cdc.gov/sleep/about/index.html).

L'OMS recommande aux personnes de plus de 10 ans au moins 400 g de fruits et légumes par jour. Le questionnaire utilise cinq portions comme approximation pratique ; il ne mesure pas les grammes consommés. L'OMS ne valide pas la conversion en points, le seuil de trois portions ni la table de fréquence des repas ultra-transformés utilisée par cet indice. [OMS — Healthy diet](https://www.who.int/news-room/fact-sheets/detail/healthy-diet).

Les coefficients, plafonds, poids égaux des axes, seuils de profil et minima de couverture n'ont pas fait l'objet d'une calibration clinique ou statistique. Ces sources éclairent les habitudes et ne constituent pas une validation du score composite.

## Statuts, portrait et priorités

Les signaux de vigilance reposent sur les réponses elles-mêmes et sont indépendants du niveau global de l'indice.

| Signal | Déclencheur exact |
| --- | --- |
| `sleep-short` | Durée valide strictement inférieure à 7 heures |
| `sleep-long` | Durée valide strictement supérieure à 9 heures avant 65 ans, ou à 8 heures à partir de 65 ans |
| `sleep-unrefreshing` | Ressenti valide inférieur ou égal à 3/10 |
| `plants-low` | Portions valides strictement inférieures à 3 |
| `processed-frequent` | Fréquence `often` ou `daily` |
| `sleep-improve` / `nutrition-improve` | Axe correspondant disponible, sans vigilance de cet axe, et valeur réelle strictement inférieure à 75 |
| `cardio-below-reference` / `strength-below-reference` | Axe correspondant disponible et valeur réelle strictement inférieure à 100 |
| `sleep-maintain` / `nutrition-maintain` | Axe correspondant disponible, sans vigilance, et valeur réelle au moins égale à 75 |
| `cardio-maintain` / `strength-maintain` | Axe correspondant égal à 100 |
| `complete-measurements` | Moins de 7 composantes interprétables pour un âge admissible |

Pour chaque axe, `missing` signifie aucune composante disponible. Sinon, une vigilance sommeil/alimentation donne `attention`. En l'absence de vigilance, une valeur réelle d'au moins 75 donne `support`, et une valeur inférieure donne `improve`. Une VO₂ de 48 donne ainsi un axe cardio de 96, un statut `support` et le signal `cardio-below-reference` : la zone d'appui à 75 et l'atteinte du repère de calcul à 100 sont deux conventions différentes.

Le portrait applique ces règles dans cet ordre :

1. `attention` si au moins une vigilance sommeil/alimentation est présente, même si le bilan est incomplet ou le score global élevé ;
2. `incomplete` si une composante manque et qu'aucune vigilance n'est présente ;
3. `favorable` si les sept composantes sont disponibles, la moyenne réelle atteint 75 et chaque axe réel atteint 60, sans vigilance ;
4. `mixed` pour les autres bilans complets.

« Favorable » ne signifie pas quatre axes au statut `support` : un axe entre 60 et 75 peut encore proposer une amélioration. Un affichage arrondi à 75 ne suffit pas à franchir un seuil si la valeur réelle vaut 74,9.

Les priorités sont limitées à trois et ordonnées ainsi : vigilances sommeil (`sleep-short`, `sleep-long`, `sleep-unrefreshing`), puis alimentation (`plants-low`, `processed-frequent`) ; améliorations sommeil puis alimentation ; performances cardio puis force sous leur repère ; complétion des mesures ; enfin maintien sommeil, alimentation, cardio puis force. Cette sélection ne dépend pas de la seule moyenne globale. Par exemple, sommeil à 8 heures et ressenti de 4/10 donnent 70 points avec `sleep-improve` ; trois portions et fréquence « parfois » donnent 55 points avec `nutrition-improve`, sans inventer une vigilance supplémentaire.

## Deux exemples reproductibles

À 35 ans, avec seulement 7,5 heures de sommeil, un ressenti de 8/10, quatre portions et des repas ultra-transformés « rarement », le sommeil vaut `(100 + 80) / 2 = 90`, l'alimentation vaut `(80 + 80) / 2 = 80`. L'indice vaut donc **85/100**, avec 4/7 composantes et 4/9 réponses : `partial-index`, profil `incomplete`. Ce résultat reste provisoire ; les axes manquants ne sont pas supposés favorables.

Le jeu complet de l'interface ajoute une VO₂ de 48,5 ml/kg/min, un squat connu de 123 kg, un soulevé de terre connu de 181 kg, une taille de 182 cm et un poids de 80 kg. Les quatre axes valent 97, 100, 90 et 80. La moyenne réelle est 91,75, affichée **92/100**, avec 7/7 composantes et 9/9 réponses : `complete-index`, profil `favorable`. Le cardio reste sous le repère fixe de 50 et peut proposer un renforcement progressif ; cela ne constitue pas un risque médical.

## Radar et lecture des résultats

Le radar Express remplace la section gaussienne dans ce parcours. Les axes vont de 0 à 100 et la ligne pointillée à 75 matérialise le repère produit correspondant au seuil d'appui. Elle ne représente ni une moyenne observée, ni un percentile, ni une probabilité. Les axes manquants ne deviennent pas des zéros et ne produisent pas une forme fermée complète. Une description textuelle rend les valeurs et les limites disponibles sans dépendre du dessin.

Le repère gaussien théorique des parcours détaillés suffisamment couverts reste séparé et ne reçoit pas l'indice Express. Aucune distribution normale, comparaison à des pairs ou population de référence n'est ajoutée.

## Contrat du module et export

`buildExpressAssessment(answers, { ageYears })` retourne un `ExpressAssessment` :

| Champ | Contrat |
| --- | --- |
| `version` | `express-index-v1` |
| `kind` | `complete-index`, `partial-index`, `insufficient-inputs` ou `not-available` |
| `score` | Entier de 0 à 100, ou `null` |
| `axes` | Quatre `ExpressAxis`, dans l'ordre `cardio`, `strength`, `sleep`, `nutrition` |
| `answeredCount` | Nombre de réponses valides parmi les neuf |
| `interpretableComponentCount` | Nombre de composantes disponibles parmi les sept |
| `scoredAxisCount` | Nombre d'axes avec au moins une composante |
| `profile` | `favorable`, `mixed`, `attention` ou `incomplete` |
| `priorities` | Jusqu'à trois identifiants de signaux, dans l'ordre défini ci-dessus |

Chaque `ExpressAxis` contient `id`, `score` entier ou `null`, `availableComponents`, `totalComponents`, `status` et `signals`. Les identifiants restent identiques en français et en anglais ; la présentation traduit leurs titres, raisons et actions sans recalculer le score.

Le JSON conserve `schemaVersion: "health-risk-explorer-report-v2"`. L'extension est additive : pour un parcours Express avec un âge admissible, le payload dérivé ajoute `expressAssessment`, comprenant le résultat du module et les métadonnées suivantes :

| Métadonnée | Valeur |
| --- | --- |
| `interpretation` | `heuristic-form-and-habits-index-not-a-health-diagnosis` |
| `reference` | Constantes `EXPRESS_INDEX_REFERENCE` ci-dessus |
| `referencePopulation` | `null` |
| `sources` | Liens CDC et OMS cités dans ce document |

La version de méthode et les constantes décrivent les conventions utilisées ; aucune propriété `conventions` distincte n'est ajoutée. Les liens de sources ne justifient pas les coefficients. Un bilan adulte insuffisant peut être exporté avec `score: null`. Le champ `expressAssessment` est absent des autres parcours et des cas Express non admissibles. Le champ `score` à la racine du rapport garde la signification du score d'habitudes existant.

L'export reste un téléchargement local déclenché explicitement. Les réponses brutes sont exclues par défaut ; seules les réponses structurées autorisées peuvent être ajoutées après opt-in adulte. Le nouvel objet dérivé ne contient pas les neuf réponses brutes, les fichiers, les textes importés, les noms de fichiers ou les métadonnées privées. Il contient néanmoins des résultats personnels issus des réponses : l'absence de réponses brutes n'en fait pas un document anonyme. Aucun stockage persistant, backend d'analyse ou envoi à une source externe n'est ajouté.

## Vérification et remise

La suite complète passe : **51 fichiers, 5 103 tests réussis**. Elle comprend 44 tests du calcul Express, 21 tests d'export et 11 tests de l'interface Express. La revue a notamment fait reproduire puis corriger trois cas où un axe faible recevait uniquement un conseil de maintien. Les derniers ajustements des libellés et de la taille du texte mobile ont été suivis de 99 tests ciblés réussis et d'une nouvelle compilation complète.

| Contrôle | Résultat |
| --- | --- |
| TypeScript sans émission ni cache incrémental | Réussi, Node v26.7.0 |
| ESLint | Aucun échec ; un avertissement dans `.remember/tmp/last-ndc.ts`, préexistant et non modifié |
| Compilation Vinext finale | 5 étapes réussies |
| Revue indépendante | Aucun défaut restant confirmé dans calcul, export ou interface |
| Profil fictif complet | 92/100, portrait globalement favorable, axes 97/100/90/80 |
| Profil fictif avec vigilances | 68/100 malgré cardio 97 et force 100 ; sommeil 41 et alimentation 33 prioritaires |
| Profil fictif incomplet | 85/100 provisoire ; 4/7 composantes, 6/9 réponses, sommeil 90 et alimentation 80 |
| Radar incomplet | Deux points, un segment et aucun polygone de données fermé ; aucune absence dessinée à zéro |
| Vérification visuelle | Desktop 1 280 × 900 et mobile 390 × 844 ; labels et valeurs lisibles, sans débordement horizontal |
| Version compilée | Neuf réponses jusqu'au bilan complet sur mobile ; FR/EN conservent le score 92 |
| Navigation et clavier | Ancres Synthèse/Priorités/Méthode valides ; méthode ouverte avec Entrée |
| Console et réseau compilés | Aucune erreur ni alerte console ; 18 requêtes GET localhost, aucun envoi de réponses |
| Stockage de la session compilée | Aucun élément localStorage/sessionStorage et aucun cookie pour cet origin |
| Diff | `git diff --check` réussi |

Les trois profils ont été parcourus avec les vrais contrôles de l'application et des réponses fictives en Chrome isolé ; le parcours complet a ensuite été répété sur la compilation finale. Les protections mineurs, valeurs invalides, zéros et export sans réponses brutes sont vérifiées par les tests. L'impression conserve ses règles de présentation, mais aucun nouveau PDF ni audit Lighthouse n'est revendiqué. L'avertissement de bundle supérieur à 500 Ko subsiste. Cette validation locale ne remplace ni une calibration médicale de l'indice ni la matrice de publication Node 24.13.0. Aucun commit, push ou déploiement n'a été effectué pour ce bilan Express.
