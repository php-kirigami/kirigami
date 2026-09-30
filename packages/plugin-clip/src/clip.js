// ---------------------------------------------------------------------------
// @kirigami/plugin-clip — client side of the `.clip` card baked at build time
// (src/build.js). Bundled into the first esbuild task (`esbuild:after`).
//
// Nothing is downloaded until the visitor presses play: the card is a poster
// image and a link to the video file (which is also the no-JavaScript
// fallback). A click swaps the card's content for a real <video controls>
// that starts playing. Only one clip plays at a time.
// ---------------------------------------------------------------------------

let current = null; // the <video> currently playing


function play(card) {
	const video = document.createElement('video');
	video.className = 'clip__video';
	video.src = card.dataset.src;
	video.controls = true;
	video.autoplay = true;
	video.playsInline = true;
	video.addEventListener('play', () => {
		if (current && current !== video) current.pause();
		current = video;
	});
	card.classList.add('is-playing');
	card.append(video);
	video.focus();
}


// <inline-clip> videos autoplay muted and loop on their own (plain HTML
// attributes). This only makes them polite: paused while off-screen, and
// left paused on their poster when the visitor prefers reduced motion.
function initInline() {
	const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
	const observer = 'IntersectionObserver' in window
		? new IntersectionObserver((entries) => {
			for (const { target, isIntersecting } of entries) {
				if (reduced.matches) continue;
				if (isIntersecting) target.play().catch(() => {});
				else target.pause();
			}
		})
		: null;
	document.querySelectorAll('.inline-clip').forEach((video) => {
		video.muted = true; // the attribute alone isn't honoured by every browser once created from script
		if (reduced.matches) video.pause();
		observer?.observe(video);
	});
}


function init() {
	initInline();
	document.querySelectorAll('.clip').forEach((card) => {
		if (card.dataset.ready) return;
		card.dataset.ready = 'true';
		card.querySelector('.clip__play')?.addEventListener('click', (e) => {
			e.preventDefault();
			if (!card.classList.contains('is-playing')) play(card);
		});
	});
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
