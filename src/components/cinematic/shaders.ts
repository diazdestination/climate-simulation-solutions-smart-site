export const noiseGlsl = /* glsl */ `
  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 r = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 5; i++) {
      v += a * vnoise(p);
      p = r * p * 2.03 + 11.7;
      a *= 0.5;
    }
    return v;
  }
`;

export const paletteGlsl = /* glsl */ `
  const vec3 COLD_DEEP = vec3(0.027, 0.067, 0.090);
  const vec3 COLD_MID  = vec3(0.075, 0.345, 0.380);
  const vec3 COLD_HI   = vec3(0.663, 0.960, 0.890);
  const vec3 WARM_DEEP = vec3(0.090, 0.040, 0.035);
  const vec3 WARM_MID  = vec3(0.600, 0.215, 0.120);
  const vec3 WARM_HI   = vec3(1.000, 0.470, 0.310);
`;

export const fieldVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.9999, 1.0);
  }
`;

export const fieldFragment = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uHeat;
  uniform float uAspect;
  uniform vec2 uPointer;
  varying vec2 vUv;
  ${noiseGlsl}
  ${paletteGlsl}
  void main() {
    vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
    float t = uTime * 0.035;
    vec2 drift = uPointer * 0.12;
    vec2 q = vec2(fbm(p * 1.5 + t + drift), fbm(p * 1.5 - t * 1.25 - drift));
    float n = fbm(p * 2.1 + 1.7 * q + vec2(0.0, uHeat * 0.6));
    float rise = smoothstep(-0.6, 0.7, p.y + (n - 0.5) * 0.8);
    float heat = clamp(uHeat + (rise - 0.5) * 0.25 * uHeat, 0.0, 1.0);
    vec3 deep = mix(COLD_DEEP, WARM_DEEP, heat);
    vec3 mid = mix(COLD_MID, WARM_MID, heat);
    vec3 hi = mix(COLD_HI, WARM_HI, heat);
    vec3 col = deep;
    col = mix(col, mid, smoothstep(0.38, 0.78, n));
    col = mix(col, hi, smoothstep(0.74, 1.0, n) * 0.45);
    float glow = exp(-length(p - vec2(0.45 * uAspect * 0.5, -0.05)) * 1.6) * 0.22;
    col += mid * glow;
    float vig = smoothstep(1.35, 0.3, length(p));
    col *= mix(0.5, 1.0, vig);
    gl_FragColor = vec4(col, 1.0);
  }
`;

export const particleVertex = /* glsl */ `
  uniform float uTime;
  uniform float uHeat;
  uniform float uPixelRatio;
  uniform float uSize;
  attribute float aSeed;
  attribute float aAngle;
  attribute float aRadius;
  attribute float aLift;
  varying float vSeed;
  varying float vFade;
  void main() {
    vSeed = aSeed;
    float speed = 0.12 + aSeed * 0.22 + uHeat * 0.18;
    float a = aAngle + uTime * speed;
    float r = aRadius + sin(uTime * (0.6 + aSeed) + aSeed * 6.283) * 0.14;
    float y = aLift * 0.9 + sin(a * 2.0 + aSeed * 9.0) * 0.18 + uHeat * (0.35 + aSeed * 0.5);
    vec3 pos = vec3(cos(a) * r, y, sin(a) * r);
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    float twinkle = 0.65 + 0.35 * sin(uTime * (1.5 + aSeed * 3.0) + aSeed * 40.0);
    vFade = twinkle;
    gl_PointSize = uSize * (0.5 + aSeed) * uPixelRatio * twinkle / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

export const particleFragment = /* glsl */ `
  precision highp float;
  uniform float uHeat;
  varying float vSeed;
  varying float vFade;
  ${paletteGlsl}
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float alpha = smoothstep(0.5, 0.05, d) * vFade;
    vec3 cold = mix(COLD_MID, COLD_HI, vSeed);
    vec3 warm = mix(WARM_MID, WARM_HI, vSeed);
    vec3 col = mix(cold, warm, clamp(uHeat + (vSeed - 0.5) * 0.3, 0.0, 1.0));
    gl_FragColor = vec4(col, alpha * 0.85);
  }
`;

export const orbVertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vPos;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = -mv.xyz;
    vPos = position;
    gl_Position = projectionMatrix * mv;
  }
`;

export const orbFragment = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uHeat;
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vPos;
  ${noiseGlsl}
  ${paletteGlsl}
  void main() {
    vec3 n = normalize(vNormal);
    vec3 v = normalize(vView);
    float fres = pow(1.0 - max(dot(n, v), 0.0), 2.6);
    vec2 uv = vec2(atan(vPos.z, vPos.x) * 0.6, vPos.y * 1.4);
    float bands = fbm(uv * 2.2 + vec2(uTime * 0.05, -uTime * 0.03 - uHeat * 0.8));
    vec3 deep = mix(COLD_DEEP, WARM_DEEP, uHeat);
    vec3 mid = mix(COLD_MID, WARM_MID, uHeat);
    vec3 hi = mix(COLD_HI, WARM_HI, uHeat);
    vec3 col = mix(deep * 1.4, mid, smoothstep(0.35, 0.8, bands));
    float lightDot = max(dot(n, normalize(vec3(-0.6, 0.8, 0.9))), 0.0);
    col += hi * pow(lightDot, 6.0) * 0.55;
    col = mix(col, hi, fres * 0.9);
    gl_FragColor = vec4(col, 1.0);
  }
`;
