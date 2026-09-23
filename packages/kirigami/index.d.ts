/** A configured build task, including fields owned by built-in or plugin types. */
export interface TaskConfig {
	name: string;
	type: string;
	force?: boolean;
	[key: string]: unknown;
}

export interface ScriptInfo {
	name: string;
	mount: string[];
	trigger: string | null;
}

export interface PluginInfo {
	name: string;
	version: string | null;
}

/** Resolved configuration. Type-specific and project-defined keys remain open. */
export interface KirigamiConfig {
	root: string;
	kirigami: Record<string, unknown>;
	tasks: TaskConfig[];
	scripts?: Array<Record<string, unknown>>;
	plugins?: Array<Record<string, unknown>>;
	prepros?: Record<string, unknown> | null;
	export?: Record<string, unknown>;
	[key: string]: unknown;
}

export interface OperationResult {
	success: boolean;
	files?: string[];
	error?: string;
	warnings?: string;
	stderr?: string;
	debug?: string;
	[key: string]: unknown;
}

export interface TaskExecutionResult extends OperationResult {
	task: string;
	type: string;
	taskname?: string;
}

export interface TriggerEntry extends OperationResult {
	name: string;
}

export interface TriggerResult {
	success: boolean;
	results: TriggerEntry[];
}

export interface BuildResult {
	success: boolean;
	trigger: TriggerResult;
	results: TaskExecutionResult[];
}

export interface ExportResult {
	success: boolean;
	dist: string;
	beforeExport: TriggerResult | null;
	beforeBuild: TriggerResult | null;
	afterExport: TriggerResult | null;
	results: TaskExecutionResult[];
	error?: string;
}

export interface BuildNotification extends Partial<OperationResult> {
	status: 'start' | 'done';
	rule: string;
	type: string;
	initial?: boolean;
	results?: TaskExecutionResult[];
}

export type BuildResultObserver = (event: BuildNotification) => void | Promise<void>;

export interface ServeOptions {
	port?: number;
	host?: string;
	initialBuild?: boolean;
	onBuildResult?: BuildResultObserver;
}

export interface WatchOptions {
	initialBuild?: boolean;
}

export interface WatchHandle {
	close(): Promise<void>;
}

export interface ServeHandle extends WatchHandle {
	address: string;
	port: number;
	url: string;
}

export declare class Project {
	get config(): KirigamiConfig | null;
	get plugins(): PluginInfo[];
	get tasks(): TaskConfig[];
	get scripts(): ScriptInfo[];

	reload(): Promise<this>;
	validate(): Promise<true>;
	build(): Promise<BuildResult>;
	export(options?: { path?: string }): Promise<ExportResult>;
	serve(options?: ServeOptions): Promise<ServeHandle>;
	watch(options?: WatchOptions): Promise<WatchHandle>;
	run<TResult extends OperationResult = OperationResult>(command: string, argv?: string[]): Promise<TResult>;
	runTask(name: string): Promise<TaskExecutionResult | { success: false; error: string }>;
}

export declare function load(): Promise<Project>;

export declare const Kirigami: {
	load: typeof load;
};

export * from './create.js';
