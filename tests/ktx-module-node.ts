import {existsSync, readFileSync} from "node:fs";
import {readFile} from "node:fs/promises";
import {createRequire} from "node:module";
import {dirname, resolve} from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";
import {runInThisContext} from "node:vm";

type KtxModuleFactory = (options?: any) => Promise<any>;

/**
 * Test-only libktx bootstrap. Vitest installs these functions on the factory
 * so Node can read `libktx.js` and a local `.ktx2` file. This module is not
 * part of the published browser build.
 *
 * The Emscripten glue already supports Node when `require`, `__dirname`, and
 * `__filename` are in scope, and it reads `libktx.wasm` from the same directory
 * as `libktx.js`.
 */
export async function createKtxModuleNode(options: any = {}) {
    const gluePath = resolveLibktxGlue();
    const code = readFileSync(gluePath, "utf8");
    const moduleRecord: { exports: KtxModuleFactory & { default?: KtxModuleFactory } } = {
        exports: {} as KtxModuleFactory & { default?: KtxModuleFactory },
    };

    // Evaluate in this realm so Uint8Array results stay instanceof Uint8Array.
    // A separate vm context would create typed arrays the caller cannot recognize.
    const runnerSource = "(function (module, exports, require, __dirname, __filename) {\n"
        + code
        + "\nreturn (typeof LIBKTX === \"function\" ? LIBKTX : module.exports);\n})";
    const runner = runInThisContext(runnerSource, { filename: gluePath }) as (
        module: typeof moduleRecord,
        exports: typeof moduleRecord.exports,
        require: (id: string) => unknown,
        dirname: string,
        filename: string,
    ) => KtxModuleFactory;

    const factory = runner(
        moduleRecord,
        moduleRecord.exports,
        createRequire(pathToFileURL(gluePath)) as (id: string) => unknown,
        dirname(gluePath),
        gluePath,
    );
    return factory(options);
}

export async function readFileBytes(source: string): Promise<ArrayBuffer> {
    const data = await readFile(source);
    const copy = new Uint8Array(data.byteLength);
    copy.set(data);
    return copy.buffer;
}

function resolveLibktxGlue(): string {
    const candidates: string[] = [];
    const metaUrl = import.meta.url;
    if (typeof metaUrl === "string" && metaUrl.length > 0) {
        try {
            // Keep the filename out of a string literal so a bundler does not
            // inline libktx.js. The file ships next to the package root.
            const glueName = "../" + "libktx.js";
            candidates.push(fileURLToPath(new URL(glueName, metaUrl)));
        } catch {
            // import.meta.url is not a file URL in this host.
        }
    }
    candidates.push(resolve("libktx.js"));

    for (const candidate of candidates) {
        if (existsSync(candidate)) {
            return candidate;
        }
    }

    throw new Error("Could not locate libktx.js");
}
