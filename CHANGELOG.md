# Changelog

## 0.1.0

First public release.

- `Ktx2Factory` implementing `IKtx2Factory`: `initializeAsync`, `loadAsync`, `create`, and `createFromBuffer`
- `Ktx2Texture` implementing `IKtx2Texture`: dimensions, transcode, Basis compression, deflate, image get/set, and write-to-memory
- Interfaces, enumerations, and `TextureFormatInfo` are exported from this package
- TypeDoc API reference for this repository: https://luka712.github.io/ris-ktx2-ts/
- Ships Khronos `libktx.js` and `libktx.wasm` for browser use
- npm publishing: pushes to `development` publish `<version>-dev.<run number>` on the `next` dist-tag and do not commit the version bump. Pushes to `main` publish `<version>` on `latest` when that version is not already on npm, then create git tag `v<version>` and a GitHub release
