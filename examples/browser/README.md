# ris-ktx2 browser example

`src/main.ts` encodes `public/test-pattern.png` to KTX2 (UASTC), loads the encoded bytes back, transcodes them to BC7 or ASTC 4x4 (whichever the GPU supports, else RGBA32), and draws the result with WebGL2 next to the original. It uses the library source in `../../src`.

Run from the repository root:

```sh
npm install
npm run example
```

`npm run example:build` type-checks and builds it.
