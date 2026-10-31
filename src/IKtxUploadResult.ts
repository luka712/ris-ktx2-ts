/**
 * Result of uploading a KTX texture to WebGL.
 *
 * Contains the upload status and, when successful, the created WebGL texture
 * and its associated texture target.
 */
export interface IKtxUploadResult {

    /**
     * WebGL error code of the upload. `0` (`gl.NO_ERROR`) means success.
     */
    error: GLenum;

    /**
     * The WebGL texture object created by the upload operation.
     *
     * Undefined if the upload failed.
     */
    object?: WebGLTexture;

    /**
     * The WebGL texture target associated with the uploaded texture.
     *
     * For example, `gl.TEXTURE_2D` or `gl.TEXTURE_CUBE_MAP`.
     * `0` if the upload failed before a target was chosen.
     */
    target: GLenum;
}