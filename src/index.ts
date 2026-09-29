// src/index.ts
import wasmUrl from '../libktx.wasm?url';
import {isNodeRuntime} from "./node-runtime";

export * from "./Ktx2Factory"
export * from "./Ktx2Texture";

/**
 * Loads the libktx Emscripten module.
 * Browsers fetch the wasm binary and evaluate the glue as a classic script.
 * Node evaluates the same glue with its own `require` so Vitest, and other
 * Node hosts, can initialize {@link Ktx2Factory}.
 */
export async function createKtxModuleAsync(options: any = {}) {
    if (isNodeRuntime()) {
        const {createKtxModuleNode} = await import("./ktx-module-node");
        return createKtxModuleNode(options);
    }
    return createKtxModuleBrowser(options);
}

async function createKtxModuleBrowser(options: any = {}) {

    // 1. Load WASM binary
    const wasmResponse = await fetch(wasmUrl);
    const wasmBinary = await wasmResponse.arrayBuffer();

    // 2. Load the JS glue code
    const {default: glueCode} = await import('../libktx.js?raw');

    // 3. Create blob URL and inject a script
    const blob = new Blob([glueCode], {type: 'text/javascript'});
    const scriptUrl = URL.createObjectURL(blob);

    // 4. Load the script
    await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = scriptUrl;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load libktx.js'));
        document.head.appendChild(script);
    });

    // 5. Delete blob URL
    URL.revokeObjectURL(scriptUrl);

    const LIBKTX = (window as any).LIBKTX;

    // 3. Initialize
    return LIBKTX({
        wasmBinary,
        ...options,
    });
}
