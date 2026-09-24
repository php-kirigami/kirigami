/** A php-kirigami "template-<name>" repository. */
export interface TemplateInfo {
	/** Short name, without the "template-" prefix (what `kiri create <template>` takes). */
	template: string;
	name: string;
	full_name: string;
	private: boolean;
	description: string | null;
	url: string;
	default_branch: string;
	stars: number;
	updated_at: string;
}

/** Project metadata written into package.json and kirigami.yaml. Empty fields keep the template's values. */
export interface ProjectMeta {
	name?: string;
	description?: string;
	author?: string;
	email?: string;
	baseurl?: string;
	repo?: string;
}

export interface ResolvedMeta extends Required<ProjectMeta> {
	/** npm package name derived from `name`. */
	slug: string;
}

export interface TargetInfo {
	target: string;
	exists: boolean;
	hasPackageJson: boolean;
	hasConfig: boolean;
	/** Existing entries, minus local caches and the lockfile. */
	entries: string[];
}

export type GitCheck = { ok: true } | { ok: false; reason: 'git-missing' | 'inside-worktree' };

export interface GitResult {
	initialised: boolean;
	committed: boolean;
	skipped?: 'disabled' | 'git-missing' | 'inside-worktree';
	error?: string;
}

export interface CreateProgress {
	step: 'download';
	url: string;
}

export interface CreateOptions {
	template: string | TemplateInfo;
	/** Destination directory, created if missing. Default: process.cwd(). */
	target?: string;
	meta?: ProjectMeta;
	/** Initialise a git repository with a first commit. Default: true. */
	git?: boolean;
	/** @kirigami/cli version for a generated package.json (default: the npm registry's latest, else the "latest" dist-tag). */
	cliVersion?: string;
	onProgress?: (event: CreateProgress) => void | Promise<void>;
}

export interface CreateSuccess {
	success: true;
	template: string;
	target: string;
	archive: string;
	meta: ResolvedMeta;
	written: number;
	skipped: number;
	merged: boolean;
	packageJson: 'starter' | 'template' | 'merged' | 'existing';
	/** package.json / kirigami.yaml keys that were set. */
	changed: string[];
	/** Whether a starter banner.txt was written. */
	banner: boolean;
	/** Starter tooling files written because the template had none: ".mcp.json", ".github/workflows/page.yml", ".vscode/settings.json". */
	starterFiles: string[];
	git: GitResult;
}

export type CreateResult = CreateSuccess | { success: false; error: string };

export interface InstallResult {
	success: boolean;
	code: number | null;
	error?: string;
}

export declare const TEMPLATE_OWNER: string;
export declare function listTemplates(options?: { refresh?: boolean }): Promise<TemplateInfo[]>;
export declare function findTemplate(name: string, options?: { refresh?: boolean }): Promise<TemplateInfo | null>;
export declare function inspectTarget(target: string): TargetInfo;
export declare function gitUserConfig(): { name: string; email: string };
export declare function resolveMeta(target: string, meta?: ProjectMeta): ResolvedMeta;
export declare function canInitGit(target: string): GitCheck;
export declare function createProject(options: CreateOptions): Promise<CreateResult>;
export declare function installDependencies(target: string, options?: { stdio?: unknown }): Promise<InstallResult>;
