export function create(
	tag: string,
	classname?: string | null,
	content?: string | null,
	attrs?: Record<string, string>
): HTMLElement;

declare global {
	interface HTMLElement {
		create(
			tag: string,
			classname?: string | null,
			content?: string | null,
			attrs?: Record<string, string>
		): HTMLElement;
	}
}
