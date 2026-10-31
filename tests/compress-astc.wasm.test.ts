import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import {fileURLToPath} from "node:url";
import {dirname, resolve} from "node:path";
import {beforeAll, describe, expect, it} from "vitest";
import {
    KtxAstcQualityLevel,
    Ktx2Factory,
    KtxAstcBlockDimension,
    KtxErrorCode,
    KtxSupercompressionScheme,
    KtxDFTransfer,
    VkFormat,
} from "../src";

// Real libktx wasm, loaded in Node for tests only. The package itself never
// imports node:fs; this file is not part of dist.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function loadLibKtx(): Promise<any> {
    const glue = readFileSync(resolve(root, "libktx.js"), "utf8");
    const LIBKTX = new Function("require", "__dirname", "__filename", glue + "\nreturn LIBKTX;")(
        createRequire(import.meta.url), root, resolve(root, "libktx.js"),
    );
    return LIBKTX({wasmBinary: readFileSync(resolve(root, "libktx.wasm"))});
}

function gradient(width: number, height: number): Uint8Array {
    const pixels = new Uint8Array(width * height * 4);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            pixels.set([x * 4, y * 4, (x ^ y) * 4, 255], i);
        }
    }
    return pixels;
}

describe("compressAstc with the real libktx wasm", () => {
    const factory = new Ktx2Factory();

    beforeAll(async () => {
        (Ktx2Factory as unknown as {_ktxLib?: unknown})._ktxLib = await loadLibKtx();
    });

    const cases: Array<[KtxAstcBlockDimension, number, number, VkFormat]> = [
        [KtxAstcBlockDimension.D4x4, 4, 4, VkFormat.ASTC_4X4_SRGB_BLOCK],
        [KtxAstcBlockDimension.D6x6, 6, 6, VkFormat.ASTC_6X6_SRGB_BLOCK],
    ];

    it.each(cases)("encodes 64x64 RGBA8 as ASTC block dimension %s", (dimension, bw, bh, expectedFormat) => {
        const texture = factory.create({baseWidth: 64, baseHeight: 64});
        expect(texture.setImageFromMemory(0, 0, 0, gradient(64, 64))).toBe(KtxErrorCode.SUCCESS);

        const code = texture.compressAstc({blockDimension: dimension, qualityLevel: KtxAstcQualityLevel.FASTEST});

        expect(code).toBe(KtxErrorCode.SUCCESS);
        expect(texture.vkFormat).toBe(expectedFormat);
        expect(texture.width).toBe(64);
        expect(texture.height).toBe(64);
        expect(texture.needsTranscoding).toBe(false);
        expect(texture.dataSize).toBe(Math.ceil(64 / bw) * Math.ceil(64 / bh) * 16);
        const info = texture.getTextureFormatInfo(texture.vkFormat);
        expect([info.blockWidth, info.blockHeight, info.bytesPerBlock]).toEqual([bw, bh, 16]);

        const bytes = (texture.writeToMemory() as Uint8Array).slice();
        texture.delete();

        const loaded = factory.createFromBuffer(bytes);
        expect(loaded.vkFormat).toBe(expectedFormat);
        expect(loaded.dataSize).toBe(Math.ceil(64 / bw) * Math.ceil(64 / bh) * 16);
        expect(loaded.width).toBe(64);
        loaded.delete();
    });

    it("encodes with the defaults", () => {
        const texture = factory.create({baseWidth: 16, baseHeight: 16, vkFormat: VkFormat.R8G8B8A8_UNORM});
        texture.setImageFromMemory(0, 0, 0, gradient(16, 16));
        expect(texture.compressAstc()).toBe(KtxErrorCode.SUCCESS);
        expect(texture.vkFormat).toBe(VkFormat.ASTC_4X4_UNORM_BLOCK);
        texture.delete();
    });

    it("returns INVALID_OPERATION when the texture is already ASTC", () => {
        const texture = factory.create({baseWidth: 16, baseHeight: 16});
        texture.setImageFromMemory(0, 0, 0, gradient(16, 16));
        texture.compressAstc({qualityLevel: KtxAstcQualityLevel.FASTEST});
        expect(texture.compressAstc()).toBe(KtxErrorCode.INVALID_OPERATION);
        texture.delete();
    });

    it("decodeAstc turns ASTC back into RGBA8", () => {
        const texture = factory.create({baseWidth: 16, baseHeight: 16});
        texture.setImageFromMemory(0, 0, 0, gradient(16, 16));
        texture.compressAstc({qualityLevel: KtxAstcQualityLevel.FASTEST});
        const code = texture.decodeAstc();
        expect(code).toBe(KtxErrorCode.SUCCESS);
        expect([VkFormat.R8G8B8A8_SRGB, VkFormat.R8G8B8A8_UNORM]).toContain(texture.vkFormat);
        expect(texture.dataSize).toBe(16 * 16 * 4);
        texture.delete();
    });
});

describe("supercompressionScheme with the real libktx wasm", () => {
    const factory = new Ktx2Factory();

    beforeAll(async () => {
        (Ktx2Factory as unknown as {_ktxLib?: unknown})._ktxLib = await loadLibKtx();
    });

    function filled() {
        const texture = factory.create({baseWidth: 16, baseHeight: 16});
        texture.setImageFromMemory(0, 0, 0, gradient(16, 16));
        return texture;
    }

    it("is NONE for a new texture", () => {
        expect(filled().supercompressionScheme).toBe(KtxSupercompressionScheme.NONE);
    });

    it("tracks deflate and basis compression and survives a write/read round trip", () => {
        const cases: Array<[(t: ReturnType<typeof filled>) => KtxErrorCode, KtxSupercompressionScheme]> = [
            [t => t.deflateZstd(5), KtxSupercompressionScheme.ZSTD],
            [t => t.deflateZlib(5), KtxSupercompressionScheme.ZLIB],
            [t => t.compressBasis({}), KtxSupercompressionScheme.BASIS_LZ],
            [t => t.compressBasis({uastc: true}), KtxSupercompressionScheme.NONE],
        ];
        for (const [run, expected] of cases) {
            const texture = filled();
            expect(run(texture)).toBe(KtxErrorCode.SUCCESS);
            expect(texture.supercompressionScheme).toBe(expected);
            expect(texture.createCopy().supercompressionScheme).toBe(expected);
            const bytes = texture.writeToMemory();
            expect(factory.createFromBuffer(bytes).supercompressionScheme).toBe(expected);
        }
    });
});

describe("oetf with the real libktx wasm", () => {
    const factory = new Ktx2Factory();

    beforeAll(async () => {
        (Ktx2Factory as unknown as {_ktxLib?: unknown})._ktxLib = await loadLibKtx();
    });

    it.each([
        [VkFormat.R8G8B8A8_SRGB, KtxDFTransfer.SRGB],
        [VkFormat.R8G8B8A8_UNORM, KtxDFTransfer.LINEAR],
    ])("reads the transfer function for vkFormat %s", (vkFormat, expected) => {
        const texture = factory.create({baseWidth: 16, baseHeight: 16, vkFormat});
        expect(texture.oetf).toBe(expected);
        expect(texture.createCopy().oetf).toBe(expected);
        texture.setImageFromMemory(0, 0, 0, gradient(16, 16));
        expect(factory.createFromBuffer(texture.writeToMemory()).oetf).toBe(expected);
    });
});
