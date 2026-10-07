import {createKtxModuleAsync} from "./createKtxModuleAsync";
import type {IKtx2Texture} from "./IKtx2Texture";
import type {IKtxTextureCreateInfo} from "./IKtxTextureCreateInfo";
import {KtxCreateStorage} from "./KtxCreateStorage";
import {VkFormat} from "./VkFormat";
import {Mapper} from "./Mapper";
import type {IKtx2Factory} from "./IKtx2Factory";
import {Ktx2Texture} from "./Ktx2Texture";
import {detectKtxContainer, toUint8Array} from "./KtxContainer";

/**
 * Loads and creates KTX2 textures. This is the main entry point of the package.
 *
 * Call {@link Ktx2Factory.initializeAsync} and wait for it before any other
 * method. The libktx module is loaded once per JavaScript realm and shared by
 * every `Ktx2Factory` in that realm. The main thread and each worker
 * initialize their own factory.
 *
 * Textures are returned as {@link IKtx2Texture}. Call
 * {@link IKtx2Texture.delete} on each one when you are done with it.
 *
 * @example
 * ```ts
 * import { Ktx2Factory, KtxTranscodeFlags, KtxTranscodeFormat } from "ris-ktx2";
 *
 * const factory = new Ktx2Factory();
 * await factory.initializeAsync();
 *
 * const texture = await factory.loadAsync("/textures/example.ktx2");
 * if (texture.needsTranscoding) {
 *     texture.transcodeBasis(KtxTranscodeFormat.RGBA32, KtxTranscodeFlags.NONE);
 * }
 * const pixels = texture.getImage(0).slice();
 * texture.delete();
 * ```
 * @public
 */
export class Ktx2Factory implements IKtx2Factory {

    private static _ktxLib?: any;

    /** In-flight load, shared by concurrent `initializeAsync` calls. */
    private static _ktxLibPromise?: Promise<void>;

    /** @inheritDoc */
    public async initializeAsync(): Promise<void> {
        if (Ktx2Factory._ktxLib) {
            return;
        }
        if (!Ktx2Factory._ktxLibPromise) {
            Ktx2Factory._ktxLibPromise = createKtxModuleAsync().then(
                (ktxLib) => {
                    Ktx2Factory._ktxLib = ktxLib;
                },
                (error: unknown) => {
                    // Allow a later call to retry.
                    Ktx2Factory._ktxLibPromise = undefined;
                    throw error;
                },
            );
        }
        await Ktx2Factory._ktxLibPromise;
    }

    /** @inheritDoc */
    public async loadAsync(blob: string|File): Promise<IKtx2Texture> {
        Ktx2Factory._requireKtxLib();

        let buffer: ArrayBuffer;
        let filePath: string;

        if(typeof blob !== "string"){
            filePath = blob.name;
            buffer = await blob.arrayBuffer();
        }
        else {
            filePath = blob;
            buffer = await readSourceBytes(blob);
        }

        return Ktx2Factory._createFromBytes(new Uint8Array(buffer), filePath);
    }

    /** @inheritDoc */
    public create(createInfo: IKtxTextureCreateInfo, storage?: KtxCreateStorage): IKtx2Texture {
        const ktxLib = Ktx2Factory._requireKtxLib();
        const ktxCreateInfo = new ktxLib.textureCreateInfo();

        try {
            // Copy to ktx create info.
            ktxCreateInfo.baseWidth = createInfo.baseWidth;
            ktxCreateInfo.baseHeight = createInfo.baseHeight;
            ktxCreateInfo.vkFormat = Mapper.mapVkFormat(ktxLib, createInfo.vkFormat ?? VkFormat.R8G8B8A8_SRGB);
            ktxCreateInfo.baseDepth = 1;
            ktxCreateInfo.numDimensions = 2;
            ktxCreateInfo.numLevels = createInfo.numLevels ?? 1;
            ktxCreateInfo.numLayers = 1;
            ktxCreateInfo.numFaces = 1;
            ktxCreateInfo.isArray = false;
            ktxCreateInfo.generateMipmaps = false;

            const ktxStorage = Mapper.mapStorage(ktxLib, storage ?? KtxCreateStorage.ALLOC_STORAGE);

            const ktxTexture = new ktxLib.texture(ktxCreateInfo, ktxStorage);
            return new Ktx2Texture(ktxLib, ktxTexture, ktxCreateInfo);
        } finally {
            // textureCreateInfo is an Embind object and must be freed explicitly.
            ktxCreateInfo.delete?.();
        }
    }

    /** @inheritDoc */
    public createFromBuffer(buffer: ArrayBufferView<ArrayBufferLike>): IKtx2Texture {
        Ktx2Factory._requireKtxLib();
        return Ktx2Factory._createFromBytes(toUint8Array(buffer));
    }

    /** Returns the loaded libktx module, or throws when `initializeAsync` has not finished. */
    private static _requireKtxLib(): any {
        if (!Ktx2Factory._ktxLib) {
            throw new Error("Ktx2Factory is not initialized. Call and await initializeAsync() first.");
        }
        return Ktx2Factory._ktxLib;
    }

    /** Validates KTX or KTX2 file bytes and wraps them in a texture. */
    private static _createFromBytes(bytes: Uint8Array, filePath?: string): IKtx2Texture {
        const ktxLib = Ktx2Factory._requireKtxLib();
        const source = filePath ? `"${filePath}"` : "The buffer";

        if (!detectKtxContainer(bytes)) {
            throw new Error(`${source} is not a KTX or KTX2 file: the file identifier is missing.`);
        }

        const ktxTexture = new ktxLib.texture(bytes);

        // libktx does not throw on bad data. It logs an error and returns an
        // empty texture.
        if (!ktxTexture.baseWidth) {
            ktxTexture.delete?.();
            throw new Error(`libktx could not read ${filePath ? source : "the buffer"}. The file may be truncated or corrupt.`);
        }

        return new Ktx2Texture(ktxLib, ktxTexture, bytes, filePath);
    }
}

/** Fetches `source` and returns the response body. Throws for a non-2xx status. */
async function readSourceBytes(source: string): Promise<ArrayBuffer> {
    const response = await fetch(source);
    if (!response.ok) {
        const status = `${response.status} ${response.statusText}`.trim();
        throw new Error(`Failed to fetch "${source}": HTTP ${status}`);
    }
    return await response.arrayBuffer();
}
