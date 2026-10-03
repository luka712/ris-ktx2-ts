import {defineConfig, type Plugin} from "vite";
import dts from "vite-plugin-dts";

/**
 * This package is browser-only. Fail the library build if a Node filesystem
 * import reaches dist, because a consumer browser build parses every published chunk.
 */
function rejectNodeFilesystemInBrowserBuild(): Plugin {
    return {
        name: "reject-node-filesystem-in-browser-build",
        apply: "build",
        generateBundle(_options, bundle) {
            const nodeImport = /(?:from|import)\s*(?:\(\s*)?["']node:|\bexistsSync\b|\bnode:fs\b/;
            for (const [fileName, item] of Object.entries(bundle)) {
                const source = item.type === "chunk"
                    ? item.code
                    : typeof item.source === "string"
                        ? item.source
                        : "";
                if (source.length > 0 && nodeImport.test(source)) {
                    this.error(
                        `Browser build emitted ${fileName} with a Node filesystem import. ` +
                        "Published dist must not import node:fs.",
                    );
                }
            }
        },
    };
}

export default defineConfig({
    build: {
        lib: {
            entry: "src/index.ts",
            name: "KtxRead",
            formats: ["es"],
            fileName: () => "index.js",
        },
    },
    plugins: [
        rejectNodeFilesystemInBrowserBuild(),
        dts(),
    ],
});
