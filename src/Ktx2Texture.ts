import {
    type IKtx2Texture,
    type IKtxBasisParams, type IKtxTextureCreateInfo,
    KtxErrorCode,
    KtxTranscodeFlags,
    KtxTranscodeFormat,
    TextureFormatInfo,
    VkFormat
} from "ris-ktx2-api";
import {Mapper} from "./Mapper";

/** The offset to number levels in binary header */
const NUM_LEVELS_OFFSET = 40;

/**
 * The KTX2 texture class.
 */
export class Ktx2Texture implements IKtx2Texture {

    // @ts-ignore
    private readonly _ktxLib: any;

    // @ts-ignore
    private readonly _ktxTexture: any;

    private _numLevels = 0;

    /**
     * The constructor.
     * @param ktxLib - The KTX library.
     * @param ktxTexture - The underlying KTX texture.
     * @param data - The KTX binary, self or create info. Required to pull the meta data.
     * @param filePath - The file path of the texture.
     */
    constructor(ktxLib: any,
                ktxTexture: any,
                data: ArrayBufferView<ArrayBufferLike> | IKtxTextureCreateInfo | Ktx2Texture,
                filePath?: string) {
        this._ktxLib = ktxLib;
        this._ktxTexture = ktxTexture;
        this.filePath = filePath;
        this.width = ktxTexture.baseWidth;
        this.height = ktxTexture.baseHeight;
        this.dataSize = ktxTexture.dataSize;
        this.vkFormat = ktxTexture.vkFormat;

        if (data instanceof Ktx2Texture) {
            // Just copy properties.
            this._numLevels = data.numLevels;
        } else if (data instanceof Uint8Array) {
            // Get properties from binary header.
            this._assignBufferProperties(data);
        } else {
            // Assign properties from create info.
            this._assignCreateInfoProperties(data as IKtxTextureCreateInfo);
        }
    }


    private _assignBufferProperties(buffer: Uint8Array) {
        const view = new DataView(
            buffer.buffer,
            buffer.byteOffset,
            buffer.byteLength
        );
        this._numLevels = view.getUint32(NUM_LEVELS_OFFSET, true);
    }

    private _assignCreateInfoProperties(createInfo: IKtxTextureCreateInfo) {
        this._numLevels = createInfo.numLevels ?? 0;
    }

    /** @inheritDoc */
    public readonly vkFormat: VkFormat;

    /** @inheritdoc */
    public readonly filePath?: string;

    /** @inheritdoc */
    public readonly width;

    /** @inheritdoc */
    public readonly height;

    /** @inheritdoc */
    public readonly dataSize;

    /** @inheritdoc */
    public get needsTranscoding(): boolean {
        return this._ktxTexture.needsTranscoding;
    }

    /** @inheritdoc */
    public get numLevels() {
        return this._numLevels;
    }

    /** @inheritDoc */
    public compressAstc(quality: number): KtxErrorCode {
        console.log(quality);
        throw new Error("Method not implemented.");
    }

    /** @inheritDoc */
    public getImage(level = 0, layer = 0, faceSlice = 0): Uint8Array {
        return this._ktxTexture.getImage(level, layer, faceSlice);
    }

    /** @inheritDoc */
    public compressBasis(basisParams: IKtxBasisParams | number): KtxErrorCode {
        const ktxBasisParams = new this._ktxLib.basisParams();

        if (typeof basisParams === "number") {
            ktxBasisParams.quality = basisParams;
        } else {

            ktxBasisParams.verbose = basisParams.verbose == true;
            if (basisParams.uastc == true) {
                ktxBasisParams.uastc = true;
                ktxBasisParams.compressionLevel = basisParams.compressionLevel ?? 2;
                ktxBasisParams.uastcRDO = basisParams.uastcRDO ?? false;
                ktxBasisParams.uastcRDOQualityScalar = basisParams.uastcRDOQualityScalar ?? 1;
            }
            // ECT1S
            else {
                ktxBasisParams.uastc = false;
                ktxBasisParams.noSSE = true; // True to forbid use of the SSE instruction set. Ignored if CPU does not support SSE.
                ktxBasisParams.qualityLevel = basisParams.qualityLevel ?? 128;
                ktxBasisParams.compressionLevel = basisParams.compressionLevel ?? 2;
            }
        }

        const errorCode = this._ktxTexture.compressBasis(ktxBasisParams);
        return Mapper.mapErrorCodeFromKtxLib(errorCode);
    }

    /** @inheritDoc */
    public transcodeBasis(transcodeFormat: KtxTranscodeFormat, transcodeFlags: KtxTranscodeFlags): KtxErrorCode {

        const transcodeTarget = this._ktxLib.TranscodeTarget;
        let ktxTranscodeFormat = null;

        const transcodeFlagsTarget = this._ktxLib.TranscodeFlags;
        let ktxTranscodeFlag = null;

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
            throw new Error("Unsupported transcodeFormat");
        }

        if (transcodeFlags == KtxTranscodeFlags.TRANSCODE_ALPHA_DATA_TO_OPAQUE_FORMATS) {
            ktxTranscodeFlag = transcodeFlagsTarget.TRANSCODE_ALPHA_DATA_TO_OPAQUE_FORMATS;
        }

        const errorCode = this._ktxTexture.transcodeBasis(ktxTranscodeFormat, ktxTranscodeFlag);
        return Mapper.mapErrorCodeFromKtxLib(errorCode);
    }

    /** @inheritDoc */
    public getTextureFormatInfo(format: KtxTranscodeFormat | VkFormat): TextureFormatInfo {
        if (format == KtxTranscodeFormat.ASTC_4X4_RGBA || format == VkFormat.ASTC_4X4_UNORM_BLOCK) {
            return TextureFormatInfo.astc4x4rgba();
        } else if (format == KtxTranscodeFormat.BC7_RGBA || format == VkFormat.BC7_UNORM_BLOCK) {
            return TextureFormatInfo.bc7();
        } else if (format == KtxTranscodeFormat.BC3_RGBA || format == VkFormat.BC3_UNORM_BLOCK) {
            return TextureFormatInfo.bc3();
        } else if (format == KtxTranscodeFormat.ETC2_RGBA || format == VkFormat.ETC2_R8G8B8A8_UNORM_BLOCK) {
            return TextureFormatInfo.etc2rgba();
        } else if (format == KtxTranscodeFormat.RGBA32 || format == VkFormat.R8G8B8A8_UNORM || format == VkFormat.R8G8B8A8_SRGB) {
            return TextureFormatInfo.rgba32();
        } else {
            throw new Error("Unrecognized texture format for " + format);
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