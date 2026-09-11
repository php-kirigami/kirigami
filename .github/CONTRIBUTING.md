# Contributing to Kirigami

Thanks for taking the time to contribute. Kirigami is an npm workspaces
monorepo maintained by a single person (Maxime Larrivée-Roy) as a side
project, so response times can vary — but issues and PRs are genuinely
welcome.

This file covers the [`php-kirigami/kirigami`](https://github.com/php-kirigami/kirigami)
monorepo. If your change belongs elsewhere, start there instead:

| Where the change belongs | Repo |
|---|---|
| The `kiri` CLI, the PHP → HTML compiler, a PHP class, the PHP-WASM runtime, `canva`, `sdk`, `struct-walker`, or an official plugin | this repo (`kirigami`) |
| The reusable CI action | [`php-kirigami/kiribuild`](https://github.com/php-kirigami/kiribuild) |
| The `default` or `demo` starter templates (what `kiri create` clones) | [`php-kirigami/template-default`](https://github.com/php-kirigami/template-default) / [`php-kirigami/template-demo`](https://github.com/php-kirigami/template-demo) |
| The project website | [`php-kirigami/php-kirigami.github.io`](https://github.com/php-kirigami/php-kirigami.github.io) |
| A third-party plugin | its own repo — see [Writing a plugin](#writing-a-plugin) below, nothing to change here |

---

## Development setup

Requirements: **Node.js `>= 24.0.0`**, **npm `>= 10.2.3`**.

```bash
git clone https://github.com/php-kirigami/kirigami
cd kirigami
npm install    # npm workspaces — one install covers every package
```

Each package under `packages/*` has its own `build` script; run it from the
package directory (or via `npm run build -w @kirigami/<name>`) after making a
change to see it compiled. There is no test suite to run today — verify a
change by building the affected package(s) and, where relevant, running it
against `../template-default/` or `../template-demo/` (siblings of this repo)
with `npm link` or a local `file:` dependency.

> The maintainer develops on Windows (PowerShell). If you add a script, mind
> path separators — normalize `path.sep` to `/` where the existing code does.

---

## Conventions

- **ESM only.** Every package is `"type": "module"`. Use `import` / `export`,
  never CommonJS.
- **English in code and docs.** Comments, README prose, and user-facing CLI
  strings are English. (Commit messages and `todo.md` are written in French by
  the maintainer — that's a project quirk, not a rule for contributors; write
  your own commits and PR description in whichever of English or French you're
  comfortable with.)
- **`engines.node: ">=24.0.0"`** on every `packages/*/package.json`, and on
  every README's Node badge / "Requirements" line you touch.
- **Stay lite — minimize dependencies, no native deps.** Before reaching for a
  library, check whether a `node:` builtin or ~30 lines of code covers it.
  Examples already in the codebase: the cache is `node:sqlite` (not
  better-sqlite3), the PHP JSON-Schema validator is pure PHP (not ajv),
  `kiri create` extracts tarballs with a hand-rolled tar parser + `node:zlib`
  instead of a zip library, and image resize/encode goes through the WASM
  `IMG` class instead of `sharp`. A PR that adds a dependency should explain
  why the built-in/hand-rolled option doesn't work.
- **Internal `@kirigami/*` dependencies are pinned to exact versions**
  (no `^`/`~`). If your change bumps one package's version, update every
  other package's `package.json` that depends on it to match, then
  `npm install` to refresh the lockfile.

---

## Repository structure

```
packages/
├── kirigami/          # the kiri CLI
├── php-prepros/       # PHP → HTML compiler + PHP class library
├── php-wasm/          # PHP 8.5 WebAssembly build (GPL-2.0-or-later — see below)
├── struct-walker/     # YAML/JSON walker (file refs, data URIs)
├── sdk/                # plugin hook registry + on-disk Cache
├── canva/              # shared Sass/JS design system
└── plugin-highlight/   # build-time syntax highlighting plugin
```

Each package's `README.md` follows the structure of
[`packages/php-prepros/README.md`](../packages/php-prepros/README.md) —
that file is the canonical template (logo header, Overview, Table of
contents, dated sections separated by `---`, License). If you touch a
package's public surface, update its README to match, and update the
top-level `README.md`'s summary table too if the one-line description
changed.

The root [`CLAUDE.md`](../CLAUDE.md) has more detail on conventions, current
work in flight, and the release process — worth a skim before a non-trivial
PR.

---

## Making a change

1. Branch off `main`.
2. Keep the change scoped to one package where possible; if it spans several
   (e.g. a `canva` API change consumed by `plugin-highlight`), say so in the
   PR description and bump every affected `package.json` together.
3. Update the package's `README.md` if you changed configuration, a public
   function, or a CLI flag — and the JSON Schema
   (`packages/kirigami/kirigami.schema.json`) if you touched `kirigami.yaml`
   shape.
4. Build the package(s) you touched and sanity-check the output.
5. Open a PR describing *what* changed and *why*. Screenshots or a snippet of
   before/after output are welcome for anything touching rendered HTML/CSS.

Releasing to npm (`npm run release`) is done by the maintainer once a change
is merged — you don't need publish rights to contribute.

---

## Writing a plugin

You don't need to touch this repo to extend Kirigami. A plugin is any
`@kirigami/plugin-*` / `<scope>/kirigami-plugin-*` / `kirigami-plugin-*`
npm package that exports a default function and is loaded via a project's
`plugins:` block. It plugs into four seams from
[`@kirigami/sdk`](../packages/sdk): the `sass:*` and `esbuild:*` build hooks,
and the `prepros:php` / `prepros:html` render hooks. `packages/plugin-highlight`
is a real, complete example to read end to end if you're building your own.

---

## License

Everything in this repo is [MIT](../LICENSE), **except**
[`packages/php-wasm`](../packages/php-wasm), which is
**GPL-2.0-or-later** (inherited from its WordPress Playground upstream) —
keep that in mind if your PR touches that package.

---

## Questions

Open a [GitHub issue](https://github.com/php-kirigami/kirigami/issues) — for
a bug, a feature idea, or just to ask before investing time in a larger
change.
