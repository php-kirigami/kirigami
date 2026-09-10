# Todo

Schéma (référence) :
https://cdn.jsdelivr.net/gh/php-kirigami/kirigami@main/packages/kirigami/kirigami.schema.json


## Ouvert

- **`<extlink>`** — tag d'authoring HTML qui appelle `SCRAPER` (les `CURL::HEADERS`
  sont déjà à jour, Chrome 131 / Win 11).
- **Test réel de l'action kiribuild** — un vrai scénario d'intégration, pas juste un
  smoke. kiribuild@v2 est live et les deux `template-*` ont un `.github/workflows/page.yml`
  (kiribuild@v2 → commit-back → deploy Pages) ; reste à vérifier bout-en-bout qu'un
  site se déploie vraiment et que le contenu est bon.
- **Floor `@kirigami/kirigami` des templates** — `package.json` pointe `^1.2.0`. La CI
  (`npm install`) prend donc `latest` sur npm ; tant que kiri 1.3.3 / php-prepros 1.6.2
  ne sont pas release, le commit-back du workflow re-bake `###TIMESTAMP###` dans les
  pages `src/**`. Après release, bumper le floor pour garantir le fix.
- **Commit-back du workflow encore bruyant** — `git add -A` recommit aussi les dérivés
  `src/images/` (voulu) et un `package-lock.json` régénéré par `npm install`. Voir si
  kiribuild devrait faire `npm ci` quand un lockfile existe.
- **`@highlight false`** (tag PHPDOC) pour sauter une page dans `@kirigami/plugin-highlight`.
- **`copyButton` sans task esbuild** — dans plugin-highlight, si le projet n'a pas de task
  esbuild le bouton ne marche pas (warn seulement). Voir si un plugin devrait pouvoir
  déclarer sa propre task / bundle JS auto.
- **`kirigami.type` `"task"` / `"command"`** — packages qui ajoutent un type de task ou une
  sous-commande `kiri`, et leur loading. (`"plugin"` est déjà en place.)
- **`prepros:before-render`** — hook JS avant rendu, à évaluer (le `prepros:html`
  post-render existe déjà).
- **esbuild importer** — lui donner la même résolution Node que l'importer Sass si un jour
  c'est nécessaire (pour l'instant il bundle des chemins absolus fournis par les hooks, donc OK).
- **Theme toggle sans build (Layer 2)** — `injectHead()` injecte déjà le guard FOUC en
  premier enfant de `<head>`. L'étendre : quand le doc contient `data-theme-toggle`
  (probe `str_contains`), injecter aussi le runtime complet (~15 lignes) avant `</body>`,
  comme le script de dé-indent. Gate `prepros.head.theme` (défaut on, `false` pour qui
  importe `@kirigami/canva/theme` lui-même). Résultat : un `<button data-theme-toggle>`
  dans le layout suffit, zéro JS/import/task esbuild. `canva/theme.js` reste la voie
  « je veux les exports / appeler `setTheme()` ». Coût : le contrat (clé `kirigami-theme`,
  event `canva:themechange`, attr `data-theme`) vit alors dans canva **et** dans une string
  PHP de php-prepros — garder le snippet injecté minimal, canva/theme.js fait foi.
- **Base markdown → `@kirigami/canva/prose`** — fait dans canva 2.4.0 (partial `prose.scss` :
  mixin `prose($measure, $flow)` + wrapper `.prose`, `$emit-class: false` pour le mixin seul).
  Couvre titres/listes/tables/quotes/code/media/`dl`/`<details>` + le GFM que `MD` émet
  (`.task-list`, `.markdown-alert*`, `.footnotes`). Reste : après release de canva 2.4.0,
  faire pointer `../template-*/_main.scss` dessus (`@use "@kirigami/canva/prose"`) et
  retirer le bloc `.prose` copié-collé. `styles/main.scss` reste un stub.


## DX — `HTML::format()` écrase la casse du SVG/MathML inline (pas commité)

`packages/php-prepros/src/libraries/html.class.php` fait un `strtolower()`
inconditionnel sur les noms d'éléments et d'attributs, sans conscience du
namespace. Lexbor livre pourtant `viewBox` correctement dans l'arbre DOM
(foreign-content adjustment au parsing) — c'est le formatter qui le réécrit
`viewbox`. Idem `preserveAspectRatio`, et les éléments `linearGradient` /
`radialGradient` / `clipPath` / `textPath` / `foreignObject` (pas utilisés
dans template-demo, qui n'a que `viewBox` sur ses 8 icônes de toggle).

- Pas un bug de rendu : dans un document HTML le parseur du navigateur
  re-mappe `viewbox` → `viewBox` via la table d'ajustement. Ça ne casserait
  qu'en XML/XHTML ou si le SVG était extrait seul. Rien à faire côté
  template-demo.
- Emplacements : `:76` (`renderElement`, tag) et `:166` (`renderInline`, tag —
  c'est celui qui tire pour une icône dans un `<button>`/`<a>`) lowercasent le
  nom d'élément ; `:246` (`renderAttrs`) lowercase le nom d'attribut ; `:206`
  (`hasOnlyInlineChildren`) ne fait qu'une comparaison (pas de sortie, mais un
  `<svg>` inline force quand même le parent en bloc).
- Fix : ne lowercaser que les noms en namespace HTML (`$node->namespaceURI`
  null ou XHTML). Pour les nœuds SVG/MathML, émettre `nodeName` / `attr->name`
  tels quels (Lexbor a déjà fait l'ajustement de casse). Garder une copie
  minuscule séparée pour les lookups `VOID` / `RAW` / `VERBATIM` /
  `BOOLEAN_ATTRS` / `INLINE`.


## Ailleurs

- **template-demo** a son propre `todo.md` : `C:\projects\kirigami\template-demo\todo.md`.
  Toggle de thème : tranché — les deux templates font `import "@kirigami/canva/theme"`
  (plus de réimplémentation inline). Reste ouvert là-bas : réactiver `prepros.format`.
