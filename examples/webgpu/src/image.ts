// Loads a PNG, pads it to a multiple of 8 and draws it to a 2D canvas.
// WebGPU needs block-compressed textures to be a multiple of the block size (4x4 for BC7, 8x8 for ASTC 8x8).
export interface Pixels {
    width: number;
    height: number;
    data: Uint8ClampedArray; // RGBA, 8-bit sRGB
}

export async function loadPixels(url: string, canvasSelector: string): Promise<Pixels> {
    const image = new Image();
    image.src = url;
    await image.decode();
    const width = Math.ceil(image.naturalWidth / 8) * 8;
    const height = Math.ceil(image.naturalHeight / 8) * 8;
    const canvas = document.querySelector<HTMLCanvasElement>(canvasSelector)!;
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d")!;
    context.drawImage(image, 0, 0);
    return {width, height, data: context.getImageData(0, 0, width, height).data};
}

// Returns a copy of RGBA pixels with red, green and blue multiplied by `rgb`. Alpha is kept.
export function tint(data: Uint8ClampedArray, rgb: readonly number[]): Uint8ClampedArray {
    return data.map((value, i) => i % 4 === 3 ? value : value * rgb[i % 4]);
}
