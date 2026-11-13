import {describe, expect, it, vi} from "vitest";
import {WebGPUTextureLoader} from "../src/WebGPUTextureLoader";
import {VkFormat} from "../src/VkFormat";
import type {IKtx2Texture} from "../src/IKtx2Texture";

function mockDevice(features: string[] = []) {
    const texture = {};
    return {
        texture,
        device: {
            features: new Set(features),
            createTexture: vi.fn(() => texture),
            queue: {writeTexture: vi.fn()},
        } as unknown as GPUDevice & {createTexture: ReturnType<typeof vi.fn>; queue: {writeTexture: ReturnType<typeof vi.fn>}},
    };
}

function mockKtx(overrides: Partial<IKtx2Texture>): IKtx2Texture {
    return {
        width: 8, height: 8, numLevels: 1, needsTranscoding: false, vkFormat: VkFormat.R8G8B8A8_SRGB,
        getImage: vi.fn(() => new Uint8Array(16)),
        ...overrides,
    } as unknown as IKtx2Texture;
}

describe("WebGPUTextureLoader", () => {
    it("maps formats", () => {
        expect(WebGPUTextureLoader.toGPUTextureFormat(VkFormat.R8G8B8A8_UNORM)).toBe("rgba8unorm");
        expect(WebGPUTextureLoader.toGPUTextureFormat(VkFormat.BC7_SRGB_BLOCK)).toBe("bc7-rgba-unorm-srgb");
        expect(WebGPUTextureLoader.toGPUTextureFormat(VkFormat.ASTC_4X4_UNORM_BLOCK)).toBe("astc-4x4-unorm");
        expect(WebGPUTextureLoader.toGPUTextureFormat(VkFormat.ASTC_12X12_SRGB_BLOCK)).toBe("astc-12x12-unorm-srgb");
        expect(WebGPUTextureLoader.toGPUTextureFormat(VkFormat.ASTC_6X5_SRGB_BLOCK)).toBe("astc-6x5-unorm-srgb");
        expect(() => WebGPUTextureLoader.toGPUTextureFormat(VkFormat.UNDEFINED)).toThrow();
    });

    it("throws without a device or with Basis data", () => {
        expect(() => new WebGPUTextureLoader({}).load(mockKtx({}))).toThrow(/GPUDevice/);
        const {device} = mockDevice();
        expect(() => new WebGPUTextureLoader({gpu: device}).load(mockKtx({needsTranscoding: true}))).toThrow(/transcodeBasis/);
    });

    it("requires the compression feature", () => {
        const {device} = mockDevice();
        expect(() => new WebGPUTextureLoader({gpu: device}).load(mockKtx({vkFormat: VkFormat.BC7_UNORM_BLOCK}))).toThrow(/texture-compression-bc/);
    });

    it("rejects sizes that are not whole blocks", () => {
        const {device} = mockDevice(["texture-compression-bc"]);
        expect(() => new WebGPUTextureLoader({gpu: device}).load(mockKtx({vkFormat: VkFormat.BC7_UNORM_BLOCK, width: 6}))).toThrow(/block size/);
    });

    it("writes every mip level with block-aligned copies", () => {
        const {device, texture} = mockDevice(["texture-compression-bc"]);
        const ktx = mockKtx({vkFormat: VkFormat.BC7_UNORM_BLOCK, width: 8, height: 8, numLevels: 4});
        const result = new WebGPUTextureLoader({gpu: device}).load(ktx);

        expect(result).toBe(texture);
        expect(device.createTexture).toHaveBeenCalledWith(expect.objectContaining({
            format: "bc7-rgba-unorm", mipLevelCount: 4, size: {width: 8, height: 8, depthOrArrayLayers: 1},
        }));
        const calls = device.queue.writeTexture.mock.calls;
        expect(calls).toHaveLength(4);
        expect(calls[0][2]).toEqual({offset: 0, bytesPerRow: 32, rowsPerImage: 2});
        expect(calls[0][3]).toEqual({width: 8, height: 8, depthOrArrayLayers: 1});
        // 1×1 level still copies one whole 4×4 block.
        expect(calls[3][2]).toEqual({offset: 0, bytesPerRow: 16, rowsPerImage: 1});
        expect(calls[3][3]).toEqual({width: 4, height: 4, depthOrArrayLayers: 1});
    });

    it("uses tight rows for RGBA8", () => {
        const {device} = mockDevice();
        new WebGPUTextureLoader({gpu: device}).load(mockKtx({width: 5, height: 3}));
        expect(device.queue.writeTexture.mock.calls[0][2]).toEqual({offset: 0, bytesPerRow: 20, rowsPerImage: 3});
    });
});
