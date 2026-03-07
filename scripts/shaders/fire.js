export const FIRE_VS = `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

export const FIRE_FS = `
  precision mediump float;

  uniform float u_time;        // Elapsed time in seconds
  uniform float u_fade;        // Global fade multiplier (0-1)
  uniform vec2  u_resolution;  // Canvas size in pixels
  uniform vec3  u_color;       // Base colour (reserved for future use)
  uniform float u_seed;        // Random seed for variation between plays
  uniform float u_intensity;   // Normalised intensity (0-3)
  uniform float u_sparkFrequency; // Base spark probability (0-1)
  uniform float u_smokeOpacity;   // Smoke layer opacity (0-1)

  /* ---- Noise primitives ---- */

  float hash(vec2 p) {
    p = fract(p * vec2(443.897, 441.423));
    p += dot(p, p + 19.19);
    return fract(p.x * p.y);
  }

  vec2 hash2(vec2 p) {
    return vec2(hash(p), hash(p + vec2(37.0, 17.0)));
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  float voronoi(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float minDist = 1.0;
    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        vec2 neighbor = vec2(float(x), float(y));
        vec2 point = hash2(i + neighbor);
        float dist = length(neighbor + point - f);
        minDist = min(minDist, dist);
      }
    }
    return minDist;
  }

  /* ---- Fire layer ----
     Layered Voronoi + value noise with a height threshold to create
     natural flame shapes. Intensity controls height, width, and speed. */

  vec4 fire(vec2 uv, float time) {
    float aspect = u_resolution.x / u_resolution.y;
    vec2 p = vec2((uv.x - 0.5) * aspect, uv.y);
    float flickerSpeed = 0.6 + u_intensity * 0.4;

    // Coordinate warping for turbulence
    float warp1 = noise(p * 5.0 + vec2(u_seed, -time * 0.4 * flickerSpeed)) * 0.15;
    float warp2 = noise(p * 9.0 + vec2(u_seed + 30.0, -time * 0.7 * flickerSpeed)) * 0.07;
    vec2 wp = p + vec2(warp1 + warp2, 0.0);

    // Inverted Voronoi layers (bright cells = flame tongues) scrolling upward
    float v1 = 1.0 - voronoi(wp * vec2(4.0, 2.0) + vec2(0.0, -time * 1.2 * flickerSpeed) + u_seed);
    float v2 = 1.0 - voronoi(wp * vec2(7.0, 3.5) + vec2(0.0, -time * 1.8 * flickerSpeed) + u_seed + 50.0);
    float n1 = noise(wp * vec2(3.0, 3.5) + vec2(0.0, -time * 0.8 * flickerSpeed) + u_seed + 100.0);
    float fireNoise = v1 * v2 * (0.5 + n1 * 0.5);

    // Height threshold — low at bottom (everything is flame), rises with height
    float heightThreshold = uv.y * 1.1 / max(u_intensity, 0.1);

    // Horizontal concentration — intensity widens the spread
    float hx = abs(uv.x - 0.5);
    heightThreshold += hx * hx * (6.0 - u_intensity * 2.0);

    float flame = smoothstep(0.0, 0.1, fireNoise - heightThreshold);
    if (flame <= 0.0) return vec4(0.0);

    // Opacity noise — warps with flames for organic transparency variation
    float opacityNoise = noise(wp * vec2(12.0, 8.0) + vec2(u_seed + 200.0, -time * 1.2));
    flame *= 0.2 + opacityNoise * 0.8;

    // Colour: deep burnt orange → bright orange → yellow → white-hot
    vec3 deepEdge    = vec3(0.565, 0.153, 0.075); // #902713
    vec3 brightOrange = vec3(1.0, 0.45, 0.05);
    vec3 hotYellow   = vec3(1.0, 0.85, 0.2);
    vec3 whiteHot    = vec3(1.0, 0.97, 0.92);

    vec3 col = mix(deepEdge, brightOrange, smoothstep(0.0, 0.5, flame));
    col = mix(col, hotYellow, smoothstep(0.5, 0.85, flame));
    col = mix(col, whiteHot, smoothstep(0.85, 1.0, flame));

    // Keep edge colours vivid — brightness ramps quickly so low-alpha edges aren't grey
    float brightness = smoothstep(0.0, 0.15, flame);
    return vec4(col * brightness, flame);
  }

  /* ---- Spark layer ----
     Single bright spark per time window, arcing upward then falling.
     Frequency is gated by u_sparkFrequency × u_intensity. */

  vec4 sparks(vec2 uv, float time) {
    vec4 result = vec4(0.0);
    float aspect = u_resolution.x / u_resolution.y;

    float windowLen = 1.2;
    float windowId  = floor(time / windowLen);
    float windowFrac = fract(time / windowLen);

    for (int w = 0; w < 2; w++) {
      float wid  = windowId - float(w);
      float wFrac = windowFrac + float(w);

      // Probability gate
      if (hash(vec2(wid * 17.3 + u_seed, wid * 7.1)) > u_sparkFrequency * u_intensity) continue;
      if (wFrac > 0.8) continue;

      float life = wFrac / 0.8;
      float sid  = wid * 16.0 + u_seed;

      // Launch: upward-biased angle with spread
      float angle = -1.5708 + (hash(vec2(sid * 5.3, sid * 11.7)) - 0.5) * 2.0;
      float spd   = 1.5 + hash(vec2(sid * 7.1, sid * 3.3)) * 1.0;

      // Origin near fire centre
      float sx = 0.35 + hash(vec2(sid * 23.1, sid * 17.9)) * 0.3;
      float sy = 0.05 + hash(vec2(sid * 41.3, sid * 29.7)) * 0.05;

      // Arc trajectory (velocity + gravity)
      sx += cos(angle) * spd * life;
      sy -= sin(angle) * spd * life;
      sy -= life * life * 1.2;

      // Dot with bright core and soft halo
      float dist = length((uv - vec2(sx, sy)) * vec2(aspect, 1.0));
      float sparkSize = 0.006 + hash(vec2(sid, sid * 9.3)) * 0.004;
      float core = smoothstep(sparkSize, sparkSize * 0.3, dist);
      float halo = exp(-dist * dist / (sparkSize * sparkSize * 4.0));
      if (core + halo < 0.01) continue;

      float fade = 1.0 - life * life;
      vec3 coreCol = vec3(1.0, 0.6, 0.2);
      vec3 haloCol = vec3(0.9, 0.25, 0.05);

      result.rgb += coreCol * core * fade + haloCol * halo * fade * 0.6;
      result.a = max(result.a, max(core, halo) * fade);
    }

    return result;
  }

  /* ---- Ember layer ----
     Persistent glowing particles drifting upward with noise-based wind.
     Count and rise speed scale with u_intensity. */

  vec4 embers(vec2 uv, float time) {
    vec4 result = vec4(0.0);
    float aspect = u_resolution.x / u_resolution.y;
    float emberCount = 7.0 + u_intensity * 14.0;

    for (int i = 0; i < 49; i++) {
      if (float(i) >= emberCount) break;

      float s = float(i) * 7.3 + u_seed * 3.1;

      // Staggered lifecycle (4–8 s)
      float period = 4.0 + hash(vec2(s, s * 3.7)) * 4.0;
      float life   = fract(time / period + hash(vec2(s * 11.3, s * 5.1)));

      // Origin near fire
      float ox = 0.25 + hash(vec2(s * 13.7, s * 7.3)) * 0.5;
      float oy = hash(vec2(s * 23.1, s * 17.9)) * 0.1;

      // Rise — faster at higher intensity
      float riseSpeed = (0.15 + hash(vec2(s * 31.3, s * 11.7)) * 0.15) * (0.6 + u_intensity * 0.4);
      float y = oy + life * riseSpeed * period;

      // Noise-based wind drift
      float x = ox
        + (noise(vec2(y * 2.0 + s, time * 0.3 + s * 0.7)) - 0.5) * 0.15
        + (noise(vec2(y * 0.5 + s * 2.0, time * 0.8)) - 0.5) * 0.08;

      // Vertical wobble
      y += (noise(vec2(life * 3.0 + s * 5.0, time * 0.5)) - 0.5) * 0.03;

      if (y > 1.1 || y < -0.05) continue;

      // Size shrinks as ember cools
      float size = (0.004 + hash(vec2(s * 3.1, s * 9.7)) * 0.005) * (1.0 - life * 0.5);
      float dist = length((uv - vec2(x, y)) * vec2(aspect, 1.0));
      float glow = smoothstep(size, size * 0.4, dist);
      if (glow < 0.01) continue;

      // Lifecycle fade
      float alpha = glow * smoothstep(0.0, 0.05, life) * (1.0 - smoothstep(0.6, 1.0, life));

      // Colour cools from bright orange-red to dim red
      vec3 col = mix(vec3(1.0, 0.35, 0.08), vec3(0.6, 0.1, 0.02), life);

      // Flicker
      alpha *= 0.7 + 0.3 * noise(vec2(time * 4.0 + s * 13.0, s));

      result.rgb += col * alpha * 0.6;
      result.a = max(result.a, alpha * 0.5);
    }

    return result;
  }

  /* ---- Smoke layer ----
     3-octave fBm scrolling upward with bell-curve horizontal mask. */

  vec4 smoke(vec2 uv, float time) {
    float vMask = smoothstep(0.7, 0.15, uv.y);
    if (vMask <= 0.0) return vec4(0.0);

    float spread = 0.35 + uv.y * 0.5;
    float hDist  = abs(uv.x - 0.5) / spread;
    float hMask  = exp(-hDist * hDist * 1.5);

    vec2 p = uv * vec2(2.5, 1.5) + vec2(u_seed, -time * 0.25);
    float n = noise(p) * 0.5
            + noise(p * 2.0 + 13.7) * 0.25
            + noise(p * 4.0 + 27.3) * 0.125;
    n = smoothstep(0.25, 0.75, n / 0.875);

    float alpha = n * vMask * hMask * u_smokeOpacity;
    vec3 col = vec3(0.2, 0.15, 0.12);
    return vec4(col * alpha, alpha);
  }

  /* ---- Compositing ---- */

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;

    vec4 smokeLayer = smoke(uv, u_time);
    vec4 fireLayer  = fire(uv, u_time);
    vec4 emberLayer = embers(uv, u_time);
    vec4 sparkLayer = sparks(uv, u_time);

    // Additive colour, max alpha
    vec3 col   = smokeLayer.rgb + fireLayer.rgb + emberLayer.rgb + sparkLayer.rgb;
    float alpha = max(max(smokeLayer.a, fireLayer.a), max(emberLayer.a, sparkLayer.a));

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), clamp(alpha, 0.0, 1.0) * u_fade);
  }
`;
