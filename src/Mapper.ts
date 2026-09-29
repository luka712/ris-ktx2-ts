import {KtxCreateStorage, KtxErrorCode, VkFormat} from "ris-ktx2-api";

export class Mapper {

    public static mapVkFormat(ktxLib: any, vkFormat: VkFormat) {
        if(vkFormat === VkFormat.R8G8B8A8_UNORM) {
            return ktxLib.VkFormat.R8G8B8A8_UNORM;
        }
        else if(vkFormat === VkFormat.R8G8B8A8_SRGB) {
            return ktxLib.VkFormat.R8G8B8A8_SRGB;
        }
        else {
            throw new Error(`Unsupported VkFormat: ${vkFormat}`);
        }
    }

    public static mapErrorCodeFromKtxLib(errorCode: any) : KtxErrorCode {

        if(errorCode.value == 0){
            return KtxErrorCode.SUCCESS;
        }
        else if(errorCode.value == 10){
            return KtxErrorCode.INVALID_OPERATION;
        }
        else {
            throw new Error(`Not implemented KtxErrorCode: ${errorCode}`);
        }
    }

    public static mapStorage(ktxLib: any, storage: KtxCreateStorage) {
        if(storage == KtxCreateStorage.ALLOC_STORAGE) {
            return ktxLib.TextureCreateStorageEnum.ALLOC_STORAGE
        }
        else if(storage == KtxCreateStorage.NO_STORAGE) {
            return ktxLib.TextureCreateStorageEnum.NO_STORAGE;
        }
        else {
            throw new Error(`Not implemented KtxCreateStorage: ${storage}`);
        }
    }

}