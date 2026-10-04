# Refonte de la direction artistique de l'accueil : organique modernisé et récit par chapitres

Demande du propriétaire (4 octobre 2026) : « revoir la DA du site d'accueil en quelque chose de moderne avec un défilement plus intelligent et fluide ». Choix validés : organique modernisé (famille menthe, forêt et prune conservée), personnage 3D conservé et restylé, inertie Lenis au bureau seulement (molette et pavé tactile ; désactivée au toucher et en mouvement réduit), nouveaux jetons et nouvelle typographie sur tout le site. Suite de `2026-09-07-identite-organique.md` et `2026-09-07-living-atlas-home.md`.

## Constat de départ

- L'en-tête (88 px) défile avec la page ; le sélecteur de langue, en position absolue, disparaît avec lui et ne revient qu'en haut de page.
- Le récit est une scène collante de `100svh − 88px` sur laquelle défilent quatre chapitres. Le chapitre inactif disparaît d'un coup (`opacity: 0`, sans transition) ; rien n'aimante la lecture : on peut s'arrêter entre deux chapitres, texte à moitié sorti et personnage en pleine transition.
- Le défilement est natif partout : à la molette, la scène avance par crans de 100 px et la caméra GSAP rattrape par à-coups.
- Titres en Manrope, texte en DM Sans ; fond `#F1F6F3` un peu froid. Des couleurs de l'ancien thème sombre restent en dur dans `globals.css` (`#93d9ed`, `#edc69c`, `#bda5f1`, `#91dfc3`, `#29628624`) pour la scène et les étiquettes de chapitre.
- Le personnage utilise une matière givrée `#619b90` sous une lumière hémisphérique bleutée, plus froide que la page.

## Périmètre

1. Jetons de couleur et typographie de tout le site (questionnaire et résultats compris).
2. En-tête collant qui s'efface au défilement vers le bas et revient vers le haut ; sélecteur de langue synchronisé.
3. Récit par chapitres : scène plein écran, fondu enchaîné continu, aimantage directionnel, progression par chapitre.
4. Inertie Lenis au bureau, liens internes animés.
5. Restylage des sections de l'accueil : héros, scène, conversion, formats, confidentialité, note de bas de page.
6. Personnage 3D et repli SVG accordés à la palette.

Hors périmètre : textes EN/FR (inchangés), structure du questionnaire et des résultats (seuls les jetons et la police changent), nouvelles images ou vidéos, requêtes externes à l'exécution, Lenis hors de l'accueil.

## Jetons (`app/globals.css`)

| Jeton | Avant | Après | Rôle |
| --- | --- | --- | --- |
| `--abyss` | `#F1F6F3` | `#F4F5EE` | fond, papier chaud |
| `--mist` | `#173D38` | `#10302B` | texte, panneau sombre |
| `--phosphor` | `#086F66` | `#0A6B5E` | accent principal, liens, focus |
| `--current` | `#075A53` | `#08554B` | accent appuyé, survols |
| `--flare` | `#A33B47` | `#A63A4C` | alerte |
| `--muted` | `#526C65` | `#4D6159` | texte secondaire |
| `--line` / `--line-strong` | `#D4E1D9` / `#92AAA0` | `#DFE3D8` / `#A1ADA2` | filets |
| `--surface-soft` | `#E4EEE7` | `#E9EEE2` | aplats doux |
| `--accent` / `--accent-soft` | `#715178` / `#EEE7EF` | `#6A4C84` / `#EFE9F4` | prune |
| `--highlight` | `#D8E9B2` | `#D3EE8F` | vert tilleul, CTA sur fond sombre |
| `--inverse` | `#F4FBF5` | `#F6FAF2` | texte sur fond sombre |
| `--pillar-sleep` / `--pillar-nutrition` | `#715178` / `#086F66` | `#6A4C84` / `#0A6B5E` | piliers |

`--depth`, `--surface`, `--surface-strong` (`#FFFFFF`), `--pillar-cardio` (`#286C82`) et `--pillar-strength` (`#8D6328`) ne changent pas. Contrastes vérifiés : `mist` ≥ 12,0:1 sur toutes les surfaces ; `phosphor` ≥ 5,43, `current` ≥ 7,38, `muted` ≥ 5,61, `flare` ≥ 5,34, `accent` ≥ 5,97 ; `inverse`/`mist` 13,43 ; `mist`/`highlight` 11,08 ; `accent`/`accent-soft` 5,92 ; `inverse` sur `phosphor` 6,06. Impression : `--abyss: #10302B`, `--phosphor` et `--current: #08554B`.

Les couleurs en dur de la scène deviennent des jetons : halo `color-mix(--phosphor)`, scènes `--phosphor`, `--pillar-strength`, `--accent`, `--current`.

## Typographie

- Titres : Bricolage Grotesque variable, axe optique `opsz` (12–96) avec `font-optical-sizing: auto` ; l'axe resserre lui-même les grands corps, l'interlettrage reste à 0 partout. Texte et données : DM Sans (inchangé, chiffres tabulaires). Manrope est retirée ; toujours deux ressources, auto-hébergées au build par `next/font/google`, aucune requête vers Google à l'exécution.
- Accueil : titre du héros 4,5 rem / 1,08 au bureau (2,75 rem sous 560 px), titres de chapitre 2,75 rem, titres de section 3 rem ; graisse 600.

## En-tête et sélecteur de langue

- `.landing__header` devient collant (`position: sticky` ; `fixed` casserait sous la transformation GSAP de `MotionScreen`), pleine largeur, contenu aligné sur la grille de 1200 px, hauteur `--landing-header-height` (76 px, 84 px sous 560 px). Fond `abyss` translucide flouté et filet dès qu'il recouvre du contenu (`data-header-scrolled`).
- Hook `useLandingHeader(scope)` : il lit `.landing__header` et le récit séquencé dans la portée de l'accueil, puis écrit `data-header="visible|hidden"`. Visible dans les 24 premiers pixels ; masqué tant que le récit séquencé occupe l'écran (la scène et sa navigation par axes prennent le relais) ; ailleurs masqué après 8 px vers le bas, rétabli après 8 px vers le haut. Mouvement réduit, absence de `matchMedia` ou de JavaScript : toujours visible, sans transition.
- Le sélecteur de langue passe en `position: fixed` sur l'accueil et suit l'état de l'en-tête par `:has()` ; le focus clavier dans le sélecteur (`:focus-visible`) réaffiche les deux. Un clic souris ne les retient pas.

## Récit par chapitres

- Scène plein écran (`--atlas-stage-height: 100svh`) ; le personnage garde une marge basse pour rester entier sous l'en-tête en haut de page.
- Fondu enchaîné : la timeline écrit sur chaque chapitre `--scene-presence` (0 à 1, courbe `smoothstep` de la distance entre le centre du chapitre et celui de la vue, sur 55 % de sa hauteur). Le CSS en tire l'opacité et une légère dérive verticale de la carte ; la section elle-même ne bouge pas, pour que la mesure du chapitre actif reste exacte. Aucune interpolation d'opacité dans la timeline (règle existante) ; la variable est effacée au nettoyage.
- Aimantage : `snap` de ScrollTrigger avec une fonction pure `snapAtlasProgress(value, direction, points, deadZone)`. Points : 0 (héros) puis la position d'ancrage de chaque chapitre (son haut moins `scroll-margin-top`), si bien que les liens de navigation et l'aimant tombent au même endroit. Vers le bas, le chapitre suivant dès 16 px parcourus ; vers le haut, le précédent ; sous 16 px, retour au point de départ ; après le dernier chapitre vers le bas, aucun aimant (sortie libre vers la suite). `delay` 0,18 s, durée 0,3 à 0,8 s, `power2.inOut`, sans inertie supplémentaire. Inactif en mouvement réduit, scène statique ou en échec (pas de timeline).
- Départ du récit : au bureau, le héros est posé sur la scène (`position: absolute`) et l'atlas commence sous l'en-tête ; le déclencheur part donc de 0, si bien que le point 0 de l'aimant est le haut de page, en-tête visible. Ailleurs, départ `top top`.
- `scroll-margin-top` des chapitres au bureau : 15svh, ce qui centre la carte.
- Progression : rail fin et quatre repères sous la scène ; le libellé actif de la navigation par axes garde son soulignement proportionnel à `--atlas-chapter-progress`.
- Mobile : un seul panneau de récit, remonté à chaque chapitre (règles de test inchangées), avec une arrivée plus douce (0,5 s, opacité et translation).

## Inertie Lenis (`app/hooks/use-smooth-scroll.ts`)

- Activée seulement si `matchMedia` existe, si `(hover: hover) and (pointer: fine)` est vrai et si le mouvement décoratif est autorisé ; `lenis` est importé dynamiquement, donc jamais téléchargé sur mobile ni en mouvement réduit. Coupée si la préférence change ou si l'onglet est masqué.
- Options : `autoRaf: false`, `smoothWheel: true`, `syncTouch: false`, `lerp: 0.1`, `anchors: false`, `allowNestedScroll: true`. Synchronisation : `lenis.on("scroll", ScrollTrigger.update)`, horloge `gsap.ticker` (`lenis.raf(time * 1000)`), `lagSmoothing(0)` pendant la vie de l'instance puis valeur par défaut (500, 33) ; `destroy()` au démontage.
- Liens internes de l'accueil (`href="#…"`) : avec Lenis, `lenis.scrollTo(cible, { duration: 1.1 })` ; sans Lenis mais mouvement autorisé, `scrollIntoView({ behavior: "smooth" })` ; puis focus de la cible si elle est focalisable (`preventScroll`). En mouvement réduit, comportement natif intact.
- Règles CSS de Lenis reprises localement (`html.lenis` hauteur auto, `lenis-stopped` en `overflow: clip`).

## Sections

- Héros : étiquette en pastille avec point d'accent, titre Bricolage, faits en puces, CTA en pilule avec chevron CSS (sans texte généré), lien secondaire souligné, indice de défilement animé (coupé en mouvement réduit).
- Scène : halo organique teinté par le chapitre (`color-mix`), plateau elliptique qui tourne avec `--atlas-scroll`, navigation par axes en pilule segmentée.
- Conversion : panneau `mist` aux angles organiques, halo `highlight` en coin, sorties séparées par des filets, CTA tilleul.
- Formats : cartes à 24 px de rayon, survol par élévation légère (supprimée en mouvement réduit), carte « détaillée » en prune douce.
- Confidentialité et note : aplat `surface-soft`, faits en liste à filets.

## Personnage 3D et repli SVG

- Matière : teinte `#4F9A86`, nacre plus chaude ; lumières : ciel `0xf7f9ef`, sol `0x6f8a7c`, clé `0xfff3e0`, contre-jour tilleul `0xdaf0c0` ; exposition 1,05.
- Décors : literie et couette accordées au papier et à la prune, piste tilleul pâle ; disques rouge et bleu inchangés (le rouge reste plus rouge que bleu, et inversement). Effets : sommeil `--accent`, sueur `--pillar-cardio`, visage et effort `--phosphor`.
- Repli SVG : mêmes teintes ; `data-appearance="translucent"`, actions et expressions inchangées.

## Tests

- Jetons : nouvelles valeurs, seuils de contraste existants, surcharge d'impression.
- Polices : `Bricolage_Grotesque` (variable, `opsz`, sous-ensemble latin) et `DM_Sans` ; ni Manrope, ni Space Grotesk, ni Geist.
- Timeline : configuration `snap` (fonction, `delay` 0,18, `inertia: false`) ; vecteurs de `snapAtlasProgress` (directions, zone morte, sortie libre, bornes, valeurs non finies) ; `--scene-presence` écrite puis effacée au nettoyage ; toujours aucune interpolation d'opacité.
- Lenis : rien sans `matchMedia`, en mouvement réduit, au toucher ou onglet masqué ; options, synchronisation ScrollTrigger, horloge et `lagSmoothing` restaurés, `destroy` au démontage et au passage en mouvement réduit ; liens internes animés avec focus, natifs en mouvement réduit.
- En-tête : visible en haut, masqué vers le bas, rétabli vers le haut, masqué pendant le récit séquencé, visible en mouvement réduit ; écouteurs et attributs retirés au démontage.
- Ajoutés pendant la QA, chacun en échec avant la correction : `MotionScreen` relance `ScrollTrigger.refresh()` à la fin de son entrée ; la timeline fait partir le récit de 0 quand le héros est posé sur la scène.

## Protocole

Rôle exécutant, conception écrite avant le code, tests d'abord pour la logique (aimant, en-tête, Lenis, jetons, polices) ; branche `feat/landing-redesign`. Portes : `tsc`, `lint`, `vitest`, `vinext build`, `next build`, `git diff --check`. QA navigateur locale : bureau 1440 × 900 et 1280 × 720, mobile 390 × 844 et 360 × 640, EN et FR, mouvement réduit, clavier, impression, aucune requête externe. Le déploiement (push sur `main`) attend l'accord du propriétaire.

## Contrôle navigateur et corrections du 4 octobre 2026

Chrome sans interface, build de production local (`next start`). Six défauts trouvés et corrigés :

1. Bureau, haut de page : la légende de la navigation par axes sortait du cadre. La carte des axes passe en colonne flexible (titre, navigation et légende dans le flux, sans positions absolues) ; sur mobile et en mouvement réduit, elle garde la même colonne.
2. Depuis le premier chapitre, la remontée à la molette s'arrêtait à 94 px, en-tête masqué. Deux causes : ScrollTrigger mesurait pendant l'entrée de `MotionScreen` (translation de 18 px encore active), et le départ `top top` tombait à 76 px, l'atlas commençant sous l'en-tête. `MotionScreen` remesure à la fin de son entrée, et le récit part de 0 au bureau (voir « Départ du récit »). Après correction, la remontée revient à 0, en-tête visible.
3. Un clic souris sur « FR » laissait l'en-tête et le sélecteur affichés pendant la lecture (`:focus-within`). Seul `:focus-visible` les retient désormais.
4. En français, sur un portable de 1280 × 633, l'indice de défilement du héros sortait de l'écran. Une requête `(min-width: 781px) and (max-height: 660px)` resserre le héros (titre 3,25 rem, marges réduites) ; vérifié en EN et FR à 1280 × 633 et 1366 × 657.
5. Mouvement réduit : le sélecteur de langue passait sous le flou de l'en-tête (corrigé par `z-index: 30`), et le rail de progression restait plein alors que le premier repère était actif (il est masqué, faute de récit défilé). Les chapitres passent dans une colonne de 720 px centrée comme le héros, aussi en cas d'échec de la scène, et la figure fixe se place sous la navigation (`inset: 112px 0 8px`).
6. Impression : la première sortie de la conversion touchait le paragraphe précédent (marge de 20 px).

Vérifié ensuite :

- Bureau 1440 × 900 : six crans de molette amènent chaque chapitre au centre (841, 1 471, 2 101 et 2 731 px), puis la sortie reste libre ; en-tête et sélecteur masqués pendant le récit, rétablis à la remontée avec fond flouté ; sortie de scène douce vers la conversion. 1280 × 720 : héros et premier chapitre complets. 900 × 800 : onglets empilés.
- Mobile 390 × 844 et 360 × 640 : panneau de chapitre unique, ancres atteintes, aucun débordement horizontal ; héros français sur trois lignes.
- EN et FR au bureau (1440 × 900, chapitres 1 et 3) et sur mobile.
- Liens d'axes : glissé jusqu'à l'ancre, focus sur le chapitre, aucune ancre ajoutée à l'URL. En mouvement réduit, saut natif sous l'en-tête (marge de 135 px, en-tête de 76 px).
- Clavier : Maj+Tab jusqu'au sélecteur réaffiche l'en-tête et le sélecteur.
- Mouvement réduit, page entière : héros et chapitres dans la même colonne centrée, figure fixe sous la navigation, sans rail ; en-tête toujours visible.
- Échec WebGL (perte de contexte forcée) : message de repli dans la scène, chapitres centrés sous le héros, aucun débordement horizontal.
- Impression : six pages lisibles, sans scène, sans fond sombre ni sélecteur.
- axe-core (WCAG 2 A et AA) : aucune violation ; six nœuds « à vérifier » au-dessus du canevas (titre, libellés et légende des axes), calculés à la main : 6,04:1 à 13,91:1. Étiquettes de chapitre de 4,73:1 (Force) à 6,18:1 (Sommeil).
- Réseau : 16 requêtes, toutes vers `localhost`.

## Résultat et vérifications

Sous Node v26.7.0 : `vitest` passe **71 fichiers / 9 236 tests** ; `tsc --noEmit --incremental false` sort à 0 ; `lint` sans erreur, avec ses deux avertissements existants (`.playwright-mcp`, `.remember`) ; `vinext build` termine ses cinq étapes et `next build` compile ; `git diff --check` est propre. `npm audit --omit=dev` ne signale aucune vulnérabilité ; l'audit complet ne signale que l'avis braces, déjà connu et limité au développement. `lenis` 1.3.26 est la seule dépendance ajoutée (sans dépendance propre).
