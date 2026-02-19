export const SPLATTER_VS = `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

export const SPLATTER_FS = `
  precision mediump float;
  uniform float u_time;
  uniform float u_fade;
  uniform vec2 u_resolution;
  uniform vec3 u_color;
  uniform float u_seed;
  uniform float u_density;
  uniform float u_fluidity;

  float hash(vec2 p) {
    p = fract(p * vec2(443.897, 441.423));
    p += dot(p, p + 19.19);
    return fract(p.x * p.y);
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

  // Generate an impact center position from an index
  vec2 impactCenter(float idx, float aspect) {
    float s = idx * 57.3 + u_seed * 3.1;
    return vec2(
      -0.1 + hash(vec2(s * 13.7, s * 7.3)) * (aspect + 0.2),
      -0.05 + hash(vec2(s * 23.1, s * 17.9)) * 1.1
    );
  }

  // Compute a single blob with directional force scattering
  float splatBlob(vec2 auv, vec2 center, float size, float s) {
    vec2 diff = auv - center;
    float dist = length(diff);
    if (dist > size * 3.0) return 0.0;

    float angle = atan(diff.y, diff.x);
    float nx = cos(angle);
    float ny = sin(angle);

    // Per-blob random force direction (the side that sprays outward)
    float forceAngle = hash(vec2(s * 41.3, s * 27.1)) * 6.28318;
    vec2 forceDir = vec2(cos(forceAngle), sin(forceAngle));
    vec2 pixelDir = (dist > 0.001) ? diff / dist : vec2(0.0);
    float alignment = dot(pixelDir, forceDir);

    // Scatter factor: gentle transition from round side to spray side
    float scatter = smoothstep(-0.3, 0.8, alignment);

    // Base shape: elongated toward force direction
    float baseEdge = size * (1.0 + scatter * 0.35);

    // Low-freq organic wobble (present on all sides, keeps it liquid)
    float wobble = noise(vec2(nx * 1.5 + s, ny * 1.5 + s * 3.7)) * size * 0.25;

    // Medium-freq lobes: wider on spray side for smooth bulges
    float medNoise = noise(vec2(nx * 3.5 + s * 2.0, ny * 3.5 + s));
    float medDistort = medNoise * size * (0.1 + scatter * 0.35);

    // Broad spray lobes: smooth rounded projections on force side only
    float lobeNoise = noise(vec2(nx * 6.0 + s * 3.0, ny * 6.0 + s * 2.0));
    float lobes = lobeNoise * lobeNoise * size * scatter * 0.4;

    float edge = baseEdge + wobble + medDistort + lobes;
    return 1.0 - smoothstep(edge * 0.85, edge, dist);
  }

  // Skeleton-based drip trail
  float dripTrail(vec2 auv, vec2 center, float bSize, float dBase, float seed, float pw) {
    float below = center.y - auv.y;
    float speed = (0.75 + hash(vec2(seed * 5.3, seed * 9.7)) * 0.5) * u_fluidity;
    float dripLen = bSize * 1.3 + bSize * 1.0 * u_time * speed;
    if (below < -dBase || abs(auv.x - center.x) > dBase * 2.0 || below > dripLen + dBase) return 0.0;
    float skY = clamp(below, 0.0, dripLen);
    float t = skY / dripLen;
    float nPos = skY / bSize;
    float wob = (noise(vec2(nPos * 0.8 + seed, seed * 7.3)) - 0.5) * bSize * 0.25;
    float skX = center.x + wob;
    float dx = auv.x - skX;
    float dy = auv.y - (center.y - skY);
    float lN = 0.5 + noise(vec2(nPos * 3.0 + seed * 2.0, seed * 3.1)) * 0.5;
    float rN = 0.5 + noise(vec2(nPos * 3.0 + seed * 6.0, seed * 11.3)) * 0.5;
    float topSm = smoothstep(0.3, 0.0, t);
    lN = mix(lN, 1.0, topSm);
    rN = mix(rN, 1.0, topSm);
    float hg = 1.0 - 0.25 * sin(t * 3.14159);
    float tt = 1.0 - 0.3 * smoothstep(0.6, 1.0, t);
    float lW = dBase * lN * hg * tt;
    float rW = dBase * rN * hg * tt;
    float r = mix(lW, rW, smoothstep(-dBase * 0.3, dBase * 0.3, dx));
    float d = length(vec2(dx, dy * 0.75));
    return (1.0 - smoothstep(r - pw, r, d)) * smoothstep(0.0, bSize * 0.1, below);
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    float aspect = u_resolution.x / u_resolution.y;
    vec2 auv = vec2(uv.x * aspect, uv.y);
    float pw = 2.0 / u_resolution.y;

    float splat = 0.0;

    // Impact splats (u_density = number of splats)
    for (int i = 0; i < 20; i++) {
      float fi = float(i);
      if (fi >= u_density) break;
      float si = fi * 13.7 + u_seed;
      vec2 impact = impactCenter(fi, aspect);

      // Main blob: varied sizes per impact
      float bSize = (fi < 1.0) ? 0.06 + hash(vec2(si, si * 3.1)) * 0.04
                  : (fi < 3.0) ? 0.04 + hash(vec2(si, si * 3.1)) * 0.03
                  :              0.02 + hash(vec2(si, si * 3.1)) * 0.025;
      float dBase = bSize * ((fi < 2.0) ? 0.5 : 0.4);

      splat += splatBlob(auv, impact, bSize, si);
      splat += dripTrail(auv, impact, bSize, dBase, si, pw);

      // Cluster blobs around this impact
      float maxJ = (fi < 1.0) ? 5.0 : (fi < 3.0) ? 4.0 : 3.0;
      for (int j = 0; j < 5; j++) {
        float fj = float(j);
        if (fj >= maxJ) break;
        float cs = (fi * 10.0 + fj + 1.0) * 7.3 + u_seed;
        float cAng = hash(vec2(cs * 11.3, cs * 5.7)) * 6.28318;
        float cRad = 0.02 + hash(vec2(cs * 19.1, cs * 3.3)) * 0.05;
        vec2 cc = impact + vec2(cos(cAng), sin(cAng)) * cRad;
        float cSize = bSize * (0.3 + hash(vec2(cs, cs * 3.1)) * 0.4);
        splat += splatBlob(auv, cc, cSize, cs);

        // Drip from first 2 cluster blobs
        if (j < 2) {
          splat += dripTrail(auv, cc, cSize, cSize * 0.4, cs, pw);
        }
      }
    }

    // Scattered droplets near impacts
    float maxDroplets = u_density * 5.0;
    for (int i = 0; i < 100; i++) {
      if (float(i) >= maxDroplets) break;
      float fi = float(i) + 50.0;
      float s = fi * 5.7 + u_seed;
      float parentIdx = floor(hash(vec2(s * 41.0, s * 17.0)) * min(u_density, 20.0));
      vec2 parent = impactCenter(parentIdx, aspect);
      float angleOff = hash(vec2(s * 31.3, s * 11.7)) * 6.28318;
      float radius = 0.05 + hash(vec2(s * 43.1, s * 29.3)) * 0.12;
      vec2 center = parent + vec2(cos(angleOff), sin(angleOff)) * radius;
      float size = 0.004 + hash(vec2(s * 7.0, s)) * 0.008;
      float dist = length(auv - center);
      splat += 1.0 - smoothstep(size * 0.4, size, dist);
    }

    splat = clamp(splat, 0.0, 1.0);

    // Internal variation: gentle noise-based transparency
    float internalNoise = noise(auv * 12.0 + u_seed * 1.7);
    float thicknessVar = 0.7 + internalNoise * 0.3;
    splat *= thicknessVar;

    splat *= u_fade;

    // Two-tone color: darker where thick, brighter where thin
    vec3 darkTone = u_color * 0.35;
    vec3 brightTone = min(u_color * 2.2 + vec3(0.15, 0.02, 0.01), vec3(1.0));
    float gradation = splat * splat;
    vec3 color = mix(brightTone, darkTone, gradation);

    gl_FragColor = vec4(color * splat, splat);
  }
`;
