import { jspi } from "wasm-feature-detect";

async function getPHPLoaderModule() {
  return await import("./jspi/php_8_5.js");
}

export {
  getPHPLoaderModule,
  jspi
};
