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

    const program = gl.createProgram()!;
    for (const [type, source] of [[gl.VERTEX_SHADER, VERTEX_SHADER], [gl.FRAGMENT_SHADER, FRAGMENT_SHADER]] as const) {
        const shader = gl.createShader(type)!;
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        gl.attachShader(program, shader);
    }
    gl.linkProgram(program);
    gl.useProgram(program);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
}
