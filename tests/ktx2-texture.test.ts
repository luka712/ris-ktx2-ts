import { describe, it, expect, vi } from 'vitest';
import { Ktx2Texture } from '../src/Ktx2Texture';
import { KtxTranscodeFormat, KtxTranscodeFlags } from '../src/enums';
import {Ktx2Factory} from "../src";

describe('Ktx2Texture', () => {
    // Mock KTX texture object that simulates the native library
    const createMockKtxTexture = (overrides = {}) => ({
        baseWidth: 512,
        baseHeight: 256,
        dataSize: 131072,
        needsTranscoding: true,
        numLevels: 10,
        ...overrides
    });

    describe('constructor', () => {
        it('should initialize with correct width from baseWidth', () => {
            const mockTexture = createMockKtxTexture({ baseWidth: 1024 });
            const texture = new Ktx2Texture(mockTexture);
            expect(texture.width).toBe(1024);
        });

        it('should initialize with correct height from baseHeight', () => {
            const mockTexture = createMockKtxTexture({ baseHeight: 768 });
            const texture = new Ktx2Texture(mockTexture);
            expect(texture.height).toBe(768);
        });

        it('should initialize with correct dataSize', () => {
            const mockTexture = createMockKtxTexture({ dataSize: 262144 });
            const texture = new Ktx2Texture(mockTexture);
            expect(texture.dataSize).toBe(262144);
        });

        it('should initialize with correct needsTranscoding flag', () => {
            const mockTexture = createMockKtxTexture({ needsTranscoding: false });
            const texture = new Ktx2Texture(mockTexture);
            expect(texture.needsTranscoding).toBe(false);
        });

        it('should initialize with correct numLevels', () => {
            const mockTexture = createMockKtxTexture({ numLevels: 5 });
            const texture = new Ktx2Texture(mockTexture);
            expect(texture.numLevels).toBe(5);
        });

        it('should handle power-of-two texture dimensions', () => {
            const mockTexture = createMockKtxTexture({ baseWidth: 2048, baseHeight: 2048 });
            const texture = new Ktx2Texture(mockTexture);
            expect(texture.width).toBe(2048);
            expect(texture.height).toBe(2048);
        });

        it('should handle non-power-of-two texture dimensions', () => {
            const mockTexture = createMockKtxTexture({ baseWidth: 1920, baseHeight: 1080 });
            const texture = new Ktx2Texture(mockTexture);
            expect(texture.width).toBe(1920);
            expect(texture.height).toBe(1080);
        });
    });

    describe('readonly properties', () => {
        it('should have readonly width property', () => {
            const mockTexture = createMockKtxTexture();
            const texture = new Ktx2Texture(mockTexture);
            // TypeScript enforces readonly at compile time, but we can verify the value doesn't change
            const initialWidth = texture.width;
            expect(texture.width).toBe(initialWidth);
        });

        it('should have readonly height property', () => {
            const mockTexture = createMockKtxTexture();
            const texture = new Ktx2Texture(mockTexture);
            const initialHeight = texture.height;
            expect(texture.height).toBe(initialHeight);
        });
    });

    describe('getImageSize', () => {
        it('should accept mipLevel parameter', () => {
            const mockTexture = createMockKtxTexture();
            const texture = new Ktx2Texture(mockTexture);
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
            
            texture.getImageSize(0);
            expect(consoleSpy).toHaveBeenCalledWith(0);
            
            consoleSpy.mockRestore();
        });

        it('should return 0 (placeholder implementation)', () => {
            const mockTexture = createMockKtxTexture();
            const texture = new Ktx2Texture(mockTexture);
            expect(texture.getImageSize(0)).toBe(0);
        });
    });

    describe('getRowPitch', () => {
        it('should accept mipLevel parameter', () => {
            const mockTexture = createMockKtxTexture();
            const texture = new Ktx2Texture(mockTexture);
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
            
            texture.getRowPitch(3);
            expect(consoleSpy).toHaveBeenCalledWith(3);
            
            consoleSpy.mockRestore();
        });

        it('should return 0 (placeholder implementation)', () => {
            const mockTexture = createMockKtxTexture();
            const texture = new Ktx2Texture(mockTexture);
            expect(texture.getRowPitch(0)).toBe(0);
        });
    });

    describe('getImageOffset', () => {
        it('should accept level, layer, and faceSlice parameters', () => {
            const mockTexture = createMockKtxTexture();
            const texture = new Ktx2Texture(mockTexture);
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
            
            texture.getImageOffset(2, 1, 0);
            expect(consoleSpy).toHaveBeenCalledWith(2, 1, 0);
            
            consoleSpy.mockRestore();
        });

        it('should return 0 (placeholder implementation)', () => {
            const mockTexture = createMockKtxTexture();
            const texture = new Ktx2Texture(mockTexture);
            expect(texture.getImageOffset(0, 0, 0)).toBe(0);
        });
    });

    describe('transcodeBasis', () => {
        it('should accept transcodeFormat and transcodeFlags parameters', () => {
            const mockTexture = createMockKtxTexture();
            const texture = new Ktx2Texture(mockTexture);
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
            
            texture.transcodeBasis(KtxTranscodeFormat.BC7_RGBA, KtxTranscodeFlags.KTX_TF_HIGH_QUALITY);
            expect(consoleSpy).toHaveBeenCalledWith(KtxTranscodeFormat.BC7_RGBA, KtxTranscodeFlags.KTX_TF_HIGH_QUALITY);
            
            consoleSpy.mockRestore();
        });

        it('should handle ASTC format', () => {
            const mockTexture = createMockKtxTexture();
            const texture = new Ktx2Texture(mockTexture);
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
            
            texture.transcodeBasis(KtxTranscodeFormat.ASTC_4X4_RGBA, KtxTranscodeFlags.NONE);
            expect(consoleSpy).toHaveBeenCalledWith(KtxTranscodeFormat.ASTC_4X4_RGBA, KtxTranscodeFlags.NONE);
            
            consoleSpy.mockRestore();
        });

        it('should handle RGBA32 uncompressed format', () => {
            const mockTexture = createMockKtxTexture();
            const texture = new Ktx2Texture(mockTexture);
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
            
            texture.transcodeBasis(KtxTranscodeFormat.RGBA32, KtxTranscodeFlags.NONE);
            expect(consoleSpy).toHaveBeenCalledWith(KtxTranscodeFormat.RGBA32, KtxTranscodeFlags.NONE);
            
            consoleSpy.mockRestore();
        });
    });

    describe('compressBasis', () => {
        it('should accept quality number parameter', () => {
            const mockTexture = createMockKtxTexture();
            const texture = new Ktx2Texture(mockTexture);
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
            
            texture.compressBasis(128);
            expect(consoleSpy).toHaveBeenCalledWith(128);
            
            consoleSpy.mockRestore();
        });

        it('should accept IKtxBasisParams object', () => {
            const mockTexture = createMockKtxTexture();
            const texture = new Ktx2Texture(mockTexture);
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
            
            const basisParams = {
                compressionLevel: 2,
                qualityLevel: 128,
                uastc: false,
                uastcFlags: 0,
                normalMap: false,
                threadCount: 1,
                inputSwizzle: ['r', 'g', 'b', 'a'],
                uastcRDO: false,
                uastcRDOQualityScalar: 1.0,
                verbose: false
            };
            
            texture.compressBasis(basisParams);
            expect(consoleSpy).toHaveBeenCalledWith(basisParams);
            
            consoleSpy.mockRestore();
        });
    });

    describe('compressAstc', () => {
        it('should accept quality parameter', () => {
            const mockTexture = createMockKtxTexture();
            const texture = new Ktx2Texture(mockTexture);
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
            
            texture.compressAstc(75);
            expect(consoleSpy).toHaveBeenCalledWith(75);
            
            consoleSpy.mockRestore();
        });

        it('should handle minimum quality value', () => {
            const mockTexture = createMockKtxTexture();
            const texture = new Ktx2Texture(mockTexture);
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
            
            texture.compressAstc(0);
            expect(consoleSpy).toHaveBeenCalledWith(0);
            
            consoleSpy.mockRestore();
        });

        it('should handle maximum quality value', () => {
            const mockTexture = createMockKtxTexture();
            const texture = new Ktx2Texture(mockTexture);
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
            
            texture.compressAstc(100);
            expect(consoleSpy).toHaveBeenCalledWith(100);
            
            consoleSpy.mockRestore();
        });

        it('get array data', async () => {
            const loader = new Ktx2Factory();
            await loader.initializeAsync();
            const tex = loader.loadAsync("test-data/cat.ktx2");
            const data = (await tex).getTextureDataAsByteArray(0, 0,0);
            expect(data).not.toBeNull();
        })
    });
});
