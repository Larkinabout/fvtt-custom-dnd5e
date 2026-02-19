export const WAVE_FS = `
  precision highp float;
  varying vec2 vTextureCoord;
  uniform sampler2D uSampler;
  uniform vec4 inputSize;
  uniform vec4 inputClamp;
  uniform float u_time;
  uniform float u_intensity;

  // Mirror-reflect UV to stay within valid content bounds
  vec2 mirrorUV(vec2 uv, vec4 bounds) {
    vec2 range = bounds.zw - bounds.xy;
    vec2 n = (uv - bounds.xy) / range;
    n = 1.0 - abs(mod(n, 2.0) - 1.0);
    return bounds.xy + n * range;
  }

  void main() {
    vec2 uv = vTextureCoord;

    // Screen-space position in pixels
    vec2 pos = uv * inputSize.xy;

    // Layered sine waves for organic wave-like displacement
    float dx = sin(pos.y * 0.008 + u_time * 0.9) * 0.5
             + sin(pos.y * 0.015 + u_time * 0.5 + 1.7) * 0.3
             + cos(pos.x * 0.006 + pos.y * 0.004 + u_time * 0.7) * 0.2;

    float dy = cos(pos.x * 0.007 + u_time * 0.8) * 0.5
             + cos(pos.x * 0.013 + u_time * 0.4 + 2.3) * 0.3
             + sin(pos.y * 0.005 + pos.x * 0.003 + u_time * 0.6) * 0.2;

    // Convert pixel displacement to UV displacement
    vec2 displacement = vec2(dx, dy) * u_intensity * inputSize.zw;

    gl_FragColor = texture2D(uSampler, mirrorUV(uv + displacement, inputClamp));
  }
`;
