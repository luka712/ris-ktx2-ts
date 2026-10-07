import {KtxUastcFlags} from "./KtxUastcFlags";

/**
 * Encoder settings for {@link IKtx2Texture.compressBasis}.
 *
 * Field names follow libktx `ktxBasisParams`. Every field is optional.
 * Set {@link IKtxBasisParams.uastc} to choose the codec:
 *
 * - ETC1S (default): small files and lower quality. Uses
 *   {@link IKtxBasisParams.qualityLevel} and {@link IKtxBasisParams.compressionLevel}.
 * - UASTC: larger files and higher quality. Uses
 *   {@link IKtxBasisParams.uastcFlags}, {@link IKtxBasisParams.uastcRDO}, and
 *   {@link IKtxBasisParams.uastcRDOQualityScalar}. Often followed by
 *   {@link IKtx2Texture.deflateZstd}.
 *
 * {@link IKtxBasisParams.normalMap}, {@link IKtxBasisParams.inputSwizzle},
 * {@link IKtxBasisParams.threadCount}, and {@link IKtxBasisParams.verbose}
 * apply to both. ETC1S encoding always sets the libktx `noSSE` option.
 *
 * @example
 * ```ts
 * const etc1s: IKtxBasisParams = { qualityLevel: 200, compressionLevel: 3 };
 * const uastc: IKtxBasisParams = { uastc: true, uastcFlags: KtxUastcFlags.LEVEL_SLOWER, uastcRDO: true };
 * ```
 */
export interface IKtxBasisParams {

    /**
     * ETC1S encoding effort.
     *
     * Range is `[0, 5]` (libktx 4.4 also accepts `6`). Higher values are
     * slower and give better quality. Ignored for UASTC: use
     * {@link IKtxBasisParams.uastcFlags} to set the UASTC level.
     *
     * @defaultValue 2
     */
    compressionLevel?: number;

    /**
     * ETC1S quality.
     *
     * Range is `[1, 255]`. Lower values give smaller files, faster encoding,
     * and lower quality. Higher values give larger files, slower encoding, and
     * higher quality. Ignored for UASTC.
     *
     * @defaultValue 128
     */
    qualityLevel?: number;

    /**
     * `true` to encode UASTC. `false` or omitted to encode ETC1S.
     *
     * @defaultValue false
     */
    uastc?: boolean;

    /**
     * UASTC level and hints, as a combination of {@link KtxUastcFlags}.
     *
     * Pick one level, for example {@link KtxUastcFlags.LEVEL_SLOWER}, and
     * optionally OR in hints such as {@link KtxUastcFlags.FAVOR_BC7_ERROR}.
     * Higher levels are slower and give better quality. Ignored for ETC1S.
     *
     * @defaultValue {@link KtxUastcFlags.LEVEL_DEFAULT}
     */
    uastcFlags?: KtxUastcFlags;

    /**
     * Tune the encoder for normal maps.
     *
     * libktx disables selector and endpoint RDO and marks the texture as a
     * normal map. Only valid for linear (non-sRGB) textures. Left at the libktx
     * default (`false`) when omitted.
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
     * giving the source of the red, green, blue, and alpha channels. For
     * example `["r", "r", "r", "g"]` encodes red as gray and green as alpha.
     * Other values make {@link IKtx2Texture.compressBasis} throw. When
     * omitted, the channels are not swizzled.
     */
    inputSwizzle?: string[];

    /**
     * Enable rate-distortion optimization for UASTC.
     *
     * RDO makes the UASTC data compress better with
     * {@link IKtx2Texture.deflateZstd}, at some quality cost. Ignored for ETC1S.
     *
     * @defaultValue false
     */
    uastcRDO?: boolean;

    /**
     * UASTC RDO quality scalar (lambda). Used when
     * {@link IKtxBasisParams.uastcRDO} is `true`.
     *
     * Lower values give higher quality and larger compressed files. Higher
     * values give lower quality and smaller compressed files. A useful range
     * is `[0.2, 4]`. The full range is `[0.001, 50]`. Ignored for ETC1S.
     *
     * @defaultValue 1
     */
    uastcRDOQualityScalar?: number;

    /**
     * Let libktx print encoder details to the console.
     *
     * @defaultValue false
     */
    verbose?: boolean;
}
