export const brandGlsl = /* glsl */ `
  const vec3 FLAME_DEEP = vec3(0.910, 0.255, 0.110);
  const vec3 FLAME      = vec3(1.000, 0.416, 0.075);
  const vec3 SUN        = vec3(1.000, 0.698, 0.122);
  const vec3 SKY        = vec3(0.122, 0.561, 0.898);
  const vec3 SKY_LIGHT  = vec3(0.624, 0.863, 1.000);
  const vec3 ICE        = vec3(0.900, 0.965, 1.000);
`;

/**
 * Shared streamline function: warm air enters from the left, is pulled through a
 * constriction at the fan, and leaves cool on the right. t in 0..1 is progress.
 */
export const streamGlsl = /* glsl */ `
  uniform float uTime;
  uniform vec2 uPointer;
  uniform float uSpread;
  attribute float aLane;
  attribute float aPhase;
  attribute float aSeed;
  attribute float aDepth;
  float constriction(float t) {
    return 1.0 - 0.80 * exp(-pow((t - 0.5) / 0.14, 2.0));
  }
  vec3 streamPos(float t) {
    float s = constriction(t);
    float x = mix(-3.1, 3.1, t);
    float wave = sin(t * 9.0 + aSeed * 6.283) * 0.07 * s;
    float y = aLane * uSpread * s + wave + (t - 0.5) * (t - 0.5) * 0.25 * aLane;
    float z = aDepth * 0.9 * s;
    vec3 p = vec3(x, y, z);
    vec2 d = p.xy - uPointer;
    float push = max(0.0, 1.1 - length(d));
    p.xy += normalize(d + 0.0001) * push * push * 0.55;
    return p;
  }
  float progress(float offset) {
    float speed = 0.075 + aSeed * 0.05;
    return fract(aPhase + uTime * speed + offset);
  }
`;

export const colorGlsl = /* glsl */ `
  vec3 streamColor(float t, float seed) {
    vec3 warm = mix(FLAME_DEEP, SUN, seed);
    warm = mix(warm, FLAME, 0.4);
    vec3 cold = mix(SKY, SKY_LIGHT, seed);
    float k = smoothstep(0.40, 0.60, t);
    vec3 c = mix(warm, cold, k);
    float core = exp(-pow((t - 0.5) / 0.07, 2.0));
    return mix(c, ICE, core * 0.6);
  }
  float streamAlpha(float t) {
    return smoothstep(0.0, 0.22, t) * (1.0 - smoothstep(0.78, 1.0, t));
  }
`;

export const streakVertex = /* glsl */ `
  ${brandGlsl}
  ${streamGlsl}
  ${colorGlsl}
  attribute float aEnd;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float t = progress(aEnd * -0.022);
    vec3 p = streamPos(t);
    vColor = streamColor(t, aSeed);
    vAlpha = streamAlpha(t) * (1.0 - aEnd * 0.85);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

export const streakFragment = /* glsl */ `
  precision highp float;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    gl_FragColor = vec4(vColor, vAlpha * 0.55);
  }
`;

export const motesVertex = /* glsl */ `
  ${brandGlsl}
  ${streamGlsl}
  ${colorGlsl}
  uniform float uPixelRatio;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float t = progress(0.0);
    vec3 p = streamPos(t);
    vColor = streamColor(t, aSeed);
    vAlpha = streamAlpha(t);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float size = (10.0 + aSeed * 14.0) * (1.0 + (1.0 - constriction(t)) * 0.8);
    gl_PointSize = size * uPixelRatio / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

export const motesFragment = /* glsl */ `
  precision highp float;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.08, d);
    gl_FragColor = vec4(vColor, a * vAlpha * 0.9);
  }
`;

export const glowVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.9999, 1.0);
  }
`;

export const glowFragment = /* glsl */ `
  precision highp float;
  ${brandGlsl}
  uniform float uTime;
  uniform float uAspect;
  varying vec2 vUv;
  void main() {
    vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
    float breathe = 0.92 + 0.08 * sin(uTime * 0.6);
    float warm = exp(-pow(length(p - vec2(-0.3 * uAspect, 0.04)) / 0.26, 2.0)) * breathe;
    float cool = exp(-pow(length(p - vec2(0.3 * uAspect, -0.02)) / 0.3, 2.0)) * (1.84 - breathe);
    // Fade to exactly zero before the canvas edge so the box never shows.
    vec2 e = abs(vUv - 0.5) * 2.0;
    float edge = smoothstep(1.0, 0.55, e.x) * smoothstep(1.0, 0.55, e.y);
    vec3 col = (FLAME * warm * 0.42 + SKY * cool * 0.46) * edge;
    gl_FragColor = vec4(col, 1.0);
  }
`;
