/******************************************************
 *             Body lock while working/busy           *
 ******************************************************/
export const busy = async (promise) => {
	document.documentElement.classList.add('is-busy');
	const results = await Promise.allSettled(promise instanceof Array ? promise : [promise]);
	document.documentElement.classList.remove('is-busy');
	return promise instanceof Array ? results : results[0];
}
export const working = async (promise) => {
	document.documentElement.classList.add('is-working');	
	const results = await Promise.allSettled(promise instanceof Array ? promise : [promise]);
	document.documentElement.classList.remove('is-working');
	return promise instanceof Array ? results : results[0];
}


/******************************************************
 *                    Preload image                   *
 ******************************************************/
export const preloadImage = url => {
	return new Promise((res, rej) => {
		const img = new Image();
		img.decoding = 'async';
		img.loading = 'eager';
		img.onload = () => res('preloaded');
		img.onerror = rej;
		img.src = url;
		if (img.complete && img.naturalWidth > 0) res('memory-cache');
	});
}


/******************************************************
 *          Strip shared leading indentation           *
 ******************************************************/
// Removes the whitespace prefix common to every non-blank line, so a block that
// was indented for readability in its source (a fenced code block, a template
// literal, an authoring tag body) renders flush-left. Relative indentation is
// preserved. Leading blank lines and trailing whitespace are trimmed.
export const dedent = (str) => {
	const lines = String(str).replace(/^\n+/, '').replace(/\s+$/, '').split('\n');
	let min = Infinity;
	for (const line of lines) {
		if (line.trim() === '') continue;
		min = Math.min(min, line.match(/^\s*/)[0].length);
	}
	if (!min || min === Infinity) return lines.join('\n');
	return lines.map(line => line.slice(min)).join('\n');
}


/******************************************************
 *               DOMDocument async loaded             *
 ******************************************************/
export const documentReady = function(clb = null) {
	return new Promise((res) => {
		if (document.readyState === "loading") {
			document.addEventListener("DOMContentLoaded", () => {
				if(clb) res(clb());
				else res(true);
			}, { once: true });
		} else {
			if(clb) res(clb());
			else res(true);
		}
	});
}