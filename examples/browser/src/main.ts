// Minimal ris-ktx2 usage: encode a PNG to KTX2, then load the KTX2 bytes,
// transcode them to a GPU format and draw the result with WebGL. Everything
// except the canvas code works the same inside a Web Worker.
import {Ktx2Factory, KtxErrorCode, KtxTranscodeFlags, KtxTranscodeFormat, VkFormat} from "ris-ktx2";

// Most texture methods return a KtxErrorCode instead of throwing.
function check(code: KtxErrorCode, what: string): void {
    if (code !== KtxErrorCode.SUCCESS) throw new Error(`${what} failed: ${KtxErrorCode[code]}`);
}

// Formats a byte count as kilobytes for display.
const kb = (bytes: number) => `${(bytes / 1024).toFixed(1)} KB`;

// 1. Load libktx (WASM) once and reuse the factory.
const factory = new Ktx2Factory();
await factory.initializeAsync();

// 2. Draw the PNG to the first canvas and read its RGBA pixels (8-bit sRGB).
const image = new Image();
image.src = "/test-pattern.png";
await image.decode();
// Pad to a multiple of 4: WebGL rejects BC7 (BPTC) textures whose level 0 size is not, like 618x619.
const width = Math.ceil(image.naturalWidth / 4) * 4;
const height = Math.ceil(image.naturalHeight / 4) * 4;
const original = document.querySelector<HTMLCanvasElement>("#original")!;
original.width = width;
original.height = height;
const originalContext = original.getContext("2d")!;
originalContext.drawImage(image, 0, 0);
const pixels = originalContext.getImageData(0, 0, width, height).data;

// 3. Encode: create an empty texture, copy the pixels in, compress, save.
const texture = factory.create({baseWidth: width, baseHeight: height, vkFormat: VkFormat.R8G8B8A8_SRGB});
check(texture.setImageFromMemory(0, 0, 0, pixels), "setImageFromMemory");
check(texture.compressBasis({uastc: true}), "compressBasis");
const view = texture.writeToMemory();
// The view points into WASM memory, so copy it before delete() frees it.
const ktx2Bytes = new Uint8Array(view.buffer, view.byteOffset, view.byteLength).slice();
texture.delete();

// 4. Pick a texture format this GPU can sample directly. Do it before transcoding.
const output = document.querySelector<HTMLCanvasElement>("#decoded")!;
const gl = output.getContext("webgl2");
if (!gl) throw new Error("WebGL2 is not available");
const target = pickFormat(gl);

// 5. Use the encoded bytes: load, transcode to that format, upload, draw.
const loaded = factory.createFromBuffer(ktx2Bytes);
check(loaded.transcodeBasis(target.transcodeFormat, KtxTranscodeFlags.NONE), "transcodeBasis");
// getImage also returns a view into WASM memory; slice() copies it.
const data = loaded.getImage(0, 0, 0).slice();
output.width = loaded.width;
output.height = loaded.height;
drawWithWebGL(gl, target.glFormat, data, loaded.width, loaded.height);
loaded.delete();

document.querySelector("#info")!.textContent =
    `${width}x${height}: ${kb(pixels.byteLength)} of RGBA encoded to ${kb(ktx2Bytes.byteLength)} of KTX2 (UASTC), ` +
    `transcoded to ${target.name} for WebGL.`;

interface Target {
    name: string;
    transcodeFormat: KtxTranscodeFormat;
    glFormat?: number; // compressed WebGL internal format; undefined means plain RGBA8
}

// Prefers BC7 (most desktop GPUs), then ASTC 4x4 (most mobile GPUs), then uncompressed RGBA.
// UNORM, not SRGB: the bytes already hold sRGB values and we display them as-is, like the 2D canvas, so the colours match.
function pickFormat(gl: WebGL2RenderingContext): Target {
    const bptc = gl.getExtension("EXT_texture_compression_bptc");
    if (bptc) return {name: "BC7", transcodeFormat: KtxTranscodeFormat.BC7_RGBA, glFormat: bptc.COMPRESSED_RGBA_BPTC_UNORM_EXT};
    const astc = gl.getExtension("WEBGL_compressed_texture_astc");
    if (astc) return {name: "ASTC 4x4", transcodeFormat: KtxTranscodeFormat.ASTC_4X4_RGBA, glFormat: astc.COMPRESSED_RGBA_ASTC_4x4_KHR};
    return {name: "RGBA32", transcodeFormat: KtxTranscodeFormat.RGBA32};
}

// Uploads level 0 as a WebGL2 texture (compressed or RGBA8) and draws it over the whole canvas.
function drawWithWebGL(gl: WebGL2RenderingContext, glFormat: number | undefined, data: Uint8Array, width: number, height: number): void {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    if (glFormat === undefined) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    } else {
        gl.compressedTexImage2D(gl.TEXTURE_2D, 0, glFormat, width, height, 0, data);
    }
    const error = gl.getError();
    if (error !== gl.NO_ERROR) throw new Error(`WebGL texture upload failed: 0x${error.toString(16)}`);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // One triangle that covers the screen; row 0 of the image is the top.
    const vertex = `#version 300 es
        out vec2 uv;
        void main() {
            vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
            uv = vec2(p.x, 1.0 - p.y);
            gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
        }`;
    const fragment = `#version 300 es
        precision mediump float;
        uniform sampler2D image;
        in vec2 uv;
        out vec4 color;
        void main() { color = texture(image, uv); }`;

    const program = gl.createProgram()!;
    for (const [type, source] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]] as const) {
        const shader = gl.createShader(type)!;
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? "shader error");
        gl.attachShader(program, shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? "link error");

    gl.viewport(0, 0, width, height);
    gl.useProgram(program);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
}
