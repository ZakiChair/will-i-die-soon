# Refonte Atlas santé

Proposition approuvée le 7 septembre 2026. Objectif : rendre l'accueil mémorable, la saisie plus simple et les résultats immédiatement utiles en conservant les parcours, le moteur de score et la confidentialité locale.

État : quatre lots implémentés et vérifiés localement. Résultats de validation et limites dans [la revue de remise](../../reviews/2026-09-07-revue-globale-et-proposition-front.md#état-de-remise).

## Lots et responsabilités

1. **Questions** — `question-control.tsx`, présentations localisées et validation isolée. Tester avant correction les valeurs impossibles, la soumission clavier, l'erreur accessible et la reprise. Rendre les consignes d'effort et les extrêmes des échelles visibles ; conserver IDs, options et périodes de référence.
2. **Résultats** — `results.tsx`, synthèse et composant de distribution isolés. Retirer la longévité heuristique de la vue principale. Tester la priorité des urgences, la confidentialité mineurs, les gates du score et le repère théorique (centre 50, écart-type 15, aucun percentile de population).
3. **Identité et accueil** — `layout.tsx`, `globals.css`, `landing.tsx`, `human-atlas-scroll.tsx`, timeline GSAP et textes d'accueil. Polices Sora et Source Sans 3, accueil bleu nocturne, parcours clairs, scènes anatomiques pilotées au scroll. Réduction de mouvement et média défaillant conservent un contenu statique accessible. Compacter la progression mobile.
4. **Intégration et remise** — adapter les contrats visuels devenus obsolètes sans réduire les assertions d'accessibilité. TypeScript, ESLint, tests complets et build ; review indépendante ; documentation finale exacte.

## Critères de réussite

- Express 9, Quick 20, Détaillé 50 et règles Deep inchangés ; FR/EN conservent l'état.
- Impossible de valider 100 heures de sommeil ou huit jours d'activité hebdomadaire ; passer reste possible.
- Les consignes indispensables sont visibles sans ouvrir la justification.
- Une séquence d'accueil cohérente suit le scroll natif ; accès direct au questionnaire ; aucun média distant.
- Urgences avant synthèse ; pas d'âge de décès dans le bilan principal ; actions puis preuves détaillées.
- Marqueur uniquement si le score adulte existe ; score manquant jamais remplacé par zéro ; origine théorique visible sans ouvrir un détail.
- Impression lisible, focus lors du changement de vue, navigation mobile compacte, cibles tactiles confortables.
- Aucune nouvelle dépendance métier, collecte, persistance, télémétrie ou transmission de réponses.

## Vérification

Tests ciblés à chaque lot ; puis `npx tsc --noEmit --incremental false --pretty false`, `npm run lint`, `npm test -- --run`, `npm run build`, `git diff --check`. Les résultats et limites de validation sont consignés dans la revue de remise.
