// ---------------------------------------------------------------------------
// Minimal GitHub REST client — just what Kirigami needs (listing an org's or a
// user's public repositories), on top of the built-in `fetch`. Replaces
// @octokit/rest, which pulled in ~20 packages for one paginated GET.
//
// Anonymous by default (60 requests/hour per IP). A token in GITHUB_TOKEN or
// GH_TOKEN, or passed explicitly, raises that limit and is only ever sent to
// api.github.com.
// ---------------------------------------------------------------------------

import picomatch from "picomatch";

const API = "https://api.github.com";


export class GitHubError extends Error {
	constructor(message, status) {
		super(message);
		this.name = "GitHubError";
		this.status = status;
	}
}


function defaultToken() {
	return process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
}

// `Link: <https://…?page=2>; rel="next", <…>; rel="last"` → the "next" URL.
function nextLink(header) {
	if (!header) return null;
	const m = header.split(",").map(s => s.match(/<([^>]+)>\s*;\s*rel="next"/)).find(Boolean);
	return m ? m[1] : null;
}


// GET one API URL (absolute, or a path relative to api.github.com) and return
// `{ data, next }`, where `next` is the following page's URL or null.
export async function request(url, { token = defaultToken() } = {}) {
	const href = new URL(url, API);
	if (href.origin !== API) throw new GitHubError(`Refusing to query ${href.origin}`, 0);

	const headers = {
		"Accept": "application/vnd.github+json",
		"X-GitHub-Api-Version": "2022-11-28",
		"User-Agent": "kirigami",
	};
	if (token) headers.Authorization = `Bearer ${token}`;

	const res = await fetch(href, { headers });
	if (!res.ok) {
		let message = `GitHub API ${res.status} ${res.statusText}`.trim();
		try {
			const body = await res.json();
			if (body?.message) message += ` — ${body.message}`;
		} catch { /* non-JSON error body */ }
		if ((res.status === 403 || res.status === 429) && res.headers.get("x-ratelimit-remaining") === "0") {
			message = "GitHub API rate limit exceeded — set GITHUB_TOKEN to raise it.";
		}
		throw new GitHubError(message, res.status);
	}
	return { data: await res.json(), next: nextLink(res.headers.get("link")) };
}


// Yields every page of a paginated list endpoint.
export async function* paginate(url, options) {
	let next = url;
	while (next) {
		const page = await request(next, options);
		yield page.data;
		next = page.next;
	}
}


// Repositories of `owner` (an organisation, or a user with `type: "user"`)
// whose name matches the `pattern` glob.
export async function listRepos(owner, { pattern = "*", type = "org", token } = {}) {
	const isMatch = picomatch(pattern);
	const base = type === "org" ? "orgs" : "users";
	const repos = [];
	for await (const page of paginate(`/${base}/${encodeURIComponent(owner)}/repos?per_page=100`, { token })) {
		for (const repo of page) {
			if (!isMatch(repo.name)) continue;
			repos.push({
				name: repo.name,
				full_name: repo.full_name,
				private: repo.private,
				description: repo.description,
				url: repo.html_url,
				default_branch: repo.default_branch,
				stars: repo.stargazers_count,
				updated_at: repo.updated_at,
			});
		}
	}
	return repos;
}
