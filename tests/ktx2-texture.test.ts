import {describe, it, expect, vi} from "vitest";
import {Ktx2Texture} from "../src/Ktx2Texture";
import {
    KtxErrorCode,
    KtxTranscodeFlags,
    KtxTranscodeFormat,
    KtxUastcFlags,
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
    verbose?: boolean;
    uastc?: boolean;
    compressionLevel?: number;
    uastcRDO?: boolean;
    uastcRDOQualityScalar?: number;
    noSSE?: boolean;
    qualityLevel?: number;
    threadCount?: number;
    uastcFlags?: {value: number};
    normalMap?: boolean;
    inputSwizzle?: string;
    deleted = false;
    delete() {
        this.deleted = true;
    }
}

function headerWithLevels(numLevels: number): Uint8Array {
    const buffer = new Uint8Array(44);
    new DataView(buffer.buffer).setUint32(40, numLevels, true);
    return buffer;
}

const KTX2_IDENTIFIER = [0xAB, 0x4B, 0x54, 0x58, 0x20, 0x32, 0x30, 0xBB, 0x0D, 0x0A, 0x1A, 0x0A];
const KTX1_IDENTIFIER = [0xAB, 0x4B, 0x54, 0x58, 0x20, 0x31, 0x31, 0xBB, 0x0D, 0x0A, 0x1A, 0x0A];

function ktx2Header(numLevels: number): Uint8Array {
    const buffer = headerWithLevels(numLevels);
    buffer.set(KTX2_IDENTIFIER, 0);
    return buffer;
}

function ktx1Header(numLevels: number, littleEndian = true): Uint8Array {
    const buffer = new Uint8Array(64);
    buffer.set(KTX1_IDENTIFIER, 0);
    const view = new DataView(buffer.buffer);
    view.setUint32(12, 0x04030201, littleEndian);
    view.setUint32(56, numLevels, littleEndian);
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
    data: ArrayBufferView | IKtxTextureCreateInfo | Ktx2Texture = headerWithLevels(10),
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

        it("reads numLevels from any ArrayBufferView, including DataView and offset views", () => {
            const header = ktx2Header(7);
            const padded = new Uint8Array(header.byteLength + 8);
            padded.set(header, 8);

            const fromDataView = createTexture(createMockKtxTexture(), new DataView(header.buffer));
            const fromOffsetView = createTexture(createMockKtxTexture(), padded.subarray(8));

            expect(fromDataView.numLevels).toBe(7);
            expect(fromOffsetView.numLevels).toBe(7);
        });

        it("reports a header levelCount of 0 as 1 stored level", () => {
            const texture = createTexture(createMockKtxTexture(), ktx2Header(0));
            expect(texture.numLevels).toBe(1);
        });

        it("reads numLevels from a KTX1 header in either byte order", () => {
            expect(createTexture(createMockKtxTexture(), ktx1Header(5)).numLevels).toBe(5);
            expect(createTexture(createMockKtxTexture(), ktx1Header(9, false)).numLevels).toBe(9);
        });

        it("reports VkFormat.UNDEFINED for KTX1 without reading libktx vkFormat", () => {
            const native = createMockKtxTexture();
            Object.defineProperty(native, "vkFormat", {
                get: () => {
                    throw new Error("vkFormat must not be read for KTX1");
                },
            });
            const texture = createTexture(native, ktx1Header(1));

            expect(texture.vkFormat).toBe(VkFormat.UNDEFINED);
        });

        it("reads width, height, dataSize, and vkFormat live from the native texture", () => {
            const native = createMockKtxTexture({vkFormat: VkFormat.UNDEFINED, dataSize: 100});
            const texture = createTexture(native);

            native.vkFormat = VkFormat.BC7_UNORM_BLOCK;
            native.dataSize = 4096;
            native.baseWidth = 64;
            native.baseHeight = 32;

            expect(texture.vkFormat).toBe(VkFormat.BC7_UNORM_BLOCK);
            expect(texture.dataSize).toBe(4096);
            expect(texture.width).toBe(64);
            expect(texture.height).toBe(32);
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
            const native = createMockKtxTexture({needsTranscoding: false});
            const texture = createTexture(native);
            const image = new Uint8Array([4, 5]);
            native.getImage.mockReturnValue(image);

            expect(texture.getImage()).toBe(image);
            expect(native.getImage).toHaveBeenCalledWith(0, 0, 0);

            texture.getImage(2, 1, 3);
            expect(native.getImage).toHaveBeenLastCalledWith(2, 1, 3);
        });

        it("throws instead of calling libktx when the texture still needs transcoding", () => {
            const native = createMockKtxTexture({needsTranscoding: true});
            const texture = createTexture(native);

            expect(() => texture.getImage()).toThrow(/Call transcodeBasis first/);
            expect(native.getImage).not.toHaveBeenCalled();
        });

        it("throws when libktx returns no image", () => {
            const native = createMockKtxTexture({needsTranscoding: false});
            native.getImage.mockReturnValue(null);
            const texture = createTexture(native);

            expect(() => texture.getImage(30, 0, 0)).toThrow(/no image for level 30, layer 0, faceSlice 0/);
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
            expect(native.transcodeBasis).toHaveBeenCalledWith(target, 0);
        });

        it("passes the alpha-to-opaque flag to libktx as a number", () => {
            const native = createMockKtxTexture();
            const texture = createTexture(native);

            texture.transcodeBasis(
                KtxTranscodeFormat.BC7_RGBA,
                KtxTranscodeFlags.TRANSCODE_ALPHA_DATA_TO_OPAQUE_FORMATS,
            );

            expect(native.transcodeBasis).toHaveBeenCalledWith("bc7", 4);
        });

        it("passes HIGH_QUALITY and combined flags", () => {
            const native = createMockKtxTexture();
            const texture = createTexture(native);

            texture.transcodeBasis(KtxTranscodeFormat.BC3_RGBA, KtxTranscodeFlags.HIGH_QUALITY);
            texture.transcodeBasis(
                KtxTranscodeFormat.BC3_RGBA,
                KtxTranscodeFlags.HIGH_QUALITY | KtxTranscodeFlags.TRANSCODE_ALPHA_DATA_TO_OPAQUE_FORMATS,
            );

            expect(native.transcodeBasis).toHaveBeenNthCalledWith(1, "bc3", 32);
            expect(native.transcodeBasis).toHaveBeenNthCalledWith(2, "bc3", 36);
        });

        it("throws for flag bits libktx does not define", () => {
            const native = createMockKtxTexture();
            const texture = createTexture(native);

            expect(() => texture.transcodeBasis(KtxTranscodeFormat.BC3_RGBA, 1 as KtxTranscodeFlags))
                .toThrow(/Unsupported transcodeFlags bits: 0x1/);
            expect(native.transcodeBasis).not.toHaveBeenCalled();
        });

        it("returns INVALID_OPERATION when libktx reports error 10", () => {
            const native = createMockKtxTexture({
                transcodeBasis: vi.fn(() => ({value: 10})),
            });
            const texture = createTexture(native);

            expect(texture.transcodeBasis(KtxTranscodeFormat.RGBA32, KtxTranscodeFlags.NONE))
                .toBe(KtxErrorCode.INVALID_OPERATION);
        });

        it("maps every known libktx error code to KtxErrorCode", () => {
            for (const value of [1, 11, 13, 14, 17, 20]) {
                const native = createMockKtxTexture({
                    transcodeBasis: vi.fn(() => ({value})),
                });
                const texture = createTexture(native);

                expect(texture.transcodeBasis(KtxTranscodeFormat.RGBA32, KtxTranscodeFlags.NONE)).toBe(value);
            }
        });

        it("accepts a plain number as the libktx error code", () => {
            const native = createMockKtxTexture({
                transcodeBasis: vi.fn(() => 14),
            });
            const texture = createTexture(native);

            expect(texture.transcodeBasis(KtxTranscodeFormat.RGBA32, KtxTranscodeFlags.NONE))
                .toBe(KtxErrorCode.TRANSCODE_FAILED);
        });

        it("throws a readable message for an unknown libktx error code", () => {
            const native = createMockKtxTexture({
                transcodeBasis: vi.fn(() => ({value: 99})),
            });
            const texture = createTexture(native);

            expect(() => texture.transcodeBasis(KtxTranscodeFormat.RGBA32, KtxTranscodeFlags.NONE))
                .toThrow("libktx returned an unknown error code: 99");
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
        it("passes threadCount when it is greater than 1", () => {
            const native = createMockKtxTexture();
            const texture = createTexture(native);

            texture.compressBasis({uastc: true, threadCount: 4});

            const params = native.compressBasis.mock.calls[0][0] as BasisParams;
            expect(params.threadCount).toBe(4);
        });

        it("leaves threadCount unset for 1 or when omitted", () => {
            const native = createMockKtxTexture();
            const texture = createTexture(native);

            texture.compressBasis({uastc: true, threadCount: 1});
            texture.compressBasis({uastc: true});

            for (const call of native.compressBasis.mock.calls) {
                expect((call[0] as BasisParams).threadCount).toBeUndefined();
            }
        });

        it("returns the mapped error and frees the libktx basisParams", () => {
            const native = createMockKtxTexture();
            const texture = createTexture(native);

            const code = texture.compressBasis({});

            expect(code).toBe(KtxErrorCode.SUCCESS);
            const params = native.compressBasis.mock.calls[0][0] as BasisParams;
            expect(params).toBeInstanceOf(BasisParams);
            expect(params.deleted).toBe(true);
        });

        it("passes uastcFlags as the UASTC level and defaults to LEVEL_DEFAULT", () => {
            const native = createMockKtxTexture();
            const texture = createTexture(native);

            texture.compressBasis({uastc: true});
            texture.compressBasis({uastc: true, uastcFlags: KtxUastcFlags.LEVEL_VERY_SLOW | KtxUastcFlags.FAVOR_BC7_ERROR});

            const calls = native.compressBasis.mock.calls.map(call => call[0] as BasisParams);
            expect(calls[0].uastcFlags).toEqual({value: KtxUastcFlags.LEVEL_DEFAULT});
            expect(calls[1].uastcFlags).toEqual({value: 20});
        });

        it("uses the libktx enum member for uastcFlags when one matches", () => {
            const native = createMockKtxTexture();
            const lib = {...createMockKtxLib(), pack_uastc_flag_bits: {LEVEL_SLOWER: {value: 3}}};
            const texture = new Ktx2Texture(lib, native, headerWithLevels(1));

            texture.compressBasis({uastc: true, uastcFlags: KtxUastcFlags.LEVEL_SLOWER});

            const params = native.compressBasis.mock.calls[0][0] as BasisParams;
            expect(params.uastcFlags).toBe(lib.pack_uastc_flag_bits.LEVEL_SLOWER);
        });

        it("passes normalMap and inputSwizzle for both codecs", () => {
            const native = createMockKtxTexture();
            const texture = createTexture(native);

            texture.compressBasis({normalMap: true, inputSwizzle: ["r", "r", "r", "g"]});
            texture.compressBasis({uastc: true, normalMap: false, inputSwizzle: ["b", "g", "r", "1"]});

            const calls = native.compressBasis.mock.calls.map(call => call[0] as BasisParams);
            expect(calls[0].normalMap).toBe(true);
            expect(calls[0].inputSwizzle).toBe("rrrg");
            expect(calls[1].normalMap).toBe(false);
            expect(calls[1].inputSwizzle).toBe("bgr1");
        });

        it("leaves normalMap and inputSwizzle unset when omitted", () => {
            const native = createMockKtxTexture();
            const texture = createTexture(native);

            texture.compressBasis({});

            const params = native.compressBasis.mock.calls[0][0] as BasisParams;
            expect(params.normalMap).toBeUndefined();
            expect(params.inputSwizzle).toBeUndefined();
        });

        it("throws for an invalid inputSwizzle before calling libktx", () => {
            const native = createMockKtxTexture();
            const texture = createTexture(native);

            expect(() => texture.compressBasis({inputSwizzle: ["r", "g", "x", "a"]})).toThrow(/Invalid inputSwizzle/);
            expect(() => texture.compressBasis({inputSwizzle: ["r", "g", "b"]})).toThrow(/Invalid inputSwizzle/);
            expect(native.compressBasis).not.toHaveBeenCalled();
        });

        it("fills UASTC params from IKtxBasisParams", () => {
            const native = createMockKtxTexture();
            const texture = createTexture(native);
            const basisParams: IKtxBasisParams = {
                verbose: true,
                uastc: true,
                compressionLevel: 4,
                qualityLevel: 50,
                uastcRDO: true,
                uastcRDOQualityScalar: 2.5,
            };

            texture.compressBasis(basisParams);

            const params = native.compressBasis.mock.calls[0][0] as BasisParams;
            expect(params.verbose).toBe(true);
            expect(params.uastc).toBe(true);
            // ETC1S-only settings are not passed for UASTC.
            expect(params.compressionLevel).toBeUndefined();
            expect(params.qualityLevel).toBeUndefined();
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

        it("passes ETC1S qualityLevel and compressionLevel", () => {
            const native = createMockKtxTexture();
            const texture = createTexture(native);

            texture.compressBasis({qualityLevel: 200, compressionLevel: 0});

            const params = native.compressBasis.mock.calls[0][0] as BasisParams;
            expect(params.uastc).toBe(false);
            expect(params.qualityLevel).toBe(200);
            expect(params.compressionLevel).toBe(0);
            expect(params.uastcFlags).toBeUndefined();
        });
    });

    describe("compressAstc", () => {
        it("throws because the method is not implemented", () => {
            const texture = createTexture();

            expect(() => texture.compressAstc(75)).toThrow(/Method not implemented/);
        });
    });

    describe("getTextureFormatInfo", () => {
        const layouts: Array<[VkFormat, TextureFormatInfo]> = [
            [VkFormat.ASTC_4X4_UNORM_BLOCK, TextureFormatInfo.astc4x4rgba()],
            [VkFormat.ASTC_4X4_SRGB_BLOCK, TextureFormatInfo.astc4x4rgba()],
            [VkFormat.BC7_UNORM_BLOCK, TextureFormatInfo.bc7()],
            [VkFormat.BC7_SRGB_BLOCK, TextureFormatInfo.bc7()],
            [VkFormat.BC3_UNORM_BLOCK, TextureFormatInfo.bc3()],
            [VkFormat.ETC2_R8G8B8A8_UNORM_BLOCK, TextureFormatInfo.etc2rgba()],
            [VkFormat.R8G8B8A8_UNORM, TextureFormatInfo.rgba32()],
            [VkFormat.R8G8B8A8_SRGB, TextureFormatInfo.rgba32()],
        ];

        it.each(layouts)("returns the block layout for VkFormat %s", (format, expected) => {
            const info = createTexture().getTextureFormatInfo(format);
            expect(info.blockWidth).toBe(expected.blockWidth);
            expect(info.blockHeight).toBe(expected.blockHeight);
            expect(info.blockDepth).toBe(expected.blockDepth);
            expect(info.bytesPerBlock).toBe(expected.bytesPerBlock);
        });

        it("throws for a format TextureFormatInfo.fromVkFormat cannot size", () => {
            expect(() => createTexture().getTextureFormatInfo(VkFormat.R8_UNORM))
                .toThrow("Unrecognized texture format for R8_UNORM");
        });

        it("reads values shared with KtxTranscodeFormat as Vulkan formats", () => {
            // VkFormat.R8_SNORM is 10, the same number as KtxTranscodeFormat.ASTC_4X4_RGBA.
            // It must not be sized as ASTC.
            expect(() => createTexture().getTextureFormatInfo(VkFormat.R8_SNORM))
                .toThrow("Unrecognized texture format for R8_SNORM");
        });

        it("sizes the texture's current vkFormat after a transcode", () => {
            const native = createMockKtxTexture({vkFormat: VkFormat.UNDEFINED});
            const texture = createTexture(native);
            expect(() => texture.getTextureFormatInfo(texture.vkFormat)).toThrow(/UNDEFINED/);

            native.vkFormat = VkFormat.BC7_SRGB_BLOCK;
            expect(texture.getTextureFormatInfo(texture.vkFormat).bytesPerBlock).toBe(16);
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
