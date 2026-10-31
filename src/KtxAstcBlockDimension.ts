import type {IKtx2Texture} from "./IKtx2Texture";

/**
 * ASTC block dimensions supported by the KTX2 format.
 *
 * Includes all 2D and 3D ASTC block dimensions.
 *
 * Only the 2D dimensions are supported for now: {@link IKtx2Texture.compressAstc}
 * works on 2D textures, and the 3D dimensions (for example `D3x3x3`) are
 * reserved for 3D texture support in a future release.
 */
export enum KtxAstcBlockDimension {
    // 2D formats
    /** The 4x4 2D format. */
    D4x4,
    /** The 5x4 2D format. */
    D5x4,
    /** The 5x5 2D format. */
    D5x5,
    /** The 6x5 2D format. */
    D6x5,
    /** The 6x6 2D format. */
    D6x6,
    /** The 8x5 2D format. */
    D8x5,
    /** The 8x6 2D format. */
    D8x6,
    /** The 10x5 2D format. */
    D10x5,
    /** The 10x6 2D format. */
    D10x6,
    /** The 8x8 2D format. */
    D8x8,
    /** The 10x8 2D format. */
    D10x8,
    /** The 10x10 2D format. */
    D10x10,
    /** The 12x10 2D format. */
    D12x10,
    /** The 12x12 2D format. */
    D12x12,

    // 3D formats
    /** The 3x3x3 3D format. */
    D3x3x3,
    /** The 4x3x3 3D format. */
    D4x3x3,
    /** The 4x4x3 3D format. */
    D4x4x3,
    /** The 4x4x4 3D format. */
    D4x4x4,
    /** The 5x4x4 3D format. */
    D5x4x4,
    /** The 5x5x4 3D format. */
    D5x5x4,
    /** The 5x5x5 3D format. */
    D5x5x5,
    /** The 6x5x5 3D format. */
    D6x5x5,
    /** The 6x6x5 3D format. */
    D6x6x5,
    /** The 6x6x6 3D format. */
    D6x6x6
}