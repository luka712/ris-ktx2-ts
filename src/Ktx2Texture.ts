import { Mapper } from "./Mapper";
import type { IKtx2Texture } from "./IKtx2Texture";
import type { IKtxTextureCreateInfo } from "./IKtxTextureCreateInfo";
import { VkFormat } from "./VkFormat";
import type { IKtxBasisParams } from "./IKtxBasisParams";
import { KtxTranscodeFormat } from "./KtxTranscodeFormat";
import { KtxTranscodeFlags } from "./KtxTranscodeFlags";
import { KtxErrorCode } from "./KtxErrorCode";
import { KtxUastcFlags } from "./KtxUastcFlags";
import { TextureFormatInfo } from "./TextureFormatInfo";
import type { IKtxAstcParams } from "./IKtxAstcParams";
import { KtxAstcQualityLevel } from "./KtxAstcQualityLevel";
import { KtxAstcEncoderMode } from "./KtxAstcEncoderMode";
import { KtxAstcBlockDimension } from "./KtxAstcBlockDimension";
import type { IKtxUploadResult } from "./IKtxUploadResult";
import type { GPUUploadParams } from "./GPUUploadParams";
import { WebGPUTextureLoader } from "./WebGPUTextureLoader";
import { KtxSupercompressionScheme } from "./KtxSupercompressionScheme";
import type { KtxDFTransfer } from "./KtxDFTransfer";

// KTX2 header byte offsets for fields libktx's Embind texture does not expose.
const LAYER_COUNT_OFFSET = 32;
const LEVEL_COUNT_OFFSET = 40;
const SUPERCOMPRESSION_SCHEME_OFFSET = 44;

/**
 * libktx-backed implementation of {@link IKtx2Texture}. Create instances
 * through {@link Ktx2Factory}.
 * @internal
 */
export class Ktx2Texture implements IKtx2Texture {

    /** Device for {@link Ktx2Texture.gpuUpload}, set by `Ktx2Factory.initializeAsync`. */
    public static gpuDevice?: GPUDevice;

    // @ts-ignore
    private readonly _ktxLib: any;

    // @ts-ignore
    private readonly _ktxTexture: any;

    private _numLevels = 0;

    /**
     * libktx's Embind texture does not expose the scheme, so it is read from
     * the file header and updated by the compress and deflate calls.
     */
    private _supercompressionScheme = KtxSupercompressionScheme.NONE;

    /** libktx's Embind texture does not expose the layer count, so it is read from the header. */
    private _numLayers = 1;

    /**
     * Wraps a native libktx texture.
     * @param ktxLib - The libktx module.
     * @param ktxTexture - The native libktx texture.
     * @param data - Source of `numLevels` and `numLayers`: the KTX2 file bytes
     * (read from the header), the create info, or the texture being copied.
     * @param filePath - URL or file name the texture was loaded from.
     */
    constructor(ktxLib: any,
        ktxTexture: any,
        data: ArrayBufferView<ArrayBufferLike> | IKtxTextureCreateInfo | Ktx2Texture,
        filePath?: string) {
        this._ktxLib = ktxLib;
        this._ktxTexture = ktxTexture;
        this.filePath = filePath;

        if (data instanceof Ktx2Texture) {
            // Copy: keep the source's metadata.
            this._numLevels = data._numLevels;
            this._numLayers = data._numLayers;
            this._supercompressionScheme = data._supercompressionScheme;
        } else if (ArrayBuffer.isView(data)) {
            // File bytes: read the header (little-endian).
            const header = new DataView(data.buffer, data.byteOffset, data.byteLength);
            this._numLayers = header.getUint32(LAYER_COUNT_OFFSET, true);
            this._numLevels = header.getUint32(LEVEL_COUNT_OFFSET, true);
            this._supercompressionScheme = Mapper.mapSupercompressionScheme(header.getUint32(SUPERCOMPRESSION_SCHEME_OFFSET, true));
        } else {
            // Create info.
            this._numLevels = (data as IKtxTextureCreateInfo).numLevels ?? 0;
            this._numLayers = (data as { numLayers?: number }).numLayers ?? 1;
        }
    }

    /** @inheritdoc */
    public readonly filePath?: string;

    /** @inheritdoc */
    public get width(): number {
        return this._ktxTexture.baseWidth;
    }

    /** @inheritdoc */
    public get height(): number {
        return this._ktxTexture.baseHeight;
    }

    /** @inheritdoc */
    public get dataSize(): number {
        return this._ktxTexture.dataSize;
    }

    /** @inheritDoc */
    public get vkFormat(): VkFormat {
        return this._ktxTexture.vkFormat;
    }

    /** @inheritdoc */
    public get needsTranscoding(): boolean {
        return this._ktxTexture.needsTranscoding;
    }

    /** @inheritdoc */
    public get numLevels() {
        return this._numLevels;
    }

    /** @inheritdoc */
    public get numLayers(): number {
        return this._numLayers;
    }

    /** @inheritDoc */
    public get supercompressionScheme(): KtxSupercompressionScheme {
        return this._supercompressionScheme;
    }

    /** @inheritDoc */
    public get oetf(): KtxDFTransfer {
        return Mapper.mapTransferFunction(this._ktxTexture.oetf);
    }

    /** @inheritDoc */
    public compressAstc(astcParams: IKtxAstcParams = {}): KtxErrorCode {
        // Validate and map before allocating the Embind object, so a throw
        // does not leak it.
        const blockDimension = Mapper.mapAstcBlockDimension(
            this._ktxLib, astcParams.blockDimension ?? KtxAstcBlockDimension.D4x4);
        const mode = Mapper.mapAstcEncoderMode(
            this._ktxLib, astcParams.mode ?? KtxAstcEncoderMode.DEFAULT);
        const qualityLevel = Mapper.mapAstcQuality(
            this._ktxLib, astcParams.qualityLevel ?? KtxAstcQualityLevel.MEDIUM);
        const inputSwizzle = astcParams.inputSwizzle !== undefined
            ? Mapper.mapInputSwizzle(astcParams.inputSwizzle)
            : undefined;

        const ktxAstcParams = new this._ktxLib.astcParams();
        try {
            ktxAstcParams.verbose = astcParams.verbose === true;

            // libktx defaults to one thread; only pass larger values.
            if (astcParams.threadCount && astcParams.threadCount > 1) {
                ktxAstcParams.threadCount = astcParams.threadCount;
            }

            if (astcParams.normalMap !== undefined) {
                ktxAstcParams.normalMap = astcParams.normalMap;
            }

            if (inputSwizzle !== undefined) {
                ktxAstcParams.inputSwizzle = inputSwizzle;
            }

            ktxAstcParams.blockDimension = blockDimension;
            ktxAstcParams.mode = mode;
            ktxAstcParams.qualityLevel = qualityLevel;

            const errorCode = this._ktxTexture.compressAstc(ktxAstcParams);
            return Mapper.mapErrorCodeFromKtxLib(errorCode);
        } finally {
            // astcParams is an Embind object and must be freed explicitly.
            ktxAstcParams.delete?.();
        }
    }

    /** @inheritDoc */
    public decodeAstc(): KtxErrorCode {
        const errorCode = this._ktxTexture.decodeAstc();
        return Mapper.mapErrorCodeFromKtxLib(errorCode);
    }

    /** @inheritDoc */
    public getImage(level = 0, layer = 0, faceSlice = 0): Uint8Array {
        if (this.needsTranscoding) {
            throw new Error("getImage: the texture holds Basis Universal data. Call transcodeBasis first.");
        }
        const image = this._ktxTexture.getImage(level, layer, faceSlice);
        if (!image) {
            throw new Error(`getImage: libktx returned no image for level ${level}, layer ${layer}, faceSlice ${faceSlice}.`);
        }
        return image;
    }

    /** @inheritDoc */
    public compressBasis(basisParams: IKtxBasisParams): KtxErrorCode {
        const ktxBasisParams = new this._ktxLib.basisParams();

        try {
            ktxBasisParams.verbose = basisParams.verbose === true;

            // libktx defaults to one thread; only pass larger values.
            if (basisParams.threadCount && basisParams.threadCount > 1) {
                ktxBasisParams.threadCount = basisParams.threadCount;
            }

            if (basisParams.normalMap !== undefined) {
                ktxBasisParams.normalMap = basisParams.normalMap;
            }

            if (basisParams.inputSwizzle !== undefined) {
                ktxBasisParams.inputSwizzle = Mapper.mapInputSwizzle(basisParams.inputSwizzle);
            }

            if (basisParams.uastc === true) {
                // UASTC: the level comes from uastcFlags. compressionLevel and
                // qualityLevel are ETC1S-only and are not set.
                ktxBasisParams.uastc = true;
                ktxBasisParams.uastcFlags = Mapper.mapUastcFlags(
                    this._ktxLib,
                    basisParams.uastcFlags ?? KtxUastcFlags.LEVEL_DEFAULT,
                );
                ktxBasisParams.uastcRDO = basisParams.uastcRDO ?? false;
                ktxBasisParams.uastcRDOQualityScalar = basisParams.uastcRDOQualityScalar ?? 1;
            } else {
                // ETC1S
                ktxBasisParams.uastc = false;
                ktxBasisParams.noSSE = true; // Forbid SSE. Ignored when the CPU has no SSE.
                ktxBasisParams.qualityLevel = basisParams.qualityLevel ?? 128;
                ktxBasisParams.compressionLevel = basisParams.compressionLevel ?? 2;
            }

            const errorCode = Mapper.mapErrorCodeFromKtxLib(this._ktxTexture.compressBasis(ktxBasisParams));
            if (errorCode === KtxErrorCode.SUCCESS) {
                // ETC1S is stored BasisLZ-supercompressed; UASTC is not.
                this._supercompressionScheme = basisParams.uastc === true
                    ? KtxSupercompressionScheme.NONE
                    : KtxSupercompressionScheme.BASIS_LZ;
            }
            return errorCode;
        } finally {
            // basisParams is an Embind object and must be freed explicitly.
            ktxBasisParams.delete?.();
        }
    }

    /** @inheritDoc */
    public transcodeBasis(transcodeFormat: KtxTranscodeFormat, transcodeFlags: KtxTranscodeFlags): KtxErrorCode {

        const transcodeTarget = this._ktxLib.TranscodeTarget;
        let ktxTranscodeFormat = null;

        // Must have at least 1 format.
        if (transcodeFormat == KtxTranscodeFormat.BC7_RGBA) {
            ktxTranscodeFormat = transcodeTarget.BC7_RGBA;
        } else if (transcodeFormat == KtxTranscodeFormat.ASTC_4X4_RGBA) {
            ktxTranscodeFormat = transcodeTarget.ASTC_4x4_RGBA;
        } else if (transcodeFormat == KtxTranscodeFormat.BC3_RGBA) {
            ktxTranscodeFormat = transcodeTarget.BC3_RGBA;
        } else if (transcodeFormat == KtxTranscodeFormat.ETC2_RGBA) {
            ktxTranscodeFormat = transcodeTarget.ETC2_RGBA;
        } else if (transcodeFormat == KtxTranscodeFormat.RGBA32) {
            ktxTranscodeFormat = transcodeTarget.RGBA32;
        } else {
            throw new Error(`Unsupported transcodeFormat: ${KtxTranscodeFormat[transcodeFormat] ?? transcodeFormat}`);
        }

        const ktxTranscodeFlags = Mapper.mapTranscodeFlags(transcodeFlags);

        const errorCode = this._ktxTexture.transcodeBasis(ktxTranscodeFormat, ktxTranscodeFlags);
        return Mapper.mapErrorCodeFromKtxLib(errorCode);
    }

    /** @inheritDoc */
    public getTextureFormatInfo(format: VkFormat): TextureFormatInfo {
        try {
            return TextureFormatInfo.fromVkFormat(format);
        } catch {
            throw new Error(`Unrecognized texture format for ${VkFormat[format] ?? format}`);
        }
    }

    /** @inheritDoc */
    public createCopy(): IKtx2Texture {
        const copy = this._ktxTexture.createCopy();
        return new Ktx2Texture(this._ktxLib, copy, this, this.filePath);
    }

    /** @inheritDoc */
    public setImageFromMemory(level: number, layer: number, faceSlice: number, imageData: ArrayBufferView): KtxErrorCode {
        const errorCode = this._ktxTexture.setImageFromMemory(level, layer, faceSlice, imageData);
        return Mapper.mapErrorCodeFromKtxLib(errorCode);
    }

    /** @inheritDoc */
    public writeToMemory(): ArrayBufferView {
        return this._ktxTexture.writeToMemory();
    }

    /** @inheritDoc */
    public deflateZlib(compressionLevel: number): KtxErrorCode {
        const errorCode = Mapper.mapErrorCodeFromKtxLib(this._ktxTexture.deflateZLIB(compressionLevel));
        if (errorCode === KtxErrorCode.SUCCESS) {
            this._supercompressionScheme = KtxSupercompressionScheme.ZLIB;
        }
        return errorCode;
    }

    /** @inheritDoc */
    public deflateZstd(compressionLevel: number): KtxErrorCode {
        const errorCode = Mapper.mapErrorCodeFromKtxLib(this._ktxTexture.deflateZstd(compressionLevel));
        if (errorCode === KtxErrorCode.SUCCESS) {
            this._supercompressionScheme = KtxSupercompressionScheme.ZSTD;
        }
        return errorCode;
    }

    /** @inheritDoc */
    public glUpload(): IKtxUploadResult {
        if (!this._ktxLib.GL?.currentContext) {
            throw new Error("glUpload: no WebGL context. Pass preinitializedWebGLContext to Ktx2Factory.initializeAsync first.");
        }
        if (this.needsTranscoding) {
            throw new Error("glUpload: the texture holds Basis Universal data. Call transcodeBasis first.");
        }
        const ktxGlUpload = this._ktxTexture.glUpload();
        return {
            error: ktxGlUpload.error ?? 0,
            object: ktxGlUpload.object ?? undefined,
            target: ktxGlUpload.target ?? 0,
        };
    }

    /** @inheritDoc */
    public gpuUpload(params: GPUUploadParams = {}): GPUTexture {
        if (!Ktx2Texture.gpuDevice) {
            throw new Error("gpuUpload: no GPUDevice. Pass preinitializedGPUDevice to Ktx2Factory.initializeAsync first.");
        }
        if (this.needsTranscoding) {
            throw new Error("gpuUpload: the texture holds Basis Universal data. Call transcodeBasis first.");
        }
        return WebGPUTextureLoader.load(Ktx2Texture.gpuDevice, this, params);
    }

    /** @inheritDoc */
    public delete(): void {
        this._ktxTexture.delete();
    }
}
