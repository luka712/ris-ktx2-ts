import type { IKtx2Texture } from "./IKtx2Texture";
import { TextureFormatInfo } from "./TextureFormatInfo";
import { VkFormat } from "./VkFormat";
import type { GPUUploadParams } from "./GPUUploadParams";

/** `GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST`. */
const DEFAULT_USAGE = 0x04 | 0x02;

/** `GPUTextureUsage.COPY_DST`, needed by `GPUQueue.writeTexture`. */
const COPY_DST = 0x02;

/**
 * Creates WebGPU textures from {@link IKtx2Texture} data.
 *
 * Supports 2D textures with all their mip levels. Upload uncompressed or
 * block-compressed data, for example after {@link IKtx2Texture.transcodeBasis}
 * or {@link IKtx2Texture.compressAstc}.
 *
 * Supported formats: `R8G8B8A8_UNORM`/`_SRGB`, `B8G8R8A8_UNORM`/`_SRGB`,
 * BC3, BC7, ETC2 RGBA, and every 2D ASTC block size (UNORM and sRGB).
 *
 * Request the features your formats need when you create the device:
 * `texture-compression-bc` for BC3 and BC7, `texture-compression-etc2`
 * for ETC2, and `texture-compression-astc` for ASTC.
 *
 * @example
 * ```ts
 * const texture = await factory.loadAsync("/textures/example.ktx2");
 * texture.transcodeBasis(KtxTranscodeFormat.BC7_RGBA, KtxTranscodeFlags.NONE);
 * const gpuTexture = WebGPUTextureLoader.load(device, texture);
 * texture.delete();
 * ```
 */
export class WebGPUTextureLoader {

    /** WebGPU format for each supported `VkFormat`. */
    private static readonly _formatMap: Partial<Record<VkFormat, GPUTextureFormat>> = {
        [VkFormat.R8G8B8A8_UNORM]: "rgba8unorm",
        [VkFormat.R8G8B8A8_SRGB]: "rgba8unorm-srgb",
        [VkFormat.B8G8R8A8_UNORM]: "bgra8unorm",
        [VkFormat.B8G8R8A8_SRGB]: "bgra8unorm-srgb",
        [VkFormat.BC3_UNORM_BLOCK]: "bc3-rgba-unorm",
        [VkFormat.BC3_SRGB_BLOCK]: "bc3-rgba-unorm-srgb",
        [VkFormat.BC7_UNORM_BLOCK]: "bc7-rgba-unorm",
        [VkFormat.BC7_SRGB_BLOCK]: "bc7-rgba-unorm-srgb",
        [VkFormat.ETC2_R8G8B8A8_UNORM_BLOCK]: "etc2-rgba8unorm",
        [VkFormat.ETC2_R8G8B8A8_SRGB_BLOCK]: "etc2-rgba8unorm-srgb",
        [VkFormat.ASTC_4X4_UNORM_BLOCK]: "astc-4x4-unorm",
        [VkFormat.ASTC_4X4_SRGB_BLOCK]: "astc-4x4-unorm-srgb",
        [VkFormat.ASTC_5X4_UNORM_BLOCK]: "astc-5x4-unorm",
        [VkFormat.ASTC_5X4_SRGB_BLOCK]: "astc-5x4-unorm-srgb",
        [VkFormat.ASTC_5X5_UNORM_BLOCK]: "astc-5x5-unorm",
        [VkFormat.ASTC_5X5_SRGB_BLOCK]: "astc-5x5-unorm-srgb",
        [VkFormat.ASTC_6X5_UNORM_BLOCK]: "astc-6x5-unorm",
        [VkFormat.ASTC_6X5_SRGB_BLOCK]: "astc-6x5-unorm-srgb",
        [VkFormat.ASTC_6X6_UNORM_BLOCK]: "astc-6x6-unorm",
        [VkFormat.ASTC_6X6_SRGB_BLOCK]: "astc-6x6-unorm-srgb",
        [VkFormat.ASTC_8X5_UNORM_BLOCK]: "astc-8x5-unorm",
        [VkFormat.ASTC_8X5_SRGB_BLOCK]: "astc-8x5-unorm-srgb",
        [VkFormat.ASTC_8X6_UNORM_BLOCK]: "astc-8x6-unorm",
        [VkFormat.ASTC_8X6_SRGB_BLOCK]: "astc-8x6-unorm-srgb",
        [VkFormat.ASTC_8X8_UNORM_BLOCK]: "astc-8x8-unorm",
        [VkFormat.ASTC_8X8_SRGB_BLOCK]: "astc-8x8-unorm-srgb",
        [VkFormat.ASTC_10X5_UNORM_BLOCK]: "astc-10x5-unorm",
        [VkFormat.ASTC_10X5_SRGB_BLOCK]: "astc-10x5-unorm-srgb",
        [VkFormat.ASTC_10X6_UNORM_BLOCK]: "astc-10x6-unorm",
        [VkFormat.ASTC_10X6_SRGB_BLOCK]: "astc-10x6-unorm-srgb",
        [VkFormat.ASTC_10X8_UNORM_BLOCK]: "astc-10x8-unorm",
        [VkFormat.ASTC_10X8_SRGB_BLOCK]: "astc-10x8-unorm-srgb",
        [VkFormat.ASTC_10X10_UNORM_BLOCK]: "astc-10x10-unorm",
        [VkFormat.ASTC_10X10_SRGB_BLOCK]: "astc-10x10-unorm-srgb",
        [VkFormat.ASTC_12X10_UNORM_BLOCK]: "astc-12x10-unorm",
        [VkFormat.ASTC_12X10_SRGB_BLOCK]: "astc-12x10-unorm-srgb",
        [VkFormat.ASTC_12X12_UNORM_BLOCK]: "astc-12x12-unorm",
        [VkFormat.ASTC_12X12_SRGB_BLOCK]: "astc-12x12-unorm-srgb",
    };

    private constructor() {
    }

    /**
     * Creates a 2D WebGPU texture and writes every mip level of `ktx` into it.
     *
     * @param gpu - Device that creates the texture.
     * @param ktx - Texture to upload. It must not need transcoding.
     * @param params - Optional upload settings, such as the texture usage.
     * @returns The new texture. Its `mipLevelCount` is {@link IKtx2Texture.numLevels}.
     * @throws {Error} When no device was passed, `ktx` holds Basis Universal
     * data, its format has no WebGPU equivalent here, or the size of a
     * block-compressed texture is not a multiple of its block size.
     */
    public static load(gpu: GPUDevice | null | undefined, ktx: IKtx2Texture, params: GPUUploadParams = {}): GPUTexture {
        const device = WebGPUTextureLoader._validate(gpu, ktx);
        return ktx.isArray
            ? WebGPUTextureLoader._loadTexture2DArray(device, ktx, params)
            : WebGPUTextureLoader._loadTexture2D(device, ktx, params);
    }

    private static _validate(gpu: GPUDevice | null | undefined, ktx: IKtx2Texture): GPUDevice {
        if (!gpu) {
            throw new Error("WebGPUTextureLoader: no GPUDevice.");
        }
        if (ktx.needsTranscoding) {
            throw new Error("WebGPUTextureLoader: the texture holds Basis Universal data. Call transcodeBasis first.");
        }
        return gpu;
    }

    private static _loadTexture2D(gpu: GPUDevice, ktx: IKtx2Texture, params: GPUUploadParams): GPUTexture {
        const format = WebGPUTextureLoader._toGPUTextureFormat(ktx.vkFormat);

        const info = TextureFormatInfo.fromVkFormat(ktx.vkFormat);
        if (ktx.width % info.blockWidth !== 0 || ktx.height % info.blockHeight !== 0) {
            throw new Error(
                `WebGPUTextureLoader: ${ktx.width}×${ktx.height} is not a multiple of the ` +
                `${info.blockWidth}×${info.blockHeight} block size of ${format}.`,
            );
        }

        const mipLevelCount = Math.max(1, ktx.numLevels);
        const texture = gpu.createTexture({
            label: ktx.filePath,
            size: { width: ktx.width, height: ktx.height, depthOrArrayLayers: 1 },
            format,
            mipLevelCount,
            usage: (params.textureUsage ?? DEFAULT_USAGE) | COPY_DST,
        });

        for (let level = 0; level < mipLevelCount; level++) {
            const width = Math.max(1, ktx.width >> level);
            const height = Math.max(1, ktx.height >> level);
            const data = ktx.getImage(level, 0, 0);

            gpu.queue.writeTexture(
                { texture, mipLevel: level },
                data as Uint8Array<ArrayBuffer>,
                {
                    offset: 0,
                    bytesPerRow: info.getBytesPerRow(width),
                    rowsPerImage: info.getBlocksPerColumn(height),
                },
                {
                    // Block-compressed copies cover whole blocks.
                    width: info.getBlocksPerRow(width) * info.blockWidth,
                    height: info.getBlocksPerColumn(height) * info.blockHeight,
                    depthOrArrayLayers: 1,
                },
            );
        }

        return texture;
    }

    private static _loadTexture2DArray(gpu: GPUDevice, ktx: IKtx2Texture, params: GPUUploadParams): GPUTexture {
        const format = WebGPUTextureLoader._toGPUTextureFormat(ktx.vkFormat);

        const info = TextureFormatInfo.fromVkFormat(ktx.vkFormat);
        if (ktx.width % info.blockWidth !== 0 || ktx.height % info.blockHeight !== 0) {
            throw new Error(
                `WebGPUTextureLoader: ${ktx.width}×${ktx.height} is not a multiple of the ` +
                `${info.blockWidth}×${info.blockHeight} block size of ${format}.`,
            );
        }

        const mipLevelCount = Math.max(1, ktx.numLevels);
        const texture = gpu.createTexture({
            label: ktx.filePath,
            textureBindingViewDimension: "2d-array",
            size: { width: ktx.width, height: ktx.height, depthOrArrayLayers: ktx.numLayers },
            format,
            mipLevelCount,
            usage: (params.textureUsage ?? DEFAULT_USAGE) | COPY_DST,
        });

        for (let layer = 0; layer < ktx.numLayers; layer++) {
            for (let level = 0; level < mipLevelCount; level++) {
                const width = Math.max(1, ktx.width >> level);
                const height = Math.max(1, ktx.height >> level);
                const data = ktx.getImage(level, layer, 0);

                gpu.queue.writeTexture(
                    { texture, mipLevel: level, origin: { x: 0, y: 0, z: layer } },
                    data as Uint8Array<ArrayBuffer>,
                    {
                        offset: 0,
                        bytesPerRow: info.getBytesPerRow(width),
                        rowsPerImage: info.getBlocksPerColumn(height),
                    },
                    {
                        // Block-compressed copies cover whole blocks.
                        width: info.getBlocksPerRow(width) * info.blockWidth,
                        height: info.getBlocksPerColumn(height) * info.blockHeight,
                        depthOrArrayLayers: 1,
                    },
                );
            }
        }

        return texture;
    }


    /**
     * WebGPU format for a `VkFormat`.
     *
     * @param vkFormat - Vulkan format, for example {@link IKtx2Texture.vkFormat}.
     * @returns The matching `GPUTextureFormat`.
     * @throws {Error} When the format is not supported by this loader.
     */
    private static _toGPUTextureFormat(vkFormat: VkFormat): GPUTextureFormat {
        const format = WebGPUTextureLoader._formatMap[vkFormat];
        if (!format) {
            throw new Error(`WebGPUTextureLoader: VkFormat ${VkFormat[vkFormat] ?? vkFormat} has no WebGPU format.`);
        }
        return format;
    }
}

