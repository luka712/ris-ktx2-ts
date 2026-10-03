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

/**
 * Node-only libktx bootstrap used by tests. The browser bundle never imports it.
 */
export type NodeKtxHooks = {
    createKtxModuleNode: (options?: any) => Promise<any>;
    readFileBytes: (source: string) => Promise<ArrayBuffer>;
};

let nodeKtxHooks: NodeKtxHooks | undefined;

/** Installed by Node tests before the factory loads a local `.ktx2` file. */
export function useNodeKtxHooks(hooks: NodeKtxHooks): void {
    nodeKtxHooks = hooks;
}

export function getNodeKtxHooks(): NodeKtxHooks | undefined {
    return nodeKtxHooks;
}
