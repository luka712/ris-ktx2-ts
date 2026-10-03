# Ris Ktx2

TypeScript KTX2 texture library powered by Khronos [`libktx`](https://github.com/KhronosGroup/KTX-Software).

`ris-ktx2` provides the runtime implementation and WebAssembly build.
[`ris-ktx2-api`](https://www.npmjs.com/package/ris-ktx2-api) contains the shared interfaces, enums, and types.

## Features

* Load `.ktx` and `.ktx2` files
* Create 2D RGBA textures
* Encode Basis Universal (ETC1S and UASTC)
* Transcode Basis Universal textures
* Read texture image data
* Zlib and Zstandard supercompression

Supported Basis transcode targets:

* BC7
* ASTC 4×4
* BC3
* ETC2
* RGBA32

## Install

```sh
npm install ris-ktx2
```

The package is ESM-only.

## Usage

### Create a texture

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

### Load a texture

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

## API

The package exports:

* `Ktx2Factory`
* `Ktx2Texture`
* `createKtxModuleAsync`

`Ktx2Factory` is used to initialize the WebAssembly module and create or load textures.

`Ktx2Texture` provides texture creation, Basis encoding/transcoding, image access, supercompression, and serialization.

Call `delete()` when a texture is no longer needed to release its native resources.

## Packages

| Package                                                      | Description                                 |
| ------------------------------------------------------------ | ------------------------------------------- |
| [`ris-ktx2`](https://www.npmjs.com/package/ris-ktx2)         | KTX2 runtime and WebAssembly implementation |
| [`ris-ktx2-api`](https://www.npmjs.com/package/ris-ktx2-api) | Shared TypeScript API and types             |

## KTX2

[KTX2](https://registry.khronos.org/KTX/specs/2.0/ktxspec.v2.html) is a Khronos texture container designed for efficient GPU texture distribution.

It can store GPU-compressed formats such as ASTC, BCn, ETC2, and PVRTC, as well as Basis Universal data that can be transcoded to a format supported by the target GPU.

## Development

```sh
npm run build
npm test
npm run clean
```

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for development and release information.

## Planned

* ASTC compression
* BC7 compression
* WebGL texture creation
* WebGPU texture creation

## License

MIT © 2026 Luka Erkapic.

`libktx.js` and `libktx.wasm` are redistributed from Khronos KTX-Software under the Apache License 2.0.

See [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) for third-party attribution.
