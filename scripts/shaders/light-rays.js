export const LIGHT_RAYS_VS = `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

export const LIGHT_RAYS_FS = `
  precision mediump float;
  uniform float u_time;
  uniform vec2 u_resolution;
  uniform vec3 u_color;
  uniform float u_rays;
  uniform float u_seed;

  void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
    float dist = length(uv);
    float angle = atan(uv.y, uv.x);

    // Warp angle with seeded noise to create uneven ray spacing
    // Primary rays: few, long, slow rotation
    float a1 = angle + u_time * 0.15;
    float w1 = a1 + sin(a1 * 3.0 + u_seed) * 0.1 + sin(a1 * 7.0 + u_seed * 2.3) * 0.05;
    float r1 = abs(fract(w1 * u_rays / 6.28318) - 0.5) * 2.0;
    float primary = smoothstep(0.7, 0.95, r1) * smoothstep(0.05, 0.6, dist);

    // Secondary rays: more, medium length, moderate rotation (opposite direction)
    float a2 = angle - u_time * 0.3;
    float w2 = a2 + sin(a2 * 5.0 + u_seed * 3.7) * 0.08 + sin(a2 * 11.0 + u_seed * 1.3) * 0.04;
    float r2 = abs(fract(w2 * (u_rays * 2.0) / 6.28318 + 0.25) - 0.5) * 2.0;
    float secondary = smoothstep(0.75, 0.95, r2) * smoothstep(0.2, 0.8, dist) * 0.6;

    // Tertiary rays: many, short, faster rotation
    float a3 = angle + u_time * 0.5;
    float w3 = a3 + sin(a3 * 4.0 + u_seed * 5.1) * 0.06 + sin(a3 * 13.0 + u_seed * 0.7) * 0.03;
    float r3 = abs(fract(w3 * (u_rays * 5.0) / 6.28318 + 0.5) - 0.5) * 2.0;
    float tertiary = smoothstep(0.7, 0.9, r3) * smoothstep(0.3, 0.8, dist) * 0.35;

    float rayPattern = primary + secondary + tertiary;

    // Gentle brightness variation flowing inward
    float flow = sin(dist * 3.0 + u_time * 8.0) * 0.15 + 0.85;

    // Asymmetric fade: quick appear, slow fade out
    float fade = (u_time < 0.3)
      ? smoothstep(0.0, 0.3, u_time)
      : 1.0 - smoothstep(0.3, 1.0, u_time);

    // Screen-wide wash of light
    float wash = fade * 0.35;

    float rayIntensity = rayPattern * flow * fade;

    float intensity = rayIntensity + wash;
    gl_FragColor = vec4(u_color * intensity, intensity);
  }
`;
