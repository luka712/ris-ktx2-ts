// Minimal ris-ktx2 usage: encode a PNG two ways and draw both with WebGPU.
// Helpers for the image, WebGPU drawing and captions are in image.ts, gpu.ts and ui.ts.
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
import {drawTexture, drawTextureArray, requestDevice} from "./gpu";
import {kb, setText} from "./ui";

if (!navigator.gpu) {
    setText("#info", "WebGPU is not available in this browser. Try the WebGL example instead.");
    throw new Error("WebGPU is not available");
}

// Most texture methods return a KtxErrorCode instead of throwing.
function check(code: KtxErrorCode, what: string): void {
    if (code !== KtxErrorCode.SUCCESS) throw new Error(`${what} failed: ${KtxErrorCode[code]}`);
}

const pixels = await loadPixels("/test-pattern.png", "#original");
const device = await requestDevice();

// Load libktx (WASM) once. gpuUpload creates textures on the device passed here.
const factory = new Ktx2Factory();
await factory.initializeAsync({preinitializedGPUDevice: device});

// UNORM, not SRGB: the bytes already hold sRGB values and are displayed as-is, like the 2D canvas.
function createFromPixels(): IKtx2Texture {
    const texture = factory.create({baseWidth: pixels.width, baseHeight: pixels.height, vkFormat: VkFormat.R8G8B8A8_UNORM});
    check(texture.setImageFromMemory(0, 0, 0, pixels.data), "setImageFromMemory");
    return texture;
}

// 1. Basis: encode, save to KTX2 bytes, load them back, transcode for this GPU, upload.
const encoded = createFromPixels();
check(encoded.compressBasis({uastc: true}), "compressBasis");
const view = encoded.writeToMemory();
// The view points into WASM memory, so copy it before delete() frees it.
const ktx2Bytes = new Uint8Array(view.buffer, view.byteOffset, view.byteLength).slice();
encoded.delete();

const target = device.features.has("texture-compression-bc") ? {name: "BC7", format: KtxTranscodeFormat.BC7_RGBA}
    : device.features.has("texture-compression-astc") ? {name: "ASTC 4x4", format: KtxTranscodeFormat.ASTC_4X4_RGBA}
    : {name: "RGBA32", format: KtxTranscodeFormat.RGBA32};
const loaded = factory.createFromBuffer(ktx2Bytes);
check(loaded.transcodeBasis(target.format, KtxTranscodeFlags.NONE), "transcodeBasis");
drawTexture(device, "#basis", loaded.gpuUpload());
loaded.delete();
setText("#basis-info", `UASTC KTX2: ${kb(ktx2Bytes.byteLength)}, transcoded to ${target.name}.`);

// 2. ASTC: encode directly (8x8 blocks here; 4x4 by default) and upload, no transcoding.
const astc = createFromPixels();
check(astc.compressAstc({
    blockDimension: KtxAstcBlockDimension.D8x8,
}), "compressAstc");
let astcInfo = `ASTC 8x8: ${kb(astc.dataSize)}`;
if (!device.features.has("texture-compression-astc")) {
    // No ASTC on this GPU: decode back to RGBA8 to still show the result.
    check(astc.decodeAstc(), "decodeAstc");
    astcInfo += " (ASTC not supported on this GPU, shown decoded to RGBA).";
}
drawTexture(device, "#astc", astc.gpuUpload());
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
// gpuUpload creates a texture with one array layer per KTX layer.
drawTextureArray(device, "#array", array.gpuUpload());
setText("#array-info", `2D array: ${array.numLayers} layers, RGBA8 ${kb(array.dataSize)}.`);
array.delete();

setText("#info", `${pixels.width}x${pixels.height} RGBA: ${kb(pixels.data.byteLength)}.`);
