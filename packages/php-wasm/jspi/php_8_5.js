// Emscripten generates code for Node.js that uses the `require` function.
// We need to explicitly create a require function to avoid errors when running
// this code in Node.js as an ES module.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
// Note: The path and url modules are currently needed by code injected by the php-wasm Dockerfile.
import path from 'path';
import { fileURLToPath } from 'url';

// Determine the current directory path. In CJS mode, __dirname is available.
// In ESM mode, we derive it from import.meta.url.
const currentDirPath =
	typeof __dirname !== 'undefined'
		? __dirname
		: path.dirname(fileURLToPath(import.meta.url));
const dependencyFilename = path.join(currentDirPath, '8_5_11', 'php_8_5.wasm');
export { dependencyFilename }; 
export const dependenciesTotalSize = 27577521; 
const phpVersionString = '8.5.11';
export function init(RuntimeName, PHPLoader) {
    // The rest of the code comes from the built php.js file and esm-suffix.js
// include: shell.js
// include: minimum_runtime_check.js
// end include: minimum_runtime_check.js
// The Module object: Our interface to the outside world. We import
// and export values on it. There are various ways Module can be used:
// 1. Not defined. We create it here
// 2. A function parameter, function(moduleArg) => Promise<Module>
// 3. pre-run appended it, var Module = {}; ..generated code..
// 4. External script tag defines var Module.
// We need to check if Module already exists (e.g. case 3 above).
// Substitution will be replaced with actual code on later stage of the build,
// this way Closure Compiler will not mangle it (e.g. case 4. above).
// Note that if you want to run closure, and also to use Module
// after the generated code, you will need to define   var Module = {};
// before the code. Then that object will be used in the code, and you
// can continue to use Module afterwards as well.
var Module = typeof PHPLoader != "undefined" ? PHPLoader : {};

var ENVIRONMENT_IS_WORKER=RuntimeName==="WORKER";

var ENVIRONMENT_IS_NODE=RuntimeName==="NODE";

// --pre-jses are emitted after the Module integration code, so that they can
// refer to Module (if they choose; they can also define Module)
var arguments_ = [];

var thisProgram = "./this.program";

var quit_ = (status, toThrow) => {
  throw toThrow;
};

var _scriptName;

if (typeof __filename != "undefined") {
  // Node
  _scriptName = __filename;
} else /*no-op*/ {}

// `/` should be present at the end if `scriptDirectory` is not empty
var scriptDirectory = "";

function locateFile(path) {
  if (Module["locateFile"]) {
    return Module["locateFile"](path, scriptDirectory);
  }
  return scriptDirectory + path;
}

// Hooks that are implemented differently in different runtime environments.
var readAsync, readBinary;

if (ENVIRONMENT_IS_NODE) {
  // These modules will usually be used on Node.js. Load them eagerly to avoid
  // the complexity of lazy-loading.
  var fs = require("fs");
  scriptDirectory = currentDirPath + "/";
  // include: node_shell_read.js
  readBinary = filename => {
    // We need to re-wrap `file://` strings to URLs.
    filename = isFileURI(filename) ? new URL(filename) : filename;
    var ret = fs.readFileSync(filename);
    return ret;
  };
  readAsync = async (filename, binary = true) => {
    // See the comment in the `readBinary` function.
    filename = isFileURI(filename) ? new URL(filename) : filename;
    var ret = fs.readFileSync(filename, binary ? undefined : "utf8");
    return ret;
  };
  // end include: node_shell_read.js
  if (process.argv.length > 1) {
    thisProgram = process.argv[1].replace(/\\/g, "/");
  }
  arguments_ = process.argv.slice(2);
  // MODULARIZE will export the module in the proper place outside, we don't need to export here
  if (typeof module != "undefined") {
    module["exports"] = Module;
  }
  quit_ = (status, toThrow) => {
    process.exitCode = status;
    throw toThrow;
  };
} else // Note that this includes Node.js workers when relevant (pthreads is enabled).
// Node.js workers are detected as a combination of ENVIRONMENT_IS_WORKER and
// ENVIRONMENT_IS_NODE.
{}

var out = console.log.bind(console);

var err = console.error.bind(console);

// end include: shell.js
// include: preamble.js
// === Preamble library stuff ===
// Documentation for the public APIs defined in this file must be updated in:
//    site/source/docs/api_reference/preamble.js.rst
// A prebuilt local version of the documentation is available at:
//    site/build/text/docs/api_reference/preamble.js.txt
// You can also build docs locally as HTML or other formats in site/
// An online HTML version (which may be of a different version of Emscripten)
//    is up at http://kripken.github.io/emscripten-site/docs/api_reference/preamble.js.html
var dynamicLibraries = [];

var wasmBinary;

// Wasm globals
//========================================
// Runtime essentials
//========================================
// whether we are quitting the application. no code should run after this.
// set in exit() and abort()
var ABORT = false;

// set by exit() and abort().  Passed to 'onExit' handler.
// NOTE: This is also used as the process return code code in shell environments
// but only when noExitRuntime is false.
var EXITSTATUS;

/**
 * Indicates whether filename is delivered via file protocol (as opposed to http/https)
 * @noinline
 */ var isFileURI = filename => filename.startsWith("file://");

// include: runtime_common.js
// include: runtime_stack_check.js
// end include: runtime_stack_check.js
// include: runtime_exceptions.js
// end include: runtime_exceptions.js
// include: runtime_debug.js
// end include: runtime_debug.js
// Memory management
var /** @type {!Int8Array} */ HEAP8, /** @type {!Uint8Array} */ HEAPU8, /** @type {!Int16Array} */ HEAP16, /** @type {!Uint16Array} */ HEAPU16, /** @type {!Int32Array} */ HEAP32, /** @type {!Uint32Array} */ HEAPU32, /** @type {!Float32Array} */ HEAPF32, /** @type {!Float64Array} */ HEAPF64;

// BigInt64Array type is not correctly defined in closure
var /** not-@type {!BigInt64Array} */ HEAP64, /* BigUint64Array type is not correctly defined in closure
/** not-@type {!BigUint64Array} */ HEAPU64;

var runtimeInitialized = false;

var runtimeExited = false;

function updateMemoryViews() {
  var b = wasmMemory.buffer;
  HEAP8 = new Int8Array(b);
  HEAP16 = new Int16Array(b);
  Module["HEAPU8"] = HEAPU8 = new Uint8Array(b);
  HEAPU16 = new Uint16Array(b);
  HEAP32 = new Int32Array(b);
  Module["HEAPU32"] = HEAPU32 = new Uint32Array(b);
  HEAPF32 = new Float32Array(b);
  HEAPF64 = new Float64Array(b);
  HEAP64 = new BigInt64Array(b);
  HEAPU64 = new BigUint64Array(b);
}

// include: memoryprofiler.js
// end include: memoryprofiler.js
// end include: runtime_common.js
var __RELOC_FUNCS__ = [];

function preRun() {
  if (Module["preRun"]) {
    if (typeof Module["preRun"] == "function") Module["preRun"] = [ Module["preRun"] ];
    while (Module["preRun"].length) {
      addOnPreRun(Module["preRun"].shift());
    }
  }
  // Begin ATPRERUNS hooks
  callRuntimeCallbacks(onPreRuns);
}

function initRuntime() {
  runtimeInitialized = true;
  callRuntimeCallbacks(__RELOC_FUNCS__);
  // Begin ATINITS hooks
  callRuntimeCallbacks(onInits);
  if (!Module["noFSInit"] && !FS.initialized) FS.init();
  TTY.init();
  SOCKFS.root = FS.mount(SOCKFS, {}, null);
  PIPEFS.root = FS.mount(PIPEFS, {}, null);
  // End ATINITS hooks
  wasmExports["__wasm_call_ctors"]();
  // Begin ATPOSTCTORS hooks
  callRuntimeCallbacks(onPostCtors);
  FS.ignorePermissions = false;
}

function preMain() {}

function exitRuntime() {
  // PThreads reuse the runtime from the main thread.
  ___funcs_on_exit();
  // Native atexit() functions
  // Begin ATEXITS hooks
  FS.quit();
  TTY.shutdown();
  // End ATEXITS hooks
  runtimeExited = true;
}

function postRun() {
  // PThreads reuse the runtime from the main thread.
  if (Module["postRun"]) {
    if (typeof Module["postRun"] == "function") Module["postRun"] = [ Module["postRun"] ];
    while (Module["postRun"].length) {
      addOnPostRun(Module["postRun"].shift());
    }
  }
  // Begin ATPOSTRUNS hooks
  callRuntimeCallbacks(onPostRuns);
}

/** @param {string|number=} what */ function abort(what) {
  Module["onAbort"]?.(what);
  what = "Aborted(" + what + ")";
  // TODO(sbc): Should we remove printing and leave it up to whoever
  // catches the exception?
  err(what);
  ABORT = true;
  what += ". Build with -sASSERTIONS for more info.";
  // Use a wasm runtime error, because a JS error might be seen as a foreign
  // exception, which means we'd run destructors on it. We need the error to
  // simply make the program stop.
  // FIXME This approach does not work in Wasm EH because it currently does not assume
  // all RuntimeErrors are from traps; it decides whether a RuntimeError is from
  // a trap or not based on a hidden field within the object. So at the moment
  // we don't have a way of throwing a wasm trap from JS. TODO Make a JS API that
  // allows this in the wasm spec.
  // Suppress closure compiler warning here. Closure compiler's builtin extern
  // definition for WebAssembly.RuntimeError claims it takes no arguments even
  // though it can.
  // TODO(https://github.com/google/closure-compiler/pull/3913): Remove if/when upstream closure gets fixed.
  // See above, in the meantime, we resort to wasm code for trapping.
  // In case abort() is called before the module is initialized, wasmExports
  // and its exported '__trap' function is not available, in which case we throw
  // a RuntimeError.
  // We trap instead of throwing RuntimeError to prevent infinite-looping in
  // Wasm EH code (because RuntimeError is considered as a foreign exception and
  // caught by 'catch_all'), but in case throwing RuntimeError is fine because
  // the module has not even been instantiated, even less running.
  if (runtimeInitialized) {
    ___trap();
  }
  /** @suppress {checkTypes} */ var e = new WebAssembly.RuntimeError(what);
  // Throw the error whether or not MODULARIZE is set because abort is used
  // in code paths apart from instantiation where an exception is expected
  // to be thrown when abort is called.
  throw e;
}

var wasmBinaryFile;

function findWasmBinary() {
  return locateFile(dependencyFilename);
}

function getBinarySync(file) {
  if (file == wasmBinaryFile && wasmBinary) {
    return new Uint8Array(wasmBinary);
  }
  if (readBinary) {
    return readBinary(file);
  }
  // Throwing a plain string here, even though it not normally adviables since
  // this gets turning into an `abort` in instantiateArrayBuffer.
  throw "both async and sync fetching of the wasm failed";
}

async function getWasmBinary(binaryFile) {
  // If we don't have the binary yet, load it asynchronously using readAsync.
  if (!wasmBinary) {
    // Fetch the binary using readAsync
    try {
      var response = await readAsync(binaryFile);
      return new Uint8Array(response);
    } catch {}
  }
  // Otherwise, getBinarySync should be able to get it synchronously
  return getBinarySync(binaryFile);
}

async function instantiateArrayBuffer(binaryFile, imports) {
  try {
    var binary = await getWasmBinary(binaryFile);
    var instance = await WebAssembly.instantiate(binary, imports);
    return instance;
  } catch (reason) {
    err(`failed to asynchronously prepare wasm: ${reason}`);
    abort(reason);
  }
}

async function instantiateAsync(binary, binaryFile, imports) {
  if (!binary && !ENVIRONMENT_IS_NODE) {
    try {
      var response = fetch(binaryFile, {
        credentials: "same-origin"
      });
      var instantiationResult = await WebAssembly.instantiateStreaming(response, imports);
      return instantiationResult;
    } catch (reason) {
      // We expect the most common failure cause to be a bad MIME type for the binary,
      // in which case falling back to ArrayBuffer instantiation should work.
      err(`wasm streaming compile failed: ${reason}`);
      err("falling back to ArrayBuffer instantiation");
    }
  }
  return instantiateArrayBuffer(binaryFile, imports);
}

function getWasmImports() {
  // instrumenting imports is used in asyncify in two ways: to add assertions
  // that check for proper import use, and for ASYNCIFY=2 we use them to set up
  // the Promise API on the import side.
  Asyncify.instrumentWasmImports(wasmImports);
  // prepare imports
  var imports = {
    "env": wasmImports,
    "wasi_snapshot_preview1": wasmImports,
    "GOT.mem": new Proxy(wasmImports, GOTHandler),
    "GOT.func": new Proxy(wasmImports, GOTHandler)
  };
  return imports;
}

// Create the wasm instance.
// Receives the wasm imports, returns the exports.
async function createWasm() {
  // Load the wasm module and create an instance of using native support in the JS engine.
  // handle a generated wasm instance, receiving its exports and
  // performing other necessary setup
  /** @param {WebAssembly.Module=} module*/ function receiveInstance(instance, module) {
    wasmExports = instance.exports;
    // No relocation needed here.. but calling this just so that updateGOT is
    // called.
    var origExports = wasmExports = relocateExports(wasmExports);
    wasmExports = Asyncify.instrumentWasmExports(wasmExports);
    mergeLibSymbols(wasmExports, "main");
    var metadata = getDylinkMetadata(module);
    if (metadata.neededDynlibs) {
      dynamicLibraries = metadata.neededDynlibs.concat(dynamicLibraries);
    }
    assignWasmExports(wasmExports);
    updateGOT(origExports);
    Module["wasmExports"] = wasmExports;
    LDSO.init();
    loadDylibs();
    updateMemoryViews();
    removeRunDependency("wasm-instantiate");
    return wasmExports;
  }
  addRunDependency("wasm-instantiate");
  // Prefer streaming instantiation if available.
  function receiveInstantiationResult(result) {
    // 'result' is a ResultObject object which has both the module and instance.
    // receiveInstance() will swap in the exports (to Module.asm) so they can be called
    return receiveInstance(result["instance"], result["module"]);
  }
  var info = getWasmImports();
  // User shell pages can write their own Module.instantiateWasm = function(imports, successCallback) callback
  // to manually instantiate the Wasm module themselves. This allows pages to
  // run the instantiation parallel to any other async startup actions they are
  // performing.
  // Also pthreads and wasm workers initialize the wasm instance through this
  // path.
  if (Module["instantiateWasm"]) {
    return new Promise((resolve, reject) => {
      Module["instantiateWasm"](info, (inst, mod) => {
        resolve(receiveInstance(inst, mod));
      });
    });
  }
  wasmBinaryFile ??= findWasmBinary();
  var result = await instantiateAsync(wasmBinary, wasmBinaryFile, info);
  var exports = receiveInstantiationResult(result);
  return exports;
}

// With MAIN_MODULE + ASYNCIFY the normal method of placing stub functions in
// wasmImports for as-yet-undefined symbols doesn't work since ASYNCIFY then
// wraps these stub functions and we can't then replace them directly.  Instead
// the stub functions call into `asyncifyStubs` which gets populated by the
// dynamic linker as symbols are loaded.
var asyncifyStubs = {};

// end include: preamble.js
// Begin JS library code
class ExitStatus {
  name="ExitStatus";
  constructor(status) {
    this.message = `Program terminated with exit(${status})`;
    this.status = status;
  }
}
ExitStatus = class PHPExitStatus extends Error {
	constructor(status) {
		super(status);
		this.name = 'ExitStatus';
		this.message = 'Program terminated with exit(' + status + ')';
		this.status = status;
	}
};

var GOT = {};

var currentModuleWeakSymbols = new Set([]);

var GOTHandler = {
  get(obj, symName) {
    var rtn = GOT[symName];
    if (!rtn) {
      rtn = GOT[symName] = new WebAssembly.Global({
        "value": "i32",
        "mutable": true
      }, -1);
    }
    if (!currentModuleWeakSymbols.has(symName)) {
      // Any non-weak reference to a symbol marks it as `required`, which
      // enabled `reportUndefinedSymbols` to report undefined symbol errors
      // correctly.
      rtn.required = true;
    }
    return rtn;
  }
};

var callRuntimeCallbacks = callbacks => {
  while (callbacks.length > 0) {
    // Pass the module as the first argument.
    callbacks.shift()(Module);
  }
};

var onPostRuns = [];

var addOnPostRun = cb => onPostRuns.push(cb);

var onPreRuns = [];

var addOnPreRun = cb => onPreRuns.push(cb);

var runDependencies = 0;

var dependenciesFulfilled = null;

var removeRunDependency = id => {
  runDependencies--;
  Module["monitorRunDependencies"]?.(runDependencies);
  if (runDependencies == 0) {
    if (dependenciesFulfilled) {
      var callback = dependenciesFulfilled;
      dependenciesFulfilled = null;
      callback();
    }
  }
};

var addRunDependency = id => {
  runDependencies++;
  Module["monitorRunDependencies"]?.(runDependencies);
};

var UTF8Decoder = globalThis.TextDecoder && new TextDecoder;

var findStringEnd = (heapOrArray, idx, maxBytesToRead, ignoreNul) => {
  var maxIdx = idx + maxBytesToRead;
  if (ignoreNul) return maxIdx;
  // TextDecoder needs to know the byte length in advance, it doesn't stop on
  // null terminator by itself.
  // As a tiny code save trick, compare idx against maxIdx using a negation,
  // so that maxBytesToRead=undefined/NaN means Infinity.
  while (heapOrArray[idx] && !(idx >= maxIdx)) ++idx;
  return idx;
};

/**
     * Given a pointer 'idx' to a null-terminated UTF8-encoded string in the given
     * array that contains uint8 values, returns a copy of that string as a
     * Javascript String object.
     * heapOrArray is either a regular array, or a JavaScript typed array view.
     * @param {number=} idx
     * @param {number=} maxBytesToRead
     * @param {boolean=} ignoreNul - If true, the function will not stop on a NUL character.
     * @return {string}
     */ var UTF8ArrayToString = (heapOrArray, idx = 0, maxBytesToRead, ignoreNul) => {
  var endPtr = findStringEnd(heapOrArray, idx, maxBytesToRead, ignoreNul);
  // When using conditional TextDecoder, skip it for short strings as the overhead of the native call is not worth it.
  if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) {
    return UTF8Decoder.decode(heapOrArray.subarray(idx, endPtr));
  }
  var str = "";
  while (idx < endPtr) {
    // For UTF8 byte structure, see:
    // http://en.wikipedia.org/wiki/UTF-8#Description
    // https://www.ietf.org/rfc/rfc2279.txt
    // https://tools.ietf.org/html/rfc3629
    var u0 = heapOrArray[idx++];
    if (!(u0 & 128)) {
      str += String.fromCharCode(u0);
      continue;
    }
    var u1 = heapOrArray[idx++] & 63;
    if ((u0 & 224) == 192) {
      str += String.fromCharCode(((u0 & 31) << 6) | u1);
      continue;
    }
    var u2 = heapOrArray[idx++] & 63;
    if ((u0 & 240) == 224) {
      u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
    } else {
      u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | (heapOrArray[idx++] & 63);
    }
    if (u0 < 65536) {
      str += String.fromCharCode(u0);
    } else {
      var ch = u0 - 65536;
      str += String.fromCharCode(55296 | (ch >> 10), 56320 | (ch & 1023));
    }
  }
  return str;
};

var getDylinkMetadata = binary => {
  var offset = 0;
  var end = 0;
  function getU8() {
    return binary[offset++];
  }
  function getLEB() {
    var ret = 0;
    var mul = 1;
    while (1) {
      var byte = binary[offset++];
      ret += ((byte & 127) * mul);
      mul *= 128;
      if (!(byte & 128)) break;
    }
    return ret;
  }
  function getString() {
    var len = getLEB();
    offset += len;
    return UTF8ArrayToString(binary, offset - len, len);
  }
  function getStringList() {
    var count = getLEB();
    var rtn = [];
    while (count--) rtn.push(getString());
    return rtn;
  }
  /** @param {string=} message */ function failIf(condition, message) {
    if (condition) throw new Error(message);
  }
  if (binary instanceof WebAssembly.Module) {
    var dylinkSection = WebAssembly.Module.customSections(binary, "dylink.0");
    failIf(dylinkSection.length === 0, "need dylink section");
    binary = new Uint8Array(dylinkSection[0]);
    end = binary.length;
  } else {
    var int32View = new Uint32Array(new Uint8Array(binary.subarray(0, 24)).buffer);
    var magicNumberFound = int32View[0] == 1836278016;
    failIf(!magicNumberFound, "need to see wasm magic number");
    // \0asm
    // we should see the dylink custom section right after the magic number and wasm version
    failIf(binary[8] !== 0, "need the dylink section to be first");
    offset = 9;
    var section_size = getLEB();
    //section size
    end = offset + section_size;
    var name = getString();
    failIf(name !== "dylink.0");
  }
  var customSection = {
    neededDynlibs: [],
    tlsExports: new Set,
    weakImports: new Set,
    runtimePaths: []
  };
  var WASM_DYLINK_MEM_INFO = 1;
  var WASM_DYLINK_NEEDED = 2;
  var WASM_DYLINK_EXPORT_INFO = 3;
  var WASM_DYLINK_IMPORT_INFO = 4;
  var WASM_DYLINK_RUNTIME_PATH = 5;
  var WASM_SYMBOL_TLS = 256;
  var WASM_SYMBOL_BINDING_MASK = 3;
  var WASM_SYMBOL_BINDING_WEAK = 1;
  while (offset < end) {
    var subsectionType = getU8();
    var subsectionSize = getLEB();
    if (subsectionType === WASM_DYLINK_MEM_INFO) {
      customSection.memorySize = getLEB();
      customSection.memoryAlign = getLEB();
      customSection.tableSize = getLEB();
      customSection.tableAlign = getLEB();
    } else if (subsectionType === WASM_DYLINK_NEEDED) {
      customSection.neededDynlibs = getStringList();
    } else if (subsectionType === WASM_DYLINK_EXPORT_INFO) {
      var count = getLEB();
      while (count--) {
        var symname = getString();
        var flags = getLEB();
        if (flags & WASM_SYMBOL_TLS) {
          customSection.tlsExports.add(symname);
        }
      }
    } else if (subsectionType === WASM_DYLINK_IMPORT_INFO) {
      var count = getLEB();
      while (count--) {
        var modname = getString();
        var symname = getString();
        var flags = getLEB();
        if ((flags & WASM_SYMBOL_BINDING_MASK) == WASM_SYMBOL_BINDING_WEAK) {
          customSection.weakImports.add(symname);
        }
      }
    } else if (subsectionType === WASM_DYLINK_RUNTIME_PATH) {
      customSection.runtimePaths = getStringList();
    } else {
      // unknown subsection
      offset += subsectionSize;
    }
  }
  return customSection;
};

var newDSO = (name, handle, syms) => {
  var dso = {
    refcount: Infinity,
    name,
    exports: syms,
    global: true
  };
  LDSO.loadedLibsByName[name] = dso;
  if (handle != undefined) {
    LDSO.loadedLibsByHandle[handle] = dso;
  }
  return dso;
};

var LDSO = {
  loadedLibsByName: {},
  loadedLibsByHandle: {},
  init() {
    newDSO("__main__", 0, wasmImports);
  }
};

var alignMemory = (size, alignment) => Math.ceil(size / alignment) * alignment;

var getMemory = size => {
  // After the runtime is initialized, we must only use sbrk() normally.
  if (runtimeInitialized) {
    // Currently we don't support freeing of static data when modules are
    // unloaded via dlclose.  This function is tagged as `noleakcheck` to
    // avoid having this reported as leak.
    return _calloc(size, 1);
  }
  var ret = ___heap_base;
  // Keep __heap_base stack aligned.
  var end = ret + alignMemory(size, 16);
  ___heap_base = end;
  // After allocating the memory from the start of the heap we need to ensure
  // that once the program starts it doesn't use this region.  In relocatable
  // mode we can just update the __heap_base symbol that we are exporting to
  // the main module.
  // When not relocatable `__heap_base` is fixed and exported by the main
  // module, but we can update the `sbrk_ptr` value instead.  We call
  // `_emscripten_get_sbrk_ptr` knowing that it is safe to call prior to
  // runtime initialization (unlike, the higher level sbrk function)
  var sbrk_ptr = _emscripten_get_sbrk_ptr();
  HEAPU32[((sbrk_ptr) >> 2)] = end;
  return ret;
};

var isInternalSym = symName => [ "memory", "__memory_base", "__table_base", "__stack_pointer", "__indirect_function_table", "__cpp_exception", "__c_longjmp", "__wasm_apply_data_relocs", "__dso_handle", "__tls_size", "__tls_align", "__set_stack_limits", "_emscripten_tls_init", "__wasm_init_tls", "__wasm_call_ctors", "__start_em_asm", "__stop_em_asm", "__start_em_js", "__stop_em_js" ].includes(symName) || symName.startsWith("__em_js__");

var wasmTableMirror = [];

var getWasmTableEntry = funcPtr => {
  var func = wasmTableMirror[funcPtr];
  if (!func) {
    /** @suppress {checkTypes} */ wasmTableMirror[funcPtr] = func = wasmTable.get(funcPtr);
    if (Asyncify.isAsyncExport(func)) {
      wasmTableMirror[funcPtr] = func = Asyncify.makeAsyncFunction(func);
    }
  }
  return func;
};

var updateTableMap = (offset, count) => {
  if (functionsInTableMap) {
    for (var i = offset; i < offset + count; i++) {
      var item = getWasmTableEntry(i);
      // Ignore null values.
      if (item) {
        functionsInTableMap.set(item, i);
      }
    }
  }
};

var functionsInTableMap;

var getFunctionAddress = func => {
  // First, create the map if this is the first use.
  if (!functionsInTableMap) {
    functionsInTableMap = new WeakMap;
    updateTableMap(0, wasmTable.length);
  }
  return functionsInTableMap.get(func) || 0;
};

var freeTableIndexes = [];

var getEmptyTableSlot = () => {
  // Reuse a free index if there is one, otherwise grow.
  if (freeTableIndexes.length) {
    return freeTableIndexes.pop();
  }
  // Grow the table
  return wasmTable["grow"](1);
};

var setWasmTableEntry = (idx, func) => {
  /** @suppress {checkTypes} */ wasmTable.set(idx, func);
  // With ABORT_ON_WASM_EXCEPTIONS wasmTable.get is overridden to return wrapped
  // functions so we need to call it here to retrieve the potential wrapper correctly
  // instead of just storing 'func' directly into wasmTableMirror
  /** @suppress {checkTypes} */ wasmTableMirror[idx] = wasmTable.get(idx);
};

var uleb128EncodeWithLen = arr => {
  const n = arr.length;
  // Note: this LEB128 length encoding produces extra byte for n < 128,
  // but we don't care as it's only used in a temporary representation.
  return [ (n % 128) | 128, n >> 7, ...arr ];
};

var wasmTypeCodes = {
  "i": 127,
  // i32
  "p": 127,
  // i32
  "j": 126,
  // i64
  "f": 125,
  // f32
  "d": 124,
  // f64
  "e": 111
};

var generateTypePack = types => uleb128EncodeWithLen(Array.from(types, type => {
  var code = wasmTypeCodes[type];
  return code;
}));

var convertJsFunctionToWasm = (func, sig) => {
  // Rest of the module is static
  var bytes = Uint8Array.of(0, 97, 115, 109, // magic ("\0asm")
  1, 0, 0, 0, // version: 1
  1, // Type section code
  // The module is static, with the exception of the type section, which is
  // generated based on the signature passed in.
  ...uleb128EncodeWithLen([ 1, // count: 1
  96, // param types
  ...generateTypePack(sig.slice(1)), // return types (for now only supporting [] if `void` and single [T] otherwise)
  ...generateTypePack(sig[0] === "v" ? "" : sig[0]) ]), // The rest of the module is static
  2, 7, // import section
  // (import "e" "f" (func 0 (type 0)))
  1, 1, 101, 1, 102, 0, 0, 7, 5, // export section
  // (export "f" (func 0 (type 0)))
  1, 1, 102, 0, 0);
  // We can compile this wasm module synchronously because it is very small.
  // This accepts an import (at "e.f"), that it reroutes to an export (at "f")
  var module = new WebAssembly.Module(bytes);
  var instance = new WebAssembly.Instance(module, {
    "e": {
      "f": func
    }
  });
  var wrappedFunc = instance.exports["f"];
  return wrappedFunc;
};

/** @param {string=} sig */ var addFunction = (func, sig) => {
  // Check if the function is already in the table, to ensure each function
  // gets a unique index.
  var rtn = getFunctionAddress(func);
  if (rtn) {
    return rtn;
  }
  // It's not in the table, add it now.
  var ret = getEmptyTableSlot();
  // Set the new value.
  try {
    // Attempting to call this with JS function will cause of table.set() to fail
    setWasmTableEntry(ret, func);
  } catch (err) {
    if (!(err instanceof TypeError)) {
      throw err;
    }
    var wrapped = convertJsFunctionToWasm(func, sig);
    setWasmTableEntry(ret, wrapped);
  }
  functionsInTableMap.set(func, ret);
  return ret;
};

/** @param {boolean=} replace */ var updateGOT = (exports, replace) => {
  for (var symName in exports) {
    if (isInternalSym(symName)) {
      continue;
    }
    var value = exports[symName];
    var existingEntry = GOT[symName] && GOT[symName].value != -1;
    if (replace || !existingEntry) {
      var newValue;
      if (typeof value == "function") {
        newValue = addFunction(value);
      } else if (typeof value == "number") {
        newValue = value;
      } else {
        // The GOT can only contain addresses (i.e data addresses or function
        // addresses so we currently ignore other types export here.
        continue;
      }
      GOT[symName] ??= new WebAssembly.Global({
        "value": "i32",
        "mutable": true
      });
      GOT[symName].value = newValue;
    }
  }
};

var isImmutableGlobal = val => {
  if (val instanceof WebAssembly.Global) {
    try {
      val.value = val.value;
    } catch {
      return true;
    }
  }
  return false;
};

var relocateExports = (exports, memoryBase = 0) => {
  function relocateExport(name, value) {
    // Detect immuable wasm global exports. These represent data addresses
    // which are relative to `memoryBase`
    if (isImmutableGlobal(value)) {
      return value.value + memoryBase;
    }
    // Return unmodified value (no relocation required).
    return value;
  }
  var relocated = {};
  for (var e in exports) {
    relocated[e] = relocateExport(e, exports[e]);
  }
  return relocated;
};

var isSymbolDefined = symName => {
  // Ignore 'stub' symbols that are auto-generated as part of the original
  // `wasmImports` used to instantiate the main module.
  var existing = wasmImports[symName];
  if (!existing || existing.stub) {
    return false;
  }
  // Even if a symbol exists in wasmImports, and is not itself a stub, it
  // could be an ASYNCIFY wrapper function that wraps a stub function.
  if (symName in asyncifyStubs && !asyncifyStubs[symName]) {
    return false;
  }
  return true;
};

var resolveGlobalSymbol = (symName, direct = false) => {
  var sym;
  if (isSymbolDefined(symName)) {
    sym = wasmImports[symName];
  }
  return {
    sym,
    name: symName
  };
};

var onPostCtors = [];

var addOnPostCtor = cb => onPostCtors.push(cb);

/**
     * Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the
     * emscripten HEAP, returns a copy of that string as a Javascript String object.
     *
     * @param {number} ptr
     * @param {number=} maxBytesToRead - An optional length that specifies the
     *   maximum number of bytes to read. You can omit this parameter to scan the
     *   string until the first 0 byte. If maxBytesToRead is passed, and the string
     *   at [ptr, ptr+maxBytesToReadr[ contains a null byte in the middle, then the
     *   string will cut short at that byte index.
     * @param {boolean=} ignoreNul - If true, the function will not stop on a NUL character.
     * @return {string}
     */ var UTF8ToString = (ptr, maxBytesToRead, ignoreNul) => ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead, ignoreNul) : "";

/**
      * @param {string=} libName
      * @param {Object=} localScope
      * @param {number=} handle
      */ var loadWebAssemblyModule = (binary, flags, libName, localScope, handle) => {
  var metadata = getDylinkMetadata(binary);
  // loadModule loads the wasm module after all its dependencies have been loaded.
  // can be called both sync/async.
  function loadModule() {
    // alignments are powers of 2
    var memAlign = Math.pow(2, metadata.memoryAlign);
    // prepare memory
    var memoryBase = metadata.memorySize ? alignMemory(getMemory(metadata.memorySize + memAlign), memAlign) : 0;
    // TODO: add to cleanups
    var tableBase = metadata.tableSize ? wasmTable.length : 0;
    if (handle) {
      HEAP8[(handle) + (8)] = 1;
      HEAPU32[(((handle) + (12)) >> 2)] = memoryBase;
      HEAP32[(((handle) + (16)) >> 2)] = metadata.memorySize;
      HEAPU32[(((handle) + (20)) >> 2)] = tableBase;
      HEAP32[(((handle) + (24)) >> 2)] = metadata.tableSize;
    }
    if (metadata.tableSize) {
      wasmTable.grow(metadata.tableSize);
    }
    // This is the export map that we ultimately return.  We declare it here
    // so it can be used within resolveSymbol.  We resolve symbols against
    // this local symbol map in the case there they are not present on the
    // global Module object.  We need this fallback because Modules sometime
    // need to import their own symbols
    var moduleExports;
    function resolveSymbol(sym) {
      var resolved = resolveGlobalSymbol(sym).sym;
      if (!resolved && localScope) {
        resolved = localScope[sym];
      }
      if (!resolved) {
        resolved = moduleExports[sym];
      }
      return resolved;
    }
    // TODO kill ↓↓↓ (except "symbols local to this module", it will likely be
    // not needed if we require that if A wants symbols from B it has to link
    // to B explicitly: similarly to -Wl,--no-undefined)
    // wasm dynamic libraries are pure wasm, so they cannot assist in
    // their own loading. When side module A wants to import something
    // provided by a side module B that is loaded later, we need to
    // add a layer of indirection, but worse, we can't even tell what
    // to add the indirection for, without inspecting what A's imports
    // are. To do that here, we use a JS proxy (another option would
    // be to inspect the binary directly).
    var proxyHandler = {
      get(stubs, prop) {
        // symbols that should be local to this module
        switch (prop) {
         case "__memory_base":
          return memoryBase;

         case "__table_base":
          return tableBase;
        }
        if (prop in wasmImports && !wasmImports[prop].stub) {
          // No stub needed, symbol already exists in symbol table
          var res = wasmImports[prop];
          // Asyncify wraps exports, and we need to look through those wrappers.
          if (res.orig) {
            res = res.orig;
          }
          return res;
        }
        // Return a stub function that will resolve the symbol
        // when first called.
        if (!(prop in stubs)) {
          var resolved;
          stubs[prop] = (...args) => {
            resolved ||= resolveSymbol(prop);
            return resolved(...args);
          };
        }
        return stubs[prop];
      }
    };
    var proxy = new Proxy({}, proxyHandler);
    currentModuleWeakSymbols = metadata.weakImports;
    var info = {
      "GOT.mem": new Proxy({}, GOTHandler),
      "GOT.func": new Proxy({}, GOTHandler),
      "env": proxy,
      "wasi_snapshot_preview1": proxy
    };
    function postInstantiation(module, instance) {
      // add new entries to functionsInTableMap
      updateTableMap(tableBase, metadata.tableSize);
      moduleExports = relocateExports(instance.exports, memoryBase);
      updateGOT(moduleExports);
      moduleExports = Asyncify.instrumentWasmExports(moduleExports);
      if (!flags.allowUndefined) {
        reportUndefinedSymbols();
      }
      function addEmAsm(addr, body) {
        var args = [];
        for (var arity = 0; ;arity++) {
          var argName = "$" + arity;
          if (!body.includes(argName)) break;
          args.push(argName);
        }
        args = args.join(",");
        var func = `(${args}) => { ${body} };`;
        ASM_CONSTS[start] = eval(func);
      }
      // Add any EM_ASM function that exist in the side module
      if ("__start_em_asm" in moduleExports) {
        var start = moduleExports["__start_em_asm"];
        var stop = moduleExports["__stop_em_asm"];
        while (start < stop) {
          var jsString = UTF8ToString(start);
          addEmAsm(start, jsString);
          start = HEAPU8.indexOf(0, start) + 1;
        }
      }
      function addEmJs(name, cSig, body) {
        // The signature here is a C signature (e.g. "(int foo, char* bar)").
        // See `create_em_js` in emcc.py` for the build-time version of this
        // code.
        var jsArgs = [];
        cSig = cSig.slice(1, -1);
        if (cSig != "void") {
          cSig = cSig.split(",");
          for (var arg of cSig) {
            var jsArg = arg.split(" ").pop();
            jsArgs.push(jsArg.replace(/\*/g, ""));
          }
        }
        var func = `(${jsArgs}) => ${body};`;
        moduleExports[name] = eval(func);
      }
      for (var name in moduleExports) {
        if (name.startsWith("__em_js__")) {
          var start = moduleExports[name];
          var jsString = UTF8ToString(start);
          // EM_JS strings are stored in the data section in the form
          // SIG<::>BODY.
          var [sig, body] = jsString.split("<::>");
          addEmJs(name.replace("__em_js__", ""), sig, body);
          delete moduleExports[name];
        }
      }
      // initialize the module
      var applyRelocs = moduleExports["__wasm_apply_data_relocs"];
      if (applyRelocs) {
        if (runtimeInitialized) {
          applyRelocs();
        } else {
          __RELOC_FUNCS__.push(applyRelocs);
        }
      }
      var init = moduleExports["__wasm_call_ctors"];
      if (init) {
        if (runtimeInitialized) {
          init();
        } else {
          // we aren't ready to run compiled code yet
          addOnPostCtor(init);
        }
      }
      return moduleExports;
    }
    if (flags.loadAsync) {
      return (async () => {
        var instance;
        if (binary instanceof WebAssembly.Module) {
          instance = new WebAssembly.Instance(binary, info);
        } else {
          // Destructuring assignment without declaration has to be wrapped
          // with parens or parser will treat the l-value as an object
          // literal instead.
          (((({module: binary, instance} = await WebAssembly.instantiate(binary, info)))));
        }
        return postInstantiation(binary, instance);
      })();
    }
    var module = binary instanceof WebAssembly.Module ? binary : new WebAssembly.Module(binary);
    var instance = new WebAssembly.Instance(module, info);
    return postInstantiation(module, instance);
  }
  // We need to set rpath in flags based on the current library's rpath.
  // We can't mutate flags or else if a depends on b and c and b depends on d,
  // then c will be loaded with b's rpath instead of a's.
  flags = {
    ...flags,
    rpath: {
      parentLibPath: libName,
      paths: metadata.runtimePaths
    }
  };
  // now load needed libraries and the module itself.
  if (flags.loadAsync) {
    return metadata.neededDynlibs.reduce((chain, dynNeeded) => chain.then(() => loadDynamicLibrary(dynNeeded, flags, localScope)), Promise.resolve()).then(loadModule);
  }
  for (var needed of metadata.neededDynlibs) {
    loadDynamicLibrary(needed, flags, localScope);
  }
  return loadModule();
};

var mergeLibSymbols = (exports, libName) => {
  // add symbols into global namespace TODO: weak linking etc.
  for (var [sym, exp] of Object.entries(exports)) {
    // When RTLD_GLOBAL is enabled, the symbols defined by this shared object
    // will be made available for symbol resolution of subsequently loaded
    // shared objects.
    // We should copy the symbols (which include methods and variables) from
    // SIDE_MODULE to MAIN_MODULE.
    const setImport = target => {
      if (target in asyncifyStubs) {
        asyncifyStubs[target] = exp;
      }
      if (!isSymbolDefined(target)) {
        wasmImports[target] = exp;
      }
    };
    setImport(sym);
    // Special case for handling of main symbol:  If a side module exports
    // `main` that also acts a definition for `__main_argc_argv` and vice
    // versa.
    const main_alias = "__main_argc_argv";
    if (sym == "main") {
      setImport(main_alias);
    }
    if (sym == main_alias) {
      setImport("main");
    }
  }
};

var asyncLoad = async url => {
  var arrayBuffer = await readAsync(url);
  return new Uint8Array(arrayBuffer);
};

var preloadPlugins = [];

var registerWasmPlugin = () => {
  // Use string keys here for public methods to avoid minification since the
  // plugin consumer also uses string keys.
  var wasmPlugin = {
    promiseChainEnd: Promise.resolve(),
    "canHandle": name => !Module["noWasmDecoding"] && name.endsWith(".so"),
    "handle": async (byteArray, name) => // loadWebAssemblyModule can not load modules out-of-order, so rather
    // than just running the promises in parallel, this makes a chain of
    // promises to run in series.
    wasmPlugin.promiseChainEnd = wasmPlugin.promiseChainEnd.then(async () => {
      try {
        var exports = await loadWebAssemblyModule(byteArray, {
          loadAsync: true,
          nodelete: true
        }, name, {});
      } catch (error) {
        throw new Error(`failed to instantiate wasm: ${name}: ${error}`);
      }
      preloadedWasm[name] = exports;
      return byteArray;
    })
  };
  preloadPlugins.push(wasmPlugin);
};

var preloadedWasm = {};

var PATH = {
  isAbs: path => path.charAt(0) === "/",
  splitPath: filename => {
    var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
    return splitPathRe.exec(filename).slice(1);
  },
  normalizeArray: (parts, allowAboveRoot) => {
    // if the path tries to go above the root, `up` ends up > 0
    var up = 0;
    for (var i = parts.length - 1; i >= 0; i--) {
      var last = parts[i];
      if (last === ".") {
        parts.splice(i, 1);
      } else if (last === "..") {
        parts.splice(i, 1);
        up++;
      } else if (up) {
        parts.splice(i, 1);
        up--;
      }
    }
    // if the path is allowed to go above the root, restore leading ..s
    if (allowAboveRoot) {
      for (;up; up--) {
        parts.unshift("..");
      }
    }
    return parts;
  },
  normalize: path => {
    var isAbsolute = PATH.isAbs(path), trailingSlash = path.slice(-1) === "/";
    // Normalize the path
    path = PATH.normalizeArray(path.split("/").filter(p => !!p), !isAbsolute).join("/");
    if (!path && !isAbsolute) {
      path = ".";
    }
    if (path && trailingSlash) {
      path += "/";
    }
    return (isAbsolute ? "/" : "") + path;
  },
  dirname: path => {
    var result = PATH.splitPath(path), root = result[0], dir = result[1];
    if (!root && !dir) {
      // No dirname whatsoever
      return ".";
    }
    if (dir) {
      // It has a dirname, strip trailing slash
      dir = dir.slice(0, -1);
    }
    return root + dir;
  },
  basename: path => path && path.match(/([^\/]+|\/)\/*$/)[1],
  join: (...paths) => PATH.normalize(paths.join("/")),
  join2: (l, r) => PATH.normalize(l + "/" + r)
};

var replaceORIGIN = (parentLibName, rpath) => {
  if (rpath.startsWith("$ORIGIN")) {
    // TODO: what to do if we only know the relative path of the file? It will return "." here.
    var origin = PATH.dirname(parentLibName);
    return rpath.replace("$ORIGIN", origin);
  }
  return rpath;
};

var stackSave = () => _emscripten_stack_get_current();

var stackRestore = val => __emscripten_stack_restore(val);

var withStackSave = f => {
  var stack = stackSave();
  var ret = f();
  stackRestore(stack);
  return ret;
};

var stackAlloc = sz => __emscripten_stack_alloc(sz);

var lengthBytesUTF8 = str => {
  var len = 0;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code
    // unit, not a Unicode code point of the character! So decode
    // UTF16->UTF32->UTF8.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var c = str.charCodeAt(i);
    // possibly a lead surrogate
    if (c <= 127) {
      len++;
    } else if (c <= 2047) {
      len += 2;
    } else if (c >= 55296 && c <= 57343) {
      len += 4;
      ++i;
    } else {
      len += 3;
    }
  }
  return len;
};

var stringToUTF8Array = (str, heap, outIdx, maxBytesToWrite) => {
  // Parameter maxBytesToWrite is not optional. Negative values, 0, null,
  // undefined and false each don't write out any bytes.
  if (!(maxBytesToWrite > 0)) return 0;
  var startIdx = outIdx;
  var endIdx = outIdx + maxBytesToWrite - 1;
  // -1 for string null terminator.
  for (var i = 0; i < str.length; ++i) {
    // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description
    // and https://www.ietf.org/rfc/rfc2279.txt
    // and https://tools.ietf.org/html/rfc3629
    var u = str.codePointAt(i);
    if (u <= 127) {
      if (outIdx >= endIdx) break;
      heap[outIdx++] = u;
    } else if (u <= 2047) {
      if (outIdx + 1 >= endIdx) break;
      heap[outIdx++] = 192 | (u >> 6);
      heap[outIdx++] = 128 | (u & 63);
    } else if (u <= 65535) {
      if (outIdx + 2 >= endIdx) break;
      heap[outIdx++] = 224 | (u >> 12);
      heap[outIdx++] = 128 | ((u >> 6) & 63);
      heap[outIdx++] = 128 | (u & 63);
    } else {
      if (outIdx + 3 >= endIdx) break;
      heap[outIdx++] = 240 | (u >> 18);
      heap[outIdx++] = 128 | ((u >> 12) & 63);
      heap[outIdx++] = 128 | ((u >> 6) & 63);
      heap[outIdx++] = 128 | (u & 63);
      // Gotcha: if codePoint is over 0xFFFF, it is represented as a surrogate pair in UTF-16.
      // We need to manually skip over the second code unit for correct iteration.
      i++;
    }
  }
  // Null-terminate the pointer to the buffer.
  heap[outIdx] = 0;
  return outIdx - startIdx;
};

var stringToUTF8 = (str, outPtr, maxBytesToWrite) => stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);

var stringToUTF8OnStack = str => {
  var size = lengthBytesUTF8(str) + 1;
  var ret = stackAlloc(size);
  stringToUTF8(str, ret, size);
  return ret;
};

var initRandomFill = () => view => crypto.getRandomValues(view);

var randomFill = view => {
  // Lazily init on the first invocation.
  (randomFill = initRandomFill())(view);
};

var PATH_FS = {
  resolve: (...args) => {
    var resolvedPath = "", resolvedAbsolute = false;
    for (var i = args.length - 1; i >= -1 && !resolvedAbsolute; i--) {
      var path = (i >= 0) ? args[i] : FS.cwd();
      // Skip empty and invalid entries
      if (typeof path != "string") {
        throw new TypeError("Arguments to path.resolve must be strings");
      } else if (!path) {
        return "";
      }
      resolvedPath = path + "/" + resolvedPath;
      resolvedAbsolute = PATH.isAbs(path);
    }
    // At this point the path should be resolved to a full absolute path, but
    // handle relative paths to be safe (might happen when process.cwd() fails)
    resolvedPath = PATH.normalizeArray(resolvedPath.split("/").filter(p => !!p), !resolvedAbsolute).join("/");
    return ((resolvedAbsolute ? "/" : "") + resolvedPath) || ".";
  },
  relative: (from, to) => {
    from = PATH_FS.resolve(from).slice(1);
    to = PATH_FS.resolve(to).slice(1);
    function trim(arr) {
      var start = 0;
      for (;start < arr.length; start++) {
        if (arr[start] !== "") break;
      }
      var end = arr.length - 1;
      for (;end >= 0; end--) {
        if (arr[end] !== "") break;
      }
      if (start > end) return [];
      return arr.slice(start, end - start + 1);
    }
    var fromParts = trim(from.split("/"));
    var toParts = trim(to.split("/"));
    var length = Math.min(fromParts.length, toParts.length);
    var samePartsLength = length;
    for (var i = 0; i < length; i++) {
      if (fromParts[i] !== toParts[i]) {
        samePartsLength = i;
        break;
      }
    }
    var outputParts = [];
    for (var i = samePartsLength; i < fromParts.length; i++) {
      outputParts.push("..");
    }
    outputParts = outputParts.concat(toParts.slice(samePartsLength));
    return outputParts.join("/");
  }
};

var FS_stdin_getChar_buffer = [];

/** @type {function(string, boolean=, number=)} */ var intArrayFromString = (stringy, dontAddNull, length) => {
  var len = length > 0 ? length : lengthBytesUTF8(stringy) + 1;
  var u8array = new Array(len);
  var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
  if (dontAddNull) u8array.length = numBytesWritten;
  return u8array;
};

var FS_stdin_getChar = () => {
  if (!FS_stdin_getChar_buffer.length) {
    var result = null;
    if (ENVIRONMENT_IS_NODE) {
      // we will read data by chunks of BUFSIZE
      var BUFSIZE = 256;
      var buf = Buffer.alloc(BUFSIZE);
      var bytesRead = 0;
      // For some reason we must suppress a closure warning here, even though
      // fd definitely exists on process.stdin, and is even the proper way to
      // get the fd of stdin,
      // https://github.com/nodejs/help/issues/2136#issuecomment-523649904
      // This started to happen after moving this logic out of library_tty.js,
      // so it is related to the surrounding code in some unclear manner.
      /** @suppress {missingProperties} */ var fd = process.stdin.fd;
      try {
        bytesRead = fs.readSync(fd, buf, 0, BUFSIZE);
      } catch (e) {
        // Cross-platform differences: on Windows, reading EOF throws an
        // exception, but on other OSes, reading EOF returns 0. Uniformize
        // behavior by treating the EOF exception to return 0.
        if (e.toString().includes("EOF")) bytesRead = 0; else throw e;
      }
      if (bytesRead > 0) {
        result = buf.slice(0, bytesRead).toString("utf-8");
      }
    } else {}
    if (!result) {
      return null;
    }
    FS_stdin_getChar_buffer = intArrayFromString(result, true);
  }
  return FS_stdin_getChar_buffer.shift();
};

var TTY = {
  ttys: [],
  init() {},
  shutdown() {},
  register(dev, ops) {
    TTY.ttys[dev] = {
      input: [],
      output: [],
      ops
    };
    FS.registerDevice(dev, TTY.stream_ops);
  },
  stream_ops: {
    open(stream) {
      var tty = TTY.ttys[stream.node.rdev];
      if (!tty) {
        throw new FS.ErrnoError(43);
      }
      stream.tty = tty;
      stream.seekable = false;
    },
    close(stream) {
      // flush any pending line data
      stream.tty.ops.fsync(stream.tty);
    },
    fsync(stream) {
      stream.tty.ops.fsync(stream.tty);
    },
    read(stream, buffer, offset, length, pos) {
      if (!stream.tty || !stream.tty.ops.get_char) {
        throw new FS.ErrnoError(60);
      }
      var bytesRead = 0;
      for (var i = 0; i < length; i++) {
        var result;
        try {
          result = stream.tty.ops.get_char(stream.tty);
        } catch (e) {
          throw new FS.ErrnoError(29);
        }
        if (result === undefined && bytesRead === 0) {
          throw new FS.ErrnoError(6);
        }
        if (result === null || result === undefined) break;
        bytesRead++;
        buffer[offset + i] = result;
      }
      if (bytesRead) {
        stream.node.atime = Date.now();
      }
      return bytesRead;
    },
    write(stream, buffer, offset, length, pos) {
      if (!stream.tty || !stream.tty.ops.put_char) {
        throw new FS.ErrnoError(60);
      }
      try {
        for (var i = 0; i < length; i++) {
          stream.tty.ops.put_char(stream.tty, buffer[offset + i]);
        }
      } catch (e) {
        throw new FS.ErrnoError(29);
      }
      if (length) {
        stream.node.mtime = stream.node.ctime = Date.now();
      }
      return i;
    }
  },
  default_tty_ops: {
    get_char(tty) {
      return FS_stdin_getChar();
    },
    put_char(tty, val) {
      if (val === null || val === 10) {
        out(UTF8ArrayToString(tty.output));
        tty.output = [];
      } else {
        if (val != 0) tty.output.push(val);
      }
    },
    fsync(tty) {
      if (tty.output?.length > 0) {
        out(UTF8ArrayToString(tty.output));
        tty.output = [];
      }
    },
    ioctl_tcgets(tty) {
      // typical setting
      return {
        c_iflag: 25856,
        c_oflag: 5,
        c_cflag: 191,
        c_lflag: 35387,
        c_cc: [ 3, 28, 127, 21, 4, 0, 1, 0, 17, 19, 26, 0, 18, 15, 23, 22, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ]
      };
    },
    ioctl_tcsets(tty, optional_actions, data) {
      // currently just ignore
      return 0;
    },
    ioctl_tiocgwinsz(tty) {
      return [ 24, 80 ];
    }
  },
  default_tty1_ops: {
    put_char(tty, val) {
      if (val === null || val === 10) {
        err(UTF8ArrayToString(tty.output));
        tty.output = [];
      } else {
        if (val != 0) tty.output.push(val);
      }
    },
    fsync(tty) {
      if (tty.output?.length > 0) {
        err(UTF8ArrayToString(tty.output));
        tty.output = [];
      }
    }
  }
};

var zeroMemory = (ptr, size) => HEAPU8.fill(0, ptr, ptr + size);

var mmapAlloc = size => {
  size = alignMemory(size, 65536);
  var ptr = _emscripten_builtin_memalign(65536, size);
  if (ptr) zeroMemory(ptr, size);
  return ptr;
};

var MEMFS = {
  ops_table: null,
  mount(mount) {
    return MEMFS.createNode(null, "/", 16895, 0);
  },
  createNode(parent, name, mode, dev) {
    if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
      // no supported
      throw new FS.ErrnoError(63);
    }
    MEMFS.ops_table ||= {
      dir: {
        node: {
          getattr: MEMFS.node_ops.getattr,
          setattr: MEMFS.node_ops.setattr,
          lookup: MEMFS.node_ops.lookup,
          mknod: MEMFS.node_ops.mknod,
          rename: MEMFS.node_ops.rename,
          unlink: MEMFS.node_ops.unlink,
          rmdir: MEMFS.node_ops.rmdir,
          readdir: MEMFS.node_ops.readdir,
          symlink: MEMFS.node_ops.symlink
        },
        stream: {
          llseek: MEMFS.stream_ops.llseek
        }
      },
      file: {
        node: {
          getattr: MEMFS.node_ops.getattr,
          setattr: MEMFS.node_ops.setattr
        },
        stream: {
          llseek: MEMFS.stream_ops.llseek,
          read: MEMFS.stream_ops.read,
          write: MEMFS.stream_ops.write,
          mmap: MEMFS.stream_ops.mmap,
          msync: MEMFS.stream_ops.msync
        }
      },
      link: {
        node: {
          getattr: MEMFS.node_ops.getattr,
          setattr: MEMFS.node_ops.setattr,
          readlink: MEMFS.node_ops.readlink
        },
        stream: {}
      },
      chrdev: {
        node: {
          getattr: MEMFS.node_ops.getattr,
          setattr: MEMFS.node_ops.setattr
        },
        stream: FS.chrdev_stream_ops
      }
    };
    var node = FS.createNode(parent, name, mode, dev);
    if (FS.isDir(node.mode)) {
      node.node_ops = MEMFS.ops_table.dir.node;
      node.stream_ops = MEMFS.ops_table.dir.stream;
      node.contents = {};
    } else if (FS.isFile(node.mode)) {
      node.node_ops = MEMFS.ops_table.file.node;
      node.stream_ops = MEMFS.ops_table.file.stream;
      node.usedBytes = 0;
      // The actual number of bytes used in the typed array, as opposed to contents.length which gives the whole capacity.
      // When the byte data of the file is populated, this will point to either a typed array, or a normal JS array. Typed arrays are preferred
      // for performance, and used by default. However, typed arrays are not resizable like normal JS arrays are, so there is a small disk size
      // penalty involved for appending file writes that continuously grow a file similar to std::vector capacity vs used -scheme.
      node.contents = null;
    } else if (FS.isLink(node.mode)) {
      node.node_ops = MEMFS.ops_table.link.node;
      node.stream_ops = MEMFS.ops_table.link.stream;
    } else if (FS.isChrdev(node.mode)) {
      node.node_ops = MEMFS.ops_table.chrdev.node;
      node.stream_ops = MEMFS.ops_table.chrdev.stream;
    }
    node.atime = node.mtime = node.ctime = Date.now();
    // add the new node to the parent
    if (parent) {
      parent.contents[name] = node;
      parent.atime = parent.mtime = parent.ctime = node.atime;
    }
    return node;
  },
  getFileDataAsTypedArray(node) {
    if (!node.contents) return new Uint8Array(0);
    if (node.contents.subarray) return node.contents.subarray(0, node.usedBytes);
    // Make sure to not return excess unused bytes.
    return new Uint8Array(node.contents);
  },
  expandFileStorage(node, newCapacity) {
    var prevCapacity = node.contents ? node.contents.length : 0;
    if (prevCapacity >= newCapacity) return;
    // No need to expand, the storage was already large enough.
    // Don't expand strictly to the given requested limit if it's only a very small increase, but instead geometrically grow capacity.
    // For small filesizes (<1MB), perform size*2 geometric increase, but for large sizes, do a much more conservative size*1.125 increase to
    // avoid overshooting the allocation cap by a very large margin.
    var CAPACITY_DOUBLING_MAX = 1024 * 1024;
    newCapacity = Math.max(newCapacity, (prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2 : 1.125)) >>> 0);
    if (prevCapacity != 0) newCapacity = Math.max(newCapacity, 256);
    // At minimum allocate 256b for each file when expanding.
    var oldContents = node.contents;
    node.contents = new Uint8Array(newCapacity);
    // Allocate new storage.
    if (node.usedBytes > 0) node.contents.set(oldContents.subarray(0, node.usedBytes), 0);
  },
  resizeFileStorage(node, newSize) {
    if (node.usedBytes == newSize) return;
    if (newSize == 0) {
      node.contents = null;
      // Fully decommit when requesting a resize to zero.
      node.usedBytes = 0;
    } else {
      var oldContents = node.contents;
      node.contents = new Uint8Array(newSize);
      // Allocate new storage.
      if (oldContents) {
        node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes)));
      }
      node.usedBytes = newSize;
    }
  },
  node_ops: {
    getattr(node) {
      var attr = {};
      // device numbers reuse inode numbers.
      attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
      attr.ino = node.id;
      attr.mode = node.mode;
      attr.nlink = 1;
      attr.uid = 0;
      attr.gid = 0;
      attr.rdev = node.rdev;
      if (FS.isDir(node.mode)) {
        attr.size = 4096;
      } else if (FS.isFile(node.mode)) {
        attr.size = node.usedBytes;
      } else if (FS.isLink(node.mode)) {
        attr.size = node.link.length;
      } else {
        attr.size = 0;
      }
      attr.atime = new Date(node.atime);
      attr.mtime = new Date(node.mtime);
      attr.ctime = new Date(node.ctime);
      // NOTE: In our implementation, st_blocks = Math.ceil(st_size/st_blksize),
      //       but this is not required by the standard.
      attr.blksize = 4096;
      attr.blocks = Math.ceil(attr.size / attr.blksize);
      return attr;
    },
    setattr(node, attr) {
      for (const key of [ "mode", "atime", "mtime", "ctime" ]) {
        if (attr[key] != null) {
          node[key] = attr[key];
        }
      }
      if (attr.size !== undefined) {
        MEMFS.resizeFileStorage(node, attr.size);
      }
    },
    lookup(parent, name) {
      // This error may happen quite a bit. To avoid overhead we reuse it (and
      // suffer a lack of stack info).
      if (!MEMFS.doesNotExistError) {
        MEMFS.doesNotExistError = new FS.ErrnoError(44);
        /** @suppress {checkTypes} */ MEMFS.doesNotExistError.stack = "<generic error, no stack>";
      }
      throw MEMFS.doesNotExistError;
    },
    mknod(parent, name, mode, dev) {
      return MEMFS.createNode(parent, name, mode, dev);
    },
    rename(old_node, new_dir, new_name) {
      var new_node;
      try {
        new_node = FS.lookupNode(new_dir, new_name);
      } catch (e) {}
      if (new_node) {
        if (FS.isDir(old_node.mode)) {
          // if we're overwriting a directory at new_name, make sure it's empty.
          for (var i in new_node.contents) {
            throw new FS.ErrnoError(55);
          }
        }
        FS.hashRemoveNode(new_node);
      }
      // do the internal rewiring
      delete old_node.parent.contents[old_node.name];
      new_dir.contents[new_name] = old_node;
      old_node.name = new_name;
      new_dir.ctime = new_dir.mtime = old_node.parent.ctime = old_node.parent.mtime = Date.now();
    },
    unlink(parent, name) {
      delete parent.contents[name];
      parent.ctime = parent.mtime = Date.now();
    },
    rmdir(parent, name) {
      var node = FS.lookupNode(parent, name);
      for (var i in node.contents) {
        throw new FS.ErrnoError(55);
      }
      delete parent.contents[name];
      parent.ctime = parent.mtime = Date.now();
    },
    readdir(node) {
      return [ ".", "..", ...Object.keys(node.contents) ];
    },
    symlink(parent, newname, oldpath) {
      var node = MEMFS.createNode(parent, newname, 511 | 40960, 0);
      node.link = oldpath;
      return node;
    },
    readlink(node) {
      if (!FS.isLink(node.mode)) {
        throw new FS.ErrnoError(28);
      }
      return node.link;
    }
  },
  stream_ops: {
    read(stream, buffer, offset, length, position) {
      var contents = stream.node.contents;
      if (position >= stream.node.usedBytes) return 0;
      var size = Math.min(stream.node.usedBytes - position, length);
      if (size > 8 && contents.subarray) {
        // non-trivial, and typed array
        buffer.set(contents.subarray(position, position + size), offset);
      } else {
        for (var i = 0; i < size; i++) buffer[offset + i] = contents[position + i];
      }
      return size;
    },
    write(stream, buffer, offset, length, position, canOwn) {
      // If the buffer is located in main memory (HEAP), and if
      // memory can grow, we can't hold on to references of the
      // memory buffer, as they may get invalidated. That means we
      // need to do copy its contents.
      if (buffer.buffer === HEAP8.buffer) {
        canOwn = false;
      }
      if (!length) return 0;
      var node = stream.node;
      node.mtime = node.ctime = Date.now();
      if (buffer.subarray && (!node.contents || node.contents.subarray)) {
        // This write is from a typed array to a typed array?
        if (canOwn) {
          node.contents = buffer.subarray(offset, offset + length);
          node.usedBytes = length;
          return length;
        } else if (node.usedBytes === 0 && position === 0) {
          // If this is a simple first write to an empty file, do a fast set since we don't need to care about old data.
          node.contents = buffer.slice(offset, offset + length);
          node.usedBytes = length;
          return length;
        } else if (position + length <= node.usedBytes) {
          // Writing to an already allocated and used subrange of the file?
          node.contents.set(buffer.subarray(offset, offset + length), position);
          return length;
        }
      }
      // Appending to an existing file and we need to reallocate, or source data did not come as a typed array.
      MEMFS.expandFileStorage(node, position + length);
      if (node.contents.subarray && buffer.subarray) {
        // Use typed array write which is available.
        node.contents.set(buffer.subarray(offset, offset + length), position);
      } else {
        for (var i = 0; i < length; i++) {
          node.contents[position + i] = buffer[offset + i];
        }
      }
      node.usedBytes = Math.max(node.usedBytes, position + length);
      return length;
    },
    llseek(stream, offset, whence) {
      var position = offset;
      if (whence === 1) {
        position += stream.position;
      } else if (whence === 2) {
        if (FS.isFile(stream.node.mode)) {
          position += stream.node.usedBytes;
        }
      }
      if (position < 0) {
        throw new FS.ErrnoError(28);
      }
      return position;
    },
    mmap(stream, length, position, prot, flags) {
      if (!FS.isFile(stream.node.mode)) {
        throw new FS.ErrnoError(43);
      }
      var ptr;
      var allocated;
      var contents = stream.node.contents;
      // Only make a new copy when MAP_PRIVATE is specified.
      if (!(flags & 2) && contents && contents.buffer === HEAP8.buffer) {
        // We can't emulate MAP_SHARED when the file is not backed by the
        // buffer we're mapping to (e.g. the HEAP buffer).
        allocated = false;
        ptr = contents.byteOffset;
      } else {
        allocated = true;
        ptr = mmapAlloc(length);
        if (!ptr) {
          throw new FS.ErrnoError(48);
        }
        if (contents) {
          // Try to avoid unnecessary slices.
          if (position > 0 || position + length < contents.length) {
            if (contents.subarray) {
              contents = contents.subarray(position, position + length);
            } else {
              contents = Array.prototype.slice.call(contents, position, position + length);
            }
          }
          HEAP8.set(contents, ptr);
        }
      }
      return {
        ptr,
        allocated
      };
    },
    msync(stream, buffer, offset, length, mmapFlags) {
      MEMFS.stream_ops.write(stream, buffer, 0, length, offset, false);
      // should we check if bytesWritten and length are the same?
      return 0;
    }
  }
};

var FS_modeStringToFlags = str => {
  var flagModes = {
    "r": 0,
    "r+": 2,
    "w": 512 | 64 | 1,
    "w+": 512 | 64 | 2,
    "a": 1024 | 64 | 1,
    "a+": 1024 | 64 | 2
  };
  var flags = flagModes[str];
  if (typeof flags == "undefined") {
    throw new Error(`Unknown file open mode: ${str}`);
  }
  return flags;
};

var FS_getMode = (canRead, canWrite) => {
  var mode = 0;
  if (canRead) mode |= 292 | 73;
  if (canWrite) mode |= 146;
  return mode;
};

var ERRNO_CODES = {
  "EPERM": 63,
  "ENOENT": 44,
  "ESRCH": 71,
  "EINTR": 27,
  "EIO": 29,
  "ENXIO": 60,
  "E2BIG": 1,
  "ENOEXEC": 45,
  "EBADF": 8,
  "ECHILD": 12,
  "EAGAIN": 6,
  "EWOULDBLOCK": 6,
  "ENOMEM": 48,
  "EACCES": 2,
  "EFAULT": 21,
  "ENOTBLK": 105,
  "EBUSY": 10,
  "EEXIST": 20,
  "EXDEV": 75,
  "ENODEV": 43,
  "ENOTDIR": 54,
  "EISDIR": 31,
  "EINVAL": 28,
  "ENFILE": 41,
  "EMFILE": 33,
  "ENOTTY": 59,
  "ETXTBSY": 74,
  "EFBIG": 22,
  "ENOSPC": 51,
  "ESPIPE": 70,
  "EROFS": 69,
  "EMLINK": 34,
  "EPIPE": 64,
  "EDOM": 18,
  "ERANGE": 68,
  "ENOMSG": 49,
  "EIDRM": 24,
  "ECHRNG": 106,
  "EL2NSYNC": 156,
  "EL3HLT": 107,
  "EL3RST": 108,
  "ELNRNG": 109,
  "EUNATCH": 110,
  "ENOCSI": 111,
  "EL2HLT": 112,
  "EDEADLK": 16,
  "ENOLCK": 46,
  "EBADE": 113,
  "EBADR": 114,
  "EXFULL": 115,
  "ENOANO": 104,
  "EBADRQC": 103,
  "EBADSLT": 102,
  "EDEADLOCK": 16,
  "EBFONT": 101,
  "ENOSTR": 100,
  "ENODATA": 116,
  "ETIME": 117,
  "ENOSR": 118,
  "ENONET": 119,
  "ENOPKG": 120,
  "EREMOTE": 121,
  "ENOLINK": 47,
  "EADV": 122,
  "ESRMNT": 123,
  "ECOMM": 124,
  "EPROTO": 65,
  "EMULTIHOP": 36,
  "EDOTDOT": 125,
  "EBADMSG": 9,
  "ENOTUNIQ": 126,
  "EBADFD": 127,
  "EREMCHG": 128,
  "ELIBACC": 129,
  "ELIBBAD": 130,
  "ELIBSCN": 131,
  "ELIBMAX": 132,
  "ELIBEXEC": 133,
  "ENOSYS": 52,
  "ENOTEMPTY": 55,
  "ENAMETOOLONG": 37,
  "ELOOP": 32,
  "EOPNOTSUPP": 138,
  "EPFNOSUPPORT": 139,
  "ECONNRESET": 15,
  "ENOBUFS": 42,
  "EAFNOSUPPORT": 5,
  "EPROTOTYPE": 67,
  "ENOTSOCK": 57,
  "ENOPROTOOPT": 50,
  "ESHUTDOWN": 140,
  "ECONNREFUSED": 14,
  "EADDRINUSE": 3,
  "ECONNABORTED": 13,
  "ENETUNREACH": 40,
  "ENETDOWN": 38,
  "ETIMEDOUT": 73,
  "EHOSTDOWN": 142,
  "EHOSTUNREACH": 23,
  "EINPROGRESS": 26,
  "EALREADY": 7,
  "EDESTADDRREQ": 17,
  "EMSGSIZE": 35,
  "EPROTONOSUPPORT": 66,
  "ESOCKTNOSUPPORT": 137,
  "EADDRNOTAVAIL": 4,
  "ENETRESET": 39,
  "EISCONN": 30,
  "ENOTCONN": 53,
  "ETOOMANYREFS": 141,
  "EUSERS": 136,
  "EDQUOT": 19,
  "ESTALE": 72,
  "ENOTSUP": 138,
  "ENOMEDIUM": 148,
  "EILSEQ": 25,
  "EOVERFLOW": 61,
  "ECANCELED": 11,
  "ENOTRECOVERABLE": 56,
  "EOWNERDEAD": 62,
  "ESTRPIPE": 135
};

var NODEFS = {
  isWindows: false,
  staticInit() {
    NODEFS.isWindows = !!process.platform.match(/^win/);
    var flags = process.binding("constants")["fs"];
    NODEFS.flagsForNodeMap = {
      1024: flags["O_APPEND"],
      64: flags["O_CREAT"],
      128: flags["O_EXCL"],
      256: flags["O_NOCTTY"],
      0: flags["O_RDONLY"],
      2: flags["O_RDWR"],
      4096: flags["O_SYNC"],
      512: flags["O_TRUNC"],
      1: flags["O_WRONLY"],
      131072: flags["O_NOFOLLOW"]
    };
  },
  convertNodeCode(e) {
    var code = e.code;
    return ERRNO_CODES[code];
  },
  tryFSOperation(f) {
    try {
      return f();
    } catch (e) {
      if (!e.code) throw e;
      // node under windows can return code 'UNKNOWN' here:
      // https://github.com/emscripten-core/emscripten/issues/15468
      if (e.code === "UNKNOWN") throw new FS.ErrnoError(28);
      throw new FS.ErrnoError(NODEFS.convertNodeCode(e));
    }
  },
  mount(mount) {
    return NODEFS.createNode(null, "/", NODEFS.getMode(mount.opts.root), 0);
  },
  createNode(parent, name, mode, dev) {
    if (!FS.isDir(mode) && !FS.isFile(mode) && !FS.isLink(mode)) {
      throw new FS.ErrnoError(28);
    }
    var node = FS.createNode(parent, name, mode);
    node.node_ops = NODEFS.node_ops;
    node.stream_ops = NODEFS.stream_ops;
    return node;
  },
  getMode(path) {
    return NODEFS.tryFSOperation(() => {
      var mode = fs.lstatSync(path).mode;
      if (NODEFS.isWindows) {
        // Windows does not report the 'x' permission bit, so propagate read
        // bits to execute bits.
        mode |= (mode & 292) >> 2;
      }
      return mode;
    });
  },
  realPath(node) {
    var parts = [];
    while (node.parent !== node) {
      parts.push(node.name);
      node = node.parent;
    }
    parts.push(node.mount.opts.root);
    parts.reverse();
    return PATH.join(...parts);
  },
  flagsForNode(flags) {
    flags &= ~2097152;
    // Ignore this flag from musl, otherwise node.js fails to open the file.
    flags &= ~2048;
    // Ignore this flag from musl, otherwise node.js fails to open the file.
    flags &= ~32768;
    // Ignore this flag from musl, otherwise node.js fails to open the file.
    flags &= ~524288;
    // Some applications may pass it; it makes no sense for a single process.
    flags &= ~65536;
    // Node.js doesn't need this passed in, it errors.
    var newFlags = 0;
    for (var k in NODEFS.flagsForNodeMap) {
      if (flags & k) {
        newFlags |= NODEFS.flagsForNodeMap[k];
        flags ^= k;
      }
    }
    if (flags) {
      throw new FS.ErrnoError(28);
    }
    return newFlags;
  },
  getattr(func, node) {
    var stat = NODEFS.tryFSOperation(func);
    if (NODEFS.isWindows) {
      // node.js v0.10.20 doesn't report blksize and blocks on Windows. Fake
      // them with default blksize of 4096.
      // See http://support.microsoft.com/kb/140365
      if (!stat.blksize) {
        stat.blksize = 4096;
      }
      if (!stat.blocks) {
        stat.blocks = (stat.size + stat.blksize - 1) / stat.blksize | 0;
      }
      // Windows does not report the 'x' permission bit, so propagate read
      // bits to execute bits.
      stat.mode |= (stat.mode & 292) >> 2;
    }
    return {
      dev: stat.dev,
      ino: node.id,
      mode: stat.mode,
      nlink: stat.nlink,
      uid: stat.uid,
      gid: stat.gid,
      rdev: stat.rdev,
      size: stat.size,
      atime: stat.atime,
      mtime: stat.mtime,
      ctime: stat.ctime,
      blksize: stat.blksize,
      blocks: stat.blocks
    };
  },
  setattr(arg, node, attr, chmod, utimes, truncate, stat) {
    NODEFS.tryFSOperation(() => {
      if (attr.mode !== undefined) {
        var mode = attr.mode;
        if (NODEFS.isWindows) {
          // Windows only supports S_IREAD / S_IWRITE (S_IRUSR / S_IWUSR)
          // https://learn.microsoft.com/en-us/cpp/c-runtime-library/reference/chmod-wchmod
          mode &= 384;
        }
        chmod(arg, mode);
        // update the common node structure mode as well
        node.mode = attr.mode;
      }
      if (typeof (attr.atime ?? attr.mtime) === "number") {
        // Unfortunately, we have to stat the current value if we don't want
        // to change it. On top of that, since the times don't round trip
        // this will only keep the value nearly unchanged not exactly
        // unchanged. See:
        // https://github.com/nodejs/node/issues/56492
        var atime = new Date(attr.atime ?? stat(arg).atime);
        var mtime = new Date(attr.mtime ?? stat(arg).mtime);
        utimes(arg, atime, mtime);
      }
      if (attr.size !== undefined) {
        truncate(arg, attr.size);
      }
    });
  },
  node_ops: {
    getattr(node) {
      var path = NODEFS.realPath(node);
      return NODEFS.getattr(() => fs.lstatSync(path), node);
    },
    setattr(node, attr) {
      var path = NODEFS.realPath(node);
      if (attr.mode != null && attr.dontFollow) {
        throw new FS.ErrnoError(52);
      }
      NODEFS.setattr(path, node, attr, fs.chmodSync, fs.utimesSync, fs.truncateSync, fs.lstatSync);
    },
    lookup(parent, name) {
      var path = PATH.join2(NODEFS.realPath(parent), name);
      var mode = NODEFS.getMode(path);
      return NODEFS.createNode(parent, name, mode);
    },
    mknod(parent, name, mode, dev) {
      var node = NODEFS.createNode(parent, name, mode, dev);
      // create the backing node for this in the fs root as well
      var path = NODEFS.realPath(node);
      NODEFS.tryFSOperation(() => {
        if (FS.isDir(node.mode)) {
          fs.mkdirSync(path, node.mode);
        } else {
          fs.writeFileSync(path, "", {
            mode: node.mode
          });
        }
      });
      return node;
    },
    rename(oldNode, newDir, newName) {
      var oldPath = NODEFS.realPath(oldNode);
      var newPath = PATH.join2(NODEFS.realPath(newDir), newName);
      try {
        FS.unlink(newPath);
      } catch (e) {}
      NODEFS.tryFSOperation(() => fs.renameSync(oldPath, newPath));
      oldNode.name = newName;
    },
    unlink(parent, name) {
      var path = PATH.join2(NODEFS.realPath(parent), name);
      NODEFS.tryFSOperation(() => fs.unlinkSync(path));
    },
    rmdir(parent, name) {
      var path = PATH.join2(NODEFS.realPath(parent), name);
      NODEFS.tryFSOperation(() => fs.rmdirSync(path));
    },
    readdir(node) {
      var path = NODEFS.realPath(node);
      return NODEFS.tryFSOperation(() => fs.readdirSync(path));
    },
    symlink(parent, newName, oldPath) {
      var newPath = PATH.join2(NODEFS.realPath(parent), newName);
      NODEFS.tryFSOperation(() => fs.symlinkSync(oldPath, newPath));
    },
    readlink(node) {
      var path = NODEFS.realPath(node);
      return NODEFS.tryFSOperation(() => fs.readlinkSync(path));
    },
    statfs(path) {
      var stats = NODEFS.tryFSOperation(() => fs.statfsSync(path));
      // Node.js doesn't provide frsize (fragment size). Set it to bsize (block size)
      // as they're often the same in many file systems. May not be accurate for all.
      stats.frsize = stats.bsize;
      return stats;
    }
  },
  stream_ops: {
    getattr(stream) {
      return NODEFS.getattr(() => fs.fstatSync(stream.nfd), stream.node);
    },
    setattr(stream, attr) {
      NODEFS.setattr(stream.nfd, stream.node, attr, fs.fchmodSync, fs.futimesSync, fs.ftruncateSync, fs.fstatSync);
    },
    open(stream) {
      var path = NODEFS.realPath(stream.node);
      NODEFS.tryFSOperation(() => {
        stream.shared.refcount = 1;
        stream.nfd = fs.openSync(path, NODEFS.flagsForNode(stream.flags));
      });
    },
    close(stream) {
      NODEFS.tryFSOperation(() => {
        if (stream.nfd && --stream.shared.refcount === 0) {
          fs.closeSync(stream.nfd);
        }
      });
    },
    dup(stream) {
      stream.shared.refcount++;
    },
    read(stream, buffer, offset, length, position) {
      return NODEFS.tryFSOperation(() => fs.readSync(stream.nfd, new Int8Array(buffer.buffer, offset, length), 0, length, position));
    },
    write(stream, buffer, offset, length, position) {
      return NODEFS.tryFSOperation(() => fs.writeSync(stream.nfd, new Int8Array(buffer.buffer, offset, length), 0, length, position));
    },
    llseek(stream, offset, whence) {
      var position = offset;
      if (whence === 1) {
        position += stream.position;
      } else if (whence === 2) {
        if (FS.isFile(stream.node.mode)) {
          NODEFS.tryFSOperation(() => {
            var stat = fs.fstatSync(stream.nfd);
            position += stat.size;
          });
        }
      }
      if (position < 0) {
        throw new FS.ErrnoError(28);
      }
      return position;
    },
    mmap(stream, length, position, prot, flags) {
      if (!FS.isFile(stream.node.mode)) {
        throw new FS.ErrnoError(43);
      }
      var ptr = mmapAlloc(length);
      NODEFS.stream_ops.read(stream, HEAP8, ptr, length, position);
      return {
        ptr,
        allocated: true
      };
    },
    msync(stream, buffer, offset, length, mmapFlags) {
      NODEFS.stream_ops.write(stream, buffer, 0, length, offset, false);
      // should we check if bytesWritten and length are the same?
      return 0;
    }
  }
};

var PROXYFS = {
  mount(mount) {
    return PROXYFS.createNode(null, "/", mount.opts.fs.lstat(mount.opts.root).mode, 0);
  },
  createNode(parent, name, mode, dev) {
    if (!FS.isDir(mode) && !FS.isFile(mode) && !FS.isLink(mode)) {
      throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
    }
    var node = FS.createNode(parent, name, mode);
    node.node_ops = PROXYFS.node_ops;
    node.stream_ops = PROXYFS.stream_ops;
    return node;
  },
  realPath(node) {
    var parts = [];
    while (node.parent !== node) {
      parts.push(node.name);
      node = node.parent;
    }
    parts.push(node.mount.opts.root);
    parts.reverse();
    return PATH.join(...parts);
  },
  node_ops: {
    getattr(node) {
      var path = PROXYFS.realPath(node);
      var stat;
      try {
        stat = node.mount.opts.fs.lstat(path);
      } catch (e) {
        if (!e.code) throw e;
        throw new FS.ErrnoError(ERRNO_CODES[e.code]);
      }
      return {
        dev: stat.dev,
        ino: stat.ino,
        mode: stat.mode,
        nlink: stat.nlink,
        uid: stat.uid,
        gid: stat.gid,
        rdev: stat.rdev,
        size: stat.size,
        atime: stat.atime,
        mtime: stat.mtime,
        ctime: stat.ctime,
        blksize: stat.blksize,
        blocks: stat.blocks
      };
    },
    setattr(node, attr) {
      var path = PROXYFS.realPath(node);
      try {
        if (attr.mode !== undefined) {
          node.mount.opts.fs.chmod(path, attr.mode);
          // update the common node structure mode as well
          node.mode = attr.mode;
        }
        if (attr.atime || attr.mtime) {
          var atime = new Date(attr.atime || attr.mtime);
          var mtime = new Date(attr.mtime || attr.atime);
          node.mount.opts.fs.utime(path, atime, mtime);
        }
        if (attr.size !== undefined) {
          node.mount.opts.fs.truncate(path, attr.size);
        }
      } catch (e) {
        if (!e.code) throw e;
        throw new FS.ErrnoError(ERRNO_CODES[e.code]);
      }
    },
    lookup(parent, name) {
      try {
        var path = PATH.join2(PROXYFS.realPath(parent), name);
        var mode = parent.mount.opts.fs.lstat(path).mode;
        var node = PROXYFS.createNode(parent, name, mode);
        return node;
      } catch (e) {
        if (!e.code) throw e;
        throw new FS.ErrnoError(ERRNO_CODES[e.code]);
      }
    },
    mknod(parent, name, mode, dev) {
      var node = PROXYFS.createNode(parent, name, mode, dev);
      // create the backing node for this in the fs root as well
      var path = PROXYFS.realPath(node);
      try {
        if (FS.isDir(node.mode)) {
          node.mount.opts.fs.mkdir(path, node.mode);
        } else {
          node.mount.opts.fs.writeFile(path, "", {
            mode: node.mode
          });
        }
      } catch (e) {
        if (!e.code) throw e;
        throw new FS.ErrnoError(ERRNO_CODES[e.code]);
      }
      return node;
    },
    rename(oldNode, newDir, newName) {
      var oldPath = PROXYFS.realPath(oldNode);
      var newPath = PATH.join2(PROXYFS.realPath(newDir), newName);
      try {
        oldNode.mount.opts.fs.rename(oldPath, newPath);
        oldNode.name = newName;
      } catch (e) {
        if (!e.code) throw e;
        throw new FS.ErrnoError(ERRNO_CODES[e.code]);
      }
    },
    unlink(parent, name) {
      var path = PATH.join2(PROXYFS.realPath(parent), name);
      try {
        parent.mount.opts.fs.unlink(path);
      } catch (e) {
        if (!e.code) throw e;
        throw new FS.ErrnoError(ERRNO_CODES[e.code]);
      }
    },
    rmdir(parent, name) {
      var path = PATH.join2(PROXYFS.realPath(parent), name);
      try {
        parent.mount.opts.fs.rmdir(path);
      } catch (e) {
        if (!e.code) throw e;
        throw new FS.ErrnoError(ERRNO_CODES[e.code]);
      }
    },
    readdir(node) {
      var path = PROXYFS.realPath(node);
      try {
        return node.mount.opts.fs.readdir(path);
      } catch (e) {
        if (!e.code) throw e;
        throw new FS.ErrnoError(ERRNO_CODES[e.code]);
      }
    },
    symlink(parent, newName, oldPath) {
      var newPath = PATH.join2(PROXYFS.realPath(parent), newName);
      try {
        parent.mount.opts.fs.symlink(oldPath, newPath);
      } catch (e) {
        if (!e.code) throw e;
        throw new FS.ErrnoError(ERRNO_CODES[e.code]);
      }
    },
    readlink(node) {
      var path = PROXYFS.realPath(node);
      try {
        return node.mount.opts.fs.readlink(path);
      } catch (e) {
        if (!e.code) throw e;
        throw new FS.ErrnoError(ERRNO_CODES[e.code]);
      }
    }
  },
  stream_ops: {
    open(stream) {
      var path = PROXYFS.realPath(stream.node);
      try {
        stream.nfd = stream.node.mount.opts.fs.open(path, stream.flags);
      } catch (e) {
        if (!e.code) throw e;
        throw new FS.ErrnoError(ERRNO_CODES[e.code]);
      }
    },
    close(stream) {
      try {
        stream.node.mount.opts.fs.close(stream.nfd);
      } catch (e) {
        if (!e.code) throw e;
        throw new FS.ErrnoError(ERRNO_CODES[e.code]);
      }
    },
    read(stream, buffer, offset, length, position) {
      try {
        return stream.node.mount.opts.fs.read(stream.nfd, buffer, offset, length, position);
      } catch (e) {
        if (!e.code) throw e;
        throw new FS.ErrnoError(ERRNO_CODES[e.code]);
      }
    },
    write(stream, buffer, offset, length, position) {
      try {
        return stream.node.mount.opts.fs.write(stream.nfd, buffer, offset, length, position);
      } catch (e) {
        if (!e.code) throw e;
        throw new FS.ErrnoError(ERRNO_CODES[e.code]);
      }
    },
    llseek(stream, offset, whence) {
      var position = offset;
      if (whence === 1) {
        position += stream.position;
      } else if (whence === 2) {
        if (FS.isFile(stream.node.mode)) {
          try {
            var stat = stream.node.node_ops.getattr(stream.node);
            position += stat.size;
          } catch (e) {
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        }
      }
      if (position < 0) {
        throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
      }
      return position;
    }
  }
};

var FS_createDataFile = (...args) => FS.createDataFile(...args);

var getUniqueRunDependency = id => id;

var FS_handledByPreloadPlugin = async (byteArray, fullname) => {
  // Ensure plugins are ready.
  if (typeof Browser != "undefined") Browser.init();
  for (var plugin of preloadPlugins) {
    if (plugin["canHandle"](fullname)) {
      return plugin["handle"](byteArray, fullname);
    }
  }
  // In no plugin handled this file then return the original/unmodified
  // byteArray.
  return byteArray;
};

var FS_preloadFile = async (parent, name, url, canRead, canWrite, dontCreateFile, canOwn, preFinish) => {
  // TODO we should allow people to just pass in a complete filename instead
  // of parent and name being that we just join them anyways
  var fullname = name ? PATH_FS.resolve(PATH.join2(parent, name)) : parent;
  var dep = getUniqueRunDependency(`cp ${fullname}`);
  // might have several active requests for the same fullname
  addRunDependency(dep);
  try {
    var byteArray = url;
    if (typeof url == "string") {
      byteArray = await asyncLoad(url);
    }
    byteArray = await FS_handledByPreloadPlugin(byteArray, fullname);
    preFinish?.();
    if (!dontCreateFile) {
      FS_createDataFile(parent, name, byteArray, canRead, canWrite, canOwn);
    }
  } finally {
    removeRunDependency(dep);
  }
};

var FS_createPreloadedFile = (parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn, preFinish) => {
  FS_preloadFile(parent, name, url, canRead, canWrite, dontCreateFile, canOwn, preFinish).then(onload).catch(onerror);
};

var FS = {
  root: null,
  mounts: [],
  devices: {},
  streams: [],
  nextInode: 1,
  nameTable: null,
  currentPath: "/",
  initialized: false,
  ignorePermissions: true,
  filesystems: null,
  syncFSRequests: 0,
  readFiles: {},
  ErrnoError: class {
    name="ErrnoError";
    // We set the `name` property to be able to identify `FS.ErrnoError`
    // - the `name` is a standard ECMA-262 property of error objects. Kind of good to have it anyway.
    // - when using PROXYFS, an error can come from an underlying FS
    // as different FS objects have their own FS.ErrnoError each,
    // the test `err instanceof FS.ErrnoError` won't detect an error coming from another filesystem, causing bugs.
    // we'll use the reliable test `err.name == "ErrnoError"` instead
    constructor(errno) {
      this.errno = errno;
    }
  },
  FSStream: class {
    shared={};
    get object() {
      return this.node;
    }
    set object(val) {
      this.node = val;
    }
    get isRead() {
      return (this.flags & 2097155) !== 1;
    }
    get isWrite() {
      return (this.flags & 2097155) !== 0;
    }
    get isAppend() {
      return (this.flags & 1024);
    }
    get flags() {
      return this.shared.flags;
    }
    set flags(val) {
      this.shared.flags = val;
    }
    get position() {
      return this.shared.position;
    }
    set position(val) {
      this.shared.position = val;
    }
  },
  FSNode: class {
    node_ops={};
    stream_ops={};
    readMode=292 | 73;
    writeMode=146;
    mounted=null;
    constructor(parent, name, mode, rdev) {
      if (!parent) {
        parent = this;
      }
      this.parent = parent;
      this.mount = parent.mount;
      this.id = FS.nextInode++;
      this.name = name;
      this.mode = mode;
      this.rdev = rdev;
      this.atime = this.mtime = this.ctime = Date.now();
    }
    get read() {
      return (this.mode & this.readMode) === this.readMode;
    }
    set read(val) {
      val ? this.mode |= this.readMode : this.mode &= ~this.readMode;
    }
    get write() {
      return (this.mode & this.writeMode) === this.writeMode;
    }
    set write(val) {
      val ? this.mode |= this.writeMode : this.mode &= ~this.writeMode;
    }
    get isFolder() {
      return FS.isDir(this.mode);
    }
    get isDevice() {
      return FS.isChrdev(this.mode);
    }
  },
  lookupPath(path, opts = {}) {
    if (!path) {
      throw new FS.ErrnoError(44);
    }
    opts.follow_mount ??= true;
    if (!PATH.isAbs(path)) {
      path = FS.cwd() + "/" + path;
    }
    // limit max consecutive symlinks to 40 (SYMLOOP_MAX).
    linkloop: for (var nlinks = 0; nlinks < 40; nlinks++) {
      // split the absolute path
      var parts = path.split("/").filter(p => !!p);
      // start at the root
      var current = FS.root;
      var current_path = "/";
      for (var i = 0; i < parts.length; i++) {
        var islast = (i === parts.length - 1);
        if (islast && opts.parent) {
          // stop resolving
          break;
        }
        if (parts[i] === ".") {
          continue;
        }
        if (parts[i] === "..") {
          current_path = PATH.dirname(current_path);
          if (FS.isRoot(current)) {
            path = current_path + "/" + parts.slice(i + 1).join("/");
            // We're making progress here, don't let many consecutive ..'s
            // lead to ELOOP
            nlinks--;
            continue linkloop;
          } else {
            current = current.parent;
          }
          continue;
        }
        current_path = PATH.join2(current_path, parts[i]);
        try {
          current = FS.lookupNode(current, parts[i]);
        } catch (e) {
          // if noent_okay is true, suppress a ENOENT in the last component
          // and return an object with an undefined node. This is needed for
          // resolving symlinks in the path when creating a file.
          if ((e?.errno === 44) && islast && opts.noent_okay) {
            return {
              path: current_path
            };
          }
          throw e;
        }
        // jump to the mount's root node if this is a mountpoint
        if (FS.isMountpoint(current) && (!islast || opts.follow_mount)) {
          current = current.mounted.root;
        }
        // by default, lookupPath will not follow a symlink if it is the final path component.
        // setting opts.follow = true will override this behavior.
        if (FS.isLink(current.mode) && (!islast || opts.follow)) {
          if (!current.node_ops.readlink) {
            throw new FS.ErrnoError(52);
          }
          var link = current.node_ops.readlink(current);
          if (!PATH.isAbs(link)) {
            link = PATH.dirname(current_path) + "/" + link;
          }
          path = link + "/" + parts.slice(i + 1).join("/");
          continue linkloop;
        }
      }
      return {
        path: current_path,
        node: current
      };
    }
    throw new FS.ErrnoError(32);
  },
  getPath(node) {
    var path;
    while (true) {
      if (FS.isRoot(node)) {
        var mount = node.mount.mountpoint;
        if (!path) return mount;
        return mount[mount.length - 1] !== "/" ? `${mount}/${path}` : mount + path;
      }
      path = path ? `${node.name}/${path}` : node.name;
      node = node.parent;
    }
  },
  hashName(parentid, name) {
    var hash = 0;
    for (var i = 0; i < name.length; i++) {
      hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
    }
    return ((parentid + hash) >>> 0) % FS.nameTable.length;
  },
  hashAddNode(node) {
    var hash = FS.hashName(node.parent.id, node.name);
    node.name_next = FS.nameTable[hash];
    FS.nameTable[hash] = node;
  },
  hashRemoveNode(node) {
    var hash = FS.hashName(node.parent.id, node.name);
    if (FS.nameTable[hash] === node) {
      FS.nameTable[hash] = node.name_next;
    } else {
      var current = FS.nameTable[hash];
      while (current) {
        if (current.name_next === node) {
          current.name_next = node.name_next;
          break;
        }
        current = current.name_next;
      }
    }
  },
  lookupNode(parent, name) {
    var errCode = FS.mayLookup(parent);
    if (errCode) {
      throw new FS.ErrnoError(errCode);
    }
    var hash = FS.hashName(parent.id, name);
    for (var node = FS.nameTable[hash]; node; node = node.name_next) {
      var nodeName = node.name;
      if (node.parent.id === parent.id && nodeName === name) {
        return node;
      }
    }
    // if we failed to find it in the cache, call into the VFS
    return FS.lookup(parent, name);
  },
  createNode(parent, name, mode, rdev) {
    var node = new FS.FSNode(parent, name, mode, rdev);
    FS.hashAddNode(node);
    return node;
  },
  destroyNode(node) {
    FS.hashRemoveNode(node);
  },
  isRoot(node) {
    return node === node.parent;
  },
  isMountpoint(node) {
    return !!node.mounted;
  },
  isFile(mode) {
    return (mode & 61440) === 32768;
  },
  isDir(mode) {
    return (mode & 61440) === 16384;
  },
  isLink(mode) {
    return (mode & 61440) === 40960;
  },
  isChrdev(mode) {
    return (mode & 61440) === 8192;
  },
  isBlkdev(mode) {
    return (mode & 61440) === 24576;
  },
  isFIFO(mode) {
    return (mode & 61440) === 4096;
  },
  isSocket(mode) {
    return (mode & 49152) === 49152;
  },
  flagsToPermissionString(flag) {
    var perms = [ "r", "w", "rw" ][flag & 3];
    if ((flag & 512)) {
      perms += "w";
    }
    return perms;
  },
  nodePermissions(node, perms) {
    if (FS.ignorePermissions) {
      return 0;
    }
    // return 0 if any user, group or owner bits are set.
    if (perms.includes("r") && !(node.mode & 292)) {
      return 2;
    } else if (perms.includes("w") && !(node.mode & 146)) {
      return 2;
    } else if (perms.includes("x") && !(node.mode & 73)) {
      return 2;
    }
    return 0;
  },
  mayLookup(dir) {
    if (!FS.isDir(dir.mode)) return 54;
    var errCode = FS.nodePermissions(dir, "x");
    if (errCode) return errCode;
    if (!dir.node_ops.lookup) return 2;
    return 0;
  },
  mayCreate(dir, name) {
    if (!FS.isDir(dir.mode)) {
      return 54;
    }
    try {
      var node = FS.lookupNode(dir, name);
      return 20;
    } catch (e) {}
    return FS.nodePermissions(dir, "wx");
  },
  mayDelete(dir, name, isdir) {
    var node;
    try {
      node = FS.lookupNode(dir, name);
    } catch (e) {
      return e.errno;
    }
    var errCode = FS.nodePermissions(dir, "wx");
    if (errCode) {
      return errCode;
    }
    if (isdir) {
      if (!FS.isDir(node.mode)) {
        return 54;
      }
      if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
        return 10;
      }
    } else {
      if (FS.isDir(node.mode)) {
        return 31;
      }
    }
    return 0;
  },
  mayOpen(node, flags) {
    if (!node) {
      return 44;
    }
    if (FS.isLink(node.mode)) {
      return 32;
    } else if (FS.isDir(node.mode)) {
      if (FS.flagsToPermissionString(flags) !== "r" || (flags & (512 | 64))) {
        // TODO: check for O_SEARCH? (== search for dir only)
        return 31;
      }
    }
    return FS.nodePermissions(node, FS.flagsToPermissionString(flags));
  },
  checkOpExists(op, err) {
    if (!op) {
      throw new FS.ErrnoError(err);
    }
    return op;
  },
  MAX_OPEN_FDS: 4096,
  nextfd() {
    for (var fd = 0; fd <= FS.MAX_OPEN_FDS; fd++) {
      if (!FS.streams[fd]) {
        return fd;
      }
    }
    throw new FS.ErrnoError(33);
  },
  getStreamChecked(fd) {
    var stream = FS.getStream(fd);
    if (!stream) {
      throw new FS.ErrnoError(8);
    }
    return stream;
  },
  getStream: fd => FS.streams[fd],
  createStream(stream, fd = -1) {
    // clone it, so we can return an instance of FSStream
    stream = Object.assign(new FS.FSStream, stream);
    if (fd == -1) {
      fd = FS.nextfd();
    }
    stream.fd = fd;
    FS.streams[fd] = stream;
    return stream;
  },
  closeStream(fd) {
    FS.streams[fd] = null;
  },
  dupStream(origStream, fd = -1) {
    var stream = FS.createStream(origStream, fd);
    stream.stream_ops?.dup?.(stream);
    return stream;
  },
  doSetAttr(stream, node, attr) {
    var setattr = stream?.stream_ops.setattr;
    var arg = setattr ? stream : node;
    setattr ??= node.node_ops.setattr;
    FS.checkOpExists(setattr, 63);
    setattr(arg, attr);
  },
  chrdev_stream_ops: {
    open(stream) {
      var device = FS.getDevice(stream.node.rdev);
      // override node's stream ops with the device's
      stream.stream_ops = device.stream_ops;
      // forward the open call
      stream.stream_ops.open?.(stream);
    },
    llseek() {
      throw new FS.ErrnoError(70);
    }
  },
  major: dev => ((dev) >> 8),
  minor: dev => ((dev) & 255),
  makedev: (ma, mi) => ((ma) << 8 | (mi)),
  registerDevice(dev, ops) {
    FS.devices[dev] = {
      stream_ops: ops
    };
  },
  getDevice: dev => FS.devices[dev],
  getMounts(mount) {
    var mounts = [];
    var check = [ mount ];
    while (check.length) {
      var m = check.pop();
      mounts.push(m);
      check.push(...m.mounts);
    }
    return mounts;
  },
  syncfs(populate, callback) {
    if (typeof populate == "function") {
      callback = populate;
      populate = false;
    }
    FS.syncFSRequests++;
    if (FS.syncFSRequests > 1) {
      err(`warning: ${FS.syncFSRequests} FS.syncfs operations in flight at once, probably just doing extra work`);
    }
    var mounts = FS.getMounts(FS.root.mount);
    var completed = 0;
    function doCallback(errCode) {
      FS.syncFSRequests--;
      return callback(errCode);
    }
    function done(errCode) {
      if (errCode) {
        if (!done.errored) {
          done.errored = true;
          return doCallback(errCode);
        }
        return;
      }
      if (++completed >= mounts.length) {
        doCallback(null);
      }
    }
    // sync all mounts
    for (var mount of mounts) {
      if (mount.type.syncfs) {
        mount.type.syncfs(mount, populate, done);
      } else {
        done(null);
      }
    }
  },
  mount(type, opts, mountpoint) {
    var root = mountpoint === "/";
    var pseudo = !mountpoint;
    var node;
    if (root && FS.root) {
      throw new FS.ErrnoError(10);
    } else if (!root && !pseudo) {
      var lookup = FS.lookupPath(mountpoint, {
        follow_mount: false
      });
      mountpoint = lookup.path;
      // use the absolute path
      node = lookup.node;
      if (FS.isMountpoint(node)) {
        throw new FS.ErrnoError(10);
      }
      
    }
    var mount = {
      type,
      opts,
      mountpoint,
      mounts: []
    };
    // create a root node for the fs
    var mountRoot = type.mount(mount);
    mountRoot.mount = mount;
    mount.root = mountRoot;
    if (root) {
      FS.root = mountRoot;
    } else if (node) {
      // set as a mountpoint
      node.mounted = mount;
      // add the new mount to the current mount's children
      if (node.mount) {
        node.mount.mounts.push(mount);
      }
    }
    return mountRoot;
  },
  unmount(mountpoint) {
    var lookup = FS.lookupPath(mountpoint, {
      follow_mount: false
    });
    if (!FS.isMountpoint(lookup.node)) {
      throw new FS.ErrnoError(28);
    }
    // destroy the nodes for this mount, and all its child mounts
    var node = lookup.node;
    var mount = node.mounted;
    var mounts = FS.getMounts(mount);
    for (var [hash, current] of Object.entries(FS.nameTable)) {
      while (current) {
        var next = current.name_next;
        if (mounts.includes(current.mount)) {
          FS.destroyNode(current);
        }
        current = next;
      }
    }
    // no longer a mountpoint
    node.mounted = null;
    // remove this mount from the child mounts
    var idx = node.mount.mounts.indexOf(mount);
    node.mount.mounts.splice(idx, 1);
  },
  lookup(parent, name) {
    return parent.node_ops.lookup(parent, name);
  },
  mknod(path, mode, dev) {
    var lookup = FS.lookupPath(path, {
      parent: true
    });
    var parent = lookup.node;
    var name = PATH.basename(path);
    if (!name) {
      throw new FS.ErrnoError(28);
    }
    if (name === "." || name === "..") {
      throw new FS.ErrnoError(20);
    }
    var errCode = FS.mayCreate(parent, name);
    if (errCode) {
      throw new FS.ErrnoError(errCode);
    }
    if (!parent.node_ops.mknod) {
      throw new FS.ErrnoError(63);
    }
    return parent.node_ops.mknod(parent, name, mode, dev);
  },
  statfs(path) {
    return FS.statfsNode(FS.lookupPath(path, {
      follow: true
    }).node);
  },
  statfsStream(stream) {
    // We keep a separate statfsStream function because noderawfs overrides
    // it. In noderawfs, stream.node is sometimes null. Instead, we need to
    // look at stream.path.
    return FS.statfsNode(stream.node);
  },
  statfsNode(node) {
    // NOTE: None of the defaults here are true. We're just returning safe and
    //       sane values. Currently nodefs and rawfs replace these defaults,
    //       other file systems leave them alone.
    var rtn = {
      bsize: 4096,
      frsize: 4096,
      blocks: 1e6,
      bfree: 5e5,
      bavail: 5e5,
      files: FS.nextInode,
      ffree: FS.nextInode - 1,
      fsid: 42,
      flags: 2,
      namelen: 255
    };
    if (node.node_ops.statfs) {
      Object.assign(rtn, node.node_ops.statfs(node.mount.opts.root));
    }
    return rtn;
  },
  create(path, mode = 438) {
    mode &= 4095;
    mode |= 32768;
    return FS.mknod(path, mode, 0);
  },
  mkdir(path, mode = 511) {
    mode &= 511 | 512;
    mode |= 16384;
    return FS.mknod(path, mode, 0);
  },
  mkdirTree(path, mode) {
    var dirs = path.split("/");
    var d = "";
    for (var dir of dirs) {
      if (!dir) continue;
      if (d || PATH.isAbs(path)) d += "/";
      d += dir;
      try {
        FS.mkdir(d, mode);
      } catch (e) {
        if (e.errno != 20) throw e;
      }
    }
  },
  mkdev(path, mode, dev) {
    if (typeof dev == "undefined") {
      dev = mode;
      mode = 438;
    }
    mode |= 8192;
    return FS.mknod(path, mode, dev);
  },
  symlink(oldpath, newpath) {
    if (!PATH_FS.resolve(oldpath)) {
      throw new FS.ErrnoError(44);
    }
    var lookup = FS.lookupPath(newpath, {
      parent: true
    });
    var parent = lookup.node;
    if (!parent) {
      throw new FS.ErrnoError(44);
    }
    var newname = PATH.basename(newpath);
    var errCode = FS.mayCreate(parent, newname);
    if (errCode) {
      throw new FS.ErrnoError(errCode);
    }
    if (!parent.node_ops.symlink) {
      throw new FS.ErrnoError(63);
    }
    return parent.node_ops.symlink(parent, newname, oldpath);
  },
  rename(old_path, new_path) {
    var old_dirname = PATH.dirname(old_path);
    var new_dirname = PATH.dirname(new_path);
    var old_name = PATH.basename(old_path);
    var new_name = PATH.basename(new_path);
    // parents must exist
    var lookup, old_dir, new_dir;
    // let the errors from non existent directories percolate up
    lookup = FS.lookupPath(old_path, {
      parent: true
    });
    old_dir = lookup.node;
    lookup = FS.lookupPath(new_path, {
      parent: true
    });
    new_dir = lookup.node;
    if (!old_dir || !new_dir) throw new FS.ErrnoError(44);
    // need to be part of the same mount
    if (old_dir.mount !== new_dir.mount) {
      throw new FS.ErrnoError(75);
    }
    // source must exist
    var old_node = FS.lookupNode(old_dir, old_name);
    // old path should not be an ancestor of the new path
    var relative = PATH_FS.relative(old_path, new_dirname);
    if (relative.charAt(0) !== ".") {
      throw new FS.ErrnoError(28);
    }
    // new path should not be an ancestor of the old path
    relative = PATH_FS.relative(new_path, old_dirname);
    if (relative.charAt(0) !== ".") {
      throw new FS.ErrnoError(55);
    }
    // see if the new path already exists
    var new_node;
    try {
      new_node = FS.lookupNode(new_dir, new_name);
    } catch (e) {}
    // early out if nothing needs to change
    if (old_node === new_node) {
      return;
    }
    // we'll need to delete the old entry
    var isdir = FS.isDir(old_node.mode);
    var errCode = FS.mayDelete(old_dir, old_name, isdir);
    if (errCode) {
      throw new FS.ErrnoError(errCode);
    }
    // need delete permissions if we'll be overwriting.
    // need create permissions if new doesn't already exist.
    errCode = new_node ? FS.mayDelete(new_dir, new_name, isdir) : FS.mayCreate(new_dir, new_name);
    if (errCode) {
      throw new FS.ErrnoError(errCode);
    }
    if (!old_dir.node_ops.rename) {
      throw new FS.ErrnoError(63);
    }
    if (FS.isMountpoint(old_node) || (new_node && FS.isMountpoint(new_node))) {
      throw new FS.ErrnoError(10);
    }
    // if we are going to change the parent, check write permissions
    if (new_dir !== old_dir) {
      errCode = FS.nodePermissions(old_dir, "w");
      if (errCode) {
        throw new FS.ErrnoError(errCode);
      }
    }
    // remove the node from the lookup hash
    FS.hashRemoveNode(old_node);
    // do the underlying fs rename
    try {
      old_dir.node_ops.rename(old_node, new_dir, new_name);
      // update old node (we do this here to avoid each backend
      // needing to)
      old_node.parent = new_dir;
    } catch (e) {
      throw e;
    } finally {
      // add the node back to the hash (in case node_ops.rename
      // changed its name)
      FS.hashAddNode(old_node);
    }
  },
  rmdir(path) {
    var lookup = FS.lookupPath(path, {
      parent: true
    });
    var parent = lookup.node;
    var name = PATH.basename(path);
    var node = FS.lookupNode(parent, name);
    var errCode = FS.mayDelete(parent, name, true);
    if (errCode) {
      throw new FS.ErrnoError(errCode);
    }
    if (!parent.node_ops.rmdir) {
      throw new FS.ErrnoError(63);
    }
    if (FS.isMountpoint(node)) {
      throw new FS.ErrnoError(10);
    }
    parent.node_ops.rmdir(parent, name);
    FS.destroyNode(node);
  },
  readdir(path) {
    var lookup = FS.lookupPath(path, {
      follow: true
    });
    var node = lookup.node;
    var readdir = FS.checkOpExists(node.node_ops.readdir, 54);
    return readdir(node);
  },
  unlink(path) {
    var lookup = FS.lookupPath(path, {
      parent: true
    });
    var parent = lookup.node;
    if (!parent) {
      throw new FS.ErrnoError(44);
    }
    var name = PATH.basename(path);
    var node = FS.lookupNode(parent, name);
    var errCode = FS.mayDelete(parent, name, false);
    if (errCode) {
      // According to POSIX, we should map EISDIR to EPERM, but
      // we instead do what Linux does (and we must, as we use
      // the musl linux libc).
      throw new FS.ErrnoError(errCode);
    }
    if (!parent.node_ops.unlink) {
      throw new FS.ErrnoError(63);
    }
    if (FS.isMountpoint(node)) {
      throw new FS.ErrnoError(10);
    }
    parent.node_ops.unlink(parent, name);
    FS.destroyNode(node);
  },
  readlink(path) {
    var lookup = FS.lookupPath(path);
    var link = lookup.node;
    if (!link) {
      throw new FS.ErrnoError(44);
    }
    if (!link.node_ops.readlink) {
      throw new FS.ErrnoError(28);
    }
    return link.node_ops.readlink(link);
  },
  stat(path, dontFollow) {
    var lookup = FS.lookupPath(path, {
      follow: !dontFollow
    });
    var node = lookup.node;
    var getattr = FS.checkOpExists(node.node_ops.getattr, 63);
    return getattr(node);
  },
  fstat(fd) {
    var stream = FS.getStreamChecked(fd);
    var node = stream.node;
    var getattr = stream.stream_ops.getattr;
    var arg = getattr ? stream : node;
    getattr ??= node.node_ops.getattr;
    FS.checkOpExists(getattr, 63);
    return getattr(arg);
  },
  lstat(path) {
    return FS.stat(path, true);
  },
  doChmod(stream, node, mode, dontFollow) {
    FS.doSetAttr(stream, node, {
      mode: (mode & 4095) | (node.mode & ~4095),
      ctime: Date.now(),
      dontFollow
    });
  },
  chmod(path, mode, dontFollow) {
    var node;
    if (typeof path == "string") {
      var lookup = FS.lookupPath(path, {
        follow: !dontFollow
      });
      node = lookup.node;
    } else {
      node = path;
    }
    FS.doChmod(null, node, mode, dontFollow);
  },
  lchmod(path, mode) {
    FS.chmod(path, mode, true);
  },
  fchmod(fd, mode) {
    var stream = FS.getStreamChecked(fd);
    FS.doChmod(stream, stream.node, mode, false);
  },
  doChown(stream, node, dontFollow) {
    FS.doSetAttr(stream, node, {
      timestamp: Date.now(),
      dontFollow
    });
  },
  chown(path, uid, gid, dontFollow) {
    var node;
    if (typeof path == "string") {
      var lookup = FS.lookupPath(path, {
        follow: !dontFollow
      });
      node = lookup.node;
    } else {
      node = path;
    }
    FS.doChown(null, node, dontFollow);
  },
  lchown(path, uid, gid) {
    FS.chown(path, uid, gid, true);
  },
  fchown(fd, uid, gid) {
    var stream = FS.getStreamChecked(fd);
    FS.doChown(stream, stream.node, false);
  },
  doTruncate(stream, node, len) {
    if (FS.isDir(node.mode)) {
      throw new FS.ErrnoError(31);
    }
    if (!FS.isFile(node.mode)) {
      throw new FS.ErrnoError(28);
    }
    var errCode = FS.nodePermissions(node, "w");
    if (errCode) {
      throw new FS.ErrnoError(errCode);
    }
    FS.doSetAttr(stream, node, {
      size: len,
      timestamp: Date.now()
    });
  },
  truncate(path, len) {
    if (len < 0) {
      throw new FS.ErrnoError(28);
    }
    var node;
    if (typeof path == "string") {
      var lookup = FS.lookupPath(path, {
        follow: true
      });
      node = lookup.node;
    } else {
      node = path;
    }
    FS.doTruncate(null, node, len);
  },
  ftruncate(fd, len) {
    var stream = FS.getStreamChecked(fd);
    if (len < 0 || (stream.flags & 2097155) === 0) {
      throw new FS.ErrnoError(28);
    }
    FS.doTruncate(stream, stream.node, len);
  },
  utime(path, atime, mtime) {
    var lookup = FS.lookupPath(path, {
      follow: true
    });
    var node = lookup.node;
    var setattr = FS.checkOpExists(node.node_ops.setattr, 63);
    setattr(node, {
      atime,
      mtime
    });
  },
  open(path, flags, mode = 438) {
    if (path === "") {
      throw new FS.ErrnoError(44);
    }
    flags = typeof flags == "string" ? FS_modeStringToFlags(flags) : flags;
    if ((flags & 64)) {
      mode = (mode & 4095) | 32768;
    } else {
      mode = 0;
    }
    var node;
    var isDirPath;
    if (typeof path == "object") {
      node = path;
    } else {
      isDirPath = path.endsWith("/");
      // noent_okay makes it so that if the final component of the path
      // doesn't exist, lookupPath returns `node: undefined`. `path` will be
      // updated to point to the target of all symlinks.
      var lookup = FS.lookupPath(path, {
        follow: !(flags & 131072),
        noent_okay: true
      });
      node = lookup.node;
      path = lookup.path;
    }
    // perhaps we need to create the node
    var created = false;
    if ((flags & 64)) {
      if (node) {
        // if O_CREAT and O_EXCL are set, error out if the node already exists
        if ((flags & 128)) {
          throw new FS.ErrnoError(20);
        }
      } else if (isDirPath) {
        throw new FS.ErrnoError(31);
      } else {
        // node doesn't exist, try to create it
        // Ignore the permission bits here to ensure we can `open` this new
        // file below. We use chmod below the apply the permissions once the
        // file is open.
        node = FS.mknod(path, mode | 511, 0);
        created = true;
      }
    }
    if (!node) {
      throw new FS.ErrnoError(44);
    }
    // can't truncate a device
    if (FS.isChrdev(node.mode)) {
      flags &= ~512;
    }
    // if asked only for a directory, then this must be one
    if ((flags & 65536) && !FS.isDir(node.mode)) {
      throw new FS.ErrnoError(54);
    }
    // check permissions, if this is not a file we just created now (it is ok to
    // create and write to a file with read-only permissions; it is read-only
    // for later use)
    if (!created) {
      var errCode = FS.mayOpen(node, flags);
      if (errCode) {
        throw new FS.ErrnoError(errCode);
      }
    }
    // do truncation if necessary
    if ((flags & 512) && !created) {
      FS.truncate(node, 0);
    }
    // we've already handled these, don't pass down to the underlying vfs
    flags &= ~(128 | 512 | 131072);
    // register the stream with the filesystem
    var stream = FS.createStream({
      node,
      path: FS.getPath(node),
      // we want the absolute path to the node
      flags,
      seekable: true,
      position: 0,
      stream_ops: node.stream_ops,
      // used by the file family libc calls (fopen, fwrite, ferror, etc.)
      ungotten: [],
      error: false
    });
    // call the new stream's open function
    if (stream.stream_ops.open) {
      stream.stream_ops.open(stream);
    }
    if (created) {
      FS.chmod(node, mode & 511);
    }
    if (Module["logReadFiles"] && !(flags & 1)) {
      if (!(path in FS.readFiles)) {
        FS.readFiles[path] = 1;
      }
    }
    return stream;
  },
  close(stream) {
    if (FS.isClosed(stream)) {
      throw new FS.ErrnoError(8);
    }
    if (stream.getdents) stream.getdents = null;
    // free readdir state
    try {
      if (stream.stream_ops.close) {
        stream.stream_ops.close(stream);
      }
    } catch (e) {
      throw e;
    } finally {
      FS.closeStream(stream.fd);
    }
    stream.fd = null;
  },
  isClosed(stream) {
    return stream.fd === null;
  },
  llseek(stream, offset, whence) {
    if (FS.isClosed(stream)) {
      throw new FS.ErrnoError(8);
    }
    if (!stream.seekable || !stream.stream_ops.llseek) {
      throw new FS.ErrnoError(70);
    }
    if (whence != 0 && whence != 1 && whence != 2) {
      throw new FS.ErrnoError(28);
    }
    stream.position = stream.stream_ops.llseek(stream, offset, whence);
    stream.ungotten = [];
    return stream.position;
  },
  read(stream, buffer, offset, length, position) {
    if (length < 0 || position < 0) {
      throw new FS.ErrnoError(28);
    }
    if (FS.isClosed(stream)) {
      throw new FS.ErrnoError(8);
    }
    if ((stream.flags & 2097155) === 1) {
      throw new FS.ErrnoError(8);
    }
    if (FS.isDir(stream.node.mode)) {
      throw new FS.ErrnoError(31);
    }
    if (!stream.stream_ops.read) {
      throw new FS.ErrnoError(28);
    }
    var seeking = typeof position != "undefined";
    if (!seeking) {
      position = stream.position;
    } else if (!stream.seekable) {
      throw new FS.ErrnoError(70);
    }
    var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
    if (!seeking) stream.position += bytesRead;
    return bytesRead;
  },
  write(stream, buffer, offset, length, position, canOwn) {
    if (length < 0 || position < 0) {
      throw new FS.ErrnoError(28);
    }
    if (FS.isClosed(stream)) {
      throw new FS.ErrnoError(8);
    }
    if ((stream.flags & 2097155) === 0) {
      throw new FS.ErrnoError(8);
    }
    if (FS.isDir(stream.node.mode)) {
      throw new FS.ErrnoError(31);
    }
    if (!stream.stream_ops.write) {
      throw new FS.ErrnoError(28);
    }
    if (stream.seekable && stream.flags & 1024) {
      // seek to the end before writing in append mode
      FS.llseek(stream, 0, 2);
    }
    var seeking = typeof position != "undefined";
    if (!seeking) {
      position = stream.position;
    } else if (!stream.seekable) {
      throw new FS.ErrnoError(70);
    }
    var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
    if (!seeking) stream.position += bytesWritten;
    return bytesWritten;
  },
  mmap(stream, length, position, prot, flags) {
    // User requests writing to file (prot & PROT_WRITE != 0).
    // Checking if we have permissions to write to the file unless
    // MAP_PRIVATE flag is set. According to POSIX spec it is possible
    // to write to file opened in read-only mode with MAP_PRIVATE flag,
    // as all modifications will be visible only in the memory of
    // the current process.
    if ((prot & 2) !== 0 && (flags & 2) === 0 && (stream.flags & 2097155) !== 2) {
      throw new FS.ErrnoError(2);
    }
    if ((stream.flags & 2097155) === 1) {
      throw new FS.ErrnoError(2);
    }
    if (!stream.stream_ops.mmap) {
      throw new FS.ErrnoError(43);
    }
    if (!length) {
      throw new FS.ErrnoError(28);
    }
    return stream.stream_ops.mmap(stream, length, position, prot, flags);
  },
  msync(stream, buffer, offset, length, mmapFlags) {
    if (!stream.stream_ops.msync) {
      return 0;
    }
    return stream.stream_ops.msync(stream, buffer, offset, length, mmapFlags);
  },
  ioctl(stream, cmd, arg) {
    if (!stream.stream_ops.ioctl) {
      throw new FS.ErrnoError(59);
    }
    return stream.stream_ops.ioctl(stream, cmd, arg);
  },
  readFile(path, opts = {}) {
    opts.flags = opts.flags || 0;
    opts.encoding = opts.encoding || "binary";
    if (opts.encoding !== "utf8" && opts.encoding !== "binary") {
      abort(`Invalid encoding type "${opts.encoding}"`);
    }
    var stream = FS.open(path, opts.flags);
    var stat = FS.stat(path);
    var length = stat.size;
    var buf = new Uint8Array(length);
    FS.read(stream, buf, 0, length, 0);
    if (opts.encoding === "utf8") {
      buf = UTF8ArrayToString(buf);
    }
    FS.close(stream);
    return buf;
  },
  writeFile(path, data, opts = {}) {
    opts.flags = opts.flags || 577;
    var stream = FS.open(path, opts.flags, opts.mode);
    if (typeof data == "string") {
      data = new Uint8Array(intArrayFromString(data, true));
    }
    if (ArrayBuffer.isView(data)) {
      FS.write(stream, data, 0, data.byteLength, undefined, opts.canOwn);
    } else {
      abort("Unsupported data type");
    }
    FS.close(stream);
  },
  cwd: () => FS.currentPath,
  chdir(path) {
    var lookup = FS.lookupPath(path, {
      follow: true
    });
    if (lookup.node === null) {
      throw new FS.ErrnoError(44);
    }
    if (!FS.isDir(lookup.node.mode)) {
      throw new FS.ErrnoError(54);
    }
    var errCode = FS.nodePermissions(lookup.node, "x");
    if (errCode) {
      throw new FS.ErrnoError(errCode);
    }
    FS.currentPath = lookup.path;
  },
  createDefaultDirectories() {
    FS.mkdir("/tmp");
    FS.mkdir("/home");
    FS.mkdir("/home/web_user");
  },
  createDefaultDevices() {
    // create /dev
    FS.mkdir("/dev");
    // setup /dev/null
    FS.registerDevice(FS.makedev(1, 3), {
      read: () => 0,
      write: (stream, buffer, offset, length, pos) => length,
      llseek: () => 0
    });
    FS.mkdev("/dev/null", FS.makedev(1, 3));
    // setup /dev/tty and /dev/tty1
    // stderr needs to print output using err() rather than out()
    // so we register a second tty just for it.
    TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
    TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
    FS.mkdev("/dev/tty", FS.makedev(5, 0));
    FS.mkdev("/dev/tty1", FS.makedev(6, 0));
    // setup /dev/[u]random
    // use a buffer to avoid overhead of individual crypto calls per byte
    var randomBuffer = new Uint8Array(1024), randomLeft = 0;
    var randomByte = () => {
      if (randomLeft === 0) {
        randomFill(randomBuffer);
        randomLeft = randomBuffer.byteLength;
      }
      return randomBuffer[--randomLeft];
    };
    FS.createDevice("/dev", "random", randomByte);
    FS.createDevice("/dev", "urandom", randomByte);
    // we're not going to emulate the actual shm device,
    // just create the tmp dirs that reside in it commonly
    FS.mkdir("/dev/shm");
    FS.mkdir("/dev/shm/tmp");
  },
  createSpecialDirectories() {
    // create /proc/self/fd which allows /proc/self/fd/6 => readlink gives the
    // name of the stream for fd 6 (see test_unistd_ttyname)
    FS.mkdir("/proc");
    var proc_self = FS.mkdir("/proc/self");
    FS.mkdir("/proc/self/fd");
    FS.mount({
      mount() {
        var node = FS.createNode(proc_self, "fd", 16895, 73);
        node.stream_ops = {
          llseek: MEMFS.stream_ops.llseek
        };
        node.node_ops = {
          lookup(parent, name) {
            var fd = +name;
            var stream = FS.getStreamChecked(fd);
            var ret = {
              parent: null,
              mount: {
                mountpoint: "fake"
              },
              node_ops: {
                readlink: () => stream.path
              },
              id: fd + 1
            };
            ret.parent = ret;
            // make it look like a simple root node
            return ret;
          },
          readdir() {
            return Array.from(FS.streams.entries()).filter(([k, v]) => v).map(([k, v]) => k.toString());
          }
        };
        return node;
      }
    }, {}, "/proc/self/fd");
  },
  createStandardStreams(input, output, error) {
    // TODO deprecate the old functionality of a single
    // input / output callback and that utilizes FS.createDevice
    // and instead require a unique set of stream ops
    // by default, we symlink the standard streams to the
    // default tty devices. however, if the standard streams
    // have been overwritten we create a unique device for
    // them instead.
    if (input) {
      FS.createDevice("/dev", "stdin", input);
    } else {
      FS.symlink("/dev/tty", "/dev/stdin");
    }
    if (output) {
      FS.createDevice("/dev", "stdout", null, output);
    } else {
      FS.symlink("/dev/tty", "/dev/stdout");
    }
    if (error) {
      FS.createDevice("/dev", "stderr", null, error);
    } else {
      FS.symlink("/dev/tty1", "/dev/stderr");
    }
    // open default streams for the stdin, stdout and stderr devices
    var stdin = FS.open("/dev/stdin", 0);
    var stdout = FS.open("/dev/stdout", 1);
    var stderr = FS.open("/dev/stderr", 1);
  },
  staticInit() {
    FS.nameTable = new Array(4096);
    FS.mount(MEMFS, {}, "/");
    FS.createDefaultDirectories();
    FS.createDefaultDevices();
    FS.createSpecialDirectories();
    FS.filesystems = {
      "MEMFS": MEMFS,
      "NODEFS": NODEFS,
      "PROXYFS": PROXYFS
    };
  },
  init(input, output, error) {
    FS.initialized = true;
    // Allow Module.stdin etc. to provide defaults, if none explicitly passed to us here
    input ??= Module["stdin"];
    output ??= Module["stdout"];
    error ??= Module["stderr"];
    FS.createStandardStreams(input, output, error);
  },
  quit() {
    FS.initialized = false;
    // force-flush all streams, so we get musl std streams printed out
    _fflush(0);
    // close all of our streams
    for (var stream of FS.streams) {
      if (stream) {
        FS.close(stream);
      }
    }
  },
  findObject(path, dontResolveLastLink) {
    var ret = FS.analyzePath(path, dontResolveLastLink);
    if (!ret.exists) {
      return null;
    }
    return ret.object;
  },
  analyzePath(path, dontResolveLastLink) {
    // operate from within the context of the symlink's target
    try {
      var lookup = FS.lookupPath(path, {
        follow: !dontResolveLastLink
      });
      path = lookup.path;
    } catch (e) {}
    var ret = {
      isRoot: false,
      exists: false,
      error: 0,
      name: null,
      path: null,
      object: null,
      parentExists: false,
      parentPath: null,
      parentObject: null
    };
    try {
      var lookup = FS.lookupPath(path, {
        parent: true
      });
      ret.parentExists = true;
      ret.parentPath = lookup.path;
      ret.parentObject = lookup.node;
      ret.name = PATH.basename(path);
      lookup = FS.lookupPath(path, {
        follow: !dontResolveLastLink
      });
      ret.exists = true;
      ret.path = lookup.path;
      ret.object = lookup.node;
      ret.name = lookup.node.name;
      ret.isRoot = lookup.path === "/";
    } catch (e) {
      ret.error = e.errno;
    }
    return ret;
  },
  createPath(parent, path, canRead, canWrite) {
    parent = typeof parent == "string" ? parent : FS.getPath(parent);
    var parts = path.split("/").reverse();
    while (parts.length) {
      var part = parts.pop();
      if (!part) continue;
      var current = PATH.join2(parent, part);
      try {
        FS.mkdir(current);
      } catch (e) {
        if (e.errno != 20) throw e;
      }
      parent = current;
    }
    return current;
  },
  createFile(parent, name, properties, canRead, canWrite) {
    var path = PATH.join2(typeof parent == "string" ? parent : FS.getPath(parent), name);
    var mode = FS_getMode(canRead, canWrite);
    return FS.create(path, mode);
  },
  createDataFile(parent, name, data, canRead, canWrite, canOwn) {
    var path = name;
    if (parent) {
      parent = typeof parent == "string" ? parent : FS.getPath(parent);
      path = name ? PATH.join2(parent, name) : parent;
    }
    var mode = FS_getMode(canRead, canWrite);
    var node = FS.create(path, mode);
    if (data) {
      if (typeof data == "string") {
        var arr = new Array(data.length);
        for (var i = 0, len = data.length; i < len; ++i) arr[i] = data.charCodeAt(i);
        data = arr;
      }
      // make sure we can write to the file
      FS.chmod(node, mode | 146);
      var stream = FS.open(node, 577);
      FS.write(stream, data, 0, data.length, 0, canOwn);
      FS.close(stream);
      FS.chmod(node, mode);
    }
  },
  createDevice(parent, name, input, output) {
    var path = PATH.join2(typeof parent == "string" ? parent : FS.getPath(parent), name);
    var mode = FS_getMode(!!input, !!output);
    FS.createDevice.major ??= 64;
    var dev = FS.makedev(FS.createDevice.major++, 0);
    // Create a fake device that a set of stream ops to emulate
    // the old behavior.
    FS.registerDevice(dev, {
      open(stream) {
        stream.seekable = false;
      },
      close(stream) {
        // flush any pending line data
        if (output?.buffer?.length) {
          output(10);
        }
      },
      read(stream, buffer, offset, length, pos) {
        var bytesRead = 0;
        for (var i = 0; i < length; i++) {
          var result;
          try {
            result = input();
          } catch (e) {
            throw new FS.ErrnoError(29);
          }
          if (result === undefined && bytesRead === 0) {
            throw new FS.ErrnoError(6);
          }
          if (result === null || result === undefined) break;
          bytesRead++;
          buffer[offset + i] = result;
        }
        if (bytesRead) {
          stream.node.atime = Date.now();
        }
        return bytesRead;
      },
      write(stream, buffer, offset, length, pos) {
        for (var i = 0; i < length; i++) {
          try {
            output(buffer[offset + i]);
          } catch (e) {
            throw new FS.ErrnoError(29);
          }
        }
        if (length) {
          stream.node.mtime = stream.node.ctime = Date.now();
        }
        return i;
      }
    });
    return FS.mkdev(path, mode, dev);
  },
  forceLoadFile(obj) {
    if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
    if (globalThis.XMLHttpRequest) {
      abort("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.");
    } else {
      // Command-line.
      try {
        obj.contents = readBinary(obj.url);
      } catch (e) {
        throw new FS.ErrnoError(29);
      }
    }
  },
  createLazyFile(parent, name, url, canRead, canWrite) {
    // Lazy chunked Uint8Array (implements get and length from Uint8Array).
    // Actual getting is abstracted away for eventual reuse.
    class LazyUint8Array {
      lengthKnown=false;
      chunks=[];
      // Loaded chunks. Index is the chunk number
      get(idx) {
        if (idx > this.length - 1 || idx < 0) {
          return undefined;
        }
        var chunkOffset = idx % this.chunkSize;
        var chunkNum = (idx / this.chunkSize) | 0;
        return this.getter(chunkNum)[chunkOffset];
      }
      setDataGetter(getter) {
        this.getter = getter;
      }
      cacheLength() {
        // Find length
        var xhr = new XMLHttpRequest;
        xhr.open("HEAD", url, false);
        xhr.send(null);
        if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) abort("Couldn't load " + url + ". Status: " + xhr.status);
        var datalength = Number(xhr.getResponseHeader("Content-length"));
        var header;
        var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
        var usesGzip = (header = xhr.getResponseHeader("Content-Encoding")) && header === "gzip";
        var chunkSize = 1024 * 1024;
        // Chunk size in bytes
        if (!hasByteServing) chunkSize = datalength;
        // Function to get a range from the remote URL.
        var doXHR = (from, to) => {
          if (from > to) abort("invalid range (" + from + ", " + to + ") or no bytes requested!");
          if (to > datalength - 1) abort("only " + datalength + " bytes available! programmer error!");
          // TODO: Use mozResponseArrayBuffer, responseStream, etc. if available.
          var xhr = new XMLHttpRequest;
          xhr.open("GET", url, false);
          if (datalength !== chunkSize) xhr.setRequestHeader("Range", "bytes=" + from + "-" + to);
          // Some hints to the browser that we want binary data.
          xhr.responseType = "arraybuffer";
          if (xhr.overrideMimeType) {
            xhr.overrideMimeType("text/plain; charset=x-user-defined");
          }
          xhr.send(null);
          if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) abort("Couldn't load " + url + ". Status: " + xhr.status);
          if (xhr.response !== undefined) {
            return new Uint8Array(/** @type{Array<number>} */ (xhr.response || []));
          }
          return intArrayFromString(xhr.responseText || "", true);
        };
        var lazyArray = this;
        lazyArray.setDataGetter(chunkNum => {
          var start = chunkNum * chunkSize;
          var end = (chunkNum + 1) * chunkSize - 1;
          // including this byte
          end = Math.min(end, datalength - 1);
          // if datalength-1 is selected, this is the last block
          if (typeof lazyArray.chunks[chunkNum] == "undefined") {
            lazyArray.chunks[chunkNum] = doXHR(start, end);
          }
          if (typeof lazyArray.chunks[chunkNum] == "undefined") abort("doXHR failed!");
          return lazyArray.chunks[chunkNum];
        });
        if (usesGzip || !datalength) {
          // if the server uses gzip or doesn't supply the length, we have to download the whole file to get the (uncompressed) length
          chunkSize = datalength = 1;
          // this will force getter(0)/doXHR do download the whole file
          datalength = this.getter(0).length;
          chunkSize = datalength;
          out("LazyFiles on gzip forces download of the whole file when length is accessed");
        }
        this._length = datalength;
        this._chunkSize = chunkSize;
        this.lengthKnown = true;
      }
      get length() {
        if (!this.lengthKnown) {
          this.cacheLength();
        }
        return this._length;
      }
      get chunkSize() {
        if (!this.lengthKnown) {
          this.cacheLength();
        }
        return this._chunkSize;
      }
    }
    if (globalThis.XMLHttpRequest) {
      if (!ENVIRONMENT_IS_WORKER) abort("Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc");
      var lazyArray = new LazyUint8Array;
      var properties = {
        isDevice: false,
        contents: lazyArray
      };
    } else {
      var properties = {
        isDevice: false,
        url
      };
    }
    var node = FS.createFile(parent, name, properties, canRead, canWrite);
    // This is a total hack, but I want to get this lazy file code out of the
    // core of MEMFS. If we want to keep this lazy file concept I feel it should
    // be its own thin LAZYFS proxying calls to MEMFS.
    if (properties.contents) {
      node.contents = properties.contents;
    } else if (properties.url) {
      node.contents = null;
      node.url = properties.url;
    }
    // Add a function that defers querying the file size until it is asked the first time.
    Object.defineProperties(node, {
      usedBytes: {
        get: function() {
          return this.contents.length;
        }
      }
    });
    // override each stream op with one that tries to force load the lazy file first
    var stream_ops = {};
    for (const [key, fn] of Object.entries(node.stream_ops)) {
      stream_ops[key] = (...args) => {
        FS.forceLoadFile(node);
        return fn(...args);
      };
    }
    function writeChunks(stream, buffer, offset, length, position) {
      var contents = stream.node.contents;
      if (position >= contents.length) return 0;
      var size = Math.min(contents.length - position, length);
      if (contents.slice) {
        // normal array
        for (var i = 0; i < size; i++) {
          buffer[offset + i] = contents[position + i];
        }
      } else {
        for (var i = 0; i < size; i++) {
          // LazyUint8Array from sync binary XHR
          buffer[offset + i] = contents.get(position + i);
        }
      }
      return size;
    }
    // use a custom read function
    stream_ops.read = (stream, buffer, offset, length, position) => {
      FS.forceLoadFile(node);
      return writeChunks(stream, buffer, offset, length, position);
    };
    // use a custom mmap function
    stream_ops.mmap = (stream, length, position, prot, flags) => {
      FS.forceLoadFile(node);
      var ptr = mmapAlloc(length);
      if (!ptr) {
        throw new FS.ErrnoError(48);
      }
      writeChunks(stream, HEAP8, ptr, length, position);
      return {
        ptr,
        allocated: true
      };
    };
    node.stream_ops = stream_ops;
    return node;
  }
};

var findLibraryFS = (libName, rpath) => {
  // If we're preloading a dynamic library, the runtime is not ready to call
  // __wasmfs_identify or __emscripten_find_dylib. So just quit out.
  // This means that DT_NEEDED for the main module and transitive dependencies
  // of it won't work with this code path. Similarly, it means that calling
  // loadDynamicLibrary in a preRun hook can't use this code path.
  if (!runtimeInitialized) {
    return undefined;
  }
  if (PATH.isAbs(libName)) {
    try {
      FS.lookupPath(libName);
      return libName;
    } catch (e) {
      return undefined;
    }
  }
  var rpathResolved = (rpath?.paths || []).map(p => replaceORIGIN(rpath?.parentLibPath, p));
  return withStackSave(() => {
    // In dylink.c we use: `char buf[2*NAME_MAX+2];` and NAME_MAX is 255.
    // So we use the same size here.
    var bufSize = 2 * 255 + 2;
    var buf = stackAlloc(bufSize);
    var rpathC = stringToUTF8OnStack(rpathResolved.join(":"));
    var libNameC = stringToUTF8OnStack(libName);
    var resLibNameC = __emscripten_find_dylib(buf, rpathC, libNameC, bufSize);
    return resLibNameC ? UTF8ToString(resLibNameC) : undefined;
  });
};

/**
       * @param {number=} handle
       * @param {Object=} localScope
       */ function loadDynamicLibrary(libName, flags = {
  global: true,
  nodelete: true
}, localScope, handle) {
  // when loadDynamicLibrary did not have flags, libraries were loaded
  // globally & permanently
  var dso = LDSO.loadedLibsByName[libName];
  if (dso) {
    // the library is being loaded or has been loaded already.
    if (!flags.global) {
      if (localScope) {
        Object.assign(localScope, dso.exports);
      }
    } else if (!dso.global) {
      // The library was previously loaded only locally but not
      // we have a request with global=true.
      dso.global = true;
      mergeLibSymbols(dso.exports, libName);
    }
    // same for "nodelete"
    if (flags.nodelete && dso.refcount !== Infinity) {
      dso.refcount = Infinity;
    }
    dso.refcount++;
    if (handle) {
      LDSO.loadedLibsByHandle[handle] = dso;
    }
    return flags.loadAsync ? Promise.resolve(true) : true;
  }
  // allocate new DSO
  dso = newDSO(libName, handle, "loading");
  dso.refcount = flags.nodelete ? Infinity : 1;
  dso.global = flags.global;
  // libName -> libData
  function loadLibData() {
    // for wasm, we can use fetch for async, but for fs mode we can only imitate it
    if (handle) {
      var data = HEAPU32[(((handle) + (28)) >> 2)];
      var dataSize = HEAPU32[(((handle) + (32)) >> 2)];
      if (data && dataSize) {
        var libData = HEAP8.slice(data, data + dataSize);
        return flags.loadAsync ? Promise.resolve(libData) : libData;
      }
    }
    var f = findLibraryFS(libName, flags.rpath);
    if (f) {
      var libData = FS.readFile(f, {
        encoding: "binary"
      });
      return flags.loadAsync ? Promise.resolve(libData) : libData;
    }
    var libFile = locateFile(libName);
    if (flags.loadAsync) {
      return asyncLoad(libFile);
    }
    // load the binary synchronously
    if (!readBinary) {
      throw new Error(`${libFile}: file not found, and synchronous loading of external files is not available`);
    }
    return readBinary(libFile);
  }
  // libName -> exports
  function getExports() {
    // lookup preloaded cache first
    var preloaded = preloadedWasm[libName];
    if (preloaded) {
      return flags.loadAsync ? Promise.resolve(preloaded) : preloaded;
    }
    // module not preloaded - load lib data and create new module from it
    if (flags.loadAsync) {
      return loadLibData().then(libData => loadWebAssemblyModule(libData, flags, libName, localScope, handle));
    }
    return loadWebAssemblyModule(loadLibData(), flags, libName, localScope, handle);
  }
  // module for lib is loaded - update the dso & global namespace
  function moduleLoaded(exports) {
    if (dso.global) {
      mergeLibSymbols(exports, libName);
    } else if (localScope) {
      Object.assign(localScope, exports);
    }
    dso.exports = exports;
  }
  if (flags.loadAsync) {
    return getExports().then(exports => {
      moduleLoaded(exports);
      return true;
    });
  }
  moduleLoaded(getExports());
  return true;
}

var reportUndefinedSymbols = () => {
  for (var [symName, entry] of Object.entries(GOT)) {
    if (entry.value == -1) {
      var value = resolveGlobalSymbol(symName, true).sym;
      if (!value && !entry.required) {
        // Ignore undefined symbols that are imported as weak.
        entry.value = 0;
        continue;
      }
      if (typeof value == "function") {
        /** @suppress {checkTypes} */ entry.value = addFunction(value, value.sig);
      } else if (typeof value == "number") {
        entry.value = value;
      } else {
        throw new Error(`bad export type for '${symName}': ${typeof value} (${value})`);
      }
    }
  }
};

var loadDylibs = async () => {
  if (!dynamicLibraries.length) {
    reportUndefinedSymbols();
    return;
  }
  addRunDependency("loadDylibs");
  // Load binaries asynchronously
  for (var lib of dynamicLibraries) {
    await loadDynamicLibrary(lib, {
      loadAsync: true,
      global: true,
      nodelete: true,
      allowUndefined: true
    });
  }
  // we got them all, wonderful
  reportUndefinedSymbols();
  removeRunDependency("loadDylibs");
};

var noExitRuntime = false;

var ___assert_fail = (condition, filename, line, func) => abort(`Assertion failed: ${UTF8ToString(condition)}, at: ` + [ filename ? UTF8ToString(filename) : "unknown filename", line, func ? UTF8ToString(func) : "unknown function" ]);

___assert_fail.sig = "vppip";

var ___call_sighandler = (fp, sig) => getWasmTableEntry(fp)(sig);

___call_sighandler.sig = "vpi";

var SOCKFS = {
  websocketArgs: {},
  callbacks: {},
  on(event, callback) {
    SOCKFS.callbacks[event] = callback;
  },
  emit(event, param) {
    SOCKFS.callbacks[event]?.(param);
  },
  mount(mount) {
    // The incomming Module['websocket'] can be used for configuring 
    // configuring subprotocol/url, etc
    SOCKFS.websocketArgs = Module["websocket"] || {};
    // Add the Event registration mechanism to the exported websocket configuration
    // object so we can register network callbacks from native JavaScript too.
    // For more documentation see system/include/emscripten/emscripten.h
    (Module["websocket"] ??= {})["on"] = SOCKFS.on;
    return FS.createNode(null, "/", 16895, 0);
  },
  createSocket(family, type, protocol) {
    // Emscripten only supports AF_INET
    if (family != 2) {
      throw new FS.ErrnoError(5);
    }
    type &= ~526336;
    // Some applications may pass it; it makes no sense for a single process.
    // Emscripten only supports SOCK_STREAM and SOCK_DGRAM
    if (type != 1 && type != 2) {
      throw new FS.ErrnoError(28);
    }
    var streaming = type == 1;
    if (streaming && protocol && protocol != 6) {
      throw new FS.ErrnoError(66);
    }
    // create our internal socket structure
    var sock = {
      family,
      type,
      protocol,
      server: null,
      error: null,
      // Used in getsockopt for SOL_SOCKET/SO_ERROR test
      peers: {},
      pending: [],
      recv_queue: [],
      sock_ops: SOCKFS.websocket_sock_ops
    };
    // create the filesystem node to store the socket structure
    var name = SOCKFS.nextname();
    var node = FS.createNode(SOCKFS.root, name, 49152, 0);
    node.sock = sock;
    // and the wrapping stream that enables library functions such
    // as read and write to indirectly interact with the socket
    var stream = FS.createStream({
      path: name,
      node,
      flags: 2,
      seekable: false,
      stream_ops: SOCKFS.stream_ops
    });
    // map the new stream to the socket structure (sockets have a 1:1
    // relationship with a stream)
    sock.stream = stream;
    return sock;
  },
  getSocket(fd) {
    var stream = FS.getStream(fd);
    if (!stream || !FS.isSocket(stream.node.mode)) {
      return null;
    }
    return stream.node.sock;
  },
  stream_ops: {
    poll(stream) {
      var sock = stream.node.sock;
      return sock.sock_ops.poll(sock);
    },
    ioctl(stream, request, varargs) {
      var sock = stream.node.sock;
      return sock.sock_ops.ioctl(sock, request, varargs);
    },
    read(stream, buffer, offset, length, position) {
      var sock = stream.node.sock;
      var msg = sock.sock_ops.recvmsg(sock, length);
      if (!msg) {
        // socket is closed
        return 0;
      }
      buffer.set(msg.buffer, offset);
      return msg.buffer.length;
    },
    write(stream, buffer, offset, length, position) {
      var sock = stream.node.sock;
      return sock.sock_ops.sendmsg(sock, buffer, offset, length);
    },
    close(stream) {
      var sock = stream.node.sock;
      sock.sock_ops.close(sock);
    }
  },
  nextname() {
    if (!SOCKFS.nextname.current) {
      SOCKFS.nextname.current = 0;
    }
    return `socket[${SOCKFS.nextname.current++}]`;
  },
  websocket_sock_ops: {
    createPeer(sock, addr, port) {
      var ws;
      if (typeof addr == "object") {
        ws = addr;
        addr = null;
        port = null;
      }
      if (ws) {
        // for sockets that've already connected (e.g. we're the server)
        // we can inspect the _socket property for the address
        if (ws._socket) {
          addr = ws._socket.remoteAddress;
          port = ws._socket.remotePort;
        } else {
          var result = /ws[s]?:\/\/([^:]+):(\d+)/.exec(ws.url);
          if (!result) {
            throw new Error("WebSocket URL must be in the format ws(s)://address:port");
          }
          addr = result[1];
          port = parseInt(result[2], 10);
        }
      } else {
        // create the actual websocket object and connect
        try {
          // The default value is 'ws://' the replace is needed because the compiler replaces '//' comments with '#'
          // comments without checking context, so we'd end up with ws:#, the replace swaps the '#' for '//' again.
          var url = "ws://".replace("#", "//");
          // Make the WebSocket subprotocol (Sec-WebSocket-Protocol) default to binary if no configuration is set.
          var subProtocols = "binary";
          // The default value is 'binary'
          // The default WebSocket options
          var opts = undefined;
          // Fetch runtime WebSocket URL config.
          if("function"===typeof SOCKFS.websocketArgs["url"]) {
url = SOCKFS.websocketArgs["url"](...arguments);
}else if ("string" === typeof SOCKFS.websocketArgs["url"]) {
            url = SOCKFS.websocketArgs["url"];
          }
          // Fetch runtime WebSocket subprotocol config.
          if (SOCKFS.websocketArgs["subprotocol"]) {
            subProtocols = SOCKFS.websocketArgs["subprotocol"];
          } else if (SOCKFS.websocketArgs["subprotocol"] === null) {
            subProtocols = "null";
          }
          if (url === "ws://" || url === "wss://") {
            // Is the supplied URL config just a prefix, if so complete it.
            var parts = addr.split("/");
            url = url + parts[0] + ":" + port + "/" + parts.slice(1).join("/");
          }
          if (subProtocols !== "null") {
            // The regex trims the string (removes spaces at the beginning and end, then splits the string by
            // <any space>,<any space> into an Array. Whitespace removal is important for Websockify and ws.
            subProtocols = subProtocols.replace(/^ +| +$/g, "").split(/ *, */);
            opts = subProtocols;
          }
          // If node we use the ws library.
          var WebSocketConstructor;
          if (ENVIRONMENT_IS_NODE) {
            WebSocketConstructor = /** @type{(typeof WebSocket)} */ (require("ws"));
          } else {
            WebSocketConstructor = WebSocket;
          }
          if (Module['websocket']['decorator']) {WebSocketConstructor = Module['websocket']['decorator'](WebSocketConstructor);}ws = new WebSocketConstructor(url, opts);
          ws.binaryType = "arraybuffer";
        } catch (e) {
          throw new FS.ErrnoError(23);
        }
      }
      var peer = {
        addr,
        port,
        socket: ws,
        msg_send_queue: []
      };
      SOCKFS.websocket_sock_ops.addPeer(sock, peer);
      SOCKFS.websocket_sock_ops.handlePeerEvents(sock, peer);
      // if this is a bound dgram socket, send the port number first to allow
      // us to override the ephemeral port reported to us by remotePort on the
      // remote end.
      if (sock.type === 2 && typeof sock.sport != "undefined") {
        peer.msg_send_queue.push(new Uint8Array([ 255, 255, 255, 255, "p".charCodeAt(0), "o".charCodeAt(0), "r".charCodeAt(0), "t".charCodeAt(0), ((sock.sport & 65280) >> 8), (sock.sport & 255) ]));
      }
      return peer;
    },
    getPeer(sock, addr, port) {
      return sock.peers[addr + ":" + port];
    },
    addPeer(sock, peer) {
      sock.peers[peer.addr + ":" + peer.port] = peer;
    },
    removePeer(sock, peer) {
      delete sock.peers[peer.addr + ":" + peer.port];
    },
    handlePeerEvents(sock, peer) {
      var first = true;
      var handleOpen = function() {
        sock.connecting = false;
        SOCKFS.emit("open", sock.stream.fd);
        try {
          var queued = peer.msg_send_queue.shift();
          while (queued) {
            peer.socket.send(queued);
            queued = peer.msg_send_queue.shift();
          }
        } catch (e) {
          // not much we can do here in the way of proper error handling as we've already
          // lied and said this data was sent. shut it down.
          peer.socket.close();
        }
      };
      function handleMessage(data) {
        if (typeof data == "string") {
          var encoder = new TextEncoder;
          // should be utf-8
          data = encoder.encode(data);
        } else {
          if (data.byteLength == 0) {
            // An empty ArrayBuffer will emit a pseudo disconnect event
            // as recv/recvmsg will return zero which indicates that a socket
            // has performed a shutdown although the connection has not been disconnected yet.
            return;
          }
          data = new Uint8Array(data);
        }
        // if this is the port message, override the peer's port with it
        var wasfirst = first;
        first = false;
        if (wasfirst && data.length === 10 && data[0] === 255 && data[1] === 255 && data[2] === 255 && data[3] === 255 && data[4] === "p".charCodeAt(0) && data[5] === "o".charCodeAt(0) && data[6] === "r".charCodeAt(0) && data[7] === "t".charCodeAt(0)) {
          // update the peer's port and it's key in the peer map
          var newport = ((data[8] << 8) | data[9]);
          SOCKFS.websocket_sock_ops.removePeer(sock, peer);
          peer.port = newport;
          SOCKFS.websocket_sock_ops.addPeer(sock, peer);
          return;
        }
        sock.recv_queue.push({
          addr: peer.addr,
          port: peer.port,
          data
        });
        SOCKFS.emit("message", sock.stream.fd);
      }
      if (ENVIRONMENT_IS_NODE) {
        peer.socket.on("open", handleOpen);
        peer.socket.on("message", function(data, isBinary) {
          if (!isBinary) {
            return;
          }
          handleMessage((new Uint8Array(data)).buffer);
        });
        peer.socket.on("close", function() {
          SOCKFS.emit("close", sock.stream.fd);
        });
        peer.socket.on("error", function(error) {
          // Although the ws library may pass errors that may be more descriptive than
          // ECONNREFUSED they are not necessarily the expected error code e.g.
          // ENOTFOUND on getaddrinfo seems to be node.js specific, so using ECONNREFUSED
          // is still probably the most useful thing to do.
          sock.error = 14;
          // Used in getsockopt for SOL_SOCKET/SO_ERROR test.
          SOCKFS.emit("error", [ sock.stream.fd, sock.error, "ECONNREFUSED: Connection refused" ]);
        });
      } else {
        peer.socket.onopen = handleOpen;
        peer.socket.onclose = function() {
          SOCKFS.emit("close", sock.stream.fd);
        };
        peer.socket.onmessage = function peer_socket_onmessage(event) {
          handleMessage(event.data);
        };
        peer.socket.onerror = function(error) {
          // The WebSocket spec only allows a 'simple event' to be thrown on error,
          // so we only really know as much as ECONNREFUSED.
          sock.error = 14;
          // Used in getsockopt for SOL_SOCKET/SO_ERROR test.
          SOCKFS.emit("error", [ sock.stream.fd, sock.error, "ECONNREFUSED: Connection refused" ]);
        };
      }
    },
    poll(sock) {
      if (sock.type === 1 && sock.server) {
        // listen sockets should only say they're available for reading
        // if there are pending clients.
        return sock.pending.length ? (64 | 1) : 0;
      }
      var mask = 0;
      var dest = sock.type === 1 ? // we only care about the socket state for connection-based sockets
      SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport) : null;
      if (sock.recv_queue.length || !dest || // connection-less sockets are always ready to read
      (dest && dest.socket.readyState === dest.socket.CLOSING) || (dest && dest.socket.readyState === dest.socket.CLOSED)) {
        // let recv return 0 once closed
        mask |= (64 | 1);
      }
      if (!dest || // connection-less sockets are always ready to write
      (dest && dest.socket.readyState === dest.socket.OPEN)) {
        mask |= 4;
      }
      if ((dest && dest.socket.readyState === dest.socket.CLOSING) || (dest && dest.socket.readyState === dest.socket.CLOSED)) {
        // When an non-blocking connect fails mark the socket as writable.
        // Its up to the calling code to then use getsockopt with SO_ERROR to
        // retrieve the error.
        // See https://man7.org/linux/man-pages/man2/connect.2.html
        if (sock.connecting) {
          mask |= 4;
        } else {
          mask |= 16;
        }
      }
      return mask;
    },
    ioctl(sock, request, arg) {
      switch (request) {
       case 21531:
        var bytes = 0;
        if (sock.recv_queue.length) {
          bytes = sock.recv_queue[0].data.length;
        }
        HEAP32[((arg) >> 2)] = bytes;
        return 0;

       case 21537:
        var on = HEAP32[((arg) >> 2)];
        if (on) {
          sock.stream.flags |= 2048;
        } else {
          sock.stream.flags &= ~2048;
        }
        return 0;

       default:
        return 28;
      }
    },
    close(sock) {
      // if we've spawned a listen server, close it
      if (sock.server) {
        try {
          sock.server.close();
        } catch (e) {}
        sock.server = null;
      }
      // close any peer connections
      for (var peer of Object.values(sock.peers)) {
        try {
          peer.socket.close();
        } catch (e) {}
        SOCKFS.websocket_sock_ops.removePeer(sock, peer);
      }
      return 0;
    },
    bind(sock, addr, port) {
      if (typeof sock.saddr != "undefined" || typeof sock.sport != "undefined") {
        throw new FS.ErrnoError(28);
      }
      sock.saddr = addr;
      sock.sport = port;
      // in order to emulate dgram sockets, we need to launch a listen server when
      // binding on a connection-less socket
      // note: this is only required on the server side
      if (sock.type === 2) {
        // close the existing server if it exists
        if (sock.server) {
          sock.server.close();
          sock.server = null;
        }
        // swallow error operation not supported error that occurs when binding in the
        // browser where this isn't supported
        try {
          sock.sock_ops.listen(sock, 0);
        } catch (e) {
          if (!(e.name === "ErrnoError")) throw e;
          if (e.errno !== 138) throw e;
        }
      }
    },
    connect(sock, addr, port) {
      if (sock.server) {
        throw new FS.ErrnoError(138);
      }
      // TODO autobind
      // if (!sock.addr && sock.type == 2) {
      // }
      // early out if we're already connected / in the middle of connecting
      if (typeof sock.daddr != "undefined" && typeof sock.dport != "undefined") {
        var dest = SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport);
        if (dest) {
          if (dest.socket.readyState === dest.socket.CONNECTING) {
            throw new FS.ErrnoError(7);
          } else {
            throw new FS.ErrnoError(30);
          }
        }
      }
      // add the socket to our peer list and set our
      // destination address / port to match
      var peer = SOCKFS.websocket_sock_ops.createPeer(sock, addr, port);
      sock.daddr = peer.addr;
      sock.dport = peer.port;
      // because we cannot synchronously block to wait for the WebSocket
      // connection to complete, we return here pretending that the connection
      // was a success.
      sock.connecting = true;
    },
    listen(sock, backlog) {
      if (!ENVIRONMENT_IS_NODE) {
        throw new FS.ErrnoError(138);
      }
      if (sock.server) {
        throw new FS.ErrnoError(28);
      }
      var WebSocketServer = require("ws").Server;
      var host = sock.saddr;
      sock.server = new WebSocketServer({
        host,
        port: sock.sport
      });
      SOCKFS.emit("listen", sock.stream.fd);
      // Send Event with listen fd.
      sock.server.on("connection", function(ws) {
        if (sock.type === 1) {
          var newsock = SOCKFS.createSocket(sock.family, sock.type, sock.protocol);
          // create a peer on the new socket
          var peer = SOCKFS.websocket_sock_ops.createPeer(newsock, ws);
          newsock.daddr = peer.addr;
          newsock.dport = peer.port;
          // push to queue for accept to pick up
          sock.pending.push(newsock);
          SOCKFS.emit("connection", newsock.stream.fd);
        } else {
          // create a peer on the listen socket so calling sendto
          // with the listen socket and an address will resolve
          // to the correct client
          SOCKFS.websocket_sock_ops.createPeer(sock, ws);
          SOCKFS.emit("connection", sock.stream.fd);
        }
      });
      sock.server.on("close", function() {
        SOCKFS.emit("close", sock.stream.fd);
        sock.server = null;
      });
      sock.server.on("error", function(error) {
        // Although the ws library may pass errors that may be more descriptive than
        // ECONNREFUSED they are not necessarily the expected error code e.g.
        // ENOTFOUND on getaddrinfo seems to be node.js specific, so using EHOSTUNREACH
        // is still probably the most useful thing to do. This error shouldn't
        // occur in a well written app as errors should get trapped in the compiled
        // app's own getaddrinfo call.
        sock.error = 23;
        // Used in getsockopt for SOL_SOCKET/SO_ERROR test.
        SOCKFS.emit("error", [ sock.stream.fd, sock.error, "EHOSTUNREACH: Host is unreachable" ]);
      });
    },
    accept(listensock) {
      if (!listensock.server || !listensock.pending.length) {
        throw new FS.ErrnoError(28);
      }
      var newsock = listensock.pending.shift();
      newsock.stream.flags = listensock.stream.flags;
      return newsock;
    },
    getname(sock, peer) {
      var addr, port;
      if (peer) {
        if (sock.daddr === undefined || sock.dport === undefined) {
          throw new FS.ErrnoError(53);
        }
        addr = sock.daddr;
        port = sock.dport;
      } else {
        // TODO saddr and sport will be set for bind()'d UDP sockets, but what
        // should we be returning for TCP sockets that've been connect()'d?
        addr = sock.saddr || 0;
        port = sock.sport || 0;
      }
      return {
        addr,
        port
      };
    },
    sendmsg(sock, buffer, offset, length, addr, port) {
      if (sock.type === 2) {
        // connection-less sockets will honor the message address,
        // and otherwise fall back to the bound destination address
        if (addr === undefined || port === undefined) {
          addr = sock.daddr;
          port = sock.dport;
        }
        // if there was no address to fall back to, error out
        if (addr === undefined || port === undefined) {
          throw new FS.ErrnoError(17);
        }
      } else {
        // connection-based sockets will only use the bound
        addr = sock.daddr;
        port = sock.dport;
      }
      // find the peer for the destination address
      var dest = SOCKFS.websocket_sock_ops.getPeer(sock, addr, port);
      // early out if not connected with a connection-based socket
      if (sock.type === 1) {
        if (!dest || dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
          throw new FS.ErrnoError(53);
        }
      }
      // create a copy of the incoming data to send, as the WebSocket API
      // doesn't work entirely with an ArrayBufferView, it'll just send
      // the entire underlying buffer
      if (ArrayBuffer.isView(buffer)) {
        offset += buffer.byteOffset;
        buffer = buffer.buffer;
      }
      var data = buffer.slice(offset, offset + length);
      // if we don't have a cached connectionless UDP datagram connection, or
      // the TCP socket is still connecting, queue the message to be sent upon
      // connect, and lie, saying the data was sent now.
      if (!dest || dest.socket.readyState !== dest.socket.OPEN) {
        // if we're not connected, open a new connection
        if (sock.type === 2) {
          if (!dest || dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
            dest = SOCKFS.websocket_sock_ops.createPeer(sock, addr, port);
          }
        }
        dest.msg_send_queue.push(data);
        return length;
      }
      try {
        // send the actual data
        dest.socket.send(data);
        return length;
      } catch (e) {
        throw new FS.ErrnoError(28);
      }
    },
    recvmsg(sock, length) {
      // http://pubs.opengroup.org/onlinepubs/7908799/xns/recvmsg.html
      if (sock.type === 1 && sock.server) {
        // tcp servers should not be recv()'ing on the listen socket
        throw new FS.ErrnoError(53);
      }
      var queued = sock.recv_queue.shift();
      if (!queued) {
        if (sock.type === 1) {
          var dest = SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport);
          if (!dest) {
            // if we have a destination address but are not connected, error out
            throw new FS.ErrnoError(53);
          }
          if (dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
            // return null if the socket has closed
            return null;
          }
          // else, our socket is in a valid state but truly has nothing available
          throw new FS.ErrnoError(6);
        }
        throw new FS.ErrnoError(6);
      }
      // queued.data will be an ArrayBuffer if it's unadulterated, but if it's
      // requeued TCP data it'll be an ArrayBufferView
      var queuedLength = queued.data.byteLength || queued.data.length;
      var queuedOffset = queued.data.byteOffset || 0;
      var queuedBuffer = queued.data.buffer || queued.data;
      var bytesRead = Math.min(length, queuedLength);
      var res = {
        buffer: new Uint8Array(queuedBuffer, queuedOffset, bytesRead),
        addr: queued.addr,
        port: queued.port
      };
      // push back any unread data for TCP connections
      if (sock.type === 1 && bytesRead < queuedLength) {
        var bytesRemaining = queuedLength - bytesRead;
        queued.data = new Uint8Array(queuedBuffer, queuedOffset + bytesRead, bytesRemaining);
        sock.recv_queue.unshift(queued);
      }
      return res;
    }
  }
};

var getSocketFromFD = fd => {
  var socket = SOCKFS.getSocket(fd);
  if (!socket) throw new FS.ErrnoError(8);
  return socket;
};

var inetPton4 = str => {
  var b = str.split(".");
  for (var i = 0; i < 4; i++) {
    var tmp = Number(b[i]);
    if (isNaN(tmp)) return null;
    b[i] = tmp;
  }
  return (b[0] | (b[1] << 8) | (b[2] << 16) | (b[3] << 24)) >>> 0;
};

var inetPton6 = str => {
  var words;
  var w, offset, z;
  /* http://home.deds.nl/~aeron/regex/ */ var valid6regx = /^((?=.*::)(?!.*::.+::)(::)?([\dA-F]{1,4}:(:|\b)|){5}|([\dA-F]{1,4}:){6})((([\dA-F]{1,4}((?!\3)::|:\b|$))|(?!\2\3)){2}|(((2[0-4]|1\d|[1-9])?\d|25[0-5])\.?\b){4})$/i;
  var parts = [];
  if (!valid6regx.test(str)) {
    return null;
  }
  if (str === "::") {
    return [ 0, 0, 0, 0, 0, 0, 0, 0 ];
  }
  // Z placeholder to keep track of zeros when splitting the string on ":"
  if (str.startsWith("::")) {
    str = str.replace("::", "Z:");
  } else {
    str = str.replace("::", ":Z:");
  }
  if (str.indexOf(".") > 0) {
    // parse IPv4 embedded stress
    str = str.replace(new RegExp("[.]", "g"), ":");
    words = str.split(":");
    words[words.length - 4] = Number(words[words.length - 4]) + Number(words[words.length - 3]) * 256;
    words[words.length - 3] = Number(words[words.length - 2]) + Number(words[words.length - 1]) * 256;
    words = words.slice(0, words.length - 2);
  } else {
    words = str.split(":");
  }
  offset = 0;
  z = 0;
  for (w = 0; w < words.length; w++) {
    if (typeof words[w] == "string") {
      if (words[w] === "Z") {
        // compressed zeros - write appropriate number of zero words
        for (z = 0; z < (8 - words.length + 1); z++) {
          parts[w + z] = 0;
        }
        offset = z - 1;
      } else {
        // parse hex to field to 16-bit value and write it in network byte-order
        parts[w + offset] = _htons(parseInt(words[w], 16));
      }
    } else {
      // parsed IPv4 words
      parts[w + offset] = words[w];
    }
  }
  return [ (parts[1] << 16) | parts[0], (parts[3] << 16) | parts[2], (parts[5] << 16) | parts[4], (parts[7] << 16) | parts[6] ];
};

/** @param {number=} addrlen */ var writeSockaddr = (sa, family, addr, port, addrlen) => {
  switch (family) {
   case 2:
    addr = inetPton4(addr);
    zeroMemory(sa, 16);
    if (addrlen) {
      HEAP32[((addrlen) >> 2)] = 16;
    }
    HEAP16[((sa) >> 1)] = family;
    HEAP32[(((sa) + (4)) >> 2)] = addr;
    HEAP16[(((sa) + (2)) >> 1)] = _htons(port);
    break;

   case 10:
    addr = inetPton6(addr);
    zeroMemory(sa, 28);
    if (addrlen) {
      HEAP32[((addrlen) >> 2)] = 28;
    }
    HEAP32[((sa) >> 2)] = family;
    HEAP32[(((sa) + (8)) >> 2)] = addr[0];
    HEAP32[(((sa) + (12)) >> 2)] = addr[1];
    HEAP32[(((sa) + (16)) >> 2)] = addr[2];
    HEAP32[(((sa) + (20)) >> 2)] = addr[3];
    HEAP16[(((sa) + (2)) >> 1)] = _htons(port);
    break;

   default:
    return 5;
  }
  return 0;
};

var DNS = {
  address_map: {
    id: 1,
    addrs: {},
    names: {}
  },
  lookup_name(name) {
    // If the name is already a valid ipv4 / ipv6 address, don't generate a fake one.
    var res = inetPton4(name);
    if (res !== null) {
      return name;
    }
    res = inetPton6(name);
    if (res !== null) {
      return name;
    }
    // See if this name is already mapped.
    var addr;
    if (DNS.address_map.addrs[name]) {
      addr = DNS.address_map.addrs[name];
    } else {
      var id = DNS.address_map.id++;
      addr = "172.29." + (id & 255) + "." + (id & 65280);
      DNS.address_map.names[addr] = name;
      DNS.address_map.addrs[name] = addr;
    }
    return addr;
  },
  lookup_addr(addr) {
    if (DNS.address_map.names[addr]) {
      return DNS.address_map.names[addr];
    }
    return null;
  }
};

var allocateUTF8OnStack = (...args) => stringToUTF8OnStack(...args);

var onInits = [];

var addOnInit = cb => onInits.push(cb);

function _js_getpid() {
  return PHPLoader.processId ?? 42;
}

function _js_wasm_trace(format, ...args) {
  if (PHPLoader.trace instanceof Function) {
    PHPLoader.trace(_js_getpid(), format, ...args);
  }
}

var PHPWASM = {
  O_APPEND: 1024,
  O_NONBLOCK: 2048,
  POLLHUP: 16,
  SETFL_MASK: 3072,
  socketTimeouts: new WeakMap,
  getSocketTimeouts: function(fd) {
    const sock = FS.getStream(fd)?.node?.sock;
    return sock ? PHPWASM.socketTimeouts.get(sock) : undefined;
  },
  SOCKOPT: {
    SOL_SOCKET: 1,
    SO_TYPE: 3,
    SO_ERROR: 4,
    SO_KEEPALIVE: 9,
    SO_RCVTIMEO: 66,
    SO_SNDTIMEO: 67,
    IPPROTO_TCP: 6,
    TCP_NODELAY: 1
  },
  proxiedSocketOptions: new WeakMap,
  isProxiedSocketOption: function(sock, level, optionName) {
    const {SOL_SOCKET, SO_KEEPALIVE, IPPROTO_TCP, TCP_NODELAY} = PHPWASM.SOCKOPT;
    return ((level === SOL_SOCKET && optionName === SO_KEEPALIVE) || (level === IPPROTO_TCP && optionName === TCP_NODELAY && sock.type === Number("1")));
  },
  sendSocketOption: function(ws, level, optionName, value) {
    if (typeof ws.setSocketOpt === "function") {
      ws.setSocketOpt(level, optionName, value);
    }
  },
  sendSocketOptionsOnOpen: function(sock) {
    for (const ws of PHPWASM.getAllWebSockets(sock)) {
      const sendAll = () => {
        const options = PHPWASM.proxiedSocketOptions.get(sock);
        for (const [key, value] of options || []) {
          const [level, optionName] = key.split(":").map(Number);
          PHPWASM.sendSocketOption(ws, level, optionName, value);
        }
      };
      if (ws.readyState === ws.OPEN) {
        sendAll();
      } else if (ws.readyState === ws.CONNECTING) {
        ws.once("open", sendAll);
      }
    }
  },
  init: function() {
    addOnInit(PHPWASM.patchDatagramPoll);
    // TODO: Move this to a library function that is made an onInit callback by the `__postset` suffix.
    if (PHPLoader.bindUserSpace) {
      /**
  				 * We need to add an onInit callback to bind the user-space API
  				 * because some dependencies like wasmImports and wasmExports
  				 * are not yet assigned.
  				 */ addOnInit(() => {
        if (typeof PHPLoader.processId !== "number") {
          throw new Error("PHPLoader.processId must be set before init");
        }
        Module["userSpace"] = PHPLoader.bindUserSpace({
          pid: PHPLoader.processId,
          constants: {
            F_GETFL: Number("3"),
            O_ACCMODE: Number("2097155"),
            O_RDONLY: Number("0"),
            O_WRONLY: Number("1"),
            O_APPEND: Number("1024"),
            O_NONBLOCK: Number("2048"),
            F_SETFL: Number("4"),
            F_GETLK: Number("12"),
            F_SETLK: Number("13"),
            F_SETLKW: Number("14"),
            SEEK_SET: Number("0"),
            SEEK_CUR: Number("1"),
            SEEK_END: Number("2"),
            F_GETFL: Number("3"),
            O_ACCMODE: Number("2097155"),
            O_RDONLY: Number("0"),
            O_WRONLY: Number("1"),
            O_APPEND: Number("1024"),
            O_NONBLOCK: Number("2048"),
            F_SETFL: Number("4"),
            F_GETLK: Number("12"),
            F_SETLK: Number("13"),
            F_SETLKW: Number("14"),
            SEEK_SET: Number("0"),
            SEEK_CUR: Number("1"),
            SEEK_END: Number("2"),
            // From:
            // https://github.com/emscripten-core/emscripten/blob/66d2137b0381ac35f7e2346b2d6a90abd0f1211a/system/lib/libc/musl/include/fcntl.h#L58-L60
            F_RDLCK: 0,
            F_WRLCK: 1,
            F_UNLCK: 2,
            // From:
            // https://github.com/emscripten-core/emscripten/blob/81bbaa42a7827d88a71bd89701245052c622428c/system/lib/libc/musl/include/sys/file.h#L7-L10
            LOCK_SH: 1,
            LOCK_EX: 2,
            LOCK_NB: 4,
            // Non-blocking lock
            LOCK_UN: 8
          },
          errnoCodes: ERRNO_CODES,
          // Use get/set closures instead of exposing
          // typed arrays directly. After memory.grow(),
          // Emscripten's updateMemoryViews() reassigns
          // the module-scoped HEAP* variables. Closures
          // always reference the current value, so
          // accesses are never stale. The get/set
          // interface also prevents callers from
          // capturing a typed array reference that
          // could become stale.
          memory: {
            HEAP8: {
              get(offset) {
                return HEAP8[offset];
              },
              set(offset, value) {
                HEAP8[offset] = value;
              }
            },
            HEAPU8: {
              get(offset) {
                return HEAPU8[offset];
              },
              set(offset, value) {
                HEAPU8[offset] = value;
              }
            },
            HEAP16: {
              get(offset) {
                return HEAP16[offset];
              },
              set(offset, value) {
                HEAP16[offset] = value;
              }
            },
            HEAPU16: {
              get(offset) {
                return HEAPU16[offset];
              },
              set(offset, value) {
                HEAPU16[offset] = value;
              }
            },
            HEAP32: {
              get(offset) {
                return HEAP32[offset];
              },
              set(offset, value) {
                HEAP32[offset] = value;
              }
            },
            HEAPU32: {
              get(offset) {
                return HEAPU32[offset];
              },
              set(offset, value) {
                HEAPU32[offset] = value;
              }
            },
            HEAPF32: {
              get(offset) {
                return HEAPF32[offset];
              },
              set(offset, value) {
                HEAPF32[offset] = value;
              }
            },
            HEAP64: {
              get(offset) {
                return HEAP64[offset];
              },
              set(offset, value) {
                HEAP64[offset] = value;
              }
            },
            HEAPU64: {
              get(offset) {
                return HEAPU64[offset];
              },
              set(offset, value) {
                HEAPU64[offset] = value;
              }
            },
            HEAPF64: {
              get(offset) {
                return HEAPF64[offset];
              },
              set(offset, value) {
                HEAPF64[offset] = value;
              }
            }
          },
          wasmImports: Object.assign({}, wasmImports, typeof _builtin_fd_close === "function" ? {
            builtin_fd_close: _builtin_fd_close
          } : {}, typeof _builtin_fcntl64 === "function" ? {
            builtin_fcntl64: _builtin_fcntl64
          } : {}),
          wasmExports,
          syscalls: SYSCALLS,
          FS,
          PROXYFS,
          NODEFS
        });
      });
    }
    Module["ENV"] = Module["ENV"] || {};
    // Ensure a platform-level bin directory for a fallback `php` binary.
    Module["ENV"]["PATH"] = [ Module["ENV"]["PATH"], "/internal/shared/bin" ].filter(Boolean).join(":");
    // The /request directory is required by the C module. It's where the
    // stdout, stderr, and headers information are written for the JavaScript
    // code to read later on. This is per-request state that is isolated to a
    // single PHP process.
    FS.mkdir("/request");
    // The /internal directory is shared amongst all PHP processes
    // and contains the php.ini, constants definitions, etc.
    FS.mkdir("/internal");
    if (PHPLoader.nativeInternalDirPath) {
      FS.mount(FS.filesystems.NODEFS, {
        root: PHPLoader.nativeInternalDirPath
      }, "/internal");
    }
    // The files from the shared directory are shared between all the
    // PHP processes managed by PHPProcessManager.
    FS.mkdirTree("/internal/shared");
    // The files from the preload directory are preloaded using the
    // auto_prepend_file php.ini directive.
    FS.mkdirTree("/internal/shared/preload");
    // Platform-level bin directory for a fallback `php` binary. Without it,
    // PHP may not populate the PHP_BINARY constant.
    FS.mkdirTree("/internal/shared/bin");
    const originalOnRuntimeInitialized = Module["onRuntimeInitialized"];
    Module["onRuntimeInitialized"] = () => {
      const {node: phpBinaryNode} = FS.lookupPath("/internal/shared/bin/php", {
        noent_okay: true
      });
      if (!phpBinaryNode) {
        // Dummy PHP binary for PHP to populate the PHP_BINARY constant.
        FS.writeFile("/internal/shared/bin/php", (new TextEncoder).encode('#!/bin/sh\nphp "$@"'));
        // It must be executable to be used by PHP.
        FS.chmod("/internal/shared/bin/php", 493);
      }
      originalOnRuntimeInitialized();
    };
    // Create stdout and stderr devices. We can't just use Emscripten's
    // default stdout and stderr devices because they stop processing data
    // on the first null byte. However, when dealing with binary data,
    // null bytes are valid and common.
    FS.registerDevice(FS.makedev(64, 0), {
      open: () => {},
      close: () => {},
      read: () => 0,
      write: (stream, buffer, offset, length, pos) => {
        const chunk = buffer.subarray(offset, offset + length);
        PHPWASM.onStdout(chunk);
        return length;
      }
    });
    FS.mkdev("/request/stdout", FS.makedev(64, 0));
    FS.registerDevice(FS.makedev(63, 0), {
      open: () => {},
      close: () => {},
      read: () => 0,
      write: (stream, buffer, offset, length, pos) => {
        const chunk = buffer.subarray(offset, offset + length);
        PHPWASM.onStderr(chunk);
        return length;
      }
    });
    FS.mkdev("/request/stderr", FS.makedev(63, 0));
    FS.registerDevice(FS.makedev(62, 0), {
      open: () => {},
      close: () => {},
      read: () => 0,
      write: (stream, buffer, offset, length, pos) => {
        const chunk = buffer.subarray(offset, offset + length);
        PHPWASM.onHeaders(chunk);
        return length;
      }
    });
    FS.mkdev("/request/headers", FS.makedev(62, 0));
    // Handle events.
    PHPWASM.EventEmitter = ENVIRONMENT_IS_NODE ? require("events").EventEmitter : class EventEmitter {
      constructor() {
        this.listeners = {};
      }
      emit(eventName, data) {
        if (this.listeners[eventName]) {
          this.listeners[eventName].forEach(callback => {
            callback(data);
          });
        }
      }
      once(eventName, callback) {
        const self = this;
        function removedCallback() {
          callback(...arguments);
          self.removeListener(eventName, removedCallback);
        }
        this.on(eventName, removedCallback);
      }
      removeAllListeners(eventName) {
        if (eventName) {
          delete this.listeners[eventName];
        } else {
          this.listeners = {};
        }
      }
      removeListener(eventName, callback) {
        if (this.listeners[eventName]) {
          const idx = this.listeners[eventName].indexOf(callback);
          if (idx !== -1) {
            this.listeners[eventName].splice(idx, 1);
          }
        }
      }
    };
    PHPWASM.processTable = {};
    PHPWASM.input_devices = {};
    const originalWrite = TTY.stream_ops.write;
    TTY.stream_ops.write = function(stream, ...rest) {
      const retval = originalWrite(stream, ...rest);
      // Implicit flush since PHP's fflush() doesn't seem to trigger the fsync event
      // @TODO: Fix this at the wasm level
      stream.tty.ops.fsync(stream.tty);
      return retval;
    };
    const originalPutChar = TTY.stream_ops.put_char;
    TTY.stream_ops.put_char = function(tty, val) {
      /**
  				 * Buffer newlines that Emscripten normally ignores.
  				 *
  				 * Emscripten doesn't do it by default because its default
  				 * print function is console.log that implicitly adds a newline. We are overwriting
  				 * it with an environment-specific function that outputs exaclty what it was given,
  				 * e.g. in Node.js it's process.stdout.write(). Therefore, we need to mak sure
  				 * all the newlines make it to the output buffer.
  				 */ if (val === 10) tty.output.push(val);
      return originalPutChar(tty, val);
    };
  },
  onHeaders: function(chunk) {
    if (Module["onHeaders"]) {
      Module["onHeaders"](chunk);
      return;
    }
    console.log("headers", {
      chunk
    });
  },
  onStdout: function(chunk) {
    if (Module["onStdout"]) {
      Module["onStdout"](chunk);
      return;
    }
    if (ENVIRONMENT_IS_NODE) {
      process.stdout.write(chunk);
    } else {
      console.log("stdout", {
        chunk
      });
    }
  },
  onStderr: function(chunk) {
    if (Module["onStderr"]) {
      Module["onStderr"](chunk);
      return;
    }
    if (ENVIRONMENT_IS_NODE) {
      process.stderr.write(chunk);
    } else {
      console.warn("stderr", {
        chunk
      });
    }
  },
  patchDatagramPoll: function() {
    const sockOps = SOCKFS.websocket_sock_ops;
    const originalPoll = sockOps.poll;
    sockOps.poll = function(sock) {
      if (sock.type === Number("2")) {
        let mask = Number("4");
        if (sock.recv_queue.length) {
          mask |= Number("64") | Number("1");
        }
        return mask;
      }
      return originalPoll.call(this, sock);
    };
    // A datagram socket whose peer WebSocket failed (the proxy
    // refused it: SOCKFS then sets sock.error) would otherwise keep
    // answering EAGAIN, so a reader waiting for a reply loops or
    // hangs (net-snmp spun on recvmsg()). Like Linux after an ICMP
    // port unreachable, report the pending error once to the next
    // read (recv/recvfrom/recvmsg/read all go through recvmsg), then
    // clear it, as reading SO_ERROR does.
    const originalRecvmsg = sockOps.recvmsg;
    sockOps.recvmsg = function(sock, length, ...rest) {
      if (sock.type === Number("2") && !sock.recv_queue.length && sock.error) {
        const errno = sock.error;
        sock.error = null;
        throw new FS.ErrnoError(errno);
      }
      return originalRecvmsg.call(this, sock, length, ...rest);
    };
    // Send the SO_KEEPALIVE/TCP_NODELAY values set so far (possibly
    // before connect()) once the new connection opens.
    const originalConnect = sockOps.connect;
    sockOps.connect = function(sock, ...rest) {
      const result = originalConnect.call(this, sock, ...rest);
      PHPWASM.sendSocketOptionsOnOpen(sock);
      return result;
    };
  },
  recvfromNow: function(fd, buf, len, flags, addr, addrlen) {
    try {
      const sock = getSocketFromFD(fd);
      const msg = sock.sock_ops.recvmsg(sock, len);
      if (!msg) {
        return 0;
      }
      if (addr) {
        writeSockaddr(addr, sock.family, DNS.lookup_name(msg.addr), msg.port, addrlen);
      }
      HEAPU8.set(msg.buffer, buf);
      return msg.buffer.byteLength;
    } catch (e) {
      if (typeof FS == "undefined" || e.name !== "ErrnoError") {
        throw e;
      }
      return -e.errno;
    }
  },
  getAllWebSockets: function(sock) {
    const webSockets = new Set;
    if (sock.server) {
      sock.server.clients.forEach(ws => {
        webSockets.add(ws);
      });
    }
    for (const peer of PHPWASM.getAllPeers(sock)) {
      webSockets.add(peer.socket);
    }
    return Array.from(webSockets);
  },
  getAllPeers: function(sock) {
    const peers = new Set;
    if (sock.server) {
      sock.pending.filter(pending => pending.peers).forEach(pending => {
        for (const peer of Object.values(pending.peers)) {
          peers.add(peer);
        }
      });
    }
    if (sock.peers) {
      for (const peer of Object.values(sock.peers)) {
        peers.add(peer);
      }
    }
    return Array.from(peers);
  },
  awaitData: function(ws) {
    return PHPWASM.awaitEvent(ws, "message");
  },
  awaitConnection: function(ws) {
    if (ws.OPEN === ws.readyState) {
      return [ Promise.resolve(), PHPWASM.noop ];
    }
    return PHPWASM.awaitEvent(ws, "open");
  },
  awaitClose: function(ws) {
    if ([ ws.CLOSING, ws.CLOSED ].includes(ws.readyState)) {
      return [ Promise.resolve(), PHPWASM.noop ];
    }
    return PHPWASM.awaitEvent(ws, "close");
  },
  awaitError: function(ws) {
    if ([ ws.CLOSING, ws.CLOSED ].includes(ws.readyState)) {
      return [ Promise.resolve(), PHPWASM.noop ];
    }
    return PHPWASM.awaitEvent(ws, "error");
  },
  awaitEvent: function(ws, event) {
    let resolve;
    const listener = () => {
      resolve();
    };
    const promise = new Promise(function(_resolve) {
      resolve = _resolve;
      ws.once(event, listener);
    });
    const cancel = () => {
      ws.removeListener(event, listener);
      // Rejecting the promises bubbles up and kills the entire
      // node process. Let's resolve them on the next tick instead
      // to give the caller some space to unbind any handlers.
      setTimeout(resolve);
    };
    return [ promise, cancel ];
  },
  noop: function() {},
  parseSocketTimeout: function(optionValuePtr, optionLen) {
    if (!optionValuePtr || optionLen < 8) {
      return null;
    }
    let seconds;
    let microseconds;
    if (optionLen >= 16) {
      seconds = Number(HEAP64[optionValuePtr >> 3]);
      microseconds = Number(HEAP64[(optionValuePtr + 8) >> 3]);
    } else {
      seconds = HEAP32[optionValuePtr >> 2];
      microseconds = HEAP32[(optionValuePtr + 4) >> 2];
    }
    if (!Number.isFinite(seconds) || !Number.isFinite(microseconds) || seconds < 0 || microseconds < 0) {
      return null;
    }
    return seconds * 1e3 + Math.ceil(microseconds / 1e3);
  },
  spawnProcess: function(command, args, options) {
    if (Module["spawnProcess"]) {
      const spawned = Module["spawnProcess"](command, args, /**
  					 * We're providing the same extra options we would pass to child_process.spawn().
  					 *
  					 * Why?
  					 *
  					 * spawnProcess() follows the same interface as child_process.spawn()
  					 * and some consumers pass `child_process.spawn` directly to php.setSpawnHandler()
  					 */ {
        ...options,
        shell: true,
        stdio: [ "pipe", "pipe", "pipe" ]
      });
      if (spawned && !("then" in spawned) && "on" in spawned) {
        /**
  					 * If we get the child process directly, return it immediately.
  					 * Delaying it to the next tick via Promise.resolve() would create
  					 * a race condition where it might emit some events before the
  					 * caller has a chance to bind event listeners to them.
  					 *
  					 * Without this condition, this callback would be at least flaky:
  					 *
  					 *    php.setSpawnHandler(require('child_process').spawn);
  					 */ return spawned;
      }
      return Promise.resolve(spawned).then(function(spawned) {
        if (!spawned || !spawned.on) {
          throw new Error("spawnProcess() must return an EventEmitter but returned a different type.");
        }
        return spawned;
      });
    }
    const e = new Error("popen(), proc_open() etc. are unsupported on this PHP instance. Call php.setSpawnHandler() " + "and provide a callback to handle spawning processes, or disable a popen(), proc_open() " + "and similar functions via php.ini.");
    e.code = "SPAWN_UNSUPPORTED";
    throw e;
  },
  shutdownSocket: function(socketd, how) {
    // This implementation only supports websockets at the moment
    const sock = getSocketFromFD(socketd);
    const peer = Object.values(sock.peers)[0];
    if (!peer) {
      return -1;
    }
    try {
      peer.socket.close();
      SOCKFS.websocket_sock_ops.removePeer(sock, peer);
      return 0;
    } catch (e) {
      console.log("Socket shutdown error", e);
      return -1;
    }
  }
};

function ___syscall_accept4(fd, addr, addrlen, flags, d1, d2) {
  try {
    const sock = getSocketFromFD(fd);
    const newsock = sock.sock_ops.accept(sock);
    if (addr) {
      writeSockaddr(addr, newsock.family, DNS.lookup_name(newsock.daddr), newsock.dport, addrlen);
    }
    if (flags & Number("2048")) {
      newsock.stream.flags |= PHPWASM.O_NONBLOCK;
    }
    return newsock.stream.fd;
  } catch (e) {
    if (typeof FS == "undefined" || e.name !== "ErrnoError") {
      throw e;
    }
    return -e.errno;
  }
}

___syscall_accept4.sig = "iippiii";

var inetNtop4 = addr => (addr & 255) + "." + ((addr >> 8) & 255) + "." + ((addr >> 16) & 255) + "." + ((addr >> 24) & 255);

var inetNtop6 = ints => {
  //  ref:  http://www.ietf.org/rfc/rfc2373.txt - section 2.5.4
  //  Format for IPv4 compatible and mapped  128-bit IPv6 Addresses
  //  128-bits are split into eight 16-bit words
  //  stored in network byte order (big-endian)
  //  |                80 bits               | 16 |      32 bits        |
  //  +-----------------------------------------------------------------+
  //  |               10 bytes               |  2 |      4 bytes        |
  //  +--------------------------------------+--------------------------+
  //  +               5 words                |  1 |      2 words        |
  //  +--------------------------------------+--------------------------+
  //  |0000..............................0000|0000|    IPv4 ADDRESS     | (compatible)
  //  +--------------------------------------+----+---------------------+
  //  |0000..............................0000|FFFF|    IPv4 ADDRESS     | (mapped)
  //  +--------------------------------------+----+---------------------+
  var str = "";
  var word = 0;
  var longest = 0;
  var lastzero = 0;
  var zstart = 0;
  var len = 0;
  var i = 0;
  var parts = [ ints[0] & 65535, (ints[0] >> 16), ints[1] & 65535, (ints[1] >> 16), ints[2] & 65535, (ints[2] >> 16), ints[3] & 65535, (ints[3] >> 16) ];
  // Handle IPv4-compatible, IPv4-mapped, loopback and any/unspecified addresses
  var hasipv4 = true;
  var v4part = "";
  // check if the 10 high-order bytes are all zeros (first 5 words)
  for (i = 0; i < 5; i++) {
    if (parts[i] !== 0) {
      hasipv4 = false;
      break;
    }
  }
  if (hasipv4) {
    // low-order 32-bits store an IPv4 address (bytes 13 to 16) (last 2 words)
    v4part = inetNtop4(parts[6] | (parts[7] << 16));
    // IPv4-mapped IPv6 address if 16-bit value (bytes 11 and 12) == 0xFFFF (6th word)
    if (parts[5] === -1) {
      str = "::ffff:";
      str += v4part;
      return str;
    }
    // IPv4-compatible IPv6 address if 16-bit value (bytes 11 and 12) == 0x0000 (6th word)
    if (parts[5] === 0) {
      str = "::";
      //special case IPv6 addresses
      if (v4part === "0.0.0.0") v4part = "";
      // any/unspecified address
      if (v4part === "0.0.0.1") v4part = "1";
      // loopback address
      str += v4part;
      return str;
    }
  }
  // Handle all other IPv6 addresses
  // first run to find the longest contiguous zero words
  for (word = 0; word < 8; word++) {
    if (parts[word] === 0) {
      if (word - lastzero > 1) {
        len = 0;
      }
      lastzero = word;
      len++;
    }
    if (len > longest) {
      longest = len;
      zstart = word - longest + 1;
    }
  }
  for (word = 0; word < 8; word++) {
    if (longest > 1) {
      // compress contiguous zeros - to produce "::"
      if (parts[word] === 0 && word >= zstart && word < (zstart + longest)) {
        if (word === zstart) {
          str += ":";
          if (zstart === 0) str += ":";
        }
        continue;
      }
    }
    // converts 16-bit words from big-endian to little-endian before converting to hex string
    str += Number(_ntohs(parts[word] & 65535)).toString(16);
    str += word < 7 ? ":" : "";
  }
  return str;
};

var readSockaddr = (sa, salen) => {
  // family / port offsets are common to both sockaddr_in and sockaddr_in6
  var family = HEAP16[((sa) >> 1)];
  var port = _ntohs(HEAPU16[(((sa) + (2)) >> 1)]);
  var addr;
  switch (family) {
   case 2:
    if (salen !== 16) {
      return {
        errno: 28
      };
    }
    addr = HEAP32[(((sa) + (4)) >> 2)];
    addr = inetNtop4(addr);
    break;

   case 10:
    if (salen !== 28) {
      return {
        errno: 28
      };
    }
    addr = [ HEAP32[(((sa) + (8)) >> 2)], HEAP32[(((sa) + (12)) >> 2)], HEAP32[(((sa) + (16)) >> 2)], HEAP32[(((sa) + (20)) >> 2)] ];
    addr = inetNtop6(addr);
    break;

   default:
    return {
      errno: 5
    };
  }
  return {
    family,
    addr,
    port
  };
};

var getSocketAddress = (addrp, addrlen) => {
  var info = readSockaddr(addrp, addrlen);
  if (info.errno) throw new FS.ErrnoError(info.errno);
  info.addr = DNS.lookup_addr(info.addr) || info.addr;
  return info;
};

function ___syscall_bind(fd, addr, addrlen, d1, d2, d3) {
  try {
    var sock = getSocketFromFD(fd);
    var info = getSocketAddress(addr, addrlen);
    sock.sock_ops.bind(sock, info.addr, info.port);
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_bind.sig = "iippiii";

var SYSCALLS = {
  DEFAULT_POLLMASK: 5,
  calculateAt(dirfd, path, allowEmpty) {
    if (PATH.isAbs(path)) {
      return path;
    }
    // relative path
    var dir;
    if (dirfd === -100) {
      dir = FS.cwd();
    } else {
      var dirstream = SYSCALLS.getStreamFromFD(dirfd);
      dir = dirstream.path;
    }
    if (path.length == 0) {
      if (!allowEmpty) {
        throw new FS.ErrnoError(44);
      }
      return dir;
    }
    return dir + "/" + path;
  },
  writeStat(buf, stat) {
    HEAPU32[((buf) >> 2)] = stat.dev;
    HEAPU32[(((buf) + (4)) >> 2)] = stat.mode;
    HEAPU32[(((buf) + (8)) >> 2)] = stat.nlink;
    HEAPU32[(((buf) + (12)) >> 2)] = stat.uid;
    HEAPU32[(((buf) + (16)) >> 2)] = stat.gid;
    HEAPU32[(((buf) + (20)) >> 2)] = stat.rdev;
    HEAP64[(((buf) + (24)) >> 3)] = BigInt(stat.size);
    HEAP32[(((buf) + (32)) >> 2)] = 4096;
    HEAP32[(((buf) + (36)) >> 2)] = stat.blocks;
    var atime = stat.atime.getTime();
    var mtime = stat.mtime.getTime();
    var ctime = stat.ctime.getTime();
    HEAP64[(((buf) + (40)) >> 3)] = BigInt(Math.floor(atime / 1e3));
    HEAPU32[(((buf) + (48)) >> 2)] = (atime % 1e3) * 1e3 * 1e3;
    HEAP64[(((buf) + (56)) >> 3)] = BigInt(Math.floor(mtime / 1e3));
    HEAPU32[(((buf) + (64)) >> 2)] = (mtime % 1e3) * 1e3 * 1e3;
    HEAP64[(((buf) + (72)) >> 3)] = BigInt(Math.floor(ctime / 1e3));
    HEAPU32[(((buf) + (80)) >> 2)] = (ctime % 1e3) * 1e3 * 1e3;
    HEAP64[(((buf) + (88)) >> 3)] = BigInt(stat.ino);
    return 0;
  },
  writeStatFs(buf, stats) {
    HEAPU32[(((buf) + (4)) >> 2)] = stats.bsize;
    HEAPU32[(((buf) + (60)) >> 2)] = stats.bsize;
    HEAP64[(((buf) + (8)) >> 3)] = BigInt(stats.blocks);
    HEAP64[(((buf) + (16)) >> 3)] = BigInt(stats.bfree);
    HEAP64[(((buf) + (24)) >> 3)] = BigInt(stats.bavail);
    HEAP64[(((buf) + (32)) >> 3)] = BigInt(stats.files);
    HEAP64[(((buf) + (40)) >> 3)] = BigInt(stats.ffree);
    HEAPU32[(((buf) + (48)) >> 2)] = stats.fsid;
    HEAPU32[(((buf) + (64)) >> 2)] = stats.flags;
    // ST_NOSUID
    HEAPU32[(((buf) + (56)) >> 2)] = stats.namelen;
  },
  doMsync(addr, stream, len, flags, offset) {
    if (!FS.isFile(stream.node.mode)) {
      throw new FS.ErrnoError(43);
    }
    if (flags & 2) {
      // MAP_PRIVATE calls need not to be synced back to underlying fs
      return 0;
    }
    var buffer = HEAPU8.slice(addr, addr + len);
    FS.msync(stream, buffer, offset, len, flags);
  },
  getStreamFromFD(fd) {
    var stream = FS.getStreamChecked(fd);
    return stream;
  },
  varargs: undefined,
  getStr(ptr) {
    var ret = UTF8ToString(ptr);
    return ret;
  }
};

function ___syscall_chdir(path) {
  try {
    path = SYSCALLS.getStr(path);
    FS.chdir(path);
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_chdir.sig = "ip";

function ___syscall_chmod(path, mode) {
  try {
    path = SYSCALLS.getStr(path);
    FS.chmod(path, mode);
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_chmod.sig = "ipi";

function _wasm_connect(sockfd, addr, addrlen) {
  /**
  		 * Use a synchronous connect() call when Asyncify is used.
  		 *
  		 * The async version was originally introduced to support the Memcached and Redis extensions,
  		 * and both are only available with JSPI. Asyncify is too difficult to maintain and
  		 * it's not getting that upgrade.
  		 */ if (!("Suspending" in WebAssembly)) {
    var sock = getSocketFromFD(sockfd);
    var info = getSocketAddress(addr, addrlen);
    sock.sock_ops.connect(sock, info.addr, info.port);
    return 0;
  }
  /**
  		 * No waiting for a non-blocking socket (libcurl,
  		 * STREAM_CLIENT_ASYNC_CONNECT, ...) or a datagram one: start the
  		 * connection and answer right away. A non-blocking stream socket
  		 * gets EINPROGRESS, as connect(2) specifies; the caller then waits
  		 * with poll(POLLOUT) and reads the outcome with
  		 * getsockopt(SO_ERROR), both of which SOCKFS already handles
  		 * (sock.connecting, sock.error). A datagram socket has no
  		 * connection to wait for: connect() only sets its default peer.
  		 */ const connectingStream = FS.getStream(sockfd);
  const connectingSock = connectingStream?.node?.sock;
  const isDatagram = connectingSock?.type === Number("2");
  const isNonBlocking = Boolean(connectingStream && connectingStream.flags & PHPWASM.O_NONBLOCK);
  if (connectingSock && (isDatagram || isNonBlocking)) {
    try {
      const info = getSocketAddress(addr, addrlen);
      connectingSock.sock_ops.connect(connectingSock, info.addr, info.port);
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) {
        return -ERRNO_CODES.ECONNREFUSED;
      }
      return -e.errno;
    }
    return isDatagram ? 0 : -ERRNO_CODES.EINPROGRESS;
  }
  return Asyncify.handleSleep(wakeUp => {
    // Get the socket
    let sock;
    try {
      sock = getSocketFromFD(sockfd);
    } catch (e) {
      wakeUp(-ERRNO_CODES.EBADF);
      return;
    }
    if (!sock) {
      wakeUp(-ERRNO_CODES.EBADF);
      return;
    }
    // Parse the address
    let info;
    try {
      info = getSocketAddress(addr, addrlen);
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) {
        wakeUp(-ERRNO_CODES.EFAULT);
        return;
      }
      wakeUp(-e.errno);
      return;
    }
    // Perform the connect (this creates the WebSocket but doesn't wait)
    try {
      sock.sock_ops.connect(sock, info.addr, info.port);
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) {
        wakeUp(-ERRNO_CODES.ECONNREFUSED);
        return;
      }
      wakeUp(-e.errno);
      return;
    }
    // Get all websockets for this socket
    const webSockets = PHPWASM.getAllWebSockets(sock);
    if (!webSockets.length) {
      // No WebSocket yet, this shouldn't happen after connect
      wakeUp(-ERRNO_CODES.ECONNREFUSED);
      return;
    }
    const ws = webSockets[0];
    // If already connected, return success
    if (ws.readyState === ws.OPEN) {
      wakeUp(0);
      return;
    }
    // If already closed or closing, return error
    if (ws.readyState === ws.CLOSING || ws.readyState === ws.CLOSED) {
      wakeUp(-ERRNO_CODES.ECONNREFUSED);
      return;
    }
    // Wait for the connection to be established. A zero timeval
    // disables the timeout, matching SO_SNDTIMEO semantics.
    const sendTimeout = PHPWASM.getSocketTimeouts(sockfd)?.send;
    const timeout = sendTimeout ?? 3e4;
    let resolved = false;
    let timeoutId;
    let handleOpen;
    let handleError;
    let handleClose;
    const peer = PHPWASM.getAllPeers(sock).find(candidate => candidate.socket === ws);
    const cleanupConnectListeners = () => {
      if (typeof timeoutId !== "undefined") {
        clearTimeout(timeoutId);
      }
      ws.removeEventListener("open", handleOpen);
      ws.removeEventListener("error", handleError);
      ws.removeEventListener("close", handleClose);
    };
    const cleanupFailedConnect = errno => {
      try {
        if (ws.readyState !== ws.CLOSING && ws.readyState !== ws.CLOSED) {
          ws.close();
        }
      } catch (e) {}
      if (peer) {
        SOCKFS.websocket_sock_ops.removePeer(sock, peer);
      }
      sock.connecting = false;
      sock.error = errno;
    };
    const finishConnect = result => {
      if (!resolved) {
        resolved = true;
        cleanupConnectListeners();
        if (result < 0) {
          cleanupFailedConnect(-result);
        }
        wakeUp(result);
      }
    };
    if (timeout > 0) {
      timeoutId = setTimeout(() => {
        finishConnect(-ERRNO_CODES.ETIMEDOUT);
      }, timeout);
    }
    handleOpen = () => {
      finishConnect(0);
    };
    handleError = () => {
      finishConnect(-ERRNO_CODES.ECONNREFUSED);
    };
    handleClose = () => {
      finishConnect(-ERRNO_CODES.ECONNREFUSED);
    };
    ws.addEventListener("open", handleOpen);
    ws.addEventListener("error", handleError);
    ws.addEventListener("close", handleClose);
  });
}

function ___syscall_connect(sockfd, addr, addrlen, d1, d2, d3) {
  return _wasm_connect(sockfd, addr, addrlen);
}

___syscall_connect.sig = "iippiii";

function ___syscall_dup(fd) {
  try {
    var old = SYSCALLS.getStreamFromFD(fd);
    return FS.dupStream(old).fd;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_dup.sig = "ii";

function ___syscall_dup3(fd, newfd, flags) {
  try {
    var old = SYSCALLS.getStreamFromFD(fd);
    if (old.fd === newfd) return -28;
    // Check newfd is within range of valid open file descriptors.
    if (newfd < 0 || newfd >= FS.MAX_OPEN_FDS) return -8;
    var existing = FS.getStream(newfd);
    if (existing) FS.close(existing);
    return FS.dupStream(old, newfd).fd;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_dup3.sig = "iiii";

function ___syscall_faccessat(dirfd, path, amode, flags) {
  try {
    path = SYSCALLS.getStr(path);
    path = SYSCALLS.calculateAt(dirfd, path);
    if (amode & ~7) {
      // need a valid mode
      return -28;
    }
    var lookup = FS.lookupPath(path, {
      follow: true
    });
    var node = lookup.node;
    if (!node) {
      return -44;
    }
    var perms = "";
    if (amode & 4) perms += "r";
    if (amode & 2) perms += "w";
    if (amode & 1) perms += "x";
    if (perms && FS.nodePermissions(node, perms)) {
      return -2;
    }
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_faccessat.sig = "iipii";

var ___syscall_fadvise64 = (fd, offset, len, advice) => 0;

___syscall_fadvise64.sig = "iijji";

var INT53_MAX = 9007199254740992;

var INT53_MIN = -9007199254740992;

var bigintToI53Checked = num => (num < INT53_MIN || num > INT53_MAX) ? NaN : Number(num);

function ___syscall_fallocate(fd, mode, offset, len) {
  offset = bigintToI53Checked(offset);
  len = bigintToI53Checked(len);
  try {
    if (isNaN(offset) || isNaN(len)) return -61;
    if (mode != 0) {
      return -138;
    }
    if (offset < 0 || len < 0) {
      return -28;
    }
    // We only support mode == 0, which means we can implement fallocate
    // in terms of ftruncate.
    var oldSize = FS.fstat(fd).size;
    var newSize = offset + len;
    if (newSize > oldSize) {
      FS.ftruncate(fd, newSize);
    }
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_fallocate.sig = "iiijj";

function ___syscall_fchmod(fd, mode) {
  try {
    FS.fchmod(fd, mode);
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_fchmod.sig = "iii";

function ___syscall_fchmodat2(dirfd, path, mode, flags) {
  try {
    var nofollow = flags & 256;
    path = SYSCALLS.getStr(path);
    path = SYSCALLS.calculateAt(dirfd, path);
    FS.chmod(path, mode, nofollow);
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_fchmodat2.sig = "iipii";

function ___syscall_fchown32(fd, owner, group) {
  try {
    FS.fchown(fd, owner, group);
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_fchown32.sig = "iiii";

function ___syscall_fchownat(dirfd, path, owner, group, flags) {
  try {
    path = SYSCALLS.getStr(path);
    var nofollow = flags & 256;
    flags = flags & (~256);
    path = SYSCALLS.calculateAt(dirfd, path);
    (nofollow ? FS.lchown : FS.chown)(path, owner, group);
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_fchownat.sig = "iipiii";

var syscallGetVarargI = () => {
  // the `+` prepended here is necessary to convince the JSCompiler that varargs is indeed a number.
  var ret = HEAP32[((+SYSCALLS.varargs) >> 2)];
  SYSCALLS.varargs += 4;
  return ret;
};

var syscallGetVarargP = syscallGetVarargI;

function _fd_close(fd) {
  if (typeof Module["userSpace"] === "undefined") {
    return _builtin_fd_close(fd);
  }
  return Module["userSpace"].fd_close(fd);
}

_fd_close.sig = "ii";

function _builtin_fd_close(fd) {
  try {
    var stream = SYSCALLS.getStreamFromFD(fd);
    FS.close(stream);
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return e.errno;
  }
}

function _builtin_fcntl64(fd, cmd, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var stream = SYSCALLS.getStreamFromFD(fd);
    switch (cmd) {
     case 0:
      {
        var arg = syscallGetVarargI();
        if (arg < 0) {
          return -28;
        }
        while (FS.streams[arg]) {
          arg++;
        }
        var newStream;
        newStream = FS.dupStream(stream, arg);
        return newStream.fd;
      }

     case 1:
     case 2:
      return 0;

     // FD_CLOEXEC makes no sense for a single process.
      case 3:
      return stream.flags;

     case 4:
      {
        var arg = syscallGetVarargI();
        stream.flags |= arg;
        return 0;
      }

     case 12:
      {
        var arg = syscallGetVarargP();
        var offset = 0;
        // We're always unlocked.
        HEAP16[(((arg) + (offset)) >> 1)] = 2;
        return 0;
      }

     case 13:
     case 14:
      // Pretend that the locking is successful. These are process-level locks,
      // and Emscripten programs are a single process. If we supported linking a
      // filesystem between programs, we'd need to do more here.
      // See https://github.com/emscripten-core/emscripten/issues/23697
      return 0;
    }
    return -28;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

function ___syscall_fcntl64(fd, cmd, varargs) {
  // Emscripten's F_SETFL ORs the new flags into the old ones
  // (`stream.flags |= arg`), so O_NONBLOCK could never be cleared:
  // socket_set_block() after socket_set_nonblock() left the socket
  // non-blocking. Like Linux, F_SETFL replaces the settable flags
  // (O_APPEND, O_NONBLOCK) and leaves the others alone.
  if (cmd === Number("4")) {
    const stream = FS.getStream(fd);
    if (!stream) {
      return -ERRNO_CODES.EBADF;
    }
    const arg = HEAP32[varargs >> 2];
    stream.flags = (stream.flags & ~PHPWASM.SETFL_MASK) | (arg & PHPWASM.SETFL_MASK);
    return 0;
  }
  if (typeof Module["userSpace"] === "undefined") {
    return _builtin_fcntl64(fd, cmd, varargs);
  }
  return Module["userSpace"].fcntl64(fd, cmd, varargs);
}

___syscall_fcntl64.sig = "iiip";

function ___syscall_fdatasync(fd) {
  try {
    var stream = SYSCALLS.getStreamFromFD(fd);
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_fdatasync.sig = "ii";

function ___syscall_fstat64(fd, buf) {
  try {
    return SYSCALLS.writeStat(buf, FS.fstat(fd));
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_fstat64.sig = "iip";

function ___syscall_ftruncate64(fd, length) {
  length = bigintToI53Checked(length);
  try {
    if (isNaN(length)) return -61;
    FS.ftruncate(fd, length);
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_ftruncate64.sig = "iij";

function ___syscall_getcwd(buf, size) {
  try {
    if (size === 0) return -28;
    var cwd = FS.cwd();
    var cwdLengthInBytes = lengthBytesUTF8(cwd) + 1;
    if (size < cwdLengthInBytes) return -68;
    stringToUTF8(cwd, buf, size);
    return cwdLengthInBytes;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_getcwd.sig = "ipp";

function ___syscall_getdents64(fd, dirp, count) {
  try {
    var stream = SYSCALLS.getStreamFromFD(fd);
    stream.getdents ||= FS.readdir(stream.path);
    var struct_size = 280;
    var pos = 0;
    var off = FS.llseek(stream, 0, 1);
    var startIdx = Math.floor(off / struct_size);
    var endIdx = Math.min(stream.getdents.length, startIdx + Math.floor(count / struct_size));
    for (var idx = startIdx; idx < endIdx; idx++) {
      var id;
      var type;
      var name = stream.getdents[idx];
      if (name === ".") {
        id = stream.node.id;
        type = 4;
      } else if (name === "..") {
        var lookup = FS.lookupPath(stream.path, {
          parent: true
        });
        id = lookup.node.id;
        type = 4;
      } else {
        var child;
        try {
          child = FS.lookupNode(stream.node, name);
        } catch (e) {
          // If the entry is not a directory, file, or symlink, nodefs
          // lookupNode will raise EINVAL. Skip these and continue.
          if (e?.errno === 28) {
            continue;
          }
          throw e;
        }
        id = child.id;
        type = FS.isChrdev(child.mode) ? 2 : // DT_CHR, character device.
        FS.isDir(child.mode) ? 4 : // DT_DIR, directory.
        FS.isLink(child.mode) ? 10 : // DT_LNK, symbolic link.
        8;
      }
      HEAP64[((dirp + pos) >> 3)] = BigInt(id);
      HEAP64[(((dirp + pos) + (8)) >> 3)] = BigInt((idx + 1) * struct_size);
      HEAP16[(((dirp + pos) + (16)) >> 1)] = 280;
      HEAP8[(dirp + pos) + (18)] = type;
      stringToUTF8(name, dirp + pos + 19, 256);
      pos += struct_size;
    }
    FS.llseek(stream, idx * struct_size, 0);
    return pos;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_getdents64.sig = "iipp";

function ___syscall_getpeername(fd, addr, addrlen, d1, d2, d3) {
  try {
    var sock = getSocketFromFD(fd);
    if (!sock.daddr) {
      return -53;
    }
    var errno = writeSockaddr(addr, sock.family, DNS.lookup_name(sock.daddr), sock.dport, addrlen);
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_getpeername.sig = "iippiii";

function ___syscall_getsockname(fd, addr, addrlen, d1, d2, d3) {
  try {
    var sock = getSocketFromFD(fd);
    // TODO: sock.saddr should never be undefined, see TODO in websocket_sock_ops.getname
    var errno = writeSockaddr(addr, sock.family, DNS.lookup_name(sock.saddr || "0.0.0.0"), sock.sport, addrlen);
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_getsockname.sig = "iippiii";

function ___syscall_getsockopt(fd, level, optionName, optionValuePtr, optionLenPtr, d1) {
  const stream = FS.getStream(fd);
  if (!stream) {
    return -ERRNO_CODES.EBADF;
  }
  const sock = stream.node?.sock;
  if (!sock) {
    return -ERRNO_CODES.ENOTSOCK;
  }
  const {SOL_SOCKET, SO_TYPE, SO_ERROR, SO_RCVTIMEO, SO_SNDTIMEO} = PHPWASM.SOCKOPT;
  const writeInt = value => {
    if (HEAP32[optionLenPtr >> 2] < 4) {
      return -ERRNO_CODES.EINVAL;
    }
    HEAP32[optionValuePtr >> 2] = value;
    HEAP32[optionLenPtr >> 2] = 4;
    return 0;
  };
  if (level === SOL_SOCKET && optionName === SO_ERROR) {
    // Reading SO_ERROR clears it.
    const error = sock.error || 0;
    sock.error = null;
    return writeInt(error);
  }
  if (level === SOL_SOCKET && optionName === SO_TYPE) {
    return writeInt(sock.type);
  }
  if (level === SOL_SOCKET && (optionName === SO_RCVTIMEO || optionName === SO_SNDTIMEO)) {
    // struct timeval with a 64-bit time_t: two int64 fields.
    if (HEAP32[optionLenPtr >> 2] < 16) {
      return -ERRNO_CODES.EINVAL;
    }
    const timeouts = PHPWASM.socketTimeouts.get(sock) || {};
    const ms = (optionName === SO_RCVTIMEO ? timeouts.receive : timeouts.send) || 0;
    HEAP64[optionValuePtr >> 3] = BigInt(Math.floor(ms / 1e3));
    HEAP64[(optionValuePtr + 8) >> 3] = BigInt((ms % 1e3) * 1e3);
    HEAP32[optionLenPtr >> 2] = 16;
    return 0;
  }
  if (PHPWASM.isProxiedSocketOption(sock, level, optionName)) {
    const options = PHPWASM.proxiedSocketOptions.get(sock);
    return writeInt(options?.get(`${level}:${optionName}`) ?? 0);
  }
  return -ERRNO_CODES.ENOPROTOOPT;
}

___syscall_getsockopt.sig = "iiiippi";

function ___syscall_ioctl(fd, op, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var stream = SYSCALLS.getStreamFromFD(fd);
    switch (op) {
     case 21509:
      {
        if (!stream.tty) return -59;
        return 0;
      }

     case 21505:
      {
        if (!stream.tty) return -59;
        if (stream.tty.ops.ioctl_tcgets) {
          var termios = stream.tty.ops.ioctl_tcgets(stream);
          var argp = syscallGetVarargP();
          HEAP32[((argp) >> 2)] = termios.c_iflag || 0;
          HEAP32[(((argp) + (4)) >> 2)] = termios.c_oflag || 0;
          HEAP32[(((argp) + (8)) >> 2)] = termios.c_cflag || 0;
          HEAP32[(((argp) + (12)) >> 2)] = termios.c_lflag || 0;
          for (var i = 0; i < 32; i++) {
            HEAP8[(argp + i) + (17)] = termios.c_cc[i] || 0;
          }
          return 0;
        }
        return 0;
      }

     case 21510:
     case 21511:
     case 21512:
      {
        if (!stream.tty) return -59;
        return 0;
      }

     case 21506:
     case 21507:
     case 21508:
      {
        if (!stream.tty) return -59;
        if (stream.tty.ops.ioctl_tcsets) {
          var argp = syscallGetVarargP();
          var c_iflag = HEAP32[((argp) >> 2)];
          var c_oflag = HEAP32[(((argp) + (4)) >> 2)];
          var c_cflag = HEAP32[(((argp) + (8)) >> 2)];
          var c_lflag = HEAP32[(((argp) + (12)) >> 2)];
          var c_cc = [];
          for (var i = 0; i < 32; i++) {
            c_cc.push(HEAP8[(argp + i) + (17)]);
          }
          return stream.tty.ops.ioctl_tcsets(stream.tty, op, {
            c_iflag,
            c_oflag,
            c_cflag,
            c_lflag,
            c_cc
          });
        }
        return 0;
      }

     case 21519:
      {
        if (!stream.tty) return -59;
        var argp = syscallGetVarargP();
        HEAP32[((argp) >> 2)] = 0;
        return 0;
      }

     case 21520:
      {
        if (!stream.tty) return -59;
        return -28;
      }

     case 21537:
     case 21531:
      {
        var argp = syscallGetVarargP();
        return FS.ioctl(stream, op, argp);
      }

     case 21523:
      {
        // TODO: in theory we should write to the winsize struct that gets
        // passed in, but for now musl doesn't read anything on it
        if (!stream.tty) return -59;
        if (stream.tty.ops.ioctl_tiocgwinsz) {
          var winsize = stream.tty.ops.ioctl_tiocgwinsz(stream.tty);
          var argp = syscallGetVarargP();
          HEAP16[((argp) >> 1)] = winsize[0];
          HEAP16[(((argp) + (2)) >> 1)] = winsize[1];
        }
        return 0;
      }

     case 21524:
      {
        // TODO: technically, this ioctl call should change the window size.
        // but, since emscripten doesn't have any concept of a terminal window
        // yet, we'll just silently throw it away as we do TIOCGWINSZ
        if (!stream.tty) return -59;
        return 0;
      }

     case 21515:
      {
        if (!stream.tty) return -59;
        return 0;
      }

     default:
      return -28;
    }
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_ioctl.sig = "iiip";

function ___syscall_listen(fd, backlog) {
  try {
    var sock = getSocketFromFD(fd);
    sock.sock_ops.listen(sock, backlog);
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_listen.sig = "iiiiiii";

function ___syscall_lstat64(path, buf) {
  try {
    path = SYSCALLS.getStr(path);
    return SYSCALLS.writeStat(buf, FS.lstat(path));
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_lstat64.sig = "ipp";

function ___syscall_mkdirat(dirfd, path, mode) {
  try {
    path = SYSCALLS.getStr(path);
    path = SYSCALLS.calculateAt(dirfd, path);
    FS.mkdir(path, mode, 0);
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_mkdirat.sig = "iipi";

function ___syscall_mknodat(dirfd, path, mode, dev) {
  try {
    path = SYSCALLS.getStr(path);
    path = SYSCALLS.calculateAt(dirfd, path);
    // we don't want this in the JS API as it uses mknod to create all nodes.
    switch (mode & 61440) {
     case 32768:
     case 8192:
     case 24576:
     case 4096:
     case 49152:
      break;

     default:
      return -28;
    }
    FS.mknod(path, mode, dev);
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_mknodat.sig = "iipii";

function ___syscall_newfstatat(dirfd, path, buf, flags) {
  try {
    path = SYSCALLS.getStr(path);
    var nofollow = flags & 256;
    var allowEmpty = flags & 4096;
    flags = flags & (~6400);
    path = SYSCALLS.calculateAt(dirfd, path, allowEmpty);
    return SYSCALLS.writeStat(buf, nofollow ? FS.lstat(path) : FS.stat(path));
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_newfstatat.sig = "iippi";

function ___syscall_openat(dirfd, path, flags, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    path = SYSCALLS.getStr(path);
    path = SYSCALLS.calculateAt(dirfd, path);
    var mode = varargs ? syscallGetVarargI() : 0;
    return FS.open(path, flags, mode).fd;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_openat.sig = "iipip";

var PIPEFS = {
  BUCKET_BUFFER_SIZE: 8192,
  mount(mount) {
    // Do not pollute the real root directory or its child nodes with pipes
    // Looks like it is OK to create another pseudo-root node not linked to the FS.root hierarchy this way
    return FS.createNode(null, "/", 16384 | 511, 0);
  },
  createPipe() {
    var pipe = {
      buckets: [],
      // refcnt 2 because pipe has a read end and a write end. We need to be
      // able to read from the read end after write end is closed.
      refcnt: 2,
      timestamp: new Date
    };
    pipe.buckets.push({
      buffer: new Uint8Array(PIPEFS.BUCKET_BUFFER_SIZE),
      offset: 0,
      roffset: 0
    });
    var rName = PIPEFS.nextname();
    var wName = PIPEFS.nextname();
    var rNode = FS.createNode(PIPEFS.root, rName, 4096, 0);
    var wNode = FS.createNode(PIPEFS.root, wName, 4096, 0);
    rNode.pipe = pipe;
    wNode.pipe = pipe;
    var readableStream = FS.createStream({
      path: rName,
      node: rNode,
      flags: 0,
      seekable: false,
      stream_ops: PIPEFS.stream_ops
    });
    rNode.stream = readableStream;
    var writableStream = FS.createStream({
      path: wName,
      node: wNode,
      flags: 1,
      seekable: false,
      stream_ops: PIPEFS.stream_ops
    });
    wNode.stream = writableStream;
    return {
      readable_fd: readableStream.fd,
      writable_fd: writableStream.fd
    };
  },
  stream_ops: {
    getattr(stream) {
      var node = stream.node;
      var timestamp = node.pipe.timestamp;
      return {
        dev: 14,
        ino: node.id,
        mode: 4480,
        nlink: 1,
        uid: 0,
        gid: 0,
        rdev: 0,
        size: 0,
        atime: timestamp,
        mtime: timestamp,
        ctime: timestamp,
        blksize: 4096,
        blocks: 0
      };
    },
    poll(stream) {
      var pipe = stream.node.pipe;
      if ((stream.flags & 2097155) === 1) {
        return (256 | 4);
      }
      for (var bucket of pipe.buckets) {
        if (bucket.offset - bucket.roffset > 0) {
          return (64 | 1);
        }
      }
      return 0;
    },
    dup(stream) {
      stream.node.pipe.refcnt++;
    },
    ioctl(stream, request, varargs) {
      return 28;
    },
    fsync(stream) {
      return 28;
    },
    read(stream, buffer, offset, length, position) {
      var pipe = stream.node.pipe;
      var currentLength = 0;
      for (var bucket of pipe.buckets) {
        currentLength += bucket.offset - bucket.roffset;
      }
      var data = buffer.subarray(offset, offset + length);
      if (length <= 0) {
        return 0;
      }
      if(currentLength==0){if(pipe.refcnt<2){return 0;}throw new FS.ErrnoError(6);
      }
      var toRead = Math.min(currentLength, length);
      var totalRead = toRead;
      var toRemove = 0;
      for (var bucket of pipe.buckets) {
        var bucketSize = bucket.offset - bucket.roffset;
        if (toRead <= bucketSize) {
          var tmpSlice = bucket.buffer.subarray(bucket.roffset, bucket.offset);
          if (toRead < bucketSize) {
            tmpSlice = tmpSlice.subarray(0, toRead);
            bucket.roffset += toRead;
          } else {
            toRemove++;
          }
          data.set(tmpSlice);
          break;
        } else {
          var tmpSlice = bucket.buffer.subarray(bucket.roffset, bucket.offset);
          data.set(tmpSlice);
          data = data.subarray(tmpSlice.byteLength);
          toRead -= tmpSlice.byteLength;
          toRemove++;
        }
      }
      if (toRemove && toRemove == pipe.buckets.length) {
        // Do not generate excessive garbage in use cases such as
        // write several bytes, read everything, write several bytes, read everything...
        toRemove--;
        pipe.buckets[toRemove].offset = 0;
        pipe.buckets[toRemove].roffset = 0;
      }
      pipe.buckets.splice(0, toRemove);
      return totalRead;
    },
    write(stream, buffer, offset, length, position) {
      var pipe = stream.node.pipe;
      var data = buffer.subarray(offset, offset + length);
      var dataLen = data.byteLength;
      if (dataLen <= 0) {
        return 0;
      }
      var currBucket = null;
      if (pipe.buckets.length == 0) {
        currBucket = {
          buffer: new Uint8Array(PIPEFS.BUCKET_BUFFER_SIZE),
          offset: 0,
          roffset: 0
        };
        pipe.buckets.push(currBucket);
      } else {
        currBucket = pipe.buckets[pipe.buckets.length - 1];
      }
      var freeBytesInCurrBuffer = PIPEFS.BUCKET_BUFFER_SIZE - currBucket.offset;
      if (freeBytesInCurrBuffer >= dataLen) {
        currBucket.buffer.set(data, currBucket.offset);
        currBucket.offset += dataLen;
        return dataLen;
      } else if (freeBytesInCurrBuffer > 0) {
        currBucket.buffer.set(data.subarray(0, freeBytesInCurrBuffer), currBucket.offset);
        currBucket.offset += freeBytesInCurrBuffer;
        data = data.subarray(freeBytesInCurrBuffer, data.byteLength);
      }
      var numBuckets = (data.byteLength / PIPEFS.BUCKET_BUFFER_SIZE) | 0;
      var remElements = data.byteLength % PIPEFS.BUCKET_BUFFER_SIZE;
      for (var i = 0; i < numBuckets; i++) {
        var newBucket = {
          buffer: new Uint8Array(PIPEFS.BUCKET_BUFFER_SIZE),
          offset: PIPEFS.BUCKET_BUFFER_SIZE,
          roffset: 0
        };
        pipe.buckets.push(newBucket);
        newBucket.buffer.set(data.subarray(0, PIPEFS.BUCKET_BUFFER_SIZE));
        data = data.subarray(PIPEFS.BUCKET_BUFFER_SIZE, data.byteLength);
      }
      if (remElements > 0) {
        var newBucket = {
          buffer: new Uint8Array(PIPEFS.BUCKET_BUFFER_SIZE),
          offset: data.byteLength,
          roffset: 0
        };
        pipe.buckets.push(newBucket);
        newBucket.buffer.set(data);
      }
      return dataLen;
    },
    close(stream) {
      var pipe = stream.node.pipe;
      pipe.refcnt--;
      if (pipe.refcnt === 0) {
        pipe.buckets = null;
      }
    }
  },
  nextname() {
    if (!PIPEFS.nextname.current) {
      PIPEFS.nextname.current = 0;
    }
    return "pipe[" + (PIPEFS.nextname.current++) + "]";
  }
};

function ___syscall_pipe(fdPtr) {
  try {
    if (fdPtr == 0) {
      throw new FS.ErrnoError(21);
    }
    var res = PIPEFS.createPipe();
    HEAP32[((fdPtr) >> 2)] = res.readable_fd;
    HEAP32[(((fdPtr) + (4)) >> 2)] = res.writable_fd;
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_pipe.sig = "ip";

function ___syscall_poll(fds, nfds, timeout) {
  try {
    var nonzero = 0;
    for (var i = 0; i < nfds; i++) {
      var pollfd = fds + 8 * i;
      var fd = HEAP32[((pollfd) >> 2)];
      var events = HEAP16[(((pollfd) + (4)) >> 1)];
      var mask = 32;
      var stream = FS.getStream(fd);
      if (stream) {
        mask = SYSCALLS.DEFAULT_POLLMASK;
        if (stream.stream_ops?.poll) {
          mask = stream.stream_ops.poll(stream, -1);
        }
      }
      mask &= events | 8 | 16;
      if (mask) nonzero++;
      HEAP16[(((pollfd) + (6)) >> 1)] = mask;
    }
    return nonzero;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_poll.sig = "ipii";

function ___syscall_readlinkat(dirfd, path, buf, bufsize) {
  try {
    path = SYSCALLS.getStr(path);
    path = SYSCALLS.calculateAt(dirfd, path);
    if (bufsize <= 0) return -28;
    var ret = FS.readlink(path);
    var len = Math.min(bufsize, lengthBytesUTF8(ret));
    var endChar = HEAP8[buf + len];
    stringToUTF8(ret, buf, bufsize + 1);
    // readlink is one of the rare functions that write out a C string, but does never append a null to the output buffer(!)
    // stringToUTF8() always appends a null byte, so restore the character under the null byte after the write.
    HEAP8[buf + len] = endChar;
    return len;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_readlinkat.sig = "iippp";

function _wasm_recvfrom(fd, buf, len, flags, addr, addrlen) {
  const result = PHPWASM.recvfromNow(fd, buf, len, flags, addr, addrlen);
  if (result !== -ERRNO_CODES.EAGAIN) {
    return result;
  }
  const MSG_DONTWAIT = 64;
  const stream = FS.getStream(fd);
  const sock = stream?.node?.sock;
  if (!sock || stream.flags & PHPWASM.O_NONBLOCK || flags & MSG_DONTWAIT) {
    return result;
  }
  return Asyncify.handleSleep(wakeUp => {
    const receiveTimeout = PHPWASM.getSocketTimeouts(fd)?.receive;
    const startedAt = Date.now();
    const poll = function() {
      const n = PHPWASM.recvfromNow(fd, buf, len, flags, addr, addrlen);
      if (n !== -ERRNO_CODES.EAGAIN) {
        wakeUp(n);
        return;
      }
      if (receiveTimeout > 0 && Date.now() - startedAt >= receiveTimeout) {
        wakeUp(-ERRNO_CODES.EAGAIN);
        return;
      }
      setTimeout(poll, 20);
    };
    poll();
  });
}

function ___syscall_recvfrom(fd, buf, len, flags, addr, addrlen) {
  return _wasm_recvfrom(fd, buf, len, flags, addr, addrlen);
}

___syscall_recvfrom.sig = "iippipp";

function ___syscall_recvmsg(fd, message, flags, d1, d2, d3) {
  try {
    var sock = getSocketFromFD(fd);
    var iov = HEAPU32[(((message) + (8)) >> 2)];
    var num = HEAP32[(((message) + (12)) >> 2)];
    // get the total amount of data we can read across all arrays
    var total = 0;
    for (var i = 0; i < num; i++) {
      total += HEAP32[(((iov) + ((8 * i) + 4)) >> 2)];
    }
    // try to read total data
    var msg = sock.sock_ops.recvmsg(sock, total);
    if (!msg) return 0;
    // socket is closed
    // TODO honor flags:
    // MSG_OOB
    // Requests out-of-band data. The significance and semantics of out-of-band data are protocol-specific.
    // MSG_PEEK
    // Peeks at the incoming message.
    // MSG_WAITALL
    // Requests that the function block until the full amount of data requested can be returned. The function may return a smaller amount of data if a signal is caught, if the connection is terminated, if MSG_PEEK was specified, or if an error is pending for the socket.
    // write the source address out
    var name = HEAPU32[((message) >> 2)];
    if (name) {
      var errno = writeSockaddr(name, sock.family, DNS.lookup_name(msg.addr), msg.port);
    }
    // write the buffer out to the scatter-gather arrays
    var bytesRead = 0;
    var bytesRemaining = msg.buffer.byteLength;
    for (var i = 0; bytesRemaining > 0 && i < num; i++) {
      var iovbase = HEAPU32[(((iov) + ((8 * i) + 0)) >> 2)];
      var iovlen = HEAP32[(((iov) + ((8 * i) + 4)) >> 2)];
      if (!iovlen) {
        continue;
      }
      var length = Math.min(iovlen, bytesRemaining);
      var buf = msg.buffer.subarray(bytesRead, bytesRead + length);
      HEAPU8.set(buf, iovbase + bytesRead);
      bytesRead += length;
      bytesRemaining -= length;
    }
    // TODO set msghdr.msg_flags
    // MSG_EOR
    // End of record was received (if supported by the protocol).
    // MSG_OOB
    // Out-of-band data was received.
    // MSG_TRUNC
    // Normal data was truncated.
    // MSG_CTRUNC
    return bytesRead;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_recvmsg.sig = "iipiiii";

function ___syscall_renameat(olddirfd, oldpath, newdirfd, newpath) {
  try {
    oldpath = SYSCALLS.getStr(oldpath);
    newpath = SYSCALLS.getStr(newpath);
    oldpath = SYSCALLS.calculateAt(olddirfd, oldpath);
    newpath = SYSCALLS.calculateAt(newdirfd, newpath);
    FS.rename(oldpath, newpath);
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_renameat.sig = "iipip";

function ___syscall_rmdir(path) {
  try {
    path = SYSCALLS.getStr(path);
    FS.rmdir(path);
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_rmdir.sig = "ip";

function ___syscall_sendmsg(fd, message, flags, d1, d2, d3) {
  try {
    var sock = getSocketFromFD(fd);
    var iov = HEAPU32[(((message) + (8)) >> 2)];
    var num = HEAP32[(((message) + (12)) >> 2)];
    // read the address and port to send to
    var addr, port;
    var name = HEAPU32[((message) >> 2)];
    var namelen = HEAP32[(((message) + (4)) >> 2)];
    if (name) {
      var info = getSocketAddress(name, namelen);
      port = info.port;
      addr = info.addr;
    }
    // concatenate scatter-gather arrays into one message buffer
    var total = 0;
    for (var i = 0; i < num; i++) {
      total += HEAP32[(((iov) + ((8 * i) + 4)) >> 2)];
    }
    var view = new Uint8Array(total);
    var offset = 0;
    for (var i = 0; i < num; i++) {
      var iovbase = HEAPU32[(((iov) + ((8 * i) + 0)) >> 2)];
      var iovlen = HEAP32[(((iov) + ((8 * i) + 4)) >> 2)];
      for (var j = 0; j < iovlen; j++) {
        view[offset++] = HEAP8[(iovbase) + (j)];
      }
    }
    // write the buffer
    return sock.sock_ops.sendmsg(sock, view, 0, total, addr, port);
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_sendmsg.sig = "iipippi";

function ___syscall_sendto(fd, message, length, flags, addr, addr_len) {
  try {
    var sock = getSocketFromFD(fd);
    if (!addr) {
      // send, no address provided
      return FS.write(sock.stream, HEAP8, message, length);
    }
    var dest = getSocketAddress(addr, addr_len);
    // sendto an address
    return sock.sock_ops.sendmsg(sock, HEAP8, message, length, dest.addr, dest.port);
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_sendto.sig = "iippipp";

function ___syscall_socket(domain, type, protocol) {
  try {
    const sock = SOCKFS.createSocket(domain, type, protocol);
    if (type & Number("2048")) {
      sock.stream.flags |= PHPWASM.O_NONBLOCK;
    }
    return sock.stream.fd;
  } catch (e) {
    if (typeof FS == "undefined" || e.name !== "ErrnoError") {
      throw e;
    }
    return -e.errno;
  }
}

___syscall_socket.sig = "iiiiiii";

function ___syscall_stat64(path, buf) {
  try {
    path = SYSCALLS.getStr(path);
    return SYSCALLS.writeStat(buf, FS.stat(path));
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_stat64.sig = "ipp";

function ___syscall_statfs64(path, size, buf) {
  try {
    SYSCALLS.writeStatFs(buf, FS.statfs(SYSCALLS.getStr(path)));
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_statfs64.sig = "ippp";

function ___syscall_symlinkat(target, dirfd, linkpath) {
  try {
    target = SYSCALLS.getStr(target);
    linkpath = SYSCALLS.getStr(linkpath);
    linkpath = SYSCALLS.calculateAt(dirfd, linkpath);
    FS.symlink(target, linkpath);
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_symlinkat.sig = "ipip";

function ___syscall_truncate64(path, length) {
  length = bigintToI53Checked(length);
  try {
    if (isNaN(length)) return -61;
    path = SYSCALLS.getStr(path);
    FS.truncate(path, length);
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_truncate64.sig = "ipj";

function ___syscall_unlinkat(dirfd, path, flags) {
  try {
    path = SYSCALLS.getStr(path);
    path = SYSCALLS.calculateAt(dirfd, path);
    if (!flags) {
      FS.unlink(path);
    } else if (flags === 512) {
      FS.rmdir(path);
    } else {
      return -28;
    }
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_unlinkat.sig = "iipi";

var readI53FromI64 = ptr => HEAPU32[((ptr) >> 2)] + HEAP32[(((ptr) + (4)) >> 2)] * 4294967296;

function ___syscall_utimensat(dirfd, path, times, flags) {
  try {
    path = SYSCALLS.getStr(path);
    path = SYSCALLS.calculateAt(dirfd, path, true);
    var now = Date.now(), atime, mtime;
    if (!times) {
      atime = now;
      mtime = now;
    } else {
      var seconds = readI53FromI64(times);
      var nanoseconds = HEAP32[(((times) + (8)) >> 2)];
      if (nanoseconds == 1073741823) {
        atime = now;
      } else if (nanoseconds == 1073741822) {
        atime = null;
      } else {
        atime = (seconds * 1e3) + (nanoseconds / (1e3 * 1e3));
      }
      times += 16;
      seconds = readI53FromI64(times);
      nanoseconds = HEAP32[(((times) + (8)) >> 2)];
      if (nanoseconds == 1073741823) {
        mtime = now;
      } else if (nanoseconds == 1073741822) {
        mtime = null;
      } else {
        mtime = (seconds * 1e3) + (nanoseconds / (1e3 * 1e3));
      }
    }
    // null here means UTIME_OMIT was passed. If both were set to UTIME_OMIT then
    // we can skip the call completely.
    if ((mtime ?? atime) !== null) {
      FS.utime(path, atime, mtime);
    }
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_utimensat.sig = "iippi";

var __abort_js = () => abort("");

__abort_js.sig = "v";

var dlSetError = msg => {
  var sp = stackSave();
  var cmsg = stringToUTF8OnStack(msg);
  ___dl_seterr(cmsg, 0);
  stackRestore(sp);
};

var dlopenInternal = (handle, jsflags) => {
  // void *dlopen(const char *file, int mode);
  // http://pubs.opengroup.org/onlinepubs/009695399/functions/dlopen.html
  var filename = UTF8ToString(handle + 36);
  var flags = HEAP32[(((handle) + (4)) >> 2)];
  filename = PATH.normalize(filename);
  var global = Boolean(flags & 256);
  var localScope = global ? null : {};
  // We don't care about RTLD_NOW and RTLD_LAZY.
  var combinedFlags = {
    global,
    nodelete: Boolean(flags & 4096),
    loadAsync: jsflags.loadAsync
  };
  if (jsflags.loadAsync) {
    return loadDynamicLibrary(filename, combinedFlags, localScope, handle);
  }
  try {
    return loadDynamicLibrary(filename, combinedFlags, localScope, handle);
  } catch (e) {
    dlSetError(`could not load dynamic lib: ${filename}\n${e}`);
    return 0;
  }
};

function __dlopen_js(handle) {
  var jsflags = {
    loadAsync: false
  };
  return dlopenInternal(handle, jsflags);
}

__dlopen_js.sig = "pp";

var __dlsym_js = (handle, symbol, symbolIndex) => {
  // void *dlsym(void *restrict handle, const char *restrict name);
  // http://pubs.opengroup.org/onlinepubs/009695399/functions/dlsym.html
  symbol = UTF8ToString(symbol);
  var result;
  var newSymIndex;
  var lib = LDSO.loadedLibsByHandle[handle];
  newSymIndex = Object.keys(lib.exports).indexOf(symbol);
  if (newSymIndex == -1 || lib.exports[symbol].stub) {
    dlSetError(`Tried to lookup unknown symbol "${symbol}" in dynamic lib: ${lib.name}`);
    return 0;
  }
  result = lib.exports[symbol];
  if (typeof result == "function") {
    // Asyncify wraps exports, and we need to look through those wrappers.
    if (result.orig) {
      result = result.orig;
    }
    var addr = getFunctionAddress(result);
    if (addr) {
      result = addr;
    } else {
      // Insert the function into the wasm table.  If its a direct wasm
      // function the second argument will not be needed.  If its a JS
      // function we rely on the `sig` attribute being set based on the
      // `<func>__sig` specified in library JS file.
      result = addFunction(result, result.sig);
      HEAPU32[((symbolIndex) >> 2)] = newSymIndex;
    }
  }
  return result;
};

__dlsym_js.sig = "pppp";

var __emscripten_lookup_name = name => {
  // uint32_t _emscripten_lookup_name(const char *name);
  var nameString = UTF8ToString(name);
  return inetPton4(DNS.lookup_name(nameString));
};

__emscripten_lookup_name.sig = "ip";

var runtimeKeepaliveCounter = 0;

var __emscripten_runtime_keepalive_clear = () => {
  noExitRuntime = false;
  runtimeKeepaliveCounter = 0;
};

__emscripten_runtime_keepalive_clear.sig = "v";

var __emscripten_system = command => {
  if (ENVIRONMENT_IS_NODE) {
    if (!command) return 1;
    // shell is available
    var cmdstr = UTF8ToString(command);
    if (!cmdstr.length) return 0;
    // this is what glibc seems to do (shell works test?)
    var cp = require("child_process");
    var ret = cp.spawnSync(cmdstr, [], {
      shell: true,
      stdio: "inherit"
    });
    var _W_EXITCODE = (ret, sig) => ((ret) << 8 | (sig));
    // this really only can happen if process is killed by signal
    if (ret.status === null) {
      // sadly node doesn't expose such function
      var signalToNumber = sig => {
        // implement only the most common ones, and fallback to SIGINT
        switch (sig) {
         case "SIGHUP":
          return 1;

         case "SIGQUIT":
          return 3;

         case "SIGFPE":
          return 8;

         case "SIGKILL":
          return 9;

         case "SIGALRM":
          return 14;

         case "SIGTERM":
          return 15;

         default:
          return 2;
        }
      };
      return _W_EXITCODE(0, signalToNumber(ret.signal));
    }
    return _W_EXITCODE(ret.status, 0);
  }
  // int system(const char *command);
  // http://pubs.opengroup.org/onlinepubs/000095399/functions/system.html
  // Can't call external programs.
  if (!command) return 0;
  // no shell available
  return -52;
};

__emscripten_system.sig = "ip";

function __gmtime_js(time, tmPtr) {
  time = bigintToI53Checked(time);
  var date = new Date(time * 1e3);
  HEAP32[((tmPtr) >> 2)] = date.getUTCSeconds();
  HEAP32[(((tmPtr) + (4)) >> 2)] = date.getUTCMinutes();
  HEAP32[(((tmPtr) + (8)) >> 2)] = date.getUTCHours();
  HEAP32[(((tmPtr) + (12)) >> 2)] = date.getUTCDate();
  HEAP32[(((tmPtr) + (16)) >> 2)] = date.getUTCMonth();
  HEAP32[(((tmPtr) + (20)) >> 2)] = date.getUTCFullYear() - 1900;
  HEAP32[(((tmPtr) + (24)) >> 2)] = date.getUTCDay();
  var start = Date.UTC(date.getUTCFullYear(), 0, 1, 0, 0, 0, 0);
  var yday = ((date.getTime() - start) / (1e3 * 60 * 60 * 24)) | 0;
  HEAP32[(((tmPtr) + (28)) >> 2)] = yday;
}

__gmtime_js.sig = "vjp";

var isLeapYear = year => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);

var MONTH_DAYS_LEAP_CUMULATIVE = [ 0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335 ];

var MONTH_DAYS_REGULAR_CUMULATIVE = [ 0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334 ];

var ydayFromDate = date => {
  var leap = isLeapYear(date.getFullYear());
  var monthDaysCumulative = (leap ? MONTH_DAYS_LEAP_CUMULATIVE : MONTH_DAYS_REGULAR_CUMULATIVE);
  var yday = monthDaysCumulative[date.getMonth()] + date.getDate() - 1;
  // -1 since it's days since Jan 1
  return yday;
};

function __localtime_js(time, tmPtr) {
  time = bigintToI53Checked(time);
  var date = new Date(time * 1e3);
  HEAP32[((tmPtr) >> 2)] = date.getSeconds();
  HEAP32[(((tmPtr) + (4)) >> 2)] = date.getMinutes();
  HEAP32[(((tmPtr) + (8)) >> 2)] = date.getHours();
  HEAP32[(((tmPtr) + (12)) >> 2)] = date.getDate();
  HEAP32[(((tmPtr) + (16)) >> 2)] = date.getMonth();
  HEAP32[(((tmPtr) + (20)) >> 2)] = date.getFullYear() - 1900;
  HEAP32[(((tmPtr) + (24)) >> 2)] = date.getDay();
  var yday = ydayFromDate(date) | 0;
  HEAP32[(((tmPtr) + (28)) >> 2)] = yday;
  HEAP32[(((tmPtr) + (36)) >> 2)] = -(date.getTimezoneOffset() * 60);
  // Attention: DST is in December in South, and some regions don't have DST at all.
  var start = new Date(date.getFullYear(), 0, 1);
  var summerOffset = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
  var winterOffset = start.getTimezoneOffset();
  var dst = (summerOffset != winterOffset && date.getTimezoneOffset() == Math.min(winterOffset, summerOffset)) | 0;
  HEAP32[(((tmPtr) + (32)) >> 2)] = dst;
}

__localtime_js.sig = "vjp";

var __mktime_js = function(tmPtr) {
  var ret = (() => {
    var date = new Date(HEAP32[(((tmPtr) + (20)) >> 2)] + 1900, HEAP32[(((tmPtr) + (16)) >> 2)], HEAP32[(((tmPtr) + (12)) >> 2)], HEAP32[(((tmPtr) + (8)) >> 2)], HEAP32[(((tmPtr) + (4)) >> 2)], HEAP32[((tmPtr) >> 2)], 0);
    // There's an ambiguous hour when the time goes back; the tm_isdst field is
    // used to disambiguate it.  Date() basically guesses, so we fix it up if it
    // guessed wrong, or fill in tm_isdst with the guess if it's -1.
    var dst = HEAP32[(((tmPtr) + (32)) >> 2)];
    var guessedOffset = date.getTimezoneOffset();
    var start = new Date(date.getFullYear(), 0, 1);
    var summerOffset = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
    var winterOffset = start.getTimezoneOffset();
    var dstOffset = Math.min(winterOffset, summerOffset);
    // DST is in December in South
    if (dst < 0) {
      // Attention: some regions don't have DST at all.
      HEAP32[(((tmPtr) + (32)) >> 2)] = Number(summerOffset != winterOffset && dstOffset == guessedOffset);
    } else if ((dst > 0) != (dstOffset == guessedOffset)) {
      var nonDstOffset = Math.max(winterOffset, summerOffset);
      var trueOffset = dst > 0 ? dstOffset : nonDstOffset;
      // Don't try setMinutes(date.getMinutes() + ...) -- it's messed up.
      date.setTime(date.getTime() + (trueOffset - guessedOffset) * 6e4);
    }
    HEAP32[(((tmPtr) + (24)) >> 2)] = date.getDay();
    var yday = ydayFromDate(date) | 0;
    HEAP32[(((tmPtr) + (28)) >> 2)] = yday;
    // To match expected behavior, update fields from date
    HEAP32[((tmPtr) >> 2)] = date.getSeconds();
    HEAP32[(((tmPtr) + (4)) >> 2)] = date.getMinutes();
    HEAP32[(((tmPtr) + (8)) >> 2)] = date.getHours();
    HEAP32[(((tmPtr) + (12)) >> 2)] = date.getDate();
    HEAP32[(((tmPtr) + (16)) >> 2)] = date.getMonth();
    HEAP32[(((tmPtr) + (20)) >> 2)] = date.getYear();
    var timeMs = date.getTime();
    if (isNaN(timeMs)) {
      return -1;
    }
    // Return time in microseconds
    return timeMs / 1e3;
  })();
  return BigInt(ret);
};

__mktime_js.sig = "jp";

function __mmap_js(len, prot, flags, fd, offset, allocated, addr) {
  offset = bigintToI53Checked(offset);
  try {
    var stream = SYSCALLS.getStreamFromFD(fd);
    var res = FS.mmap(stream, len, offset, prot, flags);
    var ptr = res.ptr;
    HEAP32[((allocated) >> 2)] = res.allocated;
    HEAPU32[((addr) >> 2)] = ptr;
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

__mmap_js.sig = "ipiiijpp";

function __munmap_js(addr, len, prot, flags, fd, offset) {
  offset = bigintToI53Checked(offset);
  try {
    var stream = SYSCALLS.getStreamFromFD(fd);
    if (prot & 2) {
      SYSCALLS.doMsync(addr, stream, len, flags, offset);
    }
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

__munmap_js.sig = "ippiiij";

var timers = {};

var handleException = e => {
  // Certain exception types we do not treat as errors since they are used for
  // internal control flow.
  // 1. ExitStatus, which is thrown by exit()
  // 2. "unwind", which is thrown by emscripten_unwind_to_js_event_loop() and others
  //    that wish to return to JS event loop.
  if (e instanceof ExitStatus || e == "unwind") {
    return EXITSTATUS;
  }
  quit_(1, e);
};

var keepRuntimeAlive = () => noExitRuntime || runtimeKeepaliveCounter > 0;

var _proc_exit = code => {
  EXITSTATUS = code;
  if (!keepRuntimeAlive()) {
    Module["onExit"]?.(code);
    ABORT = true;
  }
  quit_(code, new ExitStatus(code));
};

_proc_exit.sig = "vi";

/** @param {boolean|number=} implicit */ var exitJS = (status, implicit) => {
  EXITSTATUS = status;
  if (!keepRuntimeAlive()) {
    exitRuntime();
  }
  _proc_exit(status);
};

var _exit = exitJS;

_exit.sig = "vi";

var maybeExit = () => {
  if (runtimeExited) {
    return;
  }
  if (!keepRuntimeAlive()) {
    try {
      _exit(EXITSTATUS);
    } catch (e) {
      handleException(e);
    }
  }
};

var callUserCallback = func => {
  if (runtimeExited || ABORT) {
    return;
  }
  try {
    func();
    maybeExit();
  } catch (e) {
    handleException(e);
  }
};

var _emscripten_get_now = () => performance.now();

_emscripten_get_now.sig = "d";

var __setitimer_js = (which, timeout_ms) => {
  // First, clear any existing timer.
  if (timers[which]) {
    clearTimeout(timers[which].id);
    delete timers[which];
  }
  // A timeout of zero simply cancels the current timeout so we have nothing
  // more to do.
  if (!timeout_ms) return 0;
  var id = setTimeout(() => {
    delete timers[which];
    callUserCallback(() => __emscripten_timeout(which, _emscripten_get_now()));
  }, timeout_ms);
  timers[which] = {
    id,
    timeout_ms
  };
  return 0;
};

__setitimer_js.sig = "iid";

var __timegm_js = function(tmPtr) {
  var ret = (() => {
    var time = Date.UTC(HEAP32[(((tmPtr) + (20)) >> 2)] + 1900, HEAP32[(((tmPtr) + (16)) >> 2)], HEAP32[(((tmPtr) + (12)) >> 2)], HEAP32[(((tmPtr) + (8)) >> 2)], HEAP32[(((tmPtr) + (4)) >> 2)], HEAP32[((tmPtr) >> 2)], 0);
    var date = new Date(time);
    HEAP32[(((tmPtr) + (24)) >> 2)] = date.getUTCDay();
    var start = Date.UTC(date.getUTCFullYear(), 0, 1, 0, 0, 0, 0);
    var yday = ((date.getTime() - start) / (1e3 * 60 * 60 * 24)) | 0;
    HEAP32[(((tmPtr) + (28)) >> 2)] = yday;
    return date.getTime() / 1e3;
  })();
  return BigInt(ret);
};

__timegm_js.sig = "jp";

var __tzset_js = (timezone, daylight, std_name, dst_name) => {
  // TODO: Use (malleable) environment variables instead of system settings.
  var currentYear = (new Date).getFullYear();
  var winter = new Date(currentYear, 0, 1);
  var summer = new Date(currentYear, 6, 1);
  var winterOffset = winter.getTimezoneOffset();
  var summerOffset = summer.getTimezoneOffset();
  // Local standard timezone offset. Local standard time is not adjusted for
  // daylight savings.  This code uses the fact that getTimezoneOffset returns
  // a greater value during Standard Time versus Daylight Saving Time (DST).
  // Thus it determines the expected output during Standard Time, and it
  // compares whether the output of the given date the same (Standard) or less
  // (DST).
  var stdTimezoneOffset = Math.max(winterOffset, summerOffset);
  // timezone is specified as seconds west of UTC ("The external variable
  // `timezone` shall be set to the difference, in seconds, between
  // Coordinated Universal Time (UTC) and local standard time."), the same
  // as returned by stdTimezoneOffset.
  // See http://pubs.opengroup.org/onlinepubs/009695399/functions/tzset.html
  HEAPU32[((timezone) >> 2)] = stdTimezoneOffset * 60;
  HEAP32[((daylight) >> 2)] = Number(winterOffset != summerOffset);
  var extractZone = timezoneOffset => {
    // Why inverse sign?
    // Read here https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getTimezoneOffset
    var sign = timezoneOffset >= 0 ? "-" : "+";
    var absOffset = Math.abs(timezoneOffset);
    var hours = String(Math.floor(absOffset / 60)).padStart(2, "0");
    var minutes = String(absOffset % 60).padStart(2, "0");
    return `UTC${sign}${hours}${minutes}`;
  };
  var winterName = extractZone(winterOffset);
  var summerName = extractZone(summerOffset);
  if (summerOffset < winterOffset) {
    // Northern hemisphere
    stringToUTF8(winterName, std_name, 17);
    stringToUTF8(summerName, dst_name, 17);
  } else {
    stringToUTF8(winterName, dst_name, 17);
    stringToUTF8(summerName, std_name, 17);
  }
};

__tzset_js.sig = "vpppp";

var _emscripten_date_now = () => Date.now();

_emscripten_date_now.sig = "d";

var nowIsMonotonic = 1;

var checkWasiClock = clock_id => clock_id >= 0 && clock_id <= 3;

function _clock_time_get(clk_id, ignored_precision, ptime) {
  ignored_precision = bigintToI53Checked(ignored_precision);
  if (!checkWasiClock(clk_id)) {
    return 28;
  }
  var now;
  // all wasi clocks but realtime are monotonic
  if (clk_id === 0) {
    now = _emscripten_date_now();
  } else if (nowIsMonotonic) {
    now = _emscripten_get_now();
  } else {
    return 52;
  }
  // "now" is in ms, and wasi times are in ns.
  var nsec = Math.round(now * 1e3 * 1e3);
  HEAP64[((ptime) >> 3)] = BigInt(nsec);
  return 0;
}

_clock_time_get.sig = "iijp";

var getHeapMax = () => // Stay one Wasm page short of 4GB: while e.g. Chrome is able to allocate
// full 4GB Wasm memories, the size will wrap back to 0 bytes in Wasm side
// for any code that deals with heap sizes, which would require special
// casing all heap size related code to treat 0 specially.
2147483648;

var _emscripten_get_heap_max = () => getHeapMax();

_emscripten_get_heap_max.sig = "p";

var growMemory = size => {
  var oldHeapSize = wasmMemory.buffer.byteLength;
  var pages = ((size - oldHeapSize + 65535) / 65536) | 0;
  try {
    // round size grow request up to wasm page size (fixed 64KB per spec)
    wasmMemory.grow(pages);
    // .grow() takes a delta compared to the previous size
    updateMemoryViews();
    return 1;
  } catch (e) {}
};

var _emscripten_resize_heap = requestedSize => {
  var oldSize = HEAPU8.length;
  // With CAN_ADDRESS_2GB or MEMORY64, pointers are already unsigned.
  requestedSize >>>= 0;
  // With multithreaded builds, races can happen (another thread might increase the size
  // in between), so return a failure, and let the caller retry.
  // Memory resize rules:
  // 1.  Always increase heap size to at least the requested size, rounded up
  //     to next page multiple.
  // 2a. If MEMORY_GROWTH_LINEAR_STEP == -1, excessively resize the heap
  //     geometrically: increase the heap size according to
  //     MEMORY_GROWTH_GEOMETRIC_STEP factor (default +20%), At most
  //     overreserve by MEMORY_GROWTH_GEOMETRIC_CAP bytes (default 96MB).
  // 2b. If MEMORY_GROWTH_LINEAR_STEP != -1, excessively resize the heap
  //     linearly: increase the heap size by at least
  //     MEMORY_GROWTH_LINEAR_STEP bytes.
  // 3.  Max size for the heap is capped at 2048MB-WASM_PAGE_SIZE, or by
  //     MAXIMUM_MEMORY, or by ASAN limit, depending on which is smallest
  // 4.  If we were unable to allocate as much memory, it may be due to
  //     over-eager decision to excessively reserve due to (3) above.
  //     Hence if an allocation fails, cut down on the amount of excess
  //     growth, in an attempt to succeed to perform a smaller allocation.
  // A limit is set for how much we can grow. We should not exceed that
  // (the wasm binary specifies it, so if we tried, we'd fail anyhow).
  var maxHeapSize = getHeapMax();
  if (requestedSize > maxHeapSize) {
    return false;
  }
  // Loop through potential heap size increases. If we attempt a too eager
  // reservation that fails, cut down on the attempted size and reserve a
  // smaller bump instead. (max 3 times, chosen somewhat arbitrarily)
  for (var cutDown = 1; cutDown <= 4; cutDown *= 2) {
    var overGrownHeapSize = oldSize * (1 + .2 / cutDown);
    // ensure geometric growth
    // but limit overreserving (default to capping at +96MB overgrowth at most)
    overGrownHeapSize = Math.min(overGrownHeapSize, requestedSize + 100663296);
    var newSize = Math.min(maxHeapSize, alignMemory(Math.max(requestedSize, overGrownHeapSize), 65536));
    var replacement = growMemory(newSize);
    if (replacement) {
      return true;
    }
  }
  return false;
};

_emscripten_resize_heap.sig = "ip";

var runtimeKeepalivePush = () => {
  runtimeKeepaliveCounter += 1;
};

runtimeKeepalivePush.sig = "v";

var runtimeKeepalivePop = () => {
  runtimeKeepaliveCounter -= 1;
};

runtimeKeepalivePop.sig = "v";

/** @param {number=} timeout */ var safeSetTimeout = (func, timeout) => {
  runtimeKeepalivePush();
  return setTimeout(() => {
    runtimeKeepalivePop();
    callUserCallback(func);
  }, timeout);
};

var _emscripten_sleep = ms => Asyncify.handleSleep(wakeUp => safeSetTimeout(wakeUp, ms));

_emscripten_sleep.sig = "vi";

_emscripten_sleep.isAsync = true;

var ENV = PHPLoader.ENV || {};

var getExecutableName = () => thisProgram || "./this.program";

var getEnvStrings = () => {
  if (!getEnvStrings.strings) {
    // Default values.
    // Browser language detection #8751
    var lang = ((typeof navigator == "object" && navigator.language) || "C").replace("-", "_") + ".UTF-8";
    var env = {
      "USER": "web_user",
      "LOGNAME": "web_user",
      "PATH": "/",
      "PWD": "/",
      "HOME": "/home/web_user",
      "LANG": lang,
      "_": getExecutableName()
    };
    // Apply the user-provided values, if any.
    for (var x in ENV) {
      // x is a key in ENV; if ENV[x] is undefined, that means it was
      // explicitly set to be so. We allow user code to do that to
      // force variables with default values to remain unset.
      if (ENV[x] === undefined) delete env[x]; else env[x] = ENV[x];
    }
    var strings = [];
    for (var x in env) {
      strings.push(`${x}=${env[x]}`);
    }
    getEnvStrings.strings = strings;
  }
  return getEnvStrings.strings;
};

var _environ_get = (__environ, environ_buf) => {
  var bufSize = 0;
  var envp = 0;
  for (var string of getEnvStrings()) {
    var ptr = environ_buf + bufSize;
    HEAPU32[(((__environ) + (envp)) >> 2)] = ptr;
    bufSize += stringToUTF8(string, ptr, Infinity) + 1;
    envp += 4;
  }
  return 0;
};

_environ_get.sig = "ipp";

var _environ_sizes_get = (penviron_count, penviron_buf_size) => {
  var strings = getEnvStrings();
  HEAPU32[((penviron_count) >> 2)] = strings.length;
  var bufSize = 0;
  for (var string of strings) {
    bufSize += lengthBytesUTF8(string) + 1;
  }
  HEAPU32[((penviron_buf_size) >> 2)] = bufSize;
  return 0;
};

_environ_sizes_get.sig = "ipp";

function _fd_fdstat_get(fd, pbuf) {
  try {
    var rightsBase = 0;
    var rightsInheriting = 0;
    var flags = 0;
    {
      var stream = SYSCALLS.getStreamFromFD(fd);
      // All character devices are terminals (other things a Linux system would
      // assume is a character device, like the mouse, we have special APIs for).
      var type = stream.tty ? 2 : FS.isDir(stream.mode) ? 3 : FS.isLink(stream.mode) ? 7 : 4;
    }
    HEAP8[pbuf] = type;
    HEAP16[(((pbuf) + (2)) >> 1)] = flags;
    HEAP64[(((pbuf) + (8)) >> 3)] = BigInt(rightsBase);
    HEAP64[(((pbuf) + (16)) >> 3)] = BigInt(rightsInheriting);
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return e.errno;
  }
}

_fd_fdstat_get.sig = "iip";

/** @param {number=} offset */ var doWritev = (stream, iov, iovcnt, offset) => {
  var ret = 0;
  for (var i = 0; i < iovcnt; i++) {
    var ptr = HEAPU32[((iov) >> 2)];
    var len = HEAPU32[(((iov) + (4)) >> 2)];
    iov += 8;
    var curr = FS.write(stream, HEAP8, ptr, len, offset);
    if (curr < 0) return -1;
    ret += curr;
    if (curr < len) {
      // No more space to write.
      break;
    }
    if (typeof offset != "undefined") {
      offset += curr;
    }
  }
  return ret;
};

function _fd_pwrite(fd, iov, iovcnt, offset, pnum) {
  offset = bigintToI53Checked(offset);
  try {
    if (isNaN(offset)) return 61;
    var stream = SYSCALLS.getStreamFromFD(fd);
    var num = doWritev(stream, iov, iovcnt, offset);
    HEAPU32[((pnum) >> 2)] = num;
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return e.errno;
  }
}

_fd_pwrite.sig = "iippjp";

/** @param {number=} offset */ var doReadv = (stream, iov, iovcnt, offset) => {
  var ret = 0;
  for (var i = 0; i < iovcnt; i++) {
    var ptr = HEAPU32[((iov) >> 2)];
    var len = HEAPU32[(((iov) + (4)) >> 2)];
    iov += 8;
    var curr = FS.read(stream, HEAP8, ptr, len, offset);
    if (curr < 0) return -1;
    ret += curr;
    if (curr < len) break;
    // nothing more to read
    if (typeof offset != "undefined") {
      offset += curr;
    }
  }
  return ret;
};

function _fd_read(fd, iov, iovcnt, pnum) {
  try {
    var stream = SYSCALLS.getStreamFromFD(fd);
    var num = doReadv(stream, iov, iovcnt);
    HEAPU32[((pnum) >> 2)] = num;
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return e.errno;
  }
}

_fd_read.sig = "iippp";

function _fd_seek(fd, offset, whence, newOffset) {
  offset = bigintToI53Checked(offset);
  try {
    if (isNaN(offset)) return 61;
    var stream = SYSCALLS.getStreamFromFD(fd);
    FS.llseek(stream, offset, whence);
    HEAP64[((newOffset) >> 3)] = BigInt(stream.position);
    if (stream.getdents && offset === 0 && whence === 0) stream.getdents = null;
    // reset readdir state
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return e.errno;
  }
}

_fd_seek.sig = "iijip";

var _fd_sync = function(fd) {
  try {
    var stream = SYSCALLS.getStreamFromFD(fd);
    return Asyncify.handleSleep(wakeUp => {
      var mount = stream.node.mount;
      if (!mount.type.syncfs) {
        // We write directly to the file system, so there's nothing to do here.
        wakeUp(0);
        return;
      }
      mount.type.syncfs(mount, false, err => {
        wakeUp(err ? 29 : 0);
      });
    });
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return e.errno;
  }
};

_fd_sync.sig = "ii";

_fd_sync.isAsync = true;

function _fd_write(fd, iov, iovcnt, pnum) {
  try {
    var stream = SYSCALLS.getStreamFromFD(fd);
    var num = doWritev(stream, iov, iovcnt);
    HEAPU32[((pnum) >> 2)] = num;
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return e.errno;
  }
}

_fd_write.sig = "iippp";

var _getaddrinfo = (node, service, hint, out) => {
  var addr = 0;
  var port = 0;
  var flags = 0;
  var family = 0;
  var type = 0;
  var proto = 0;
  var ai;
  function allocaddrinfo(family, type, proto, canon, addr, port) {
    var sa, salen, ai;
    var errno;
    salen = family === 10 ? 28 : 16;
    addr = family === 10 ? inetNtop6(addr) : inetNtop4(addr);
    sa = _malloc(salen);
    errno = writeSockaddr(sa, family, addr, port);
    ai = _malloc(32);
    HEAP32[(((ai) + (4)) >> 2)] = family;
    HEAP32[(((ai) + (8)) >> 2)] = type;
    HEAP32[(((ai) + (12)) >> 2)] = proto;
    HEAPU32[(((ai) + (24)) >> 2)] = canon;
    HEAPU32[(((ai) + (20)) >> 2)] = sa;
    if (family === 10) {
      HEAP32[(((ai) + (16)) >> 2)] = 28;
    } else {
      HEAP32[(((ai) + (16)) >> 2)] = 16;
    }
    HEAP32[(((ai) + (28)) >> 2)] = 0;
    return ai;
  }
  if (hint) {
    flags = HEAP32[((hint) >> 2)];
    family = HEAP32[(((hint) + (4)) >> 2)];
    type = HEAP32[(((hint) + (8)) >> 2)];
    proto = HEAP32[(((hint) + (12)) >> 2)];
  }
  if (type && !proto) {
    proto = type === 2 ? 17 : 6;
  }
  if (!type && proto) {
    type = proto === 17 ? 2 : 1;
  }
  // If type or proto are set to zero in hints we should really be returning multiple addrinfo values, but for
  // now default to a TCP STREAM socket so we can at least return a sensible addrinfo given NULL hints.
  if (proto === 0) {
    proto = 6;
  }
  if (type === 0) {
    type = 1;
  }
  if (!node && !service) {
    return -2;
  }
  if (flags & ~(1 | 2 | 4 | 1024 | 8 | 16 | 32)) {
    return -1;
  }
  if (hint !== 0 && (HEAP32[((hint) >> 2)] & 2) && !node) {
    return -1;
  }
  if (flags & 32) {
    // TODO
    return -2;
  }
  if (type !== 0 && type !== 1 && type !== 2) {
    return -7;
  }
  if (family !== 0 && family !== 2 && family !== 10) {
    return -6;
  }
  if (service) {
    service = UTF8ToString(service);
    port = parseInt(service, 10);
    if (isNaN(port)) {
      if (flags & 1024) {
        return -2;
      }
      // TODO support resolving well-known service names from:
      // http://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.txt
      return -8;
    }
  }
  if (!node) {
    if (family === 0) {
      family = 2;
    }
    if ((flags & 1) === 0) {
      if (family === 2) {
        addr = _htonl(2130706433);
      } else {
        addr = [ 0, 0, 0, _htonl(1) ];
      }
    }
    ai = allocaddrinfo(family, type, proto, null, addr, port);
    HEAPU32[((out) >> 2)] = ai;
    return 0;
  }
  // try as a numeric address
  node = UTF8ToString(node);
  addr = inetPton4(node);
  if (addr !== null) {
    // incoming node is a valid ipv4 address
    if (family === 0 || family === 2) {
      family = 2;
    } else if (family === 10 && (flags & 8)) {
      addr = [ 0, 0, _htonl(65535), addr ];
      family = 10;
    } else {
      return -2;
    }
  } else {
    addr = inetPton6(node);
    if (addr !== null) {
      // incoming node is a valid ipv6 address
      if (family === 0 || family === 10) {
        family = 10;
      } else {
        return -2;
      }
    }
  }
  if (addr != null) {
    ai = allocaddrinfo(family, type, proto, node, addr, port);
    HEAPU32[((out) >> 2)] = ai;
    return 0;
  }
  if (flags & 4) {
    return -2;
  }
  // try as a hostname
  // resolve the hostname to a temporary fake address
  node = DNS.lookup_name(node);
  addr = inetPton4(node);
  if (family === 0) {
    family = 2;
  } else if (family === 10) {
    addr = [ 0, 0, _htonl(65535), addr ];
  }
  ai = allocaddrinfo(family, type, proto, null, addr, port);
  HEAPU32[((out) >> 2)] = ai;
  return 0;
};

_getaddrinfo.sig = "ipppp";

var _getcontext = () => abort("missing function: ${name}");

var _getdtablesize = () => abort("missing function: ${name}");

var _getnameinfo = (sa, salen, node, nodelen, serv, servlen, flags) => {
  var info = readSockaddr(sa, salen);
  if (info.errno) {
    return -6;
  }
  var port = info.port;
  var addr = info.addr;
  var overflowed = false;
  if (node && nodelen) {
    var lookup;
    if ((flags & 1) || !(lookup = DNS.lookup_addr(addr))) {
      if (flags & 8) {
        return -2;
      }
    } else {
      addr = lookup;
    }
    var numBytesWrittenExclNull = stringToUTF8(addr, node, nodelen);
    if (numBytesWrittenExclNull + 1 >= nodelen) {
      overflowed = true;
    }
  }
  if (serv && servlen) {
    port = "" + port;
    var numBytesWrittenExclNull = stringToUTF8(port, serv, servlen);
    if (numBytesWrittenExclNull + 1 >= servlen) {
      overflowed = true;
    }
  }
  if (overflowed) {
    // Note: even when we overflow, getnameinfo() is specced to write out the truncated results.
    return -12;
  }
  return 0;
};

_getnameinfo.sig = "ipipipii";

var Protocols = {
  list: [],
  map: {}
};

var stringToAscii = (str, buffer) => {
  for (var i = 0; i < str.length; ++i) {
    HEAP8[buffer++] = str.charCodeAt(i);
  }
  // Null-terminate the string
  HEAP8[buffer] = 0;
};

var _setprotoent = stayopen => {
  // void setprotoent(int stayopen);
  // Allocate and populate a protoent structure given a name, protocol number and array of aliases
  function allocprotoent(name, proto, aliases) {
    // write name into buffer
    var nameBuf = _malloc(name.length + 1);
    stringToAscii(name, nameBuf);
    // write aliases into buffer
    var j = 0;
    var length = aliases.length;
    var aliasListBuf = _malloc((length + 1) * 4);
    // Use length + 1 so we have space for the terminating NULL ptr.
    for (var i = 0; i < length; i++, j += 4) {
      var alias = aliases[i];
      var aliasBuf = _malloc(alias.length + 1);
      stringToAscii(alias, aliasBuf);
      HEAPU32[(((aliasListBuf) + (j)) >> 2)] = aliasBuf;
    }
    HEAPU32[(((aliasListBuf) + (j)) >> 2)] = 0;
    // Terminating NULL pointer.
    // generate protoent
    var pe = _malloc(12);
    HEAPU32[((pe) >> 2)] = nameBuf;
    HEAPU32[(((pe) + (4)) >> 2)] = aliasListBuf;
    HEAP32[(((pe) + (8)) >> 2)] = proto;
    return pe;
  }
  // Populate the protocol 'database'. The entries are limited to tcp and udp, though it is fairly trivial
  // to add extra entries from /etc/protocols if desired - though not sure if that'd actually be useful.
  var list = Protocols.list;
  var map = Protocols.map;
  if (list.length === 0) {
    var entry = allocprotoent("tcp", 6, [ "TCP" ]);
    list.push(entry);
    map["tcp"] = map["6"] = entry;
    entry = allocprotoent("udp", 17, [ "UDP" ]);
    list.push(entry);
    map["udp"] = map["17"] = entry;
  }
  _setprotoent.index = 0;
};

_setprotoent.sig = "vi";

var _getprotobyname = name => {
  // struct protoent *getprotobyname(const char *);
  name = UTF8ToString(name);
  _setprotoent(true);
  var result = Protocols.map[name];
  return result;
};

_getprotobyname.sig = "pp";

var _getprotobynumber = number => {
  // struct protoent *getprotobynumber(int proto);
  _setprotoent(true);
  var result = Protocols.map[number];
  return result;
};

_getprotobynumber.sig = "pi";

function _js_flock(fd, op) {
  if (typeof Module["userSpace"] === "undefined") {
    // In the absence of a real locking facility,
    // return success by default as Emscripten does.
    return 0;
  }
  return Module["userSpace"].flock(fd, op);
}

function _js_open_process(command, argsPtr, argsLength, descriptorsPtr, descriptorsLength, cwdPtr, cwdLength, envPtr, envLength) {
  if (!command) {
    ___errno_location(ERRNO_CODES.EINVAL);
    return -1;
  }
  const cmdstr = UTF8ToString(command);
  if (!cmdstr.length) {
    ___errno_location(ERRNO_CODES.EINVAL);
    return -1;
  }
  let argsArray = [];
  if (argsLength) {
    for (var i = 0; i < argsLength; i++) {
      const charPointer = argsPtr + i * 4;
      argsArray.push(UTF8ToString(HEAPU32[charPointer >> 2]));
    }
  }
  const cwdstr = cwdPtr ? UTF8ToString(cwdPtr) : FS.cwd();
  let envObject = null;
  if (envLength) {
    envObject = {};
    for (var i = 0; i < envLength; i++) {
      const envPointer = envPtr + i * 4;
      const envEntry = UTF8ToString(HEAPU32[envPointer >> 2]);
      const splitAt = envEntry.indexOf("=");
      if (splitAt === -1) {
        continue;
      }
      const key = envEntry.substring(0, splitAt);
      const value = envEntry.substring(splitAt + 1);
      envObject[key] = value;
    }
  }
  var std = {};
  // Extracts an array of available descriptors that should be dispatched to streams.
  // On the C side, the descriptors are expressed as `**int` so we must go read
  // each of the `descriptorsLength` `*int` pointers and convert the associated data into
  // a JavaScript object { descriptor : { child : fd, parent : fd } }.
  for (var i = 0; i < descriptorsLength; i++) {
    const descriptorPtr = HEAPU32[(descriptorsPtr + i * 4) >> 2];
    std[HEAPU32[descriptorPtr >> 2]] = {
      child: HEAPU32[(descriptorPtr + 4) >> 2],
      parent: HEAPU32[(descriptorPtr + 8) >> 2]
    };
    // swap parent and child descs until we rebuild PHP 7.4
    if (i === 0) {
      HEAPU32[(descriptorPtr + 8) >> 2] = std[HEAPU32[descriptorPtr >> 2]].parent;
      HEAPU32[(descriptorPtr + 4) >> 2] = std[HEAPU32[descriptorPtr >> 2]].child;
    }
  }
  return Asyncify.handleAsync(async () => {
    let cp;
    try {
      const options = {};
      if (cwdstr !== null) {
        options.cwd = cwdstr;
      }
      if (envObject !== null) {
        options.env = envObject;
      }
      cp = PHPWASM.spawnProcess(cmdstr, argsArray, options);
      if (cp instanceof Promise) {
        cp = await cp;
      }
    } catch (e) {
      if (e.code === "SPAWN_UNSUPPORTED") {
        ___errno_location(ERRNO_CODES.ENOSYS);
        return -1;
      }
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      ___errno_location(e.code);
      return -1;
    }
    const ProcInfo = {
      pid: cp.pid,
      exited: false
    };
    PHPWASM.processTable[ProcInfo.pid] = ProcInfo;
    const stdinParentFd = std[0]?.parent, stdinChildFd = std[0]?.child, stdoutChildFd = std[1]?.child, stdoutParentFd = std[1]?.parent, stderrChildFd = std[2]?.child, stderrParentFd = std[2]?.parent;
    const detachPipeDataListeners = [];
    cp.on("exit", function(code) {
      for (const detach of detachPipeDataListeners) {
        detach();
      }
      for (const fd of [ // The child process exited. Let's clean up its output streams:
      stdoutChildFd, stderrChildFd, stdinChildFd ]) {
        if (FS.streams[fd] && !FS.isClosed(FS.streams[fd])) {
          FS.close(FS.streams[fd]);
        }
      }
      ProcInfo.exitCode = code;
      ProcInfo.exited = true;
    });
    // Pass data from child process's stdout to PHP's end of the stdout pipe.
    if (stdoutChildFd) {
      const stdoutStream = SYSCALLS.getStreamFromFD(stdoutChildFd);
      let stdoutAt = 0;
      const onStdoutData = function(data) {
        try {
          stdoutStream.stream_ops.write(stdoutStream, data, 0, data.length, stdoutAt);
          stdoutAt += data.length;
        } catch {
          // PHP may close the child pipe before Node finishes
          // draining already-buffered stdout data. Late chunks are
          // no longer deliverable, so detach the listener and stop.
          cp.stdout.off("data", onStdoutData);
        }
      };
      cp.stdout.on("data", onStdoutData);
      detachPipeDataListeners.push(() => cp.stdout.off("data", onStdoutData));
    }
    // Pass data from child process's stderr to PHP's end of the stdout pipe.
    if (stderrChildFd) {
      const stderrStream = SYSCALLS.getStreamFromFD(stderrChildFd);
      let stderrAt = 0;
      const onStderrData = function(data) {
        try {
          stderrStream.stream_ops.write(stderrStream, data, 0, data.length, stderrAt);
          stderrAt += data.length;
        } catch {
          cp.stderr.off("data", onStderrData);
        }
      };
      cp.stderr.on("data", onStderrData);
      detachPipeDataListeners.push(() => cp.stderr.off("data", onStderrData));
    }
    /**
  			 * Wait until the child process has been spawned.
  			 * Unfortunately there is no Node.js API to check whether
  			 * the process has already been spawned. We can only listen
  			 * to the 'spawn' event and if it has already been spawned,
  			 * listen to the 'exit' event.
  			 */ try {
      await new Promise((resolve, reject) => {
        /**
  					 * There was no `await` between the `spawnProcess` call
  					 * and the `await` below so the process haven't had a chance
  					 * to run any of the exit-related callbacks yet.
  					 *
  					 * Good.
  					 *
  					 * Let's listen to all the lifecycle events and resolve
  					 * the promise when the process starts or immediately crashes.
  					 */ let resolved = false;
        cp.on("spawn", () => {
          if (resolved) return;
          resolved = true;
          resolve();
        });
        cp.on("error", e => {
          if (resolved) return;
          resolved = true;
          reject(e);
        });
        cp.on("exit", function(code) {
          if (resolved) return;
          resolved = true;
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Process exited with code ${code}`));
          }
        });
        /**
  					 * If the process haven't even started after 5 seconds, something
  					 * is wrong. Perhaps we're missing an event listener, or perhaps
  					 * the `spawnProcess` implementation failed to dispatch the relevant
  					 * event. Either way, let's crash to avoid blocking the proc_open()
  					 * call indefinitely.
  					 */ setTimeout(() => {
          if (resolved) return;
          resolved = true;
          reject(new Error("Process timed out"));
        }, 5e3);
      });
    } catch (e) {
      // Process already started. Even if it exited early, PHP still
      // needs to know about the pid and clean up the resources.
      console.error(e);
      return ProcInfo.pid;
    }
    // Now we want to pass data from the STDIN source supplied by PHP
    // to the child process.
    if (stdinChildFd) {
      // We're in a kernel function used instead of fork().
      // We are the ones responsible for pumping the data from the stdinChildFd
      // into the child process. There is no concurrent task operating on the
      // piped data or polling the file descriptors, etc. Nothing will ever
      // read from the stdinChildFd if we don't do it here.
      // Well, let's do it! We'll periodically read from the child end of the
      // data pipe and push what we get into the child process.
      let stdinStream;
      try {
        stdinStream = SYSCALLS.getStreamFromFD(stdinChildFd);
      } catch (e) {
        ___errno_location(ERRNO_CODES.EBADF);
        return ProcInfo.pid;
      }
      if (!stdinStream?.node) {
        return ProcInfo.pid;
      }
      // Pipe the entire stdinStream to cp.stdin
      const CHUNK_SIZE = 1024;
      const iov = _malloc(16);
      // Space for iovec structure
      const pnum = _malloc(4);
      // Space for number of bytes read
      const buffer = _malloc(CHUNK_SIZE);
      // Set up iovec structure pointing to our buffer
      HEAPU32[iov >> 2] = buffer;
      // iov_base
      HEAPU32[(iov + 4) >> 2] = CHUNK_SIZE;
      // iov_len
      function pump() {
        try {
          while (true) {
            if (cp.killed) {
              stopPumpingAndCloseStdin();
              return;
            }
            const result = js_fd_read(stdinChildFd, iov, 1, pnum, false);
            const bytesRead = HEAPU32[pnum >> 2];
            if (result === 0 && bytesRead > 0) {
              const wrote = HEAPU8.subarray(buffer, buffer + bytesRead);
              cp.stdin.write(wrote);
            } else if (result === 0 && bytesRead === 0) {
              // result === 0 and bytesRead === 0 means the file descriptor
              // is at EOF. Let's close the stdin stream and clean up.
              stopPumpingAndCloseStdin();
              break;
            } else if (result === ERRNO_CODES.EAGAIN) {
              // The file descriptor is not ready for reading.
              // Let's break out of the loop. setInterval will invoke
              // this function again soon.
              break;
            } else {
              throw new FS.ErrnoError(result);
            }
          }
        } catch (e) {
          if (typeof FS == "undefined" || !(e.name === "ErrnoError")) {
            throw e;
          }
          ___errno_location(e.errno);
          stopPumpingAndCloseStdin();
        }
      }
      function stopPumpingAndCloseStdin() {
        clearInterval(interval);
        if (!cp.stdin.closed) {
          cp.stdin.end();
        }
        _wasm_free(buffer);
        _wasm_free(iov);
        _wasm_free(pnum);
      }
      // pump() can never alter the result of this function.
      // Even when it fails, we still return the pid.
      // Why?
      // Because the process already started. We wouldn't backtrack
      // with fork(), we won't backtrack here. Let's give PHP the pid,
      // and let it think it's the parent process. It will clean up the
      // resources as needed.
      // stdin may be non-blocking – let's check for updates periodically.
      // If we exhaust it at any point, pump() will self-terminate.
      // Note handling any failures, closing the descriptor, etc. will not
      // happen synchronously when PHP calls fclose($pipes[0]) or proc_close().
      // It will all happen asynchronously on the next tick. It seems off,
      // but there doesn't seem to be a better way: cp.stdin.write() and
      // cp.stdin.end() are both async APIs and they both accept onCompleted
      // callbacks.
      const interval = setInterval(pump, 20);
      pump();
    } else {
      /**
  				 * Descriptor 0 was not provided, so the child process must observe EOF.
  				 * Closing stdin explicitly lets spawn handlers distinguish that case from
  				 * a valid pipe whose first bytes have not arrived yet.
  				 */ cp.stdin.end();
    }
    return ProcInfo.pid;
  });
}

function _js_popen_clear_pid_for_fd(fd) {
  for (const pid in PHPWASM.processTable) {
    if (PHPWASM.processTable[pid].fd === fd) {
      delete PHPWASM.processTable[pid].fd;
      return;
    }
  }
}

function _js_popen_get_pid_for_fd(fd) {
  for (const pid in PHPWASM.processTable) {
    if (PHPWASM.processTable[pid].fd === fd) {
      return PHPWASM.processTable[pid].pid;
    }
  }
  return -1;
}

function _js_popen_set_pid_for_fd(fd, pid) {
  if (PHPWASM.processTable[pid]) {
    PHPWASM.processTable[pid].fd = fd;
  }
}

function _js_process_status(pid, exitCodePtr) {
  if (!PHPWASM.processTable[pid]) {
    return -1;
  }
  if (PHPWASM.processTable[pid].exited) {
    HEAPU32[exitCodePtr >> 2] = PHPWASM.processTable[pid].exitCode;
    return 1;
  }
  return 0;
}

function _js_release_file_locks() {
  if (typeof Module["userSpace"] === "undefined") {
    return;
  }
  return Module["userSpace"].js_release_file_locks();
}

function _js_setsockopt(fd, level, optionName, optionValuePtr, optionLen) {
  const stream = FS.getStream(fd);
  if (!stream) {
    return -ERRNO_CODES.EBADF;
  }
  const sock = stream.node?.sock;
  if (!sock) {
    return -ERRNO_CODES.ENOTSOCK;
  }
  const {SOL_SOCKET, SO_RCVTIMEO, SO_SNDTIMEO} = PHPWASM.SOCKOPT;
  if (level === SOL_SOCKET && (optionName === SO_RCVTIMEO || optionName === SO_SNDTIMEO)) {
    const timeoutMs = PHPWASM.parseSocketTimeout(optionValuePtr, optionLen);
    if (timeoutMs === null) {
      return -ERRNO_CODES.EINVAL;
    }
    const timeouts = PHPWASM.socketTimeouts.get(sock) || {};
    if (optionName === SO_RCVTIMEO) {
      timeouts.receive = timeoutMs;
    } else {
      timeouts.send = timeoutMs;
    }
    PHPWASM.socketTimeouts.set(sock, timeouts);
    return 0;
  }
  if (!PHPWASM.isProxiedSocketOption(sock, level, optionName)) {
    return -ERRNO_CODES.ENOPROTOOPT;
  }
  if (!optionValuePtr || optionLen < 1) {
    return -ERRNO_CODES.EINVAL;
  }
  // An int flag. The proxy protocol carries one byte per value.
  const value = (optionLen >= 4 ? HEAP32[optionValuePtr >> 2] : HEAPU8[optionValuePtr]) !== 0 ? 1 : 0;
  let options = PHPWASM.proxiedSocketOptions.get(sock);
  if (!options) {
    options = new Map;
    PHPWASM.proxiedSocketOptions.set(sock, options);
  }
  options.set(`${level}:${optionName}`, value);
  for (const ws of PHPWASM.getAllWebSockets(sock)) {
    if (ws.readyState === ws.OPEN) {
      PHPWASM.sendSocketOption(ws, level, optionName, value);
    }
  }
  return 0;
}

function _js_waitpid(pid, exitCodePtr) {
  if (!PHPWASM.processTable[pid]) {
    return -1;
  }
  return Asyncify.handleSleep(wakeUp => {
    const poll = function() {
      if (PHPWASM.processTable[pid]?.exited) {
        HEAPU32[exitCodePtr >> 2] = PHPWASM.processTable[pid].exitCode;
        wakeUp(pid);
      } else {
        setTimeout(poll, 50);
      }
    };
    poll();
  });
}

var _makecontext = () => abort("missing function: ${name}");

function _random_get(buffer, size) {
  try {
    randomFill(HEAPU8.subarray(buffer, buffer + size));
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return e.errno;
  }
}

_random_get.sig = "ipp";

var arraySum = (array, index) => {
  var sum = 0;
  for (var i = 0; i <= index; sum += array[i++]) {}
  return sum;
};

var MONTH_DAYS_LEAP = [ 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31 ];

var MONTH_DAYS_REGULAR = [ 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31 ];

var addDays = (date, days) => {
  var newDate = new Date(date.getTime());
  while (days > 0) {
    var leap = isLeapYear(newDate.getFullYear());
    var currentMonth = newDate.getMonth();
    var daysInCurrentMonth = (leap ? MONTH_DAYS_LEAP : MONTH_DAYS_REGULAR)[currentMonth];
    if (days > daysInCurrentMonth - newDate.getDate()) {
      // we spill over to next month
      days -= (daysInCurrentMonth - newDate.getDate() + 1);
      newDate.setDate(1);
      if (currentMonth < 11) {
        newDate.setMonth(currentMonth + 1);
      } else {
        newDate.setMonth(0);
        newDate.setFullYear(newDate.getFullYear() + 1);
      }
    } else {
      // we stay in current month
      newDate.setDate(newDate.getDate() + days);
      return newDate;
    }
  }
  return newDate;
};

var _strptime = (buf, format, tm) => {
  // char *strptime(const char *restrict buf, const char *restrict format, struct tm *restrict tm);
  // http://pubs.opengroup.org/onlinepubs/009695399/functions/strptime.html
  var pattern = UTF8ToString(format);
  // escape special characters
  // TODO: not sure we really need to escape all of these in JS regexps
  var SPECIAL_CHARS = "\\!@#$^&*()+=-[]/{}|:<>?,.";
  for (var i = 0, ii = SPECIAL_CHARS.length; i < ii; ++i) {
    pattern = pattern.replace(new RegExp("\\" + SPECIAL_CHARS[i], "g"), "\\" + SPECIAL_CHARS[i]);
  }
  // reduce number of matchers
  var EQUIVALENT_MATCHERS = {
    "A": "%a",
    "B": "%b",
    "c": "%a %b %d %H:%M:%S %Y",
    "D": "%m\\/%d\\/%y",
    "e": "%d",
    "F": "%Y-%m-%d",
    "h": "%b",
    "R": "%H\\:%M",
    "r": "%I\\:%M\\:%S\\s%p",
    "T": "%H\\:%M\\:%S",
    "x": "%m\\/%d\\/(?:%y|%Y)",
    "X": "%H\\:%M\\:%S"
  };
  // TODO: take care of locale
  var DATE_PATTERNS = {
    /* weekday name */ "a": "(?:Sun(?:day)?)|(?:Mon(?:day)?)|(?:Tue(?:sday)?)|(?:Wed(?:nesday)?)|(?:Thu(?:rsday)?)|(?:Fri(?:day)?)|(?:Sat(?:urday)?)",
    /* month name */ "b": "(?:Jan(?:uary)?)|(?:Feb(?:ruary)?)|(?:Mar(?:ch)?)|(?:Apr(?:il)?)|May|(?:Jun(?:e)?)|(?:Jul(?:y)?)|(?:Aug(?:ust)?)|(?:Sep(?:tember)?)|(?:Oct(?:ober)?)|(?:Nov(?:ember)?)|(?:Dec(?:ember)?)",
    /* century */ "C": "\\d\\d",
    /* day of month */ "d": "0[1-9]|[1-9](?!\\d)|1\\d|2\\d|30|31",
    /* hour (24hr) */ "H": "\\d(?!\\d)|[0,1]\\d|20|21|22|23",
    /* hour (12hr) */ "I": "\\d(?!\\d)|0\\d|10|11|12",
    /* day of year */ "j": "00[1-9]|0?[1-9](?!\\d)|0?[1-9]\\d(?!\\d)|[1,2]\\d\\d|3[0-6]\\d",
    /* month */ "m": "0[1-9]|[1-9](?!\\d)|10|11|12",
    /* minutes */ "M": "0\\d|\\d(?!\\d)|[1-5]\\d",
    /* whitespace */ "n": " ",
    /* AM/PM */ "p": "AM|am|PM|pm|A\\.M\\.|a\\.m\\.|P\\.M\\.|p\\.m\\.",
    /* seconds */ "S": "0\\d|\\d(?!\\d)|[1-5]\\d|60",
    /* week number */ "U": "0\\d|\\d(?!\\d)|[1-4]\\d|50|51|52|53",
    /* week number */ "W": "0\\d|\\d(?!\\d)|[1-4]\\d|50|51|52|53",
    /* weekday number */ "w": "[0-6]",
    /* 2-digit year */ "y": "\\d\\d",
    /* 4-digit year */ "Y": "\\d\\d\\d\\d",
    /* whitespace */ "t": " ",
    /* time zone */ "z": "Z|(?:[\\+\\-]\\d\\d:?(?:\\d\\d)?)"
  };
  var MONTH_NUMBERS = {
    JAN: 0,
    FEB: 1,
    MAR: 2,
    APR: 3,
    MAY: 4,
    JUN: 5,
    JUL: 6,
    AUG: 7,
    SEP: 8,
    OCT: 9,
    NOV: 10,
    DEC: 11
  };
  var DAY_NUMBERS_SUN_FIRST = {
    SUN: 0,
    MON: 1,
    TUE: 2,
    WED: 3,
    THU: 4,
    FRI: 5,
    SAT: 6
  };
  var DAY_NUMBERS_MON_FIRST = {
    MON: 0,
    TUE: 1,
    WED: 2,
    THU: 3,
    FRI: 4,
    SAT: 5,
    SUN: 6
  };
  var capture = [];
  var pattern_out = pattern.replace(/%(.)/g, (m, c) => EQUIVALENT_MATCHERS[c] || m).replace(/%(.)/g, (_, c) => {
    let pat = DATE_PATTERNS[c];
    if (pat) {
      capture.push(c);
      return `(${pat})`;
    } else {
      return c;
    }
  }).replace(// any number of space or tab characters match zero or more spaces
  /\s+/g, "\\s*");
  var matches = new RegExp("^" + pattern_out, "i").exec(UTF8ToString(buf));
  function initDate() {
    function fixup(value, min, max) {
      return (typeof value != "number" || isNaN(value)) ? min : (value >= min ? (value <= max ? value : max) : min);
    }
    return {
      year: fixup(HEAP32[(((tm) + (20)) >> 2)] + 1900, 1970, 9999),
      month: fixup(HEAP32[(((tm) + (16)) >> 2)], 0, 11),
      day: fixup(HEAP32[(((tm) + (12)) >> 2)], 1, 31),
      hour: fixup(HEAP32[(((tm) + (8)) >> 2)], 0, 23),
      min: fixup(HEAP32[(((tm) + (4)) >> 2)], 0, 59),
      sec: fixup(HEAP32[((tm) >> 2)], 0, 59),
      gmtoff: 0
    };
  }
  if (matches) {
    var date = initDate();
    var value;
    var getMatch = symbol => {
      var pos = capture.indexOf(symbol);
      // check if symbol appears in regexp
      if (pos >= 0) {
        // return matched value or null (falsy!) for non-matches
        return matches[pos + 1];
      }
      return;
    };
    // seconds
    if ((value = getMatch("S"))) {
      date.sec = Number(value);
    }
    // minutes
    if ((value = getMatch("M"))) {
      date.min = Number(value);
    }
    // hours
    if ((value = getMatch("H"))) {
      // 24h clock
      date.hour = Number(value);
    } else if ((value = getMatch("I"))) {
      // AM/PM clock
      var hour = Number(value);
      if ((value = getMatch("p"))) {
        hour += value.toUpperCase()[0] === "P" ? 12 : 0;
      }
      date.hour = hour;
    }
    // year
    if ((value = getMatch("Y"))) {
      // parse from four-digit year
      date.year = Number(value);
    } else if ((value = getMatch("y"))) {
      // parse from two-digit year...
      var year = Number(value);
      if ((value = getMatch("C"))) {
        // ...and century
        year += Number(value) * 100;
      } else {
        // ...and rule-of-thumb
        year += year < 69 ? 2e3 : 1900;
      }
      date.year = year;
    }
    // month
    if ((value = getMatch("m"))) {
      // parse from month number
      date.month = Number(value) - 1;
    } else if ((value = getMatch("b"))) {
      // parse from month name
      date.month = MONTH_NUMBERS[value.substring(0, 3).toUpperCase()] || 0;
    }
    // day
    if ((value = getMatch("d"))) {
      // get day of month directly
      date.day = Number(value);
    } else if ((value = getMatch("j"))) {
      // get day of month from day of year ...
      var day = Number(value);
      var leapYear = isLeapYear(date.year);
      for (var month = 0; month < 12; ++month) {
        var daysUntilMonth = arraySum(leapYear ? MONTH_DAYS_LEAP : MONTH_DAYS_REGULAR, month - 1);
        if (day <= daysUntilMonth + (leapYear ? MONTH_DAYS_LEAP : MONTH_DAYS_REGULAR)[month]) {
          date.day = day - daysUntilMonth;
        }
      }
    } else if ((value = getMatch("a"))) {
      // get day of month from weekday ...
      var weekDay = value.substring(0, 3).toUpperCase();
      if ((value = getMatch("U"))) {
        // ... and week number (Sunday being first day of week)
        // Week number of the year (Sunday as the first day of the week) as a decimal number [00,53].
        // All days in a new year preceding the first Sunday are considered to be in week 0.
        var weekDayNumber = DAY_NUMBERS_SUN_FIRST[weekDay];
        var weekNumber = Number(value);
        // January 1st
        var janFirst = new Date(date.year, 0, 1);
        var endDate;
        if (janFirst.getDay() === 0) {
          // Jan 1st is a Sunday, and, hence in the 1st CW
          endDate = addDays(janFirst, weekDayNumber + 7 * (weekNumber - 1));
        } else {
          // Jan 1st is not a Sunday, and, hence still in the 0th CW
          endDate = addDays(janFirst, 7 - janFirst.getDay() + weekDayNumber + 7 * (weekNumber - 1));
        }
        date.day = endDate.getDate();
        date.month = endDate.getMonth();
      } else if ((value = getMatch("W"))) {
        // ... and week number (Monday being first day of week)
        // Week number of the year (Monday as the first day of the week) as a decimal number [00,53].
        // All days in a new year preceding the first Monday are considered to be in week 0.
        var weekDayNumber = DAY_NUMBERS_MON_FIRST[weekDay];
        var weekNumber = Number(value);
        // January 1st
        var janFirst = new Date(date.year, 0, 1);
        var endDate;
        if (janFirst.getDay() === 1) {
          // Jan 1st is a Monday, and, hence in the 1st CW
          endDate = addDays(janFirst, weekDayNumber + 7 * (weekNumber - 1));
        } else {
          // Jan 1st is not a Monday, and, hence still in the 0th CW
          endDate = addDays(janFirst, 7 - janFirst.getDay() + 1 + weekDayNumber + 7 * (weekNumber - 1));
        }
        date.day = endDate.getDate();
        date.month = endDate.getMonth();
      }
    }
    // time zone
    if ((value = getMatch("z"))) {
      // GMT offset as either 'Z' or +-HH:MM or +-HH or +-HHMM
      if (value.toLowerCase() === "z") {
        date.gmtoff = 0;
      } else {
        var match = value.match(/^((?:\-|\+)\d\d):?(\d\d)?/);
        date.gmtoff = match[1] * 3600;
        if (match[2]) {
          date.gmtoff += date.gmtoff > 0 ? match[2] * 60 : -match[2] * 60;
        }
      }
    }
    /*
        tm_sec  int seconds after the minute  0-61*
        tm_min  int minutes after the hour  0-59
        tm_hour int hours since midnight  0-23
        tm_mday int day of the month  1-31
        tm_mon  int months since January  0-11
        tm_year int years since 1900
        tm_wday int days since Sunday 0-6
        tm_yday int days since January 1  0-365
        tm_isdst  int Daylight Saving Time flag
        tm_gmtoff long offset from GMT (seconds)
        */ var fullDate = new Date(date.year, date.month, date.day, date.hour, date.min, date.sec, 0);
    HEAP32[((tm) >> 2)] = fullDate.getSeconds();
    HEAP32[(((tm) + (4)) >> 2)] = fullDate.getMinutes();
    HEAP32[(((tm) + (8)) >> 2)] = fullDate.getHours();
    HEAP32[(((tm) + (12)) >> 2)] = fullDate.getDate();
    HEAP32[(((tm) + (16)) >> 2)] = fullDate.getMonth();
    HEAP32[(((tm) + (20)) >> 2)] = fullDate.getFullYear() - 1900;
    HEAP32[(((tm) + (24)) >> 2)] = fullDate.getDay();
    HEAP32[(((tm) + (28)) >> 2)] = arraySum(isLeapYear(fullDate.getFullYear()) ? MONTH_DAYS_LEAP : MONTH_DAYS_REGULAR, fullDate.getMonth() - 1) + fullDate.getDate() - 1;
    HEAP32[(((tm) + (32)) >> 2)] = 0;
    HEAP32[(((tm) + (36)) >> 2)] = date.gmtoff;
    // we need to convert the matched sequence into an integer array to take care of UTF-8 characters > 0x7F
    // TODO: not sure that intArrayFromString handles all unicode characters correctly
    return buf + lengthBytesUTF8(matches[0]);
  }
  return 0;
};

_strptime.sig = "pppp";

var _swapcontext = () => abort("missing function: ${name}");

function _wasm_close(socketd) {
  return PHPWASM.shutdownSocket(socketd, 2);
}

function _wasm_shutdown(socketd, how) {
  return PHPWASM.shutdownSocket(socketd, how);
}

var Asyncify = {
  instrumentWasmImports(imports) {
    var importPattern = /^(js_open_process|js_fd_read|js_waitpid|js_process_status|js_create_input_device|wasm_shutdown|wasm_close|wasm_recv|wasm_recvfrom|__syscall_recvfrom|wasm_connect|__syscall_connect|__syscall_fcntl64|js_flock|js_release_file_locks|js_waitpid|invoke_.*|__asyncjs__.*)$/;
    for (let [x, original] of Object.entries(imports)) {
      if (typeof original == "function") {
        let isAsyncifyImport = original.isAsync || importPattern.test(x);
        // Wrap async imports with a suspending WebAssembly function.
        if (isAsyncifyImport) {
          imports[x] = original = new WebAssembly.Suspending(original);
        }
      }
    }
  },
  instrumentFunction(original) {
    var wrapper = (...args) => original(...args);
    wrapper.orig = original;
    return wrapper;
  },
  instrumentWasmExports(exports) {
    var exportPattern = /^(php_wasm_init|wasm_sleep|wasm_read|emscripten_sleep|wasm_sapi_handle_request|wasm_sapi_request_shutdown|wasm_poll_socket|wrap_select|__wrap_select|select|__wrap_poll|php_pollfd_for|fflush|wasm_popen|wasm_pclose|__wrap_popen|__wrap_pclose|wasm_read|wasm_php_exec|run_cli|wasm_recv|wasm_connect|__wasm_call_ctors|__errno_location|__funcs_on_exit|main|__main_argc_argv)$/;
    Asyncify.asyncExports = new Set;
    var ret = {};
    for (let [x, original] of Object.entries(exports)) {
      if (typeof original == "function") {
        // Wrap all exports with a promising WebAssembly function.
        let isAsyncifyExport = exportPattern.test(x);
        if (isAsyncifyExport) {
          Asyncify.asyncExports.add(original);
          original = Asyncify.makeAsyncFunction(original);
        }
        var wrapper = Asyncify.instrumentFunction(original);
        ret[x] = wrapper;
      } else {
        ret[x] = original;
      }
    }
    return ret;
  },
  asyncExports: null,
  isAsyncExport(func) {
    return Asyncify.asyncExports?.has(func);
  },
  handleAsync: async startAsync => {
    runtimeKeepalivePush();
    try {
      return await startAsync();
    } finally {
      runtimeKeepalivePop();
    }
  },
  handleSleep: startAsync => Asyncify.handleAsync(() => new Promise(startAsync)),
  makeAsyncFunction(original) {
    return WebAssembly.promising(original);
  }
};

var getCFunc = ident => {
  var func = Module["_" + ident];
  // closure exported function
  return func;
};

var writeArrayToMemory = (array, buffer) => {
  HEAP8.set(array, buffer);
};

/**
     * @param {string|null=} returnType
     * @param {Array=} argTypes
     * @param {Array=} args
     * @param {Object=} opts
     */ var ccall = (ident, returnType, argTypes, args, opts) => {
  // For fast lookup of conversion functions
  var toC = {
    "string": str => {
      var ret = 0;
      if (str !== null && str !== undefined && str !== 0) {
        // null string
        ret = stringToUTF8OnStack(str);
      }
      return ret;
    },
    "array": arr => {
      var ret = stackAlloc(arr.length);
      writeArrayToMemory(arr, ret);
      return ret;
    }
  };
  function convertReturnValue(ret) {
    if (returnType === "string") {
      return UTF8ToString(ret);
    }
    if (returnType === "boolean") return Boolean(ret);
    return ret;
  }
  var func = getCFunc(ident);
  var cArgs = [];
  var stack = 0;
  if (args) {
    for (var i = 0; i < args.length; i++) {
      var converter = toC[argTypes[i]];
      if (converter) {
        if (stack === 0) stack = stackSave();
        cArgs[i] = converter(args[i]);
      } else {
        cArgs[i] = args[i];
      }
    }
  }
  var ret = func(...cArgs);
  function onDone(ret) {
    if (stack !== 0) stackRestore(stack);
    return convertReturnValue(ret);
  }
  var asyncMode = opts?.async;
  if (asyncMode) return ret.then(onDone);
  ret = onDone(ret);
  return ret;
};

var FS_createPath = (...args) => FS.createPath(...args);

var FS_unlink = (...args) => FS.unlink(...args);

var FS_createLazyFile = (...args) => FS.createLazyFile(...args);

var FS_createDevice = (...args) => FS.createDevice(...args);

var readEmAsmArgsArray = [];

var readEmAsmArgs = (sigPtr, buf) => {
  readEmAsmArgsArray.length = 0;
  var ch;
  // Most arguments are i32s, so shift the buffer pointer so it is a plain
  // index into HEAP32.
  while (ch = HEAPU8[sigPtr++]) {
    // Floats are always passed as doubles, so all types except for 'i'
    // are 8 bytes and require alignment.
    var wide = (ch != 105);
    wide &= (ch != 112);
    buf += wide && (buf % 8) ? 4 : 0;
    readEmAsmArgsArray.push(// Special case for pointers under wasm64 or CAN_ADDRESS_2GB mode.
    ch == 112 ? HEAPU32[((buf) >> 2)] : ch == 106 ? HEAP64[((buf) >> 3)] : ch == 105 ? HEAP32[((buf) >> 2)] : HEAPF64[((buf) >> 3)]);
    buf += wide ? 8 : 4;
  }
  return readEmAsmArgsArray;
};

var runEmAsmFunction = (code, sigPtr, argbuf) => {
  var args = readEmAsmArgs(sigPtr, argbuf);
  return ASM_CONSTS[code](...args);
};

var _emscripten_asm_const_int = (code, sigPtr, argbuf) => runEmAsmFunction(code, sigPtr, argbuf);

_emscripten_asm_const_int.sig = "ippp";

registerWasmPlugin();

FS.createPreloadedFile = FS_createPreloadedFile;

FS.preloadFile = FS_preloadFile;

FS.staticInit();

if (ENVIRONMENT_IS_NODE) {
  NODEFS.staticInit();
}

PHPWASM.init();

// End JS library code
// include: postlibrary.js
// This file is included after the automatically-generated JS library code
// but before the wasm module is created.
{
  // Begin ATMODULES hooks
  if (Module["preloadPlugins"]) preloadPlugins = Module["preloadPlugins"];
  if (Module["noExitRuntime"]) noExitRuntime = Module["noExitRuntime"];
  if (Module["print"]) out = Module["print"];
  if (Module["printErr"]) err = Module["printErr"];
  if (Module["dynamicLibraries"]) dynamicLibraries = Module["dynamicLibraries"];
  if (Module["wasmBinary"]) wasmBinary = Module["wasmBinary"];
  // End ATMODULES hooks
  if (Module["arguments"]) arguments_ = Module["arguments"];
  if (Module["thisProgram"]) thisProgram = Module["thisProgram"];
if (Module["quit"]) quit_=Module["quit"];
  if (Module["preInit"]) {
    if (typeof Module["preInit"] == "function") Module["preInit"] = [ Module["preInit"] ];
    while (Module["preInit"].length > 0) {
      Module["preInit"].shift()();
    }
  }
}

// Begin runtime exports
Module["wasmExports"] = wasmExports;

Module["addRunDependency"] = addRunDependency;

Module["removeRunDependency"] = removeRunDependency;

Module["ccall"] = ccall;

Module["FS_preloadFile"] = FS_preloadFile;

Module["FS_unlink"] = FS_unlink;

Module["FS_createPath"] = FS_createPath;

Module["FS_createDevice"] = FS_createDevice;

Module["FS_createDataFile"] = FS_createDataFile;

Module["FS_createLazyFile"] = FS_createLazyFile;

Module["PROXYFS"] = PROXYFS;

// End runtime exports
// Begin JS library exports
Module["UTF8ToString"] = UTF8ToString;

Module["lengthBytesUTF8"] = lengthBytesUTF8;

Module["stringToUTF8"] = stringToUTF8;

Module["FS"] = FS;

Module["_exit"] = _exit;

Module["_emscripten_sleep"] = _emscripten_sleep;

Module["_emscripten_asm_const_int"] = _emscripten_asm_const_int;

// End JS library exports
// end include: postlibrary.js
var ASM_CONSTS = {};

function __asyncjs__js_popen_to_file(command, mode, exitCodePtr) {
  return Asyncify.handleAsync(async () => {
    const returnCallback = resolver => new Promise(resolver);
    if (!command) return 1;
    const cmdstr = UTF8ToString(command);
    if (!cmdstr.length) return 0;
    const modestr = UTF8ToString(mode);
    if (!modestr.length) return 0;
    if (modestr === "w") {
      console.error('popen($cmd, "w") is not implemented yet');
    }
    return returnCallback(async wakeUp => {
      let cp;
      try {
        cp = PHPWASM.spawnProcess(cmdstr, []);
        if (cp instanceof Promise) {
          cp = await cp;
        }
      } catch (e) {
        console.error(e);
        if (e.code === "SPAWN_UNSUPPORTED") {
          return 1;
        }
        throw e;
      }
      const outByteArrays = [];
      cp.stdout.on("data", function(data) {
        outByteArrays.push(data);
      });
      const outputPath = "/tmp/popen_output";
      cp.on("exit", function(exitCode) {
        const outBytes = new Uint8Array(outByteArrays.reduce((acc, curr) => acc + curr.length, 0));
        let offset = 0;
        for (const byteArray of outByteArrays) {
          outBytes.set(byteArray, offset);
          offset += byteArray.length;
        }
        FS.writeFile(outputPath, outBytes);
        HEAPU8[exitCodePtr] = exitCode;
        wakeUp(allocateUTF8OnStack(outputPath));
      });
    });
  });
}

__asyncjs__js_popen_to_file.sig = "iiii";

function __asyncjs__wasm_poll_socket(socketd, events, timeout) {
  return Asyncify.handleAsync(async () => {
    const returnCallback = resolver => new Promise(resolver);
    const POLLIN = 1;
    const POLLPRI = 2;
    const POLLOUT = 4;
    const POLLERR = 8;
    const POLLHUP = 16;
    const POLLNVAL = 32;
    return returnCallback(wakeUp => {
      const polls = [];
      const stream = FS.getStream(socketd);
      if (FS.isSocket(stream?.node.mode)) {
        const sock = getSocketFromFD(socketd);
        if (!sock) {
          wakeUp(0);
          return;
        }
        const lookingFor = new Set;
        if (events & POLLIN || events & POLLPRI) {
          if (sock.server) {
            for (const client of sock.pending) {
              if ((client.recv_queue || []).length > 0) {
                wakeUp(1);
                return;
              }
            }
          } else if ((sock.recv_queue || []).length > 0) {
            wakeUp(1);
            return;
          }
        }
        const webSockets = PHPWASM.getAllWebSockets(sock);
        if (!webSockets.length) {
          wakeUp(0);
          return;
        }
        if (webSockets.some(ws => ws.readyState === ws.CLOSING || ws.readyState === ws.CLOSED)) {
          if (sock.type !== 2 || sock.error || (sock.recv_queue || []).length > 0) {
            wakeUp(1);
          } else if (timeout !== -1) {
            setTimeout(() => wakeUp(0), timeout);
          }
          return;
        }
        for (const ws of webSockets) {
          if (events & POLLIN || events & POLLPRI) {
            polls.push(PHPWASM.awaitData(ws));
            lookingFor.add("POLLIN");
          }
          if (events & POLLOUT) {
            polls.push(PHPWASM.awaitConnection(ws));
            lookingFor.add("POLLOUT");
          }
          if (events & POLLHUP || events & POLLIN || events & POLLOUT || events & POLLERR) {
            polls.push(PHPWASM.awaitClose(ws));
            lookingFor.add("POLLHUP");
          }
          if (events & POLLERR || events & POLLNVAL) {
            polls.push(PHPWASM.awaitError(ws));
            lookingFor.add("POLLERR");
          }
        }
      } else if (stream?.stream_ops?.poll) {
        let interrupted = false;
        async function poll() {
          try {
            while (true) {
              var mask = POLLNVAL;
              mask = SYSCALLS.DEFAULT_POLLMASK;
              if (FS.isClosed(stream)) {
                return ERRNO_CODES.EBADF;
              }
              if (stream.stream_ops?.poll) {
                mask = stream.stream_ops.poll(stream, -1);
              }
              mask &= events | POLLERR | POLLHUP;
              if (mask) {
                return mask;
              }
              if (interrupted) {
                return ERRNO_CODES.ETIMEDOUT;
              }
              await new Promise(resolve => setTimeout(resolve, 10));
            }
          } catch (e) {
            if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
            return -e.errno;
          }
        }
        polls.push([ poll(), () => {
          interrupted = true;
        } ]);
      } else {
        setTimeout(function() {
          wakeUp(1);
        }, timeout);
        return;
      }
      if (polls.length === 0) {
        console.warn("Unsupported poll event " + events + ", defaulting to setTimeout().");
        setTimeout(function() {
          wakeUp(0);
        }, timeout);
        return;
      }
      const promises = polls.map(([promise]) => promise);
      const clearPolling = () => polls.forEach(([, clear]) => clear());
      let awaken = false;
      let timeoutId;
      Promise.race(promises).then(function(results) {
        if (!awaken) {
          awaken = true;
          wakeUp(1);
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          clearPolling();
        }
      });
      if (timeout !== -1) {
        timeoutId = setTimeout(function() {
          if (!awaken) {
            awaken = true;
            wakeUp(0);
            clearPolling();
          }
        }, timeout);
      }
    });
  });
}

__asyncjs__wasm_poll_socket.sig = "iiii";

function js_fd_read(fd, iov, iovcnt, pnum) {
  const returnCallback = resolver => new Promise(resolver);
  const pollAsync = arguments[4] === undefined ? true : !!arguments[4];
  if (Asyncify?.State?.Normal === undefined || Asyncify?.state === Asyncify?.State?.Normal) {
    var stream;
    try {
      stream = SYSCALLS.getStreamFromFD(fd);
      HEAPU32[pnum >> 2] = doReadv(stream, iov, iovcnt);
      return 0;
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) {
        throw e;
      }
      if (e.errno !== ERRNO_CODES.EWOULDBLOCK && e.errno !== ERRNO_CODES.EAGAIN) {
        return e.errno;
      }
      const nonBlocking = stream.flags & PHPWASM.O_NONBLOCK;
      if (nonBlocking) {
        return e.errno;
      }
    }
  }
  if (false === pollAsync) {
    return ERRNO_CODES.EWOULDBLOCK;
  }
  return returnCallback(async wakeUp => {
    var retries = 0;
    var interval = 50;
    var timeout = 5e3;
    var maxRetries = timeout / interval;
    while (true) {
      var returnCode;
      var stream;
      let num;
      try {
        stream = SYSCALLS.getStreamFromFD(fd);
        num = doReadv(stream, iov, iovcnt);
        returnCode = 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) {
          console.error(e);
          throw e;
        }
        returnCode = e.errno;
      }
      if (returnCode === 0) {
        HEAPU32[pnum >> 2] = num;
        return wakeUp(0);
      }
      if (++retries > maxRetries || !stream || FS.isClosed(stream) || returnCode !== ERRNO_CODES.EWOULDBLOCK || ("pipe" in stream.node && stream.node.pipe.refcnt < 2)) {
        HEAPU32[pnum >> 2] = num;
        return wakeUp(returnCode);
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  });
}

js_fd_read.sig = "iiiii";

function __asyncjs__js_module_onMessage(data, response_buffer) {
  return Asyncify.handleAsync(async () => {
    if (Module["onMessage"]) {
      const dataStr = UTF8ToString(data);
      return Module["onMessage"](dataStr).then(response => {
        const responseBytes = typeof response === "string" ? (new TextEncoder).encode(response) : response;
        const responseSize = responseBytes.byteLength;
        const responsePtr = _malloc(responseSize + 1);
        HEAPU8.set(responseBytes, responsePtr);
        HEAPU8[responsePtr + responseSize] = 0;
        HEAPU8[response_buffer] = responsePtr;
        HEAPU8[response_buffer + 1] = responsePtr >> 8;
        HEAPU8[response_buffer + 2] = responsePtr >> 16;
        HEAPU8[response_buffer + 3] = responsePtr >> 24;
        return responseSize;
      }).catch(e => {
        console.error(e);
        return -1;
      });
    }
  });
}

__asyncjs__js_module_onMessage.sig = "iii";

// Imports from the Wasm binary.
var _php_info_print_table_header, _zend_hash_move_forward_ex, _zend_hash_get_current_key_type_ex, _zend_hash_get_current_data_ex, _zend_is_true, _strtoll, _strlen, _memcmp, _free, _clock_gettime, _malloc, _snprintf, _strchr, _dlopen, _dlerror, _fiprintf, _dlsym, _dlclose, _strcmp, _getenv, _explicit_bzero, ___wasm_setjmp, ___wasm_setjmp_test, ___wasm_longjmp, _atoi, ___errno_location, _strtoull, _strrchr, _strcasecmp, _memchr, _isalnum, _fwrite, _strncmp, _isxdigit, _strtok_r, _unlink, _strncasecmp, _fileno, _isatty, _fread, _fclose, _fstat, _strtoul, _strstr, _strpbrk, ___trunctfdf2, _localeconv, _vasprintf, _strdup, _strlcpy, _write, _close, _tolower, _fseek, _strlcat, _stat, _gettimeofday, _time, _toupper, _iprintf, _puts, _putchar, _fopen, _getcwd, _lstat, _readlink, _access, _utime, _chmod, _lchown, _chown, _open, _creat, _rename, _mkdir, _rmdir, _opendir, _getpwnam, _strncpy, _siprintf, _realloc, _uname, _localtime_r, _strtol, _pow, _strtod, _strftime, _round, _sin, _cos, _atan2, _acos, _tan, _asin, _atan, _exp, _log, _log10, _hypot, _fmod, _nl_langinfo, _strcoll, _setlocale, _strerror, _read, _getppid, _gethostname, ___multi3, _strcspn, _sscanf, _statvfs, _getgrnam, _getuid, _getgid, _getgroups, _chdir, _strnlen, _issetugid, _getpwuid_r, _getpwnam_r, _calloc, _qsort, _readdir, _closedir, _isalpha, _isspace, _syslog, _openlog, _closelog, _sysconf, _wasm_php_exec, _dup, _socket, _gai_strerror, _freeaddrinfo, _fcntl, _connect, _strerror_r, _php_pollfd_for, _getsockopt, _htons, _bind, _inet_pton, _inet_ntop, _ntohs, _getpeername, _getsockname, _accept, _htonl, _send, _recv, _fdopen, _listen, _shutdown, _sendto, _recvfrom, _gethostbyname_r, _wcsncmp, _wcslen, _gmtime_r, _mktime, _umask, _fputs, _strsignal, _putenv, _unsetenv, _tzset, _ntohl, _wasm_sleep, _nanosleep, _getc, _fgetc, _symlink, _link, _socketpair, _getpwuid, _sigaction, _sigemptyset, _sigaddset, _sigfillset, _kill, _asctime_r, _atoll, _mkstemp, _ftruncate, _mmap, _madvise, _munmap, _pthread_mutexattr_init, _pthread_mutexattr_setpshared, _pthread_mutexattr_destroy, _pthread_mutex_init, _pthread_mutex_lock, _pthread_mutex_unlock, _pthread_mutex_destroy, _pthread_rwlock_init, _pthread_rwlock_unlock, _pthread_rwlock_destroy, _pthread_rwlock_wrlock, _pthread_rwlock_rdlock, _fflush, _strspn, _expf, _ftell, _ferror, _fchmod, _localtime, _asctime, _vfprintf, _fputc, _abort, _mprotect, _flock, _writev, ___small_fprintf, _putc, _fgets, _geteuid, _fork, _setgid, _initgroups, _setuid, _waitpid, _ioctl, _sendmsg, _recvmsg, _accept4, _posix_memalign, _strcpy, _lseek, _wasm_read, _feof, _setvbuf, _fsync, _rewinddir, _strcat, _setitimer, __exit, _strncat, ___ctype_get_mb_cur_max, _pipe, ___wrap_usleep, _setsockopt, _wasm_popen, _wasm_pclose, ___wrap_popen, ___wrap_pclose, ___wrap_select, ___wrap_poll, _wasm_set_sapi_name, _wasm_set_phpini_path, _wasm_add_cli_arg, _run_cli, _dup2, _perror, _wasm_add_SERVER_entry, _wasm_add_ENV_entry, _wasm_set_query_string, _wasm_set_path_translated, _wasm_set_skip_shebang, _wasm_set_request_uri, _wasm_set_request_method, _wasm_set_request_host, _wasm_set_content_type, _wasm_set_request_body, _wasm_set_content_length, _wasm_set_cookies, _wasm_set_request_port, _wasm_sapi_request_shutdown, _wasm_sapi_handle_request, _php_wasm_init, _wasm_free, _wasm_get_end_offset, ___wrap_getpid, _wasm_trace, _getentropy, _pthread_cond_signal, _pthread_cond_wait, _pthread_condattr_destroy, _pthread_condattr_init, _pthread_condattr_setclock, _pthread_mutex_trylock, _pthread_mutexattr_settype, _sched_yield, _sprintf, _fseeko, _ftello, _remove, _clearerr, _srandom, _random, _vsnprintf, _signal, _bsearch, _iconv_open, _iconv_close, _iconv, ___cxa_atexit, _sqlite3_auto_extension, _sqlite3_cancel_auto_extension, _pthread_join, _pthread_create, _roundf, _rand, _rewind, ___small_sprintf, _frexp, _modf, _atof, _gmtime, _pthread_cond_init, _pthread_cond_destroy, _logf, _powf, _lround, _pthread_attr_init, _pthread_attr_setstacksize, _pthread_attr_destroy, _pthread_once, _pthread_cond_broadcast, _fscanf, _ungetc, _fmax, _gethostbyname, _dladdr, ___ashlti3, _atexit, _memset, _mlock, _getegid, _setbuf, _tcgetattr, _tcsetattr, _sendmmsg, _recvmmsg, _mbrtowc, _wcrtomb, _pipe2, _pthread_cond_timedwait, _pthread_self, _realpath, _system, _execvp, ___floatsitf, ___addtf3, ___subtf3, ___multf3, ___divtf3, ___extenddftf2, ___floatunsitf, ___letf2, ___getf2, ___lttf2, ___gttf2, ___eqtf2, ___fixtfsi, ___floatditf, ___floatunditf, _fprintf, _strtold, ___netf2, _vsscanf, _newlocale, _uselocale, _strtod_l, _freelocale, _raise, _div, _ldexp, _clock, _times, _getrlimit, ___fixtfdi, _endpwent, _getgrgid, _endgrent, _execve, _posix_spawn, ___ctype_tolower_loc, ___ctype_toupper_loc, _aligned_alloc, _asprintf, _atan2f, ___funcs_on_exit, _atol, _bind_textdomain_codeset, _btowc, _cosf, _ctermid, _ctime, _ctime_r, _bindtextdomain, _dcngettext, _dcgettext, _dngettext, _dgettext, ___dl_seterr, __emscripten_find_dylib, _eaccess, _execv, _fchmodat, _fdopendir, _fegetenv, _fesetenv, _flockfile, _fmemopen, _fmin, _fmodf, _mbtowc, _towupper, _towlower, _fpathconf, _fputwc, _freopen, _fstatat, _funlockfile, _getc_unlocked, _fgetc_unlocked, _getlogin, _getopt, _getpagesize, _getpgid, _getpgrp, _getsid, _getwc, _hypotf, _wctomb, _inet_addr, _inet_aton, _inet_ntoa, _isdigit_l, _iswalpha_l, _iswblank_l, _iswcntrl_l, _iswdigit_l, _iswlower_l, _iswprint_l, _iswpunct_l, _wcschr, _iswspace_l, _iswupper_l, _iswxdigit_l, _isxdigit_l, _nl_langinfo_l, _pthread_getspecific, _pthread_setspecific, _pthread_atfork, _pthread_cancel, _pthread_equal, _pthread_condattr_setpshared, _pthread_setcanceltype, _pthread_rwlock_tryrdlock, _pthread_rwlock_trywrlock, _sem_init, _sem_post, _sem_wait, _sem_destroy, _pthread_key_delete, _pthread_key_create, _pthread_exit, _pthread_detach, _linkat, _lroundf, _mbrlen, _mbsnrtowcs, _mbsrtowcs, _mbstowcs, _mkdtemp, _mkfifo, _mknod, _timegm, _emscripten_builtin_memalign, _setmntent, _endmntent, _getmntent, _openat, _pathconf, _pause, _posix_fadvise, _posix_spawn_file_actions_addclose, _posix_spawn_file_actions_adddup2, _posix_spawn_file_actions_destroy, _posix_spawn_file_actions_init, _posix_spawnattr_destroy, _posix_spawnattr_init, _posix_spawnattr_setflags, _posix_spawnattr_setsigdefault, _printf, _pthread_attr_setdetachstate, _pthread_attr_setguardsize, _pthread_getconcurrency, _pthread_setconcurrency, _pthread_sigmask, _sigpending, _pwrite, _pwritev, _sigismember, _regcomp, _regfree, _regexec, _renameat, _setegid, _setenv, _seteuid, __emscripten_timeout, _setpgid, _setrlimit, _setsid, _sigwait, _sinf, _sleep, _vsprintf, _stpcpy, _strchrnul, _strcoll_l, _strftime_l, _strtof, _strtof_l, _strtold_l, _strtok, _strtoull_l, _strtoll_l, _strxfrm, _strxfrm_l, _swprintf, _tanf, _tanhf, _textdomain, _gettext, _ngettext, _tolower_l, _toupper_l, _towupper_l, _towlower_l, _truncate, _ttyname, _ungetwc, _unlinkat, _utimensat, _wait, _wcscmp, _wcscoll_l, _wcscpy, _wcsnrtombs, _wcspbrk, _wcsrtombs, _wcstof, _wcstod, _wcstold, _wcstoull, _wcstoll, _wcstoul, _wcstol, _wcstombs, _wcsxfrm_l, _wctob, _wmemchr, _wmemcmp, _wmemcpy, _emscripten_get_sbrk_ptr, ___trap, ___lshrti3, ___divti3, ___fixunstfdi, ___fixunstfsi, __emscripten_stack_restore, __emscripten_stack_alloc, _emscripten_stack_get_current, _gethostbyaddr, _gethostbyaddr_r, memory, ___stack_pointer, __indirect_function_table, ___c_longjmp, wasmTable, wasmMemory;

function assignWasmExports(wasmExports) {
  _php_info_print_table_header = Module["_php_info_print_table_header"] = wasmExports["php_info_print_table_header"];
  _zend_hash_move_forward_ex = Module["_zend_hash_move_forward_ex"] = wasmExports["zend_hash_move_forward_ex"];
  _zend_hash_get_current_key_type_ex = Module["_zend_hash_get_current_key_type_ex"] = wasmExports["zend_hash_get_current_key_type_ex"];
  _zend_hash_get_current_data_ex = Module["_zend_hash_get_current_data_ex"] = wasmExports["zend_hash_get_current_data_ex"];
  _zend_is_true = Module["_zend_is_true"] = wasmExports["zend_is_true"];
  _strtoll = Module["_strtoll"] = wasmExports["strtoll"];
  _strlen = Module["_strlen"] = wasmExports["strlen"];
  _memcmp = Module["_memcmp"] = wasmExports["memcmp"];
  _free = Module["_free"] = wasmExports["free"];
  _clock_gettime = Module["_clock_gettime"] = wasmExports["clock_gettime"];
  _malloc = PHPLoader['malloc'] = Module['_malloc'] = wasmExports["malloc"];
  _snprintf = Module["_snprintf"] = wasmExports["snprintf"];
  _strchr = Module["_strchr"] = wasmExports["strchr"];
  _dlopen = Module["_dlopen"] = wasmExports["dlopen"];
  _dlerror = Module["_dlerror"] = wasmExports["dlerror"];
  _fiprintf = Module["_fiprintf"] = wasmExports["fiprintf"];
  _dlsym = Module["_dlsym"] = wasmExports["dlsym"];
  _dlclose = Module["_dlclose"] = wasmExports["dlclose"];
  _strcmp = Module["_strcmp"] = wasmExports["strcmp"];
  _getenv = Module["_getenv"] = wasmExports["getenv"];
  _explicit_bzero = Module["_explicit_bzero"] = wasmExports["explicit_bzero"];
  ___wasm_setjmp = Module["___wasm_setjmp"] = wasmExports["__wasm_setjmp"];
  ___wasm_setjmp_test = Module["___wasm_setjmp_test"] = wasmExports["__wasm_setjmp_test"];
  ___wasm_longjmp = Module["___wasm_longjmp"] = wasmExports["__wasm_longjmp"];
  _atoi = Module["_atoi"] = wasmExports["atoi"];
  ___errno_location = Module["___errno_location"] = wasmExports["__errno_location"];
  _strtoull = Module["_strtoull"] = wasmExports["strtoull"];
  _strrchr = Module["_strrchr"] = wasmExports["strrchr"];
  _strcasecmp = Module["_strcasecmp"] = wasmExports["strcasecmp"];
  _memchr = Module["_memchr"] = wasmExports["memchr"];
  _isalnum = Module["_isalnum"] = wasmExports["isalnum"];
  _fwrite = Module["_fwrite"] = wasmExports["fwrite"];
  _strncmp = Module["_strncmp"] = wasmExports["strncmp"];
  _isxdigit = Module["_isxdigit"] = wasmExports["isxdigit"];
  _strtok_r = Module["_strtok_r"] = wasmExports["strtok_r"];
  _unlink = Module["_unlink"] = wasmExports["unlink"];
  _strncasecmp = Module["_strncasecmp"] = wasmExports["strncasecmp"];
  _fileno = Module["_fileno"] = wasmExports["fileno"];
  _isatty = Module["_isatty"] = wasmExports["isatty"];
  _fread = Module["_fread"] = wasmExports["fread"];
  _fclose = Module["_fclose"] = wasmExports["fclose"];
  _fstat = Module["_fstat"] = wasmExports["fstat"];
  _strtoul = Module["_strtoul"] = wasmExports["strtoul"];
  _strstr = Module["_strstr"] = wasmExports["strstr"];
  _strpbrk = Module["_strpbrk"] = wasmExports["strpbrk"];
  ___trunctfdf2 = Module["___trunctfdf2"] = wasmExports["__trunctfdf2"];
  _localeconv = Module["_localeconv"] = wasmExports["localeconv"];
  _vasprintf = Module["_vasprintf"] = wasmExports["vasprintf"];
  _strdup = Module["_strdup"] = wasmExports["strdup"];
  _strlcpy = Module["_strlcpy"] = wasmExports["strlcpy"];
  _write = Module["_write"] = wasmExports["write"];
  _close = Module["_close"] = wasmExports["close"];
  _tolower = Module["_tolower"] = wasmExports["tolower"];
  _fseek = Module["_fseek"] = wasmExports["fseek"];
  _strlcat = Module["_strlcat"] = wasmExports["strlcat"];
  _stat = Module["_stat"] = wasmExports["stat"];
  _gettimeofday = Module["_gettimeofday"] = wasmExports["gettimeofday"];
  _time = Module["_time"] = wasmExports["time"];
  _toupper = Module["_toupper"] = wasmExports["toupper"];
  _iprintf = Module["_iprintf"] = wasmExports["iprintf"];
  _puts = Module["_puts"] = wasmExports["puts"];
  _putchar = Module["_putchar"] = wasmExports["putchar"];
  _fopen = Module["_fopen"] = wasmExports["fopen"];
  _getcwd = Module["_getcwd"] = wasmExports["getcwd"];
  _lstat = Module["_lstat"] = wasmExports["lstat"];
  _readlink = Module["_readlink"] = wasmExports["readlink"];
  _access = Module["_access"] = wasmExports["access"];
  _utime = Module["_utime"] = wasmExports["utime"];
  _chmod = Module["_chmod"] = wasmExports["chmod"];
  _lchown = Module["_lchown"] = wasmExports["lchown"];
  _chown = Module["_chown"] = wasmExports["chown"];
  _open = Module["_open"] = wasmExports["open"];
  _creat = Module["_creat"] = wasmExports["creat"];
  _rename = Module["_rename"] = wasmExports["rename"];
  _mkdir = Module["_mkdir"] = wasmExports["mkdir"];
  _rmdir = Module["_rmdir"] = wasmExports["rmdir"];
  _opendir = Module["_opendir"] = wasmExports["opendir"];
  _getpwnam = Module["_getpwnam"] = wasmExports["getpwnam"];
  _strncpy = Module["_strncpy"] = wasmExports["strncpy"];
  _siprintf = Module["_siprintf"] = wasmExports["siprintf"];
  _realloc = Module["_realloc"] = wasmExports["realloc"];
  _uname = Module["_uname"] = wasmExports["uname"];
  _localtime_r = Module["_localtime_r"] = wasmExports["localtime_r"];
  _strtol = Module["_strtol"] = wasmExports["strtol"];
  _pow = Module["_pow"] = wasmExports["pow"];
  _strtod = Module["_strtod"] = wasmExports["strtod"];
  _strftime = Module["_strftime"] = wasmExports["strftime"];
  _round = Module["_round"] = wasmExports["round"];
  _sin = Module["_sin"] = wasmExports["sin"];
  _cos = Module["_cos"] = wasmExports["cos"];
  _atan2 = Module["_atan2"] = wasmExports["atan2"];
  _acos = Module["_acos"] = wasmExports["acos"];
  _tan = Module["_tan"] = wasmExports["tan"];
  _asin = Module["_asin"] = wasmExports["asin"];
  _atan = Module["_atan"] = wasmExports["atan"];
  _exp = Module["_exp"] = wasmExports["exp"];
  _log = Module["_log"] = wasmExports["log"];
  _log10 = Module["_log10"] = wasmExports["log10"];
  _hypot = Module["_hypot"] = wasmExports["hypot"];
  _fmod = Module["_fmod"] = wasmExports["fmod"];
  _nl_langinfo = Module["_nl_langinfo"] = wasmExports["nl_langinfo"];
  _strcoll = Module["_strcoll"] = wasmExports["strcoll"];
  _setlocale = Module["_setlocale"] = wasmExports["setlocale"];
  _strerror = Module["_strerror"] = wasmExports["strerror"];
  _read = Module["_read"] = wasmExports["read"];
  _getppid = Module["_getppid"] = wasmExports["getppid"];
  _gethostname = Module["_gethostname"] = wasmExports["gethostname"];
  ___multi3 = Module["___multi3"] = wasmExports["__multi3"];
  _strcspn = Module["_strcspn"] = wasmExports["strcspn"];
  _sscanf = Module["_sscanf"] = wasmExports["sscanf"];
  _statvfs = Module["_statvfs"] = wasmExports["statvfs"];
  _getgrnam = Module["_getgrnam"] = wasmExports["getgrnam"];
  _getuid = Module["_getuid"] = wasmExports["getuid"];
  _getgid = Module["_getgid"] = wasmExports["getgid"];
  _getgroups = Module["_getgroups"] = wasmExports["getgroups"];
  _chdir = Module["_chdir"] = wasmExports["chdir"];
  _strnlen = Module["_strnlen"] = wasmExports["strnlen"];
  _issetugid = Module["_issetugid"] = wasmExports["issetugid"];
  _getpwuid_r = Module["_getpwuid_r"] = wasmExports["getpwuid_r"];
  _getpwnam_r = Module["_getpwnam_r"] = wasmExports["getpwnam_r"];
  _calloc = wasmExports["calloc"];
  _qsort = Module["_qsort"] = wasmExports["qsort"];
  _readdir = Module["_readdir"] = wasmExports["readdir"];
  _closedir = Module["_closedir"] = wasmExports["closedir"];
  _isalpha = Module["_isalpha"] = wasmExports["isalpha"];
  _isspace = Module["_isspace"] = wasmExports["isspace"];
  _syslog = Module["_syslog"] = wasmExports["syslog"];
  _openlog = Module["_openlog"] = wasmExports["openlog"];
  _closelog = Module["_closelog"] = wasmExports["closelog"];
  _sysconf = Module["_sysconf"] = wasmExports["sysconf"];
  _wasm_php_exec = Module["_wasm_php_exec"] = wasmExports["wasm_php_exec"];
  _dup = Module["_dup"] = wasmExports["dup"];
  _socket = Module["_socket"] = wasmExports["socket"];
  _gai_strerror = Module["_gai_strerror"] = wasmExports["gai_strerror"];
  _freeaddrinfo = Module["_freeaddrinfo"] = wasmExports["freeaddrinfo"];
  _fcntl = Module["_fcntl"] = wasmExports["fcntl"];
  _connect = Module["_connect"] = wasmExports["connect"];
  _strerror_r = Module["_strerror_r"] = wasmExports["strerror_r"];
  _php_pollfd_for = Module["_php_pollfd_for"] = wasmExports["php_pollfd_for"];
  _getsockopt = Module["_getsockopt"] = wasmExports["getsockopt"];
  _htons = wasmExports["htons"];
  _bind = Module["_bind"] = wasmExports["bind"];
  _inet_pton = Module["_inet_pton"] = wasmExports["inet_pton"];
  _inet_ntop = Module["_inet_ntop"] = wasmExports["inet_ntop"];
  _ntohs = wasmExports["ntohs"];
  _getpeername = Module["_getpeername"] = wasmExports["getpeername"];
  _getsockname = Module["_getsockname"] = wasmExports["getsockname"];
  _accept = Module["_accept"] = wasmExports["accept"];
  _htonl = wasmExports["htonl"];
  _send = Module["_send"] = wasmExports["send"];
  _recv = Module["_recv"] = wasmExports["recv"];
  _fdopen = Module["_fdopen"] = wasmExports["fdopen"];
  _listen = Module["_listen"] = wasmExports["listen"];
  _shutdown = Module["_shutdown"] = wasmExports["shutdown"];
  _sendto = Module["_sendto"] = wasmExports["sendto"];
  _recvfrom = Module["_recvfrom"] = wasmExports["recvfrom"];
  _gethostbyname_r = Module["_gethostbyname_r"] = wasmExports["gethostbyname_r"];
  _wcsncmp = Module["_wcsncmp"] = wasmExports["wcsncmp"];
  _wcslen = Module["_wcslen"] = wasmExports["wcslen"];
  _gmtime_r = Module["_gmtime_r"] = wasmExports["gmtime_r"];
  _mktime = Module["_mktime"] = wasmExports["mktime"];
  _umask = Module["_umask"] = wasmExports["umask"];
  _fputs = Module["_fputs"] = wasmExports["fputs"];
  _strsignal = Module["_strsignal"] = wasmExports["strsignal"];
  _putenv = Module["_putenv"] = wasmExports["putenv"];
  _unsetenv = Module["_unsetenv"] = wasmExports["unsetenv"];
  _tzset = Module["_tzset"] = wasmExports["tzset"];
  _ntohl = Module["_ntohl"] = wasmExports["ntohl"];
  _wasm_sleep = Module["_wasm_sleep"] = wasmExports["wasm_sleep"];
  _nanosleep = Module["_nanosleep"] = wasmExports["nanosleep"];
  _getc = Module["_getc"] = wasmExports["getc"];
  _fgetc = Module["_fgetc"] = wasmExports["fgetc"];
  _symlink = Module["_symlink"] = wasmExports["symlink"];
  _link = Module["_link"] = wasmExports["link"];
  _socketpair = Module["_socketpair"] = wasmExports["socketpair"];
  _getpwuid = Module["_getpwuid"] = wasmExports["getpwuid"];
  _sigaction = Module["_sigaction"] = wasmExports["sigaction"];
  _sigemptyset = Module["_sigemptyset"] = wasmExports["sigemptyset"];
  _sigaddset = Module["_sigaddset"] = wasmExports["sigaddset"];
  _sigfillset = Module["_sigfillset"] = wasmExports["sigfillset"];
  _kill = Module["_kill"] = wasmExports["kill"];
  _asctime_r = Module["_asctime_r"] = wasmExports["asctime_r"];
  _atoll = Module["_atoll"] = wasmExports["atoll"];
  _mkstemp = Module["_mkstemp"] = wasmExports["mkstemp"];
  _ftruncate = Module["_ftruncate"] = wasmExports["ftruncate"];
  _mmap = Module["_mmap"] = wasmExports["mmap"];
  _madvise = Module["_madvise"] = wasmExports["madvise"];
  _munmap = Module["_munmap"] = wasmExports["munmap"];
  _pthread_mutexattr_init = Module["_pthread_mutexattr_init"] = wasmExports["pthread_mutexattr_init"];
  _pthread_mutexattr_setpshared = Module["_pthread_mutexattr_setpshared"] = wasmExports["pthread_mutexattr_setpshared"];
  _pthread_mutexattr_destroy = Module["_pthread_mutexattr_destroy"] = wasmExports["pthread_mutexattr_destroy"];
  _pthread_mutex_init = Module["_pthread_mutex_init"] = wasmExports["pthread_mutex_init"];
  _pthread_mutex_lock = Module["_pthread_mutex_lock"] = wasmExports["pthread_mutex_lock"];
  _pthread_mutex_unlock = Module["_pthread_mutex_unlock"] = wasmExports["pthread_mutex_unlock"];
  _pthread_mutex_destroy = Module["_pthread_mutex_destroy"] = wasmExports["pthread_mutex_destroy"];
  _pthread_rwlock_init = Module["_pthread_rwlock_init"] = wasmExports["pthread_rwlock_init"];
  _pthread_rwlock_unlock = Module["_pthread_rwlock_unlock"] = wasmExports["pthread_rwlock_unlock"];
  _pthread_rwlock_destroy = Module["_pthread_rwlock_destroy"] = wasmExports["pthread_rwlock_destroy"];
  _pthread_rwlock_wrlock = Module["_pthread_rwlock_wrlock"] = wasmExports["pthread_rwlock_wrlock"];
  _pthread_rwlock_rdlock = Module["_pthread_rwlock_rdlock"] = wasmExports["pthread_rwlock_rdlock"];
  _fflush = wasmExports["fflush"];
  _strspn = Module["_strspn"] = wasmExports["strspn"];
  _expf = Module["_expf"] = wasmExports["expf"];
  _ftell = Module["_ftell"] = wasmExports["ftell"];
  _ferror = Module["_ferror"] = wasmExports["ferror"];
  _fchmod = Module["_fchmod"] = wasmExports["fchmod"];
  _localtime = Module["_localtime"] = wasmExports["localtime"];
  _asctime = Module["_asctime"] = wasmExports["asctime"];
  _vfprintf = Module["_vfprintf"] = wasmExports["vfprintf"];
  _fputc = Module["_fputc"] = wasmExports["fputc"];
  _abort = Module["_abort"] = wasmExports["abort"];
  _mprotect = Module["_mprotect"] = wasmExports["mprotect"];
  _flock = Module["_flock"] = wasmExports["flock"];
  _writev = Module["_writev"] = wasmExports["writev"];
  ___small_fprintf = Module["___small_fprintf"] = wasmExports["__small_fprintf"];
  _putc = Module["_putc"] = wasmExports["putc"];
  _fgets = Module["_fgets"] = wasmExports["fgets"];
  _geteuid = Module["_geteuid"] = wasmExports["geteuid"];
  _fork = Module["_fork"] = wasmExports["fork"];
  _setgid = Module["_setgid"] = wasmExports["setgid"];
  _initgroups = Module["_initgroups"] = wasmExports["initgroups"];
  _setuid = Module["_setuid"] = wasmExports["setuid"];
  _waitpid = Module["_waitpid"] = wasmExports["waitpid"];
  _ioctl = Module["_ioctl"] = wasmExports["ioctl"];
  _sendmsg = Module["_sendmsg"] = wasmExports["sendmsg"];
  _recvmsg = Module["_recvmsg"] = wasmExports["recvmsg"];
  _accept4 = Module["_accept4"] = wasmExports["accept4"];
  _posix_memalign = Module["_posix_memalign"] = wasmExports["posix_memalign"];
  _strcpy = Module["_strcpy"] = wasmExports["strcpy"];
  _lseek = Module["_lseek"] = wasmExports["lseek"];
  _wasm_read = Module["_wasm_read"] = wasmExports["wasm_read"];
  _feof = Module["_feof"] = wasmExports["feof"];
  _setvbuf = Module["_setvbuf"] = wasmExports["setvbuf"];
  _fsync = Module["_fsync"] = wasmExports["fsync"];
  _rewinddir = Module["_rewinddir"] = wasmExports["rewinddir"];
  _strcat = Module["_strcat"] = wasmExports["strcat"];
  _setitimer = Module["_setitimer"] = wasmExports["setitimer"];
  __exit = Module["__exit"] = wasmExports["_exit"];
  _strncat = Module["_strncat"] = wasmExports["strncat"];
  ___ctype_get_mb_cur_max = Module["___ctype_get_mb_cur_max"] = wasmExports["__ctype_get_mb_cur_max"];
  _pipe = Module["_pipe"] = wasmExports["pipe"];
  ___wrap_usleep = Module["___wrap_usleep"] = wasmExports["__wrap_usleep"];
  if (typeof ___wrap_usleep === "function") { wasmImports["usleep"] = ___wrap_usleep; }
  _setsockopt = Module["_setsockopt"] = wasmExports["setsockopt"];
  _wasm_popen = Module["_wasm_popen"] = wasmExports["wasm_popen"];
  _wasm_pclose = Module["_wasm_pclose"] = wasmExports["wasm_pclose"];
  ___wrap_popen = Module["___wrap_popen"] = wasmExports["__wrap_popen"];
  if (typeof ___wrap_popen === "function") { wasmImports["popen"] = ___wrap_popen; }
  ___wrap_pclose = Module["___wrap_pclose"] = wasmExports["__wrap_pclose"];
  if (typeof ___wrap_pclose === "function") { wasmImports["pclose"] = ___wrap_pclose; }
  ___wrap_select = Module["___wrap_select"] = wasmExports["__wrap_select"];
  if (typeof ___wrap_select === "function") { wasmImports["select"] = ___wrap_select; }
  ___wrap_poll = Module["___wrap_poll"] = wasmExports["__wrap_poll"];
  if (typeof ___wrap_poll === "function") { wasmImports["poll"] = ___wrap_poll; }
  _wasm_set_sapi_name = Module["_wasm_set_sapi_name"] = wasmExports["wasm_set_sapi_name"];
  _wasm_set_phpini_path = Module["_wasm_set_phpini_path"] = wasmExports["wasm_set_phpini_path"];
  _wasm_add_cli_arg = Module["_wasm_add_cli_arg"] = wasmExports["wasm_add_cli_arg"];
  _run_cli = Module["_run_cli"] = wasmExports["run_cli"];
  _dup2 = Module["_dup2"] = wasmExports["dup2"];
  _perror = Module["_perror"] = wasmExports["perror"];
  _wasm_add_SERVER_entry = Module["_wasm_add_SERVER_entry"] = wasmExports["wasm_add_SERVER_entry"];
  _wasm_add_ENV_entry = Module["_wasm_add_ENV_entry"] = wasmExports["wasm_add_ENV_entry"];
  _wasm_set_query_string = Module["_wasm_set_query_string"] = wasmExports["wasm_set_query_string"];
  _wasm_set_path_translated = Module["_wasm_set_path_translated"] = wasmExports["wasm_set_path_translated"];
  _wasm_set_skip_shebang = Module["_wasm_set_skip_shebang"] = wasmExports["wasm_set_skip_shebang"];
  _wasm_set_request_uri = Module["_wasm_set_request_uri"] = wasmExports["wasm_set_request_uri"];
  _wasm_set_request_method = Module["_wasm_set_request_method"] = wasmExports["wasm_set_request_method"];
  _wasm_set_request_host = Module["_wasm_set_request_host"] = wasmExports["wasm_set_request_host"];
  _wasm_set_content_type = Module["_wasm_set_content_type"] = wasmExports["wasm_set_content_type"];
  _wasm_set_request_body = Module["_wasm_set_request_body"] = wasmExports["wasm_set_request_body"];
  _wasm_set_content_length = Module["_wasm_set_content_length"] = wasmExports["wasm_set_content_length"];
  _wasm_set_cookies = Module["_wasm_set_cookies"] = wasmExports["wasm_set_cookies"];
  _wasm_set_request_port = Module["_wasm_set_request_port"] = wasmExports["wasm_set_request_port"];
  _wasm_sapi_request_shutdown = Module["_wasm_sapi_request_shutdown"] = wasmExports["wasm_sapi_request_shutdown"];
  _wasm_sapi_handle_request = Module["_wasm_sapi_handle_request"] = wasmExports["wasm_sapi_handle_request"];
  _php_wasm_init = Module["_php_wasm_init"] = wasmExports["php_wasm_init"];
  _wasm_free = PHPLoader['free'] = Module['_wasm_free'] = wasmExports["wasm_free"];
  _wasm_get_end_offset = Module["_wasm_get_end_offset"] = wasmExports["wasm_get_end_offset"];
  ___wrap_getpid = Module["___wrap_getpid"] = wasmExports["__wrap_getpid"];
  if (typeof ___wrap_getpid === "function") { wasmImports["getpid"] = ___wrap_getpid; }
  _wasm_trace = Module["_wasm_trace"] = wasmExports["wasm_trace"];
  _getentropy = Module["_getentropy"] = wasmExports["getentropy"];
  _pthread_cond_signal = Module["_pthread_cond_signal"] = wasmExports["pthread_cond_signal"];
  _pthread_cond_wait = Module["_pthread_cond_wait"] = wasmExports["pthread_cond_wait"];
  _pthread_condattr_destroy = Module["_pthread_condattr_destroy"] = wasmExports["pthread_condattr_destroy"];
  _pthread_condattr_init = Module["_pthread_condattr_init"] = wasmExports["pthread_condattr_init"];
  _pthread_condattr_setclock = Module["_pthread_condattr_setclock"] = wasmExports["pthread_condattr_setclock"];
  _pthread_mutex_trylock = Module["_pthread_mutex_trylock"] = wasmExports["pthread_mutex_trylock"];
  _pthread_mutexattr_settype = Module["_pthread_mutexattr_settype"] = wasmExports["pthread_mutexattr_settype"];
  _sched_yield = Module["_sched_yield"] = wasmExports["sched_yield"];
  _sprintf = Module["_sprintf"] = wasmExports["sprintf"];
  _fseeko = Module["_fseeko"] = wasmExports["fseeko"];
  _ftello = Module["_ftello"] = wasmExports["ftello"];
  _remove = Module["_remove"] = wasmExports["remove"];
  _clearerr = Module["_clearerr"] = wasmExports["clearerr"];
  _srandom = Module["_srandom"] = wasmExports["srandom"];
  _random = Module["_random"] = wasmExports["random"];
  _vsnprintf = Module["_vsnprintf"] = wasmExports["vsnprintf"];
  _signal = Module["_signal"] = wasmExports["signal"];
  _bsearch = Module["_bsearch"] = wasmExports["bsearch"];
  _iconv_open = Module["_iconv_open"] = wasmExports["iconv_open"];
  _iconv_close = Module["_iconv_close"] = wasmExports["iconv_close"];
  _iconv = Module["_iconv"] = wasmExports["iconv"];
  ___cxa_atexit = Module["___cxa_atexit"] = wasmExports["__cxa_atexit"];
  _sqlite3_auto_extension = Module["_sqlite3_auto_extension"] = wasmExports["sqlite3_auto_extension"];
  _sqlite3_cancel_auto_extension = Module["_sqlite3_cancel_auto_extension"] = wasmExports["sqlite3_cancel_auto_extension"];
  _pthread_join = Module["_pthread_join"] = wasmExports["pthread_join"];
  _pthread_create = Module["_pthread_create"] = wasmExports["pthread_create"];
  _roundf = Module["_roundf"] = wasmExports["roundf"];
  _rand = Module["_rand"] = wasmExports["rand"];
  _rewind = Module["_rewind"] = wasmExports["rewind"];
  ___small_sprintf = Module["___small_sprintf"] = wasmExports["__small_sprintf"];
  _frexp = Module["_frexp"] = wasmExports["frexp"];
  _modf = Module["_modf"] = wasmExports["modf"];
  _atof = Module["_atof"] = wasmExports["atof"];
  _gmtime = Module["_gmtime"] = wasmExports["gmtime"];
  _pthread_cond_init = Module["_pthread_cond_init"] = wasmExports["pthread_cond_init"];
  _pthread_cond_destroy = Module["_pthread_cond_destroy"] = wasmExports["pthread_cond_destroy"];
  _logf = Module["_logf"] = wasmExports["logf"];
  _powf = Module["_powf"] = wasmExports["powf"];
  _lround = Module["_lround"] = wasmExports["lround"];
  _pthread_attr_init = Module["_pthread_attr_init"] = wasmExports["pthread_attr_init"];
  _pthread_attr_setstacksize = Module["_pthread_attr_setstacksize"] = wasmExports["pthread_attr_setstacksize"];
  _pthread_attr_destroy = Module["_pthread_attr_destroy"] = wasmExports["pthread_attr_destroy"];
  _pthread_once = Module["_pthread_once"] = wasmExports["pthread_once"];
  _pthread_cond_broadcast = Module["_pthread_cond_broadcast"] = wasmExports["pthread_cond_broadcast"];
  _fscanf = Module["_fscanf"] = wasmExports["fscanf"];
  _ungetc = Module["_ungetc"] = wasmExports["ungetc"];
  _fmax = Module["_fmax"] = wasmExports["fmax"];
  _gethostbyname = Module["_gethostbyname"] = wasmExports["gethostbyname"];
  _dladdr = Module["_dladdr"] = wasmExports["dladdr"];
  ___ashlti3 = Module["___ashlti3"] = wasmExports["__ashlti3"];
  _atexit = Module["_atexit"] = wasmExports["atexit"];
  _memset = Module["_memset"] = wasmExports["memset"];
  _mlock = Module["_mlock"] = wasmExports["mlock"];
  _getegid = Module["_getegid"] = wasmExports["getegid"];
  _setbuf = Module["_setbuf"] = wasmExports["setbuf"];
  _tcgetattr = Module["_tcgetattr"] = wasmExports["tcgetattr"];
  _tcsetattr = Module["_tcsetattr"] = wasmExports["tcsetattr"];
  _sendmmsg = Module["_sendmmsg"] = wasmExports["sendmmsg"];
  _recvmmsg = Module["_recvmmsg"] = wasmExports["recvmmsg"];
  _mbrtowc = Module["_mbrtowc"] = wasmExports["mbrtowc"];
  _wcrtomb = Module["_wcrtomb"] = wasmExports["wcrtomb"];
  _pipe2 = Module["_pipe2"] = wasmExports["pipe2"];
  _pthread_cond_timedwait = Module["_pthread_cond_timedwait"] = wasmExports["pthread_cond_timedwait"];
  _pthread_self = Module["_pthread_self"] = wasmExports["pthread_self"];
  _realpath = Module["_realpath"] = wasmExports["realpath"];
  _system = Module["_system"] = wasmExports["system"];
  _execvp = Module["_execvp"] = wasmExports["execvp"];
  ___floatsitf = Module["___floatsitf"] = wasmExports["__floatsitf"];
  ___addtf3 = Module["___addtf3"] = wasmExports["__addtf3"];
  ___subtf3 = Module["___subtf3"] = wasmExports["__subtf3"];
  ___multf3 = Module["___multf3"] = wasmExports["__multf3"];
  ___divtf3 = Module["___divtf3"] = wasmExports["__divtf3"];
  ___extenddftf2 = Module["___extenddftf2"] = wasmExports["__extenddftf2"];
  ___floatunsitf = Module["___floatunsitf"] = wasmExports["__floatunsitf"];
  ___letf2 = Module["___letf2"] = wasmExports["__letf2"];
  ___getf2 = Module["___getf2"] = wasmExports["__getf2"];
  ___lttf2 = Module["___lttf2"] = wasmExports["__lttf2"];
  ___gttf2 = Module["___gttf2"] = wasmExports["__gttf2"];
  ___eqtf2 = Module["___eqtf2"] = wasmExports["__eqtf2"];
  ___fixtfsi = Module["___fixtfsi"] = wasmExports["__fixtfsi"];
  ___floatditf = Module["___floatditf"] = wasmExports["__floatditf"];
  ___floatunditf = Module["___floatunditf"] = wasmExports["__floatunditf"];
  _fprintf = Module["_fprintf"] = wasmExports["fprintf"];
  _strtold = Module["_strtold"] = wasmExports["strtold"];
  ___netf2 = Module["___netf2"] = wasmExports["__netf2"];
  _vsscanf = Module["_vsscanf"] = wasmExports["vsscanf"];
  _newlocale = Module["_newlocale"] = wasmExports["newlocale"];
  _uselocale = Module["_uselocale"] = wasmExports["uselocale"];
  _strtod_l = Module["_strtod_l"] = wasmExports["strtod_l"];
  _freelocale = Module["_freelocale"] = wasmExports["freelocale"];
  _raise = Module["_raise"] = wasmExports["raise"];
  _div = Module["_div"] = wasmExports["div"];
  _ldexp = Module["_ldexp"] = wasmExports["ldexp"];
  _clock = Module["_clock"] = wasmExports["clock"];
  _times = Module["_times"] = wasmExports["times"];
  _getrlimit = Module["_getrlimit"] = wasmExports["getrlimit"];
  ___fixtfdi = Module["___fixtfdi"] = wasmExports["__fixtfdi"];
  _endpwent = Module["_endpwent"] = wasmExports["endpwent"];
  _getgrgid = Module["_getgrgid"] = wasmExports["getgrgid"];
  _endgrent = Module["_endgrent"] = wasmExports["endgrent"];
  _execve = Module["_execve"] = wasmExports["execve"];
  _posix_spawn = Module["_posix_spawn"] = wasmExports["posix_spawn"];
  ___ctype_tolower_loc = Module["___ctype_tolower_loc"] = wasmExports["__ctype_tolower_loc"];
  ___ctype_toupper_loc = Module["___ctype_toupper_loc"] = wasmExports["__ctype_toupper_loc"];
  _aligned_alloc = Module["_aligned_alloc"] = wasmExports["aligned_alloc"];
  _asprintf = Module["_asprintf"] = wasmExports["asprintf"];
  _atan2f = Module["_atan2f"] = wasmExports["atan2f"];
  ___funcs_on_exit = wasmExports["__funcs_on_exit"];
  _atol = Module["_atol"] = wasmExports["atol"];
  _bind_textdomain_codeset = Module["_bind_textdomain_codeset"] = wasmExports["bind_textdomain_codeset"];
  _btowc = Module["_btowc"] = wasmExports["btowc"];
  _cosf = Module["_cosf"] = wasmExports["cosf"];
  _ctermid = Module["_ctermid"] = wasmExports["ctermid"];
  _ctime = Module["_ctime"] = wasmExports["ctime"];
  _ctime_r = Module["_ctime_r"] = wasmExports["ctime_r"];
  _bindtextdomain = Module["_bindtextdomain"] = wasmExports["bindtextdomain"];
  _dcngettext = Module["_dcngettext"] = wasmExports["dcngettext"];
  _dcgettext = Module["_dcgettext"] = wasmExports["dcgettext"];
  _dngettext = Module["_dngettext"] = wasmExports["dngettext"];
  _dgettext = Module["_dgettext"] = wasmExports["dgettext"];
  ___dl_seterr = wasmExports["__dl_seterr"];
  __emscripten_find_dylib = wasmExports["_emscripten_find_dylib"];
  _eaccess = Module["_eaccess"] = wasmExports["eaccess"];
  _execv = Module["_execv"] = wasmExports["execv"];
  _fchmodat = Module["_fchmodat"] = wasmExports["fchmodat"];
  _fdopendir = Module["_fdopendir"] = wasmExports["fdopendir"];
  _fegetenv = Module["_fegetenv"] = wasmExports["fegetenv"];
  _fesetenv = Module["_fesetenv"] = wasmExports["fesetenv"];
  _flockfile = Module["_flockfile"] = wasmExports["flockfile"];
  _fmemopen = Module["_fmemopen"] = wasmExports["fmemopen"];
  _fmin = Module["_fmin"] = wasmExports["fmin"];
  _fmodf = Module["_fmodf"] = wasmExports["fmodf"];
  _mbtowc = Module["_mbtowc"] = wasmExports["mbtowc"];
  _towupper = Module["_towupper"] = wasmExports["towupper"];
  _towlower = Module["_towlower"] = wasmExports["towlower"];
  _fpathconf = Module["_fpathconf"] = wasmExports["fpathconf"];
  _fputwc = Module["_fputwc"] = wasmExports["fputwc"];
  _freopen = Module["_freopen"] = wasmExports["freopen"];
  _fstatat = Module["_fstatat"] = wasmExports["fstatat"];
  _funlockfile = Module["_funlockfile"] = wasmExports["funlockfile"];
  _getc_unlocked = Module["_getc_unlocked"] = wasmExports["getc_unlocked"];
  _fgetc_unlocked = Module["_fgetc_unlocked"] = wasmExports["fgetc_unlocked"];
  _getlogin = Module["_getlogin"] = wasmExports["getlogin"];
  _getopt = Module["_getopt"] = wasmExports["getopt"];
  _getpagesize = Module["_getpagesize"] = wasmExports["getpagesize"];
  _getpgid = Module["_getpgid"] = wasmExports["getpgid"];
  _getpgrp = Module["_getpgrp"] = wasmExports["getpgrp"];
  _getsid = Module["_getsid"] = wasmExports["getsid"];
  _getwc = Module["_getwc"] = wasmExports["getwc"];
  _hypotf = Module["_hypotf"] = wasmExports["hypotf"];
  _wctomb = Module["_wctomb"] = wasmExports["wctomb"];
  _inet_addr = Module["_inet_addr"] = wasmExports["inet_addr"];
  _inet_aton = Module["_inet_aton"] = wasmExports["inet_aton"];
  _inet_ntoa = Module["_inet_ntoa"] = wasmExports["inet_ntoa"];
  _isdigit_l = Module["_isdigit_l"] = wasmExports["isdigit_l"];
  _iswalpha_l = Module["_iswalpha_l"] = wasmExports["iswalpha_l"];
  _iswblank_l = Module["_iswblank_l"] = wasmExports["iswblank_l"];
  _iswcntrl_l = Module["_iswcntrl_l"] = wasmExports["iswcntrl_l"];
  _iswdigit_l = Module["_iswdigit_l"] = wasmExports["iswdigit_l"];
  _iswlower_l = Module["_iswlower_l"] = wasmExports["iswlower_l"];
  _iswprint_l = Module["_iswprint_l"] = wasmExports["iswprint_l"];
  _iswpunct_l = Module["_iswpunct_l"] = wasmExports["iswpunct_l"];
  _wcschr = Module["_wcschr"] = wasmExports["wcschr"];
  _iswspace_l = Module["_iswspace_l"] = wasmExports["iswspace_l"];
  _iswupper_l = Module["_iswupper_l"] = wasmExports["iswupper_l"];
  _iswxdigit_l = Module["_iswxdigit_l"] = wasmExports["iswxdigit_l"];
  _isxdigit_l = Module["_isxdigit_l"] = wasmExports["isxdigit_l"];
  _nl_langinfo_l = Module["_nl_langinfo_l"] = wasmExports["nl_langinfo_l"];
  _pthread_getspecific = Module["_pthread_getspecific"] = wasmExports["pthread_getspecific"];
  _pthread_setspecific = Module["_pthread_setspecific"] = wasmExports["pthread_setspecific"];
  _pthread_atfork = Module["_pthread_atfork"] = wasmExports["pthread_atfork"];
  _pthread_cancel = Module["_pthread_cancel"] = wasmExports["pthread_cancel"];
  _pthread_equal = Module["_pthread_equal"] = wasmExports["pthread_equal"];
  _pthread_condattr_setpshared = Module["_pthread_condattr_setpshared"] = wasmExports["pthread_condattr_setpshared"];
  _pthread_setcanceltype = Module["_pthread_setcanceltype"] = wasmExports["pthread_setcanceltype"];
  _pthread_rwlock_tryrdlock = Module["_pthread_rwlock_tryrdlock"] = wasmExports["pthread_rwlock_tryrdlock"];
  _pthread_rwlock_trywrlock = Module["_pthread_rwlock_trywrlock"] = wasmExports["pthread_rwlock_trywrlock"];
  _sem_init = Module["_sem_init"] = wasmExports["sem_init"];
  _sem_post = Module["_sem_post"] = wasmExports["sem_post"];
  _sem_wait = Module["_sem_wait"] = wasmExports["sem_wait"];
  _sem_destroy = Module["_sem_destroy"] = wasmExports["sem_destroy"];
  _pthread_key_delete = Module["_pthread_key_delete"] = wasmExports["pthread_key_delete"];
  _pthread_key_create = Module["_pthread_key_create"] = wasmExports["pthread_key_create"];
  _pthread_exit = Module["_pthread_exit"] = wasmExports["pthread_exit"];
  _pthread_detach = Module["_pthread_detach"] = wasmExports["pthread_detach"];
  _linkat = Module["_linkat"] = wasmExports["linkat"];
  _lroundf = Module["_lroundf"] = wasmExports["lroundf"];
  _mbrlen = Module["_mbrlen"] = wasmExports["mbrlen"];
  _mbsnrtowcs = Module["_mbsnrtowcs"] = wasmExports["mbsnrtowcs"];
  _mbsrtowcs = Module["_mbsrtowcs"] = wasmExports["mbsrtowcs"];
  _mbstowcs = Module["_mbstowcs"] = wasmExports["mbstowcs"];
  _mkdtemp = Module["_mkdtemp"] = wasmExports["mkdtemp"];
  _mkfifo = Module["_mkfifo"] = wasmExports["mkfifo"];
  _mknod = Module["_mknod"] = wasmExports["mknod"];
  _timegm = Module["_timegm"] = wasmExports["timegm"];
  _emscripten_builtin_memalign = wasmExports["emscripten_builtin_memalign"];
  _setmntent = Module["_setmntent"] = wasmExports["setmntent"];
  _endmntent = Module["_endmntent"] = wasmExports["endmntent"];
  _getmntent = Module["_getmntent"] = wasmExports["getmntent"];
  _openat = Module["_openat"] = wasmExports["openat"];
  _pathconf = Module["_pathconf"] = wasmExports["pathconf"];
  _pause = Module["_pause"] = wasmExports["pause"];
  _posix_fadvise = Module["_posix_fadvise"] = wasmExports["posix_fadvise"];
  _posix_spawn_file_actions_addclose = Module["_posix_spawn_file_actions_addclose"] = wasmExports["posix_spawn_file_actions_addclose"];
  _posix_spawn_file_actions_adddup2 = Module["_posix_spawn_file_actions_adddup2"] = wasmExports["posix_spawn_file_actions_adddup2"];
  _posix_spawn_file_actions_destroy = Module["_posix_spawn_file_actions_destroy"] = wasmExports["posix_spawn_file_actions_destroy"];
  _posix_spawn_file_actions_init = Module["_posix_spawn_file_actions_init"] = wasmExports["posix_spawn_file_actions_init"];
  _posix_spawnattr_destroy = Module["_posix_spawnattr_destroy"] = wasmExports["posix_spawnattr_destroy"];
  _posix_spawnattr_init = Module["_posix_spawnattr_init"] = wasmExports["posix_spawnattr_init"];
  _posix_spawnattr_setflags = Module["_posix_spawnattr_setflags"] = wasmExports["posix_spawnattr_setflags"];
  _posix_spawnattr_setsigdefault = Module["_posix_spawnattr_setsigdefault"] = wasmExports["posix_spawnattr_setsigdefault"];
  _printf = Module["_printf"] = wasmExports["printf"];
  _pthread_attr_setdetachstate = Module["_pthread_attr_setdetachstate"] = wasmExports["pthread_attr_setdetachstate"];
  _pthread_attr_setguardsize = Module["_pthread_attr_setguardsize"] = wasmExports["pthread_attr_setguardsize"];
  _pthread_getconcurrency = Module["_pthread_getconcurrency"] = wasmExports["pthread_getconcurrency"];
  _pthread_setconcurrency = Module["_pthread_setconcurrency"] = wasmExports["pthread_setconcurrency"];
  _pthread_sigmask = Module["_pthread_sigmask"] = wasmExports["pthread_sigmask"];
  _sigpending = Module["_sigpending"] = wasmExports["sigpending"];
  _pwrite = Module["_pwrite"] = wasmExports["pwrite"];
  _pwritev = Module["_pwritev"] = wasmExports["pwritev"];
  _sigismember = Module["_sigismember"] = wasmExports["sigismember"];
  _regcomp = Module["_regcomp"] = wasmExports["regcomp"];
  _regfree = Module["_regfree"] = wasmExports["regfree"];
  _regexec = Module["_regexec"] = wasmExports["regexec"];
  _renameat = Module["_renameat"] = wasmExports["renameat"];
  _setegid = Module["_setegid"] = wasmExports["setegid"];
  _setenv = Module["_setenv"] = wasmExports["setenv"];
  _seteuid = Module["_seteuid"] = wasmExports["seteuid"];
  __emscripten_timeout = wasmExports["_emscripten_timeout"];
  _setpgid = Module["_setpgid"] = wasmExports["setpgid"];
  _setrlimit = Module["_setrlimit"] = wasmExports["setrlimit"];
  _setsid = Module["_setsid"] = wasmExports["setsid"];
  _sigwait = Module["_sigwait"] = wasmExports["sigwait"];
  _sinf = Module["_sinf"] = wasmExports["sinf"];
  _sleep = Module["_sleep"] = wasmExports["sleep"];
  _vsprintf = Module["_vsprintf"] = wasmExports["vsprintf"];
  _stpcpy = Module["_stpcpy"] = wasmExports["stpcpy"];
  _strchrnul = Module["_strchrnul"] = wasmExports["strchrnul"];
  _strcoll_l = Module["_strcoll_l"] = wasmExports["strcoll_l"];
  _strftime_l = Module["_strftime_l"] = wasmExports["strftime_l"];
  _strtof = Module["_strtof"] = wasmExports["strtof"];
  _strtof_l = Module["_strtof_l"] = wasmExports["strtof_l"];
  _strtold_l = Module["_strtold_l"] = wasmExports["strtold_l"];
  _strtok = Module["_strtok"] = wasmExports["strtok"];
  _strtoull_l = Module["_strtoull_l"] = wasmExports["strtoull_l"];
  _strtoll_l = Module["_strtoll_l"] = wasmExports["strtoll_l"];
  _strxfrm = Module["_strxfrm"] = wasmExports["strxfrm"];
  _strxfrm_l = Module["_strxfrm_l"] = wasmExports["strxfrm_l"];
  _swprintf = Module["_swprintf"] = wasmExports["swprintf"];
  _tanf = Module["_tanf"] = wasmExports["tanf"];
  _tanhf = Module["_tanhf"] = wasmExports["tanhf"];
  _textdomain = Module["_textdomain"] = wasmExports["textdomain"];
  _gettext = Module["_gettext"] = wasmExports["gettext"];
  _ngettext = Module["_ngettext"] = wasmExports["ngettext"];
  _tolower_l = Module["_tolower_l"] = wasmExports["tolower_l"];
  _toupper_l = Module["_toupper_l"] = wasmExports["toupper_l"];
  _towupper_l = Module["_towupper_l"] = wasmExports["towupper_l"];
  _towlower_l = Module["_towlower_l"] = wasmExports["towlower_l"];
  _truncate = Module["_truncate"] = wasmExports["truncate"];
  _ttyname = Module["_ttyname"] = wasmExports["ttyname"];
  _ungetwc = Module["_ungetwc"] = wasmExports["ungetwc"];
  _unlinkat = Module["_unlinkat"] = wasmExports["unlinkat"];
  _utimensat = Module["_utimensat"] = wasmExports["utimensat"];
  _wait = Module["_wait"] = wasmExports["wait"];
  _wcscmp = Module["_wcscmp"] = wasmExports["wcscmp"];
  _wcscoll_l = Module["_wcscoll_l"] = wasmExports["wcscoll_l"];
  _wcscpy = Module["_wcscpy"] = wasmExports["wcscpy"];
  _wcsnrtombs = Module["_wcsnrtombs"] = wasmExports["wcsnrtombs"];
  _wcspbrk = Module["_wcspbrk"] = wasmExports["wcspbrk"];
  _wcsrtombs = Module["_wcsrtombs"] = wasmExports["wcsrtombs"];
  _wcstof = Module["_wcstof"] = wasmExports["wcstof"];
  _wcstod = Module["_wcstod"] = wasmExports["wcstod"];
  _wcstold = Module["_wcstold"] = wasmExports["wcstold"];
  _wcstoull = Module["_wcstoull"] = wasmExports["wcstoull"];
  _wcstoll = Module["_wcstoll"] = wasmExports["wcstoll"];
  _wcstoul = Module["_wcstoul"] = wasmExports["wcstoul"];
  _wcstol = Module["_wcstol"] = wasmExports["wcstol"];
  _wcstombs = Module["_wcstombs"] = wasmExports["wcstombs"];
  _wcsxfrm_l = Module["_wcsxfrm_l"] = wasmExports["wcsxfrm_l"];
  _wctob = Module["_wctob"] = wasmExports["wctob"];
  _wmemchr = Module["_wmemchr"] = wasmExports["wmemchr"];
  _wmemcmp = Module["_wmemcmp"] = wasmExports["wmemcmp"];
  _wmemcpy = Module["_wmemcpy"] = wasmExports["wmemcpy"];
  _emscripten_get_sbrk_ptr = wasmExports["emscripten_get_sbrk_ptr"];
  ___trap = wasmExports["__trap"];
  ___lshrti3 = Module["___lshrti3"] = wasmExports["__lshrti3"];
  ___divti3 = Module["___divti3"] = wasmExports["__divti3"];
  ___fixunstfdi = Module["___fixunstfdi"] = wasmExports["__fixunstfdi"];
  ___fixunstfsi = Module["___fixunstfsi"] = wasmExports["__fixunstfsi"];
  __emscripten_stack_restore = wasmExports["_emscripten_stack_restore"];
  __emscripten_stack_alloc = wasmExports["_emscripten_stack_alloc"];
  _emscripten_stack_get_current = wasmExports["emscripten_stack_get_current"];
  _gethostbyaddr = Module["_gethostbyaddr"] = wasmExports["gethostbyaddr"];
  _gethostbyaddr_r = Module["_gethostbyaddr_r"] = wasmExports["gethostbyaddr_r"];
  memory = wasmMemory = wasmExports["memory"];
  ___stack_pointer = Module["___stack_pointer"] = wasmExports["__stack_pointer"];
  __indirect_function_table = wasmTable = wasmExports["__indirect_function_table"];
  ___c_longjmp = Module["___c_longjmp"] = wasmExports["__c_longjmp"];
}

var _php_date_global_timezone_db_enabled = Module["_php_date_global_timezone_db_enabled"] = 8724964;

var _php_date_global_timezone_db = Module["_php_date_global_timezone_db"] = 8724960;

var _date_globals = Module["_date_globals"] = 8724944;

var _date_module_entry = Module["_date_module_entry"] = 6880428;

var _timezonedb_builtin = Module["_timezonedb_builtin"] = 6707760;

var _timezonedb_idx_builtin = Module["_timezonedb_idx_builtin"] = 6702976;

var _timelib_timezone_db_data_builtin = Module["_timelib_timezone_db_data_builtin"] = 1235120;

var _timelib_error_messages = Module["_timelib_error_messages"] = 6707776;

var _libxml_module_entry = Module["_libxml_module_entry"] = 7701244;

var _php_openssl_certificate_ce = Module["_php_openssl_certificate_ce"] = 8815040;

var _openssl_globals = Module["_openssl_globals"] = 8815052;

var _openssl_module_entry = Module["_openssl_module_entry"] = 7703500;

var __pcre2_default_tables_8 = Module["__pcre2_default_tables_8"] = 2537744;

var __pcre2_default_compile_context_8 = Module["__pcre2_default_compile_context_8"] = 7707872;

var __pcre2_default_match_context_8 = Module["__pcre2_default_match_context_8"] = 7707920;

var __pcre2_default_convert_context_8 = Module["__pcre2_default_convert_context_8"] = 7707964;

var __pcre2_OP_lengths_8 = Module["__pcre2_OP_lengths_8"] = 2538832;

var __pcre2_hspace_list_8 = Module["__pcre2_hspace_list_8"] = 2539008;

var __pcre2_vspace_list_8 = Module["__pcre2_vspace_list_8"] = 2539088;

var __pcre2_callout_start_delims_8 = Module["__pcre2_callout_start_delims_8"] = 2539120;

var __pcre2_callout_end_delims_8 = Module["__pcre2_callout_end_delims_8"] = 2539168;

var __pcre2_utf8_table1 = Module["__pcre2_utf8_table1"] = 2539216;

var __pcre2_utf8_table1_size = Module["__pcre2_utf8_table1_size"] = 2539240;

var __pcre2_utf8_table2 = Module["__pcre2_utf8_table2"] = 2539248;

var __pcre2_utf8_table3 = Module["__pcre2_utf8_table3"] = 2539280;

var __pcre2_utf8_table4 = Module["__pcre2_utf8_table4"] = 2539312;

var __pcre2_ucp_gentype_8 = Module["__pcre2_ucp_gentype_8"] = 2539376;

var __pcre2_ucp_gbtable_8 = Module["__pcre2_ucp_gbtable_8"] = 2539504;

var __pcre2_utt_names_8 = Module["__pcre2_utt_names_8"] = 2539568;

var __pcre2_utt_8 = Module["__pcre2_utt_8"] = 2543168;

var __pcre2_utt_size_8 = Module["__pcre2_utt_size_8"] = 2546104;

var __pcre2_unicode_version_8 = Module["__pcre2_unicode_version_8"] = 7707984;

var __pcre2_ucd_caseless_sets_8 = Module["__pcre2_ucd_caseless_sets_8"] = 2546112;

var __pcre2_ucd_digit_sets_8 = Module["__pcre2_ucd_digit_sets_8"] = 2546560;

var __pcre2_ucd_script_sets_8 = Module["__pcre2_ucd_script_sets_8"] = 2546848;

var __pcre2_ucd_boolprop_sets_8 = Module["__pcre2_ucd_boolprop_sets_8"] = 2547616;

var __pcre2_ucd_records_8 = Module["__pcre2_ucd_records_8"] = 2549040;

var __pcre2_ucd_stage1_8 = Module["__pcre2_ucd_stage1_8"] = 2566128;

var __pcre2_ucd_stage2_8 = Module["__pcre2_ucd_stage2_8"] = 2583536;

var _pcre_globals = Module["_pcre_globals"] = 8815392;

var _php_pcre_version = Module["_php_pcre_version"] = 8815588;

var _pcre_module_entry = Module["_pcre_module_entry"] = 7708592;

var _sqlite3_globals = Module["_sqlite3_globals"] = 8815592;

var _php_sqlite3_result_entry = Module["_php_sqlite3_result_entry"] = 8815604;

var _sqlite3_module_entry = Module["_sqlite3_module_entry"] = 7709480;

var _zlib_globals = Module["_zlib_globals"] = 8815928;

var _inflate_context_ce = Module["_inflate_context_ce"] = 8815968;

var _deflate_context_ce = Module["_deflate_context_ce"] = 8815972;

var _php_zlib_module_entry = Module["_php_zlib_module_entry"] = 7713268;

var _php_stream_gzio_ops = Module["_php_stream_gzio_ops"] = 7712268;

var _php_stream_gzip_wrapper = Module["_php_stream_gzip_wrapper"] = 7712348;

var _php_zlib_filter_factory = Module["_php_zlib_filter_factory"] = 7712360;

var _apcu_globals = Module["_apcu_globals"] = 8816592;

var _apc_user_cache = Module["_apc_user_cache"] = 8816584;

var _apc_sma = Module["_apc_sma"] = 8816688;

var _apc_str_access_time = Module["_apc_str_access_time"] = 8816712;

var _apc_str_creation_time = Module["_apc_str_creation_time"] = 8816716;

var _apc_str_deletion_time = Module["_apc_str_deletion_time"] = 8816720;

var _apc_str_hits = Module["_apc_str_hits"] = 8816724;

var _apc_str_info = Module["_apc_str_info"] = 8816728;

var _apc_str_key = Module["_apc_str_key"] = 8816732;

var _apc_str_mem_size = Module["_apc_str_mem_size"] = 8816736;

var _apc_str_mtime = Module["_apc_str_mtime"] = 8816740;

var _apc_str_num_hits = Module["_apc_str_num_hits"] = 8816744;

var _apc_str_ref_count = Module["_apc_str_ref_count"] = 8816748;

var _apc_str_refs = Module["_apc_str_refs"] = 8816752;

var _apc_str_ttl = Module["_apc_str_ttl"] = 8816756;

var _apc_str_type = Module["_apc_str_type"] = 8816760;

var _apc_str_user = Module["_apc_str_user"] = 8816764;

var _apc_str_value = Module["_apc_str_value"] = 8816768;

var _apcu_module_entry = Module["_apcu_module_entry"] = 7715412;

var _apc_iterator_object_handlers = Module["_apc_iterator_object_handlers"] = 8816472;

var _bcmath_globals = Module["_bcmath_globals"] = 8816772;

var _bcmath_module_entry = Module["_bcmath_module_entry"] = 7716884;

var _php_stream_bz2io_ops = Module["_php_stream_bz2io_ops"] = 7718928;

var _bz2_module_entry = Module["_bz2_module_entry"] = 7718836;

var _php_bz2_filter_factory = Module["_php_bz2_filter_factory"] = 7718496;

var _calendar_module_entry = Module["_calendar_module_entry"] = 7720484;

var _DayNameShort = Module["_DayNameShort"] = 7719440;

var _DayNameLong = Module["_DayNameLong"] = 7719472;

var _FrenchMonthName = Module["_FrenchMonthName"] = 7719888;

var _MonthNameShort = Module["_MonthNameShort"] = 7719760;

var _MonthNameLong = Module["_MonthNameLong"] = 7719824;

var _monthsPerYear = Module["_monthsPerYear"] = 2671824;

var _JewishMonthNameLeap = Module["_JewishMonthNameLeap"] = 7719504;

var _JewishMonthName = Module["_JewishMonthName"] = 7719568;

var _JewishMonthHebNameLeap = Module["_JewishMonthHebNameLeap"] = 7719632;

var _JewishMonthHebName = Module["_JewishMonthHebName"] = 7719696;

var _ctype_module_entry = Module["_ctype_module_entry"] = 7721632;

var _curl_ce = Module["_curl_ce"] = 8817288;

var _curl_share_ce = Module["_curl_share_ce"] = 8817396;

var _curl_share_persistent_ce = Module["_curl_share_persistent_ce"] = 8817400;

var _curl_globals = Module["_curl_globals"] = 8817232;

var _curl_module_entry = Module["_curl_module_entry"] = 7723232;

var _curl_multi_ce = Module["_curl_multi_ce"] = 8816904;

var _curl_CURLFile_class = Module["_curl_CURLFile_class"] = 8817220;

var _curl_CURLStringFile_class = Module["_curl_CURLStringFile_class"] = 8817224;

var _dns_polyfill_functions = Module["_dns_polyfill_functions"] = 7725248;

var _dns_polyfill_module_entry = Module["_dns_polyfill_module_entry"] = 7725416;

var _ascii_whitespace = Module["_ascii_whitespace"] = 7725688;

var _php_dom_ns_is_html_magic_token = Module["_php_dom_ns_is_html_magic_token"] = 7725600;

var _php_dom_ns_is_xmlns_magic_token = Module["_php_dom_ns_is_xmlns_magic_token"] = 7725620;

var _php_dom_ns_is_mathml_magic_token = Module["_php_dom_ns_is_mathml_magic_token"] = 7725604;

var _php_dom_ns_is_svg_magic_token = Module["_php_dom_ns_is_svg_magic_token"] = 7725608;

var _php_dom_ns_is_xlink_magic_token = Module["_php_dom_ns_is_xlink_magic_token"] = 7725612;

var _php_dom_ns_is_xml_magic_token = Module["_php_dom_ns_is_xml_magic_token"] = 7725616;

var _php_dom_obj_map_attributes = Module["_php_dom_obj_map_attributes"] = 7725756;

var _php_dom_obj_map_by_tag_name = Module["_php_dom_obj_map_by_tag_name"] = 7725780;

var _php_dom_obj_map_by_class_name = Module["_php_dom_obj_map_by_class_name"] = 7725804;

var _php_dom_obj_map_child_nodes = Module["_php_dom_obj_map_child_nodes"] = 7725828;

var _php_dom_obj_map_nodeset = Module["_php_dom_obj_map_nodeset"] = 7725852;

var _php_dom_obj_map_entities = Module["_php_dom_obj_map_entities"] = 7725876;

var _php_dom_obj_map_notations = Module["_php_dom_obj_map_notations"] = 7725900;

var _php_dom_obj_map_child_elements = Module["_php_dom_obj_map_child_elements"] = 7725924;

var _php_dom_obj_map_noop = Module["_php_dom_obj_map_noop"] = 7725948;

var _dom_adjacent_position_class_entry = Module["_dom_adjacent_position_class_entry"] = 8818704;

var _dom_domexception_class_entry = Module["_dom_domexception_class_entry"] = 8818708;

var _dom_parentnode_class_entry = Module["_dom_parentnode_class_entry"] = 8818712;

var _dom_modern_parentnode_class_entry = Module["_dom_modern_parentnode_class_entry"] = 8818716;

var _dom_childnode_class_entry = Module["_dom_childnode_class_entry"] = 8818720;

var _dom_modern_childnode_class_entry = Module["_dom_modern_childnode_class_entry"] = 8818724;

var _dom_domimplementation_class_entry = Module["_dom_domimplementation_class_entry"] = 8818728;

var _dom_modern_domimplementation_class_entry = Module["_dom_modern_domimplementation_class_entry"] = 8818732;

var _dom_node_class_entry = Module["_dom_node_class_entry"] = 8818736;

var _dom_modern_node_class_entry = Module["_dom_modern_node_class_entry"] = 8818800;

var _dom_namespace_node_class_entry = Module["_dom_namespace_node_class_entry"] = 8818864;

var _dom_namespace_info_class_entry = Module["_dom_namespace_info_class_entry"] = 8818928;

var _dom_documentfragment_class_entry = Module["_dom_documentfragment_class_entry"] = 8818932;

var _dom_modern_documentfragment_class_entry = Module["_dom_modern_documentfragment_class_entry"] = 8818992;

var _dom_abstract_base_document_class_entry = Module["_dom_abstract_base_document_class_entry"] = 8819056;

var _dom_document_class_entry = Module["_dom_document_class_entry"] = 8819120;

var _dom_html_document_class_entry = Module["_dom_html_document_class_entry"] = 8819184;

var _dom_xml_document_class_entry = Module["_dom_xml_document_class_entry"] = 8819188;

var _dom_nodelist_class_entry = Module["_dom_nodelist_class_entry"] = 8819248;

var _dom_modern_nodelist_class_entry = Module["_dom_modern_nodelist_class_entry"] = 8819312;

var _dom_namednodemap_class_entry = Module["_dom_namednodemap_class_entry"] = 8819316;

var _dom_modern_namednodemap_class_entry = Module["_dom_modern_namednodemap_class_entry"] = 8819376;

var _dom_modern_dtd_namednodemap_class_entry = Module["_dom_modern_dtd_namednodemap_class_entry"] = 8819380;

var _dom_html_collection_class_entry = Module["_dom_html_collection_class_entry"] = 8819384;

var _dom_characterdata_class_entry = Module["_dom_characterdata_class_entry"] = 8819388;

var _dom_modern_characterdata_class_entry = Module["_dom_modern_characterdata_class_entry"] = 8819448;

var _dom_attr_class_entry = Module["_dom_attr_class_entry"] = 8819512;

var _dom_modern_attr_class_entry = Module["_dom_modern_attr_class_entry"] = 8819576;

var _dom_element_class_entry = Module["_dom_element_class_entry"] = 8819640;

var _dom_modern_element_class_entry = Module["_dom_modern_element_class_entry"] = 8819704;

var _dom_html_element_class_entry = Module["_dom_html_element_class_entry"] = 8819768;

var _dom_text_class_entry = Module["_dom_text_class_entry"] = 8819772;

var _dom_modern_text_class_entry = Module["_dom_modern_text_class_entry"] = 8819832;

var _dom_comment_class_entry = Module["_dom_comment_class_entry"] = 8819896;

var _dom_modern_comment_class_entry = Module["_dom_modern_comment_class_entry"] = 8819900;

var _dom_cdatasection_class_entry = Module["_dom_cdatasection_class_entry"] = 8819904;

var _dom_modern_cdatasection_class_entry = Module["_dom_modern_cdatasection_class_entry"] = 8819908;

var _dom_documenttype_class_entry = Module["_dom_documenttype_class_entry"] = 8819912;

var _dom_modern_documenttype_class_entry = Module["_dom_modern_documenttype_class_entry"] = 8819976;

var _dom_notation_class_entry = Module["_dom_notation_class_entry"] = 8820040;

var _dom_modern_notation_class_entry = Module["_dom_modern_notation_class_entry"] = 8820104;

var _dom_entity_class_entry = Module["_dom_entity_class_entry"] = 8820168;

var _dom_modern_entity_class_entry = Module["_dom_modern_entity_class_entry"] = 8820232;

var _dom_entityreference_class_entry = Module["_dom_entityreference_class_entry"] = 8820296;

var _dom_modern_entityreference_class_entry = Module["_dom_modern_entityreference_class_entry"] = 8820360;

var _dom_processinginstruction_class_entry = Module["_dom_processinginstruction_class_entry"] = 8820424;

var _dom_modern_processinginstruction_class_entry = Module["_dom_modern_processinginstruction_class_entry"] = 8820488;

var _dom_xpath_object_handlers = Module["_dom_xpath_object_handlers"] = 8820552;

var _dom_xpath_class_entry = Module["_dom_xpath_class_entry"] = 8820656;

var _dom_modern_xpath_class_entry = Module["_dom_modern_xpath_class_entry"] = 8820720;

var _dom_token_list_class_entry = Module["_dom_token_list_class_entry"] = 8820724;

var _dom_globals = Module["_dom_globals"] = 8817496;

var _dom_module_entry = Module["_dom_module_entry"] = 7795828;

var _exif_globals = Module["_exif_globals"] = 8821192;

var _exif_module_entry = Module["_exif_module_entry"] = 7832892;

var _filter_globals = Module["_filter_globals"] = 8821224;

var _php_filter_exception_ce = Module["_php_filter_exception_ce"] = 8821320;

var _php_filter_failed_exception_ce = Module["_php_filter_failed_exception_ce"] = 8821324;

var _filter_module_entry = Module["_filter_module_entry"] = 7840400;

var _gd_image_ce = Module["_gd_image_ce"] = 8821328;

var _gd_module_entry = Module["_gd_module_entry"] = 7844184;

var _php_hash_adler32_ops = Module["_php_hash_adler32_ops"] = 7850872;

var _php_hash_crc32_ops = Module["_php_hash_crc32_ops"] = 7850924;

var _php_hash_crc32b_ops = Module["_php_hash_crc32b_ops"] = 7850976;

var _php_hash_crc32c_ops = Module["_php_hash_crc32c_ops"] = 7851028;

var _php_hash_fnv132_ops = Module["_php_hash_fnv132_ops"] = 7851080;

var _php_hash_fnv1a32_ops = Module["_php_hash_fnv1a32_ops"] = 7851132;

var _php_hash_fnv164_ops = Module["_php_hash_fnv164_ops"] = 7851184;

var _php_hash_fnv1a64_ops = Module["_php_hash_fnv1a64_ops"] = 7851236;

var _php_hash_gost_ops = Module["_php_hash_gost_ops"] = 7850768;

var _php_hash_gost_crypto_ops = Module["_php_hash_gost_crypto_ops"] = 7850820;

var _php_hash_3haval128_ops = Module["_php_hash_3haval128_ops"] = 7851704;

var _php_hash_3haval160_ops = Module["_php_hash_3haval160_ops"] = 7851756;

var _php_hash_3haval192_ops = Module["_php_hash_3haval192_ops"] = 7851808;

var _php_hash_3haval224_ops = Module["_php_hash_3haval224_ops"] = 7851860;

var _php_hash_3haval256_ops = Module["_php_hash_3haval256_ops"] = 7851912;

var _php_hash_4haval128_ops = Module["_php_hash_4haval128_ops"] = 7851964;

var _php_hash_4haval160_ops = Module["_php_hash_4haval160_ops"] = 7852016;

var _php_hash_4haval192_ops = Module["_php_hash_4haval192_ops"] = 7852068;

var _php_hash_4haval224_ops = Module["_php_hash_4haval224_ops"] = 7852120;

var _php_hash_4haval256_ops = Module["_php_hash_4haval256_ops"] = 7852172;

var _php_hash_5haval128_ops = Module["_php_hash_5haval128_ops"] = 7852224;

var _php_hash_5haval160_ops = Module["_php_hash_5haval160_ops"] = 7852276;

var _php_hash_5haval192_ops = Module["_php_hash_5haval192_ops"] = 7852328;

var _php_hash_5haval224_ops = Module["_php_hash_5haval224_ops"] = 7852380;

var _php_hash_5haval256_ops = Module["_php_hash_5haval256_ops"] = 7852432;

var _php_hash_joaat_ops = Module["_php_hash_joaat_ops"] = 7851288;

var _php_hash_md5_ops = Module["_php_hash_md5_ops"] = 7849416;

var _php_hash_md4_ops = Module["_php_hash_md4_ops"] = 7849468;

var _php_hash_md2_ops = Module["_php_hash_md2_ops"] = 7849520;

var _php_hash_murmur3a_ops = Module["_php_hash_murmur3a_ops"] = 7851340;

var _php_hash_murmur3c_ops = Module["_php_hash_murmur3c_ops"] = 7851392;

var _php_hash_murmur3f_ops = Module["_php_hash_murmur3f_ops"] = 7851444;

var _php_hash_ripemd128_ops = Module["_php_hash_ripemd128_ops"] = 7850144;

var _php_hash_ripemd160_ops = Module["_php_hash_ripemd160_ops"] = 7850196;

var _php_hash_ripemd256_ops = Module["_php_hash_ripemd256_ops"] = 7850248;

var _php_hash_ripemd320_ops = Module["_php_hash_ripemd320_ops"] = 7850300;

var _php_hash_sha1_ops = Module["_php_hash_sha1_ops"] = 7849572;

var _php_hash_sha256_ops = Module["_php_hash_sha256_ops"] = 7849624;

var _php_hash_sha224_ops = Module["_php_hash_sha224_ops"] = 7849676;

var _php_hash_sha384_ops = Module["_php_hash_sha384_ops"] = 7849728;

var _php_hash_sha512_ops = Module["_php_hash_sha512_ops"] = 7849780;

var _php_hash_sha512_256_ops = Module["_php_hash_sha512_256_ops"] = 7849832;

var _php_hash_sha512_224_ops = Module["_php_hash_sha512_224_ops"] = 7849884;

var _php_hash_sha3_224_ops = Module["_php_hash_sha3_224_ops"] = 7849936;

var _php_hash_sha3_256_ops = Module["_php_hash_sha3_256_ops"] = 7849988;

var _php_hash_sha3_384_ops = Module["_php_hash_sha3_384_ops"] = 7850040;

var _php_hash_sha3_512_ops = Module["_php_hash_sha3_512_ops"] = 7850092;

var _php_hash_snefru_ops = Module["_php_hash_snefru_ops"] = 7850716;

var _php_hash_3tiger128_ops = Module["_php_hash_3tiger128_ops"] = 7850404;

var _php_hash_3tiger160_ops = Module["_php_hash_3tiger160_ops"] = 7850456;

var _php_hash_3tiger192_ops = Module["_php_hash_3tiger192_ops"] = 7850508;

var _php_hash_4tiger128_ops = Module["_php_hash_4tiger128_ops"] = 7850560;

var _php_hash_4tiger160_ops = Module["_php_hash_4tiger160_ops"] = 7850612;

var _php_hash_4tiger192_ops = Module["_php_hash_4tiger192_ops"] = 7850664;

var _php_hash_whirlpool_ops = Module["_php_hash_whirlpool_ops"] = 7850352;

var _php_hash_xxh32_ops = Module["_php_hash_xxh32_ops"] = 7851496;

var _php_hash_xxh64_ops = Module["_php_hash_xxh64_ops"] = 7851548;

var _php_hash_xxh3_64_ops = Module["_php_hash_xxh3_64_ops"] = 7851600;

var _php_hash_xxh3_128_ops = Module["_php_hash_xxh3_128_ops"] = 7851652;

var _php_hashcontext_ce = Module["_php_hashcontext_ce"] = 8821600;

var _hash_module_entry = Module["_hash_module_entry"] = 7852944;

var _iconv_globals = Module["_iconv_globals"] = 8821708;

var _iconv_module_entry = Module["_iconv_module_entry"] = 7854452;

var _igbinary_globals = Module["_igbinary_globals"] = 8821744;

var _igbinary_functions = Module["_igbinary_functions"] = 7855376;

var _igbinary_module_entry = Module["_igbinary_module_entry"] = 7855460;

var _php_imagick_sc_entry = Module["_php_imagick_sc_entry"] = 8821752;

var _php_imagickdraw_sc_entry = Module["_php_imagickdraw_sc_entry"] = 8821756;

var _php_imagickpixel_sc_entry = Module["_php_imagickpixel_sc_entry"] = 8821760;

var _imagick_globals = Module["_imagick_globals"] = 8821768;

var _php_imagick_exception_class_entry = Module["_php_imagick_exception_class_entry"] = 8822312;

var _php_imagickdraw_exception_class_entry = Module["_php_imagickdraw_exception_class_entry"] = 8822316;

var _php_imagickpixeliterator_exception_class_entry = Module["_php_imagickpixeliterator_exception_class_entry"] = 8822320;

var _php_imagickpixel_exception_class_entry = Module["_php_imagickpixel_exception_class_entry"] = 8822324;

var _php_imagickkernel_exception_class_entry = Module["_php_imagickkernel_exception_class_entry"] = 8822328;

var _php_imagick_class_methods = Module["_php_imagick_class_methods"] = 7872068;

var _php_imagickdraw_class_methods = Module["_php_imagickdraw_class_methods"] = 7859636;

var _php_imagickpixeliterator_class_methods = Module["_php_imagickpixeliterator_class_methods"] = 7860264;

var _php_imagickpixeliterator_sc_entry = Module["_php_imagickpixeliterator_sc_entry"] = 8822332;

var _php_imagickpixel_class_methods = Module["_php_imagickpixel_class_methods"] = 7860888;

var _php_imagickkernel_class_methods = Module["_php_imagickkernel_class_methods"] = 7872304;

var _php_imagickkernel_sc_entry = Module["_php_imagickkernel_sc_entry"] = 8822336;

var _imagick_module_entry = Module["_imagick_module_entry"] = 7872308;

var _php_json_serializable_ce = Module["_php_json_serializable_ce"] = 8822396;

var _php_json_exception_ce = Module["_php_json_exception_ce"] = 8822392;

var _json_globals = Module["_json_globals"] = 8822380;

var _json_module_entry = Module["_json_module_entry"] = 7888680;

var _jsonk_exception_ce = Module["_jsonk_exception_ce"] = 8822548;

var _jsonk_globals = Module["_jsonk_globals"] = 8822552;

var _jsonk_module_entry = Module["_jsonk_module_entry"] = 7890780;

var __ZTIN8simdjson14simdjson_errorE = Module["__ZTIN8simdjson14simdjson_errorE"] = 7890420;

var __ZTVN8simdjson14simdjson_errorE = Module["__ZTVN8simdjson14simdjson_errorE"] = 7890432;

var __ZZN8simdjson8internal14base_formatterINS0_19fractured_formatterEE6stringENSt3__217basic_string_viewIcNS4_11char_traitsIcEEEEE14needs_escaping = Module["__ZZN8simdjson8internal14base_formatterINS0_19fractured_formatterEE6stringENSt3__217basic_string_viewIcNS4_11char_traitsIcEEEEE14needs_escaping"] = 3683472;

var __ZZN8simdjson8internal14base_formatterINS0_19fractured_formatterEE6stringENSt3__217basic_string_viewIcNS4_11char_traitsIcEEEEE7escaped = Module["__ZZN8simdjson8internal14base_formatterINS0_19fractured_formatterEE6stringENSt3__217basic_string_viewIcNS4_11char_traitsIcEEEEE7escaped"] = 3683728;

var __ZTSN8simdjson14simdjson_errorE = Module["__ZTSN8simdjson14simdjson_errorE"] = 3683443;

var __ZTVN8simdjson8internal26unsupported_implementationE = Module["__ZTVN8simdjson8internal26unsupported_implementationE"] = 7890296;

var __ZTVN8simdjson8fallback25dom_parser_implementationE = Module["__ZTVN8simdjson8fallback25dom_parser_implementationE"] = 7890228;

var __ZTVN8simdjson14implementationE = Module["__ZTVN8simdjson14implementationE"] = 7890340;

var __ZTVN8simdjson8fallback14implementationE = Module["__ZTVN8simdjson8fallback14implementationE"] = 7890176;

var __ZTVN8simdjson8internal25dom_parser_implementationE = Module["__ZTVN8simdjson8internal25dom_parser_implementationE"] = 7890372;

var __ZN8simdjson8internal14digit_to_val32E = Module["__ZN8simdjson8internal14digit_to_val32E"] = 3665792;

var __ZZN8simdjson8internal9dtoa_impl36get_cached_power_for_binary_exponentEiE13kCachedPowers = Module["__ZZN8simdjson8internal9dtoa_impl36get_cached_power_for_binary_exponentEiE13kCachedPowers"] = 3682144;

var __ZZN8simdjson8internal13compute_floatINS0_13binary_formatIdEEEENS0_17adjusted_mantissaERNS0_7decimalEE6powers = Module["__ZZN8simdjson8internal13compute_floatINS0_13binary_formatIdEEEENS0_17adjusted_mantissaERNS0_7decimalEE6powers"] = 3683424;

var __ZN8simdjson8internal32structural_or_whitespace_negatedE = Module["__ZN8simdjson8internal32structural_or_whitespace_negatedE"] = 3665280;

var __ZN8simdjson8internal12power_of_tenE = Module["__ZN8simdjson8internal12power_of_tenE"] = 3669344;

var __ZN8simdjson8internal17power_of_five_128E = Module["__ZN8simdjson8internal17power_of_five_128E"] = 3669536;

var __ZN8simdjson8internal11error_codesE = Module["__ZN8simdjson8internal11error_codesE"] = 7889136;

var __ZN8simdjson8internal24structural_or_whitespaceE = Module["__ZN8simdjson8internal24structural_or_whitespaceE"] = 3665536;

var __ZTIN8simdjson8fallback14implementationE = Module["__ZTIN8simdjson8fallback14implementationE"] = 7890208;

var __ZTSN8simdjson8fallback14implementationE = Module["__ZTSN8simdjson8fallback14implementationE"] = 3679952;

var __ZTIN8simdjson14implementationE = Module["__ZTIN8simdjson14implementationE"] = 7890220;

var __ZTSN8simdjson14implementationE = Module["__ZTSN8simdjson14implementationE"] = 3679989;

var __ZTIN8simdjson8fallback25dom_parser_implementationE = Module["__ZTIN8simdjson8fallback25dom_parser_implementationE"] = 7890276;

var __ZTSN8simdjson8fallback25dom_parser_implementationE = Module["__ZTSN8simdjson8fallback25dom_parser_implementationE"] = 3680017;

var __ZTIN8simdjson8internal25dom_parser_implementationE = Module["__ZTIN8simdjson8internal25dom_parser_implementationE"] = 7890288;

var __ZTSN8simdjson8internal25dom_parser_implementationE = Module["__ZTSN8simdjson8internal25dom_parser_implementationE"] = 3680065;

var __ZTIN8simdjson8internal26unsupported_implementationE = Module["__ZTIN8simdjson8internal26unsupported_implementationE"] = 7890328;

var __ZTSN8simdjson8internal26unsupported_implementationE = Module["__ZTSN8simdjson8internal26unsupported_implementationE"] = 3681580;

var __ZZN8simdjson8internal13compute_floatINS0_13binary_formatIdEEEENS0_17adjusted_mantissaERNS0_7decimalEE9max_shift = Module["__ZZN8simdjson8internal13compute_floatINS0_13binary_formatIdEEEENS0_17adjusted_mantissaERNS0_7decimalEE9max_shift"] = 3683408;

var __ZZN8simdjson8internal13compute_floatINS0_13binary_formatIdEEEENS0_17adjusted_mantissaERNS0_7decimalEE10num_powers = Module["__ZZN8simdjson8internal13compute_floatINS0_13binary_formatIdEEEENS0_17adjusted_mantissaERNS0_7decimalEE10num_powers"] = 3683412;

var _lexbor_module_entry = Module["_lexbor_module_entry"] = 7725508;

var _lexbor_hash_insert_var = Module["_lexbor_hash_insert_var"] = 7725972;

var _lexbor_hash_insert_lower_var = Module["_lexbor_hash_insert_lower_var"] = 7725984;

var _lexbor_hash_insert_upper_var = Module["_lexbor_hash_insert_upper_var"] = 7725996;

var _lexbor_hash_insert_raw = Module["_lexbor_hash_insert_raw"] = 7726008;

var _lexbor_hash_insert_lower = Module["_lexbor_hash_insert_lower"] = 7726012;

var _lexbor_hash_insert_upper = Module["_lexbor_hash_insert_upper"] = 7726016;

var _lexbor_hash_search_var = Module["_lexbor_hash_search_var"] = 7726020;

var _lexbor_hash_search_lower_var = Module["_lexbor_hash_search_lower_var"] = 7726028;

var _lexbor_hash_search_upper_var = Module["_lexbor_hash_search_upper_var"] = 7726036;

var _lexbor_hash_search_raw = Module["_lexbor_hash_search_raw"] = 7726044;

var _lexbor_hash_search_lower = Module["_lexbor_hash_search_lower"] = 7726048;

var _lexbor_hash_search_upper = Module["_lexbor_hash_search_upper"] = 7726052;

var _lexbor_str_res_map_lowercase = Module["_lexbor_str_res_map_lowercase"] = 2529184;

var _lexbor_str_res_ansi_replacement_character = Module["_lexbor_str_res_ansi_replacement_character"] = 2528656;

var _lexbor_str_res_map_uppercase = Module["_lexbor_str_res_map_uppercase"] = 2529440;

var _lexbor_str_res_map_num = Module["_lexbor_str_res_map_num"] = 2528672;

var _lexbor_str_res_map_hex = Module["_lexbor_str_res_map_hex"] = 2528928;

var _lexbor_str_res_replacement_character = Module["_lexbor_str_res_replacement_character"] = 2529696;

var _lexbor_str_res_alphanumeric_character = Module["_lexbor_str_res_alphanumeric_character"] = 2530336;

var _lexbor_str_res_alpha_character = Module["_lexbor_str_res_alpha_character"] = 2531360;

var _lexbor_tokenizer_chars_map = Module["_lexbor_tokenizer_chars_map"] = 2532384;

var _lexbor_str_res_map_hex_to_char = Module["_lexbor_str_res_map_hex_to_char"] = 2532640;

var _lexbor_str_res_map_hex_to_char_lowercase = Module["_lexbor_str_res_map_hex_to_char_lowercase"] = 2532672;

var _lexbor_str_res_char_to_two_hex_value = Module["_lexbor_str_res_char_to_two_hex_value"] = 7664080;

var _lexbor_str_res_char_to_two_hex_value_lowercase = Module["_lexbor_str_res_char_to_two_hex_value_lowercase"] = 7665120;

var _lxb_css_syntax_res_name_map = Module["_lxb_css_syntax_res_name_map"] = 2812608;

var _lxb_encoding_multi_big5_map = Module["_lxb_encoding_multi_big5_map"] = 6891312;

var _lxb_encoding_multi_euc_kr_map = Module["_lxb_encoding_multi_euc_kr_map"] = 6970448;

var _lxb_encoding_multi_gb18030_map = Module["_lxb_encoding_multi_gb18030_map"] = 7065456;

var _lxb_encoding_multi_iso_2022_jp_katakana_map = Module["_lxb_encoding_multi_iso_2022_jp_katakana_map"] = 7161216;

var _lxb_encoding_multi_jis0212_map = Module["_lxb_encoding_multi_jis0212_map"] = 7161472;

var _lxb_encoding_multi_jis0208_map = Module["_lxb_encoding_multi_jis0208_map"] = 7190320;

var _lxb_encoding_multi_big5_167_1106_map = Module["_lxb_encoding_multi_big5_167_1106_map"] = 7234736;

var _lxb_encoding_multi_big5_8211_40882_map = Module["_lxb_encoding_multi_big5_8211_40882_map"] = 7236624;

var _lxb_encoding_multi_big5_64012_65518_map = Module["_lxb_encoding_multi_big5_64012_65518_map"] = 7301968;

var _lxb_encoding_multi_big5_131210_172369_map = Module["_lxb_encoding_multi_big5_131210_172369_map"] = 7304992;

var _lxb_encoding_multi_big5_194708_194727_map = Module["_lxb_encoding_multi_big5_194708_194727_map"] = 7387312;

var _lxb_encoding_multi_euc_kr_161_1106_map = Module["_lxb_encoding_multi_euc_kr_161_1106_map"] = 7387360;

var _lxb_encoding_multi_euc_kr_8213_13278_map = Module["_lxb_encoding_multi_euc_kr_8213_13278_map"] = 7389264;

var _lxb_encoding_multi_euc_kr_19968_55204_map = Module["_lxb_encoding_multi_euc_kr_19968_55204_map"] = 7399408;

var _lxb_encoding_multi_euc_kr_63744_65511_map = Module["_lxb_encoding_multi_euc_kr_63744_65511_map"] = 7469888;

var _lxb_encoding_multi_gb18030_164_1106_map = Module["_lxb_encoding_multi_gb18030_164_1106_map"] = 7473424;

var _lxb_encoding_multi_gb18030_7743_40892_map = Module["_lxb_encoding_multi_gb18030_7743_40892_map"] = 7475312;

var _lxb_encoding_multi_gb18030_57344_65510_map = Module["_lxb_encoding_multi_gb18030_57344_65510_map"] = 7541616;

var _lxb_encoding_multi_iso_2022_jp_katakana_12289_12541_map = Module["_lxb_encoding_multi_iso_2022_jp_katakana_12289_12541_map"] = 7557952;

var _lxb_encoding_multi_jis0212_161_1120_map = Module["_lxb_encoding_multi_jis0212_161_1120_map"] = 7558464;

var _lxb_encoding_multi_jis0212_8470_8483_map = Module["_lxb_encoding_multi_jis0212_8470_8483_map"] = 7560384;

var _lxb_encoding_multi_jis0212_19970_40870_map = Module["_lxb_encoding_multi_jis0212_19970_40870_map"] = 7560416;

var _lxb_encoding_multi_jis0212_65374_65375_map = Module["_lxb_encoding_multi_jis0212_65374_65375_map"] = 7602216;

var _lxb_encoding_multi_jis0208_167_1106_map = Module["_lxb_encoding_multi_jis0208_167_1106_map"] = 7602224;

var _lxb_encoding_multi_jis0208_8208_13262_map = Module["_lxb_encoding_multi_jis0208_8208_13262_map"] = 7604112;

var _lxb_encoding_multi_jis0208_19968_40865_map = Module["_lxb_encoding_multi_jis0208_19968_40865_map"] = 7614224;

var _lxb_encoding_multi_jis0208_63785_65510_map = Module["_lxb_encoding_multi_jis0208_63785_65510_map"] = 7656032;

var _lxb_encoding_range_index_gb18030 = Module["_lxb_encoding_range_index_gb18030"] = 1774992;

var _lxb_encoding_res_map = Module["_lxb_encoding_res_map"] = 7659520;

var _lxb_encoding_res_shs_entities = Module["_lxb_encoding_res_shs_entities"] = 7660560;

var _lxb_encoding_single_index_ibm866 = Module["_lxb_encoding_single_index_ibm866"] = 1612672;

var _lxb_encoding_single_index_iso_8859_10 = Module["_lxb_encoding_single_index_iso_8859_10"] = 1614208;

var _lxb_encoding_single_index_iso_8859_13 = Module["_lxb_encoding_single_index_iso_8859_13"] = 1615744;

var _lxb_encoding_single_index_iso_8859_14 = Module["_lxb_encoding_single_index_iso_8859_14"] = 1617280;

var _lxb_encoding_single_index_iso_8859_15 = Module["_lxb_encoding_single_index_iso_8859_15"] = 1618816;

var _lxb_encoding_single_index_iso_8859_16 = Module["_lxb_encoding_single_index_iso_8859_16"] = 1620352;

var _lxb_encoding_single_index_iso_8859_2 = Module["_lxb_encoding_single_index_iso_8859_2"] = 1621888;

var _lxb_encoding_single_index_iso_8859_3 = Module["_lxb_encoding_single_index_iso_8859_3"] = 1623424;

var _lxb_encoding_single_index_iso_8859_4 = Module["_lxb_encoding_single_index_iso_8859_4"] = 1624960;

var _lxb_encoding_single_index_iso_8859_5 = Module["_lxb_encoding_single_index_iso_8859_5"] = 1626496;

var _lxb_encoding_single_index_iso_8859_6 = Module["_lxb_encoding_single_index_iso_8859_6"] = 1628032;

var _lxb_encoding_single_index_iso_8859_7 = Module["_lxb_encoding_single_index_iso_8859_7"] = 1629568;

var _lxb_encoding_single_index_iso_8859_8 = Module["_lxb_encoding_single_index_iso_8859_8"] = 1631104;

var _lxb_encoding_single_index_koi8_r = Module["_lxb_encoding_single_index_koi8_r"] = 1632640;

var _lxb_encoding_single_index_koi8_u = Module["_lxb_encoding_single_index_koi8_u"] = 1634176;

var _lxb_encoding_single_index_macintosh = Module["_lxb_encoding_single_index_macintosh"] = 1635712;

var _lxb_encoding_single_index_windows_1250 = Module["_lxb_encoding_single_index_windows_1250"] = 1637248;

var _lxb_encoding_single_index_windows_1251 = Module["_lxb_encoding_single_index_windows_1251"] = 1638784;

var _lxb_encoding_single_index_windows_1252 = Module["_lxb_encoding_single_index_windows_1252"] = 1640320;

var _lxb_encoding_single_index_windows_1253 = Module["_lxb_encoding_single_index_windows_1253"] = 1641856;

var _lxb_encoding_single_index_windows_1254 = Module["_lxb_encoding_single_index_windows_1254"] = 1643392;

var _lxb_encoding_single_index_windows_1255 = Module["_lxb_encoding_single_index_windows_1255"] = 1644928;

var _lxb_encoding_single_index_windows_1256 = Module["_lxb_encoding_single_index_windows_1256"] = 1646464;

var _lxb_encoding_single_index_windows_1257 = Module["_lxb_encoding_single_index_windows_1257"] = 1648e3;

var _lxb_encoding_single_index_windows_1258 = Module["_lxb_encoding_single_index_windows_1258"] = 1649536;

var _lxb_encoding_single_index_windows_874 = Module["_lxb_encoding_single_index_windows_874"] = 1651072;

var _lxb_encoding_single_index_x_mac_cyrillic = Module["_lxb_encoding_single_index_x_mac_cyrillic"] = 1652608;

var _lxb_encoding_single_hash_ibm866 = Module["_lxb_encoding_single_hash_ibm866"] = 1654144;

var _lxb_encoding_single_hash_iso_8859_10 = Module["_lxb_encoding_single_hash_iso_8859_10"] = 1658288;

var _lxb_encoding_single_hash_iso_8859_13 = Module["_lxb_encoding_single_hash_iso_8859_13"] = 1662416;

var _lxb_encoding_single_hash_iso_8859_14 = Module["_lxb_encoding_single_hash_iso_8859_14"] = 1666576;

var _lxb_encoding_single_hash_iso_8859_15 = Module["_lxb_encoding_single_hash_iso_8859_15"] = 1671472;

var _lxb_encoding_single_hash_iso_8859_16 = Module["_lxb_encoding_single_hash_iso_8859_16"] = 1675616;

var _lxb_encoding_single_hash_iso_8859_2 = Module["_lxb_encoding_single_hash_iso_8859_2"] = 1680592;

var _lxb_encoding_single_hash_iso_8859_3 = Module["_lxb_encoding_single_hash_iso_8859_3"] = 1685024;

var _lxb_encoding_single_hash_iso_8859_4 = Module["_lxb_encoding_single_hash_iso_8859_4"] = 1689152;

var _lxb_encoding_single_hash_iso_8859_5 = Module["_lxb_encoding_single_hash_iso_8859_5"] = 1693280;

var _lxb_encoding_single_hash_iso_8859_6 = Module["_lxb_encoding_single_hash_iso_8859_6"] = 1697408;

var _lxb_encoding_single_hash_iso_8859_7 = Module["_lxb_encoding_single_hash_iso_8859_7"] = 1701536;

var _lxb_encoding_single_hash_iso_8859_8 = Module["_lxb_encoding_single_hash_iso_8859_8"] = 1705680;

var _lxb_encoding_single_hash_koi8_r = Module["_lxb_encoding_single_hash_koi8_r"] = 1709856;

var _lxb_encoding_single_hash_koi8_u = Module["_lxb_encoding_single_hash_koi8_u"] = 1715712;

var _lxb_encoding_single_hash_macintosh = Module["_lxb_encoding_single_hash_macintosh"] = 1720288;

var _lxb_encoding_single_hash_windows_1250 = Module["_lxb_encoding_single_hash_windows_1250"] = 1724512;

var _lxb_encoding_single_hash_windows_1251 = Module["_lxb_encoding_single_hash_windows_1251"] = 1729712;

var _lxb_encoding_single_hash_windows_1252 = Module["_lxb_encoding_single_hash_windows_1252"] = 1734080;

var _lxb_encoding_single_hash_windows_1253 = Module["_lxb_encoding_single_hash_windows_1253"] = 1738576;

var _lxb_encoding_single_hash_windows_1254 = Module["_lxb_encoding_single_hash_windows_1254"] = 1742848;

var _lxb_encoding_single_hash_windows_1255 = Module["_lxb_encoding_single_hash_windows_1255"] = 1747120;

var _lxb_encoding_single_hash_windows_1256 = Module["_lxb_encoding_single_hash_windows_1256"] = 1752736;

var _lxb_encoding_single_hash_windows_1257 = Module["_lxb_encoding_single_hash_windows_1257"] = 1757024;

var _lxb_encoding_single_hash_windows_1258 = Module["_lxb_encoding_single_hash_windows_1258"] = 1761296;

var _lxb_encoding_single_hash_windows_874 = Module["_lxb_encoding_single_hash_windows_874"] = 1766176;

var _lxb_encoding_single_hash_x_mac_cyrillic = Module["_lxb_encoding_single_hash_x_mac_cyrillic"] = 1770496;

var _lxb_html_tag_res_cats = Module["_lxb_html_tag_res_cats"] = 7753056;

var _lxb_html_tag_res_fixname_svg = Module["_lxb_html_tag_res_fixname_svg"] = 7759392;

var _lxb_html_tokenizer_eof = Module["_lxb_html_tokenizer_eof"] = 7753048;

var _mbstring_globals = Module["_mbstring_globals"] = 8821040;

var _mb_convert_kana_flags = Module["_mb_convert_kana_flags"] = 7829568;

var _mbstring_module_entry = Module["_mbstring_module_entry"] = 7829368;

var _php_mb_oniguruma_version = Module["_php_mb_oniguruma_version"] = 8820784;

var _mbfl_html_entity_list = Module["_mbfl_html_entity_list"] = 7815712;

var _vtbl_7bit_wchar = Module["_vtbl_7bit_wchar"] = 7817852;

var _vtbl_wchar_7bit = Module["_vtbl_wchar_7bit"] = 7817880;

var _mbfl_encoding_7bit = Module["_mbfl_encoding_7bit"] = 7817908;

var _mbfl_encoding_base64 = Module["_mbfl_encoding_base64"] = 7815408;

var _vtbl_8bit_b64 = Module["_vtbl_8bit_b64"] = 7815456;

var _vtbl_b64_8bit = Module["_vtbl_b64_8bit"] = 7815484;

var _jisx0208_ucs_table = Module["_jisx0208_ucs_table"] = 2814288;

var _jisx0212_ucs_table = Module["_jisx0212_ucs_table"] = 2829920;

var _ucs_a1_jis_table = Module["_ucs_a1_jis_table"] = 2844352;

var _ucs_a2_jis_table = Module["_ucs_a2_jis_table"] = 2846608;

var _ucs_i_jis_table = Module["_ucs_i_jis_table"] = 2855328;

var _ucs_r_jis_table_min = Module["_ucs_r_jis_table_min"] = 7819288;

var _ucs_r_jis_table_max = Module["_ucs_r_jis_table_max"] = 7819292;

var _ucs_r_jis_table = Module["_ucs_r_jis_table"] = 2897328;

var _cp932ext1_ucs_table = Module["_cp932ext1_ucs_table"] = 2897792;

var _cp932ext2_ucs_table = Module["_cp932ext2_ucs_table"] = 2898336;

var _cp932ext3_ucs_table = Module["_cp932ext3_ucs_table"] = 2899104;

var _uhc1_ucs_table = Module["_uhc1_ucs_table"] = 3047056;

var _uhc3_ucs_table = Module["_uhc3_ucs_table"] = 3073664;

var _ucs_a1_uhc_table = Module["_ucs_a1_uhc_table"] = 3084016;

var _ucs_a2_uhc_table = Module["_ucs_a2_uhc_table"] = 3086240;

var _ucs_a3_uhc_table = Module["_ucs_a3_uhc_table"] = 3089552;

var _ucs_i_uhc_table = Module["_ucs_i_uhc_table"] = 3092064;

var _ucs_s_uhc_table = Module["_ucs_s_uhc_table"] = 3134384;

var _ucs_r1_uhc_table = Module["_ucs_r1_uhc_table"] = 3157248;

var _ucs_r2_uhc_table = Module["_ucs_r2_uhc_table"] = 3158304;

var _cp932ext1_ucs_table_paired_sorted = Module["_cp932ext1_ucs_table_paired_sorted"] = 2898e3;

var _cp932ext3_ucs_table_paired_sorted = Module["_cp932ext3_ucs_table_paired_sorted"] = 2899888;

var _cp936_ucs_table = Module["_cp936_ucs_table"] = 2901440;

var _ucs_a1_cp936_table = Module["_ucs_a1_cp936_table"] = 2952704;

var _ucs_a2_cp936_table = Module["_ucs_a2_cp936_table"] = 2954928;

var _ucs_a3_cp936_table = Module["_ucs_a3_cp936_table"] = 2958144;

var _ucs_i_cp936_table = Module["_ucs_i_cp936_table"] = 2960128;

var _ucs_hff_s_cp936_table = Module["_ucs_hff_s_cp936_table"] = 3002344;

var _cp936_pua_tbl1 = Module["_cp936_pua_tbl1"] = 2949648;

var _cp936_pua_tbl2 = Module["_cp936_pua_tbl2"] = 2952506;

var _ucs_ci_s_cp936_table = Module["_ucs_ci_s_cp936_table"] = 3002128;

var _ucs_cf_cp936_table = Module["_ucs_cf_cp936_table"] = 3002192;

var _ucs_sfv_cp936_table = Module["_ucs_sfv_cp936_table"] = 3002272;

var _cp936_pua_tbl3 = Module["_cp936_pua_tbl3"] = 2952528;

var _gb18030_2022_pua_tbl1 = Module["_gb18030_2022_pua_tbl1"] = 3002368;

var _ucs_i_gb2312_table = Module["_ucs_i_gb2312_table"] = 3005232;

var _mbfl_encoding_sjis_sb = Module["_mbfl_encoding_sjis_sb"] = 7820840;

var _mbfl_encoding_sjis_docomo = Module["_mbfl_encoding_sjis_docomo"] = 7820584;

var _mbfl_encoding_sjis_kddi = Module["_mbfl_encoding_sjis_kddi"] = 7820712;

var _jisx0208_ucs_table_size = Module["_jisx0208_ucs_table_size"] = 2829904;

var _jisx0212_ucs_table_size = Module["_jisx0212_ucs_table_size"] = 2844344;

var _ucs_a1_jis_table_min = Module["_ucs_a1_jis_table_min"] = 2846592;

var _ucs_a1_jis_table_max = Module["_ucs_a1_jis_table_max"] = 2846596;

var _ucs_a2_jis_table_min = Module["_ucs_a2_jis_table_min"] = 2855312;

var _ucs_a2_jis_table_max = Module["_ucs_a2_jis_table_max"] = 2855316;

var _ucs_i_jis_table_min = Module["_ucs_i_jis_table_min"] = 2897312;

var _ucs_i_jis_table_max = Module["_ucs_i_jis_table_max"] = 2897316;

var _cp932ext1_ucs_table_min = Module["_cp932ext1_ucs_table_min"] = 2897980;

var _cp932ext1_ucs_table_max = Module["_cp932ext1_ucs_table_max"] = 2897984;

var _cp932ext2_ucs_table_min = Module["_cp932ext2_ucs_table_min"] = 2899088;

var _cp932ext2_ucs_table_max = Module["_cp932ext2_ucs_table_max"] = 2899092;

var _cp932ext3_ucs_table_min = Module["_cp932ext3_ucs_table_min"] = 2899880;

var _cp932ext3_ucs_table_max = Module["_cp932ext3_ucs_table_max"] = 2899884;

var _cp936_ucs_table_size = Module["_cp936_ucs_table_size"] = 2949632;

var _ucs_a1_cp936_table_min = Module["_ucs_a1_cp936_table_min"] = 2954916;

var _ucs_a1_cp936_table_max = Module["_ucs_a1_cp936_table_max"] = 2954920;

var _ucs_a2_cp936_table_min = Module["_ucs_a2_cp936_table_min"] = 2958136;

var _ucs_a2_cp936_table_max = Module["_ucs_a2_cp936_table_max"] = 2958140;

var _ucs_a3_cp936_table_min = Module["_ucs_a3_cp936_table_min"] = 2960108;

var _ucs_a3_cp936_table_max = Module["_ucs_a3_cp936_table_max"] = 2960112;

var _ucs_i_cp936_table_min = Module["_ucs_i_cp936_table_min"] = 3002112;

var _ucs_i_cp936_table_max = Module["_ucs_i_cp936_table_max"] = 3002116;

var _ucs_ci_cp936_table_min = Module["_ucs_ci_cp936_table_min"] = 3002120;

var _ucs_ci_cp936_table_max = Module["_ucs_ci_cp936_table_max"] = 3002124;

var _ucs_cf_cp936_table_min = Module["_ucs_cf_cp936_table_min"] = 3002256;

var _ucs_cf_cp936_table_max = Module["_ucs_cf_cp936_table_max"] = 3002260;

var _ucs_sfv_cp936_table_min = Module["_ucs_sfv_cp936_table_min"] = 3002336;

var _ucs_sfv_cp936_table_max = Module["_ucs_sfv_cp936_table_max"] = 3002340;

var _ucs_hff_cp936_table_min = Module["_ucs_hff_cp936_table_min"] = 3002356;

var _ucs_hff_cp936_table_max = Module["_ucs_hff_cp936_table_max"] = 3002360;

var _ucs_i_gb2312_table_min = Module["_ucs_i_gb2312_table_min"] = 3047040;

var _ucs_i_gb2312_table_max = Module["_ucs_i_gb2312_table_max"] = 3047044;

var _uhc1_ucs_table_size = Module["_uhc1_ucs_table_size"] = 3073656;

var _uhc3_ucs_table_size = Module["_uhc3_ucs_table_size"] = 3084004;

var _ucs_a1_uhc_table_min = Module["_ucs_a1_uhc_table_min"] = 3086228;

var _ucs_a1_uhc_table_max = Module["_ucs_a1_uhc_table_max"] = 3086232;

var _ucs_a2_uhc_table_min = Module["_ucs_a2_uhc_table_min"] = 3089532;

var _ucs_a2_uhc_table_max = Module["_ucs_a2_uhc_table_max"] = 3089536;

var _ucs_a3_uhc_table_min = Module["_ucs_a3_uhc_table_min"] = 3092044;

var _ucs_a3_uhc_table_max = Module["_ucs_a3_uhc_table_max"] = 3092048;

var _ucs_i_uhc_table_min = Module["_ucs_i_uhc_table_min"] = 3134364;

var _ucs_i_uhc_table_max = Module["_ucs_i_uhc_table_max"] = 3134368;

var _ucs_s_uhc_table_min = Module["_ucs_s_uhc_table_min"] = 3157240;

var _ucs_s_uhc_table_max = Module["_ucs_s_uhc_table_max"] = 3157244;

var _ucs_r1_uhc_table_min = Module["_ucs_r1_uhc_table_min"] = 3158296;

var _ucs_r1_uhc_table_max = Module["_ucs_r1_uhc_table_max"] = 3158300;

var _ucs_r2_uhc_table_min = Module["_ucs_r2_uhc_table_min"] = 3158768;

var _ucs_r2_uhc_table_max = Module["_ucs_r2_uhc_table_max"] = 3158772;

var _mbfl_encoding_jis = Module["_mbfl_encoding_jis"] = 7819352;

var _mbfl_encoding_2022jp = Module["_mbfl_encoding_2022jp"] = 7819456;

var _mbfl_encoding_2022jp_kddi = Module["_mbfl_encoding_2022jp_kddi"] = 7819568;

var _mbfl_encoding_2022jp_2004 = Module["_mbfl_encoding_2022jp_2004"] = 7819672;

var _mbfl_encoding_cp50220 = Module["_mbfl_encoding_cp50220"] = 7819800;

var _mbfl_encoding_cp50221 = Module["_mbfl_encoding_cp50221"] = 7819904;

var _mbfl_encoding_cp50222 = Module["_mbfl_encoding_cp50222"] = 7820008;

var _mbfl_encoding_2022jpms = Module["_mbfl_encoding_2022jpms"] = 7820120;

var _mbfl_encoding_2022kr = Module["_mbfl_encoding_2022kr"] = 7820224;

var _mbfl_encoding_sjis = Module["_mbfl_encoding_sjis"] = 7820340;

var _mbfl_encoding_sjis_mac = Module["_mbfl_encoding_sjis_mac"] = 7820456;

var _mbfl_encoding_sjis2004 = Module["_mbfl_encoding_sjis2004"] = 7820956;

var _mbfl_encoding_cp932 = Module["_mbfl_encoding_cp932"] = 7821080;

var _mbfl_encoding_sjiswin = Module["_mbfl_encoding_sjiswin"] = 7821196;

var _mbfl_encoding_euc_jp = Module["_mbfl_encoding_euc_jp"] = 7821324;

var _mbfl_encoding_eucjp2004 = Module["_mbfl_encoding_eucjp2004"] = 7821436;

var _mbfl_encoding_eucjp_win = Module["_mbfl_encoding_eucjp_win"] = 7821552;

var _mbfl_encoding_cp51932 = Module["_mbfl_encoding_cp51932"] = 7821664;

var _mbfl_encoding_euc_cn = Module["_mbfl_encoding_euc_cn"] = 7821792;

var _mbfl_encoding_euc_tw = Module["_mbfl_encoding_euc_tw"] = 7821912;

var _mbfl_encoding_euc_kr = Module["_mbfl_encoding_euc_kr"] = 7822040;

var _mbfl_encoding_uhc = Module["_mbfl_encoding_uhc"] = 7822152;

var _mbfl_encoding_gb18030 = Module["_mbfl_encoding_gb18030"] = 7822268;

var _mbfl_encoding_cp936 = Module["_mbfl_encoding_cp936"] = 7822384;

var _mbfl_encoding_gb18030_2022 = Module["_mbfl_encoding_gb18030_2022"] = 7822432;

var _mbfl_encoding_big5 = Module["_mbfl_encoding_big5"] = 7822552;

var _mbfl_encoding_cp950 = Module["_mbfl_encoding_cp950"] = 7822656;

var _mbfl_encoding_hz = Module["_mbfl_encoding_hz"] = 7822760;

var _vtbl_html_wchar = Module["_vtbl_html_wchar"] = 7817748;

var _vtbl_wchar_html = Module["_vtbl_wchar_html"] = 7817776;

var _mbfl_encoding_html_ent = Module["_mbfl_encoding_html_ent"] = 7817804;

var _mbfl_encoding_qprint = Module["_mbfl_encoding_qprint"] = 7815596;

var _vtbl_8bit_qprint = Module["_vtbl_8bit_qprint"] = 7815644;

var _vtbl_qprint_8bit = Module["_vtbl_qprint_8bit"] = 7815672;

var _mbfl_encoding_ascii = Module["_mbfl_encoding_ascii"] = 7823800;

var _mbfl_encoding_8859_1 = Module["_mbfl_encoding_8859_1"] = 7823916;

var _mbfl_encoding_8859_2 = Module["_mbfl_encoding_8859_2"] = 7824032;

var _mbfl_encoding_8859_3 = Module["_mbfl_encoding_8859_3"] = 7824148;

var _mbfl_encoding_8859_4 = Module["_mbfl_encoding_8859_4"] = 7824264;

var _mbfl_encoding_8859_5 = Module["_mbfl_encoding_8859_5"] = 7824380;

var _mbfl_encoding_8859_6 = Module["_mbfl_encoding_8859_6"] = 7824496;

var _mbfl_encoding_8859_7 = Module["_mbfl_encoding_8859_7"] = 7824612;

var _mbfl_encoding_8859_8 = Module["_mbfl_encoding_8859_8"] = 7824728;

var _mbfl_encoding_8859_9 = Module["_mbfl_encoding_8859_9"] = 7824844;

var _mbfl_encoding_8859_10 = Module["_mbfl_encoding_8859_10"] = 7824960;

var _mbfl_encoding_8859_13 = Module["_mbfl_encoding_8859_13"] = 7825072;

var _mbfl_encoding_8859_14 = Module["_mbfl_encoding_8859_14"] = 7825188;

var _mbfl_encoding_8859_15 = Module["_mbfl_encoding_8859_15"] = 7825300;

var _mbfl_encoding_8859_16 = Module["_mbfl_encoding_8859_16"] = 7825412;

var _mbfl_encoding_cp1251 = Module["_mbfl_encoding_cp1251"] = 7825544;

var _mbfl_encoding_cp1252 = Module["_mbfl_encoding_cp1252"] = 7825656;

var _mbfl_encoding_cp1254 = Module["_mbfl_encoding_cp1254"] = 7825784;

var _mbfl_encoding_cp866 = Module["_mbfl_encoding_cp866"] = 7825912;

var _mbfl_encoding_cp850 = Module["_mbfl_encoding_cp850"] = 7826040;

var _mbfl_encoding_koi8r = Module["_mbfl_encoding_koi8r"] = 7826152;

var _mbfl_encoding_koi8u = Module["_mbfl_encoding_koi8u"] = 7826264;

var _mbfl_encoding_armscii8 = Module["_mbfl_encoding_armscii8"] = 7826392;

var _vtbl_ucs2_wchar = Module["_vtbl_ucs2_wchar"] = 7818320;

var _vtbl_wchar_ucs2 = Module["_vtbl_wchar_ucs2"] = 7818348;

var _mbfl_encoding_ucs2 = Module["_mbfl_encoding_ucs2"] = 7818376;

var _vtbl_ucs2be_wchar = Module["_vtbl_ucs2be_wchar"] = 7818432;

var _vtbl_wchar_ucs2be = Module["_vtbl_wchar_ucs2be"] = 7818460;

var _mbfl_encoding_ucs2be = Module["_mbfl_encoding_ucs2be"] = 7818488;

var _vtbl_ucs2le_wchar = Module["_vtbl_ucs2le_wchar"] = 7818544;

var _vtbl_wchar_ucs2le = Module["_vtbl_wchar_ucs2le"] = 7818572;

var _mbfl_encoding_ucs2le = Module["_mbfl_encoding_ucs2le"] = 7818600;

var _vtbl_ucs4_wchar = Module["_vtbl_ucs4_wchar"] = 7817968;

var _vtbl_wchar_ucs4 = Module["_vtbl_wchar_ucs4"] = 7817996;

var _mbfl_encoding_ucs4 = Module["_mbfl_encoding_ucs4"] = 7818024;

var _vtbl_ucs4be_wchar = Module["_vtbl_ucs4be_wchar"] = 7818080;

var _vtbl_wchar_ucs4be = Module["_vtbl_wchar_ucs4be"] = 7818108;

var _mbfl_encoding_ucs4be = Module["_mbfl_encoding_ucs4be"] = 7818136;

var _vtbl_ucs4le_wchar = Module["_vtbl_ucs4le_wchar"] = 7818192;

var _vtbl_wchar_ucs4le = Module["_vtbl_wchar_ucs4le"] = 7818220;

var _mbfl_encoding_ucs4le = Module["_mbfl_encoding_ucs4le"] = 7818248;

var _vtbl_utf16_wchar = Module["_vtbl_utf16_wchar"] = 7818976;

var _vtbl_wchar_utf16 = Module["_vtbl_wchar_utf16"] = 7819004;

var _mbfl_encoding_utf16 = Module["_mbfl_encoding_utf16"] = 7819032;

var _vtbl_utf16be_wchar = Module["_vtbl_utf16be_wchar"] = 7819080;

var _vtbl_wchar_utf16be = Module["_vtbl_wchar_utf16be"] = 7819108;

var _mbfl_encoding_utf16be = Module["_mbfl_encoding_utf16be"] = 7819136;

var _vtbl_utf16le_wchar = Module["_vtbl_utf16le_wchar"] = 7819184;

var _vtbl_wchar_utf16le = Module["_vtbl_wchar_utf16le"] = 7819212;

var _mbfl_encoding_utf16le = Module["_mbfl_encoding_utf16le"] = 7819240;

var _vtbl_utf32_wchar = Module["_vtbl_utf32_wchar"] = 7818656;

var _vtbl_wchar_utf32 = Module["_vtbl_wchar_utf32"] = 7818684;

var _mbfl_encoding_utf32 = Module["_mbfl_encoding_utf32"] = 7818712;

var _vtbl_utf32be_wchar = Module["_vtbl_utf32be_wchar"] = 7818760;

var _vtbl_wchar_utf32be = Module["_vtbl_wchar_utf32be"] = 7818788;

var _mbfl_encoding_utf32be = Module["_mbfl_encoding_utf32be"] = 7818816;

var _vtbl_utf32le_wchar = Module["_vtbl_utf32le_wchar"] = 7818864;

var _vtbl_wchar_utf32le = Module["_vtbl_wchar_utf32le"] = 7818892;

var _mbfl_encoding_utf32le = Module["_mbfl_encoding_utf32le"] = 7818920;

var _vtbl_utf7_wchar = Module["_vtbl_utf7_wchar"] = 7823476;

var _vtbl_wchar_utf7 = Module["_vtbl_wchar_utf7"] = 7823504;

var _mbfl_encoding_utf7 = Module["_mbfl_encoding_utf7"] = 7823532;

var _vtbl_utf7imap_wchar = Module["_vtbl_utf7imap_wchar"] = 7823588;

var _vtbl_wchar_utf7imap = Module["_vtbl_wchar_utf7imap"] = 7823616;

var _mbfl_encoding_utf7imap = Module["_mbfl_encoding_utf7imap"] = 7823644;

var _mblen_table_utf8 = Module["_mblen_table_utf8"] = 3479616;

var _vtbl_utf8_wchar = Module["_vtbl_utf8_wchar"] = 7822908;

var _vtbl_wchar_utf8 = Module["_vtbl_wchar_utf8"] = 7822936;

var _mbfl_encoding_utf8 = Module["_mbfl_encoding_utf8"] = 7822964;

var _vtbl_utf8_docomo_wchar = Module["_vtbl_utf8_docomo_wchar"] = 7823024;

var _vtbl_wchar_utf8_docomo = Module["_vtbl_wchar_utf8_docomo"] = 7823052;

var _mbfl_encoding_utf8_docomo = Module["_mbfl_encoding_utf8_docomo"] = 7823080;

var _vtbl_utf8_kddi_a_wchar = Module["_vtbl_utf8_kddi_a_wchar"] = 7823128;

var _vtbl_wchar_utf8_kddi_a = Module["_vtbl_wchar_utf8_kddi_a"] = 7823156;

var _mbfl_encoding_utf8_kddi_a = Module["_mbfl_encoding_utf8_kddi_a"] = 7823184;

var _vtbl_utf8_kddi_b_wchar = Module["_vtbl_utf8_kddi_b_wchar"] = 7823248;

var _vtbl_wchar_utf8_kddi_b = Module["_vtbl_wchar_utf8_kddi_b"] = 7823276;

var _mbfl_encoding_utf8_kddi_b = Module["_mbfl_encoding_utf8_kddi_b"] = 7823304;

var _vtbl_utf8_sb_wchar = Module["_vtbl_utf8_sb_wchar"] = 7823364;

var _vtbl_wchar_utf8_sb = Module["_vtbl_wchar_utf8_sb"] = 7823392;

var _mbfl_encoding_utf8_sb = Module["_mbfl_encoding_utf8_sb"] = 7823420;

var _mbfl_encoding_uuencode = Module["_mbfl_encoding_uuencode"] = 7815512;

var _vtbl_uuencode_8bit = Module["_vtbl_uuencode_8bit"] = 7815560;

var _vtbl_8bit_wchar = Module["_vtbl_8bit_wchar"] = 7815256;

var _vtbl_wchar_8bit = Module["_vtbl_wchar_8bit"] = 7815284;

var _mbfl_encoding_8bit = Module["_mbfl_encoding_8bit"] = 7815312;

var _mbfl_encoding_pass = Module["_mbfl_encoding_pass"] = 7826776;

var _vtbl_pass = Module["_vtbl_pass"] = 7826824;

var _mbfl_encoding_wchar = Module["_mbfl_encoding_wchar"] = 7815360;

var _mbfl_language_german = Module["_mbfl_language_german"] = 7827280;

var _mbfl_language_english = Module["_mbfl_language_english"] = 7827244;

var _mbfl_language_japanese = Module["_mbfl_language_japanese"] = 7827132;

var _mbfl_language_korean = Module["_mbfl_language_korean"] = 7827160;

var _mbfl_language_neutral = Module["_mbfl_language_neutral"] = 7827420;

var _mbfl_language_russian = Module["_mbfl_language_russian"] = 7827308;

var _mbfl_language_uni = Module["_mbfl_language_uni"] = 7827104;

var _mbfl_language_simplified_chinese = Module["_mbfl_language_simplified_chinese"] = 7827188;

var _mbfl_language_traditional_chinese = Module["_mbfl_language_traditional_chinese"] = 7827216;

var _mbfl_language_armenian = Module["_mbfl_language_armenian"] = 7827364;

var _mbfl_language_turkish = Module["_mbfl_language_turkish"] = 7827392;

var _mbfl_language_ukrainian = Module["_mbfl_language_ukrainian"] = 7827336;

var _mdhtml_globals = Module["_mdhtml_globals"] = 8822584;

var _mdhtml_module_entry = Module["_mdhtml_module_entry"] = 7897368;

var _navicat_module_entry = Module["_navicat_module_entry"] = 7898536;

var _norm_normalizer_ce = Module["_norm_normalizer_ce"] = 8822756;

var _norm_module_entry = Module["_norm_module_entry"] = 7899304;

var _utf8proc_utf8class = Module["_utf8proc_utf8class"] = 3684096;

var _zend_alloc_mmap_handlers = Module["_zend_alloc_mmap_handlers"] = 7899536;

var _accel_blacklist = Module["_accel_blacklist"] = 8827556;

var _opcache_module_entry = Module["_opcache_module_entry"] = 7909916;

var _lock_file = Module["_lock_file"] = 7899548;

var _smm_shared_globals = Module["_smm_shared_globals"] = 8826864;

var _accel_globals = Module["_accel_globals"] = 8827592;

var _accel_shared_globals = Module["_accel_shared_globals"] = 8827572;

var _file_cache_only = Module["_file_cache_only"] = 8827584;

var _accel_startup_ok = Module["_accel_startup_ok"] = 8827576;

var _zps_api_failure_reason = Module["_zps_api_failure_reason"] = 8827580;

var _pdo_dbh_ce = Module["_pdo_dbh_ce"] = 8829756;

var _pdo_exception_ce = Module["_pdo_exception_ce"] = 8829760;

var _pdo_driver_hash = Module["_pdo_driver_hash"] = 8829768;

var _pdo_driver_specific_ce_hash = Module["_pdo_driver_specific_ce_hash"] = 8829824;

var _pdo_module_entry = Module["_pdo_module_entry"] = 7934856;

var _pdo_dbstmt_ce = Module["_pdo_dbstmt_ce"] = 8829880;

var _pdo_row_ce = Module["_pdo_row_ce"] = 8829884;

var _pdo_dbstmt_object_handlers = Module["_pdo_dbstmt_object_handlers"] = 8829440;

var _pdo_row_object_handlers = Module["_pdo_row_object_handlers"] = 8829544;

var _pdo_sqlite_module_entry = Module["_pdo_sqlite_module_entry"] = 7935468;

var _pdo_sqlite_driver = Module["_pdo_sqlite_driver"] = 7935040;

var _sqlite_stmt_methods = Module["_sqlite_stmt_methods"] = 7934992;

var _phar_globals = Module["_phar_globals"] = 883e4;

var _cached_phars = Module["_cached_phars"] = 8830440;

var _cached_alias = Module["_cached_alias"] = 8830384;

var _phar_orig_compile_file = Module["_phar_orig_compile_file"] = 8830496;

var _phar_module_entry = Module["_phar_module_entry"] = 7942048;

var _php_stream_phar_wrapper = Module["_php_stream_phar_wrapper"] = 7942e3;

var _post_message_to_js_functions = Module["_post_message_to_js_functions"] = 7942448;

var _post_message_to_js_module_entry = Module["_post_message_to_js_module_entry"] = 7942504;

var _php_random_algo_mt19937 = Module["_php_random_algo_mt19937"] = 6887564;

var _php_random_algo_pcgoneseq128xslrr64 = Module["_php_random_algo_pcgoneseq128xslrr64"] = 6887584;

var _php_random_algo_secure = Module["_php_random_algo_secure"] = 6887624;

var _php_random_algo_user = Module["_php_random_algo_user"] = 6887644;

var _php_random_algo_xoshiro256starstar = Module["_php_random_algo_xoshiro256starstar"] = 6887604;

var _random_ce_Random_BrokenRandomEngineError = Module["_random_ce_Random_BrokenRandomEngineError"] = 8725568;

var _random_globals = Module["_random_globals"] = 8725572;

var _random_ce_Random_Engine = Module["_random_ce_Random_Engine"] = 8728108;

var _random_ce_Random_CryptoSafeEngine = Module["_random_ce_Random_CryptoSafeEngine"] = 8728112;

var _random_ce_Random_RandomError = Module["_random_ce_Random_RandomError"] = 8728116;

var _random_ce_Random_RandomException = Module["_random_ce_Random_RandomException"] = 8728120;

var _random_ce_Random_Engine_Mt19937 = Module["_random_ce_Random_Engine_Mt19937"] = 8728124;

var _random_ce_Random_Engine_PcgOneseq128XslRr64 = Module["_random_ce_Random_Engine_PcgOneseq128XslRr64"] = 8728232;

var _random_ce_Random_Engine_Xoshiro256StarStar = Module["_random_ce_Random_Engine_Xoshiro256StarStar"] = 8728340;

var _random_ce_Random_Engine_Secure = Module["_random_ce_Random_Engine_Secure"] = 8728448;

var _random_ce_Random_Randomizer = Module["_random_ce_Random_Randomizer"] = 8728556;

var _random_ce_Random_IntervalBoundary = Module["_random_ce_Random_IntervalBoundary"] = 8728664;

var _random_module_entry = Module["_random_module_entry"] = 6887944;

var _reflection_class_ptr = Module["_reflection_class_ptr"] = 8830632;

var _reflection_enum_ptr = Module["_reflection_enum_ptr"] = 8830628;

var _reflection_exception_ptr = Module["_reflection_exception_ptr"] = 8830636;

var _reflection_attribute_ptr = Module["_reflection_attribute_ptr"] = 8830836;

var _reflection_parameter_ptr = Module["_reflection_parameter_ptr"] = 8830792;

var _reflection_extension_ptr = Module["_reflection_extension_ptr"] = 8830828;

var _reflection_function_ptr = Module["_reflection_function_ptr"] = 8830784;

var _reflection_method_ptr = Module["_reflection_method_ptr"] = 8830812;

var _reflection_union_type_ptr = Module["_reflection_union_type_ptr"] = 8830804;

var _reflection_intersection_type_ptr = Module["_reflection_intersection_type_ptr"] = 8830808;

var _reflection_named_type_ptr = Module["_reflection_named_type_ptr"] = 8830800;

var _reflection_property_ptr = Module["_reflection_property_ptr"] = 8830820;

var _reflection_class_constant_ptr = Module["_reflection_class_constant_ptr"] = 8830824;

var _reflection_property_hook_type_ptr = Module["_reflection_property_hook_type_ptr"] = 8830640;

var _reflection_reference_ptr = Module["_reflection_reference_ptr"] = 8830644;

var _reflection_globals = Module["_reflection_globals"] = 8830648;

var _reflection_enum_unit_case_ptr = Module["_reflection_enum_unit_case_ptr"] = 8830840;

var _reflection_enum_backed_case_ptr = Module["_reflection_enum_backed_case_ptr"] = 8830844;

var _reflection_ptr = Module["_reflection_ptr"] = 8830772;

var _reflector_ptr = Module["_reflector_ptr"] = 8830776;

var _reflection_function_abstract_ptr = Module["_reflection_function_abstract_ptr"] = 8830780;

var _reflection_generator_ptr = Module["_reflection_generator_ptr"] = 8830788;

var _reflection_type_ptr = Module["_reflection_type_ptr"] = 8830796;

var _reflection_object_ptr = Module["_reflection_object_ptr"] = 8830816;

var _reflection_zend_extension_ptr = Module["_reflection_zend_extension_ptr"] = 8830832;

var _reflection_fiber_ptr = Module["_reflection_fiber_ptr"] = 8830848;

var _reflection_constant_ptr = Module["_reflection_constant_ptr"] = 8830852;

var _reflection_module_entry = Module["_reflection_module_entry"] = 7946736;

var _ce_SimpleXMLElement = Module["_ce_SimpleXMLElement"] = 8830856;

var _ce_SimpleXMLIterator = Module["_ce_SimpleXMLIterator"] = 8830964;

var _simplexml_module_entry = Module["_simplexml_module_entry"] = 7957808;

var _socket_ce = Module["_socket_ce"] = 8831040;

var _address_info_ce = Module["_address_info_ce"] = 8831044;

var _sockets_globals = Module["_sockets_globals"] = 8831032;

var _sockets_module_entry = Module["_sockets_module_entry"] = 7961464;

var _empty_key_value_list = Module["_empty_key_value_list"] = 4031644;

var _spl_module_entry = Module["_spl_module_entry"] = 7928672;

var _spl_ce_ArrayIterator = Module["_spl_ce_ArrayIterator"] = 8828064;

var _spl_ce_ArrayObject = Module["_spl_ce_ArrayObject"] = 8828068;

var _spl_ce_RecursiveArrayIterator = Module["_spl_ce_RecursiveArrayIterator"] = 8828176;

var _spl_ce_SplFileObject = Module["_spl_ce_SplFileObject"] = 8828468;

var _spl_ce_SplFileInfo = Module["_spl_ce_SplFileInfo"] = 8828472;

var _spl_ce_DirectoryIterator = Module["_spl_ce_DirectoryIterator"] = 8828580;

var _spl_ce_RecursiveDirectoryIterator = Module["_spl_ce_RecursiveDirectoryIterator"] = 8828588;

var _spl_ce_FilesystemIterator = Module["_spl_ce_FilesystemIterator"] = 8828584;

var _spl_ce_GlobIterator = Module["_spl_ce_GlobIterator"] = 8828696;

var _spl_ce_SplTempFileObject = Module["_spl_ce_SplTempFileObject"] = 8828700;

var _spl_ce_SplDoublyLinkedList = Module["_spl_ce_SplDoublyLinkedList"] = 8828928;

var _spl_ce_SplQueue = Module["_spl_ce_SplQueue"] = 8829036;

var _spl_ce_SplStack = Module["_spl_ce_SplStack"] = 8829040;

var _spl_ce_LogicException = Module["_spl_ce_LogicException"] = 8828012;

var _spl_ce_BadFunctionCallException = Module["_spl_ce_BadFunctionCallException"] = 8828016;

var _spl_ce_BadMethodCallException = Module["_spl_ce_BadMethodCallException"] = 8828020;

var _spl_ce_DomainException = Module["_spl_ce_DomainException"] = 8828024;

var _spl_ce_InvalidArgumentException = Module["_spl_ce_InvalidArgumentException"] = 8828028;

var _spl_ce_LengthException = Module["_spl_ce_LengthException"] = 8828032;

var _spl_ce_OutOfRangeException = Module["_spl_ce_OutOfRangeException"] = 8828036;

var _spl_ce_RuntimeException = Module["_spl_ce_RuntimeException"] = 8828040;

var _spl_ce_OutOfBoundsException = Module["_spl_ce_OutOfBoundsException"] = 8828044;

var _spl_ce_OverflowException = Module["_spl_ce_OverflowException"] = 8828048;

var _spl_ce_RangeException = Module["_spl_ce_RangeException"] = 8828052;

var _spl_ce_UnderflowException = Module["_spl_ce_UnderflowException"] = 8828056;

var _spl_ce_UnexpectedValueException = Module["_spl_ce_UnexpectedValueException"] = 8828060;

var _spl_ce_SplFixedArray = Module["_spl_ce_SplFixedArray"] = 8829044;

var _spl_ce_SplHeap = Module["_spl_ce_SplHeap"] = 8829152;

var _spl_ce_SplPriorityQueue = Module["_spl_ce_SplPriorityQueue"] = 8829156;

var _spl_ce_SplMinHeap = Module["_spl_ce_SplMinHeap"] = 8829264;

var _spl_ce_SplMaxHeap = Module["_spl_ce_SplMaxHeap"] = 8829268;

var _spl_ce_RecursiveIteratorIterator = Module["_spl_ce_RecursiveIteratorIterator"] = 8828180;

var _spl_ce_RecursiveCachingIterator = Module["_spl_ce_RecursiveCachingIterator"] = 8828228;

var _spl_ce_RecursiveIterator = Module["_spl_ce_RecursiveIterator"] = 8828200;

var _spl_ce_RecursiveTreeIterator = Module["_spl_ce_RecursiveTreeIterator"] = 8828184;

var _spl_ce_FilterIterator = Module["_spl_ce_FilterIterator"] = 8828188;

var _spl_ce_CallbackFilterIterator = Module["_spl_ce_CallbackFilterIterator"] = 8828192;

var _spl_ce_RecursiveCallbackFilterIterator = Module["_spl_ce_RecursiveCallbackFilterIterator"] = 8828196;

var _spl_ce_RecursiveFilterIterator = Module["_spl_ce_RecursiveFilterIterator"] = 8828204;

var _spl_ce_ParentIterator = Module["_spl_ce_ParentIterator"] = 8828208;

var _spl_ce_RegexIterator = Module["_spl_ce_RegexIterator"] = 8828212;

var _spl_ce_RecursiveRegexIterator = Module["_spl_ce_RecursiveRegexIterator"] = 8828216;

var _spl_ce_LimitIterator = Module["_spl_ce_LimitIterator"] = 8828220;

var _spl_ce_SeekableIterator = Module["_spl_ce_SeekableIterator"] = 8828460;

var _spl_ce_CachingIterator = Module["_spl_ce_CachingIterator"] = 8828224;

var _spl_ce_IteratorIterator = Module["_spl_ce_IteratorIterator"] = 8828232;

var _spl_ce_NoRewindIterator = Module["_spl_ce_NoRewindIterator"] = 8828236;

var _spl_ce_InfiniteIterator = Module["_spl_ce_InfiniteIterator"] = 8828240;

var _spl_ce_AppendIterator = Module["_spl_ce_AppendIterator"] = 8828244;

var _spl_ce_OuterIterator = Module["_spl_ce_OuterIterator"] = 8828248;

var _spl_ce_EmptyIterator = Module["_spl_ce_EmptyIterator"] = 8828464;

var _spl_ce_SplObjectStorage = Module["_spl_ce_SplObjectStorage"] = 8828704;

var _spl_ce_SplObserver = Module["_spl_ce_SplObserver"] = 8828708;

var _spl_ce_SplSubject = Module["_spl_ce_SplSubject"] = 8828712;

var _spl_ce_MultipleIterator = Module["_spl_ce_MultipleIterator"] = 8828924;

var _array_globals = Module["_array_globals"] = 8725560;

var _assert_globals = Module["_assert_globals"] = 8725528;

var _assertion_error_ce = Module["_assertion_error_ce"] = 8725552;

var _basic_globals = Module["_basic_globals"] = 8807352;

var _basic_functions_module = Module["_basic_functions_module"] = 7684684;

var _browscap_globals = Module["_browscap_globals"] = 8728668;

var _dir_globals = Module["_dir_globals"] = 8806816;

var _pathsep_str = Module["_pathsep_str"] = 8806822;

var _dirsep_str = Module["_dirsep_str"] = 8806820;

var _file_globals = Module["_file_globals"] = 8832552;

var _php_stream_ftp_wrapper = Module["_php_stream_ftp_wrapper"] = 7669556;

var _php_stream_http_wrapper = Module["_php_stream_http_wrapper"] = 7669500;

var _php_sig_gif = Module["_php_sig_gif"] = 1610288;

var _php_sig_psd = Module["_php_sig_psd"] = 1610291;

var _php_sig_bmp = Module["_php_sig_bmp"] = 1610295;

var _php_sig_swf = Module["_php_sig_swf"] = 1610297;

var _php_sig_swc = Module["_php_sig_swc"] = 1610300;

var _php_sig_jpg = Module["_php_sig_jpg"] = 1610303;

var _php_sig_png = Module["_php_sig_png"] = 1610306;

var _php_sig_tif_ii = Module["_php_sig_tif_ii"] = 1610314;

var _php_sig_tif_mm = Module["_php_sig_tif_mm"] = 1610318;

var _php_sig_jpc = Module["_php_sig_jpc"] = 1610322;

var _php_sig_jp2 = Module["_php_sig_jp2"] = 1610325;

var _php_sig_iff = Module["_php_sig_iff"] = 1610337;

var _php_sig_ico = Module["_php_sig_ico"] = 1610341;

var _php_sig_riff = Module["_php_sig_riff"] = 1610345;

var _php_sig_webp = Module["_php_sig_webp"] = 1610349;

var _php_sig_ftyp = Module["_php_sig_ftyp"] = 1610353;

var _php_sig_mif1 = Module["_php_sig_mif1"] = 1610357;

var _php_sig_heic = Module["_php_sig_heic"] = 1610361;

var _php_sig_heix = Module["_php_sig_heix"] = 1610365;

var _php_tiff_bytes_per_format = Module["_php_tiff_bytes_per_format"] = 1610384;

var _php_ce_incomplete_class = Module["_php_ce_incomplete_class"] = 8725524;

var _rounding_mode_ce = Module["_rounding_mode_ce"] = 8725556;

var _php_password_algo_bcrypt = Module["_php_password_algo_bcrypt"] = 6890116;

var _php_stream_php_wrapper = Module["_php_stream_php_wrapper"] = 6890952;

var _tokenizer_module_entry = Module["_tokenizer_module_entry"] = 7964100;

var _php_uri_ce_rfc3986_uri = Module["_php_uri_ce_rfc3986_uri"] = 8807092;

var _php_uri_ce_whatwg_invalid_url_exception = Module["_php_uri_ce_whatwg_invalid_url_exception"] = 8807080;

var _php_uri_ce_whatwg_url_validation_error = Module["_php_uri_ce_whatwg_url_validation_error"] = 8807084;

var _php_uri_ce_whatwg_url_validation_error_type = Module["_php_uri_ce_whatwg_url_validation_error_type"] = 8807088;

var _php_uri_ce_whatwg_url = Module["_php_uri_ce_whatwg_url"] = 8807100;

var _php_uri_ce_comparison_mode = Module["_php_uri_ce_comparison_mode"] = 8807096;

var _php_uri_ce_error = Module["_php_uri_ce_error"] = 8807108;

var _php_uri_ce_exception = Module["_php_uri_ce_exception"] = 8807104;

var _php_uri_ce_invalid_uri_exception = Module["_php_uri_ce_invalid_uri_exception"] = 8807112;

var _uri_module_entry = Module["_uri_module_entry"] = 7666572;

var _php_uri_parser_rfc3986 = Module["_php_uri_parser_rfc3986"] = 6891200;

var _php_uri_parser_whatwg = Module["_php_uri_parser_whatwg"] = 7666288;

var _php_uri_parser_php_parse_url = Module["_php_uri_parser_php_parse_url"] = 7666488;

var _uriSafeToPointToA = Module["_uriSafeToPointToA"] = 6891152;

var _uriConstPwdA = Module["_uriConstPwdA"] = 6891156;

var _uriConstParentA = Module["_uriConstParentA"] = 6891160;

var _uriSafeToPointToW = Module["_uriSafeToPointToW"] = 6891164;

var _uriConstPwdW = Module["_uriConstPwdW"] = 6891168;

var _uriConstParentW = Module["_uriConstParentW"] = 6891172;

var _defaultMemoryManager = Module["_defaultMemoryManager"] = 6891128;

var _wasm_memory_storage_struct = Module["_wasm_memory_storage_struct"] = 7964592;

var _wasm_memory_storage_module_entry = Module["_wasm_memory_storage_module_entry"] = 7964612;

var _xml_globals = Module["_xml_globals"] = 8831260;

var _xml_module_entry = Module["_xml_module_entry"] = 7965892;

var _xmlreader_class_entry = Module["_xmlreader_class_entry"] = 8831384;

var _xmlreader_module_entry = Module["_xmlreader_module_entry"] = 7966656;

var _xmlwriter_module_entry = Module["_xmlwriter_module_entry"] = 7969796;

var _yaml_globals = Module["_yaml_globals"] = 8831840;

var _yaml_module_entry = Module["_yaml_module_entry"] = 7973976;

var _zip_module_entry = Module["_zip_module_entry"] = 7975220;

var _php_stream_zipio_seek_ops = Module["_php_stream_zipio_seek_ops"] = 7974780;

var _php_stream_zipio_ops = Module["_php_stream_zipio_ops"] = 7974816;

var _php_stream_zip_wrapper = Module["_php_stream_zip_wrapper"] = 7974896;

var _php_optidx = Module["_php_optidx"] = 7669604;

var _php_build_date = Module["_php_build_date"] = 4031856;

var _core_globals = Module["_core_globals"] = 8832064;

var _php_register_internal_extensions_func = Module["_php_register_internal_extensions_func"] = 7979628;

var _php_internal_encoding_changed = Module["_php_internal_encoding_changed"] = 8832544;

var _output_globals = Module["_output_globals"] = 8808376;

var _php_output_default_handler_name = Module["_php_output_default_handler_name"] = 2537552;

var _php_output_devnull_handler_name = Module["_php_output_devnull_handler_name"] = 2537584;

var _php_ini_opened_path = Module["_php_ini_opened_path"] = 8724672;

var _php_ini_scanned_path = Module["_php_ini_scanned_path"] = 8724676;

var _php_ini_scanned_files = Module["_php_ini_scanned_files"] = 8724680;

var _php_import_environment_variables = Module["_php_import_environment_variables"] = 6699424;

var _php_load_environment_variables = Module["_php_load_environment_variables"] = 6699428;

var _php_rfc1867_callback = Module["_php_rfc1867_callback"] = 8719828;

var _sapi_module = Module["_sapi_module"] = 8719840;

var _sapi_globals = Module["_sapi_globals"] = 8719992;

var _php_glob_stream_ops = Module["_php_glob_stream_ops"] = 6891036;

var _php_glob_stream_wrapper = Module["_php_glob_stream_wrapper"] = 6891116;

var _php_stream_memory_ops = Module["_php_stream_memory_ops"] = 6702800;

var _php_stream_temp_ops = Module["_php_stream_temp_ops"] = 6702836;

var _php_stream_rfc2397_ops = Module["_php_stream_rfc2397_ops"] = 6702872;

var _php_stream_rfc2397_wops = Module["_php_stream_rfc2397_wops"] = 6702908;

var _php_stream_rfc2397_wrapper = Module["_php_stream_rfc2397_wrapper"] = 6702952;

var _php_stream_stdio_ops = Module["_php_stream_stdio_ops"] = 7982960;

var _php_plain_files_wrapper = Module["_php_plain_files_wrapper"] = 7982948;

var _php_stream_userspace_ops = Module["_php_stream_userspace_ops"] = 6890652;

var _php_stream_userspace_dir_ops = Module["_php_stream_userspace_dir_ops"] = 6890688;

var _php_stream_socket_ops = Module["_php_stream_socket_ops"] = 6890760;

var _php_stream_generic_socket_ops = Module["_php_stream_generic_socket_ops"] = 6890724;

var _zend_func_info_rid = Module["_zend_func_info_rid"] = 7900784;

var _zend_optimizer_registered_passes = Module["_zend_optimizer_registered_passes"] = 8827424;

var _zend_dl_use_deepbind = Module["_zend_dl_use_deepbind"] = 8835020;

var _module_registry = Module["_module_registry"] = 8835024;

var _zend_ast_process = Module["_zend_ast_process"] = 8719648;

var _zend_ce_sensitive_parameter_value = Module["_zend_ce_sensitive_parameter_value"] = 8718616;

var _zend_ce_deprecated = Module["_zend_ce_deprecated"] = 8718620;

var _zend_ce_nodiscard = Module["_zend_ce_nodiscard"] = 8718624;

var _zend_ce_attribute = Module["_zend_ce_attribute"] = 8718628;

var _zend_ce_return_type_will_change_attribute = Module["_zend_ce_return_type_will_change_attribute"] = 8718688;

var _zend_ce_allow_dynamic_properties = Module["_zend_ce_allow_dynamic_properties"] = 8718692;

var _zend_ce_sensitive_parameter = Module["_zend_ce_sensitive_parameter"] = 8718696;

var _zend_ce_override = Module["_zend_ce_override"] = 8718804;

var _zend_ce_delayed_target_validation = Module["_zend_ce_delayed_target_validation"] = 8718808;

var _zend_ce_closure = Module["_zend_ce_closure"] = 8832940;

var _compiler_globals = Module["_compiler_globals"] = 8836648;

var _executor_globals = Module["_executor_globals"] = 8837064;

var _zend_compile_file = Module["_zend_compile_file"] = 8838480;

var _zend_compile_string = Module["_zend_compile_string"] = 8838484;

var _zend_ce_unit_enum = Module["_zend_ce_unit_enum"] = 8719536;

var _zend_ce_backed_enum = Module["_zend_ce_backed_enum"] = 8719540;

var _zend_enum_object_handlers = Module["_zend_enum_object_handlers"] = 8719544;

var _zend_ce_exception = Module["_zend_ce_exception"] = 8833068;

var _zend_ce_error = Module["_zend_ce_error"] = 8833192;

var _zend_ce_parse_error = Module["_zend_ce_parse_error"] = 8833056;

var _zend_ce_compile_error = Module["_zend_ce_compile_error"] = 8833060;

var _zend_throw_exception_hook = Module["_zend_throw_exception_hook"] = 8833064;

var _zend_ce_throwable = Module["_zend_ce_throwable"] = 8833072;

var _zend_ce_type_error = Module["_zend_ce_type_error"] = 8833076;

var _zend_ce_argument_count_error = Module["_zend_ce_argument_count_error"] = 8833080;

var _zend_ce_error_exception = Module["_zend_ce_error_exception"] = 8833188;

var _zend_ce_value_error = Module["_zend_ce_value_error"] = 8833196;

var _zend_ce_arithmetic_error = Module["_zend_ce_arithmetic_error"] = 8833200;

var _zend_ce_division_by_zero_error = Module["_zend_ce_division_by_zero_error"] = 8833204;

var _zend_ce_unhandled_match_error = Module["_zend_ce_unhandled_match_error"] = 8833208;

var _zend_ce_request_parse_body_exception = Module["_zend_ce_request_parse_body_exception"] = 8833212;

var _zend_execute_ex = Module["_zend_execute_ex"] = 8835008;

var _zend_execute_internal = Module["_zend_execute_internal"] = 8835012;

var _zend_autoload = Module["_zend_autoload"] = 8835016;

var _zend_pass_function = Module["_zend_pass_function"] = 7985040;

var _zend_touch_vm_stack_data = Module["_zend_touch_vm_stack_data"] = 8833952;

var _zend_extensions = Module["_zend_extensions"] = 8832908;

var _zend_extension_flags = Module["_zend_extension_flags"] = 8832896;

var _zend_internal_function_extension_handles = Module["_zend_internal_function_extension_handles"] = 8832904;

var _zend_op_array_extension_handles = Module["_zend_op_array_extension_handles"] = 8832900;

var _zend_ce_fiber = Module["_zend_ce_fiber"] = 8830512;

var _zend_flf_count = Module["_zend_flf_count"] = 8827240;

var _zend_flf_capacity = Module["_zend_flf_capacity"] = 8827244;

var _zend_flf_handlers = Module["_zend_flf_handlers"] = 8827248;

var _zend_flf_functions = Module["_zend_flf_functions"] = 8827252;

var _gc_collect_cycles = Module["_gc_collect_cycles"] = 8835408;

var ___jit_debug_descriptor = Module["___jit_debug_descriptor"] = 8711984;

var _zend_ce_generator = Module["_zend_ce_generator"] = 8827256;

var _zend_ce_ClosedGeneratorException = Module["_zend_ce_ClosedGeneratorException"] = 8827260;

var _zend_empty_array = Module["_zend_empty_array"] = 8000352;

var _zend_inheritance_cache_add = Module["_zend_inheritance_cache_add"] = 8833052;

var _zend_inheritance_cache_get = Module["_zend_inheritance_cache_get"] = 8833048;

var _ini_scanner_globals = Module["_ini_scanner_globals"] = 8724608;

var _zend_ce_internal_iterator = Module["_zend_ce_internal_iterator"] = 8719192;

var _zend_ce_traversable = Module["_zend_ce_traversable"] = 8719196;

var _zend_ce_aggregate = Module["_zend_ce_aggregate"] = 8719200;

var _zend_ce_iterator = Module["_zend_ce_iterator"] = 8719204;

var _zend_ce_serializable = Module["_zend_ce_serializable"] = 8719208;

var _zend_ce_arrayaccess = Module["_zend_ce_arrayaccess"] = 8719212;

var _zend_ce_countable = Module["_zend_ce_countable"] = 8719216;

var _zend_ce_stringable = Module["_zend_ce_stringable"] = 8719220;

var _language_scanner_globals = Module["_language_scanner_globals"] = 8719652;

var _le_index_ptr = Module["_le_index_ptr"] = 8838544;

var _zend_multibyte_encoding_utf32be = Module["_zend_multibyte_encoding_utf32be"] = 6702652;

var _zend_multibyte_encoding_utf32le = Module["_zend_multibyte_encoding_utf32le"] = 6702656;

var _zend_multibyte_encoding_utf16be = Module["_zend_multibyte_encoding_utf16be"] = 6702660;

var _zend_multibyte_encoding_utf16le = Module["_zend_multibyte_encoding_utf16le"] = 6702664;

var _zend_multibyte_encoding_utf8 = Module["_zend_multibyte_encoding_utf8"] = 6702668;

var _std_object_handlers = Module["_std_object_handlers"] = 7983744;

var _zend_observer_fcall_internal_function_extension = Module["_zend_observer_fcall_internal_function_extension"] = 8719528;

var _zend_observer_fcall_op_array_extension = Module["_zend_observer_fcall_op_array_extension"] = 8719524;

var _zend_observer_function_declared_observed = Module["_zend_observer_function_declared_observed"] = 8719532;

var _zend_observer_class_linked_observed = Module["_zend_observer_class_linked_observed"] = 8719533;

var _zend_observer_errors_observed = Module["_zend_observer_errors_observed"] = 8719534;

var _zend_tolower_map = Module["_zend_tolower_map"] = 4033824;

var _zend_toupper_map = Module["_zend_toupper_map"] = 4034080;

var _zend_signal_globals = Module["_zend_signal_globals"] = 8808584;

var _zend_empty_string = Module["_zend_empty_string"] = 8835412;

var _zend_known_strings = Module["_zend_known_strings"] = 8835416;

var _zend_string_init_interned = Module["_zend_string_init_interned"] = 8835484;

var _zend_new_interned_string = Module["_zend_new_interned_string"] = 8835480;

var _zend_string_init_existing_interned = Module["_zend_string_init_existing_interned"] = 8835488;

var _zend_one_char_string = Module["_zend_one_char_string"] = 8835504;

var _zend_system_id = Module["_zend_system_id"] = 8832864;

var _cwd_globals = Module["_cwd_globals"] = 8720480;

var _zend_ce_weakref = Module["_zend_ce_weakref"] = 8835100;

var _zend_printf_to_smart_string = Module["_zend_printf_to_smart_string"] = 8836556;

var _zend_printf_to_smart_str = Module["_zend_printf_to_smart_str"] = 8836560;

var _zend_write = Module["_zend_write"] = 8836564;

var _zend_random_bytes = Module["_zend_random_bytes"] = 8836548;

var _zend_random_bytes_insecure = Module["_zend_random_bytes_insecure"] = 8836552;

var _zend_error_cb = Module["_zend_error_cb"] = 8836568;

var _zend_printf = Module["_zend_printf"] = 8836572;

var _zend_fopen = Module["_zend_fopen"] = 8836576;

var _zend_stream_open_function = Module["_zend_stream_open_function"] = 8836580;

var _zend_ticks_function = Module["_zend_ticks_function"] = 8836592;

var _zend_on_timeout = Module["_zend_on_timeout"] = 8836596;

var _zend_getenv = Module["_zend_getenv"] = 8836600;

var _zend_interrupt_function = Module["_zend_interrupt_function"] = 8836608;

var _zend_resolve_path = Module["_zend_resolve_path"] = 8836604;

var _zend_map_ptr_static_size = Module["_zend_map_ptr_static_size"] = 8836620;

var _zend_post_startup_cb = Module["_zend_post_startup_cb"] = 8836536;

var _zend_map_ptr_static_last = Module["_zend_map_ptr_static_last"] = 8836632;

var _zend_uv = Module["_zend_uv"] = 8836636;

var _zend_standard_class_def = Module["_zend_standard_class_def"] = 8836532;

var _zend_post_shutdown_cb = Module["_zend_post_shutdown_cb"] = 8836540;

var _zend_accel_schedule_restart_hook = Module["_zend_accel_schedule_restart_hook"] = 8836544;

var _zend_dtrace_enabled = Module["_zend_dtrace_enabled"] = 8836637;

var _php_embed_module = Module["_php_embed_module"] = 8711728;

var ___table_base = Module["___table_base"] = 1;

var _stderr = Module["_stderr"] = 8710960;

var _stdout = Module["_stdout"] = 8711264;

var _environ = Module["_environ"] = 9214076;

var _stdin = Module["_stdin"] = 8711112;

var __playground_zend_side_module_data_exports = Module["__playground_zend_side_module_data_exports"] = 8002064;

var __playground_zend_side_module_function_exports = Module["__playground_zend_side_module_function_exports"] = 8002160;

var _daylight = Module["_daylight"] = 9214088;

var _timezone = Module["_timezone"] = 9214084;

var _tzname = Module["_tzname"] = 9214092;

var _optind = Module["_optind"] = 8712100;

var _optarg = Module["_optarg"] = 9228468;

var ___heap_base = 10277104;

var wasmImports = {
  /** @export */ __assert_fail: ___assert_fail,
  /** @export */ __asyncjs__js_module_onMessage,
  /** @export */ __asyncjs__js_popen_to_file,
  /** @export */ __asyncjs__wasm_poll_socket,
  /** @export */ __call_sighandler: ___call_sighandler,
  /** @export */ __syscall_accept4: ___syscall_accept4,
  /** @export */ __syscall_bind: ___syscall_bind,
  /** @export */ __syscall_chdir: ___syscall_chdir,
  /** @export */ __syscall_chmod: ___syscall_chmod,
  /** @export */ __syscall_connect: ___syscall_connect,
  /** @export */ __syscall_dup: ___syscall_dup,
  /** @export */ __syscall_dup3: ___syscall_dup3,
  /** @export */ __syscall_faccessat: ___syscall_faccessat,
  /** @export */ __syscall_fadvise64: ___syscall_fadvise64,
  /** @export */ __syscall_fallocate: ___syscall_fallocate,
  /** @export */ __syscall_fchmod: ___syscall_fchmod,
  /** @export */ __syscall_fchmodat2: ___syscall_fchmodat2,
  /** @export */ __syscall_fchown32: ___syscall_fchown32,
  /** @export */ __syscall_fchownat: ___syscall_fchownat,
  /** @export */ __syscall_fcntl64: ___syscall_fcntl64,
  /** @export */ __syscall_fdatasync: ___syscall_fdatasync,
  /** @export */ __syscall_fstat64: ___syscall_fstat64,
  /** @export */ __syscall_ftruncate64: ___syscall_ftruncate64,
  /** @export */ __syscall_getcwd: ___syscall_getcwd,
  /** @export */ __syscall_getdents64: ___syscall_getdents64,
  /** @export */ __syscall_getpeername: ___syscall_getpeername,
  /** @export */ __syscall_getsockname: ___syscall_getsockname,
  /** @export */ __syscall_getsockopt: ___syscall_getsockopt,
  /** @export */ __syscall_ioctl: ___syscall_ioctl,
  /** @export */ __syscall_listen: ___syscall_listen,
  /** @export */ __syscall_lstat64: ___syscall_lstat64,
  /** @export */ __syscall_mkdirat: ___syscall_mkdirat,
  /** @export */ __syscall_mknodat: ___syscall_mknodat,
  /** @export */ __syscall_newfstatat: ___syscall_newfstatat,
  /** @export */ __syscall_openat: ___syscall_openat,
  /** @export */ __syscall_pipe: ___syscall_pipe,
  /** @export */ __syscall_poll: ___syscall_poll,
  /** @export */ __syscall_readlinkat: ___syscall_readlinkat,
  /** @export */ __syscall_recvfrom: ___syscall_recvfrom,
  /** @export */ __syscall_recvmsg: ___syscall_recvmsg,
  /** @export */ __syscall_renameat: ___syscall_renameat,
  /** @export */ __syscall_rmdir: ___syscall_rmdir,
  /** @export */ __syscall_sendmsg: ___syscall_sendmsg,
  /** @export */ __syscall_sendto: ___syscall_sendto,
  /** @export */ __syscall_socket: ___syscall_socket,
  /** @export */ __syscall_stat64: ___syscall_stat64,
  /** @export */ __syscall_statfs64: ___syscall_statfs64,
  /** @export */ __syscall_symlinkat: ___syscall_symlinkat,
  /** @export */ __syscall_truncate64: ___syscall_truncate64,
  /** @export */ __syscall_unlinkat: ___syscall_unlinkat,
  /** @export */ __syscall_utimensat: ___syscall_utimensat,
  /** @export */ _abort_js: __abort_js,
  /** @export */ _dlopen_js: __dlopen_js,
  /** @export */ _dlsym_js: __dlsym_js,
  /** @export */ _emscripten_lookup_name: __emscripten_lookup_name,
  /** @export */ _emscripten_runtime_keepalive_clear: __emscripten_runtime_keepalive_clear,
  /** @export */ _emscripten_system: __emscripten_system,
  /** @export */ _gmtime_js: __gmtime_js,
  /** @export */ _localtime_js: __localtime_js,
  /** @export */ _mktime_js: __mktime_js,
  /** @export */ _mmap_js: __mmap_js,
  /** @export */ _munmap_js: __munmap_js,
  /** @export */ _setitimer_js: __setitimer_js,
  /** @export */ _timegm_js: __timegm_js,
  /** @export */ _tzset_js: __tzset_js,
  /** @export */ clock_time_get: _clock_time_get,
  /** @export */ emscripten_date_now: _emscripten_date_now,
  /** @export */ emscripten_get_heap_max: _emscripten_get_heap_max,
  /** @export */ emscripten_get_now: _emscripten_get_now,
  /** @export */ emscripten_resize_heap: _emscripten_resize_heap,
  /** @export */ emscripten_sleep: _emscripten_sleep,
  /** @export */ environ_get: _environ_get,
  /** @export */ environ_sizes_get: _environ_sizes_get,
  /** @export */ exit: _exit,
  /** @export */ fd_close: _fd_close,
  /** @export */ fd_fdstat_get: _fd_fdstat_get,
  /** @export */ fd_pwrite: _fd_pwrite,
  /** @export */ fd_read: _fd_read,
  /** @export */ fd_seek: _fd_seek,
  /** @export */ fd_sync: _fd_sync,
  /** @export */ fd_write: _fd_write,
  /** @export */ getaddrinfo: _getaddrinfo,
  /** @export */ getcontext: _getcontext,
  /** @export */ getdtablesize: _getdtablesize,
  /** @export */ getnameinfo: _getnameinfo,
  /** @export */ getprotobyname: _getprotobyname,
  /** @export */ getprotobynumber: _getprotobynumber,
  /** @export */ js_fd_read,
  /** @export */ js_flock: _js_flock,
  /** @export */ js_getpid: _js_getpid,
  /** @export */ js_open_process: _js_open_process,
  /** @export */ js_popen_clear_pid_for_fd: _js_popen_clear_pid_for_fd,
  /** @export */ js_popen_get_pid_for_fd: _js_popen_get_pid_for_fd,
  /** @export */ js_popen_set_pid_for_fd: _js_popen_set_pid_for_fd,
  /** @export */ js_process_status: _js_process_status,
  /** @export */ js_release_file_locks: _js_release_file_locks,
  /** @export */ js_setsockopt: _js_setsockopt,
  /** @export */ js_waitpid: _js_waitpid,
  /** @export */ js_wasm_trace: _js_wasm_trace,
  /** @export */ makecontext: _makecontext,
  /** @export */ proc_exit: _proc_exit,
  /** @export */ random_get: _random_get,
  /** @export */ strptime: _strptime,
  /** @export */ swapcontext: _swapcontext,
  /** @export */ wasm_close: _wasm_close,
  /** @export */ wasm_shutdown: _wasm_shutdown
};

if (typeof _emscripten_asm_const_int === "function") { wasmImports["emscripten_asm_const_int"] = _emscripten_asm_const_int; }
// include: postamble.js
// === Auto-generated postamble setup entry stuff ===
async function callMain(args = []) {
  var entryFunction = resolveGlobalSymbol("main").sym;
  // Main modules can't tell if they have main() at compile time, since it may
  // arrive from a dynamic library.
  if (!entryFunction) return;
  args.unshift(thisProgram);
  var argc = args.length;
  var argv = stackAlloc((argc + 1) * 4);
  var argv_ptr = argv;
  for (var arg of args) {
    HEAPU32[((argv_ptr) >> 2)] = stringToUTF8OnStack(arg);
    argv_ptr += 4;
  }
  HEAPU32[((argv_ptr) >> 2)] = 0;
  try {
    var ret = entryFunction(argc, argv);
    // The current spec of JSPI returns a promise only if the function suspends
    // and a plain value otherwise. This will likely change:
    // https://github.com/WebAssembly/js-promise-integration/issues/11
    ret = await ret;
    // if we're not running an evented main loop, it's time to exit
    exitJS(ret, /* implicit = */ true);
    return ret;
  } catch (e) {
    return handleException(e);
  }
}

function run(args = arguments_) {
  if (runDependencies > 0) {
    dependenciesFulfilled = run;
    return;
  }
  preRun();
  // a preRun added a dependency, run will be called later
  if (runDependencies > 0) {
    dependenciesFulfilled = run;
    return;
  }
  async function doRun() {
    // run may have just been called through dependencies being fulfilled just in this very frame,
    // or while the async setStatus time below was happening
    Module["calledRun"] = true;
    if (ABORT) return;
    initRuntime();
    preMain();
    Module["onRuntimeInitialized"]?.();
    var noInitialRun = Module["noInitialRun"] || true;
    if (!noInitialRun) await callMain(args);
    postRun();
  }
  if (Module["setStatus"]) {
    Module["setStatus"]("Running...");
    setTimeout(() => {
      setTimeout(() => Module["setStatus"](""), 1);
      doRun();
    }, 1);
  } else {
    doRun();
  }
}

var wasmExports;

// With async instantation wasmExports is assigned asynchronously when the
// instance is received.
createWasm();

run();
/**
 * Emscripten resolves `localhost` to a random IP address. Let's
 * make it always resolve to 127.0.0.1.
 */
DNS.address_map.addrs.localhost = '127.0.0.1';

/**
 * Debugging Asyncify errors is tricky because the stack trace is lost when the
 * error is thrown. This code saves the stack trace in a global variable
 * so that it can be inspected later.
 */
PHPLoader.debug = 'debug' in PHPLoader ? PHPLoader.debug : true;
if (PHPLoader.debug && typeof Asyncify !== "undefined") {
    const originalHandleSleep = Asyncify.handleSleep;
    Asyncify.handleSleep = function (startAsync) {
        if (!ABORT) {
            Module["lastAsyncifyStackSource"] = new Error();
        }
        return originalHandleSleep(startAsync);
    }
}

/**
 * Data dependencies call removeRunDependency() when they are loaded.
 * The synchronous call stack then continues to run. If an error occurs
 * in PHP initialization, e.g. Out Of Memory error, it will not be
 * caught by any try/catch. This override propagates the failure to
 * PHPLoader.onAbort() so that it can be handled.
 */
const originalRemoveRunDependency = PHPLoader['removeRunDependency'];
PHPLoader['removeRunDependency'] = function (...args) {
    try {
        originalRemoveRunDependency(...args);
    } catch (e) {
        PHPLoader['onAbort'](e);
    }
}

if (typeof NODEFS === 'object') {
    // We override NODEFS.createNode() to add an `isSharedFS` flag to all NODEFS
    // nodes. This way we can tell whether file-locking is needed and possible
    // for an FS node, even if wrapped with PROXYFS.
    const originalNodeFsCreateNode = NODEFS.createNode;
    NODEFS.createNode = function createNodeWithSharedFlag() {
        const node = originalNodeFsCreateNode.apply(NODEFS, arguments);
        node.isSharedFS = true;
        return node;
    };

    var originalHashAddNode = FS.hashAddNode;
    FS.hashAddNode = function hashAddNodeIfNotSharedFS(node) {
        if (node?.isSharedFS) {
            // Avoid caching shared VFS nodes so multiple instances
            // can access the same underlying filesystem without
            // conflicting caches.
            return;
        }
        return originalHashAddNode.apply(FS, arguments);
    };
}

/**
 * Expose the PHP version so the PHP class can make version-specific
 * adjustments to `php.ini`.
 */
PHPLoader['phpVersion'] = (() => {
    const [ major, minor, patch ] = phpVersionString.split('.').map(Number);
    return { major, minor, patch };
})();

return PHPLoader;

// Close the opening bracket from esm-prefix.js:
}
