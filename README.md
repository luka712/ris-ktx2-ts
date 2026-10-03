# Ris Ktx2

TypeScript implementation of a KTX2 texture library. This package ships Khronos [libktx](https://github.com/KhronosGroup/KTX-Software) as `libktx.js` and `libktx.wasm`, and it implements the interfaces from [`ris-ktx2-api`](https://www.npmjs.com/package/ris-ktx2-api).

`ris-ktx2` loads the WebAssembly module and creates, encodes, and reads textures. `ris-ktx2-api` holds the shared interfaces and enumerations and does not include the WebAssembly build.

## What is KTX2?

[KTX2](https://registry.khronos.org/KTX/specs/2.0/ktxspec.v2.html) is the Khronos container for GPU texture data. A file stores mip levels and can keep that data in a GPU block format, or as Basis Universal data that a loader transcodes on the target machine.

The container format itself can hold encodings such as ASTC, BCn, ETC2, and PVRTC. Applications use it when texture size, load time, and GPU memory matter.

> **Note:** Version 0.1.0 of this package creates raw uncompressed `R8G8B8A8` textures and encodes Basis Universal (ETC1S and UASTC). It can transcode that Basis data to BC7, ASTC 4×4, BC3, ETC2, or uncompressed RGBA. `compressAstc` throws. ASTC compression, BC7 compression, and creating WebGL or WebGPU textures are planned work, listed below.

## Why Ris Ktx2?

Install this package when the application needs to run the KTX2 operations, not only to share the types.

With a factory that has been initialized, calling code can:

* load a `.ktx` or `.ktx2` file
* create a 2D uncompressed texture and fill it from memory
* encode the images with Basis Universal
* transcode Basis data before reading it back
* supercompress the container with zlib or Zstandard
* write the container to a byte buffer

`initializeAsync` loads libktx once. Later calls reuse that module. `delete` releases the native texture.

## Packages

| Package        | Description                                                                 |
| -------------- | --------------------------------------------------------------------------- |
| `ris-ktx2-api` | Interfaces, enumerations, and texture-format helpers. No WebAssembly.      |
| `ris-ktx2`     | libktx WebAssembly build and the `Ktx2Factory` / `Ktx2Texture` runtime.    |

## Install

```sh
npm install ris-ktx2
```

The package is ESM-only. It depends on `ris-ktx2-api`, so a normal install brings that package in as well. Import the factory from `ris-ktx2`. Import enumerations and parameter types from `ris-ktx2-api`.

## Usage

```ts
import { Ktx2Factory } from "ris-ktx2";
import {
    KtxCreateStorage,
    VkFormat,
} from "ris-ktx2-api";

const factory = new Ktx2Factory();

await factory.initializeAsync();

const texture = factory.create(
    {
        baseWidth: 256,
        baseHeight: 256,
        vkFormat: VkFormat.R8G8B8A8_SRGB,
        numLevels: 1,
    },
    KtxCreateStorage.ALLOC_STORAGE,
);

texture.setImageFromMemory(
    0,
    0,
    0,
    new Uint8Array(256 * 256 * 4),
);

texture.compressBasis(128);

const data = texture.writeToMemory();

texture.delete();
```

`create` makes a 2D texture with one layer and one face. The Vulkan format has to be `VkFormat.R8G8B8A8_UNORM` or `VkFormat.R8G8B8A8_SRGB`. Omitting `vkFormat` selects `R8G8B8A8_SRGB`. Omitting `numLevels` selects one level. `KtxCreateStorage.NO_STORAGE` skips allocating image bytes.

`compressBasis` accepts a quality from 1 to 255, or an `IKtxBasisParams` object. The object path reads `uastc`, `qualityLevel`, `compressionLevel`, `uastcRDO`, `uastcRDOQualityScalar`, and `verbose`.

### Loading

```ts
import {
    KtxTranscodeFlags,
    KtxTranscodeFormat,
} from "ris-ktx2-api";

const texture = await factory.loadAsync("/textures/example.ktx2");

if (texture.needsTranscoding) {
    texture.transcodeBasis(
        KtxTranscodeFormat.BC7_RGBA,
        KtxTranscodeFlags.NONE,
    );
}

const image = texture.getImage(0, 0, 0);

texture.delete();
```

`loadAsync` accepts a URL or a browser `File`. On Node it also reads a filesystem path. `createFromBuffer` takes the file bytes in a `Uint8Array` instead.

`transcodeBasis` accepts `BC7_RGBA`, `ASTC_4X4_RGBA`, `BC3_RGBA`, `ETC2_RGBA`, and `RGBA32`. Pass `KtxTranscodeFlags.NONE` or `KtxTranscodeFlags.TRANSCODE_ALPHA_DATA_TO_OPAQUE_FORMATS`.

## API

The package exports:

* `Ktx2Factory`
* `Ktx2Texture`
* `createKtxModuleAsync`

`Ktx2Factory` implements `IKtx2Factory`: `initializeAsync`, `loadAsync`, `create`, and `createFromBuffer`.

`Ktx2Texture` implements `IKtx2Texture`. The methods that run against libktx today are `compressBasis`, `transcodeBasis`, `getImage`, `setImageFromMemory`, `writeToMemory`, `deflateZlib`, `deflateZstd`, `createCopy`, `delete`, and `getTextureFormatInfo`. `getTextureFormatInfo` returns block sizes for the transcode targets above and for `VkFormat.ASTC_4X4_UNORM_BLOCK`, `BC7_UNORM_BLOCK`, `BC3_UNORM_BLOCK`, `ETC2_R8G8B8A8_UNORM_BLOCK`, `R8G8B8A8_UNORM`, and `R8G8B8A8_SRGB`.

`width`, `height`, `vkFormat`, and `dataSize` are the values captured when the texture is created or loaded. `needsTranscoding` is read from libktx on each access. `compressAstc` is on the class because the interface requires it, and calling it throws.

`createKtxModuleAsync` loads the Emscripten module. Browser hosts fetch the wasm binary and evaluate the glue as a classic script. Node hosts evaluate the same glue with `require`, which is how the tests initialize the factory.

## Planned

The items below are planned work. They are not current behavior.

| Release          | Addition                                          |
| ---------------- | ------------------------------------------------- |
| 0.2.0            | ASTC compression and creating WebGL textures      |
| Further releases | BC7 compression and creating WebGPU textures      |

## Development

```sh
npm run build
npm test
npm run clean
```

| Script          | Description                                                          |
| --------------- | -------------------------------------------------------------------- |
| `npm run build` | Typecheck with `tsc`, then emit the ESM library and declarations    |
| `npm test`      | Run the Vitest suite, including tests that load `libktx.wasm`       |
| `npm run clean` | Remove `dist/`                                                       |

`prepublishOnly` runs the build before `npm publish`.

## Releasing

The release version is defined by `package.json`. It has no prerelease suffix. The publish jobs do not commit a version bump.

The `development` branch publishes `<version>-dev.<run number>` on the npm `next` tag. Re-running that job appends `.<attempt>`.

```sh
npm install ris-ktx2@next
```

The `main` branch publishes `<version>` on the `latest` tag when that version is not already on npm, then creates git tag `v<version>` and a GitHub release.

```sh
npm install ris-ktx2
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the `NPM_TOKEN` secret and provenance setup.

## License

MIT © 2026 Luka Erkapic.

`libktx.js` and `libktx.wasm` are redistributed from Khronos KTX-Software under the Apache License 2.0. Attribution is in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
