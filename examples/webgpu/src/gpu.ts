// WebGPU helpers for the example: device creation and drawing a texture, or each layer of a texture array.

// One triangle that covers the viewport; row 0 of the image is the top.
// The instance index picks the array layer.
const VERTEX = /* wgsl */ `
    struct VertexOut {
        @builtin(position) position: vec4f,
        @location(0) uv: vec2f,
        @location(1) @interpolate(flat) layer: u32,
    }

    @vertex fn vs(@builtin(vertex_index) i: u32, @builtin(instance_index) layer: u32) -> VertexOut {
        let p = vec2f(f32((i << 1u) & 2u), f32(i & 2u));
        var out: VertexOut;
        out.position = vec4f(p * 2.0 - 1.0, 0.0, 1.0);
        out.uv = vec2f(p.x, 1.0 - p.y);
        out.layer = layer;
        return out;
    }

    @group(0) @binding(0) var imageSampler: sampler;`;

// The canvas expects premultiplied alpha; the textures are straight alpha.
const SHADER = VERTEX + /* wgsl */ `
    @group(0) @binding(1) var image: texture_2d<f32>;

    @fragment fn fs(in: VertexOut) -> @location(0) vec4f {
        let color = textureSample(image, imageSampler, in.uv);
        return vec4f(color.rgb * color.a, color.a);
    }`;

const ARRAY_SHADER = VERTEX + /* wgsl */ `
    @group(0) @binding(1) var image: texture_2d_array<f32>;

    @fragment fn fs(in: VertexOut) -> @location(0) vec4f {
        let color = textureSample(image, imageSampler, in.uv, in.layer);
        return vec4f(color.rgb * color.a, color.a);
    }`;

// Requests a device with the texture compression features this adapter has.
export async function requestDevice(): Promise<GPUDevice> {
    const adapter = (await navigator.gpu.requestAdapter())!;
    const features = (["texture-compression-bc", "texture-compression-astc"] as const).filter(f => adapter.features.has(f));
    return adapter.requestDevice({requiredFeatures: features});
}

// Draws a 2D texture (mip level 0) over the whole canvas.
export function drawTexture(device: GPUDevice, selector: string, texture: GPUTexture): void {
    draw(device, selector, texture.width, texture.height, SHADER, texture.createView(), 1);
}

// Draws each layer of a 2D texture array (mip level 0) at half size, side by side.
export function drawTextureArray(device: GPUDevice, selector: string, texture: GPUTexture): void {
    const layers = texture.depthOrArrayLayers;
    draw(device, selector, texture.width / 2 * layers, texture.height / 2, ARRAY_SHADER,
        texture.createView({dimension: "2d-array"}), layers);
}

// Draws `layers` triangles side by side, one viewport and instance (layer) each.
function draw(device: GPUDevice, selector: string, width: number, height: number,
              code: string, view: GPUTextureView, layers: number): void {
    const canvas = document.querySelector<HTMLCanvasElement>(selector)!;
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("webgpu")!;
    const format = navigator.gpu.getPreferredCanvasFormat();
    // The default "opaque" mode ignores alpha.
    context.configure({device, format, alphaMode: "premultiplied"});

    const module = device.createShaderModule({code});
    const pipeline = device.createRenderPipeline({
        layout: "auto",
        vertex: {module},
        fragment: {module, targets: [{format}]},
    });
    const bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
            {binding: 0, resource: device.createSampler({magFilter: "linear", minFilter: "linear"})},
            {binding: 1, resource: view},
        ],
    });

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
        colorAttachments: [{view: context.getCurrentTexture().createView(), loadOp: "clear", storeOp: "store"}],
    });
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    const layerWidth = width / layers;
    for (let layer = 0; layer < layers; layer++) {
        pass.setViewport(layer * layerWidth, 0, layerWidth, height, 0, 1);
        pass.draw(3, 1, 0, layer);
    }
    pass.end();
    device.queue.submit([encoder.finish()]);
}
