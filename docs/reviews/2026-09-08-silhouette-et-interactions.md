# Silhouette translucide et exploration des graphiques

Le premier état ci-dessous est historique. Le panneau de repères est ensuite retiré à la demande de l’utilisateur ; la dernière section décrit l’état actuel.

## Intention

La demande du 8 septembre précise une silhouette transparente et impersonnelle, des graphiques améliorés et des éléments interactifs au défilement. L’identité menthe, forêt et prune reste la base du site.

## Silhouette

Le visage, les cheveux et les vêtements distinctifs sont retirés. La forme humaine utilise une seule surface translucide partagée, avec un reflet clair et des contours plus soutenus. Aucun symbole frontal, couche de particules, texture distante ni boucle d’animation supplémentaire. Le torse possède une courbe continue et les articulations suivent les poses existantes. Les accessoires restent présents : lit, piste, barre et disques calibrés, table et assiette garnie. Le repli SVG est également neutre et translucide, avec un identifiant de dégradé propre à chaque instance.

## Interactions

Chaque chapitre propose deux repères issus du questionnaire. La sélection révèle une explication, avec de vrais boutons accessibles au clavier et au toucher. Le tracé décoratif progresse avec la variable de défilement existante. Le mouvement réduit et l’échec WebGL conservent les repères dans les chapitres, hors de la scène fixe.

La boussole du bilan Express permet de sélectionner un axe et de lire son score, sa qualification, son explication et ses mesures. La courbe du parcours Détaillé reste une convention de dessin, sans population de référence ni percentile. Les scores et les règles de calcul restent identiques.

## Vérification

La suite complète passe : **62 fichiers / 5 238 tests**, en 9,63 secondes lors de la dernière exécution. TypeScript et la compilation passent. ESLint ne présente aucune erreur ; le seul avertissement reste celui du fichier mémoire préexistant `.remember/tmp/last-ndc.ts`.

Deux passes précédentes ont rencontré des délais de tests sur une machine occupée par plusieurs aperçus navigateur. Un ancien test géométrique effectuant plus de 320 000 assertions de bornes a été simplifié : les maxima absolus sont calculés sur tous les sommets, puis comparés aux mêmes limites. Les mêmes cas et la vérification de finitude restent couverts. Aucun délai de test n’a été augmenté. La passe finale complète est verte après fermeture des vues de QA actives.

Chrome contrôle l’accueil sur ordinateur 1280×900 et mobile 390×844. La version compilée est contrôlée à 320×568 sur les quatre activités : canvas de 170 à 224 px de haut selon le chapitre et la sélection, boutons réellement atteignables, widget entièrement dans l’écran et aucun débordement horizontal. Les écrans courts utilisent un récit compact ; les paragraphes originaux restent disponibles dans l’arbre accessible. La préférence de mouvement réduit simulée au chargement donne un SVG translucide, aucun canvas et quatre explorateurs utilisables dans les chapitres. La sélection est partagée entre scène, chapitres, mode réduit et impression.

L’aperçu local est actualisé sur le port 5190. Aucun commit, envoi distant ni déploiement.

Les graphiques sont contrôlés dans un aperçu de test isolé utilisant les composants réels : boussole complète à 92/100, sélection du sommeil puis de l’alimentation par clic, survol et clavier ; valeurs manquantes et zéro réel conservés sur mobile. Les captures de la courbe couvrent 65,5 sur ordinateur et les positions 0, 50 et 100 sur mobile. Les graduations, l’intervalle coloré et l’étiquette personnelle restent lisibles ; la position 50 ne produit pas d’aire de différence. Aucun débordement horizontal constaté.

Un défaut Chrome lié au pointillé normalisé et aux traits SVG non redimensionnés a été corrigé : le pointillé est explicitement retiré à la fin de l’animation, ce qui garantit une courbe complète. La compilation finale et l’aperçu sur le port 5190 incluent ce correctif. Les états sans animation et l’impression conservent les tracés complets et les mesures textuelles.

Le contrôle des graphiques avec une véritable préférence de mouvement réduit dans un navigateur de test confirme l’absence d’animation et de pointillé résiduel ; la sélection reste fonctionnelle. L’impression est capturée : les noms et valeurs des quatre axes, les quatre articles et la courbe complète sont présents, avec les commandes masquées. Les fichiers et le serveur de l’aperçu de test ont été retirés après vérification.

## Réactions du personnage et suppression du panneau

La demande suivante supprime le menu ajouté sous l’animation. `HealthAxisExplorer`, sa copie, ses tests et ses styles sont retirés du stage et des chapitres statiques. Les quatre liens principaux restent présents. Le récit mobile affiche à nouveau ses paragraphes complets ; à 320×568, la scène mesure entre 221 et 282 px de haut selon le chapitre, sans débordement horizontal.

Les réactions sont des petits objets attachés à la tête et au torse : huit gouttes naissent puis tombent en course ; au repas, les yeux sourient, la courbe de bouche varie et les joues rosissent légèrement. Le sommeil ferme les yeux et soulève doucement le torse et la couette, avec trois signes de sommeil ascendants. Le deadlift reçoit une expression concentrée et de courts traits d’effort. La silhouette translucide, les quatre gestes et les accessoires sont conservés.

Les effets reçoivent l’horloge existante, sans RAF supplémentaire ni création de géométrie par image. Leur fondu suit les accessoires ; les transitions repassent brièvement par la silhouette neutre. Les ressources sont partagées puis libérées une seule fois. Le cadrage mesure également les effets. Le SVG conserve des indices statiques en mouvement réduit et en repli WebGL.

La suite complète passe : **61 fichiers / 5 234 tests** en 12,34 secondes. Les contrôles couvrent visibilité par activité, chute et fondu de la sueur, respiration, sourire, horloge déterministe, reprise après arrêt, cadrage et destruction des ressources. TypeScript passe ; ESLint n’a aucune erreur et conserve son avertissement mémoire préexistant. La revue indépendante ne relève aucun défaut. Chrome contrôle les réactions sur ordinateur 1280×900 et les quatre scènes sur mobile 320×568. Les graphiques et le calcul des résultats restent inchangés.

La compilation finale réussit et le serveur local 5190 est relancé. Sur cette version compilée, Chrome vérifie les quatre changements de chapitre à 390×844 : un canvas, aucun panneau retiré, aucun débordement ni message console. Avec la préférence de mouvement réduit simulée au chargement, l’illustration initiale conserve ses yeux fermés et les quatre chapitres restent disponibles, sans canvas. Aucun commit ni déploiement.
