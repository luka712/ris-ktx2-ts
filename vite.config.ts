import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
    build: {
        lib: {
            entry: 'src/index.ts',
            name: 'KtxRead',
            fileName: (format) => `index.${format === 'es' ? 'js' : 'cjs'}`,
        },
        rollupOptions: {
            output: {
                globals: {},
            },
        },
    },
    plugins: [dts()], // Generates .d.ts
});