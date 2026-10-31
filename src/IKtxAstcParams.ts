import type { KtxAstcBlockDimension } from "./KtxAstcBlockDimension";
import type { KtxAstcEncoderMode } from "./KtxAstcEncoderMode";
import type { KtxAstcQualityLevel } from "./KtxAstcQualityLevel";
import type { IKtx2Texture } from "./IKtx2Texture";

/**
 * ASTC texture compression parameters.
 *
 * Controls the ASTC encoder configuration, including block dimensions,
 * encoding mode, compression quality, and input processing options.
 */
export interface IKtxAstcParams {

    /**
     * ASTC block dimensions used for compression.
     *
     * Smaller blocks generally provide better image quality at the cost
     * of a larger compressed texture size.
     *
     * Use a 2D dimension. The 3D dimensions are not supported yet.
     *
     * @defaultValue {@link KtxAstcBlockDimension.D4x4}
     */
    blockDimension?: KtxAstcBlockDimension;

    /**
     * ASTC encoding mode.
     *
     * `DEFAULT` picks LDR for 8-bit textures. HDR needs floating-point input;
     * libktx returns an error for HDR on 8-bit textures.
     *
     * @defaultValue {@link KtxAstcEncoderMode.DEFAULT}
     */
    mode?: KtxAstcEncoderMode;

    /**
     * ASTC encoder quality level.
     *
     * Higher quality levels generally improve compression quality
     * at the cost of increased encoding time.
     *
     * @defaultValue {@link KtxAstcQualityLevel.MEDIUM}
     */
    qualityLevel?: KtxAstcQualityLevel;

    /**
     * Tune the encoder for normal maps.
     *
     * The encoder treats the X and Y channels as a two-component normal.
     * Use it with linear (non-sRGB) textures. Left at the libktx default
     * (`false`) when omitted.
     *
     * @defaultValue false
     */
    normalMap?: boolean;

    /**
     * Number of encoder threads.
     *
     * Passed to libktx only when it is greater than `1`. The bundled
     * WebAssembly build is not compiled with thread support, so values above
     * `1` may not make encoding faster. To keep the page responsive, encode in
     * a Web Worker instead.
     *
     * @defaultValue 1
     */
    threadCount?: number;

    /**
     * Channel swizzle applied before encoding.
     *
     * Four entries, each one of `"r"`, `"g"`, `"b"`, `"a"`, `"0"`, or `"1"`,
     * giving the source of the red, green, blue, and alpha channels.
     *
     * For example `["r", "r", "r", "g"]` encodes red as grayscale
     * and green as alpha.
     *
     * Other values make {@link IKtx2Texture.compressAstc} throw.
     * When omitted, the channels are not swizzled.
     *
     * @defaultValue No swizzle.
     */
    inputSwizzle?: string[];

    /**
     * Let libktx print encoder details to the console.
     *
     * @defaultValue false
     */
    verbose?: boolean;
}