// Minimal ris-ktx2 usage: encode a PNG two ways and draw both with WebGL.
// Helpers for the image, WebGL drawing and captions are in image.ts, gl.ts and ui.ts.
import {
    type IKtx2Texture,
    Ktx2Factory,
    KtxAstcBlockDimension,
    KtxErrorCode,
    KtxTranscodeFlags,
    KtxTranscodeFormat,
    VkFormat
} from "ris-ktx2";
import {loadPixels, tint} from "./image";
import {createGl, drawTexture, drawTextureArray, hasAstc, hasBc7} from "./gl";
import {kb, setText} from "./ui";

// Most texture methods return a KtxErrorCode instead of throwing.
function check(code: KtxErrorCode, what: string): void {
    if (code !== KtxErrorCode.SUCCESS) throw new Error(`${what} failed: ${KtxErrorCode[code]}`);
}

const pixels = await loadPixels("/test-pattern.png", "#original");
const basisGl = createGl("#basis", pixels.width, pixels.height);
const astcGl = createGl("#astc", pixels.width, pixels.height);

// Load libktx (WASM) once. glUpload creates textures in the context passed here.
const factory = new Ktx2Factory();
await factory.initializeAsync({preinitializedWebGLContext: basisGl});

// UNORM, not SRGB: the bytes already hold sRGB values and are displayed as-is, like the 2D canvas.
function createFromPixels(): IKtx2Texture {
    const texture = factory.create({baseWidth: pixels.width, baseHeight: pixels.height, vkFormat: VkFormat.R8G8B8A8_UNORM});
    check(texture.setImageFromMemory(0, 0, 0, pixels.data), "setImageFromMemory");
    return texture;
}

// Creates a WebGL texture from the KTX texture with glUpload.
function upload(texture: IKtx2Texture): WebGLTexture {
    const result = texture.glUpload();
    if (result.error || !result.object) throw new Error(`glUpload failed: 0x${(result.error ?? 0).toString(16)}`);
    return result.object;
}

// 1. Basis: encode, save to KTX2 bytes, load them back, transcode for this GPU, upload.
const encoded = createFromPixels();
check(encoded.compressBasis({uastc: true}), "compressBasis");
const view = encoded.writeToMemory();
// The view points into WASM memory, so copy it before delete() frees it.
const ktx2Bytes = new Uint8Array(view.buffer, view.byteOffset, view.byteLength).slice();
encoded.delete();

const target = hasBc7(basisGl) ? {name: "BC7", format: KtxTranscodeFormat.BC7_RGBA}
    : hasAstc(basisGl) ? {name: "ASTC 4x4", format: KtxTranscodeFormat.ASTC_4X4_RGBA}
    : {name: "RGBA32", format: KtxTranscodeFormat.RGBA32};
const loaded = factory.createFromBuffer(ktx2Bytes);
check(loaded.transcodeBasis(target.format, KtxTranscodeFlags.NONE), "transcodeBasis");
drawTexture(basisGl, upload(loaded));
loaded.delete();
setText("#basis-info", `UASTC KTX2: ${kb(ktx2Bytes.byteLength)}, transcoded to ${target.name}.`);

// 2. ASTC: encode directly (8x8 blocks here; 4x4 by default) and upload, no transcoding.
const astc = createFromPixels();
check(astc.compressAstc({
    blockDimension: KtxAstcBlockDimension.D8x8,
}), "compressAstc");
let astcInfo = `ASTC 8x8: ${kb(astc.dataSize)}`;
await factory.initializeAsync({preinitializedWebGLContext: astcGl});
if (!hasAstc(astcGl)) {
    // No ASTC on this GPU: decode back to RGBA8 to still show the result.
    check(astc.decodeAstc(), "decodeAstc");
    astcInfo += " (ASTC not supported on this GPU, shown decoded to RGBA).";
}
drawTexture(astcGl, upload(astc));
astc.delete();
setText("#astc-info", astcInfo);

// 3. 2D array: one tinted copy of the image per layer, kept as RGBA8 (no compression).
const LAYER_TINTS = [[1, 1, 1], [1, 0.4, 0.4], [0.4, 1, 0.4], [0.4, 0.4, 1]];
const array = factory.create({
    baseWidth: pixels.width,
    baseHeight: pixels.height,
    vkFormat: VkFormat.R8G8B8A8_UNORM,
    numLayers: LAYER_TINTS.length,
});
LAYER_TINTS.forEach((rgb, layer) => check(array.setImageFromMemory(0, layer, 0, tint(pixels.data, rgb)), "setImageFromMemory"));
// Every layer is drawn at half size, side by side.
const arrayGl = createGl("#array", pixels.width / 2 * array.numLayers, pixels.height / 2);
await factory.initializeAsync({preinitializedWebGLContext: arrayGl});
// glUpload creates a TEXTURE_2D_ARRAY for array textures; result.target says which.
const arrayResult = array.glUpload();
if (arrayResult.error || !arrayResult.object) throw new Error(`glUpload failed: 0x${(arrayResult.error ?? 0).toString(16)}`);
drawTextureArray(arrayGl, arrayResult.target, arrayResult.object, array.numLayers);
setText("#array-info", `2D array: ${array.numLayers} layers, RGBA8 ${kb(array.dataSize)}.`);
array.delete();

setText("#info", `${pixels.width}x${pixels.height} RGBA: ${kb(pixels.data.byteLength)}.`);
