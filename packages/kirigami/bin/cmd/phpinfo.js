
import { phpinfo } from "@kirigami/php-wasm";
import PHPInfoParser from "../libs/phpinfoparser.js";

export default async function phpinfo_(args) {
	const info = await phpinfo();
	const parser = PHPInfoParser.fromString(info);
	const md   = parser.toMarkdown();
	process.stdout.write(md);
}