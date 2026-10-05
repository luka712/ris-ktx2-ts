# Worker-safe libktx loader

The preferred loader is implemented in `createKtxModuleAsync`: `new Function(glueCode + "\nreturn LIBKTX;")()`, then `LIBKTX({ wasmBinary, ...options })`. No `document` script injection and no `window.LIBKTX` read.

The sibling viewer (`ris-ktx2-viewer-ts`, notes in `docs/todo-worker-encoding.md`) wants KTX2 encoding off the main thread so the UI stays responsive. That only works if this package can create a KTX module inside the worker. The viewer can paper over the current loader with a DOM shim. The supported fix belongs here.

## Goal

`createKtxModuleAsync`, and therefore `Ktx2Factory.initializeAsync`, must work in the browser in both places:

- On the main thread, which is today's usage, with no worker.
- Inside a dedicated worker, including a module worker (`new Worker(url, { type: "module" })`), with no `document` and no `window`.

The factory cache is per realm. The worker constructs and initializes its own `Ktx2Factory`. It does not share the main-thread module.

A Node path may exist in addition to those two browser paths. It is optional for this work. It must not replace or regress the main-thread browser path.

## Current blocker

`createKtxModuleAsync` in `src/index.ts` already does two things that are fine in a worker:

1. `fetch(wasmUrl)` and `arrayBuffer()` to get the wasm bytes.
2. `import("../libktx.js?raw")` to obtain the Emscripten glue as text.

It then fails in a worker:

1. It builds a blob URL and loads it with `document.createElement("script")`, `script.onload`, and `document.head.appendChild`. A plain worker throws `document is not defined` before the glue runs.
2. After the script loads, it reads `window.LIBKTX`. A worker has no `window`.

`libktx.js` is a classic script, not an ES module. The Emscripten factory is `createKtxModule`. The Khronos extern post-js at the bottom of the file then does `var LIBKTX = createKtxModule` (or `createKtxReadModule` when that name exists). A classic `<script>` promotes those `var` bindings onto `window`, which is the only reason `window.LIBKTX` exists. Nothing in the glue assigns `globalThis.LIBKTX` itself.

Inside the glue, `document` is only touched behind `typeof document != "undefined"` (`document.currentScript`). `ENVIRONMENT_IS_WEB` is `typeof window == "object"`. `ENVIRONMENT_IS_WORKER` is `typeof WorkerGlobalScope != "undefined"`. A real worker is already an Emscripten host. Passing `wasmBinary` means the glue does not have to locate `libktx.wasm` from a script URL.

## Why the viewer shim is not the long-term answer

The viewer can set `self.window = self` and install a stub `document` whose script element evals the blob URL. That gets a worker running only by imitating this package's private sequence: blob URL, `<script>` injection, then `window.LIBKTX`.

That shim breaks when the loader changes, and a partial `document` can miss `head`, `currentScript`, or load events. Every other worker consumer would copy the same internals. `ris-ktx2` should load libktx without a DOM.

## Implementation checklist

Do this in `createKtxModuleAsync`. The page and the worker share one browser path. A separate Node path is allowed and is not part of this checklist.

1. Keep `fetch(wasmUrl)` and pass the result as `wasmBinary`. Do not resolve the wasm file from `document.currentScript` or `self.location`.
2. Keep the shared browser path reading the glue with the raw import, then evaluating that text. Do not make the page or the worker depend on a filesystem read.
3. Stop injecting a classic script. `libktx.js` has no `export`, so `import()` of the file as shipped is not a module load. `importScripts` exists only on classic workers and throws in a module worker, so it cannot be the only path.
4. Evaluate the classic-script glue in the current realm and take the factory from that evaluation, not from `window`. Preferred shape:

   ```js
   const LIBKTX = new Function(glueCode + "\nreturn LIBKTX;")();
   ```

   Concatenate the source. Do not interpolate `glueCode` into a template literal: `libktx.js` contains backticks and `${`. `var LIBKTX` stays inside that function and the return value is the factory. The page and a module worker both get it without `window`.

   Indirect eval is equivalent: `(0, eval)(glueCode)`, then read `globalThis.LIBKTX`. Sloppy indirect eval binds `var` on the current global (`window` on a page, `self` in a worker).

   `Function` and indirect eval are blocked when `script-src` omits `unsafe-eval`. Record that constraint next to the chosen call. Do not bring back `document.createElement("script")` as the worker path.
5. Call the factory as today: `LIBKTX({ wasmBinary, ...options })`. Delete the `window.LIBKTX` read.
6. Keep the main-thread browser path working. Existing page code should still call `createKtxModuleAsync` or `Ktx2Factory.initializeAsync` with no new arguments. Check a page load, not only a worker: create or transcode still returns a module whose `texture` (and the `ktxTexture` alias set in `onRuntimeInitialized`) is usable. Do not swap that path out to serve Node.
7. Add a worker smoke test, or a short manual check in this doc if the test cannot run under the current Vitest config:
   - Start a module worker with no `self.window = self` and no stub `document`.
   - Call `createKtxModuleAsync()` inside that worker.
   - Resolve when the factory returns, and reject if `document` or `window` was required.
   - A Node-only test does not count as this check. A browser runner is appropriate for the smoke test; otherwise document the manual worker page and run it once for the change.
8. Run `npm test` and `npm run build`. If a Node loader is added, keep it out of the browser graph. The published `dist` must not contain a `node:fs` import that a consumer browser bundler has to parse. The library build already fails if a published chunk imports `node:fs`.

## Acceptance criteria

- Main-thread browser `createKtxModuleAsync` still works, with no worker and no new arguments.
- Module-worker `createKtxModuleAsync` works with no `document` or `window` shim.
- Node may exist as an additional path. It is optional, and it must not regress either browser path.
- `npm test` and `npm run build` pass.
- The published `dist` does not leave a consumer browser bundler stuck on `node:fs`. If Node code exists, it must not be pulled into the browser build.

## Out of scope

- The viewer's worker protocol and message format.
- The viewer's OffscreenCanvas convert pipeline.
- ASTC compression. `compressAstc` stays unimplemented.
- Requiring a Node path. One may be added later, but this todo is done when the two browser paths work.
