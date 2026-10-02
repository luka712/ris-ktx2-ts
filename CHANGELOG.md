# Changelog

## 0.1.0

First public release.

- `Ktx2Factory` and `Ktx2Texture`, implementing `IKtx2Factory` and `IKtx2Texture` from `ris-ktx2-api`
- `createKtxModuleAsync`, which loads the checked-in Khronos `libktx.js` and `libktx.wasm` in a browser
- npm publishing: pushes to `development` publish `<version>-dev.<run number>` on the `next` dist-tag and do not commit the version bump. Pushes to `main` publish `<version>` on `latest` when that version is not already on npm, then create git tag `v<version>` and a GitHub release
