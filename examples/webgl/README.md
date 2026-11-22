# ris-ktx2 WebGL example

`src/main.ts` encodes `public/test-pattern.png` two ways and draws each with WebGL2 next to the original, creating the WebGL textures with `glUpload`:

1. Basis Universal (UASTC) to KTX2 bytes, loaded back and transcoded to BC7 or ASTC 4x4 (whichever the GPU supports, else RGBA32).
2. ASTC 8x8 with `compressAstc`. If the GPU has no ASTC support (most desktop GPUs), it is decoded back to RGBA with `decodeAstc` so it still shows.
3. A 2D texture array: four tinted copies of the PNG as RGBA8 layers (`create` with `numLayers: 4`). `glUpload` creates a `TEXTURE_2D_ARRAY`, and a `sampler2DArray` shader draws each layer side by side.

Sizes are shown in KB. `main.ts` holds only the ris-ktx2 calls; `image.ts` loads the PNG, `gl.ts` holds the shaders and drawing, and `ui.ts` formats captions. It uses the library source in `../../src`. See [`../webgpu`](../webgpu/README.md) for the same flow with WebGPU.

Run from the repository root:

```sh
npm install
npm run example:webgl
```

`npm run example:webgl:build` type-checks and builds it.
