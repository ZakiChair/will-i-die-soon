# Refonte visuelle complète du 7 septembre 2026

## Direction

La demande porte sur l’intégralité de la forme du site. L’identité associe menthe `#F1F6F3`, forêt `#173D38`, vert `#086F66`, prune `#715178` et citron doux `#D8E9B2`. Manrope porte les titres et DM Sans la lecture, les commandes et les données. Les deux familles sont servies localement par le mécanisme de polices existant. Un signe à quatre pétales relie le favicon et la marque aux quatre axes du bilan.

## Présentation

- Accueil ouvert avec personnage bleu intégré au fond, navigation des étapes, bloc de présentation du bilan sur fond forêt et parcours disposés de manière asymétrique.
- Consentement séparant l’introduction et le formulaire ; questionnaire organisé autour d’une page de réponse et d’un fil d’étapes. Champs de mesure, options, échelles, états de sélection et erreurs reprennent les mêmes règles visuelles.
- Introductions de chapitre séparant le texte de l’image ; import biologique structuré en zone de fichier et registre de champs. Les vues de sécurité et de remise des résultats utilisent cette même identité.
- Bilan Express présentant l’indice et le portrait sur fond forêt, la boussole sur fond clair, les axes dans des rangées comparables et les priorités dans une liste ordonnée. La synthèse des parcours longs, le repère gaussien, l’arbre de signaux, les preuves, les accordéons et les tableaux sont harmonisés.

La palette est définie une seule fois dans `globals.css`. `layout.tsx` charge ensuite les styles d’accueil, de parcours et de résultats dans cet ordre. Le seul changement de structure dans les résultats Express ajoute deux groupes de présentation par axe. Les titres, descriptions SVG, noms accessibles des mesures et ordre des contenus restent inchangés. Le modèle 3D, ses accessoires, ses horloges et la synchronisation au scroll sont conservés ; aucun bouton Pause n’est ajouté.

## Vérification

La suite complète passe : **61 fichiers / 5 219 tests**, avec TypeScript et ESLint sans erreur. Le seul avertissement de lint reste celui de `.remember/tmp/last-ndc.ts`. Les contrôles de contraste couvrent les surfaces partagées, les fonds forêt/citron et la combinaison prune. Les 50 tests ciblés des résultats, d’Express et du repère de distribution passent. Les revues croisées ont corrigé les collisions de spécificité à l’impression pour les titres de conversion, les badges manquants et la racine de l’arbre.

Chrome contrôle la version compilée sur ordinateur 1280×900 et mobile 390×844 : accueil, conversion, consentement, questionnaire, introductions, import et résultats. Un parcours Express avec les neuf réponses de référence conserve **92/100** et les axes 97, 100, 90 et 80. Son canvas est libéré en entrant dans le questionnaire et la console ne contient pas d’erreur. Une relecture indépendante des captures desktop/mobile du bilan ne relève ni chevauchement ni débordement.

Le parcours Rapide passe par l’import facultatif puis aboutit aux résultats. Le repère numérique reste explicitement indisponible pour ce parcours, conformément à sa méthode existante. Les vues de résultats contrôlées en 320×568 ne produisent pas de débordement horizontal. L’impression a fait l’objet d’une revue de styles, sans capture d’une imprimante virtuelle.

Un parcours Détaillé de test, comportant 27 réponses et 23 questions passées, affiche également son score calculé et la courbe théorique. Le tracé, le repère personnel, les valeurs et les explications sont inspectés en 1280×900 et 320×568, sans débordement horizontal ni erreur de console. Ces données sont une fixture de vérification, pas un profil utilisateur. Le mouvement réduit simulé avant chargement conserve un SVG opaque, les quatre chapitres visibles et aucune copie mobile ni canvas.

La compilation finale inclut les derniers correctifs d’impression. L’aperçu local est actualisé sur le port 5190. Aucun commit, envoi distant ni déploiement n’a été effectué.

## Personnage humain du 8 septembre 2026

À la demande de l’utilisateur, le personnage bleu est remplacé par un humain stylisé : peau chaude `#C98F6F`, cheveux bruns `#352E2A`, t-shirt forêt `#286C60`, pantalon prune `#514356` et baskets ivoire `#EEF2E6`. Un visage sobre remplace les yeux lumineux et le symbole frontal. La scène ne charge plus les filaments ; les anciennes utilités restent isolées du rendu actif. Le corps utilise des matériaux standards opaques, partage ses géométries et conserve sa libération explicite des ressources.

Les manches suivent une fraction du segment épaule/coude ; les vêtements suivent le squelette existant. Les gestes, la caméra, les transitions au scroll, les disques calibrés et le contenu de l’assiette sont conservés. Le mobilier, la piste et la couette opaque reprennent la palette organique. Les quatre poses SVG de secours représentent le même humain habillé. Aucune modification des questions ou des calculs.

La suite complète passe : **61 fichiers / 5 221 tests**. TypeScript et compilation passent ; ESLint ne signale aucune erreur et conserve uniquement l’avertissement préexistant dans `.remember/tmp/last-ndc.ts`. Les tests vérifient notamment les surfaces opaques, les manches articulées, les yeux fermés au sommeil, l’absence de particules dans les quatre scènes, les 12 transitions cadrées, les contacts au sol et la libération des ressources.

Contrôle visuel Chrome : sommeil, course et deadlift à 1280×900 en développement ; repas à 390×844 sur la compilation finale. La barre, les mains et les vêtements restent lisibles ; l’assiette est garnie, sans cadre noir autour du personnage. La vue mobile ne déborde pas horizontalement et ne présente aucune erreur ou avertissement console. Le mode mouvement réduit est également contrôlé sur la version compilée. L’aperçu local sur le port 5190 a été redémarré. Aucun commit ni déploiement.
