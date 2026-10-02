# Third-party notices

`ris-ktx2` is TypeScript written for this repository and distributed under the MIT License (see `LICENSE`). Copyright (c) 2026 Luka Erkapic.

## Khronos KTX-Software (libktx)

`libktx.js` and `libktx.wasm` are checked in unmodified. They are the WebAssembly build of Khronos libktx and its JavaScript wrapper.

`libktx.js` ends with:

```
Copyright 2019-2024 Khronos Group, Inc.
SPDX-License-Identifier: Apache-2.0
```

https://github.com/KhronosGroup/KTX-Software

Upstream license overview (v4.3.2): https://github.com/KhronosGroup/KTX-Software/blob/v4.3.2/LICENSE.md

The Apache License 2.0 text is in `LICENSES/Apache-2.0.txt`.

KTX-Software incorporates other projects. The licenses below are the ones whose code is identifiable in this wasm build. KTX-Software's `LICENSES/` directory also contains licenses for repository files that are not redistributed here (test images, command-line tools, and similar).

### Basis Universal

Copyright Binomial LLC.

SPDX-License-Identifier: Apache-2.0

https://github.com/BinomialLLC/basis_universal

`libktx.wasm` includes Basis Universal. Identifiable symbols include `basisu_compressor` and `basist::basisu_transcoder`.

### astc-encoder

Copyright Arm Limited and contributors.

SPDX-License-Identifier: Apache-2.0

https://github.com/ARM-software/astc-encoder

`libktx.wasm` includes Arm's astc-encoder. The binary contains the `astcenc_compress_image` entry point.

libktx also names ZLIB and Zstandard on its KTX2 deflate API (`deflateZLIB`, `deflateZstd`). Those names are present as API strings. This package does not ship zlib or zstd as separate source files.

## ris-ktx2-api

Runtime dependency of this package. MIT License. Copyright (c) 2026 Luka Erkapic.

https://github.com/luka712/ris-ktx2-api-ts

`VkFormat` and the KTX transcode, UASTC, storage, and error enumerations are defined there. They use the same names and numeric values as the Khronos and Basis Universal APIs they interoperate with. That package documents those correspondences in its own `THIRD_PARTY_NOTICES.md`.

## Development dependencies

`vite` (MIT), `vite-plugin-dts` (MIT), `@microsoft/api-extractor` (MIT), `vitest` (MIT), `typescript` (Apache-2.0), and `@typescript/typescript6` (Apache-2.0) are used to build and test this package. `vite-plugin-dts` uses API Extractor to bundle `dist/index.d.ts`. `typescript` is pinned to 5.9.3, the compiler API Extractor bundles, so declaration bundling and `tsc` use the same language version. These tools are not part of the published runtime. Their licenses are recorded in `package-lock.json`.
