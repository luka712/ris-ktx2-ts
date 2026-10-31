// Loads a PNG, pads it to a multiple of 4 and draws it to a 2D canvas.
// WebGL rejects BC7 and ASTC 4x4 textures whose size is not a multiple of 4.
export interface Pixels {
    width: number;
    height: number;
    data: Uint8ClampedArray; // RGBA, 8-bit sRGB
}

export async function loadPixels(url: string, canvasSelector: string): Promise<Pixels> {
    const image = new Image();
    image.src = url;
    await image.decode();
    const width = Math.ceil(image.naturalWidth / 4) * 4;
    const height = Math.ceil(image.naturalHeight / 4) * 4;
    const canvas = document.querySelector<HTMLCanvasElement>(canvasSelector)!;
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d")!;
    context.drawImage(image, 0, 0);
    return {width, height, data: context.getImageData(0, 0, width, height).data};
}
