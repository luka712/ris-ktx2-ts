import {VkFormat} from "./VkFormat";
import {KtxErrorCode} from "./KtxErrorCode";
import {KtxCreateStorage} from "./KtxCreateStorage";
import {KtxTranscodeFlags} from "./KtxTranscodeFlags";
import {KtxUastcFlags} from "./KtxUastcFlags";
import {AstcQualityLevel} from "./AstcQualityLevels";
import {KtxAstcBlockDimension} from "./KtxAstcBlockDimension";
import {KtxAstcEncoderMode} from "./KtxAstcEncoderMode";

/** Every {@link KtxTranscodeFlags} bit that libktx defines. */
const KNOWN_TRANSCODE_FLAGS =
    KtxTranscodeFlags.PVRTC_DECODE_TO_NEXT_POW2 |
    KtxTranscodeFlags.TRANSCODE_ALPHA_DATA_TO_OPAQUE_FORMATS |
    KtxTranscodeFlags.HIGH_QUALITY;

/** Characters allowed in a Basis or ASTC input swizzle. */
const SWIZZLE_CHANNELS = new Set(["r", "g", "b", "a", "0", "1"]);

/**
 * Converts between this package's enumerations and libktx Embind values.
 * @internal
 */
export class Mapper {

    /**
     * Maps a {@link VkFormat} to the libktx value. Only `R8G8B8A8_UNORM` and
     * `R8G8B8A8_SRGB` are supported; other formats throw.
     */
    public static mapVkFormat(ktxLib: any, vkFormat: VkFormat) {
        if(vkFormat === VkFormat.R8G8B8A8_UNORM) {
            return ktxLib.VkFormat.R8G8B8A8_UNORM;
        }
        else if(vkFormat === VkFormat.R8G8B8A8_SRGB) {
            return ktxLib.VkFormat.R8G8B8A8_SRGB;
        }
        else {
            throw new Error(`Unsupported VkFormat: ${VkFormat[vkFormat] ?? vkFormat}`);
        }
    }

    /**
     * Maps a libktx result to {@link KtxErrorCode}.
     *
     * libktx returns an Embind enum value (an object with a numeric `value`).
     * Plain numbers are accepted too. The numeric values match
     * `ktx_error_code_e`, so every known code maps to the member with the same
     * value. Unknown values throw.
     */
    public static mapErrorCodeFromKtxLib(errorCode: any): KtxErrorCode {
        const code = typeof errorCode === "number" ? errorCode : errorCode?.value;
        if (typeof code === "number" && KtxErrorCode[code] !== undefined) {
            return code as KtxErrorCode;
        }
        throw new Error(`libktx returned an unknown error code: ${String(code)}`);
    }

    /** Maps a {@link KtxCreateStorage} to the libktx value. */
    public static mapStorage(ktxLib: any, storage: KtxCreateStorage) {
        if(storage == KtxCreateStorage.ALLOC_STORAGE) {
            return ktxLib.TextureCreateStorageEnum.ALLOC_STORAGE
        }
        else if(storage == KtxCreateStorage.NO_STORAGE) {
            return ktxLib.TextureCreateStorageEnum.NO_STORAGE;
        }
        else {
            throw new Error(`Unsupported KtxCreateStorage: ${storage}`);
        }
    }

    /**
     * Maps {@link KtxTranscodeFlags} to the value libktx `transcodeBasis` expects.
     *
     * The binding reads the flags as a plain unsigned integer. Passing its
     * `TranscodeFlags` Embind enum object is read as `0`, so a number is passed.
     * Throws for bits libktx does not define.
     */
    public static mapTranscodeFlags(flags: KtxTranscodeFlags): number {
        const value = (flags ?? KtxTranscodeFlags.NONE) >>> 0;
        const unknown = value & ~KNOWN_TRANSCODE_FLAGS;
        if (unknown !== 0) {
            throw new Error(`Unsupported transcodeFlags bits: 0x${unknown.toString(16)}`);
        }
        return value;
    }

    /**
     * Maps {@link KtxUastcFlags} to the value of the libktx `basisParams.uastcFlags` field.
     *
     * The field is an Embind enum (`pack_uastc_flag_bits`). It only has named
     * members for the five levels, and Embind writes an enum by reading its
     * `value` property. A named member is used when one matches. A
     * combination of a level and hints is passed as `{ value }`.
     */
    public static mapUastcFlags(ktxLib: any, flags: KtxUastcFlags): any {
        if (!Number.isInteger(flags) || flags < 0) {
            throw new Error(`Invalid uastcFlags: ${flags}`);
        }
        const members = ktxLib.pack_uastc_flag_bits;
        if (members) {
            for (const key of Object.keys(members)) {
                const member = members[key];
                if (member && typeof member === "object" && member.value === flags) {
                    return member;
                }
            }
        }
        return {value: flags};
    }

    /**
     * Maps an input swizzle such as `["r", "r", "r", "g"]` to the 4-character
     * string the libktx `basisParams.inputSwizzle` field expects.
     * Throws unless there are exactly four entries from `r`, `g`, `b`, `a`, `0`, `1`.
     */
    public static mapInputSwizzle(swizzle: string[]): string {
        if (!Array.isArray(swizzle) || swizzle.length !== 4 || !swizzle.every(c => SWIZZLE_CHANNELS.has(c))) {
            throw new Error(
                `Invalid inputSwizzle ${JSON.stringify(swizzle)}: expected four entries, each one of "r", "g", "b", "a", "0", "1".`,
            );
        }
        return swizzle.join("");
    }

    /**
     * Maps an {@link AstcQualityLevel} to the libktx
     * `pack_astc_quality_levels` Embind enum member of the same name.
     * Throws for unknown values.
     */
    public static mapAstcQuality(ktxLib: any, quality: AstcQualityLevel): any {
        return Mapper.mapEmbindEnumByName(ktxLib.pack_astc_quality_levels, AstcQualityLevel, quality, "qualityLevel");
    }

    /**
     * Maps a {@link KtxAstcBlockDimension} to the libktx
     * `pack_astc_block_dimension` Embind enum member of the same name.
     * Throws for unknown values.
     */
    public static mapAstcBlockDimension(ktxLib: any, dimension: KtxAstcBlockDimension): any {
        return Mapper.mapEmbindEnumByName(ktxLib.pack_astc_block_dimension, KtxAstcBlockDimension, dimension, "blockDimension");
    }

    /**
     * Maps a {@link KtxAstcEncoderMode} to the libktx
     * `pack_astc_encoder_mode` Embind enum member of the same name.
     * Throws for unknown values.
     */
    public static mapAstcEncoderMode(ktxLib: any, mode: KtxAstcEncoderMode): any {
        return Mapper.mapEmbindEnumByName(ktxLib.pack_astc_encoder_mode, KtxAstcEncoderMode, mode, "mode");
    }

    /**
     * Looks up the Embind enum member whose name matches the TS enum key.
     * Embind enum fields silently read a plain number as `0`, so the member
     * object must be passed.
     */
    private static mapEmbindEnumByName(members: any, tsEnum: Record<string, string | number>, value: string | number, field: string): any {
        const key = typeof value === "number" ? tsEnum[value] : (Object.values(tsEnum).includes(value) ? value : undefined);
        const member = typeof key === "string" && members ? members[key] : undefined;
        if (member === undefined) {
            throw new Error(`Unsupported ${field}: ${String(value)}`);
        }
        return member;
    }
}
