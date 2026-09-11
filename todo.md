# Todo

Schéma (référence) :
https://cdn.jsdelivr.net/gh/php-kirigami/kirigami@main/packages/kirigami/kirigami.schema.json


## Ouvert

- **Système de fichiers de langue** — un mécanisme pour externaliser les
  chaînes de texte (façon i18n) plutôt que codées en dur dans les pages PHP.
  Première étape vers le multilingue (à explorer plus tard : routing/URLs
  par langue, `hreflang`, structure de projet).
- **`injectHead()` : le check "fichier déjà référencé" est trop naïf** —
  `!str_contains($contents, $out)` (`prepros.class.php`) cherche le nom du
  fichier compilé (`kirigami.core.min.css`, etc.) n'importe où dans le HTML
  rendu, pas juste dans un vrai `<link>`/`<script>`. Une page qui *mentionne*
  ce nom en prose ou dans un bloc de code (ex. `docs/cli/` documentant la
  sortie réelle de `kiri build`) se fait donc sauter l'injection du CSS/JS
  réel — trouvé en vrai sur ce site même. À resserrer (regex ciblant une
  vraie balise) plutôt que le simple `str_contains`.
- **Regrouper `meta:` et `jsonld:`** — actuellement deux blocs top-level
  distincts dans `kirigami.yaml` (siblings de `kirigami:`), à évaluer pour
  les fusionner (un seul bloc, ou `jsonld` en sous-clé de `meta`) — impact
  sur `@kirigami/php-prepros` (`META`/`LD`) et `kirigami.schema.json`.
- **`@kirigami/plugin-extlink` : attribut `class=""` sur `<extlink>`** —
  permettre de passer une classe custom sur la carte générée, pour la
  styliser plus facilement au cas par cas (en plus des `title`/`description`/
  `image`/`label` déjà supportés).
- **`@kirigami/plugin-highlight` : option pour les numéros de ligne** —
  actuellement pas de moyen d'afficher le # des lignes sur un bloc
  `<pre><code>` surligné. Nouvelle option (ex. `lineNumbers: true`), gérée
  dans `highlightHtml()` (`src/highlight.js`) + le thème SCSS
  (`assets/_highlight.scss`).
- **Générer `humans.txt` depuis `kirigami.yaml`** — quand les infos dev
  (`author`/`email`/etc. du bloc `kirigami:`) sont présentes, générer
  automatiquement un `humans.txt` (format humanstxt.org) au même moment que
  `sitemap.xml`/`robots.txt` (même mécanisme/étape), dans le même esprit que
  `fillBanner()` qui remplit déjà `###AUTHOR###`/`###EMAIL###` depuis ce bloc.
- **Commande `kiri deploy`, avec système de plugin (FTP, Git, whatever)** —
  une commande qui prend le `dist/` exporté et le déploie, le mécanisme de
  déploiement lui-même étant un plugin (FTP, push Git vers une branche,
  autre). S'articule avec `kiribuild` (déjà GitHub Pages via Actions) sans
  le remplacer — pour les cas hors GitHub Pages.
- **Fichier local (gitignored) pour des variables d'environnement qui
  imitent celles de GitHub Actions** — pour tester localement dans des
  conditions proches de la CI (mêmes noms de variables env) sans dépendre
  d'un vrai run GitHub.
- **`template-react`** — un nouveau template officiel avec un vrai pipeline
  JSX/TSX intégré (esbuild le supporte déjà nativement — reste à scoper :
  build-time only (SSR-ish, rendu en HTML statique comme le reste de
  Kirigami) vs hydration client, et comment ça s'articule avec les pages
  PHP existantes).
- **`kirigami.type` `"task"` / `"command"`** — packages qui ajoutent un type de task ou une
  sous-commande `kiri`, et leur loading. (`"plugin"` est déjà en place.) Le bug
  réel de `copyButton` sans task esbuild est fixé (voir CLAUDE.md) — ce qui
  reste ouvert ici, c'est l'idée plus large : un plugin qui pourrait déclarer
  sa propre task / bundler son JS lui-même, sans dépendre d'une task esbuild
  du projet.
- **`prepros:before-render`** — hook JS avant rendu, à évaluer (le `prepros:html`
  post-render existe déjà).
- **Action/script officiel Google Docs → Markdown** — un webservice qui prend un
  Google Doc et le convertit en `.md` (pour alimenter un `_data/` ou une page
  Kirigami), packagé comme une action/script officiel.
- **Action/script officiel Excel → JSON** — même idée que Google Docs →
  Markdown ci-dessus, mais pour un fichier Excel/`.xlsx` vers `.json` (pour
  alimenter un `_data/`).
- **Un pont pour faire des requêtes DB, façon Navicat (HTTP tunnel)** —
  idée inspirée du mécanisme de tunnel HTTP de Navicat (pas de code
  emprunté, juste le concept) : un système/script Kirigami qui permet de
  requêter une base de données à travers un pont HTTP, pour alimenter
  un `_data/` ou une page à partir de vraies données live plutôt que d'un
  export statique.
- **Une classe pour aller chercher des posts (et autres) via le REST API de
  WordPress** — même esprit que `SCRAPER` : une classe PHP dédiée pour
  requêter un site WordPress (`/wp-json/wp/v2/posts`, etc.) et alimenter
  une page/`_data/` Kirigami avec du vrai contenu WordPress.
- **Rendre `kirigami.schema.json` officiel sur SchemaStore** — soumettre le
  schéma au dépôt officiel (schemastore.org / `SchemaStore/schemastore`) pour
  que l'autocomplétion marche sans avoir à écrire le commentaire
  `# yaml-language-server: $schema=...` dans chaque `kirigami.yaml`.
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


## Ailleurs

- **template-demo** a son propre `todo.md` : `C:\projects\kirigami\template-demo\todo.md`.
  Toggle de thème : tranché — les deux templates font `import "@kirigami/canva/theme"`
  (plus de réimplémentation inline). Reste ouvert là-bas : réactiver `prepros.format`.