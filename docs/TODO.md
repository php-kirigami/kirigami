# Todo

Small, concrete, near-term code action items; documentation debt belongs in [DOCTODO.md](DOCTODO.md). These are — not full features (those go in
[ROADMAP.md](ROADMAP.md)) and not open questions (those go in [BUGS.md](BUGS.md)).

- **VS Code packaging on other platforms**: interactive checks passed (2026-09-23) and the win32-x64 VSIX is built and tested; VSIX builds for other targets are not. See [EXTENSION-VSCODE.md](EXTENSION-VSCODE.md) for reproducible checks.
- **libbestframe** (used by plugin-clip): ~16 s to analyse a 3-minute 720p video (12 s of a 1280x720 H.264 clip took ~16 s in one measurement); profile the decode (`src/video.c`) and the scoring for cheap wins.
- **Share the "publish an image through the pipeline" helper**: `plugin-player` (`publishCover`) and `plugin-clip` (`publishPoster`) both replicate `sass.js`' `img-asset()` logic (output naming, `processImages` job, export dest). Lift it into `@kirigami/sdk` (or the core) so it lives in one place.
- **Theme fade vs. own `transition` rules** (canva + plugins): any rule that sets `transition` replaces canva's theme fade on that element, so its colors flip at once. `.extlink` (plugin-extlink) and `.embed__play` (plugin-embed) still do; the site now prepends the list by hand. Expose the list from canva (e.g. `--theme-transition`) and use it in the plugins; consider adding `border-color`. Also decide whether the color fade should survive `prefers-reduced-motion: reduce` (it is not motion); today canva drops every transition then.
