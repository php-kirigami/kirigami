import { jspi } from "wasm-feature-detect";
import { getPHPRuntime, getPHPRuntimeWithNetwork } from "./runtime/runtime.js";

async function getPHPLoaderModule() {
  return await import("./jspi/php_8_5.js");
}

export { getPHPLoaderModule, getPHPRuntime, getPHPRuntimeWithNetwork, jspi };