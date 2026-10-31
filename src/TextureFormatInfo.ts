import {VkFormat} from "./VkFormat";

/**
 * Describes how a texture format is laid out in memory, in blocks.
 *
 * For uncompressed formats a block is one pixel:
 * `blockWidth` and `blockHeight` are `1`, and `bytesPerBlock` is the bytes per pixel.
 *
 * For compressed formats such as BC7, a block is a group of pixels
 * (typically 4×4) stored in a fixed number of bytes.
 */
export class TextureFormatInfo {
    /** Width of one block, in pixels. */
    public readonly blockWidth: number;

    /** Height of one block, in pixels. */
    public readonly blockHeight: number;

    /** Depth of one block, in pixels. */
    public readonly blockDepth: number;

    /** Size of one block, in bytes. */
    public readonly bytesPerBlock: number;

    /**
     * Average number of bytes used per pixel.
     *
     * For uncompressed formats this is the bytes per pixel.
     * For compressed formats this is the average storage cost per pixel.
     */
    public get pixelSize(): number {
        return this.bytesPerBlock /
            (this.blockWidth * this.blockHeight * this.blockDepth);
    }

    /**
     * Creates a block-layout description.
     *
     * @param blockWidth - Block width, in pixels.
     * @param blockHeight - Block height, in pixels.
     * @param blockDepth - Block depth, in pixels.
     * @param bytesPerBlock - Bytes stored in one block.
     */
    public constructor(
        blockWidth: number,
        blockHeight: number,
        blockDepth: number,
        bytesPerBlock: number
    ) {
        this.blockWidth = blockWidth;
        this.blockHeight = blockHeight;
        this.blockDepth = blockDepth;
        this.bytesPerBlock = bytesPerBlock;
    }

    /**
     * Number of blocks needed to cover `width` pixels.
     *
     * @param width - Texture width, in pixels.
     * @returns Block count, rounded up to a whole block.
     */
    public getBlocksPerRow(width: number): number {
        return Math.ceil(width / this.blockWidth);
    }

    /**
     * Number of block rows needed to cover `height` pixels.
     *
     * @param height - Texture height, in pixels.
     * @returns Block-row count, rounded up to a whole block.
     */
    public getBlocksPerColumn(height: number): number {
        return Math.ceil(height / this.blockHeight);
    }

    /**
     * Number of block slices needed to cover `depth` pixels.
     *
     * @param depth - Texture depth, in pixels.
     * @returns Block-slice count, rounded up to a whole block.
     */
    public getBlocksPerSlice(depth: number): number {
        return Math.ceil(depth / this.blockDepth);
    }

    /**
     * Unaligned number of bytes in one row of blocks.
     *
     * @param width - Texture width, in pixels.
     * @returns Bytes per row, without a 256-byte alignment.
     */
    public getBytesPerRow(width: number): number {
        return this.getBlocksPerRow(width) * this.bytesPerBlock;
    }

    /**
     * WebGPU `bytesPerRow` for `width`.
     *
     * WebGPU requires `bytesPerRow` to be a multiple of 256.
     *
     * @param width - Texture width, in pixels.
     * @returns `getBytesPerRow(width)` rounded up to a multiple of 256.
     */
    public getAlignedBytesPerRow(width: number): number {
        const bytesPerRow = this.getBytesPerRow(width);
        return Math.ceil(bytesPerRow / 256) * 256;
    }

    /**
     * Byte size of one 2D mip level.
     *
     * @param width - Level width, in pixels.
     * @param height - Level height, in pixels.
     * @returns Level size, in bytes.
     */
    public getDataSize(width: number, height: number): number {
        const blocksX = this.getBlocksPerRow(width);
        const blocksY = this.getBlocksPerColumn(height);

        return blocksX * blocksY * this.bytesPerBlock;
    }

    /**
     * Byte size of one 3D mip level.
     *
     * @param width - Level width, in pixels.
     * @param height - Level height, in pixels.
     * @param depth - Level depth, in pixels.
     * @returns Level size, in bytes.
     */
    public getDataSize3D(
        width: number,
        height: number,
        depth: number
    ): number {
        const blocksX = this.getBlocksPerRow(width);
        const blocksY = this.getBlocksPerColumn(height);
        const blocksZ = this.getBlocksPerSlice(depth);

        return blocksX * blocksY * blocksZ * this.bytesPerBlock;
    }

    /**
     * BC7 layout: 4×4 blocks, 16 bytes per block.
     *
     * @returns The BC7 {@link TextureFormatInfo}.
     */
    public static bc7(): TextureFormatInfo {
        return new TextureFormatInfo(4, 4, 1, 16);
    }

    /**
     * BC3 layout: 4×4 blocks, 16 bytes per block.
     *
     * @returns The BC3 {@link TextureFormatInfo}.
     */
    public static bc3(): TextureFormatInfo {
        return new TextureFormatInfo(4, 4, 1, 16);
    }

    /**
     * ETC2 RGBA layout: 4×4 blocks, 16 bytes per block.
     *
     * @returns The ETC2 RGBA {@link TextureFormatInfo}.
     */
    public static etc2rgba(): TextureFormatInfo {
        return new TextureFormatInfo(4, 4, 1, 16);
    }

    /**
     * ASTC 4×4 RGBA layout: 4×4 blocks, 16 bytes per block.
     *
     * @returns The ASTC 4×4 RGBA {@link TextureFormatInfo}.
     */
    public static astc4x4rgba(): TextureFormatInfo {
        return new TextureFormatInfo(4, 4, 1, 16);
    }

    /**
     * ASTC 5×4 RGBA layout: 5×4 blocks, 16 bytes per block.
     *
     * @returns The ASTC 5×4 RGBA {@link TextureFormatInfo}.
     */
    public static astc5x4rgba(): TextureFormatInfo {
        return new TextureFormatInfo(5, 4, 1, 16);
    }

    /**
     * ASTC 5×5 RGBA layout: 5×5 blocks, 16 bytes per block.
     *
     * @returns The ASTC 5×5 RGBA {@link TextureFormatInfo}.
     */
    public static astc5x5rgba(): TextureFormatInfo {
        return new TextureFormatInfo(5, 5, 1, 16);
    }

    /**
     * ASTC 6×5 RGBA layout: 6×5 blocks, 16 bytes per block.
     *
     * @returns The ASTC 6×5 RGBA {@link TextureFormatInfo}.
     */
    public static astc6x5rgba(): TextureFormatInfo {
        return new TextureFormatInfo(6, 5, 1, 16);
    }

    /**
     * ASTC 6×6 RGBA layout: 6×6 blocks, 16 bytes per block.
     *
     * @returns The ASTC 6×6 RGBA {@link TextureFormatInfo}.
     */
    public static astc6x6rgba(): TextureFormatInfo {
        return new TextureFormatInfo(6, 6, 1, 16);
    }

    /**
     * ASTC 8×5 RGBA layout: 8×5 blocks, 16 bytes per block.
     *
     * @returns The ASTC 8×5 RGBA {@link TextureFormatInfo}.
     */
    public static astc8x5rgba(): TextureFormatInfo {
        return new TextureFormatInfo(8, 5, 1, 16);
    }

    /**
     * ASTC 8×6 RGBA layout: 8×6 blocks, 16 bytes per block.
     *
     * @returns The ASTC 8×6 RGBA {@link TextureFormatInfo}.
     */
    public static astc8x6rgba(): TextureFormatInfo {
        return new TextureFormatInfo(8, 6, 1, 16);
    }

    /**
     * ASTC 10×5 RGBA layout: 10×5 blocks, 16 bytes per block.
     *
     * @returns The ASTC 10×5 RGBA {@link TextureFormatInfo}.
     */
    public static astc10x5rgba(): TextureFormatInfo {
        return new TextureFormatInfo(10, 5, 1, 16);
    }

    /**
     * ASTC 10×6 RGBA layout: 10×6 blocks, 16 bytes per block.
     *
     * @returns The ASTC 10×6 RGBA {@link TextureFormatInfo}.
     */
    public static astc10x6rgba(): TextureFormatInfo {
        return new TextureFormatInfo(10, 6, 1, 16);
    }

    /**
     * ASTC 8×8 RGBA layout: 8×8 blocks, 16 bytes per block.
     *
     * @returns The ASTC 8×8 RGBA {@link TextureFormatInfo}.
     */
    public static astc8x8rgba(): TextureFormatInfo {
        return new TextureFormatInfo(8, 8, 1, 16);
    }

    /**
     * ASTC 10×8 RGBA layout: 10×8 blocks, 16 bytes per block.
     *
     * @returns The ASTC 10×8 RGBA {@link TextureFormatInfo}.
     */
    public static astc10x8rgba(): TextureFormatInfo {
        return new TextureFormatInfo(10, 8, 1, 16);
    }

    /**
     * ASTC 10×10 RGBA layout: 10×10 blocks, 16 bytes per block.
     *
     * @returns The ASTC 10×10 RGBA {@link TextureFormatInfo}.
     */
    public static astc10x10rgba(): TextureFormatInfo {
        return new TextureFormatInfo(10, 10, 1, 16);
    }

    /**
     * ASTC 12×10 RGBA layout: 12×10 blocks, 16 bytes per block.
     *
     * @returns The ASTC 12×10 RGBA {@link TextureFormatInfo}.
     */
    public static astc12x10rgba(): TextureFormatInfo {
        return new TextureFormatInfo(12, 10, 1, 16);
    }

    /**
     * ASTC 12×12 RGBA layout: 12×12 blocks, 16 bytes per block.
     *
     * @returns The ASTC 12×12 RGBA {@link TextureFormatInfo}.
     */
    public static astc12x12rgba(): TextureFormatInfo {
        return new TextureFormatInfo(12, 12, 1, 16);
    }

// 3D ASTC formats

    /**
     * ASTC 3×3×3 RGBA layout: 3×3×3 blocks, 16 bytes per block.
     *
     * @returns The ASTC 3×3×3 RGBA {@link TextureFormatInfo}.
     */
    public static astc3x3x3rgba(): TextureFormatInfo {
        return new TextureFormatInfo(3, 3, 3, 16);
    }

    /**
     * ASTC 4×3×3 RGBA layout: 4×3×3 blocks, 16 bytes per block.
     *
     * @returns The ASTC 4×3×3 RGBA {@link TextureFormatInfo}.
     */
    public static astc4x3x3rgba(): TextureFormatInfo {
        return new TextureFormatInfo(4, 3, 3, 16);
    }

    /**
     * ASTC 4×4×3 RGBA layout: 4×4×3 blocks, 16 bytes per block.
     *
     * @returns The ASTC 4×4×3 RGBA {@link TextureFormatInfo}.
     */
    public static astc4x4x3rgba(): TextureFormatInfo {
        return new TextureFormatInfo(4, 4, 3, 16);
    }

    /**
     * ASTC 4×4×4 RGBA layout: 4×4×4 blocks, 16 bytes per block.
     *
     * @returns The ASTC 4×4×4 RGBA {@link TextureFormatInfo}.
     */
    public static astc4x4x4rgba(): TextureFormatInfo {
        return new TextureFormatInfo(4, 4, 4, 16);
    }

    /**
     * ASTC 5×4×4 RGBA layout: 5×4×4 blocks, 16 bytes per block.
     *
     * @returns The ASTC 5×4×4 RGBA {@link TextureFormatInfo}.
     */
    public static astc5x4x4rgba(): TextureFormatInfo {
        return new TextureFormatInfo(5, 4, 4, 16);
    }

    /**
     * ASTC 5×5×4 RGBA layout: 5×5×4 blocks, 16 bytes per block.
     *
     * @returns The ASTC 5×5×4 RGBA {@link TextureFormatInfo}.
     */
    public static astc5x5x4rgba(): TextureFormatInfo {
        return new TextureFormatInfo(5, 5, 4, 16);
    }

    /**
     * ASTC 5×5×5 RGBA layout: 5×5×5 blocks, 16 bytes per block.
     *
     * @returns The ASTC 5×5×5 RGBA {@link TextureFormatInfo}.
     */
    public static astc5x5x5rgba(): TextureFormatInfo {
        return new TextureFormatInfo(5, 5, 5, 16);
    }

    /**
     * ASTC 6×5×5 RGBA layout: 6×5×5 blocks, 16 bytes per block.
     *
     * @returns The ASTC 6×5×5 RGBA {@link TextureFormatInfo}.
     */
    public static astc6x5x5rgba(): TextureFormatInfo {
        return new TextureFormatInfo(6, 5, 5, 16);
    }

    /**
     * ASTC 6×6×5 RGBA layout: 6×6×5 blocks, 16 bytes per block.
     *
     * @returns The ASTC 6×6×5 RGBA {@link TextureFormatInfo}.
     */
    public static astc6x6x5rgba(): TextureFormatInfo {
        return new TextureFormatInfo(6, 6, 5, 16);
    }

    /**
     * ASTC 6×6×6 RGBA layout: 6×6×6 blocks, 16 bytes per block.
     *
     * @returns The ASTC 6×6×6 RGBA {@link TextureFormatInfo}.
     */
    public static astc6x6x6rgba(): TextureFormatInfo {
        return new TextureFormatInfo(6, 6, 6, 16);
    }

    /**
     * PVRTC2 4bpp RGBA layout: 4×4 blocks, 8 bytes per block.
     *
     * @returns The PVRTC2 4bpp RGBA {@link TextureFormatInfo}.
     */
    public static pvrtc2Rgba4bpp(): TextureFormatInfo {
        return new TextureFormatInfo(4, 4, 1, 8);
    }

    /**
     * PVRTC1 4bpp RGBA layout: 4×4 blocks, 8 bytes per block.
     *
     * @returns The PVRTC1 4bpp RGBA {@link TextureFormatInfo}.
     */
    public static pvrtc1Rgba4bpp(): TextureFormatInfo {
        return new TextureFormatInfo(4, 4, 1, 8);
    }

    /**
     * Uncompressed 8-bit 4-channel layout: 1×1 blocks, 4 bytes per pixel.
     *
     * Channel order does not change the size. `B8G8R8A8_*` and
     * `A8B8G8R8_*_PACK32` use this same layout.
     *
     * @returns The 4-byte {@link TextureFormatInfo}.
     */
    public static rgba32(): TextureFormatInfo {
        return new TextureFormatInfo(1, 1, 1, 4);
    }

    /**
     * `D24_UNORM_S8_UINT` layout: 4 bytes per pixel.
     *
     * @returns The depth/stencil {@link TextureFormatInfo}.
     */
    public static depth24Stencil8(): TextureFormatInfo {
        return new TextureFormatInfo(1, 1, 1, 4);
    }

    /**
     * `D32_SFLOAT` layout: 4 bytes per pixel.
     *
     * @returns The 32-bit float depth {@link TextureFormatInfo}.
     */
    public static depth32float(): TextureFormatInfo {
        return new TextureFormatInfo(1, 1, 1, 4);
    }

    /**
     * Block layout for a Vulkan format this package knows how to size.
     *
     * sRGB, signed, integer, and scaled variants share the block size of the
     * matching unsigned normalized format. Channel order does not change the
     * byte size.
     *
     * - `R8G8B8A8_*`, `B8G8R8A8_*`, and `A8B8G8R8_*_PACK32` use {@link TextureFormatInfo.rgba32}.
     * - `D24_UNORM_S8_UINT` uses {@link TextureFormatInfo.depth24Stencil8}.
     * - `D32_SFLOAT` uses {@link TextureFormatInfo.depth32float}.
     * - `BC3_UNORM_BLOCK` and `BC3_SRGB_BLOCK` use {@link TextureFormatInfo.bc3}.
     * - `BC7_UNORM_BLOCK` and `BC7_SRGB_BLOCK` use {@link TextureFormatInfo.bc7}.
     * - `ETC2_R8G8B8A8_UNORM_BLOCK` and `ETC2_R8G8B8A8_SRGB_BLOCK` use {@link TextureFormatInfo.etc2rgba}.
     * - Every 2D `ASTC_*_UNORM_BLOCK`, `ASTC_*_SRGB_BLOCK`, and
     *   `ASTC_*_SFLOAT_BLOCK` format uses the layout with its block
     *   size, for example {@link TextureFormatInfo.astc6x6rgba} for `ASTC_6X6_SRGB_BLOCK`.
     *
     * @param vkFormat - Vulkan format.
     * @returns The matching layout.
     * @throws {Error} When `vkFormat` has no layout in this package.
     */
    public static fromVkFormat(vkFormat: VkFormat): TextureFormatInfo {
        switch (vkFormat) {
            case VkFormat.R8G8B8A8_UNORM:
            case VkFormat.R8G8B8A8_SNORM:
            case VkFormat.R8G8B8A8_USCALED:
            case VkFormat.R8G8B8A8_SSCALED:
            case VkFormat.R8G8B8A8_UINT:
            case VkFormat.R8G8B8A8_SINT:
            case VkFormat.R8G8B8A8_SRGB:
            case VkFormat.B8G8R8A8_UNORM:
            case VkFormat.B8G8R8A8_SNORM:
            case VkFormat.B8G8R8A8_USCALED:
            case VkFormat.B8G8R8A8_SSCALED:
            case VkFormat.B8G8R8A8_UINT:
            case VkFormat.B8G8R8A8_SINT:
            case VkFormat.B8G8R8A8_SRGB:
            case VkFormat.A8B8G8R8_UNORM_PACK32:
            case VkFormat.A8B8G8R8_SNORM_PACK32:
            case VkFormat.A8B8G8R8_USCALED_PACK32:
            case VkFormat.A8B8G8R8_SSCALED_PACK32:
            case VkFormat.A8B8G8R8_UINT_PACK32:
            case VkFormat.A8B8G8R8_SINT_PACK32:
            case VkFormat.A8B8G8R8_SRGB_PACK32:
                return this.rgba32();
            case VkFormat.D24_UNORM_S8_UINT:
                return this.depth24Stencil8();
            case VkFormat.D32_SFLOAT:
                return this.depth32float();
            case VkFormat.BC7_UNORM_BLOCK:
            case VkFormat.BC7_SRGB_BLOCK:
                return this.bc7();
            case VkFormat.BC3_UNORM_BLOCK:
            case VkFormat.BC3_SRGB_BLOCK:
                return this.bc3();
            case VkFormat.ETC2_R8G8B8A8_UNORM_BLOCK:
            case VkFormat.ETC2_R8G8B8A8_SRGB_BLOCK:
                return this.etc2rgba();
            default: {
                const astc = astcLayout(vkFormat);
                if (astc) {
                    return astc();
                }
                throw new Error(`TextureFormatInfo.fromVkFormat has no layout for VkFormat ${vkFormat}.`);
            }
        }
    }
}

/** 2D ASTC layouts, in `VkFormat` order (4×4 first, 12×12 last). */
const ASTC_LAYOUTS: ReadonlyArray<() => TextureFormatInfo> = [
    TextureFormatInfo.astc4x4rgba, TextureFormatInfo.astc5x4rgba, TextureFormatInfo.astc5x5rgba,
    TextureFormatInfo.astc6x5rgba, TextureFormatInfo.astc6x6rgba, TextureFormatInfo.astc8x5rgba,
    TextureFormatInfo.astc8x6rgba, TextureFormatInfo.astc8x8rgba, TextureFormatInfo.astc10x5rgba,
    TextureFormatInfo.astc10x6rgba, TextureFormatInfo.astc10x8rgba, TextureFormatInfo.astc10x10rgba,
    TextureFormatInfo.astc12x10rgba, TextureFormatInfo.astc12x12rgba,
];

/** Layout factory for a 2D ASTC `VkFormat`, or `undefined` for other formats. */
function astcLayout(vkFormat: VkFormat): (() => TextureFormatInfo) | undefined {
    if (vkFormat >= VkFormat.ASTC_4X4_UNORM_BLOCK && vkFormat <= VkFormat.ASTC_12X12_SRGB_BLOCK) {
        return ASTC_LAYOUTS[(vkFormat - VkFormat.ASTC_4X4_UNORM_BLOCK) >> 1];
    }
    if (vkFormat >= VkFormat.ASTC_4X4_SFLOAT_BLOCK && vkFormat <= VkFormat.ASTC_12X12_SFLOAT_BLOCK) {
        return ASTC_LAYOUTS[vkFormat - VkFormat.ASTC_4X4_SFLOAT_BLOCK];
    }
    return undefined;
}
