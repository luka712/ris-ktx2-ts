import { describe, it } from 'vitest';

describe('Ktx2Factory browser loader', () => {
    // createKtxModuleAsync injects libktx.js with document and reads window.LIBKTX.
    // Vitest runs in Node, so this is not executed here.
    it.skipIf(typeof document === 'undefined')('initializeAsync loads libktx', async () => {
        const { Ktx2Factory } = await import('../src/index');
        const factory = new Ktx2Factory();
        await factory.initializeAsync();
    });
});
