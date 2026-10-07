import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

const createKtxModuleAsync = vi.hoisted(() => vi.fn());
vi.mock("../src/createKtxModuleAsync", () => ({
    createKtxModuleAsync: (...args: unknown[]) => createKtxModuleAsync(...args),
}));

import {Ktx2Factory, VkFormat} from "../src";

const KTX2_IDENTIFIER = [0xAB, 0x4B, 0x54, 0x58, 0x20, 0x32, 0x30, 0xBB, 0x0D, 0x0A, 0x1A, 0x0A];

function ktx2File(numLevels = 3): Uint8Array {
    const bytes = new Uint8Array(80);
    bytes.set(KTX2_IDENTIFIER, 0);
    new DataView(bytes.buffer).setUint32(40, numLevels, true);
    return bytes;
}

/** Minimal stand-in for the libktx Embind module. */
function createMockKtxLib(options: {baseWidth?: number} = {}) {
    const created: Array<{input: unknown; deleted: boolean}> = [];
    const createInfos: Array<{deleted: boolean}> = [];

    class MockTexture {
        public baseWidth = options.baseWidth ?? 16;
        public baseHeight = 8;
        public dataSize = 512;
        public vkFormat = VkFormat.R8G8B8A8_SRGB;
        public needsTranscoding = false;
        private readonly record: {input: unknown; deleted: boolean};

        constructor(input: unknown) {
            this.record = {input, deleted: false};
            created.push(this.record);
        }

        delete() {
            this.record.deleted = true;
        }
    }

    class MockCreateInfo {
        public numLevels?: number;
        public deleted = false;

        constructor() {
            createInfos.push(this);
        }

        delete() {
            this.deleted = true;
        }
    }

    return {
        created,
        createInfos,
        texture: MockTexture,
        textureCreateInfo: MockCreateInfo,
        VkFormat: {R8G8B8A8_UNORM: {value: 37}, R8G8B8A8_SRGB: {value: 43}},
        TextureCreateStorageEnum: {NO_STORAGE: {value: 0}, ALLOC_STORAGE: {value: 1}},
    };
}

function resetFactoryCache() {
    const statics = Ktx2Factory as unknown as {_ktxLib?: unknown; _ktxLibPromise?: unknown};
    statics._ktxLib = undefined;
    statics._ktxLibPromise = undefined;
}

async function initializedFactory(lib = createMockKtxLib()) {
    createKtxModuleAsync.mockResolvedValue(lib);
    const factory = new Ktx2Factory();
    await factory.initializeAsync();
    return {factory, lib};
}

describe("Ktx2Factory", () => {
    beforeEach(() => {
        resetFactoryCache();
        createKtxModuleAsync.mockReset();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    describe("initializeAsync", () => {
        it("shares one load between concurrent calls and factories", async () => {
            let resolve!: (lib: unknown) => void;
            createKtxModuleAsync.mockReturnValue(new Promise(r => (resolve = r)));

            const first = new Ktx2Factory().initializeAsync();
            const second = new Ktx2Factory().initializeAsync();
            resolve(createMockKtxLib());
            await Promise.all([first, second]);
            await new Ktx2Factory().initializeAsync();

            expect(createKtxModuleAsync).toHaveBeenCalledOnce();
        });

        it("clears the cached load after a failure so a later call can retry", async () => {
            createKtxModuleAsync.mockRejectedValueOnce(new Error("network down"));
            const factory = new Ktx2Factory();

            await expect(factory.initializeAsync()).rejects.toThrow("network down");

            createKtxModuleAsync.mockResolvedValueOnce(createMockKtxLib());
            await expect(factory.initializeAsync()).resolves.toBeUndefined();
            expect(createKtxModuleAsync).toHaveBeenCalledTimes(2);
        });

        it("makes other methods throw a clear error before initialization", async () => {
            const factory = new Ktx2Factory();

            expect(() => factory.createFromBuffer(ktx2File())).toThrow(/not initialized/);
            expect(() => factory.create({baseWidth: 4, baseHeight: 4})).toThrow(/not initialized/);
            await expect(factory.loadAsync("/a.ktx2")).rejects.toThrow(/not initialized/);
        });
    });

    describe("loadAsync", () => {
        it("throws with the URL and HTTP status when the response is not ok", async () => {
            const {factory} = await initializedFactory();
            vi.stubGlobal("fetch", vi.fn(async () => new Response("missing", {status: 404, statusText: "Not Found"})));

            await expect(factory.loadAsync("/textures/missing.ktx2"))
                .rejects.toThrow('Failed to fetch "/textures/missing.ktx2": HTTP 404 Not Found');
        });

        it("loads a fetched KTX2 file and keeps the URL as filePath", async () => {
            const {factory, lib} = await initializedFactory();
            vi.stubGlobal("fetch", vi.fn(async () => new Response(ktx2File(5))));

            const texture = await factory.loadAsync("/textures/ok.ktx2");

            expect(texture.filePath).toBe("/textures/ok.ktx2");
            expect(texture.numLevels).toBe(5);
            expect(lib.created).toHaveLength(1);
        });

        it("loads a File and uses its name as filePath", async () => {
            const {factory} = await initializedFactory();
            const file = new File([ktx2File(2) as BlobPart], "local.ktx2");

            const texture = await factory.loadAsync(file);

            expect(texture.filePath).toBe("local.ktx2");
            expect(texture.numLevels).toBe(2);
        });

        it("throws for data without a KTX identifier and does not call libktx", async () => {
            const {factory, lib} = await initializedFactory();
            vi.stubGlobal("fetch", vi.fn(async () => new Response("<html>not a texture</html>")));

            await expect(factory.loadAsync("/index.html")).rejects.toThrow(/"\/index.html" is not a KTX or KTX2 file/);
            expect(lib.created).toHaveLength(0);
        });

        it("throws and frees the native texture when libktx cannot read the data", async () => {
            const {factory, lib} = await initializedFactory(createMockKtxLib({baseWidth: 0}));
            vi.stubGlobal("fetch", vi.fn(async () => new Response(ktx2File())));

            await expect(factory.loadAsync("/truncated.ktx2")).rejects.toThrow(/could not read "\/truncated.ktx2"/);
            expect(lib.created[0].deleted).toBe(true);
        });
    });

    describe("createFromBuffer", () => {
        it("accepts a DataView and passes libktx a Uint8Array over the same bytes", async () => {
            const {factory, lib} = await initializedFactory();
            const file = ktx2File(4);
            const padded = new Uint8Array(file.byteLength + 16);
            padded.set(file, 16);

            const texture = factory.createFromBuffer(new DataView(padded.buffer, 16, file.byteLength));

            const input = lib.created[0].input as Uint8Array;
            expect(input).toBeInstanceOf(Uint8Array);
            expect(input.buffer).toBe(padded.buffer);
            expect(input.byteOffset).toBe(16);
            expect(input.byteLength).toBe(file.byteLength);
            expect(texture.numLevels).toBe(4);
        });

        it("throws for bytes that are not a KTX file", async () => {
            const {factory} = await initializedFactory();

            expect(() => factory.createFromBuffer(new Uint8Array(64))).toThrow(/The buffer is not a KTX or KTX2 file/);
        });
    });

    describe("create", () => {
        it("creates a texture with the requested levels and frees the create info", async () => {
            const {factory, lib} = await initializedFactory();

            const texture = factory.create({baseWidth: 4, baseHeight: 4, numLevels: 3});

            expect(texture.numLevels).toBe(3);
            expect(lib.createInfos).toHaveLength(1);
            expect(lib.createInfos[0].deleted).toBe(true);
        });

        it("throws for an unsupported VkFormat and still frees the create info", async () => {
            const {factory, lib} = await initializedFactory();

            expect(() => factory.create({baseWidth: 4, baseHeight: 4, vkFormat: VkFormat.BC7_UNORM_BLOCK}))
                .toThrow(/Unsupported VkFormat: BC7_UNORM_BLOCK/);
            expect(lib.createInfos[0].deleted).toBe(true);
        });
    });
});
