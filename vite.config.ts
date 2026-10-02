import { defineConfig, type Plugin } from 'vite';
import dts from 'vite-plugin-dts';

/**
 * Vite library mode inlines assets as data URLs. `?no-inline` keeps
 * `libktx.wasm` a real file, and the built fetch URL points at the package-root
 * copy (`../libktx.wasm` from `dist/index.js`) instead of a second copy in `dist/`.
 */
function libktxWasmUrl(): Plugin {
    return {
        name: 'libktx-wasm-url',
        enforce: 'pre',
        async resolveId(source, importer, options) {
            if (!source.includes('libktx.wasm') || source.includes('no-inline')) {
                return null;
            }
            const suffixed = source.includes('?') ? `${source}&no-inline` : `${source}?no-inline`;
            return this.resolve(suffixed, importer, { skipSelf: true, ...options });
        },
        generateBundle(_options, bundle) {
            for (const fileName of Object.keys(bundle)) {
                if (fileName.endsWith('libktx.wasm')) {
                    delete bundle[fileName];
                }
            }
        },
    };
}

export default defineConfig({
    base: './',
    experimental: {
        renderBuiltUrl(filename, { type }) {
            if (type === 'asset' && filename.endsWith('.wasm')) {
                return { runtime: `new URL(${JSON.stringify(`../${filename}`)}, import.meta.url).href` };
            }
        },
    },
    build: {
        lib: {
            entry: 'src/index.ts',
            formats: ['es'],
            fileName: () => 'index.js',
        },
        emptyOutDir: true,
        minify: false,
        sourcemap: true,
        rollupOptions: {
            external: ['ris-ktx2-api'],
            output: {
                assetFileNames: '[name][extname]',
                chunkFileNames: 'libktx-raw.js',
            },
        },
    },
    plugins: [
        libktxWasmUrl(),
        dts({
            bundleTypes: true,
            exclude: ['tests/**'],
        }),
    ],
});
