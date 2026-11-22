/**
 * Options for {@link IKtx2Texture.gpuUpload} and {@link WebGPUTextureLoader.load}.
 */
export interface GPUUploadParams {

    /**
     * Usage flags of the created `GPUTexture`.
     *
     * Defaults to `GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST`.
     * `COPY_DST` is always added, because the image data is written with
     * `GPUQueue.writeTexture`.
     */
    textureUsage?: GPUTextureUsageFlags;
}
