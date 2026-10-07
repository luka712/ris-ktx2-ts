import wasmUrl from '../libktx.wasm?url';

/**
 * Loads a new instance of the libktx Emscripten module.
 *
 * Most code should call {@link Ktx2Factory.initializeAsync} instead, which
 * calls this function once per realm and caches the result. This function
 * does not cache: every call creates a new module.
 *
 * It works in the browser on the main thread and in a dedicated or module
 * worker. It fetches the WebAssembly binary (inlined in the built package as a
 * `data:` URL), then evaluates the classic-script glue `libktx.js` with
 * `new Function`. It does not use `document` or `window`.
 *
 * A Content Security Policy must allow `unsafe-eval` in `script-src` for
 * `new Function`, allow WebAssembly compilation (`wasm-unsafe-eval` or
 * `unsafe-eval`), and allow `data:` in `connect-src` for the fetch.
 *
 * @param options - Emscripten module options. They are merged after
 * `wasmBinary`, so they can override it.
 * @returns The initialized libktx module. It is untyped and its API belongs
 * to libktx, not to this package.
 * @public
 */
export async function createKtxModuleAsync(options: any = {}): Promise<any> {

    // 1. Load WASM binary
    const wasmResponse = await fetch(wasmUrl);
    const wasmBinary = await wasmResponse.arrayBuffer();

    // 2. Load the JS glue code
    const {default: glueCode} = await import('../libktx.js?raw');

    // libktx.js contains backticks and ${}, so concatenate instead of using a
    // template literal. `var LIBKTX` is local to the function, so return that
    // binding instead of reading globalThis. Requires CSP 'unsafe-eval'.
    const LIBKTX = new Function(glueCode + "\nreturn LIBKTX;")();

    return LIBKTX({
        wasmBinary,
        ...options,
    });
}
