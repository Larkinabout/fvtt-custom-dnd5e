export const COLOR_SPLIT_FS = `
  precision highp float;
  varying vec2 vTextureCoord;
  uniform sampler2D uSampler;
  uniform vec4 inputSize;
  uniform vec4 inputClamp;
  uniform vec2 u_offset0;
  uniform vec2 u_offset1;
  uniform vec2 u_offset2;
  uniform vec3 u_color0;
  uniform vec3 u_color1;
  uniform vec3 u_color2;
  uniform float u_env;

  // Mirror-reflect UV to stay within valid content bounds
  vec2 mirrorUV(vec2 uv, vec4 bounds) {
    vec2 range = bounds.zw - bounds.xy;
    vec2 n = (uv - bounds.xy) / range;
    n = 1.0 - abs(mod(n, 2.0) - 1.0);
    return bounds.xy + n * range;
  }

  void main() {
    vec2 uv = vTextureCoord;
    vec2 pixelSize = inputSize.zw;

    // Sample three offset copies and tint each by its colour
    vec3 layer0 = texture2D(uSampler, mirrorUV(uv + u_offset0 * pixelSize, inputClamp)).rgb * u_color0;
    vec3 layer1 = texture2D(uSampler, mirrorUV(uv + u_offset1 * pixelSize, inputClamp)).rgb * u_color1;
    vec3 layer2 = texture2D(uSampler, mirrorUV(uv + u_offset2 * pixelSize, inputClamp)).rgb * u_color2;

    // Screen blend the three coloured layers: 1 - (1-a)(1-b)
    vec3 blend = 1.0 - (1.0 - layer0) * (1.0 - layer1);
    vec3 colorLayers = 1.0 - (1.0 - blend) * (1.0 - layer2);

    // Mix between original and coloured layers based on envelope
    vec4 original = texture2D(uSampler, uv);
    vec3 result = mix(original.rgb, colorLayers, u_env);

    gl_FragColor = vec4(result, original.a);
  }
`;
