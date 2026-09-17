import { load } from "@kirigami/kirigami";

// Lazy singleton: Project is meant to be embedded once per process lifetime
// and reload()ed in place, not re-created per call.
let projectPromise = null;

export function getProject() {
	if (!projectPromise) projectPromise = load();
	return projectPromise;
}
