// src/index.ts
import wasmUrl from '../libktx.wasm?url';

export * from "./Ktx2Factory"
export * from "./Ktx2Texture";

/**
 * Loads the libktx Emscripten module in the browser, on the page or in a worker.
 * The wasm binary is fetched. The classic-script glue is evaluated in this realm.
 */
export async function createKtxModuleAsync(options: any = {}) {

    // 1. Load WASM binary
    const wasmResponse = await fetch(wasmUrl);
    const wasmBinary = await wasmResponse.arrayBuffer();

    // 2. Load the JS glue code
    const {default: glueCode} = await import('../libktx.js?raw');

    // libktx.js contains backticks and ${}, so concatenate. var LIBKTX is local
    // to the function; return that binding instead of reading globalThis.
    const LIBKTX = new Function(glueCode + "\nreturn LIBKTX;")();

    return LIBKTX({
        wasmBinary,
        ...options,
    });
}
