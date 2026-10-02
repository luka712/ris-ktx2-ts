# ris-ktx2

Load, create, transcode, and compress [KTX2](https://registry.khronos.org/KTX/specs/2.0/ktxspec.v2.html) textures with Khronos libktx. Version 0.1.0.

This package wraps the checked-in `libktx.js` and `libktx.wasm`. Types, enumerations, and `TextureFormatInfo` come from [`ris-ktx2-api`](https://github.com/luka712/ris-ktx2-api-ts). `Ktx2Factory` implements `IKtx2Factory`. `Ktx2Texture` implements `IKtx2Texture`.

`ris-ktx2-api` has no WebAssembly. Use it on its own for enumerations and texture-format sizes, or to type a function that receives an `IKtx2Factory` or `IKtx2Texture`. Use this package when you need to load, create, transcode, or compress a texture.

## Install

```sh
npm install ris-ktx2
```

The package is ESM only. `package.json` `exports` resolves JavaScript to `dist/index.js` and types to `dist/index.d.ts`. The only runtime dependency is `ris-ktx2-api`.

`ris-ktx2-api` is declared as `^0.1.0-dev.2.4`. That range installs the current published prerelease and accepts the `0.1.0` release and later `0.1.x` versions. `^0.1.0` alone does not match a prerelease, and `0.1.0` is not on npm yet.

Importing the module does not load the wasm. `sideEffects` is `false`. Call `Ktx2Factory.initializeAsync` or `createKtxModuleAsync` to load it.

## Exports

Everything is exported from the package root.

- `Ktx2Factory` — `initializeAsync`, `loadAsync` (a URL string or a browser `File`), `create`, and `createFromBuffer`
- `Ktx2Texture` — dimensions, Basis transcode and compression, ASTC compression, ZLIB/Zstandard deflate, image get/set, and write-to-memory
- `createKtxModuleAsync` — loads `libktx.js` and `libktx.wasm` and returns the `LIBKTX` module

`initializeAsync` caches one module for every factory. `loadAsync`, `create`, and `createFromBuffer` use that module.

## Usage

`createKtxModuleAsync` fetches `libktx.wasm`, then injects `libktx.js` with a `<script>` element and reads `window.LIBKTX`. Run it in a browser. It is not a Node loader.

```ts
import { Ktx2Factory } from "ris-ktx2";
import {
  KtxCreateStorage,
  KtxErrorCode,
  KtxTranscodeFlags,
  KtxTranscodeFormat,
  TextureFormatInfo,
  VkFormat,
  type IKtxTextureCreateInfo,
} from "ris-ktx2-api";

const createInfo: IKtxTextureCreateInfo = {
  baseWidth: 256,
  baseHeight: 256,
  vkFormat: VkFormat.R8G8B8A8_SRGB,
  numLevels: 1,
};

const layout = TextureFormatInfo.fromVkFormat(VkFormat.BC7_SRGB_BLOCK);
const levelBytes = layout.getDataSize(createInfo.baseWidth, createInfo.baseHeight);

const factory = new Ktx2Factory();
await factory.initializeAsync();
const texture = factory.create(createInfo, KtxCreateStorage.ALLOC_STORAGE);
const code = texture.transcodeBasis(KtxTranscodeFormat.BC7_RGBA, KtxTranscodeFlags.NONE);
if (code !== KtxErrorCode.SUCCESS) {
  throw new Error(`transcode failed: ${KtxErrorCode[code]}`);
}
const image = texture.getImage(0, 0, 0);
```

`levelBytes` is the BC7 size of a 256×256 level (65536 bytes). `image` is the level's bytes after transcoding. Call `texture.delete()` when the texture is no longer used.

`loadAsync` accepts a URL string or a browser `File`. A string is fetched. A `File` is read with `arrayBuffer()`.

```ts
const fromUrl = await factory.loadAsync("/textures/cat.ktx2");
const fromFile = await factory.loadAsync(file);
```

`KtxTranscodeFlags.PVRTC_DECODE_TO_NEXT_POW2` asks libktx to decode a non-power-of-two ETC1S level to the next larger power of two for PVRTC1. libktx still documents that option as not implemented, and it is ignored when the slice dimensions are already powers of two.

`IKtx2Texture.compressAstc` encodes uncompressed 2D 8-bit images to ASTC. libktx returns `KtxErrorCode.INVALID_OPERATION` for data that is already supercompressed or block-compressed, for packed formats such as RGB565, for component sizes other than 8 bits, and for 1D images. Quality `0` through `100` is the normal range. The libktx parameter is unsigned, so a negative value is treated as greater than `100`.

## Scripts

From the package root:

| Script | Command |
| --- | --- |
| Typecheck, then emit an ESM library build and a bundled `.d.ts` | `npm run build` |
| Typecheck and test | `npm test` |
| Remove `dist/` | `npm run clean` |

`prepublishOnly` runs the build. Published files are `dist/`, `src/`, `libktx.js`, `libktx.wasm`, `LICENSE`, `LICENSES/`, `THIRD_PARTY_NOTICES.md`, `README.md`, and `CHANGELOG.md`.

Vitest uses `environment: 'node'`. The test that calls `initializeAsync` is skipped there because the loader needs `document` and `window`.

## Releasing

`package.json` `version` is the release version (`0.1.0`). It has no prerelease suffix. Publishing does not commit a version bump.

| Branch | Result |
| --- | --- |
| `development` | Each push installs, builds, and tests, then publishes `<version>-dev.<run number>` to npm on the `next` dist-tag. A re-run of that workflow uses `<version>-dev.<run number>.<attempt>`. |
| `main` | Each push installs, builds, and tests. If `<version>` is not already on npm, it is published on the `latest` dist-tag. The workflow then creates git tag `v<version>` and a GitHub release. |

`npm install ris-ktx2@next` installs the `development` prerelease. A plain `npm install ris-ktx2` installs `latest`.

Bump `version` on `development` when the next release starts, and merge that commit to `main` to publish it. Setup for the `NPM_TOKEN` secret and provenance is in [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE). Copyright (c) 2026 Luka Erkapic.

`libktx.js` and `libktx.wasm` are Khronos KTX-Software, Apache License 2.0. The wasm build includes Basis Universal and Arm astc-encoder, also Apache-2.0. Attribution and the license text are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and [LICENSES/Apache-2.0.txt](LICENSES/Apache-2.0.txt).
