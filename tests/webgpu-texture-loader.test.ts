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
        const cases: Array<[VkFormat, string]> = [
            [VkFormat.R8G8B8A8_UNORM, "rgba8unorm"],
            [VkFormat.BC7_SRGB_BLOCK, "bc7-rgba-unorm-srgb"],
            [VkFormat.ASTC_4X4_UNORM_BLOCK, "astc-4x4-unorm"],
            [VkFormat.ASTC_12X12_SRGB_BLOCK, "astc-12x12-unorm-srgb"],
        ];
        for (const [vkFormat, format] of cases) {
            const {device} = mockDevice();
            WebGPUTextureLoader.load(device, mockKtx({vkFormat, width: 12, height: 12}));
            expect(device.createTexture.mock.calls[0][0].format).toBe(format);
        }
        const {device} = mockDevice();
        expect(() => WebGPUTextureLoader.load(device, mockKtx({vkFormat: VkFormat.UNDEFINED}))).toThrow(/no WebGPU format/);
    });

    it("throws without a device or with Basis data", () => {
        expect(() => WebGPUTextureLoader.load(undefined, mockKtx({}))).toThrow(/GPUDevice/);
        const {device} = mockDevice();
        expect(() => WebGPUTextureLoader.load(device, mockKtx({needsTranscoding: true}))).toThrow(/transcodeBasis/);
    });

    it("rejects sizes that are not whole blocks", () => {
        const {device} = mockDevice(["texture-compression-bc"]);
        expect(() => WebGPUTextureLoader.load(device, mockKtx({vkFormat: VkFormat.BC7_UNORM_BLOCK, width: 6}))).toThrow(/block size/);
    });

    it("writes every mip level with block-aligned copies", () => {
        const {device, texture} = mockDevice(["texture-compression-bc"]);
        const ktx = mockKtx({vkFormat: VkFormat.BC7_UNORM_BLOCK, width: 8, height: 8, numLevels: 4});
        const result = WebGPUTextureLoader.load(device, ktx);

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

    it("uses the requested usage and always adds COPY_DST", () => {
        const {device} = mockDevice();
        WebGPUTextureLoader.load(device, mockKtx({}));
        expect(device.createTexture.mock.calls[0][0].usage).toBe(0x04 | 0x02);
        WebGPUTextureLoader.load(device, mockKtx({}), {textureUsage: 0x04 | 0x10});
        expect(device.createTexture.mock.calls[1][0].usage).toBe(0x04 | 0x10 | 0x02);
    });

    it("uses tight rows for RGBA8", () => {
        const {device} = mockDevice();
        WebGPUTextureLoader.load(device, mockKtx({width: 5, height: 3}));
        expect(device.queue.writeTexture.mock.calls[0][2]).toEqual({offset: 0, bytesPerRow: 20, rowsPerImage: 3});
    });

    it("uploads every level of every layer for an array texture", () => {
        const {device} = mockDevice();
        const ktx = mockKtx({numLayers: 3, numLevels: 2, isArray: true});
        WebGPUTextureLoader.load(device, ktx);

        expect(device.createTexture.mock.calls[0][0].size).toEqual({width: 8, height: 8, depthOrArrayLayers: 3});
        expect(device.queue.writeTexture).toHaveBeenCalledTimes(6);
        expect(ktx.getImage).toHaveBeenCalledWith(1, 2, 0);
        expect(device.queue.writeTexture.mock.calls[5][0]).toEqual(expect.objectContaining({mipLevel: 1, origin: {x: 0, y: 0, z: 2}}));
    });

    it("uploads one layer when isArray is false", () => {
        for (const numLayers of [0, 1]) {
            const {device} = mockDevice();
            WebGPUTextureLoader.load(device, mockKtx({numLayers, isArray: false}));
            expect(device.createTexture.mock.calls[0][0].size.depthOrArrayLayers).toBe(1);
        }
    });
});
