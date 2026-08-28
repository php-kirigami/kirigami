import { jspi } from "wasm-feature-detect";
import { getPHPRuntime, getPHPRuntimeWithNetwork } from "./runtime/runtime.js";

async function getPHPLoaderModule() {
	return await import("./jspi/php_8_5.js");
}

async function phpinfo() {
	const php = await getPHPRuntime();
	php.writeFile("/phpinfo.php", `<?php phpinfo();`);
    const output = await php.runStream({ scriptPath: '/phpinfo.php' });
	const stdout = await output.stdoutText;
	return stdout;
}

export { getPHPLoaderModule, getPHPRuntime, getPHPRuntimeWithNetwork, jspi, phpinfo };