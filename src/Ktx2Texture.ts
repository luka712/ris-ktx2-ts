import {Mapper} from "./Mapper";
import type {IKtx2Texture} from "./IKtx2Texture";
import type {IKtxTextureCreateInfo} from "./IKtxTextureCreateInfo";
import {VkFormat} from "./VkFormat";
import type {IKtxBasisParams} from "./IKtxBasisParams";
import {KtxTranscodeFormat} from "./KtxTranscodeFormat";
import {KtxTranscodeFlags} from "./KtxTranscodeFlags";
import type {KtxErrorCode} from "./KtxErrorCode";
import {KtxUastcFlags} from "./KtxUastcFlags";
import {TextureFormatInfo} from "./TextureFormatInfo";
import {detectKtxContainer, readNumLevels, toUint8Array} from "./KtxContainer";

/**
 * libktx-backed implementation of {@link IKtx2Texture}. Create instances
 * through {@link Ktx2Factory}.
 * @internal
 */
export class Ktx2Texture implements IKtx2Texture {

    // @ts-ignore
    private readonly _ktxLib: any;

    // @ts-ignore
    private readonly _ktxTexture: any;

    private _numLevels = 0;

    /** `true` for KTX1 data. libktx has no `vkFormat` for KTX1 textures. */
    private _isKtx1 = false;

    /**
     * Wraps a native libktx texture.
     * @param ktxLib - The libktx module.
     * @param ktxTexture - The native libktx texture.
     * @param data - Source of `numLevels`: the KTX or KTX2 file bytes (read
     * from the header), the create info, or the texture being copied.
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
            this._isKtx1 = data._isKtx1;
        } else if (ArrayBuffer.isView(data)) {
            // File bytes, as any view type: read the header.
            const bytes = toUint8Array(data);
            this._isKtx1 = detectKtxContainer(bytes) === "ktx1";
            this._numLevels = readNumLevels(bytes);
        } else {
            // Create info.
            this._numLevels = (data as IKtxTextureCreateInfo).numLevels ?? 0;
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
        // libktx logs an error and returns 0 when vkFormat is read on KTX1.
        return this._isKtx1 ? VkFormat.UNDEFINED : this._ktxTexture.vkFormat;
    }

    /** @inheritdoc */
    public get needsTranscoding(): boolean {
        return this._ktxTexture.needsTranscoding;
    }

    /** @inheritdoc */
    public get numLevels() {
        return this._numLevels;
    }

    /** @inheritDoc */
    public compressAstc(_quality: number): KtxErrorCode {
        throw new Error("Method not implemented.");
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
            }
            else {
                // ETC1S
                ktxBasisParams.uastc = false;
                ktxBasisParams.noSSE = true; // Forbid SSE. Ignored when the CPU has no SSE.
                ktxBasisParams.qualityLevel = basisParams.qualityLevel ?? 128;
                ktxBasisParams.compressionLevel = basisParams.compressionLevel ?? 2;
            }

            const errorCode = this._ktxTexture.compressBasis(ktxBasisParams);
            return Mapper.mapErrorCodeFromKtxLib(errorCode);
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
        const errorCode = this._ktxTexture.deflateZLIB(compressionLevel);
        return Mapper.mapErrorCodeFromKtxLib(errorCode);
    }

    /** @inheritDoc */
    public deflateZstd(compressionLevel: number): KtxErrorCode {
        const errorCode = this._ktxTexture.deflateZstd(compressionLevel);
        return Mapper.mapErrorCodeFromKtxLib(errorCode);
    }

    /** @inheritDoc */
    public delete(): void {
        this._ktxTexture.delete();
    }
}
