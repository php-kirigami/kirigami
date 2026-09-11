// ---------------------------------------------------------------------------
// @kirigami/plugin-embed — <youtube id="…"> / <vimeo id="…"> video embeds.
//
// Bundled into every esbuild task (`esbuild:after`) — a side-effect import,
// registers both tags on @kirigami/canva's observer
// (https://github.com/php-kirigami/kirigami/tree/main/packages/canva).
// Each tag is swapped, right away, for a `.embed` placeholder sized by the
// default 16:9 aspect-ratio (assets/_embed.scss); the real oEmbed data
// (thumbnail, title, real aspect-ratio) is fetched — from localStorage if
// this id was already resolved, from the network otherwise — and patched
// into that same element once it resolves. Clicking the play button swaps
// the element's content for the real player iframe.
//
// {% youtube VIDEO_ID %} / {% vimeo VIDEO_ID %} (php/embed.php, a Markdown
// shortcut) just emit the bare tag — everything below is what turns it into
// a card.
//
// Dailymotion and Facebook are not supported — see PROVIDERS below for why.
// ---------------------------------------------------------------------------

import { register } from '@kirigami/canva/observer';

const PROVIDERS = {
	youtube: {
		idPattern: /^[\w-]{10,12}$/,
		oembed: (id) => `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`,
		embed:  (id) => `https://www.youtube-nocookie.com/embed/${id}?autoplay=1`,
	},
	vimeo: {
		idPattern: /^\d+$/,
		oembed: (id) => `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(`https://vimeo.com/${id}`)}`,
		embed:  (id) => `https://player.vimeo.com/video/${id}?autoplay=1`,
	},
	// Dailymotion's oEmbed endpoint sends no Access-Control-Allow-Origin
	// header — an anonymous browser fetch() is blocked by CORS regardless of
	// video id, so it can't work with this client-side architecture.
	//
	// Facebook's oEmbed (Graph API) has required an app access_token since
	// 2018 — no anonymous client-side fetch is possible either.
	//
	// Either could still be added on top by a project with its own working
	// endpoint (a proxy, an access token, …) via its own
	// `register('dailymotion' | 'facebook', …)` call.
};

// A ring + play triangle, single `currentColor` fill — `.embed__play` sets
// `color: var(--accent)` (assets/_embed.scss), so it tracks the project's
// palette with nothing to configure here.
const PLAY_ICON = '<svg viewBox="0 0 512 512" aria-hidden="true" fill="currentColor">'
	+ '<path d="M233 1a256 256 0 1 0 47 510A256 256 0 0 0 233 1zm59 45c80 14 146 73 169 150 6 23 8 33 7 60 0 27-1 37-7 60a215 215 0 0 1-264 145A215 215 0 0 1 46 220 213 213 0 0 1 292 46z"/>'
	+ '<path d="m221 168-5 4c-2 3-2 7-2 84 0 73 0 81 2 84 3 6 12 8 19 3l56-40c42-31 52-39 54-42 1-4 1-8-1-12l-113-82c-4-1-6-1-10 1z"/>'
	+ '</svg>';


async function getOembed(provider, id) {
	const key = `kirigami-embed:${provider}:${id}`;
	const cached = localStorage.getItem(key);
	if (cached) {
		try { return JSON.parse(cached); } catch { /* corrupt entry — refetch below */ }
	}
	const res = await fetch(PROVIDERS[provider].oembed(id));
	if (!res.ok) throw new Error(`${provider} oEmbed request failed (${res.status})`);
	const data = await res.json();
	try { localStorage.setItem(key, JSON.stringify(data)); } catch { /* storage full/unavailable — not fatal */ }
	return data;
}


function embedTag(provider) {
	return (el) => {
		const id = el.getAttribute('id');
		if (!id || !PROVIDERS[provider].idPattern.test(id)) return; // missing/malformed — leave the tag alone rather than guess

		const wrapper = document.createElement('div');
		wrapper.className = 'embed';

		const play = document.createElement('button');
		play.type = 'button';
		play.className = 'embed__play';
		play.setAttribute('aria-label', 'Play video');
		play.innerHTML = PLAY_ICON;
		play.addEventListener('click', () => {
			const iframe = document.createElement('iframe');
			iframe.className = 'embed__player';
			iframe.src = PROVIDERS[provider].embed(id);
			iframe.title = wrapper.dataset.title || provider;
			iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
			iframe.allowFullscreen = true;
			iframe.frameBorder = '0';
			wrapper.replaceChildren(iframe);
		});
		wrapper.append(play);

		getOembed(provider, id).then((data) => {
			if (data.thumbnail_url) wrapper.style.backgroundImage = `url("${data.thumbnail_url}")`;
			// The card's own `max-width` (assets/_embed.scss, `--embed-max-width`)
			// is what keeps a 4∶3/portrait/square video from ever looking
			// oversized — with that capped, the box can safely show the
			// video's real aspect ratio instead of a fixed guess.
			if (data.width && data.height) {
				wrapper.style.aspectRatio = `${data.width} / ${data.height}`;
			}
			if (data.title) {
				wrapper.dataset.title = data.title;
				const title = document.createElement('span');
				title.className = 'embed__title';
				title.textContent = data.title;
				wrapper.prepend(title);
			}
		}).catch((err) => console.error(`[plugin-embed] ${provider} oEmbed failed`, err));

		return wrapper;
	};
}


register('youtube', embedTag('youtube'));
register('vimeo', embedTag('vimeo'));
