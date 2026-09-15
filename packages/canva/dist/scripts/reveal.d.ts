// Reveals every [data-reveal] under `target` (default: the whole document) —
// each element gets `is-in` once, the first time it scrolls into view.
// Elements already carrying `is-in` are skipped, so calling this repeatedly
// (after inserting more [data-reveal] content) is safe. Runs once on import
// already.
export function reveal(target?: ParentNode): void;
