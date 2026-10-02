import { describe, it, expect, vi } from 'vitest';
import {
    KtxCreateStorage,
    KtxErrorCode,
    KtxTranscodeFlags,
    KtxTranscodeFormat,
    VkFormat,
    type IKtxTextureCreateInfo,
} from 'ris-ktx2-api';
import { Ktx2Texture } from '../src/Ktx2Texture';
import { Mapper } from '../src/Mapper';

/** KTX2 header `levelCount` is a little-endian uint32 at byte 40. */
const LEVEL_COUNT_OFFSET = 40;

function headerWithLevelCount(levelCount: number): Uint8Array {
    const bytes = new Uint8Array(LEVEL_COUNT_OFFSET + 4);
    new DataView(bytes.buffer).setUint32(LEVEL_COUNT_OFFSET, levelCount, true);
    return bytes;
}

function mockKtxTexture(overrides: Record<string, unknown> = {}): any {
    return {
        baseWidth: 512,
        baseHeight: 256,
        dataSize: 131072,
        vkFormat: VkFormat.R8G8B8A8_SRGB,
        needsTranscoding: true,
        ...overrides,
    };
}

describe('Ktx2Texture', () => {
    describe('constructor', () => {
        it('reads width, height, and dataSize from the libktx texture', () => {
            const texture = new Ktx2Texture(
                {},
                mockKtxTexture({ baseWidth: 1920, baseHeight: 1080, dataSize: 262144 }),
                headerWithLevelCount(1),
            );
            expect(texture.width).toBe(1920);
            expect(texture.height).toBe(1080);
            expect(texture.dataSize).toBe(262144);
        });

        it('reads needsTranscoding from the libktx texture', () => {
            const texture = new Ktx2Texture(
                {},
                mockKtxTexture({ needsTranscoding: false }),
                headerWithLevelCount(1),
            );
            expect(texture.needsTranscoding).toBe(false);
        });

        it('reads numLevels from the KTX2 header', () => {
            const texture = new Ktx2Texture({}, mockKtxTexture(), headerWithLevelCount(5));
            expect(texture.numLevels).toBe(5);
        });

        it('reads numLevels from create info when the texture is created empty', () => {
            const createInfo: IKtxTextureCreateInfo = {
                baseWidth: 64,
                baseHeight: 32,
                numLevels: 4,
            };
            const texture = new Ktx2Texture({}, mockKtxTexture(), createInfo);
            expect(texture.numLevels).toBe(4);
        });

        it('copies numLevels from another Ktx2Texture', () => {
            const original = new Ktx2Texture({}, mockKtxTexture(), headerWithLevelCount(7));
            const copy = new Ktx2Texture({}, mockKtxTexture(), original, 'cat.ktx2');
            expect(copy.numLevels).toBe(7);
            expect(copy.filePath).toBe('cat.ktx2');
        });
    });

    describe('getImage', () => {
        it('returns the bytes from the libktx texture', () => {
            const image = new Uint8Array([1, 2, 3, 4]);
            const ktxTexture = mockKtxTexture({
                getImage: vi.fn(() => image),
            });
            const texture = new Ktx2Texture({}, ktxTexture, headerWithLevelCount(1));
            expect(texture.getImage(1, 2, 3)).toBe(image);
            expect(ktxTexture.getImage).toHaveBeenCalledWith(1, 2, 3);
        });
    });

    describe('getTextureFormatInfo', () => {
        const texture = new Ktx2Texture({}, mockKtxTexture(), headerWithLevelCount(1));

        it('returns a 4-byte layout for RGBA32 and R8G8B8A8', () => {
            expect(texture.getTextureFormatInfo(KtxTranscodeFormat.RGBA32).bytesPerBlock).toBe(4);
            expect(texture.getTextureFormatInfo(VkFormat.R8G8B8A8_UNORM).blockWidth).toBe(1);
            expect(texture.getTextureFormatInfo(VkFormat.R8G8B8A8_SRGB).bytesPerBlock).toBe(4);
        });

        it('returns a 4x4 16-byte layout for BC7, BC3, ETC2, and ASTC 4x4', () => {
            for (const format of [
                KtxTranscodeFormat.BC7_RGBA,
                VkFormat.BC7_UNORM_BLOCK,
                KtxTranscodeFormat.BC3_RGBA,
                VkFormat.BC3_UNORM_BLOCK,
                KtxTranscodeFormat.ETC2_RGBA,
                VkFormat.ETC2_R8G8B8A8_UNORM_BLOCK,
                KtxTranscodeFormat.ASTC_4X4_RGBA,
                VkFormat.ASTC_4X4_UNORM_BLOCK,
            ]) {
                const info = texture.getTextureFormatInfo(format);
                expect(info.blockWidth).toBe(4);
                expect(info.blockHeight).toBe(4);
                expect(info.bytesPerBlock).toBe(16);
            }
        });

        it('throws for a format it does not recognize', () => {
            expect(() => texture.getTextureFormatInfo(VkFormat.R8_UNORM)).toThrow(/Unrecognized texture format/);
        });
    });

    describe('transcodeBasis', () => {
        it('maps a supported target and a success code', () => {
            const ktxLib = {
                TranscodeTarget: {
                    BC7_RGBA: 'bc7',
                    ASTC_4x4_RGBA: 'astc',
                    BC3_RGBA: 'bc3',
                    ETC2_RGBA: 'etc2',
                    RGBA32: 'rgba',
                },
                TranscodeFlags: {
                    TRANSCODE_ALPHA_DATA_TO_OPAQUE_FORMATS: 'alpha-to-opaque',
                },
            };
            const ktxTexture = mockKtxTexture({
                transcodeBasis: vi.fn(() => ({ value: 0 })),
            });
            const texture = new Ktx2Texture(ktxLib, ktxTexture, headerWithLevelCount(1));
            const code = texture.transcodeBasis(
                KtxTranscodeFormat.BC7_RGBA,
                KtxTranscodeFlags.TRANSCODE_ALPHA_DATA_TO_OPAQUE_FORMATS,
            );
            expect(code).toBe(KtxErrorCode.SUCCESS);
            expect(ktxTexture.transcodeBasis).toHaveBeenCalledWith('bc7', 'alpha-to-opaque');
        });

        it('throws for an unsupported transcode target', () => {
            const texture = new Ktx2Texture(
                { TranscodeTarget: {}, TranscodeFlags: {} },
                mockKtxTexture(),
                headerWithLevelCount(1),
            );
            expect(() => texture.transcodeBasis(
                999 as KtxTranscodeFormat,
                KtxTranscodeFlags.TRANSCODE_ALPHA_DATA_TO_OPAQUE_FORMATS,
            )).toThrow(/Unsupported transcodeFormat/);
        });
    });

    describe('compressAstc', () => {
        it('is not implemented', () => {
            const texture = new Ktx2Texture({}, mockKtxTexture(), headerWithLevelCount(1));
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
            expect(() => texture.compressAstc(75)).toThrow(/not implemented/i);
            expect(consoleSpy).toHaveBeenCalledWith(75);
            consoleSpy.mockRestore();
        });
    });
});

describe('Mapper', () => {
    const ktxLib = {
        VkFormat: {
            R8G8B8A8_UNORM: 'unorm',
            R8G8B8A8_SRGB: 'srgb',
        },
        TextureCreateStorageEnum: {
            ALLOC_STORAGE: 'alloc',
            NO_STORAGE: 'none',
        },
    };

    it('maps the Vulkan formats libktx is asked for', () => {
        expect(Mapper.mapVkFormat(ktxLib, VkFormat.R8G8B8A8_UNORM)).toBe('unorm');
        expect(Mapper.mapVkFormat(ktxLib, VkFormat.R8G8B8A8_SRGB)).toBe('srgb');
        expect(() => Mapper.mapVkFormat(ktxLib, VkFormat.R8_UNORM)).toThrow(/Unsupported VkFormat/);
    });

    it('maps libktx error codes that this package handles', () => {
        expect(Mapper.mapErrorCodeFromKtxLib({ value: 0 })).toBe(KtxErrorCode.SUCCESS);
        expect(Mapper.mapErrorCodeFromKtxLib({ value: 10 })).toBe(KtxErrorCode.INVALID_OPERATION);
        expect(() => Mapper.mapErrorCodeFromKtxLib({ value: 4 })).toThrow(/Not implemented KtxErrorCode/);
    });

    it('maps KtxCreateStorage onto the libktx storage enum', () => {
        expect(Mapper.mapStorage(ktxLib, KtxCreateStorage.ALLOC_STORAGE)).toBe('alloc');
        expect(Mapper.mapStorage(ktxLib, KtxCreateStorage.NO_STORAGE)).toBe('none');
        expect(() => Mapper.mapStorage(ktxLib, 9 as KtxCreateStorage)).toThrow(/Not implemented KtxCreateStorage/);
    });
});
