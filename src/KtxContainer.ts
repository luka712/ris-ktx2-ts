// Helpers for reading KTX and KTX2 file headers. The libktx Embind texture
// does not expose the mip level count, so it is read from the header here.
// Internal: not exported from src/index.ts.

/** KTX container version, read from the 12-byte file identifier. */
export type KtxContainerVersion = "ktx1" | "ktx2";

/** `«KTX 11»\r\n\x1A\n` */
const KTX1_IDENTIFIER = [0xAB, 0x4B, 0x54, 0x58, 0x20, 0x31, 0x31, 0xBB, 0x0D, 0x0A, 0x1A, 0x0A];

/** `«KTX 20»\r\n\x1A\n` */
const KTX2_IDENTIFIER = [0xAB, 0x4B, 0x54, 0x58, 0x20, 0x32, 0x30, 0xBB, 0x0D, 0x0A, 0x1A, 0x0A];

/** Byte offset of `levelCount` in the KTX2 header. Always little-endian. */
export const KTX2_LEVEL_COUNT_OFFSET = 40;

/** Byte offset of `endianness` in the KTX1 header. */
const KTX1_ENDIANNESS_OFFSET = 12;

/** Byte offset of `numberOfMipmapLevels` in the KTX1 header. */
const KTX1_LEVEL_COUNT_OFFSET = 56;

/** KTX1 `endianness` value when the file matches the reader's byte order. */
const KTX1_ENDIAN_REF = 0x04030201;

/**
 * Returns a `Uint8Array` over the same bytes as `view`, without copying.
 * @internal
 */
export function toUint8Array(view: ArrayBufferView<ArrayBufferLike>): Uint8Array {
    if (view instanceof Uint8Array) {
        return view;
    }
    return new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
}

/**
 * Returns the container version from the file identifier, or `undefined`
 * when `bytes` does not start with a KTX or KTX2 identifier.
 * @internal
 */
export function detectKtxContainer(bytes: Uint8Array): KtxContainerVersion | undefined {
    if (startsWith(bytes, KTX2_IDENTIFIER)) {
        return "ktx2";
    }
    if (startsWith(bytes, KTX1_IDENTIFIER)) {
        return "ktx1";
    }
    return undefined;
}

/**
 * Reads the mip level count from a KTX or KTX2 header.
 *
 * A header value of `0` means "generate mipmaps at load time". The file then
 * stores one level, so `1` is returned. Bytes without a KTX1 identifier are
 * read as a KTX2 header. Returns `0` when the header is too short.
 * @internal
 */
export function readNumLevels(bytes: Uint8Array): number {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    if (detectKtxContainer(bytes) === "ktx1") {
        if (bytes.byteLength < KTX1_LEVEL_COUNT_OFFSET + 4) {
            return 0;
        }
        // KTX1 files are written in the writer's byte order. The endianness
        // field reads as 0x04030201 when it matches little-endian.
        const littleEndian = view.getUint32(KTX1_ENDIANNESS_OFFSET, true) === KTX1_ENDIAN_REF;
        return Math.max(1, view.getUint32(KTX1_LEVEL_COUNT_OFFSET, littleEndian));
    }

    if (bytes.byteLength < KTX2_LEVEL_COUNT_OFFSET + 4) {
        return 0;
    }
    return Math.max(1, view.getUint32(KTX2_LEVEL_COUNT_OFFSET, true));
}

function startsWith(bytes: Uint8Array, prefix: number[]): boolean {
    if (bytes.byteLength < prefix.length) {
        return false;
    }
    for (let i = 0; i < prefix.length; i++) {
        if (bytes[i] !== prefix[i]) {
            return false;
        }
    }
    return true;
}
