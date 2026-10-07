/**
 * How image storage is allocated when a KTX2 texture is created.
 *
 * Values match libktx `ktxTextureCreateStorageEnum`:
 * `KTX_TEXTURE_CREATE_NO_STORAGE` is `0` and
 * `KTX_TEXTURE_CREATE_ALLOC_STORAGE` is `1`.
 */
export enum KtxCreateStorage {
    /**
     * Do not allocate image storage. The texture has metadata only, and
     * {@link IKtx2Texture.setImageFromMemory} returns
     * {@link KtxErrorCode.INVALID_OPERATION}.
     */
    NO_STORAGE = 0,

    /**
     * Allocate storage for every image, so it can be filled with
     * {@link IKtx2Texture.setImageFromMemory}. This is the default.
     */
    ALLOC_STORAGE = 1,
}
