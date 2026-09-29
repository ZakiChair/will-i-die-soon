# Accueil vivant — 7 septembre 2026

La page de garde présente désormais une sculpture de filaments en 3D. Le projet de référence local `Projects/living-tree` utilise React, Three.js et une scène procédurale chargée dynamiquement. L’accueil reprend Three.js **0.185.1** dans la pile React/Vinext existante.

## Présentation

- Titre « Votre forme, sous un nouveau jour. », textes FR/EN centrés sur le portrait Express et ses quatre axes.
- Sphère de 40 filaments et 512 points, respiration lente, ouverture en tore et rotation au défilement. Bleu pour le cardio, ambre pour la force, lavande pour le sommeil et menthe pour l’alimentation.
- Bouton Express visible dès le premier rendu, hors animation d’entrée. Accès aux autres parcours conservé.
- Mise en page desktop à deux colonnes ; texte, actions puis sculpture sur mobile. Typographie en rem pour conserver le redimensionnement du texte.

## Fonctionnement

`LivingAtlasVisual` fournit immédiatement une composition SVG dans le HTML et importe le moteur à la demande lorsque le visuel devient visible et le mouvement autorisé. `LivingAtlasScene` possède ses ressources GPU, ses observateurs et sa boucle de rendu. La progression de ScrollTrigger passe par une ref ; elle ne provoque pas de rendu React à chaque image. Les chapitres visibles continuent de piloter l’axe actif. Aucun contrôle de caméra ne capture les gestes de scroll.

Le bouton de pause, le masquage de l’onglet et la sortie du viewport arrêtent la boucle. La réduction du mouvement libère le moteur et affiche le SVG accompagné du récit complet. Une panne de WebGL ou de chargement bascule vers les quatre explications statiques ; les CTA restent disponibles. Les ressources et les callbacks périmés sont nettoyés au démontage, notamment lors du départ vers le questionnaire. Le DPR est plafonné à 1,5 sur mobile et 2 sur desktop.

L’animation est décorative et ne représente aucune réponse personnelle. Le questionnaire, le calcul des indices et les résultats Express ne changent pas.

## Vérification

- Suite complète : 54 fichiers, 5 129 tests réussis ; test supplémentaire du cadrage final du tore vérifié dans les 16 tests ciblés du moteur.
- Tests du composant : pause/reprise, sortie du viewport, préférences de mouvement, import tardif, erreurs d’initialisation et callbacks après démontage.
- TypeScript et compilation de production réussis ; lint sans erreur (un avertissement préexistant dans `.remember/tmp/last-ndc.ts`).
- Inspection navigateur sur desktop 1280×900 et mobile 390×844 : scène réelle WebGL, quatre couleurs, titres FR/EN, défilement natif et absence de débordement horizontal.
- Pause réelle vérifiée par deux captures successives identiques, puis reprise vérifiée.
- Préférence de mouvement réduit simulée avant initialisation : aucun canvas ni chargement du module 3D, SVG présent, quatre chapitres visibles et sans transformation.
- Perte réelle de contexte WebGL déclenchée via son extension : moteur retiré, quatre chapitres conservés, CTA menant au consentement.
- Parcours Express complet depuis le nouvel accueil, neuf réponses du profil de référence : 92/100, axes 97/100/90/80. Aucun canvas restant, aucun stockage local/session ni cookie, aucune ressource externe ou erreur de console pendant le parcours normal.
- Revue indépendante après correction des cycles de chargement et de reprise : aucun défaut confirmé restant.

Le moteur 3D est un fichier chargé séparément. L’avertissement de taille de bundle du projet reste présent. La vérification visuelle a été effectuée dans Chrome headless ; une mesure sur téléphone physique n’a pas été réalisée.

Références techniques : [documentation Three.js](https://threejs.org/docs/) et [libération des ressources GPU](https://threejs.org/manual/en/how-to-dispose-of-objects.html).
