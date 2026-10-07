import {defineConfig} from "vite";
import {fileURLToPath} from "node:url";

// The example has no dependencies of its own. Vite and TypeScript are
// resolved from the repository root node_modules (run `npm install` there).

const exampleRoot = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

export default defineConfig({
    // Lets `vite --config examples/browser/vite.config.ts` work from the repo root.
    root: exampleRoot,
    resolve: {
        alias: {
            // Import the local library source instead of a published package.
            "ris-ktx2": fileURLToPath(new URL("../../src/index.ts", import.meta.url)),
        },
    },
    server: {
        // libktx.js and libktx.wasm live at the repo root, outside this folder.
        fs: {allow: [repoRoot]},
    },
    build: {
        target: "es2022",
        outDir: "dist",
        emptyOutDir: true,
    },
});
