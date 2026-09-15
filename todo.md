# Todo

Schéma (référence) :
https://cdn.jsdelivr.net/gh/php-kirigami/kirigami@main/packages/kirigami/kirigami.schema.json


## Ouvert

- **Centraliser `$font-mono` dans `canva/conf.scss`** — le même stack
  monospace est actuellement dupliqué en dur dans `canva/main.scss`,
  `canva/prose.scss` et `plugin-highlight/assets/_highlight.scss` ; en faire
  un vrai token (`$font-mono` / `--font-mono`) réutilisé partout.
- **`.d.ts` pour `canva/dist/scripts/*.js`** — VS Code n'arrive pas à
  résoudre les imports `@kirigami/canva/<script>` (ex. `helpers`), faute de
  déclarations de types ; à générer dans `canva/build.js`. `./scripts/*` a
  déjà été ajouté à `package.json#exports` comme premier pas.
- **`plugin-highlight/src/highlight.js` : évaluer l'observer de canva** —
  voir si le mécanisme actuel de repérage des blocs `<pre><code>` peut être
  remplacé par `@kirigami/canva`'s `observer` plutôt que sa logique propre.
- **`canva/utils.scss` : revoir l'utilité de tout le fichier** — passer en
  revue le contenu pour voir ce qui sert encore réellement.
- **Architecture "API core + interfaces" (plan de match ChatGPT) : Phase 1 +
  Phase 2 faites** — `@kirigami/kirigami` est maintenant le moteur pur
  (`Project.load()`/`.reload()`/`.validate()`/`.build()`/`.serve()`/`.watch()`/
  `.export()`/`.run()`, `packages/kirigami/index.js`), et le CLI a été extrait
  dans un nouveau package **`@kirigami/cli`** (`packages/cli/`, commande `kiri`
  inchangée — pas de renommage) dont `build`/`serve`/`watch`/`export`/`run`
  sont maintenant de purs wrappers autour de `Project`. Testé en vrai (pas
  juste des smoke tests) :
  build/export/watch/serve/run/phpinfo/cache/install/create --help, contre
  `template-default` ET `template-demo` (3 vrais plugins), via la vraie
  résolution de package npm (`npm install` à la racine, pas des chemins
  relatifs) — pas de régression trouvée après plusieurs itérations de bugs
  réels corrigés en route (voir historique du commit). Les deux repos siblings
  remis intacts après coup.
  - **Registre de commandes pour les plugins** (en réponse directe à la
    demande : les commandes doivent être disponibles via l'API puisque des
    plugins pourront en installer) — `@kirigami/sdk` gagne
    `registerCommand()`/`getCommand()`/`listCommands()`, parallèle à `on()`
    pour les hooks. `plugins.js` accepte maintenant `kirigami.type: "command"`
    en plus de `"plugin"` dans `plugins:` (seul `"task"` reste rejeté). Le
    dispatcher de `@kirigami/cli` (`kiri.js`) essaie d'abord un fichier
    `bin/cmd/<nom>.js` intégré, puis — si absent — charge le projet (ce qui
    fait tourner `register()` de chaque plugin) et cherche dans le registre
    sdk ; une commande trouvée s'exécute normalement, une vraiment inconnue
    retombe sur "Unknown command" comme avant. **Vérifié end-to-end avec un
    vrai faux plugin** (`kirigami-plugin-hello`, `kirigami.type: "command"`,
    appelle `registerCommand("hello", …)`) dans un projet scratch : `kiri
    hello` exécute bien la commande du plugin, `kiri unknowncommand` échoue
    toujours correctement. Piège de test rencontré en route (déjà documenté
    dans CLAUDE.md pour sdk) : un `ln -s` git-bash sur Windows sans privilège
    a silencieusement copié le dossier `@kirigami/sdk` au lieu de le lier,
    donnant un registre sdk dédoublé/déconnecté — corrigé avec une vraie
    jonction Windows (`New-Item -ItemType Junction`).
  - **`Project.export()` ajouté** (même session, après le reste de la
    phase 2) — même boucle de tâches que `build()`, forcée (`force: true`
    partout, donc les tâches build-only comme `dist` tournent aussi),
    écrivant dans `export:path` (défaut `"dist"`, résolu contre
    `process.cwd()` — pas `config.root` — même ancre que `kirigami.yaml`
    lui-même). Ordre des tâches préservé exactement (prepros → dist →
    tâches du projet) ; triggers `before-export` → `before-build` avant,
    `after-export` après, avec arrêt au premier script/tâche en échec (même
    forme de retour anticipé que `build()`). `packages/cli/bin/cmd/export.js`
    est maintenant un pur wrapper (même patron que `build.js`) — plus
    d'import direct de `@kirigami/kirigami/internal/*`. **Vérifié en vrai**
    contre une copie scratch de `template-default` (avec son vrai
    `node_modules`, pas de chemins relatifs) : `kiri export` produit les 8
    mêmes fichiers dans `dist/` qu'avant (prepros/dist/sass/esbuild tous
    verts, dans le bon ordre), banner stampé correctement,
    `kiri export --help` inchangé. Le chemin d'échec des triggers
    (`before-export`/`before-build` qui stoppe l'export) réutilise le
    `runTrigger()` déjà testé pour `build()` — pas re-testé isolément ici.
  - **`Project.run()` ajouté** (même session) — wrappe `runscript()`
    directement (charge le projet si pas déjà fait, fail-fast sur un
    `kirigami.yaml` invalide, comme avant). `packages/cli/bin/cmd/run.js`
    est maintenant un pur wrapper. **Vérifié en vrai** contre la même copie
    scratch de `template-default` : `kiri run hello world 42` (script réel
    dans `scripts/hello.php`) reçoit le bon `$argv`, sort en succès ; `kiri
    run doesnotexist` échoue proprement avec le même message qu'avant,
    exit code 1 préservé.
  - `create`/`install`/`cache`/`phpinfo` **délibérément pas migrés** — ce ne
    sont pas de bons candidats pour une méthode `Project` : `create` n'a pas
    encore de projet chargé (il en crée un), `install` shell out vers `npm`
    avant même que les plugins chargent, et `cache`/`phpinfo` ne touchent pas
    du tout `kirigami.yaml` (housekeeping fichiers / introspection du
    runtime PHP-WASM, sans notion de projet). `test.js` est du code de debug
    mort (pas de HELP, tout commenté) — pas une vraie commande, ignoré.
    - Les commandes intégrées (build/export/watch/…) elles-mêmes ne passent
      **pas** par le nouveau registre `registerCommand()` — seul un plugin
      externe l'utilise pour l'instant. À évaluer : est-ce qu'on veut untifier
      (tout — y compris les built-ins — passe par le registre) ou garder les
      deux mécanismes séparés (built-ins = méthodes `Project`, extensions =
      registre) ?
    - Chargement limité à un seul projet par process (`process.cwd()` figé
      dans `config.js`/`plugins.js`/`runscript.js`) — charger un projet à un
      chemin arbitraire, différent du cwd, n'est pas supporté.
    - Le registre de hooks/commandes `@kirigami/sdk` est process-global (déjà
      documenté dans CLAUDE.md) : `Project.reload()` reset donc les hooks de
      *tous* les projets chargés dans le process, pas juste celui qu'on
      reload — sans conséquence tant qu'un seul projet est chargé à la fois,
      mais une vraie limite si l'extension VS Code doit un jour gérer
      plusieurs workspaces Kirigami ouverts en même temps.
    - Un plugin/task module peut toujours écrire directement dans la console
      de l'hôte (`c`/`log` restés dans `@kirigami/kirigami/bin/utils.js` pour
      `tasks/sass.js`/`esbuild.js`/`prepros.js`) même quand `Project.build()`
      est appelé par un embedder programmatique — pas nouveau, pas réglé ici.
    - `@kirigami/kirigami`'s README (689 lignes) décrit encore le package
      comme "the kiri CLI" — plus vrai depuis l'extraction de `@kirigami/cli`.
      Pas retouché cette session (c'est le genre de mise à jour prévue à
      l'étape "Update ALL README.md" du nouveau workflow, pas pendant le
      codage). `@kirigami/cli` a un README neuf et correct.
    - Aucun des deux packages (`@kirigami/kirigami` 2.x sans `bin`,
      `@kirigami/cli` 0.1.0 nouveau) n'est publié sur npm — ni les
      `../template-*/`/le site ne pointent encore vers `@kirigami/cli`. Pas
      touché cette session (prématuré avant publication réelle).

- **`FS::phpFileInfo()` en cascade** — permettre à une page d'hériter des
  tags PHPDOC d'un `_index.php` ancêtre (au lieu de ne lire que le fichier
  lui-même), pour définir une valeur une fois au niveau d'une section plutôt
  que de la répéter sur chaque page enfant.
- **Support Composer pour PHP** — permettre d'utiliser des dépendances PHP
  via Composer (vendor/autoload.php) dans un projet Kirigami, en plus du
  système de classes/plugins JS actuel — à scoper (mount du dossier vendor/
  dans le runtime WASM, compatibilité des packages avec l'environnement
  sandboxé, etc.).
- **UI Electron + extension VS Code** — une interface graphique (Electron)
  et/ou une extension VS Code pour piloter `kiri` (build/export/serve,
  gestion de plugins, édition de `kirigami.yaml`) sans passer par le
  terminal.
- **Intégration automatique de Google Analytics (gtag)** — une option de
  config dans le bloc `seo:` unifié qui injecte le script gtag.js
  automatiquement quand un ID de mesure est fourni.
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