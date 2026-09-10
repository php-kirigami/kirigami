/******************************************************
 *                  Reveal on scroll                  *
 *                                                    *
 *  Adds `is-in` to every `[data-reveal]` element the *
 *  first time it scrolls into view, then stops       *
 *  watching it. Pair with a CSS rule that hides      *
 *  `[data-reveal]` and shows `[data-reveal].is-in`   *
 *  — gate that rule on the `js` class (set on        *
 *  <html> by Kirigami's managed <head>) so content   *
 *  stays visible when the bundle fails to load.      *
 *                                                    *
 *  Runs on import: sweeps the document once the DOM  *
 *  is ready. Call `reveal(node)` again yourself      *
 *  after inserting more `[data-reveal]` content.     *
 *                                                    *
 *      import { reveal } from                        *
 *          '@kirigami/canva/reveal';                 *
 *                                                    *
 *  `prefers-reduced-motion: reduce`, a missing       *
 *  IntersectionObserver, or the safety timeout all   *
 *  fall back to revealing everything at once.        *
 ******************************************************/

const SELECTOR = '[data-reveal]';
const SHOWN = 'is-in';
const ROOT_MARGIN = '0px 0px -10% 0px';
const SAFETY_MS = 1500;

const show = (el) => el.classList.add(SHOWN);

const reduceMotion = () =>
	!!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);


// Reveal every `[data-reveal]` under `target` (default: the whole document).
// Each element is shown once, when it first enters the viewport; elements that
// already carry `is-in` are skipped, so calling this repeatedly is safe.
export function reveal(target = document) {
	const els = [...target.querySelectorAll(SELECTOR)]
		.filter((el) => !el.classList.contains(SHOWN));
	if (!els.length) return;

	if (reduceMotion() || !('IntersectionObserver' in window)) {
		els.forEach(show);
		return;
	}

	const io = new IntersectionObserver((entries, obs) => {
		for (const entry of entries) {
			if (!entry.isIntersecting) continue;
			show(entry.target);
			obs.unobserve(entry.target);
		}
	}, { rootMargin: ROOT_MARGIN });

	els.forEach((el) => io.observe(el));

	// Never leave content hidden if the observer never fires — a page with no
	// scroll, a background-restored tab, print.
	setTimeout(() => els.forEach(show), SAFETY_MS);
}


const onReady = (fn) =>
	document.readyState === 'loading'
		? document.addEventListener('DOMContentLoaded', fn, { once: true })
		: fn();

onReady(() => reveal());
