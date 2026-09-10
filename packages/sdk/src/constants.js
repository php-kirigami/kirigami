// ---------------------------------------------------------------------------
// Names of the hooks exposed by the @kirigami/kirigami tasks. A plugin should
// always use these constants rather than retyping the strings by hand, to
// avoid silent typos (a misspelled hook throws no error, it just never fires)
// and to get autocomplete.
//
// This list grows as tasks expose new extension points — see the README for
// what each hook receives and expects in return.
// ---------------------------------------------------------------------------

export const HOOKS = Object.freeze({
	/** Path(s) of .scss file(s) compiled before the sass task entry. */
	SASS_BEFORE: 'sass:before',
	/** Path(s) of .scss file(s) compiled after the sass task entry. */
	SASS_AFTER: 'sass:after',
	/** Custom Sass functions, in the same format as the Sass API `functions` option. */
	SASS_FUNCTIONS: 'sass:functions',
});
