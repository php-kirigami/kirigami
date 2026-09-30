// ---------------------------------------------------------------------------
// @kirigami/plugin-player — client side of the `.player` markup baked at build
// time (src/build.js). Bundled into the first esbuild task (`esbuild:after`).
//
// The <audio> element is only created on first play, so a page full of
// players downloads nothing until someone presses play. Progress is exposed
// as the `--progress` custom property (0-1) that assets/_player.scss uses to
// reveal the coloured copy of the waveform. Only one player plays at a time;
// inside a `.playlist`, the next track starts when one ends.
// ---------------------------------------------------------------------------

const SEEK_STEP = 5; // seconds, arrow keys

let current = null; // the player currently playing


function formatTime(total) {
	const s = Math.floor(total % 60);
	const m = Math.floor(total / 60) % 60;
	const h = Math.floor(total / 3600);
	const pad = (n) => String(n).padStart(2, '0');
	return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}


class Player {
	constructor(root) {
		this.root = root;
		this.audio = null;
		this.dragging = false;
		this.toggle = root.querySelector('.player__toggle');
		this.wave = root.querySelector('.player__wave');
		this.time = root.querySelector('.player__time');
		this.total = Number(root.dataset.duration) || 0;

		this.toggle.addEventListener('click', () => this.toggle_());
		this.wave.addEventListener('pointerdown', (e) => this.startDrag(e));
		this.wave.addEventListener('pointermove', (e) => { if (this.dragging) this.seekTo(this.ratioAt(e.clientX)); });
		for (const type of ['pointerup', 'pointercancel']) this.wave.addEventListener(type, () => { this.dragging = false; });
		this.wave.addEventListener('keydown', (e) => this.onKey(e));
	}

	get duration() {
		return this.audio && Number.isFinite(this.audio.duration) ? this.audio.duration : this.total;
	}

	ensureAudio() {
		if (this.audio) return this.audio;
		const audio = new Audio(this.root.dataset.src);
		audio.preload = 'metadata';
		audio.addEventListener('timeupdate', () => this.render());
		audio.addEventListener('durationchange', () => this.render());
		audio.addEventListener('play', () => this.onPlay());
		audio.addEventListener('pause', () => this.onPause());
		audio.addEventListener('ended', () => this.onEnded());
		this.audio = audio;
		return audio;
	}

	toggle_() {
		const audio = this.ensureAudio();
		if (audio.paused) audio.play().catch((err) => console.error('[plugin-player] play failed', err));
		else audio.pause();
	}

	play() {
		const audio = this.ensureAudio();
		audio.play().catch((err) => console.error('[plugin-player] play failed', err));
	}

	onPlay() {
		if (current && current !== this) current.audio.pause();
		current = this;
		this.root.classList.add('is-playing');
		this.toggle.setAttribute('aria-label', 'Pause');
	}

	onPause() {
		this.root.classList.remove('is-playing');
		this.toggle.setAttribute('aria-label', 'Play');
	}

	onEnded() {
		this.audio.currentTime = 0;
		this.render();
		const item = this.root.closest('.playlist__track');
		const next = item?.nextElementSibling?.querySelector('.player');
		if (next) players.get(next)?.play();
	}

	// A press seeks (and starts playback); dragging along the waveform keeps seeking.
	startDrag(e) {
		this.dragging = true;
		this.wave.setPointerCapture?.(e.pointerId);
		this.seekTo(this.ratioAt(e.clientX), true);
	}

	ratioAt(clientX) {
		const rect = this.wave.getBoundingClientRect();
		return rect.width ? Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)) : 0;
	}

	seekTo(ratio, andPlay = false) {
		const duration = this.duration;
		if (!duration) return;
		const audio = this.ensureAudio();
		audio.currentTime = ratio * duration;
		this.render();
		if (andPlay && audio.paused) this.play();
	}

	onKey(e) {
		const audio = this.ensureAudio();
		const duration = this.duration;
		let target = null;
		if (e.key === 'ArrowRight') target = audio.currentTime + SEEK_STEP;
		else if (e.key === 'ArrowLeft') target = audio.currentTime - SEEK_STEP;
		else if (e.key === 'Home') target = 0;
		else if (e.key === 'End') target = duration;
		else return;
		e.preventDefault();
		this.seekTo(Math.min(duration, Math.max(0, target)) / (duration || 1));
	}

	render() {
		const position = this.audio ? this.audio.currentTime : 0;
		const duration = this.duration;
		this.root.style.setProperty('--progress', duration ? position / duration : 0);
		this.time.textContent = formatTime(position);
		this.wave.setAttribute('aria-valuenow', Math.round(position));
	}
}


const players = new WeakMap(); // .player element -> Player

function init() {
	document.querySelectorAll('.player').forEach((el) => {
		if (!players.has(el)) players.set(el, new Player(el));
	});
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
