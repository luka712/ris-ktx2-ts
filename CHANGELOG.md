# Changelog

## 0.1.0

First public release.

### Added

- `Ktx2Factory`, which implements `IKtx2Factory`: `initializeAsync`, `loadAsync`, `create`, and `createFromBuffer`.
- `IKtx2Texture`, returned by every factory method: dimensions, mip level count, Basis Universal encoding (ETC1S, and UASTC with level and hint flags, plus `normalMap`, `inputSwizzle`, and `threadCount`), transcoding to BC7, BC3, ETC2 RGBA, ASTC 4×4, and RGBA32, image get and set, zlib and Zstandard supercompression, copy, write to memory, and `getTextureFormatInfo(vkFormat)` for the block layout of a `VkFormat`.
- `createKtxModuleAsync`, which loads libktx on the main thread or in a Web Worker without `document` or `window`.
- Interfaces, enumerations, and `TextureFormatInfo` ship in this package. The separate `ris-ktx2-api` package is no longer needed.
- Khronos `libktx.js` and `libktx.wasm` for browser use. The built package inlines the wasm binary.
- TypeDoc API reference: https://luka712.github.io/ris-ktx2-ts/
- npm publishing. Pushes to `development` publish `<version>-dev.<run number>` on the `next` dist-tag without committing the version change. Pushes to `main` publish `<version>` on `latest` when that version is not already on npm, then create the git tag `v<version>` and a GitHub release.

### Known limitations

- `compressAstc` is not implemented and always throws. ASTC 4×4 is available only as a Basis Universal transcode target.
- `transcodeBasis` supports five targets: BC7, BC3, ETC2 RGBA, ASTC 4×4, and RGBA32.
- KTX1 files load and can be read, but encoding, transcoding, and deflate need KTX2.
- `create` supports only `R8G8B8A8_SRGB` and `R8G8B8A8_UNORM`.
