import type {IKtx2Texture} from "./IKtx2Texture";
import {TextureFormatInfo} from "./TextureFormatInfo";
import {VkFormat} from "./VkFormat";

/** `GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST`. */
const DEFAULT_USAGE = 0x04 | 0x02;

/**
 * Parameters for {@link WebGPUTextureLoader}.
 */
export interface IWebGPUTextureLoaderParams {

    /**
     * WebGPU device that creates the textures.
     *
     * Request the features your formats need when you create the device:
     * `texture-compression-bc` for BC3 and BC7, `texture-compression-etc2`
     * for ETC2, and `texture-compression-astc` for ASTC.
     */
    gpu?: GPUDevice | null;

    /**
     * Usage flags for created textures.
     *
     * Defaults to `GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST`.
     * `COPY_DST` is always added, because the image data is written with
     * `GPUQueue.writeTexture`.
     */
    usage?: GPUTextureUsageFlags;
}

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
 * @example
 * ```ts
 * const loader = new WebGPUTextureLoader({ gpu: device });
 * const texture = await factory.loadAsync("/textures/example.ktx2");
 * texture.transcodeBasis(KtxTranscodeFormat.BC7_RGBA, KtxTranscodeFlags.NONE);
 * const gpuTexture = loader.load(texture);
 * texture.delete();
 * ```
 */
export class WebGPUTextureLoader {

    private readonly _gpu?: GPUDevice | null;
    private readonly _usage: GPUTextureUsageFlags;

    /**
     * @param params - The device to create textures with, and optional usage flags.
     */
    public constructor(params: IWebGPUTextureLoaderParams) {
        this._gpu = params.gpu;
        this._usage = (params.usage ?? DEFAULT_USAGE) | 0x02;
    }

    /**
     * Creates a 2D WebGPU texture and writes every mip level of `ktx` into it.
     *
     * @param ktx - Texture to upload. It must not need transcoding.
     * @returns The new texture. Its `mipLevelCount` is {@link IKtx2Texture.numLevels}.
     * @throws {Error} When no device was passed, `ktx` holds Basis Universal
     * data, its format has no WebGPU equivalent here, the device lacks the
     * compression feature for the format, or the size of a block-compressed
     * texture is not a multiple of its block size.
     */
    public load(ktx: IKtx2Texture): GPUTexture {
        return this._loadTexture2D(ktx);
    }

    private _validate(ktx: IKtx2Texture): GPUDevice {
        if (!this._gpu) {
            throw new Error("WebGPUTextureLoader: no GPUDevice. Pass gpu to the constructor.");
        }
        if (ktx.needsTranscoding) {
            throw new Error("WebGPUTextureLoader: the texture holds Basis Universal data. Call transcodeBasis first.");
        }
        return this._gpu;
    }

    private _loadTexture2D(ktx: IKtx2Texture): GPUTexture {
        const gpu = this._validate(ktx);
        const format = WebGPUTextureLoader.toGPUTextureFormat(ktx.vkFormat);

        const feature = requiredFeature(format);
        if (feature && !gpu.features.has(feature)) {
            throw new Error(`WebGPUTextureLoader: ${format} needs the "${feature}" device feature.`);
        }

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
            size: {width: ktx.width, height: ktx.height, depthOrArrayLayers: 1},
            format,
            mipLevelCount,
            usage: this._usage,
        });

        for (let level = 0; level < mipLevelCount; level++) {
            const width = Math.max(1, ktx.width >> level);
            const height = Math.max(1, ktx.height >> level);
            const data = ktx.getImage(level, 0, 0);

            gpu.queue.writeTexture(
                {texture, mipLevel: level},
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

    /**
     * WebGPU format for a `VkFormat`.
     *
     * @param vkFormat - Vulkan format, for example {@link IKtx2Texture.vkFormat}.
     * @returns The matching `GPUTextureFormat`.
     * @throws {Error} When the format is not supported by this loader.
     */
    public static toGPUTextureFormat(vkFormat: VkFormat): GPUTextureFormat {
        switch (vkFormat) {
            case VkFormat.R8G8B8A8_UNORM: return "rgba8unorm";
            case VkFormat.R8G8B8A8_SRGB: return "rgba8unorm-srgb";
            case VkFormat.B8G8R8A8_UNORM: return "bgra8unorm";
            case VkFormat.B8G8R8A8_SRGB: return "bgra8unorm-srgb";
            case VkFormat.BC3_UNORM_BLOCK: return "bc3-rgba-unorm";
            case VkFormat.BC3_SRGB_BLOCK: return "bc3-rgba-unorm-srgb";
            case VkFormat.BC7_UNORM_BLOCK: return "bc7-rgba-unorm";
            case VkFormat.BC7_SRGB_BLOCK: return "bc7-rgba-unorm-srgb";
            case VkFormat.ETC2_R8G8B8A8_UNORM_BLOCK: return "etc2-rgba8unorm";
            case VkFormat.ETC2_R8G8B8A8_SRGB_BLOCK: return "etc2-rgba8unorm-srgb";
        }
        if (vkFormat >= VkFormat.ASTC_4X4_UNORM_BLOCK && vkFormat <= VkFormat.ASTC_12X12_SRGB_BLOCK) {
            const block = ASTC_BLOCKS[(vkFormat - VkFormat.ASTC_4X4_UNORM_BLOCK) >> 1];
            const srgb = (vkFormat - VkFormat.ASTC_4X4_UNORM_BLOCK) % 2 === 1;
            return `astc-${block}-${srgb ? "unorm-srgb" : "unorm"}` as GPUTextureFormat;
        }
        throw new Error(`WebGPUTextureLoader: VkFormat ${VkFormat[vkFormat] ?? vkFormat} has no WebGPU format.`);
    }
}

/** 2D ASTC block sizes, in `VkFormat` order. */
const ASTC_BLOCKS = [
    "4x4", "5x4", "5x5", "6x5", "6x6", "8x5", "8x6",
    "8x8", "10x5", "10x6", "10x8", "10x10", "12x10", "12x12",
] as const;

/** Device feature a compressed format needs, or `undefined` for uncompressed formats. */
function requiredFeature(format: GPUTextureFormat): GPUFeatureName | undefined {
    if (format.startsWith("bc")) return "texture-compression-bc";
    if (format.startsWith("etc2") || format.startsWith("eac")) return "texture-compression-etc2";
    if (format.startsWith("astc")) return "texture-compression-astc";
    return undefined;
}
