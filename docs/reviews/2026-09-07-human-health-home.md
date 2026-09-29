# Accueil — portrait de santé

La demande est de rendre la page de garde plus directement liée au bilan de santé. Cette direction remplace la sculpture abstraite du précédent accueil par une silhouette humaine stylisée, sur fond clair.

## Composition

Le titre « Comment allez-vous, vraiment ? » introduit les questions sur la forme, le sommeil et l’alimentation. Neuf questions, accès adulte et absence de compte sont visibles avant le démarrage. Le bouton Express et les autres parcours restent accessibles immédiatement.

La silhouette procédurale Three.js possède quatre foyers : cardio, force, sommeil et alimentation. Les libellés indiquent les informations du questionnaire ; ils ne portent aucun score personnel. Sur ordinateur, ils entourent la silhouette. Sur mobile, les quatre axes sont regroupés au-dessus du corps pour rester accessibles pendant la lecture. Les liens natifs conduisent aux chapitres et leur transmettent le focus. Une section présente les trois sorties du bilan : points d’appui, priorités et indice expliqué lorsque les réponses suffisent.

Palette : fond #F2F7F8, texte #183C49, action #117780, bleu cardio, ambre force, lavande sommeil et vert alimentation. Les polices Sora et Source Sans 3 restent servies localement, avec tailles en rem. La silhouette est une illustration des thèmes et non un modèle anatomique validé.

## Intégration

- `HumanSignalScene` conserve le cycle de vie du moteur décoratif : import différé, pause, détection de sortie du viewport, arrêt en arrière-plan et nettoyage des ressources GPU.
- `HumanSignalGeometry` fournit 3 352 points et des contours déterministes, avec des proportions humaines et une jonction continue des épaules.
- `LivingAtlasVisual` partage le chargement et les replis entre les variantes. La variante humaine est utilisée par l’accueil et possède son propre SVG statique.
- `HealthAxisMap` utilise les quatre identifiants de chapitres existants ; la progression continue passe toujours par une ref. Les résultats et leurs calculs ne changent pas.
- Les cartes inactives ne sont masquées sur mobile qu’après initialisation du mouvement. Les quatre descriptions restent présentes dans le HTML serveur. Le conteneur d’espacement du récit ne capture plus les clics destinés aux axes ou à la pause.
- Les styles du nouveau thème sont regroupés dans `app/health-home.css`. La palette d’impression conserve une encre sombre malgré le thème clair.

## Validation

La suite complète a passé **57 fichiers / 5 147 tests**, puis **34 tests ciblés** après les corrections de navigation et l’ajout du test du HTML serveur. Les **15 tests du moteur et de la géométrie** couvrent notamment le cadrage desktop/mobile, les quatre zones, la pause et les erreurs de contexte. TypeScript et la compilation passent. Le lint ne remonte aucune erreur et conserve un avertissement préexistant dans `.remember/tmp/last-ndc.ts`.

Inspection Chrome sur desktop 1280×900 et mobile 390×844 : aucune largeur dépassant le viewport, silhouette réelle WebGL, textes FR/EN et quatre liens menant au chapitre correspondant. Un clic natif sur Sommeil confirme le hash, le focus et l’axe actif ; le test de hit-testing confirme que les quatre liens restent atteignables. L’ancienne superposition des cartes sur mobile a été corrigée par une navigation séparée et un fond de lecture opaque.

Le parcours complet a également été vérifié sur la version compilée : neuf réponses de référence, indice Express 92/100 et axes 97/100/90/80. Aucun canvas ne reste dans le questionnaire, aucune erreur de console, aucune ressource externe, aucun cookie ni stockage persistant pendant ce parcours. Sur le premier écran desktop compilé, les centres des quatre liens, du bouton Express et de la pause sont tous atteignables.

La revue indépendante finale confirme la correction des clics, du rendu avant initialisation et du contraste d’impression, sans défaut restant confirmé dans ce périmètre.

La version reste locale. Aucun enregistrement, déploiement ni changement du traitement des réponses n’a été effectué. Les mesures de performances et attestations des anciennes versions restent historiques.

## Évolution du mouvement

La demande suivante conserve le corps humain et retrouve le mouvement ample de la première sculpture. Le défilement pilote désormais un tour complet ; une oscillation et une respiration animent la pose au repos. Vingt-huit filaments suivent les volumes de la silhouette et ondulent vers le haut. Leur enveloppe s’ouvre légèrement au milieu du parcours, avec une approche mesurée de la caméra.

Les coordonnées des filaments sont écrites dans un tampon réutilisé. La géométrie du corps reste stable pour conserver les membres et le visage lisibles. Les traits SVG fixes entre les libellés et le corps sont masqués pendant cette rotation ; les quatre liens, leurs icônes et l’indication du chapitre actif restent disponibles. Le repli statique conserve ses repères.

Les filaments se répartissent en deux groupes de quatorze sous le bassin pour suivre chaque jambe. La progression est lissée dans le moteur, car le `scrub` GSAP ne lisse pas la ref de progression. Le bouton pause reste monté au changement d’onglet et se trouve dans la zone du visuel, hors des cartes de texte. La fin du défilement sélectionne explicitement Alimentation, même si le centre du chapitre précédent reste plus proche du centre du petit écran.

Validation de cette évolution : **58 fichiers / 5 170 tests passent**, dont les projections réelles à cinq angles et pendant un cycle au repos, la réutilisation du tampon et la pause/reprise. TypeScript et la compilation passent ; le lint conserve uniquement l’avertissement préexistant du fichier `.remember/tmp/last-ndc.ts`. La revue croisée ne confirme aucun défaut restant dans le moteur.

Chrome confirme le mouvement des coordonnées et de la rotation au repos et au scroll, puis l’absence de nouvelles images après un clic natif sur Pause. Sur la version compilée, desktop 1280×900 et mobile 390×844 restent sans débordement horizontal ; les quatre liens et la pause sont atteignables, et la fin mobile active Alimentation. Le démarrage Express retire le canvas sans erreur de console. Une préférence de mouvement réduit simulée avant chargement laisse le SVG et les quatre descriptions visibles, sans canvas. L’aperçu local utilise le port 5190.

## Évolution vers quatre actions

La nouvelle demande fait suivre au personnage quatre actions reconnaissables : dormir, courir, soulever une barre en soulevé de terre, puis manger. Le récit commence désormais par le sommeil, suivi du cardio, de la force et de l’alimentation. Ses titres français sont « Dormir. Récupérer. », « Courir. Trouver son rythme. », « Soulever. Maîtriser le geste. » et « Manger. Varier les plaisirs. » La version anglaise suit les mêmes étapes.

Cet ordre appartient uniquement à l’accueil : `humanAtlasStorySceneIds` pilote les chapitres, leur numérotation, les liens et la progression du récit. `humanAtlasSceneIds` conserve son ordre canonique ; le questionnaire, les critères d’éligibilité, les quatre axes des résultats et les calculs restent inchangés. Les descriptions continuent de demander les mesures déjà connues et acceptent leur absence, sans inviter à un nouvel effort maximal. Les gestes illustrent les thèmes du bilan et ne constituent pas des mesures de santé.

Les quatre liens sont maintenant regroupés au-dessus de la scène sur ordinateur comme sur mobile. Les anciennes connexions SVG fixes sont supprimées. En mode animé sur mobile, le texte du seul chapitre actif est présenté sous le personnage ; cette copie porte `aria-hidden="true"`, ne contient aucune commande et ne double pas les titres accessibles. Les chapitres d’origine restent les cibles des liens et conservent leur accès au clavier. Leur masquage visuel dépend de l’initialisation du mouvement ; les quatre textes restent le récit de référence pour le rendu serveur et les modes statiques. La pause conserve sa place dans le visuel et son état lors d’un changement d’onglet.

`human-activity-motion` calcule les 17 articulations dans des tampons réutilisés. `human-activity-rig` habille le personnage et gère le lit avec couette, la piste, la barre et la table. Le moteur existant garde son cycle de vie, ses lumières locales et une transition de 0,95 seconde entre poses. Le cadrage est mesuré sur plusieurs phases par action pour rester stable pendant chaque geste. Les illustrations SVG de repli reprennent les mêmes actions.

Validation de cette évolution : **60 fichiers / 5 183 tests passent**. Les tests couvrent les longueurs des membres, les pieds fixes et la prise de la barre, le trajet de la cuillère du bol à la bouche, les cycles continus, le cadrage à trois formats et pendant les transitions, ainsi que la pause et le nettoyage. TypeScript et la compilation passent. Le lint n’ajoute aucune erreur ; son seul avertissement reste dans `.remember/tmp/last-ndc.ts`.

Chrome vérifie les quatre actions sur ordinateur et mobile, sans débordement horizontal. Sur l’aperçu compilé, les articulations changent réellement pendant la course ; un clic natif sur Pause fige les images et la reprise au clavier fonctionne. Le clic natif sur Alimentation conserve la navigation mobile dans le viewport et affiche le repas. Le démarrage Express libère le canvas sans erreur de console. La préférence de mouvement réduit, simulée avant chargement, conserve l’illustration statique et les quatre textes, sans canvas ni copie mobile visible. Les styles de masquage mobiles sont limités à l’écran pour préserver l’impression. L’aperçu local actualisé utilise le port 5190. Les validations des sections précédentes restent historiques.

## Apparence bleue inspirée de Dr Manhattan

Le personnage adopte un crâne nu, des yeux blancs, un cercle frontal et un corps bleu translucide. Les vêtements et les chaussures sont remplacés par des volumes arrondis continus. Un fond bleu nuit dans la zone du visuel fait ressortir la silhouette ; la page et ses textes conservent le thème clair. Les accessoires passent en bleu gris et la couette devient translucide. Les quatre actions et leurs contacts restent identiques.

`human-energy-material` fournit la surface et son contour lumineux. `human-energy-filaments` attache 1 712 points et 1 316 segments aux volumes du corps : leurs coordonnées locales restent fixes, les articulations portent leur mouvement et deux matériaux partagés animent la lumière. Les tampons sont réutilisés et la taille des points s’adapte à la hauteur du visuel et à la densité de pixels. Surface, filaments et gestes partagent l’horloge du moteur, y compris la pause et la reprise. Le nettoyage libère les ressources de chaque effet. Les quatre SVG de repli reprennent la même palette.

Chrome vérifie la version compilée sur ordinateur 1280×900 et mobile 390×844, sans débordement horizontal ni erreur de console. Pendant la course, 15 images en 250 ms montrent le mouvement des articulations et l’avancement synchronisé des deux effets lumineux. Un clic natif sur Pause fige l’ensemble ; la reprise au clavier réactive le mouvement. Un clic natif sur Alimentation affiche le repas et conserve les quatre liens accessibles. La préférence de mouvement réduit simulée avant chargement conserve un SVG et les quatre textes, sans canvas ni copie mobile. Le démarrage Express retire le canvas et transmet le focus à son introduction.

La revue finale a corrigé un débordement transitoire du lit lors d’un saut direct du repas au sommeil dans un visuel étroit. Le fondu du décor entrant attend que le cadrage soit adapté ; celui du décor sortant se termine plus tôt. La caméra conserve sa trajectoire et son cadrage final. Les tests projettent les douze transitions possibles à deux formats étroits, en complément des cycles et formats précédents.

Validation finale : **61 fichiers / 5 209 tests passent**, ainsi que TypeScript et la compilation. ESLint ne signale aucune nouvelle erreur ni avertissement ; l’avertissement préexistant de `.remember/tmp/last-ndc.ts` demeure. L’aperçu local actualisé reste disponible sur le port 5190. Aucun déploiement n’a été effectué ; les chiffres des sections précédentes décrivent leurs versions respectives.

## Personnage intégré à la page et palette glacier

La demande suivante valide l’animation et retire le panneau sombre derrière le personnage. Le canvas conserve sa transparence native ; le fond, la bordure, les coins arrondis et le pseudo-élément du panneau sont supprimés. Les quatre gestes évoluent directement sur le fond de la page. La navigation des axes devient une rangée transparente avec un soulignement pour le chapitre actif. La piste de course est éclaircie et partiellement transparente pour accompagner cette intégration.

Palette : fond glacier `#EDF3FA`, encre marine `#172E46`, secondaire `#53677D`, cobalt `#2864DC`, surfaces `#E4EDF8` et blanc. Les parcours et les résultats reprennent ces fonds et séparateurs. Les touches lavande, sauge et ocre distinguent les thèmes de l’accueil sans remplacer les libellés. Le texte principal atteint un contraste de 12,40:1 sur le fond, le secondaire 5,22:1 et le texte blanc des boutons cobalt 5,32:1.

Les matériaux du personnage utilisent un mélange normal adapté au fond clair. Le contour bleu et le réseau cyan-blanc conservent la silhouette et ses filaments visibles, y compris au minimum de leur pulsation sur mobile. Les SVG statiques reprennent ce contraste. Aucun changement des poses, de leur horloge, des transitions ni des calculs du bilan.

Validation : **61 fichiers / 5 209 tests passent**, TypeScript et compilation réussis ; ESLint conserve uniquement son avertissement historique dans `.remember/tmp/last-ndc.ts`. Les tests de contraste existants lisent les couleurs réelles des surfaces du parcours. Inspection Chrome sur le visuel compilé : arrière-plan transparent, bordure nulle, pseudo-élément absent, quatre liens et pause atteignables à la fin du récit mobile, sans débordement horizontal ni erreur de console.

Le parcours Express complet compilé, avec les neuf réponses de référence, conserve l’indice 92/100 et la nouvelle palette jusqu’aux résultats mobiles. Aucun canvas ni erreur de console ne reste dans ce parcours. Le mouvement réduit simulé avant chargement affiche un SVG sur fond transparent et les quatre chapitres, sans copie mobile ni canvas. L’aperçu local sur le port 5190 est actualisé ; aucun déploiement n’a été effectué.

## Accessoires du deadlift et du repas

La barre passe de 3,3 à 6,1 unités de scène. Elle possède un axe métallique, des manchons plus épais, des bagues, des colliers et un moletage géométrique. Chaque côté reçoit un disque bleu marqué 20 et un disque rouge marqué 25 ; les chiffres utilisent des géométries partagées, sans texture. Les disques plus grands touchent le sol à la phase basse, avec les mains sur la barre et les pieds fixes. L’inclinaison initiale est ajustée de 1,36 à 1,35 radian pour conserver les longueurs des jambes.

Le repas utilise désormais une grande assiette blanche avec rebord, deux œufs au plat, trois bouquets de brocoli, un steak strié, une pomme, une orange et une grappe de raisins. Les volumes sont réutilisés et leurs matériaux suivent le fondu du décor de table. La cible et le trajet de la cuillère restent identiques. Les illustrations SVG des vues Force et Alimentation reprennent les accessoires détaillés.

Pour les disques, les références visuelles consultées sont les fiches fabricant du [disque rouge de 25 kg](https://media.eleiko.com/admin/download-product-sheet.aspx?articlecode=3060350-25&language=en-us) et du [disque bleu de 20 kg](https://media.eleiko.com/admin/download-product-sheet.aspx?articlecode=3060350-20&language=en-us&view=true). Leurs couleurs et leurs marquages servent à l’illustration ; ils ne représentent pas les réponses ou les performances du visiteur.

Validation de ces accessoires : **61 fichiers / 5 210 tests passent**, ainsi que TypeScript et la compilation. Les contrôles de contact au sol, longueur des membres, cadrage pendant les transitions et libération des ressources passent. Le lint conserve seulement son avertissement historique dans `.remember/tmp/last-ndc.ts`. Les vues Force et Alimentation ont été inspectées sur ordinateur et mobile, puis confirmées sur l’aperçu compilé, sans erreur de console. L’aperçu local du port 5190 est actualisé ; aucun déploiement n’a été effectué.


## Défilement continu et thème porcelaine

L’accueil, les parcours et les résultats utilisent désormais un fond porcelaine `#F7F8FC`, une encre graphite `#1B2233` et un bleu électrique `#3158DB`. Les titres prennent davantage de place, les commandes et la navigation des axes deviennent arrondies. Le personnage conserve son canvas transparent, ses filaments et les accessoires détaillés du deadlift et du repas.

La progression du défilement pilote un pivot lissé du personnage de −6° à +6° et ajoute jusqu’à 3,5 secondes à la phase des gestes. La vitesse de rattrapage est bornée pour les sauts entre ancres. Le cadrage mesure les trois angles représentatifs lors de l’initialisation ; aucune mesure de géométrie supplémentaire n’est effectuée à chaque image. La progression continue alimente aussi une ellipse orbitale, une lumière ambiante et les indicateurs de chapitre par propriétés CSS. Les textes de l’introduction s’effacent à l’arrivée du récit ; les commandes restent disponibles.

Le bouton Pause est supprimé conformément à la demande. Le moteur conserve ses arrêts automatiques et le réglage système de mouvement réduit. Le masquage des chapitres attend `data-scroll-sequenced="true"`, posé uniquement après initialisation réussie et retiré au nettoyage, pour conserver les quatre explications si GSAP échoue. Sur mobile, une grille réserve la hauteur réelle du texte et affecte le reste à la figure. La copie visuelle du chapitre réapparaît avec une courte animation ; elle demeure cachée aux technologies d’assistance et ne contient aucune commande.

Validation finale : **61 fichiers / 5 219 tests passent**, ainsi que TypeScript, la compilation et `git diff --check`. ESLint ne signale aucune erreur ; son seul avertissement préexistant reste dans `.remember/tmp/last-ndc.ts`. Les contrôles couvrent notamment les sauts entre les douze transitions, le cadrage aux angles de pivot, le nettoyage du séquençage et les états automatiques du moteur.

Chrome confirme le rendu sur ordinateur 1280×900 et téléphone 390×844 ; le format 320×568 conserve le texte complet et les quatre liens sans débordement horizontal. Un clic natif sur Alimentation garde la navigation et le repas dans ce petit viewport. Pendant la course, un déplacement de 120 px fait progresser la valeur lissée de 0,594 à 0,681 et le pivot de 0,0196 à 0,0378 radian ; 54 nouvelles images sont rendues en 900 ms. La version compilée confirme le nouveau thème, l’absence de bouton Pause et le texte mobile complet. Le mouvement réduit simulé avant chargement conserve les quatre chapitres opaques et supprime le canvas et la copie mobile. Un clic natif sur Commencer Express libère le canvas et place le focus sur « Avant de commencer », avec la nouvelle palette, sans erreur de console. L’aperçu local du port 5190 est actualisé ; aucun déploiement n’a été effectué. Les chiffres des sections précédentes sont historiques.
