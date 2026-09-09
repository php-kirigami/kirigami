# @kirigami/sdk

Runtime partagé entre `@kirigami/kirigami` (kirigami-core) et les packages de
plugins : essentiellement, un registre de hooks en mémoire.

`@kirigami/kirigami` déclenche des hooks nommés pendant son build ; un plugin
s'y greffe via `on(hookName, fn)`. Comme les deux dépendent de la même
instance de ce module (via les workspaces npm du monorepo, ou en tant que
dépendance normale une fois publié), ils partagent le même registre en
mémoire — pas besoin que le plugin connaisse quoi que ce soit de la structure
interne de kirigami-core.

## Installation

```bash
npm install @kirigami/sdk
```

## Utilisation dans un plugin

```js
import { on, HOOKS } from '@kirigami/sdk';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pluginDir = path.dirname(fileURLToPath(import.meta.url));

on(HOOKS.SASS_BEFORE, () => path.join(pluginDir, 'styles/before.scss'));
on(HOOKS.SASS_AFTER,  () => path.join(pluginDir, 'styles/after.scss'));

on(HOOKS.SASS_FUNCTIONS, () => ({
	'my-plugin-function($value)': (args) => {
		// ...
	},
}));
```

Un listener peut renvoyer :
- une valeur unique,
- un tableau de valeurs (aplati automatiquement dans le résultat),
- `null`/`undefined` pour ne rien contribuer ce tour-ci — utile si le listener
  veut inspecter le contexte reçu (voir plus bas) et décider de ne rien faire.

Il peut aussi être `async` — `run()` attend chaque listener avant de passer au
suivant.

## Hooks disponibles

Chaque hook ci-dessous est déclenché avec un seul argument, `hookContext`,
de la forme `{ __root, task, exportPath, config }` (les mêmes valeurs que
reçoit `build()` pour la task en cours, plus la config résolue de
kirigami.yaml).

| Hook | Task | Attendu en retour |
|---|---|---|
| `HOOKS.SASS_BEFORE` | sass | chemin(s) de fichier `.scss`, compilés avant l'entry |
| `HOOKS.SASS_AFTER` | sass | chemin(s) de fichier `.scss`, compilés après l'entry |
| `HOOKS.SASS_FUNCTIONS` | sass | objet(s) `{ 'signature($arg)': (args) => SassValue }`, au même format que l'option `functions` de l'API Sass |

Pour `SASS_BEFORE`/`SASS_AFTER`, préfère un chemin absolu résolu depuis le
plugin lui-même (comme dans l'exemple ci-dessus) — un chemin relatif serait
résolu depuis le `cwd()` du projet qui utilise kirigami, pas depuis le plugin.

Pour `SASS_FUNCTIONS`, si la signature entre en collision avec une fonction
native de kirigami (`inline-file`, `img-asset`, `colors`, `font-*`), c'est la
version native qui l'emporte.

## API

### `on(hookName, fn)`

Enregistre un listener. Retourne une fonction pour le désenregistrer
(équivalent à `off(hookName, fn)`).

### `off(hookName, fn)`

Désenregistre un listener précédemment ajouté avec `on()`.

### `run(hookName, ...args)`

Exécute tous les listeners d'un hook, dans l'ordre d'enregistrement, et
aplatit leurs résultats dans un seul tableau. Utilisé en interne par
kirigami-core — un plugin n'a normalement pas besoin d'appeler `run()`
lui-même.

### `HOOKS`

Objet gelé listant les noms de hooks connus (voir tableau ci-dessus). À
préférer aux strings tapées à la main.
