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
- **plugin-highlight : promouvoir le warning en erreur de build ?** — reste ouvert
  après le fix de l'alias (`html`→`xml` etc., voir CLAUDE.md) : un vrai nom
  highlight.js inconnu (typo) passe toujours en warning silencieux, build vert
  quand même. `options.schema.json` ne peut pas valider ça (enum fermée
  impossible, ce sont les noms internes de highlight.js).
- **Générateur de favicon.ico / apple-touch-icon.png depuis une image de `assets/`** —
  une image source → les deux fichiers, via `runenv` pour pouvoir appeler
  Imagick (GD seul ne fait pas de multi-résolution `.ico`). Piste : une nouvelle
  méthode `IMG` (`IMG::favicon()`?) ou un `kiri run` intégré ; se brancher sur
  `image.source`/`image.dest` existants plutôt qu'un nouveau bloc de config.
- **Notre propre `php-wasm-builder`, dérivé de WordPress Playground** — pour
  mettre à jour plus facilement nos versions de PHP / extensions / libs
  (actuellement on suit le fork tel quel). Gros chantier, pas de plan détaillé
  encore — à scoper séparément (quelles extensions garder, quelle version PHP
  cible, comment on reproduit le build Docker de Playground).
- **`kiri serve` : promouvoir le warning en erreur si le port est déjà pris ?**
  — pour l'instant `createDevServer()` rejette la promesse d'écoute (l'erreur
  `EADDRINUSE` remonte telle quelle) ; un message plus clair ("essaie
  `--port`") serait plus sympa. Mineur.


## Ailleurs

- **template-demo** a son propre `todo.md` : `C:\projects\kirigami\template-demo\todo.md`.
  Toggle de thème : tranché — les deux templates font `import "@kirigami/canva/theme"`
  (plus de réimplémentation inline). Reste ouvert là-bas : réactiver `prepros.format`.



plugin-embed, pour mapper les tags <youtube> <vimeo> et d'autres avec le protocol oembed pour aller chercher le titre, l'image, les dimensions pour ensuite calculer la proportion et utilisé l'image fournis comme cover du video dont il aura un bouton play par dessus (un svg qui va utiliser la variable $accent) que je vais fournir avec le plugin. Donc quand on passe sur le play in scale 1.1 environ et on change le cursor pis toute. tk on verra rendu là - Aller voir dans le projet action-quebec.github.io, je veux le même principe avec l'observer.



Ajouter un plugin markdown {% img-asset facedepoil.jpg 800 600 cover %}