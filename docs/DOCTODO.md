# Doc TODO

Documentation debt specifically — pending doc updates that code changes left
behind. Distinct from [TODO.md](TODO.md) (small code action items) and the
step-8 "update every README.md" pass in
[INSTRUCTIONS.md](INSTRUCTIONS.md#workflow), which this file feeds.

- **`docs/template-CLAUDE.md`'s `YAML::` section is stale** after the
  native-`yaml`-extension switch (see [DECISIONS.md](DECISIONS.md)). It
  documents `YAML::parse()`/`parseFile()`/`loadFile()`/`yaml_load_file()`
  (around line 378 and line 517) but says nothing about the YAML 1.1
  implicit-boolean behavior ("Norway problem": bare `y`/`n`, or the full
  `yes`/`no`/`true`/`false`/`on`/`off`, as either a value or a mapping key).
  This is exactly the audience that needs the warning — template authors
  write `.yaml`/`.yml` data files consumed through these functions. Once
  updated, fan it out to every `../template-*/` repo and the org site as
  `CLAUDE.md`, per the fan-out rule in [CONTEXT.md](CONTEXT.md).
- **`packages/php-prepros/README.md`'s "What's new in X.Y.Z"** — add an
  entry for the `YAML::` native-backend switch once `php-prepros` is
  actually version-bumped for release (not yet — this landed mid-refactor
  on `refactor/core-api`). Don't add the changelog entry before the bump;
  it'll drift from the real version number otherwise.
- **Same changelog gap for the `MD::` native-backend switch** (see
  [DECISIONS.md](DECISIONS.md)) — fold it into the same future changelog
  entry once `php-prepros` is version-bumped, including the footnote-markup
  change (now GitHub's real `<section class="footnotes">` shape) since
  that's user-visible for anyone with custom CSS targeting the old
  `<div class="footnotes">` by tag rather than by class.
- **`docs/template-CLAUDE.md` doesn't mention the `MD::` native-backend
  switch either** — lower urgency than the `YAML::` gap above (no
  known behavioral footgun for template authors, everything's
  diff-tested/documented in `php-mdhtml`'s `CLAUDE.md`), but the footnote
  HTML shape change is worth a one-line mention if `template-CLAUDE.md`
  documents `[^1]` footnote output anywhere. Fan out per the usual rule
  in [CONTEXT.md](CONTEXT.md) once updated.
- **Not a doc gap, just a reminder for whoever reads this next:**
  `kirigami.yaml` itself is parsed in Node by `@kirigami/struct-walker`
  (js-yaml), not by the PHP `YAML::` class — the native-backend switch
  doesn't touch it. Only `.yaml`/`.yml` files loaded from *inside* PHP
  templates (`YAML::parseFile()`/`loadFile()`/`yaml_load_file()`,
  `prepros.plugins.php`'s data-tag handling) go through the new backend.
- **`docs/template-CLAUDE.md` doesn't mention page types yet** (new
  `prepros.types` / `@type` feature, see [STATUS.md](STATUS.md) and
  [DECISIONS.md](DECISIONS.md)). Add a `types:` line to its example
  `prepros:` yaml block and a one-line mention of `@type` next to
  `@content`/`@indent`, then fan out to `../template-*/` and the org site
  per [CONTEXT.md](CONTEXT.md) — deliberately deferred until the feature
  is actually used by a template, per the workflow's step-14 ordering
  ([INSTRUCTIONS.md](INSTRUCTIONS.md#workflow)).
