// WebGL2 helpers for the example: context creation and drawing one texture over the whole canvas.

// One triangle that covers the screen; row 0 of the image is the top.
const VERTEX_SHADER = `#version 300 es
    out vec2 uv;
    void main() {
        vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
        uv = vec2(p.x, 1.0 - p.y);
        gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
    }`;

const FRAGMENT_SHADER = `#version 300 es
    precision mediump float;
    uniform sampler2D image;
    in vec2 uv;
    out vec4 color;
    void main() { color = texture(image, uv); }`;

const ARRAY_FRAGMENT_SHADER = `#version 300 es
    precision mediump float;
    precision mediump sampler2DArray;
    uniform sampler2DArray image;
    uniform float layer;
    in vec2 uv;
    out vec4 color;
    void main() { color = texture(image, vec3(uv, layer)); }`;

export function createGl(selector: string, width: number, height: number): WebGL2RenderingContext {
    const canvas = document.querySelector<HTMLCanvasElement>(selector)!;
    canvas.width = width;
    canvas.height = height;
    const gl = canvas.getContext("webgl2");
    if (!gl) throw new Error("WebGL2 is not available");
    return gl;
}

export const hasBc7 = (gl: WebGL2RenderingContext) => !!gl.getExtension("EXT_texture_compression_bptc");
export const hasAstc = (gl: WebGL2RenderingContext) => !!gl.getExtension("WEBGL_compressed_texture_astc");

// Draws a 2D texture (one mip level) over the whole canvas.
export function drawTexture(gl: WebGL2RenderingContext, texture: WebGLTexture): void {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    // One mip level: use a non-mipmap filter so the texture is complete.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

    gl.useProgram(createProgram(gl, FRAGMENT_SHADER));
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
}

// Draws each layer of a 2D texture array (one mip level) side by side.
export function drawTextureArray(gl: WebGL2RenderingContext, target: GLenum, texture: WebGLTexture, numLayers: number): void {
    gl.bindTexture(target, texture);
    gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

    const program = createProgram(gl, ARRAY_FRAGMENT_SHADER);
    gl.useProgram(program);
    const layerLocation = gl.getUniformLocation(program, "layer");
    const width = gl.canvas.width / numLayers;
    for (let layer = 0; layer < numLayers; layer++) {
        gl.viewport(layer * width, 0, width, gl.canvas.height);
        gl.uniform1f(layerLocation, layer);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
}

function createProgram(gl: WebGL2RenderingContext, fragmentShader: string): WebGLProgram {
    const program = gl.createProgram()!;
    for (const [type, source] of [[gl.VERTEX_SHADER, VERTEX_SHADER], [gl.FRAGMENT_SHADER, fragmentShader]] as const) {
        const shader = gl.createShader(type)!;
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        gl.attachShader(program, shader);
    }
    gl.linkProgram(program);
    return program;
}
