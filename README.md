# Ris Ktx2

Browser TypeScript library for loading, creating, encoding, and transcoding KTX2 textures. It wraps the Khronos [`libktx`](https://github.com/KhronosGroup/KTX-Software) WebAssembly build.

## Features

* Load `.ktx2` files from a URL, a `File`, or bytes in memory
* Encode Basis Universal (ETC1S and UASTC) or ASTC
* Transcode Basis Universal to BC7, BC3, ETC2 RGBA, ASTC 4×4, or RGBA32
* Read image data and write KTX2 files to memory
* zlib and Zstandard supercompression

## Install

```sh
npm install ris-ktx2
```

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

Supported transcode targets are `BC7_RGBA`, `BC3_RGBA`, `ETC2_RGBA`, `ASTC_4X4_RGBA`, and `RGBA32`. Other `KtxTranscodeFormat` values throw for now but will be supported in future releases.

### Create and encode a texture

```ts
import { KtxCreateStorage, KtxUastcFlags, VkFormat } from "ris-ktx2";

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

### Encode ASTC

```ts
import { KtxAstcQualityLevel, KtxAstcBlockDimension } from "ris-ktx2";

// Instead of compressBasis. Defaults: 4×4 blocks, MEDIUM quality.
texture.compressAstc({ blockDimension: KtxAstcBlockDimension.D6x6, qualityLevel: KtxAstcQualityLevel.THOROUGH });

texture.vkFormat; // VkFormat.ASTC_6X6_SRGB_BLOCK, ready to upload without transcoding
```

### Upload to WebGL

```ts
const gl = canvas.getContext("webgl2")!;
await factory.initializeAsync({ preinitializedWebGLContext: gl });

// After transcodeBasis or compressAstc. The GPU must support the format.
const result = texture.glUpload();
if (result.error !== 0) throw new Error(`glUpload failed: ${result.error}`);

gl.bindTexture(result.target, result.object!);
// One mip level: use a non-mipmap filter (or generate mipmaps), or the texture samples black.
gl.texParameteri(result.target, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
```

## Examples

[`examples/browser`](examples/browser/README.md) is a minimal Vite page that encodes a PNG to KTX2, then loads, transcodes and draws the result. Run it with `npm run example`.

## API

Generated API reference: https://luka712.github.io/ris-ktx2-ts/

Everything is imported from `ris-ktx2`:

* `Ktx2Factory` loads the WebAssembly module and creates or loads textures. It implements `IKtx2Factory`.
* `IKtx2Texture` is the texture type every factory method returns. Code against this interface. The concrete class is internal.
* `IKtxBasisParams`, `IKtxAstcParams`, and `IKtxTextureCreateInfo` are the options for `compressBasis`, `compressAstc`, and `create`.
* `texture.glUpload()` creates a WebGL texture in the context passed to `initializeAsync` and returns an `IKtxUploadResult` (`error` is `0` on success).
* `texture.getTextureFormatInfo(texture.vkFormat)` returns a `TextureFormatInfo` with the block size and bytes per block, which you need for WebGL and WebGPU uploads (for example `bytesPerRow`).

Things to know:

* Call `delete()` on every texture when you are done with it. Textures live in WebAssembly memory and are not garbage collected.
* `getImage` and `writeToMemory` return views into WebAssembly memory. Copy them with `slice()` before you keep them or delete the texture.
* Methods that return `KtxErrorCode` return the libktx result. Compare it with `KtxErrorCode.SUCCESS`.
* `getImage` throws while `needsTranscoding` is `true`. Call `transcodeBasis` first.
* `width`, `height`, `dataSize`, and `vkFormat` always describe the current data, including after `compressBasis`, `compressAstc`, and `transcodeBasis`.

## Known issues

* The WebAssembly binary is inlined as a `data:` URL and the libktx glue code is evaluated with `new Function`. If your page sets a Content Security Policy, it must allow `'unsafe-eval'` in `script-src` and `data:` in `connect-src`, or `initializeAsync` fails.
* `compressAstc` supports only 2D block dimensions (`D4x4` to `D12x12`). The 3D dimensions in `KtxAstcBlockDimension` are not supported yet.

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

* BC7 compression
* WebGL texture creation
* WebGPU texture creation

## License

MIT © 2026 Luka Erkapic.

`libktx.js` and `libktx.wasm` are redistributed from Khronos KTX-Software under the Apache License 2.0. See [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) for third-party attribution.
