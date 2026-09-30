# Changelog

## 0.1.4

- Bundles Kirigami 3.2.1 and MCP 0.1.7. A folder's `_index.md` whose first
  lines are `@tag value` annotations is now a page (Markdown, no PHP), and
  `@@tag` passes a value down to every page below it. The preview and
  watch mode follow them.
- `prepros.format` no longer puts a space before punctuation after an inline
  element (`<strong>bold</strong>,` rendered as "bold ,").
- The `kirigami.yaml` schema knows `studio.include[].header` and
  `studio.types` (for Kiri Studio).

## 0.1.3

- Bundles Kirigami 3.1.2. The preview server now answers HTTP Range requests
  and knows the audio and video types, so a browser can seek inside an
  `<audio>` or `<video>` in the preview.

## 0.1.2

- Bundles Kirigami 3.1.1 and PHP 8.5.11-1 (with the Aura and translit
  extensions built in). `IMG::palette()` and the `colors()` Sass function
  now extract colours with Aura: up to six, most populated first.
- With several Sass or esbuild tasks, the files plugins inject (Canva and
  plugin styles and scripts) go into the first task of each type only, no
  longer repeated in every stylesheet and bundle.
- Adds the `studio:` block to the `kirigami.yaml` schema (for Kiri Studio).

## 0.1.1

- Bundles Kirigami 3.0.2: a tag written as an example inside Markdown code
  (an inline code span or a fenced block), such as `<markdown>` or
  `<img asset>`, is no longer processed. Before, it could break the rest of
  the page or produce an empty image.

## 0.1.0

First release.

- **Kirigami: Create Project…** — a wizard (template, project details, git
  and `npm install` options) that scaffolds a new site from an official
  template and opens it. Available in any window.
- **Build**, **Export**, **Run Script…** and **Validate kirigami.yaml**
  commands for the open project, with results in a **Kirigami** output
  channel that looks like the `kiri` CLI.
- **Toggle Dev Server** from the status bar: builds, serves the site with
  live rebuilds, shows the build state, and opens the preview in VS Code's
  Simple Browser or your browser.
- Activates in workspaces whose root has a `kirigami.yaml`, and reloads the
  project when that file changes.
- Settings: `kirigami.nodePath` (the Node 24+ executable that runs the engine)
  and `kirigami.previewPort` (the dev server's port, default `4321`).
