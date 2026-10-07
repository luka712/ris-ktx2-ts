import type {VkFormat} from "./VkFormat";

/**
 * Parameters for {@link IKtx2Factory.create}, which creates an empty 2D texture.
 */
export interface IKtxTextureCreateInfo {

    /** Width of the base mip level, in pixels. */
    baseWidth: number;

    /** Height of the base mip level, in pixels. */
    baseHeight: number;

    /**
     * Vulkan format of the image data.
     *
     * Only {@link VkFormat.R8G8B8A8_UNORM} and {@link VkFormat.R8G8B8A8_SRGB}
     * are supported. Other values make {@link IKtx2Factory.create} throw.
     *
     * @defaultValue {@link VkFormat.R8G8B8A8_SRGB}
     */
    vkFormat?: VkFormat;

    /**
     * Number of mip levels.
     *
     * Mipmaps are not generated. Fill each level yourself with
     * {@link IKtx2Texture.setImageFromMemory}.
     *
     * @defaultValue 1
     */
    numLevels?: number;
}
