// src/index.ts
import wasmUrl from '../libktx.wasm?url';

export * from "./Ktx2Factory"
export * from "./Ktx2Texture";

/**
 * Loads the libktx Emscripten module in the browser.
 * The wasm binary is fetched and the glue runs as a classic script.
 */
export async function createKtxModuleAsync(options: any = {}) {

    // 1. Load WASM binary
    const wasmResponse = await fetch(wasmUrl);
    const wasmBinary = await wasmResponse.arrayBuffer();

    // 2. Load the JS glue code
    const {default: glueCode} = await import('../libktx.js?raw');

    // 3. Create blob URL and inject a script
    const module = new Function(
        'globalThis',
        `${glueCode}\nreturn globalThis.LIBKTX;`
    )(globalThis);

    const LIBKTX = module;

    // 3. Initialize
    return LIBKTX({
        wasmBinary,
        ...options,
    });
}
