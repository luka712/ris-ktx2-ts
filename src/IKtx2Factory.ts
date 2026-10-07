import {KtxCreateStorage} from "./KtxCreateStorage";
import type {IKtx2Texture} from "./IKtx2Texture";
import type {IKtxTextureCreateInfo} from "./IKtxTextureCreateInfo";

/**
 * Loads and creates KTX2 textures.
 *
 * {@link Ktx2Factory} is the implementation in this package. Call
 * {@link IKtx2Factory.initializeAsync} and wait for it before you call
 * {@link IKtx2Factory.loadAsync}, {@link IKtx2Factory.create}, or
 * {@link IKtx2Factory.createFromBuffer}. Those methods throw an `Error`
 * if the factory is not initialized.
 * @public
 */
export interface IKtx2Factory {

    /**
     * Loads the libktx WebAssembly module.
     *
     * The module is loaded once per JavaScript realm and shared by every
     * factory in that realm. Calls made while the load is running wait for
     * the same load, and later calls resolve without loading it again. If the
     * load fails, the promise rejects and the next call tries again. The main
     * thread and each worker load their own copy.
     *
     * @returns A promise that resolves when the module is ready.
     */
    initializeAsync(): Promise<void>;

    /**
     * Loads a KTX2 file from a URL or a `File`.
     *
     * A string is fetched with `fetch`. A `File` is read with
     * `File.arrayBuffer()`. KTX1 files are accepted too. See
     * {@link IKtx2Texture} for what works on them.
     *
     * @param blob - URL to fetch, or a `File`, for example from an
     * `<input type="file">` element.
     * @returns The loaded texture. Its {@link IKtx2Texture.filePath} is the
     * URL or the file name.
     * @throws {Error} When the factory is not initialized, the HTTP response
     * is not successful, the data does not start with a KTX or KTX2 file
     * identifier, or libktx cannot read it (for example a truncated file).
     *
     * @example
     * ```ts
     * const texture = await factory.loadAsync("/textures/example.ktx2");
     * console.log(texture.width, texture.height, texture.numLevels);
     * texture.delete();
     * ```
     */
    loadAsync(blob: string | File): Promise<IKtx2Texture>;

    /**
     * Creates an empty 2D texture.
     *
     * The texture has one array layer, one face, a depth of 1, and
     * {@link IKtxTextureCreateInfo.numLevels} mip levels. Mipmaps are not
     * generated, so fill each level with {@link IKtx2Texture.setImageFromMemory}.
     *
     * @param createInfo - Width, height, format, and mip level count.
     * Only {@link VkFormat.R8G8B8A8_UNORM} and {@link VkFormat.R8G8B8A8_SRGB}
     * are supported.
     * @param storage - Whether to allocate image storage. Defaults to
     * {@link KtxCreateStorage.ALLOC_STORAGE}.
     * @returns The new texture.
     * @throws {Error} When `createInfo.vkFormat` is not a supported format.
     *
     * @example
     * ```ts
     * const texture = factory.create({ baseWidth: 256, baseHeight: 256 });
     * texture.setImageFromMemory(0, 0, 0, new Uint8Array(256 * 256 * 4));
     * ```
     */
    create(createInfo: IKtxTextureCreateInfo, storage?: KtxCreateStorage): IKtx2Texture;

    /**
     * Creates a texture from the bytes of a KTX2 file that is already in memory.
     *
     * Any `ArrayBufferView` works, including `DataView` and views with a
     * byte offset. The bytes are read in place, not copied first. KTX1 files
     * are accepted too.
     *
     * @param buffer - KTX2 file bytes.
     * @returns The loaded texture.
     * @throws {Error} When the factory is not initialized, the data does not
     * start with a KTX or KTX2 file identifier, or libktx cannot read it.
     *
     * @example
     * ```ts
     * const response = await fetch("/textures/example.ktx2");
     * const texture = factory.createFromBuffer(new Uint8Array(await response.arrayBuffer()));
     * ```
     */
    createFromBuffer(buffer: ArrayBufferView<ArrayBufferLike>): IKtx2Texture;
}
