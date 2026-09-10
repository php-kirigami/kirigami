# Todo


https://cdn.jsdelivr.net/gh/php-kirigami/kirigami@main/packages/kirigami/kirigami.schema.json




<!-- FAIT: "kirigami.optionsSchema" dans le package.json du plugin = path vers un JSON Schema; le loader (bin/libs/plugins.js) valide entry.options (de kirigami.yaml) contre, via Ajv, avant de charger le plugin. Ex: packages/plugin-highlight/options.schema.json -->
<!-- FAIT (reconnu par VSCode): kirigami.schema.json > properties.plugins.items.allOf a un bloc if/then par plugin first-party — if name const "@kirigami/plugin-highlight" then options $ref "../plugin-highlight/options.schema.json" (résolu en sibling monorepo / jsdelivr). config.js inline ces $ref depuis le disque au build (skip si plugin pas installé). Ajouter un bloc allOf quand on ajoute un plugin officiel. 3rd-party = options free-form + validation build-time seulement -->


<!-- FAIT (via package.json): "kirigami.minVersion" dans le package.json du plugin, comparé à la version de kiri par le loader (bin/libs/plugins.js). Pas dans kirigami.yaml — le plugin déclare son propre minimum -->

<!-- FAIT: par default, ajouter la font css Jetbrains — @kirigami/plugin-highlight embarque JetBrains Mono (embedFont: true par défaut, @font-face base64 dans assets/_font.scss) -->


finir create avec check de git et l'interface interactive

<!-- change cwd on render, juste dans le prepros.php OU le faire dans la fonction render de php -->
<!-- FAIT: FS::getChildren() / fs_get_children(), backtrace + tri @position -->



<!-- FAIT: mettre à jour le user-agent pis les headers (CURL::HEADERS = Chrome 131 / Win 11) -->
block html extlink qui call scraper
<!-- FAIT: hooks boot + pre_before/post_before/pre_after/post_after dans prepros -->


<!-- FAIT: Plugins settés dans kirigami.yaml — loader bin/libs/plugins.js, lancé en tête de build/export/watch. Résout depuis le node_modules du projet, importe et appelle default(options, {config, name}). Le plugin s'enregistre via @kirigami/sdk on(). Hooks dispo: sass:*, esbuild:*, prepros:html -->
- faire un vrai test pour l'action kiribuild
<!-- FAIT: pour plugin, vérifier le package.json — le loader lit le bloc "kirigami" (minVersion + options par défaut) du package.json du plugin -->

- hook prepros:html: équivalent côté JS du post_render PHP, pour les plugins (fait). Voir si besoin d'un prepros:before-render aussi
- @highlight false (tag PHPDOC) pour sauter une page dans plugin-highlight
<!-- FAIT: bouton "Copy" au hover sur les blocs de code (comme template-demo) — option copyButton (défaut true) dans plugin-highlight. Script assets/copy.js injecté via esbuild:after, styles via sass:after. Warn si pas de task esbuild. copy.js skip si un <button> est déjà à côté du <pre> (anti-empilement) -->
- template-demo: le bouton copier fait main dans kirigami.core.js est déjà commenté (bien). Reste à retirer le SCSS .copy-btn/.code-block qui sert plus.
- template-demo: remplacer le handler de thème fait main (kirigami.core.js "Theme toggle" + clé localStorage "theme") par `import "@kirigami/canva/theme"` + `data-theme-toggle` sur le bouton `.theme-toggle`. canva 2.1.0 le câble tout seul (clé "kirigami-theme", 3 états). Vérifier que conf.scss du demo est en $theme: class|both.
<!-- FAIT: logique de switch de thème JS extraite dans canva — theme.js avait déjà l'API (toggleTheme/setTheme/getTheme/resolvedTheme/initTheme), 2.1.0 ajoute le câblage déclaratif [data-theme-toggle] + bindToggles() + event canva:themechange + re-sync sur changement OS -->
- plugin-highlight copyButton: si le projet n'a pas de task esbuild, le bouton ne marche pas (warn seulement). Voir si un plugin devrait pouvoir déclarer sa propre task/bundle JS auto
<!-- FAIT (dx-issue #15 / #18): l'importer Sass createPkgImporter (@use "@scope/pkg/x") résout maintenant via Node (createRequire depuis cwd ET l'emplacement de kiri), plus juste ./node_modules + npm root -g. npm link / kiri global / pnpm marchent. theme: none + palette custom atteignable sans lien global -->
- pareil pour l'esbuild importer si un jour besoin (là il bundle des chemins absolus fournis par les hooks, donc OK)
<!-- FAIT: tag <highlight lang="js">...</highlight> — hook SDK prepros:php (le plugin retourne un abs .php, php-prepros le monte sous /plugins/ + include_once via $config->phpIncludes dans PREPROS::loadConfig, render(file, phpIncludes[]) threadé par la task prepros de kiri). php/highlight.php fait PREPROS::registerTag('highlight') qui émet <pre><code class="language-x">, le pass prepros:html existant highlight. Option tag (défaut true). php-prepros 1.5.0 -->
- plugin-highlight: publier sur npm (bump 0.1.0 -> ...) + réactiver le bloc plugins dans template-demo (le commentaire là-bas montre l'ancienne API options: {style, color})
- package.json kirigami.type: "plugin" est en place. À venir: type "task" et "command" (packages qui ajoutent un type de task ou une sous-commande kiri) + leur loading

<!-- FAIT: LD class (php-prepros 1.3.0) — génère les schemas json+ld. Auto-inject <script application/ld+json> dans le <head>, OPT-IN: seulement si bloc jsonld: présent à la RACINE de kirigami.yaml (frère de kirigami:, pas dessous — jsonld: {} suffit), sinon rien. Clés libres du bloc kirigami: lues en plus. BreadcrumbList auto (trail des _index.php parents, pas besoin de @breadcrumb). Tags page: @ld false, @ld_type, @ld_title, @ld_description, @ld_image, @ld_published, @ld_modified, @ld_breadcrumb false. Opt-out global: jsonld: false / {auto: false} -->
<!-- système pour créer des schemas json+ld -->


<!-- FAIT: FS::getBreadcrumb() / fs_get_breadcrumb(), backtrace des parents, opt-in @breadcrumb true|1, coupe au root ou au premier _index.php sans @breadcrumb -->
<!-- @breadcrumb true|1 signifi qu'il sera calculé dans le breadcrumb -->