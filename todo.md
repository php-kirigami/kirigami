# Todo

Schéma (référence) :
https://cdn.jsdelivr.net/gh/php-kirigami/kirigami@main/packages/kirigami/kirigami.schema.json


## Ouvert

- **Bug confirmé — les alertes GFM (`> [!NOTE]` etc.) n'appliquent aucun markdown
  inline** — trouvé en construisant `php-kirigami.github.io` (phase 0 du plan du
  site). `packages/php-prepros/src/libraries/md.class.php:803-822`
  (`STEP 3e: GFM ALERTS AND BLOCKQUOTES`) fait
  `htmlspecialchars(trim($content), ENT_QUOTES, 'UTF-8')` sur le contenu de
  l'alerte (`:810`) puis le colle tel quel dans `<p>{$content}</p>` (`:812-814`) —
  contrairement au blockquote standard juste en dessous (`:827-834`) qui rappelle
  `self::toHtml()` récursivement sur son contenu (`:830`). Résultat : `**gras**`,
  `` `code` `` et `[lien](url)` à l'intérieur d'un `> [!NOTE]` ressortent tels
  quels (crochets/astérisques littéraux), même sur une seule ligne — pas juste un
  problème de retour à la ligne. Repro isolé (4 lignes, une alerte contre un
  blockquote normal) confirme : blockquote → lien converti ; alerte → lien
  littéral. Fix : remplacer la ligne `810` par un appel à `self::toHtml(trim($content))`
  comme `:830`, garder `htmlspecialchars()` seulement sur `$label` (déjà fait,
  `:807`). Contournement côté site : éviter markdown inline dans les `[!NOTE]`
  en attendant.
- **`<extlink>`** — tag d'authoring HTML qui appelle `SCRAPER` (les `CURL::HEADERS`
  sont déjà à jour, Chrome 131 / Win 11).
- **Test réel de l'action kiribuild** — un vrai scénario d'intégration, pas juste un
  smoke. kiribuild@v2 est live et les deux `template-*` ont un `.github/workflows/page.yml`
  (kiribuild@v2 → commit-back → deploy Pages) ; reste à vérifier bout-en-bout qu'un
  site se déploie vraiment et que le contenu est bon.
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
- **`@kirigami/canva` `styles/main.scss`** — encore un stub. `styles/prose` couvre le
  markdown ; `main.scss` reste réservé aux styles de composants partagés (WIP dans le
  README canva).
- **`kiri install <plugin>`** — commande calquée sur `create`, pour les plugins
  (`plugin-*`) : `npm install` le package, puis explique à l'utilisateur quoi ajouter
  dans `kirigami.yaml` (entrée `plugins:` + options) à partir du `kirigami.optionsSchema`
  déclaré dans le `package.json` du plugin. Si déjà installé : détecte une nouvelle
  version et l'installe.
- **plugin-highlight : `languages: [html]` échoue silencieusement (warn seulement)** —
  trouvé en construisant `php-kirigami.github.io` (phase 0 du plan du site, premier
  vrai test d'intégration). highlight.js nomme son module `xml.js` (couvre
  html/svg/xml via ses alias internes) ; `languages: ["html"]` tente
  `import('highlight.js/lib/languages/html')`, qui n'existe pas →
  `⚠ [plugin-highlight] unknown language: "html"` dans les logs de build, aucune
  coloration pour ce langage, mais le build réussit quand même (piège silencieux).
  "html" est pourtant le mot naturel qu'un auteur de `kirigami.yaml` va taper.
  Contournement côté site : utiliser `xml` dans la liste. Fix suggéré dans
  `packages/plugin-highlight/src/highlight.js` (`ensureLanguage`) : une petite table
  d'alias avant l'`import()` (`html`→`xml`, `js`→`javascript`, `ts`→`typescript`,
  `md`→`markdown`, `yml`→`yaml`, `sh`→`bash`, `py`→`python`) — et/ou promouvoir le
  warning en erreur de build (`options.schema.json` ne peut pas le valider, c'est
  un nom highlight.js, pas une enum fermée).


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









une fonctionnalité pour créer un favicon.ico et le apple-machin-truc.png à partir d'une image dans asset. Utiliser runenv pour pouvoir générer le ico avec Imagick