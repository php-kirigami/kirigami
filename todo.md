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
- **`@kirigami/canva` `styles/main.scss`** — encore un stub. `styles/prose` couvre le
  markdown ; `main.scss` reste réservé aux styles de composants partagés (WIP dans le
  README canva).
- **`kiri install <plugin>`** — commande calquée sur `create`, pour les plugins
  (`plugin-*`) : `npm install` le package, puis explique à l'utilisateur quoi ajouter
  dans `kirigami.yaml` (entrée `plugins:` + options) à partir du `kirigami.optionsSchema`
  déclaré dans le `package.json` du plugin. Si déjà installé : détecte une nouvelle
  version et l'installe.
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
- **Désactiver `short_open_tag` dans le php.ini de prepros** — objectif : rendre
  un `<?` bare inerte dans un fichier `.php` de site (protège contre un texte
  d'exemple/documentation qui commence accidentellement par `<?`). ⚠️ Ne couvre
  qu'une partie du risque : `short_open_tag` ne gouverne que le tag court nu
  `<?` — `<?=` (short echo) est **toujours actif** depuis PHP 5.4, quel que
  soit ce réglage, et `<?php` n'est de toute façon jamais affecté. Trouvé
  concrètement en écrivant le tutoriel du site : un `<?= img_asset(...) ?>`
  tapé comme texte d'exemple s'est exécuté pour de vrai (`img_asset(...)` est
  du first-class-callable PHP 8.1, d'où un fatal "Closure to string"). Si
  l'objectif est vraiment de neutraliser les tags PHP dans du contenu
  d'exemple, il faudrait un mécanisme différent (un tag `<phpblock>` d'échappement,
  ou documenter la règle plutôt que la forcer par l'ini).
- **Mode `kiri serve` avec hot reload** — `kiri watch` ne fait que régénérer
  les fichiers sur disque, aucun serveur HTTP, aucun refresh navigateur. Un
  vrai mode dev voudrait : un petit serveur statique local + un reload
  (WebSocket ou SSE) au lieu de rouvrir l'onglet à la main. À voir si ça
  reste "lite" (pas de dépendance lourde style browser-sync) — un serveur
  `node:http` + un tout petit script client suffirait probablement.


## Ailleurs

- **template-demo** a son propre `todo.md` : `C:\projects\kirigami\template-demo\todo.md`.
  Toggle de thème : tranché — les deux templates font `import "@kirigami/canva/theme"`
  (plus de réimplémentation inline). Reste ouvert là-bas : réactiver `prepros.format`.