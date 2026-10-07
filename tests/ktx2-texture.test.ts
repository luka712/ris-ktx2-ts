import {describe, it, expect, vi} from "vitest";
import {Ktx2Texture} from "../src";
import {
    KtxErrorCode,
    KtxTranscodeFlags,
    KtxTranscodeFormat,
    TextureFormatInfo,
    VkFormat,
    type IKtxBasisParams,
    type IKtxTextureCreateInfo,
} from "../src";

type MockTexture = {
    baseWidth: number;
    baseHeight: number;
    dataSize: number;
    vkFormat: VkFormat;
    needsTranscoding: boolean;
    getImage: ReturnType<typeof vi.fn>;
    transcodeBasis: ReturnType<typeof vi.fn>;
    compressBasis: ReturnType<typeof vi.fn>;
    createCopy: ReturnType<typeof vi.fn>;
    setImageFromMemory: ReturnType<typeof vi.fn>;
    writeToMemory: ReturnType<typeof vi.fn>;
    deflateZLIB: ReturnType<typeof vi.fn>;
    deflateZstd: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
};

class BasisParams {
    quality?: number;
    verbose?: boolean;
    uastc?: boolean;
    compressionLevel?: number;
    uastcRDO?: boolean;
    uastcRDOQualityScalar?: number;
    noSSE?: boolean;
    qualityLevel?: number;
}

function headerWithLevels(numLevels: number): Uint8Array {
    const buffer = new Uint8Array(44);
    new DataView(buffer.buffer).setUint32(40, numLevels, true);
    return buffer;
}

function createMockKtxTexture(overrides: Partial<MockTexture> = {}): MockTexture {
    return {
        baseWidth: 512,
        baseHeight: 256,
        dataSize: 131072,
        vkFormat: VkFormat.R8G8B8A8_UNORM,
        needsTranscoding: true,
        getImage: vi.fn(() => new Uint8Array([1, 2, 3])),
        transcodeBasis: vi.fn(() => ({value: 0})),
        compressBasis: vi.fn(() => ({value: 0})),
        createCopy: vi.fn(),
        setImageFromMemory: vi.fn(() => ({value: 0})),
        writeToMemory: vi.fn(() => new Uint8Array([9])),
        deflateZLIB: vi.fn(() => ({value: 0})),
        deflateZstd: vi.fn(() => ({value: 0})),
        delete: vi.fn(),
        ...overrides,
    };
}

function createMockKtxLib() {
    return {
        basisParams: BasisParams,
        TranscodeTarget: {
            BC7_RGBA: "bc7",
            ASTC_4x4_RGBA: "astc",
            BC3_RGBA: "bc3",
            ETC2_RGBA: "etc2",
            RGBA32: "rgba32",
        },
        TranscodeFlags: {
            TRANSCODE_ALPHA_DATA_TO_OPAQUE_FORMATS: "alpha-to-opaque",
        },
    };
}

function createTexture(
    native: MockTexture = createMockKtxTexture(),
    data: Uint8Array | IKtxTextureCreateInfo | Ktx2Texture = headerWithLevels(10),
    filePath?: string,
) {
    return new Ktx2Texture(createMockKtxLib(), native, data, filePath);
}

describe("Ktx2Texture", () => {
    describe("constructor", () => {
        it("reads dimensions, size, format, and file path from the native texture", () => {
            const native = createMockKtxTexture({
                baseWidth: 1920,
                baseHeight: 1080,
                dataSize: 262144,
                vkFormat: VkFormat.R8G8B8A8_SRGB,
            });
            const texture = createTexture(native, headerWithLevels(1), "textures/scene.ktx2");

            expect(texture.width).toBe(1920);
            expect(texture.height).toBe(1080);
            expect(texture.dataSize).toBe(262144);
            expect(texture.vkFormat).toBe(VkFormat.R8G8B8A8_SRGB);
            expect(texture.filePath).toBe("textures/scene.ktx2");
            expect(texture.needsTranscoding).toBe(true);
        });

        it("reads numLevels from the KTX2 header at byte 40", () => {
            const texture = createTexture(createMockKtxTexture(), headerWithLevels(11));
            expect(texture.numLevels).toBe(11);
        });

        it("reads numLevels from create info and defaults to 0 when omitted", () => {
            const fromInfo = createTexture(createMockKtxTexture(), {
                baseWidth: 8,
                baseHeight: 8,
                numLevels: 4,
            });
            const omitted = createTexture(createMockKtxTexture(), {
                baseWidth: 8,
                baseHeight: 8,
            });

            expect(fromInfo.numLevels).toBe(4);
            expect(omitted.numLevels).toBe(0);
        });

        it("copies numLevels when data is another Ktx2Texture", () => {
            const native = createMockKtxTexture();
            const original = createTexture(native, headerWithLevels(6), "cat.ktx2");
            const copyNative = createMockKtxTexture({baseWidth: 32, baseHeight: 16});
            native.createCopy.mockReturnValue(copyNative);

            const copy = original.createCopy();

            expect(copy).toBeInstanceOf(Ktx2Texture);
            expect(copy.numLevels).toBe(6);
            expect(copy.filePath).toBe("cat.ktx2");
            expect(copy.width).toBe(32);
            expect(copy.height).toBe(16);
            expect(native.createCopy).toHaveBeenCalledOnce();
        });

        it("leaves filePath unset when none is provided", () => {
            const texture = createTexture();
            expect(texture.filePath).toBeUndefined();
        });
    });

    describe("getImage", () => {
        it("forwards level, layer, and faceSlice, including the defaults", () => {
            const native = createMockKtxTexture();
            const texture = createTexture(native);
            const image = new Uint8Array([4, 5]);
            native.getImage.mockReturnValue(image);

            expect(texture.getImage()).toBe(image);
            expect(native.getImage).toHaveBeenCalledWith(0, 0, 0);

            texture.getImage(2, 1, 3);
            expect(native.getImage).toHaveBeenLastCalledWith(2, 1, 3);
        });
    });

    describe("transcodeBasis", () => {
        const formats: Array<[KtxTranscodeFormat, string]> = [
            [KtxTranscodeFormat.BC7_RGBA, "bc7"],
            [KtxTranscodeFormat.ASTC_4X4_RGBA, "astc"],
            [KtxTranscodeFormat.BC3_RGBA, "bc3"],
            [KtxTranscodeFormat.ETC2_RGBA, "etc2"],
            [KtxTranscodeFormat.RGBA32, "rgba32"],
        ];

        it.each(formats)("maps %s onto the libktx transcode target", (format, target) => {
            const native = createMockKtxTexture();
            const texture = createTexture(native);

            const code = texture.transcodeBasis(format, KtxTranscodeFlags.NONE);

            expect(code).toBe(KtxErrorCode.SUCCESS);
            expect(native.transcodeBasis).toHaveBeenCalledWith(target, null);
        });

        it("maps the alpha-to-opaque flag", () => {
            const native = createMockKtxTexture();
            const texture = createTexture(native);

            texture.transcodeBasis(
                KtxTranscodeFormat.BC7_RGBA,
                KtxTranscodeFlags.TRANSCODE_ALPHA_DATA_TO_OPAQUE_FORMATS,
            );

            expect(native.transcodeBasis).toHaveBeenCalledWith("bc7", "alpha-to-opaque");
        });

        it("returns INVALID_OPERATION when libktx reports error 10", () => {
            const native = createMockKtxTexture({
                transcodeBasis: vi.fn(() => ({value: 10})),
            });
            const texture = createTexture(native);

            expect(texture.transcodeBasis(KtxTranscodeFormat.RGBA32, KtxTranscodeFlags.NONE))
                .toBe(KtxErrorCode.INVALID_OPERATION);
        });

        it("throws when the libktx error code is not mapped", () => {
            const native = createMockKtxTexture({
                transcodeBasis: vi.fn(() => ({value: 14})),
            });
            const texture = createTexture(native);

            expect(() => texture.transcodeBasis(KtxTranscodeFormat.RGBA32, KtxTranscodeFlags.NONE))
                .toThrow(/Not implemented KtxErrorCode/);
        });

        it("throws for a transcode format this wrapper does not map", () => {
            const texture = createTexture();

            expect(() => texture.transcodeBasis(
                KtxTranscodeFormat.KTX_TTF_ETC1_RGB,
                KtxTranscodeFlags.NONE,
            )).toThrow(/Unsupported transcodeFormat/);
        });
    });

    describe("compressBasis", () => {
        it("stores a numeric quality on basis params and returns the mapped error", () => {
            const native = createMockKtxTexture();
            const texture = createTexture(native);

            const code = texture.compressBasis(128);

            expect(code).toBe(KtxErrorCode.SUCCESS);
            const params = native.compressBasis.mock.calls[0][0] as BasisParams;
            expect(params).toBeInstanceOf(BasisParams);
            expect(params.quality).toBe(128);
        });

        it("fills UASTC params from IKtxBasisParams", () => {
            const native = createMockKtxTexture();
            const texture = createTexture(native);
            const basisParams: IKtxBasisParams = {
                verbose: true,
                uastc: true,
                compressionLevel: 4,
                uastcRDO: true,
                uastcRDOQualityScalar: 2.5,
            };

            texture.compressBasis(basisParams);

            const params = native.compressBasis.mock.calls[0][0] as BasisParams;
            expect(params.verbose).toBe(true);
            expect(params.uastc).toBe(true);
            expect(params.compressionLevel).toBe(4);
            expect(params.uastcRDO).toBe(true);
            expect(params.uastcRDOQualityScalar).toBe(2.5);
        });

        it("uses ETC1S defaults when uastc is not set", () => {
            const native = createMockKtxTexture();
            const texture = createTexture(native);

            texture.compressBasis({});

            const params = native.compressBasis.mock.calls[0][0] as BasisParams;
            expect(params.verbose).toBe(false);
            expect(params.uastc).toBe(false);
            expect(params.noSSE).toBe(true);
            expect(params.qualityLevel).toBe(128);
            expect(params.compressionLevel).toBe(2);
        });
    });

    describe("compressAstc", () => {
        it("throws because the method is not implemented", () => {
            const texture = createTexture();

            expect(() => texture.compressAstc(75)).toThrow(/Method not implemented/);
        });
    });

    describe("getTextureFormatInfo", () => {
        const layouts: Array<[KtxTranscodeFormat | VkFormat, TextureFormatInfo]> = [
            [KtxTranscodeFormat.ASTC_4X4_RGBA, TextureFormatInfo.astc4x4rgba()],
            [VkFormat.ASTC_4X4_UNORM_BLOCK, TextureFormatInfo.astc4x4rgba()],
            [KtxTranscodeFormat.BC7_RGBA, TextureFormatInfo.bc7()],
            [VkFormat.BC7_UNORM_BLOCK, TextureFormatInfo.bc7()],
            [KtxTranscodeFormat.BC3_RGBA, TextureFormatInfo.bc3()],
            [VkFormat.BC3_UNORM_BLOCK, TextureFormatInfo.bc3()],
            [KtxTranscodeFormat.ETC2_RGBA, TextureFormatInfo.etc2rgba()],
            [VkFormat.ETC2_R8G8B8A8_UNORM_BLOCK, TextureFormatInfo.etc2rgba()],
            [KtxTranscodeFormat.RGBA32, TextureFormatInfo.rgba32()],
            [VkFormat.R8G8B8A8_UNORM, TextureFormatInfo.rgba32()],
            [VkFormat.R8G8B8A8_SRGB, TextureFormatInfo.rgba32()],
        ];

        it.each(layouts)("returns the block layout for %s", (format, expected) => {
            const info = createTexture().getTextureFormatInfo(format);
            expect(info.blockWidth).toBe(expected.blockWidth);
            expect(info.blockHeight).toBe(expected.blockHeight);
            expect(info.blockDepth).toBe(expected.blockDepth);
            expect(info.bytesPerBlock).toBe(expected.bytesPerBlock);
        });

        it("throws for a format it does not recognize", () => {
            expect(() => createTexture().getTextureFormatInfo(VkFormat.R8_UNORM))
                .toThrow(/Unrecognized texture format/);
        });
    });

    describe("memory and compression helpers", () => {
        it("maps setImageFromMemory, deflate, and writeToMemory onto the native texture", () => {
            const native = createMockKtxTexture();
            const texture = createTexture(native);
            const pixels = new Uint8Array([7, 8]);

            expect(texture.setImageFromMemory(1, 0, 2, pixels)).toBe(KtxErrorCode.SUCCESS);
            expect(native.setImageFromMemory).toHaveBeenCalledWith(1, 0, 2, pixels);
            expect(texture.deflateZlib(6)).toBe(KtxErrorCode.SUCCESS);
            expect(native.deflateZLIB).toHaveBeenCalledWith(6);
            expect(texture.deflateZstd(3)).toBe(KtxErrorCode.SUCCESS);
            expect(native.deflateZstd).toHaveBeenCalledWith(3);
            expect(texture.writeToMemory()).toEqual(new Uint8Array([9]));
        });

        it("deletes the native texture", () => {
            const native = createMockKtxTexture();
            const texture = createTexture(native);

            texture.delete();

            expect(native.delete).toHaveBeenCalledOnce();
        });
    });
});
