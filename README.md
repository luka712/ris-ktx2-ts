# ris-ktx2

Browser TypeScript wrapper around Khronos [libktx](https://github.com/KhronosGroup/KTX-Software) for [KTX2](https://registry.khronos.org/KTX/specs/2.0/ktxspec.v2.html) textures. Version 0.1.0.

This package ships `libktx.js` and `libktx.wasm` and implements the interfaces defined by [`ris-ktx2-api`](https://www.npmjs.com/package/ris-ktx2-api). Use `ris-ktx2-api` alone for types and enumerations. Use this package when you need to load, create, transcode, or compress a texture in the browser.

## Install

```sh
npm install ris-ktx2
```

The package is ESM only. `package.json` `exports` resolves JavaScript to `dist/index.js` and types to `dist/index.d.ts`. It depends on `ris-ktx2-api`.

## Usage

```ts
import { Ktx2Factory } from 'ris-ktx2';
import { KtxTranscodeFormat, VkFormat } from 'ris-ktx2-api';

const factory = new Ktx2Factory();
await factory.initializeAsync();

const texture = await factory.loadAsync('/textures/example.ktx2');
if (texture.needsTranscoding) {
  texture.transcodeBasis(KtxTranscodeFormat.BC7_RGBA);
}
const image = texture.getImageData(0, 0, 0);
texture.delete();
```

`Ktx2Factory.create` builds an empty texture from `IKtxTextureCreateInfo`. `createFromBuffer` wraps an existing KTX/KTX2 binary.

Published files include `dist/`, `src/`, `libktx.js`, `libktx.wasm`, `LICENSE`, `LICENSES/`, `THIRD_PARTY_NOTICES.md`, `README.md`, and `CHANGELOG.md`.

## Relationship to ris-ktx2-api

| Package | Role |
| --- | --- |
| `ris-ktx2-api` | Interfaces (`IKtx2Factory`, `IKtx2Texture`), enumerations (`VkFormat`, `KtxTranscodeFormat`, …), and `TextureFormatInfo`. No WebAssembly. |
| `ris-ktx2` | Runtime implementation and the libktx WebAssembly build. |

## Scripts

| Script | Command |
| --- | --- |
| Typecheck, then emit an ESM library build and `.d.ts` | `npm run build` |
| Test | `npm test` |
| Remove `dist/` | `npm run clean` |

`prepublishOnly` runs the build.

## Releasing

`package.json` `version` is the release version (`0.1.0`). It has no prerelease suffix. Publishing does not commit a version bump.

| Branch | Result |
| --- | --- |
| `development` | Each push installs, builds, and tests, then publishes `<version>-dev.<run number>` to npm on the `next` dist-tag. A re-run of that workflow uses `<version>-dev.<run number>.<attempt>`. |
| `main` | Each push installs, builds, and tests. If `<version>` is not already on npm, it is published on the `latest` dist-tag. The workflow then creates git tag `v<version>` and a GitHub release. |

`npm install ris-ktx2@next` installs the `development` prerelease. A plain `npm install ris-ktx2` installs `latest`.

Bump `version` on `development` when the next release starts, and merge that commit to `main` to publish it. Setup for the `NPM_TOKEN` secret and provenance is in [CONTRIBUTING.md](CONTRIBUTING.md).

## Planned notes

The items below are planned work. They are not current behavior.

| Release | Addition |
| --- | --- |
| 0.2.0 | ASTC compression and creating WebGL textures |
| Further releases | BC7 compression and creating WebGPU textures |

## License

[MIT](LICENSE). Copyright (c) 2026 Luka Erkapic.

This package redistributes Khronos libktx WebAssembly binaries. Attribution and the Apache License 2.0 text are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
