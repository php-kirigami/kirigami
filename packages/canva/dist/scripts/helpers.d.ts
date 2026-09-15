export function busy<T>(promise: T): Promise<PromiseSettledResult<T>>;
export function busy<T extends readonly unknown[]>(promise: T): Promise<{ -readonly [K in keyof T]: PromiseSettledResult<T[K]> }>;

export function working<T>(promise: T): Promise<PromiseSettledResult<T>>;
export function working<T extends readonly unknown[]>(promise: T): Promise<{ -readonly [K in keyof T]: PromiseSettledResult<T[K]> }>;

export function preloadImage(url: string): Promise<"preloaded" | "memory-cache">;

// Strips the whitespace prefix common to every non-blank line (relative
// indentation kept; leading blank lines and trailing whitespace trimmed).
export function dedent(str: string): string;

export function documentReady(): Promise<true>;
export function documentReady<T>(clb: () => T): Promise<T>;
