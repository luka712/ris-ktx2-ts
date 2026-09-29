import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
    build: {
        lib: {
            entry: 'src/index.ts',
            name: 'KtxRead',
            formats: ['es'],
            fileName: () => 'index.js',
        },
        rollupOptions: {
            external: [/^node:/],
            output: {
                globals: {},
            },
        },
    },
    plugins: [dts()], // Generates .d.ts
});