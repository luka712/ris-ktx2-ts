# ris-ktx2 WebGPU example

The same flow as the [WebGL example](../webgl/README.md), drawn with WebGPU. `src/main.ts` requests a device with the `texture-compression-bc` and `texture-compression-astc` features the adapter has, passes it to the factory with `preinitializedGPUDevice`, and creates the GPU textures with `gpuUpload`:

1. Basis Universal (UASTC) to KTX2 bytes, loaded back and transcoded to BC7 or ASTC 4x4 (whichever the device supports, else RGBA32).
2. ASTC 8x8 with `compressAstc`. If the device has no ASTC support (most desktop GPUs), it is decoded back to RGBA with `decodeAstc` so it still shows.
3. A 2D texture array: four tinted copies of the PNG as RGBA8 layers (`create` with `numLayers: 4`). `gpuUpload` creates a texture with four array layers, and a `texture_2d_array` shader draws each layer side by side.

The PNG is padded to a multiple of 8, because WebGPU needs compressed textures to be a multiple of the block size. Sizes are shown in KB. `image.ts` loads the PNG, `gpu.ts` holds the WGSL shader and drawing, and `ui.ts` formats captions. It uses the library source in `../../src`. The page needs a browser with WebGPU.

Run from the repository root:

```sh
npm install
npm run example:webgpu
```

`npm run example:webgpu:build` type-checks and builds it.
