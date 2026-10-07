import {describe, expect, it} from "vitest";
import {detectKtxContainer, readNumLevels, toUint8Array} from "../src/KtxContainer";

const KTX2_IDENTIFIER = [0xAB, 0x4B, 0x54, 0x58, 0x20, 0x32, 0x30, 0xBB, 0x0D, 0x0A, 0x1A, 0x0A];
const KTX1_IDENTIFIER = [0xAB, 0x4B, 0x54, 0x58, 0x20, 0x31, 0x31, 0xBB, 0x0D, 0x0A, 0x1A, 0x0A];

describe("KtxContainer", () => {
    it("detects KTX1 and KTX2 identifiers and rejects anything else", () => {
        expect(detectKtxContainer(Uint8Array.from(KTX2_IDENTIFIER))).toBe("ktx2");
        expect(detectKtxContainer(Uint8Array.from(KTX1_IDENTIFIER))).toBe("ktx1");
        expect(detectKtxContainer(new Uint8Array(12))).toBeUndefined();
        expect(detectKtxContainer(Uint8Array.from(KTX2_IDENTIFIER.slice(0, 8)))).toBeUndefined();
    });

    it("returns 0 levels for a header that is too short", () => {
        expect(readNumLevels(Uint8Array.from(KTX2_IDENTIFIER))).toBe(0);
        expect(readNumLevels(Uint8Array.from(KTX1_IDENTIFIER))).toBe(0);
    });

    it("wraps any view as a Uint8Array over the same bytes without copying", () => {
        const buffer = new ArrayBuffer(16);
        const asFloat = new Float32Array(buffer, 4, 2);
        const bytes = toUint8Array(asFloat);

        expect(bytes.buffer).toBe(buffer);
        expect(bytes.byteOffset).toBe(4);
        expect(bytes.byteLength).toBe(8);

        const original = new Uint8Array(4);
        expect(toUint8Array(original)).toBe(original);
    });
});
