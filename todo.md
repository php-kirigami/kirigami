# Todo

Schéma (référence) :
https://cdn.jsdelivr.net/gh/php-kirigami/kirigami@main/packages/kirigami/kirigami.schema.json


## Ouvert

- **`<extlink>`** — tag d'authoring HTML qui appelle `SCRAPER` (les `CURL::HEADERS`
  sont déjà à jour, Chrome 131 / Win 11).
- **Test réel de l'action kiribuild** — un vrai scénario d'intégration, pas juste un smoke.
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
  Reste ouvert là-bas : décider le toggle de thème (inline vs
  `import "@kirigami/canva/theme"`), réactiver `prepros.format`.
