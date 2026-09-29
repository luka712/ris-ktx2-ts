/**
 * True when this module is running on Node rather than in a browser window.
 * Vitest uses the Node environment, so the factory can load libktx there.
 */
export function isNodeRuntime(): boolean {
    const globalObject = globalThis as {
        process?: { versions?: { node?: string }; type?: string };
        window?: unknown;
    };
    const proc = globalObject.process;
    return typeof proc === "object"
        && typeof proc.versions?.node === "string"
        && proc.type !== "renderer"
        && typeof globalObject.window === "undefined";
}

export function isRemoteUrl(source: string): boolean {
    return /^(https?:|blob:|data:)/i.test(source);
}
