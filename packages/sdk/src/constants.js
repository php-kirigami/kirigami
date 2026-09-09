// ---------------------------------------------------------------------------
// Noms des hooks exposés par les tasks de @kirigami/kirigami. Un plugin
// devrait toujours utiliser ces constantes plutôt que retaper les strings à
// la main, pour éviter les fautes de frappe silencieuses (un hook mal
// orthographié ne lève aucune erreur, il ne se déclenche juste jamais) et
// profiter de l'autocomplete.
//
// Cette liste grandit au fil des tasks qui exposent de nouveaux points
// d'extension — voir le README pour le détail de ce que chaque hook reçoit
// et attend en retour.
// ---------------------------------------------------------------------------

export const HOOKS = Object.freeze({
	/** Chemin(s) de fichier .scss compilé(s) avant l'entry de la task sass. */
	SASS_BEFORE: 'sass:before',
	/** Chemin(s) de fichier .scss compilé(s) après l'entry de la task sass. */
	SASS_AFTER: 'sass:after',
	/** Fonctions Sass custom, au même format que l'option `functions` de l'API Sass. */
	SASS_FUNCTIONS: 'sass:functions',
});
