# Ris Ktx2

Browser TypeScript library for loading, creating, encoding, and transcoding KTX2 textures. It wraps the Khronos [`libktx`](https://github.com/KhronosGroup/KTX-Software) WebAssembly build.

`ris-ktx2` is a single package. It contains the runtime, the WebAssembly build, and the TypeScript interfaces, enumerations, and texture-format helpers.

## Features

* Load `.ktx2` files from a URL, a `File`, or bytes in memory
* Create 2D RGBA8 textures and fill their mip levels
* Encode Basis Universal (ETC1S and UASTC)
* Transcode Basis Universal to BC7, BC3, ETC2 RGBA, ASTC 4×4, or RGBA32
* Read image data and write KTX2 files to memory
* zlib and Zstandard supercompression
* Runs in the browser on the main thread and in a Web Worker

## Install

```sh
npm install ris-ktx2
```

The package is ESM-only and targets browsers. It does not need Node.js at runtime.

The built package inlines `libktx.wasm` as a `data:` URL, so there is no separate file to serve. It loads the libktx glue code with `new Function`. If your page uses a Content Security Policy, it must allow `'unsafe-eval'` in `script-src` and `data:` in `connect-src`.

## Usage

### Initialize

Create a `Ktx2Factory` and wait for `initializeAsync` before calling anything else. It loads the WebAssembly module once per page or worker.

```ts
import { Ktx2Factory } from "ris-ktx2";

const factory = new Ktx2Factory();
await factory.initializeAsync();
```

The examples below use this `factory`.

### Load and transcode a texture

```ts
import { KtxErrorCode, KtxTranscodeFlags, KtxTranscodeFormat } from "ris-ktx2";

const texture = await factory.loadAsync("/textures/example.ktx2");

if (texture.needsTranscoding) {
    const result = texture.transcodeBasis(KtxTranscodeFormat.BC7_RGBA, KtxTranscodeFlags.NONE);
    if (result !== KtxErrorCode.SUCCESS) {
        throw new Error(`Transcode failed: ${KtxErrorCode[result]}`);
    }
}

// getImage returns a view into WebAssembly memory. Copy it to keep it.
const level0 = texture.getImage(0, 0, 0).slice();

texture.delete();
```

`loadAsync` also accepts a `File`, and `createFromBuffer` takes the bytes of a KTX2 file as any `ArrayBufferView`. Both throw if the fetch fails or the data is not a readable KTX file.

Supported transcode targets are `BC7_RGBA`, `BC3_RGBA`, `ETC2_RGBA`, `ASTC_4X4_RGBA`, and `RGBA32`. Other `KtxTranscodeFormat` values throw.

### Create and encode a texture

```ts
import { KtxCreateStorage, VkFormat } from "ris-ktx2";

const texture = factory.create(
    {
        baseWidth: 256,
        baseHeight: 256,
        vkFormat: VkFormat.R8G8B8A8_SRGB,
        numLevels: 1,
    },
    KtxCreateStorage.ALLOC_STORAGE,
);

// RGBA8: 4 bytes per pixel.
texture.setImageFromMemory(0, 0, 0, new Uint8Array(256 * 256 * 4));

// ETC1S: small files, lower quality.
texture.compressBasis({ qualityLevel: 128, compressionLevel: 2 });

// Or UASTC: larger files, higher quality. Usually followed by Zstandard.
// texture.compressBasis({ uastc: true, uastcFlags: KtxUastcFlags.LEVEL_SLOWER, uastcRDO: true });
// texture.deflateZstd(18);

// writeToMemory also returns a view into WebAssembly memory.
const view = texture.writeToMemory();
const ktx2File = new Uint8Array(view.buffer, view.byteOffset, view.byteLength).slice();

texture.delete();
```

`create` supports `VkFormat.R8G8B8A8_SRGB` (the default) and `VkFormat.R8G8B8A8_UNORM`.

### Encode in a Web Worker

The loader does not use `document` or `window`, so the same code runs in a dedicated or module worker. Each worker initializes its own factory.

```ts
// encode.worker.ts
import { Ktx2Factory } from "ris-ktx2";

const factory = new Ktx2Factory();
const ready = factory.initializeAsync();

self.onmessage = async (event: MessageEvent<ArrayBuffer>) => {
    await ready;

    // event.data holds the bytes of an uncompressed KTX2 file.
    const texture = factory.createFromBuffer(new Uint8Array(event.data));
    texture.compressBasis({ uastc: true });

    const view = texture.writeToMemory();
    const bytes = new Uint8Array(view.buffer, view.byteOffset, view.byteLength).slice();
    texture.delete();

    self.postMessage(bytes, { transfer: [bytes.buffer] });
};
```

```ts
// main.ts
const worker = new Worker(new URL("./encode.worker.ts", import.meta.url), { type: "module" });
worker.onmessage = (event: MessageEvent<Uint8Array>) => {
    console.log(`Encoded ${event.data.byteLength} bytes`);
};
const ktx2Bytes = await (await fetch("/textures/uncompressed.ktx2")).arrayBuffer();
worker.postMessage(ktx2Bytes, [ktx2Bytes]);
```

## Examples

[`examples/browser`](examples/browser/README.md) is a minimal Vite page that encodes a PNG to KTX2, then loads, transcodes and draws the result. Run it with `npm run example`.

## API

Generated API reference: https://luka712.github.io/ris-ktx2-ts/

Everything is imported from `ris-ktx2`:

* `Ktx2Factory` loads the WebAssembly module and creates or loads textures. It implements `IKtx2Factory`.
* `IKtx2Texture` is the texture type every factory method returns. Code against this interface. The concrete class is internal.
* `IKtxBasisParams` and `IKtxTextureCreateInfo` are the options for `compressBasis` and `create`.
* `VkFormat`, `KtxTranscodeFormat`, `KtxTranscodeFlags`, `KtxErrorCode`, `KtxCreateStorage`, and `KtxUastcFlags` are the enumerations.
* `TextureFormatInfo` gives the block size and byte layout of a `VkFormat`, including WebGPU-aligned `bytesPerRow`. Get it with `texture.getTextureFormatInfo(texture.vkFormat)` or `TextureFormatInfo.fromVkFormat`.
* `createKtxModuleAsync` is the low-level libktx loader that `initializeAsync` uses. Most code does not need it.

Things to know:

* Call `delete()` on every texture when you are done with it. Textures live in WebAssembly memory and are not garbage collected.
* `getImage` and `writeToMemory` return views into WebAssembly memory. Copy them with `slice()` before you keep them or delete the texture.
* Methods that return `KtxErrorCode` return the libktx result. Compare it with `KtxErrorCode.SUCCESS`.
* `getImage` throws while `needsTranscoding` is `true`. Call `transcodeBasis` first.
* `width`, `height`, `dataSize`, and `vkFormat` always describe the current data, including after `compressBasis` and `transcodeBasis`.
* `compressAstc` is not supported and always throws. To get ASTC data, encode Basis Universal and transcode to `ASTC_4X4_RGBA`.

## KTX2

[KTX2](https://registry.khronos.org/KTX/specs/2.0/ktxspec.v2.html) is a Khronos container for GPU textures. It can hold GPU block formats such as ASTC, BCn, and ETC2, or Basis Universal data that is transcoded at load time to a format the GPU supports.

## Development

```sh
npm install
npm run build   # tsc and the Vite library build into dist/
npm test        # Vitest
npm run docs    # TypeDoc API reference into docs/api/
npm run clean   # remove dist/
```

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for branches, versioning, and releases.

## Planned

* ASTC compression
* BC7 compression
* WebGL texture creation
* WebGPU texture creation

## License

MIT © 2026 Luka Erkapic.

`libktx.js` and `libktx.wasm` are redistributed from Khronos KTX-Software under the Apache License 2.0. See [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) for third-party attribution.
