declare module "node:fs" {
    export function readFileSync(path: string, encoding: "utf8"): string;
    export function existsSync(path: string): boolean;
}

declare module "node:fs/promises" {
    export function readFile(path: string): Promise<Uint8Array>;
}

declare module "node:path" {
    export function dirname(path: string): string;
    export function resolve(...paths: string[]): string;
}

declare module "node:vm" {
    export function runInThisContext(
        code: string,
        options?: { filename?: string },
    ): unknown;
}

declare module "node:module" {
    export function createRequire(filename: string | URL): (id: string) => unknown;
}

declare module "node:url" {
    export function fileURLToPath(url: URL | string): string;
    export function pathToFileURL(path: string): URL;
}
