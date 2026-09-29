# Revue globale et proposition de refonte

Date : 7 septembre 2026. Source examinée : `415b33d`.

Statut : proposition approuvée et refonte implémentée localement le 7 septembre 2026. Vérifications et limites de remise en fin de document.

Évolution ultérieure du même jour : le [bilan Express avec indice forme et habitudes](2026-09-07-express-profile.md) ajoute quatre axes calculés, un profil qualifié, des priorités et un radar conventionnel. Le présent document conserve l'audit et les décisions de la refonte initiale ; la méthode et la vérification de cette extension sont consignées séparément.

## Conclusion

Le socle fonctionne et mérite une refonte incrémentale. Le projet possède une banque de 254 questions, quatre parcours, une interface FR/EN, des règles explicables et un traitement local. Les problèmes prioritaires concernent la cohérence des résultats avec le cahier des charges, la qualité de saisie et la hiérarchie des vues. Une migration de framework, un backend ou un nouveau moteur médical ne sont pas nécessaires pour répondre à la demande.

Documents examinés : cahier initial du 3 août, spécifications Express et des refontes visuelles suivantes, README, registre de confidentialité et code courant. Les exigences ont évolué : les quatre parcours et l'Atlas résultent de spécifications ultérieures. L'estimation de longévité du dernier commit contredisait les exclusions du cahier initial. La refonte approuvée retire ces estimations du rendu des résultats et conserve leur module source séparé ; le README et le registre de confidentialité sont actualisés.

## Vérification du socle

Contrôles effectués sur le code existant, avec Node `v26.7.0` :

| Contrôle | Résultat |
| --- | --- |
| TypeScript sans émission et sans cache incrémental | Réussi |
| ESLint | Réussi |
| Vitest | 47 fichiers, 4 967 tests réussis |
| Build Vinext | 5 étapes réussies |

Le build signale un bundle de page supérieur à 500 Ko : fichier produit de 700 488 octets, environ 202 361 octets gzip. Cette mesure n'est pas un LCP ni un audit navigateur. Le README prescrit Node 24.13.0 pour la matrice de release ; les résultats ci-dessus ne remplacent pas cette matrice. Aucun déploiement ni changement de stockage n'a été effectué.

## Constats priorisés

Ces constats décrivent le socle audité avant modification. Les corrections livrées sont récapitulées dans l'état de remise.

### P1 — Le bilan donne une précision que le modèle ne justifie pas

`app/lib/longevity.ts:739` produit un âge de décès à partir de tables simplifiées, de corrections en années et d'une fenêtre dépendant de la couverture. `app/components/longevity-synthesis.tsx:50` en fait le nombre principal et affiche aussi des parts relatives de causes. Les exclusions du cahier initial interdisent pourtant une estimation inventée d'espérance de vie ou de date de décès.

Décision appliquée : replacer les facteurs observés et les actions au premier plan. L'âge de décès, les parts de causes et les gains d'années sont retirés de la vue principale. Le module source conservé n'est appelé ni par la synthèse ni par le repère gaussien ; aucune de ses valeurs n'est convertie en probabilité ou en intervalle de confiance.

### P1 — Aucune population de référence pour une gaussienne empirique

Ni le score d'habitudes ni les quatre indices de longévité ne sont associés à une cohorte, une moyenne et un écart-type observés dans le dépôt. Les pondérations du score sont des choix du prototype (`app/lib/scoring.ts:995`). La moyenne des quatre piliers n'est pas la moyenne d'une population.

Proposition : un repère théorique explicite, décrit ci-dessous, ou un état « comparaison indisponible » jusqu'à l'apport d'un jeu de données compatible. Ne jamais annoncer « meilleur que X % des personnes » avec des paramètres inventés.

### P1 — La saisie numérique laisse passer des valeurs incohérentes

`app/components/question-control.tsx:47` n'exige qu'un nombre fini. Le champ à partir de la ligne 159 n'a pas de borne spécifique. Une durée de sommeil supérieure à 24 heures ou un nombre de jours d'activité supérieur à sept peut être validé.

Proposition : validation commune au clic et à Entrée ; bornes sémantiques incontestables, message localisé près du champ et focus maintenu. Une absence de réponse doit produire une indication utile ou rendre l'action indisponible. Le bouton pour passer reste accessible. Ne pas utiliser des normes médicales comme bornes de saisie.

### P2 — Express demande d'abord des mesures spécialisées

`app/lib/questionnaire.ts:12` commence par VO₂ max, squat et soulevé de terre maximaux. Les consignes de ne pas réaliser un test sont cachées dans le détail « Pourquoi cette question ? » (`app/components/question-control.tsx:213`).

Proposition immédiate : garder les neuf identifiants, présenter les mesures comme facultatives et afficher la consigne avant le champ. Libellé de passage : « Je ne connais pas cette mesure ». Une variante Express plus généraliste serait une décision produit séparée, car elle changerait le contenu du parcours et les règles attendues.

### P2 — La présentation des questions reste inégale

Seulement huit questions disposent d'un titre court et d'une précision séparée dans `app/i18n/question-prompt-presentation.ts`. Les échelles 0–10 n'affichent pas de légendes adaptées (`app/components/question-control.tsx:181`). Plusieurs explications multiplient les associations avec la mortalité.

Proposition : élargir la présentation titre/précision aux questions courantes et sportives ; conserver les périodes et unités ; rendre les extrêmes des échelles explicites ; remplacer les explications anxiogènes par l'utilité concrète de la réponse. Les détails scientifiques doivent rester rattachés à des sources, sans exagérer la portée individuelle d'une association de cohorte.

### P2 — Le scroll est long pour un effet visuel discret

L'Atlas occupe cinq hauteurs d'écran (`app/globals.css:176`), mais le zoom n'est que de 3,5 % sur ordinateur et 1,8 % sur mobile (`app/hooks/use-landing-timeline.ts:54`). Le socle GSAP gère déjà réduction des animations, visibilité et nettoyage : il peut porter une scène plus forte.

Proposition : une seule séquence spectaculaire, décrite plus bas, et un accès au questionnaire dès le premier écran.

### P2 — Le bilan empile les détails avant les actions

Après les urgences, `app/components/results.tsx:444` affiche la longévité, puis l'arbre, le registre du score et enfin les actions. L'utilisateur doit parcourir beaucoup de contenu pour identifier ses prochaines étapes. Express restitue surtout les mesures saisies.

Proposition : synthèse concise et priorités, puis comparaison et exploration des domaines. Les détails de calcul restent disponibles au clic et à l'impression. Les urgences gardent leur priorité, y compris sur les parcours mineurs et lors de la remise privée des résultats.

### P2 — Les indices affichés n'ont pas le même périmètre

Le score d'habitudes exige au moins 70 % de couverture, cinq catégories et des portes résolues. Express et Quick n'en disposent pas (`app/lib/scoring.ts:1064`). Les indices de piliers du module longévité peuvent être produits avec une seule composante et intègrent d'autres variables.

Proposition : ne pas moyenner ces indices ni les présenter sur une même échelle comparative. Afficher les mesures déclarées, les habitudes évaluées et la couverture avec des labels distincts.

### P2 — La transition vers les résultats et la navigation mobile peuvent désorienter

Le focus des résultats ne se déplace explicitement que lors de la remise privée aux adolescents (`app/components/results.tsx:418`). Le titre du bilan adulte normal ne reçoit pas le focus à son apparition. Sur petit écran, les quatre piliers occupent encore quatre lignes au-dessus de la question (`app/globals.css:1185`).

Proposition : focaliser le titre du nouvel écran et compacter le suivi mobile autour du chapitre courant. Préserver une vue accessible des quatre domaines. Il s'agit de constats de code, sans mesure de leur effet dans un navigateur lors de cette revue.

## Direction visuelle proposée : Atlas santé

Trois voies ont été comparées : une évolution entièrement sombre de l'Atlas, une interface entièrement claire de dossier de santé, et un accueil immersif suivi de surfaces de lecture claires. La troisième répond le mieux au double besoin de spectacle et de lisibilité.

Palette proposée : bleu nocturne `#10273D` pour l'accueil ; blanc bleuté `#F3F7FC` pour les parcours ; blanc `#FFFFFF` pour les champs ; encre `#172E46` ; bleu d'action `#2864DC` ; cyan `#7FE1EB` pour la lumière de l'Atlas. Conserver les quatre couleurs sémantiques des piliers, en adaptant leurs variantes au contraste des fonds clairs. Les codes de gravité restent distincts des couleurs de domaine.

Typographie proposée : Sora pour les titres et Source Sans 3 pour les textes et contrôles, avec chiffres tabulaires pour les mesures. Hébergement local via le mécanisme de polices existant. Titres de question de 28 à 36 px, texte courant de 17 à 18 px et longueur de ligne de 60 à 70 caractères. Les petites métadonnées ne deviennent ni des titres ni des paragraphes entièrement en capitales.

### Accueil et animation

Titre proposé : « Comprenez ce qui compte pour votre santé. » Sous-texte : « Explorez vos habitudes, vos points d'appui et les signaux à approfondir. » Le premier écran expose le début du parcours et le choix de profondeur.

Au défilement, la silhouette anatomique locale devient le support d'une exploration en quatre temps : respiration, force, sommeil, nutrition. Une lumière traverse la silhouette, la caméra se rapproche de la zone active et les tracés existants apparaissent progressivement. Le texte accompagne chaque étape sans masquer le corps.

L'effet dépend de la position de défilement, dans les deux sens. Pas de scroll forcé, de son ou d'attente avant de commencer. Durée spatiale cible : trois à quatre écrans sur ordinateur, deux à trois sur mobile ; une présentation statique remplace l'effet en réduction des animations. Réutiliser la timeline GSAP et les médias locaux, sans ajouter de moteur 3D ni de vidéo distante.

### Consentement et questions

Une colonne principale claire ; les informations de confidentialité sont regroupées et lisibles. Sur ordinateur, les quatre piliers et la progression apparaissent dans une marge discrète. Sur mobile, ils deviennent un bandeau compact.

Chaque question suit la même hiérarchie : contexte du pilier, question courte, précision utile, réponse, navigation. « Pourquoi cette question ? » conserve les explications secondaires. Les indications nécessaires pour répondre restent visibles.

| Sujet | Titre proposé | Précision visible |
| --- | --- | --- |
| Sommeil | Combien de temps dormez-vous habituellement ? | Comptez votre sommeil sur une période de 24 heures. Réponse en heures. |
| Réveil | À quel point vous sentez-vous reposé au réveil ? | Conserver le délai prévu par la question actuelle. Échelle : 0 Pas du tout ; 10 Complètement. |
| VO₂ max | Connaissez-vous votre dernière valeur de VO₂ max ? | Utilisez une mesure ou une estimation déjà disponible. Aucun test à réaliser. Unité : ml/kg/min. |
| Squat | Quelle charge avez-vous déjà soulevée au squat sur une répétition ? | Utilisez uniquement un résultat existant. Ne tentez pas de charge maximale pour répondre. |
| Alimentation | Combien de portions de fruits et légumes mangez-vous par jour ? | Pensez à une journée habituelle. Garder la définition actuelle de la mesure. |

Les textes FR et EN doivent évoluer ensemble. Les identifiants, types de réponse, options canoniques, portes d'éligibilité et périodes de référence ne changent pas lors d'une simple reformulation.

### Résultats

Ordre proposé :

1. Signaux urgents, si présents.
2. Synthèse : points d'appui, éléments à approfondir, couverture des réponses.
3. Jusqu'à trois prochaines actions, avec justification concise.
4. Position du score d'habitudes sur le repère théorique, si le score est disponible.
5. Exploration des quatre piliers et des preuves via l'arbre existant.
6. Calcul détaillé, mesures de laboratoire confirmées et export explicite.

Une navigation d'ancrage « Synthèse / Votre repère / Détails » rend le bilan parcourable sans retirer les contenus de l'impression. Express conserve ses quatre résumés et ses valeurs manquantes explicites. Quick et les mineurs conservent leurs résultats adaptés, sans leur attribuer artificiellement un score adulte.

## Définition de la gaussienne proposée

Choix retenu : un repère pédagogique pour le score d'habitudes existant, et non une moyenne réelle de participants.

- Axe horizontal : indice d'habitudes de 0 à 100.
- Courbe : profil normal théorique de centre 50 et d'écart-type 15, affiché seulement sur la plage du score. Ces paramètres sont des conventions de dessin documentées, pas des observations ni des seuils de santé.
- Marqueur : valeur réelle du score calculé, avec position numérique lisible même sans le graphique.
- Libellés visibles : « Repère théorique », « Votre score », « Centre du repère : 50 » et « Aucune population de référence mesurée ».
- Comparaison : écart en points au centre du repère ; aucun percentile de population, risque de maladie ou jugement « normal/anormal ».
- La courbe n'est pas la distribution prouvée du score borné. Ne pas attribuer de probabilités aux surfaces ou aux bandes colorées.
- Disponibilité : uniquement lorsqu'un résultat `adult-score` existe, donc selon les conditions actuelles du moteur. Pour Express, Quick, mineurs ou couverture insuffisante, expliquer pourquoi la position n'est pas calculée.
- Accessibilité : titre et description du SVG, alternative textuelle, contraste, marqueur identifiable sans couleur seule, impression lisible et aucune animation requise pour accéder au chiffre.

Une vraie comparaison à la population demanderait un jeu de données compatible avec la version exacte du questionnaire, le calcul et la population. Il faudrait alors documenter l'effectif, la période, les exclusions, les données manquantes et la distribution observée ; utiliser une distribution empirique si elle n'est pas gaussienne. Cette collecte n'est pas incluse dans la refonte et ne justifie pas d'ajouter un backend.

Référence statistique consultée : [NIST — paramètres et standardisation de la loi normale](https://www.itl.nist.gov/div898/handbook/pmc/section5/pmc51.htm). Le NIST décrit la formule ; il ne valide pas les paramètres proposés pour ce produit.

## Plan d’exécution approuvé

1. Ajuster les tokens et la hiérarchie typographique dans le layout et la feuille de style ; conserver la structure Vinext/React et les médias existants.
2. Réviser l'accueil et renforcer la timeline GSAP avec le balayage lumineux et la progression anatomique. Préserver les chemins statiques et les actions de démarrage.
3. Améliorer les présentations des questions, les consignes de mesures, les extrêmes des échelles et la validation des valeurs. Écrire d'abord des tests de comportement pour les valeurs impossibles, le clavier et la reprise après erreur.
4. Réorganiser le bilan et ajouter un composant isolé de repère gaussien consommant le score existant. Tester le marqueur, les états sans score et l'absence de percentile inventé.
5. Adapter les autres vues, les textes FR/EN et l'impression. Vérifier la confidentialité des mineurs, l'ordre des urgences et la conservation de l'état lors du changement de langue.
6. Exécuter TypeScript, lint, suite complète et build ; faire relire indépendamment les changements ; actualiser le README et le registre de confidentialité avec les limites exactes de la comparaison et la décision concernant la longévité.

Critères de réussite : parcours Express 9 / Quick 20 / Détaillé 50 et branches Deep conservés ; score existant inchangé pour les mêmes réponses valides ; impossible de valider 100 heures de sommeil ; consigne d'effort visible avant toute mesure maximale ; réduction des animations conservée ; urgences avant toute synthèse ; aucune réponse manquante convertie en zéro ; courbe explicitement théorique et absente lorsque le score n'est pas disponible ; aucune persistance ni requête distante contenant les réponses.

## État de remise

La refonte est implémentée dans l'arbre de travail, sans migration du framework, changement du moteur médical ou collecte de réponses. Aperçu compilé local : `http://localhost:5190/`. Développement : `http://localhost:5181/`. Aucun commit, push ou déploiement n'a été effectué.

Livraison :

- Accueil bleu nocturne, polices Sora et Source Sans 3, CTA immédiats, zoom anatomique, balayage lumineux et quatre scènes synchronisées sur le chapitre centré à l'écran. Le contenu statique et le scroll natif sont conservés.
- Consentement, saisie, intermissions et bilan sur surfaces claires ; titres ajustés, progression mobile compacte, focus et navigation clavier conservés.
- Titres de questions FR/EN clarifiés, périodes et unités conservées, consignes de mesures connues visibles, extrêmes des échelles explicités et validation commune au clic et à Entrée. Aucun ID, choix, gate ou calcul du score n'est modifié.
- Urgences prioritaires, synthèse de quatre piliers, appuis, couverture, actions puis détails. Le repère théorique place uniquement un score adulte déjà disponible ; les autres états expliquent son absence.
- Correction du démarrage en développement : le scanner Vinext exclut les fichiers de tests de ses entrées, ce qui évite de traiter la dépendance native `canvas` des tests comme un module navigateur.
- README, registre de confidentialité et plan d'exécution actualisés.

Vérifications réalisées sous Node `v26.7.0` :

| Contrôle | Résultat |
| --- | --- |
| TypeScript sans émission ni cache incrémental | Réussi |
| ESLint | Aucun échec ; un avertissement dans le fichier préexistant `.remember/tmp/last-ndc.ts` |
| Suite complète Vitest | 50 fichiers, 5 043 tests réussis |
| Derniers ajustements de textes et CSS | 4 fichiers, 129 tests ciblés réussis après ces ajustements |
| Build Vinext final | 5 étapes réussies |
| Revue indépendante du code | Aucun défaut bloquant confirmé ; score, mineurs, saisies et nettoyage GSAP examinés |
| Vérification navigateur | Chrome isolé, accueil et scroll desktop/mobile, FR/EN, consentement, saisie et bilan |
| Parcours détaillé | 50 réponses fictives jusqu'au bilan sur mobile, puis sur la version compilée desktop |
| Saisie mobile | 100 heures refusées avec erreur localisée, `aria-invalid` et focus ; correction acceptée |
| Repère du profil fictif | Score 86/100, centre théorique 50, écart +36 points ; graduations lisibles à 390 px |
| Bilan compilé desktop | Ancres valides, police Sora chargée, largeur 1 280 px sans débordement |
| Console et réseau du parcours compilé | Aucune erreur ni alerte console ; 23 requêtes GET localhost, aucun envoi de réponses |
| Intégrité du diff | `git diff --check` réussi |

Limites : aucune cohorte empirique n'est disponible ; le repère ne constitue donc pas la moyenne réelle des résultats des participants. Les chemins mineurs, Express/Quick, impression et réduction du mouvement sont couverts par les tests ; ils n'ont pas tous fait l'objet d'un nouveau parcours navigateur complet lors de cette refonte. Aucun nouvel audit Lighthouse ou médical n'est revendiqué. L'avertissement de taille de bundle supérieur à 500 Ko reste présent. La matrice de publication Node 24.13.0 documentée dans le README n'a pas été réexécutée ; cette remise est locale.
