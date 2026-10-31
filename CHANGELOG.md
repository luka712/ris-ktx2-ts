# Changelog

## 0.2.0

### Breaking changes

- `KtxTranscodeFormat.KTX_TTF_PVRTC1_4_RGBA` and `KTX_TTF_PVRTC2_4_RGBA` are renamed to `PVRTC1_4_RGBA` and `PVRTC2_4_RGBA`. The numeric values are unchanged.
- `createKtxModuleAsync` is no longer exported. Use `Ktx2Factory.initializeAsync`.
- `IKtx2Texture.compressAstc(quality: number)` is now `compressAstc(astcParams?: IKtxAstcParams)`.
- `IKtx2Texture` has new methods (`decodeAstc`, `glUpload`), and `IKtx2Factory.initializeAsync` takes an optional `params` argument. Code that implements these interfaces itself must add them.

### Added

- `compressAstc(params?)` encodes uncompressed RGBA8 textures as ASTC. `IKtxAstcParams` has `blockDimension` (`KtxAstcBlockDimension`, default 4×4), `mode` (`KtxAstcEncoderMode`, default `DEFAULT`), `qualityLevel` (`AstcQualityLevel`, default `MEDIUM`), `normalMap`, `inputSwizzle`, `threadCount`, and `verbose`. Afterward `vkFormat` is the matching `ASTC_*_BLOCK` format and `dataSize` the compressed size.
- `decodeAstc()` decodes ASTC data back to RGBA8.
- `glUpload()` creates a WebGL texture from the texture's data and returns an `UploadResult` with `error` (`0` on success), `object` (the `WebGLTexture`, unset on failure), and `target`. It throws when no WebGL context was set with `initializeAsync`, and while `needsTranscoding` is `true`.
- `initializeAsync({ preinitializedWebGLContext })` sets the WebGL or WebGL2 context that `glUpload` uses. It is applied on every call, so a later call can switch contexts.
- `TextureFormatInfo` layouts for every ASTC block size (2D and 3D) and for PVRTC1 and PVRTC2 4bpp. `fromVkFormat` and `getTextureFormatInfo` now size every 2D ASTC `VkFormat` (UNORM, SRGB, and SFLOAT), not only 4×4.
- The browser example draws a second image encoded with `compressAstc` and uploads both textures with `glUpload`. Without GPU ASTC support it shows the ASTC result decoded to RGBA.

### Fixed

- `compressAstc` no longer throws "not implemented".

### Docs

- README: ASTC encoding and WebGL upload examples. The "compressAstc is not supported" note and the "ASTC compression" planned item are removed. The README is shorter and has a Known issues section for the Content Security Policy requirements.
- TSDoc for every new public type and method.

## 0.1.0

First public release.

### Added

- `Ktx2Factory`, which implements `IKtx2Factory`: `initializeAsync`, `loadAsync`, `create`, and `createFromBuffer`.
- `IKtx2Texture`, returned by every factory method: dimensions, mip level count, Basis Universal encoding (ETC1S, and UASTC with level and hint flags, plus `normalMap`, `inputSwizzle`, and `threadCount`), transcoding to BC7, BC3, ETC2 RGBA, ASTC 4×4, and RGBA32, image get and set, zlib and Zstandard supercompression, copy, write to memory, and `getTextureFormatInfo(vkFormat)` for the block layout of a `VkFormat`.
- Interfaces, enumerations, and `TextureFormatInfo` ship in this package. The separate `ris-ktx2-api` package is no longer needed.
- Khronos `libktx.js` and `libktx.wasm` for browser use. The built package inlines the wasm binary.
- TypeDoc API reference: https://luka712.github.io/ris-ktx2-ts/
- npm publishing. Pushes to `development` publish `<version>-dev.<run number>` on the `next` dist-tag without committing the version change. Pushes to `main` publish `<version>` on `latest` when that version is not already on npm, then create the git tag `v<version>` and a GitHub release.

### Known limitations

- `compressAstc` is not implemented and always throws. ASTC 4×4 is available only as a Basis Universal transcode target.
- `transcodeBasis` supports five targets: BC7, BC3, ETC2 RGBA, ASTC 4×4, and RGBA32.
- KTX1 files load and can be read, but encoding, transcoding, and deflate need KTX2.
- `create` supports only `R8G8B8A8_SRGB` and `R8G8B8A8_UNORM`.
