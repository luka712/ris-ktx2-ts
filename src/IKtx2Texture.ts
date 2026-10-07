import {type IKtxBasisParams} from "./IKtxBasisParams";
import {KtxTranscodeFlags} from "./KtxTranscodeFlags";
import {KtxTranscodeFormat} from "./KtxTranscodeFormat";
import {VkFormat} from "./VkFormat";
import type {TextureFormatInfo} from "./TextureFormatInfo";
import type {KtxErrorCode} from "./KtxErrorCode";

/**
 * A KTX2 texture backed by a native libktx texture.
 *
 * Every {@link IKtx2Factory} method returns this interface. The texture owns
 * native memory inside the WebAssembly module, so call
 * {@link IKtx2Texture.delete} when you no longer need it.
 *
 * Methods that return a {@link KtxErrorCode} return the code libktx reported.
 * A result libktx defines but this package does not know is thrown as an `Error`.
 *
 * The properties read the native texture each time, so they reflect
 * compression, transcoding, and deflate.
 *
 * KTX1 files can be loaded, inspected, and read with
 * {@link IKtx2Texture.getImage}. Encoding, transcoding, and deflate need KTX2
 * and return {@link KtxErrorCode.INVALID_OPERATION} for KTX1.
 *
 * @example
 * ```ts
 * const texture = await factory.loadAsync("/textures/example.ktx2");
 * try {
 *     if (texture.needsTranscoding) {
 *         texture.transcodeBasis(KtxTranscodeFormat.RGBA32, KtxTranscodeFlags.NONE);
 *     }
 *     const pixels = texture.getImage(0).slice();
 * } finally {
 *     texture.delete();
 * }
 * ```
 */
export interface IKtx2Texture {

    /**
     * Source of the texture.
     *
     * For {@link IKtx2Factory.loadAsync} this is the URL string, or the
     * `name` of the `File`. A copy keeps the value of its source.
     * Textures from {@link IKtx2Factory.create} and
     * {@link IKtx2Factory.createFromBuffer} leave it `undefined`.
     */
    readonly filePath?: string;

    /** Width of the base mip level, in pixels. */
    readonly width: number;

    /** Height of the base mip level, in pixels. */
    readonly height: number;

    /**
     * Total size of the image data for all levels, layers, and faces, in bytes.
     *
     * Reflects the current data, so it changes after compression,
     * transcoding, and deflate.
     */
    readonly dataSize: number;

    /**
     * Whether the image data is Basis Universal (ETC1S or UASTC) and must be
     * transcoded before it can be read or uploaded to a GPU.
     *
     * Becomes `true` after {@link IKtx2Texture.compressBasis} and `false`
     * after a successful {@link IKtx2Texture.transcodeBasis}.
     */
    readonly needsTranscoding: boolean;

    /**
     * Number of mip levels stored in the texture.
     *
     * For loaded textures this is read from the KTX2 or KTX1 file header. A
     * header value of `0`, which asks the loader to generate mipmaps, means
     * one stored level and is reported as `1`. For created textures it is
     * {@link IKtxTextureCreateInfo.numLevels}.
     */
    readonly numLevels: number;

    /**
     * Vulkan format of the current image data.
     *
     * Basis Universal data reports {@link VkFormat.UNDEFINED}. After
     * {@link IKtx2Texture.transcodeBasis} it reports the format of the
     * transcoded data, for example {@link VkFormat.BC7_UNORM_BLOCK}, or the
     * sRGB variant for sRGB textures. KTX1 textures report
     * {@link VkFormat.UNDEFINED}.
     */
    readonly vkFormat: VkFormat;

    /**
     * Transcodes Basis Universal data to a GPU block format or to RGBA32.
     *
     * Supported targets: {@link KtxTranscodeFormat.ETC2_RGBA},
     * {@link KtxTranscodeFormat.BC3_RGBA}, {@link KtxTranscodeFormat.BC7_RGBA},
     * {@link KtxTranscodeFormat.ASTC_4X4_RGBA}, and
     * {@link KtxTranscodeFormat.RGBA32}. Any other target throws.
     *
     * `transcodeFlags` is passed to libktx as is. Combine
     * {@link KtxTranscodeFlags} values with bitwise OR.
     *
     * After success, the image data is in the target format,
     * {@link IKtx2Texture.vkFormat} reports it, and
     * {@link IKtx2Texture.needsTranscoding} is `false`.
     *
     * @param transcodeFormat - Target format.
     * @param transcodeFlags - Transcode options. Pass {@link KtxTranscodeFlags.NONE} for none.
     * @returns {@link KtxErrorCode.SUCCESS}, or the libktx error. libktx
     * returns {@link KtxErrorCode.INVALID_OPERATION} when the texture is not
     * Basis Universal data, for example because it was already transcoded.
     * @throws {Error} When `transcodeFormat` is not one of the supported
     * targets, or `transcodeFlags` has bits libktx does not define.
     *
     * @example
     * ```ts
     * if (texture.needsTranscoding) {
     *     const result = texture.transcodeBasis(KtxTranscodeFormat.BC7_RGBA, KtxTranscodeFlags.NONE);
     *     if (result !== KtxErrorCode.SUCCESS) {
     *         throw new Error(`Transcode failed: ${KtxErrorCode[result]}`);
     *     }
     * }
     * ```
     */
    transcodeBasis(transcodeFormat: KtxTranscodeFormat, transcodeFlags: KtxTranscodeFlags): KtxErrorCode;

    /**
     * Encodes the image data as Basis Universal (ETC1S or UASTC).
     *
     * The original image data is replaced. Afterward
     * {@link IKtx2Texture.needsTranscoding} is `true`, and the texture must be
     * transcoded before {@link IKtx2Texture.getImage} or a GPU upload.
     *
     * See {@link IKtxBasisParams} for the settings and the defaults this
     * package applies.
     *
     * @param basisParams - ETC1S or UASTC encoder settings.
     * @returns {@link KtxErrorCode.SUCCESS}, or the libktx error. libktx
     * returns {@link KtxErrorCode.INVALID_OPERATION} when the texture cannot
     * be encoded, for example because it is already supercompressed or
     * block-compressed.
     * @throws {Error} When {@link IKtxBasisParams.inputSwizzle} or
     * {@link IKtxBasisParams.uastcFlags} is not valid.
     *
     * @example
     * ```ts
     * // ETC1S: small files, lower quality.
     * texture.compressBasis({ qualityLevel: 128, compressionLevel: 2 });
     *
     * // UASTC: larger files, higher quality.
     * texture.compressBasis({ uastc: true, uastcFlags: KtxUastcFlags.LEVEL_SLOWER, uastcRDO: true });
     * ```
     */
    compressBasis(basisParams: IKtxBasisParams): KtxErrorCode;
    
    /**
     * ASTC compression. Not supported in this version.
     *
     * The method always throws. ASTC compression is planned. To get ASTC data
     * today, encode with {@link IKtx2Texture.compressBasis} and transcode to
     * {@link KtxTranscodeFormat.ASTC_4X4_RGBA}.
     *
     * @param quality - Reserved for the planned implementation.
     * @returns Never returns.
     * @throws {Error} Always.
     */
    compressAstc(quality: number): KtxErrorCode;

    /**
     * Returns the bytes of one image.
     *
     * The result is a view into WebAssembly memory, not a copy. It becomes
     * invalid when the texture is deleted, and can become invalid when the
     * module allocates more memory. Call `slice()` on it to keep the data or to
     * transfer it to another thread.
     *
     * @param level - Mip level. Defaults to `0`.
     * @param layer - Array layer. Defaults to `0`.
     * @param faceSlice - Cube face, or depth slice for 3D textures. Defaults to `0`.
     * @returns A view of the image bytes.
     * @throws {Error} When {@link IKtx2Texture.needsTranscoding} is `true`
     * (call {@link IKtx2Texture.transcodeBasis} first), or when libktx returns
     * no image, for example for a level that does not exist.
     *
     * @example
     * ```ts
     * const baseLevel = texture.getImage(0, 0, 0).slice();
     * ```
     */
    getImage(level?: number, layer?: number, faceSlice?: number): Uint8Array;

    /**
     * Returns the block layout of a Vulkan format.
     *
     * Uses {@link TextureFormatInfo.fromVkFormat}, so it supports the same
     * formats. Pass {@link IKtx2Texture.vkFormat} to size the texture's current
     * data, including after {@link IKtx2Texture.transcodeBasis}.
     *
     * @param format - Vulkan format.
     * @returns Block width, height, depth, and byte size for `format`.
     * @throws {Error} When `format` is not a format
     * {@link TextureFormatInfo.fromVkFormat} can size, for example
     * {@link VkFormat.UNDEFINED} on Basis Universal data that is not transcoded yet.
     *
     * @example
     * ```ts
     * const info = texture.getTextureFormatInfo(texture.vkFormat);
     * const bytesPerRow = info.getAlignedBytesPerRow(texture.width);
     * ```
     */
    getTextureFormatInfo(format: VkFormat): TextureFormatInfo;

    /**
     * Creates an independent copy of the native texture.
     *
     * The copy keeps {@link IKtx2Texture.filePath} and
     * {@link IKtx2Texture.numLevels}. Delete the copy separately.
     *
     * @returns The copied texture.
     */
    createCopy(): IKtx2Texture;

    /**
     * Copies image bytes into one image of the texture.
     *
     * `imageData` must be exactly the size of that image, for example
     * `width * height * 4` bytes for the base level of an RGBA8 texture.
     *
     * @param level - Mip level.
     * @param layer - Array layer.
     * @param faceSlice - Cube face, or depth slice for 3D textures.
     * @param imageData - Image bytes.
     * @returns {@link KtxErrorCode.SUCCESS}, or the libktx error. libktx
     * returns {@link KtxErrorCode.INVALID_OPERATION} when the size does not
     * match, the image does not exist, the texture was created with
     * {@link KtxCreateStorage.NO_STORAGE}, or the data is supercompressed.
     *
     * @example
     * ```ts
     * const pixels = new Uint8Array(texture.width * texture.height * 4);
     * texture.setImageFromMemory(0, 0, 0, pixels);
     * ```
     */
    setImageFromMemory(level: number, layer: number, faceSlice: number, imageData: ArrayBufferView): KtxErrorCode;

    /**
     * Serializes the texture as a KTX2 file.
     *
     * The result is a `Uint8Array` view into WebAssembly memory, not a copy.
     * Copy it, for example with `new Uint8Array(view.buffer, view.byteOffset, view.byteLength).slice()`,
     * before you keep it, delete the texture, or transfer it to another thread.
     *
     * @returns The KTX2 file bytes.
     */
    writeToMemory(): ArrayBufferView;

    /**
     * Supercompresses the image data with zlib (deflate).
     *
     * The data stays in its current format and libktx inflates it on load.
     *
     * @param compressionLevel - Compression level from 1 to 9. Higher is
     * smaller and slower.
     * @returns {@link KtxErrorCode.SUCCESS}, or the libktx error. libktx
     * returns {@link KtxErrorCode.INVALID_OPERATION} when the data is already
     * supercompressed, for example with Basis Universal ETC1S or a previous deflate.
     */
    deflateZlib(compressionLevel: number): KtxErrorCode;

    /**
     * Supercompresses the image data with Zstandard.
     *
     * The data stays in its current format and libktx inflates it on load.
     * Zstandard is commonly used on UASTC data.
     *
     * @param compressionLevel - Compression level from 1 to 22. Higher is
     * smaller and slower. Levels above 20 use much more memory.
     * @returns {@link KtxErrorCode.SUCCESS}, or the libktx error. libktx
     * returns {@link KtxErrorCode.INVALID_OPERATION} when the data is already
     * supercompressed, for example with Basis Universal ETC1S or a previous deflate.
     */
    deflateZstd(compressionLevel: number): KtxErrorCode;

    /**
     * Releases the native texture.
     *
     * Do not use the texture, or views returned by
     * {@link IKtx2Texture.getImage} and {@link IKtx2Texture.writeToMemory},
     * after this call.
     */
    delete(): void;
}
