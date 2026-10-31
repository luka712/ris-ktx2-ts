/**
 * Defines the supercompression schemes supported by the KTX2 container format.
 */
export enum KtxSuperCompressionScheme {

    /**
     * No supercompression is applied.
     *
     * Texture data is stored uncompressed, although individual texture
     * formats may still use GPU block compression.
     */
    NONE = "NONE",

    /**
     * Basis Universal LZ supercompression.
     *
     * Used with Basis Universal ETC1S texture data. Requires a Basis
     * Universal transcoder to convert the data into a GPU-supported format.
     */
    BASIS_LZ = "BASIS_LZ",

    /**
     * Zstandard (Zstd) supercompression.
     *
     * Applies lossless Zstandard compression to the texture data.
     * Requires Zstandard decompression before the data can be uploaded
     * to the GPU.
     */
    ZSTD = "ZSTD",

    /**
     * Zlib supercompression.
     *
     * Applies lossless DEFLATE compression using the Zlib wrapper.
     * Requires Zlib decompression before the data can be uploaded
     * to the GPU.
     */
    ZLIB = "ZLIB"
}