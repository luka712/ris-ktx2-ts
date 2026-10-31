import type {IKtx2Texture} from "./IKtx2Texture";

/**
 * KTX Data Format Descriptor (DFD) transfer function: the opto-electronic
 * transfer function (OETF) used to encode the texture's color values, as
 * reported by {@link IKtx2Texture.oetf}.
 *
 * The name, member names and numeric values follow the Khronos Data Format
 * Specification's `khr_df_transfer_e`, so they can be looked up directly in
 * the spec.
 */
export enum KtxDFTransfer {
    /** Transfer function is unspecified. */
    UNSPECIFIED = 0,

    /** Linear transfer function. */
    LINEAR = 1,

    /** sRGB transfer function. */
    SRGB = 2,

    /** ITU BT.601, BT.709 and BT.2020 transfer function. */
    ITU = 3,

    /** SMPTE 170M (NTSC) transfer function. */
    NTSC = 4,

    /** Sony S-Log transfer function. */
    SLOG = 5,

    /** Sony S-Log2 transfer function. */
    SLOG2 = 6,

    /** ITU BT.1886 EOTF. */
    BT1886 = 7,

    /** ITU BT.2100 HLG OETF. */
    HLG_OETF = 8,

    /** ITU BT.2100 HLG EOTF. */
    HLG_EOTF = 9,

    /** ITU BT.2100 PQ EOTF. */
    PQ_EOTF = 10,

    /** ITU BT.2100 PQ OETF. */
    PQ_OETF = 11,

    /** DCI P3 transfer function. */
    DCIP3 = 12,

    /** Legacy PAL OETF. */
    PAL_OETF = 13,

    /** Legacy PAL 625-line EOTF. */
    PAL625_EOTF = 14,

    /** Legacy ST240 transfer function. */
    ST240 = 15,

    /** ACEScc transfer function. */
    ACESCC = 16,

    /** ACEScct transfer function. */
    ACESCCT = 17,

    /** Adobe RGB (1998) transfer function. */
    ADOBERGB = 18
}