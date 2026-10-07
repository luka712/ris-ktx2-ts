# Third-party notices

`ris-ktx2` is TypeScript written for this repository and distributed under the MIT License (see `LICENSE`). Copyright (c) 2026 Luka Erkapic.

This package ships the Khronos libktx WebAssembly build (`libktx.js` and `libktx.wasm`) produced from [KTX-Software](https://github.com/KhronosGroup/KTX-Software). Those binaries are redistributed here. The Apache License 2.0 text is included at `LICENSES/Apache-2.0.txt`.

The TypeScript interfaces, enumerations, and texture-format helpers ship in this same package. `KtxTranscodeFormat`, `KtxTranscodeFlags`, `KtxUastcFlags`, `KtxCreateStorage`, `KtxErrorCode`, and the Basis Universal fields on `IKtxBasisParams` follow the public libktx API.

## Khronos KTX-Software / libktx

Copyright 2010-2024 The Khronos Group Inc. and contributors.

SPDX-License-Identifier: Apache-2.0

`libktx.js` and `libktx.wasm` are the Emscripten/WebAssembly build of libktx:

https://github.com/KhronosGroup/KTX-Software

Upstream license overview (v4.3.2): https://github.com/KhronosGroup/KTX-Software/blob/v4.3.2/LICENSE.md

KTX-Software bundles other projects, including basis_universal. Those C/C++ sources are not redistributed as source in this package; they are compiled into the shipped WebAssembly binary.

## Basis Universal

Copyright Binomial LLC.

SPDX-License-Identifier: Apache-2.0

UASTC and ETC1S codecs used by libktx originate in the Basis Universal project:

https://github.com/BinomialLLC/basis_universal

## Vulkan `VkFormat`

Copyright 2015-2026 The Khronos Group Inc.

SPDX-License-Identifier: Apache-2.0 OR MIT

`VkFormat` enumerator names and numeric values in this package match the Vulkan `VkFormat` enumeration in Vulkan-Headers:

https://github.com/KhronosGroup/Vulkan-Headers

Vulkan-Headers are dual-licensed Apache-2.0 OR MIT. This package is distributed under the MIT License.

## Development dependencies

`vite` (MIT), `vite-plugin-dts` (MIT), `vitest` (MIT), `typedoc` (MIT), and `@typescript/typescript6` (Apache-2.0) are used to build, test, and document this package. These tools are not bundled into the published `dist/` entry as application code beyond what the library build emits. Their licenses are recorded in `package-lock.json`.
