# Corrections du questionnaire et lecture des résultats

Demande : éviter les questions de maternité inapplicables au profil masculin et rendre les résultats immédiatement compréhensibles avec des diagrammes et un positionnement.

## Périmètre incrémental

- Filtrer les questions de grossesse, règles, ménopause et dépistage du col lorsque le sexe renseigné à la naissance est masculin. Conserver les questions de fertilité, douleur et santé sexuelle applicables. Réutiliser la purge des réponses devenues inéligibles.
- Conserver le contexte anesthésie du questionnaire GLP-1, avec un libellé adapté au profil masculin.
- Remonter le score d’habitudes dans la synthèse et remplacer la courbe théorique arbitraire par une échelle explicite de 0 à 100.
- Afficher les catégories sous forme de barres. En l’absence de score valide, représenter uniquement les réponses disponibles ; ne pas reconstituer un score masqué par le moteur.
- Distinguer le score d’habitudes des signaux urgents ou à revoir. Ne calculer ni mortalité, ni espérance de vie, ni classement démographique.
- Conserver palette, typographie, calculs, parcours mineurs, confidentialité et export existants.

## Validation

- Régression masculin / féminin / intersexe / sexe non renseigné, changement de réponse et nettoyage des branches.
- Résultats complets, incomplets, urgents, sans données et Express ; français et anglais.
- Score et position corrects à 0, 50 et 100 ; aucune population de référence inventée.
- Vérification navigateur ordinateur et mobile, TypeScript, tests et build.

## Protocole

Orchestrateur `claude-fable-5` sollicité via CLI le 8 septembre 2026 ; réponse : « You've reached your Fable limit. » Aucune validation de Fable obtenue. Les travaux restent des corrections locales dans l’architecture existante, sans migration ni nouvelle dépendance. La revue Fable reste à effectuer lorsqu’il sera disponible.

## Résultat et vérifications
+
+- Filtre masculin appliqué à la grossesse, aux règles, à la ménopause, au col et au programme grossesse isotrétionïne. Anesthésie GLP-1 conservée ; nettoyage des réponses obsolètes vérifié.
+- Échelle 0–100 intégrée à la synthèse détaillée ; huit domaines visualisés en points ou, si le score est indisponible, en couverture explicitement identifiée. Signaux et priorités visibles en tête.
+- Express : échelle accessible et curseur supplémentaires, radar existant conservé.
+- `npm test` : 62 fichiers, 5 258 tests passent. Après les derniers ajustements CSS : 127 tests ciblés supplémentaires passent.
+- `npx tsc --noEmit`, `git diff --check` et `npm run build` passent.
+- `npm run lint` : aucune erreur ; un avertissement préexistant dans `.remember/tmp/last-ndc.ts`.
+- Navigateur : parcours masculin détaillé réel, 50 questions sans maternité, score d’exemple 84/100 et couverture 72 %. Cas incomplet à 61 % : aucune position inventée, barres de couverture et signal sommeil visibles.
+- Express réel : 92/100, barre mesurée à 271,4 px sur une piste de 295 px, soit 92 %, hauteur 10 px.
+- Mise en page contrôlée à 1440, 390 et 320 px, sans débordement horizontal ; mouvement réduit et affichage d’impression contrôlés.
+- Revue indépendante des composants et styles : défaut de remplissage du span Express identifié puis corrigé et vérifié dans le navigateur. Revue Fable non obtenue, quota indisponible comme indiqué ci-dessus.
