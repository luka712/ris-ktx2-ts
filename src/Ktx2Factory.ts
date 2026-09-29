import {Ktx2Texture} from "./Ktx2Texture";
import {createKtxModuleAsync} from "./index";
import {type IKtx2Texture, VkFormat, type IKtxTextureCreateInfo, type IKtx2Factory} from "ris-ktx2-api";
import {KtxCreateStorage} from "../../ris-ktx2-api/src/ris-ktx2/KtxCreateStorage";
import {Mapper} from "./Mapper";

/**
 * The Ktx2Factory class is responsible for loading and creating KTX2 textures.
 * Only single instance of the factory can be created.
 */
export class Ktx2Factory implements IKtx2Factory {

    private static _ktxLib?: any;

    /** @inheritDoc */
    public async initializeAsync(){
        if(!Ktx2Factory._ktxLib){
            Ktx2Factory._ktxLib = await createKtxModuleAsync();
        }
    }

    /** @inheritDoc */
    public async loadAsync(blob: string|File): Promise<IKtx2Texture> {

        let buffer: ArrayBuffer;
        let filePath: string;

        if(blob instanceof File){
            filePath = blob.name;
            buffer = await blob.arrayBuffer();
        }
        else {
            filePath = blob;
            const response = await fetch(blob);
            buffer = await response.arrayBuffer();
        }

        const uint8Array = new Uint8Array(buffer);
        const ktxTexture = new Ktx2Factory._ktxLib.texture(uint8Array);
        return new Ktx2Texture(Ktx2Factory._ktxLib, ktxTexture,  uint8Array, filePath);
    }

    /** @inheritDoc */
    public create(createInfo: IKtxTextureCreateInfo, storage?: KtxCreateStorage): IKtx2Texture {
        const ktxCreateInfo = new Ktx2Factory._ktxLib.textureCreateInfo();

        // Copy to ktx create info.
        ktxCreateInfo.baseWidth = createInfo.baseWidth;
        ktxCreateInfo.baseHeight = createInfo.baseHeight;
        ktxCreateInfo.vkFormat = Mapper.mapVkFormat(Ktx2Factory._ktxLib, createInfo.vkFormat ?? VkFormat.R8G8B8A8_SRGB);
        ktxCreateInfo.baseDepth = 1;
        ktxCreateInfo.numDimensions = 2;
        ktxCreateInfo.numLevels = createInfo.numLevels ?? 1;
        ktxCreateInfo.numLayers = 1;
        ktxCreateInfo.numFaces = 1;
        ktxCreateInfo.isArray = false;
        ktxCreateInfo.generateMipmaps = false;

        const ktxStorage = Mapper.mapStorage(Ktx2Factory._ktxLib, storage ?? KtxCreateStorage.ALLOC_STORAGE);

        const ktxTexture = new Ktx2Factory._ktxLib.texture(ktxCreateInfo, ktxStorage);
        return new Ktx2Texture(Ktx2Factory._ktxLib, ktxTexture, ktxCreateInfo);
    }

    /** @inheritDoc */
    public createFromBuffer(buffer: ArrayBufferView<ArrayBufferLike>): IKtx2Texture {
        const ktxTexture = new Ktx2Factory._ktxLib.texture(buffer);
        return new Ktx2Texture(Ktx2Factory._ktxLib, ktxTexture, buffer);
    }
}
