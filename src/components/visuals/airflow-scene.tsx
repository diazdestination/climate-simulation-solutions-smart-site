"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  glowFragment,
  glowVertex,
  motesFragment,
  motesVertex,
  streakFragment,
  streakVertex,
} from "./airflow-shaders";

type SceneProps = { lowPower: boolean; active: boolean };

/** Pointer in world units at z = 0, written by the DOM and read in the frame loop. */
export const airflowInput = { x: -10, y: -10, hover: 0 };
const smooth = { x: -10, y: -10, hover: 0 };

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function laneAttributes(count: number, perVertex: number, seedBase: number) {
  const rand = mulberry32(seedBase);
  const n = count * perVertex;
  const position = new Float32Array(n * 3);
  const lane = new Float32Array(n);
  const phase = new Float32Array(n);
  const seed = new Float32Array(n);
  const depth = new Float32Array(n);
  const end = new Float32Array(n);
  for (let i = 0; i < count; i++) {
    const l = (rand() * 2 - 1) * (0.55 + rand() * 0.45);
    const p = rand();
    const s = rand();
    const d = rand() * 2 - 1;
    for (let v = 0; v < perVertex; v++) {
      const k = i * perVertex + v;
      lane[k] = l;
      phase[k] = p;
      seed[k] = s;
      depth[k] = d;
      end[k] = v;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(position, 3));
  g.setAttribute("aLane", new THREE.BufferAttribute(lane, 1));
  g.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
  g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
  g.setAttribute("aDepth", new THREE.BufferAttribute(depth, 1));
  g.setAttribute("aEnd", new THREE.BufferAttribute(end, 1));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 8);
  return g;
}

function useFlowUniforms(extra: Record<string, { value: unknown }> = {}) {
  return useMemo(
    () => ({
      uTime: { value: 0 },
      uPointer: { value: new THREE.Vector2(-10, -10) },
      uSpread: { value: 1.55 },
      ...extra,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
}

function Streaks({ count }: { count: number }) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const geometry = useMemo(() => laneAttributes(count, 2, 101), [count]);
  const uniforms = useFlowUniforms();
  useFrame((state) => {
    const m = material.current;
    if (!m) return;
    m.uniforms.uTime.value = state.clock.elapsedTime;
    m.uniforms.uPointer.value.set(smooth.x, smooth.y);
  });
  return (
    <lineSegments geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={streakVertex}
        fragmentShader={streakFragment}
        transparent
        depthWrite={false}
        blending={THREE.CustomBlending}
        blendSrc={THREE.SrcAlphaFactor}
        blendDst={THREE.OneFactor}
        blendSrcAlpha={THREE.ZeroFactor}
        blendDstAlpha={THREE.OneFactor}
      />
    </lineSegments>
  );
}

function Motes({ count }: { count: number }) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const { gl } = useThree();
  const geometry = useMemo(() => laneAttributes(count, 1, 7), [count]);
  const uniforms = useFlowUniforms({ uPixelRatio: { value: gl.getPixelRatio() } });
  useFrame((state) => {
    const m = material.current;
    if (!m) return;
    m.uniforms.uTime.value = state.clock.elapsedTime;
    m.uniforms.uPointer.value.set(smooth.x, smooth.y);
  });
  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={motesVertex}
        fragmentShader={motesFragment}
        transparent
        depthWrite={false}
        blending={THREE.CustomBlending}
        blendSrc={THREE.SrcAlphaFactor}
        blendDst={THREE.OneFactor}
        blendSrcAlpha={THREE.ZeroFactor}
        blendDstAlpha={THREE.OneFactor}
      />
    </points>
  );
}

function Glow() {
  const material = useRef<THREE.ShaderMaterial>(null);
  const { size } = useThree();
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uAspect: { value: 1 } }), []);
  useFrame((state) => {
    const m = material.current;
    if (!m) return;
    m.uniforms.uTime.value = state.clock.elapsedTime;
    m.uniforms.uAspect.value = size.width / Math.max(size.height, 1);
  });
  return (
    <mesh frustumCulled={false} renderOrder={-10}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={glowVertex}
        fragmentShader={glowFragment}
        transparent
        depthWrite={false}
        depthTest={false}
        blending={THREE.CustomBlending}
        blendSrc={THREE.OneFactor}
        blendDst={THREE.OneFactor}
        blendSrcAlpha={THREE.ZeroFactor}
        blendDstAlpha={THREE.OneFactor}
      />
    </mesh>
  );
}

function bladeShape() {
  const s = new THREE.Shape();
  s.moveTo(0.16, 0);
  s.quadraticCurveTo(0.42, 0.26, 0.86, 0.1);
  s.quadraticCurveTo(0.96, 0.3, 0.8, 0.46);
  s.quadraticCurveTo(0.45, 0.52, 0.12, 0.2);
  s.lineTo(0.16, 0);
  return s;
}

/** Housing ring and spinning fan at the heart of the airflow. */
function FanUnit() {
  const fan = useRef<THREE.Group>(null);
  const spin = useRef(0);
  const blade = useMemo(() => {
    const geo = new THREE.ExtrudeGeometry(bladeShape(), {
      depth: 0.03,
      bevelEnabled: true,
      bevelThickness: 0.01,
      bevelSize: 0.01,
      bevelSegments: 2,
      curveSegments: 10,
    });
    geo.center();
    geo.translate(0.5, 0.22, 0);
    return geo;
  }, []);
  useFrame((_, delta) => {
    const target = 1.6 + smooth.hover * 4.5;
    spin.current += (target - spin.current) * Math.min(1, delta * 2.5);
    if (fan.current) fan.current.rotation.z -= delta * spin.current;
  });
  const blades = useMemo(() => [0, 1, 2, 3, 4].map((i) => (i / 5) * Math.PI * 2), []);
  return (
    <group rotation={[0, -0.55, 0]}>
      <mesh>
        <torusGeometry args={[1.12, 0.045, 24, 120]} />
        <meshStandardMaterial color="#e9f2ff" metalness={0.65} roughness={0.3} />
      </mesh>
      <mesh>
        <torusGeometry args={[1.2, 0.012, 12, 120]} />
        <meshBasicMaterial color="#9fdcff" transparent opacity={0.55} />
      </mesh>
      <mesh position={[0, 0, -0.06]}>
        <ringGeometry args={[0.2, 1.08, 64]} />
        <meshStandardMaterial
          color="#0a1a3a"
          metalness={0.2}
          roughness={0.9}
          transparent
          opacity={0.72}
          side={THREE.DoubleSide}
        />
      </mesh>
      <group ref={fan}>
        {blades.map((angle) => (
          <mesh key={angle} rotation={[0, 0, angle]} geometry={blade}>
            <meshStandardMaterial color="#f5f9ff" metalness={0.35} roughness={0.35} />
          </mesh>
        ))}
        <mesh>
          <cylinderGeometry args={[0.2, 0.2, 0.12, 32]} />
          <meshStandardMaterial color="#dbe8f7" metalness={0.7} roughness={0.25} />
        </mesh>
      </group>
    </group>
  );
}

function Rig({ children }: { children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null);
  useFrame((state, delta) => {
    const k = 1 - Math.exp(-delta * 5);
    smooth.x += (airflowInput.x - smooth.x) * k;
    smooth.y += (airflowInput.y - smooth.y) * k;
    smooth.hover += (airflowInput.hover - smooth.hover) * k;
    const g = group.current;
    if (!g) return;
    const inside = smooth.hover;
    g.rotation.y = THREE.MathUtils.clamp(smooth.x * 0.03, -0.18, 0.18) * inside;
    g.rotation.x = THREE.MathUtils.clamp(-smooth.y * 0.05, -0.14, 0.14) * inside;
    g.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
  });
  return <group ref={group}>{children}</group>;
}

export default function AirflowScene({ lowPower, active }: SceneProps) {
  return (
    <Canvas
      className="airflow-canvas"
      frameloop={active ? "always" : "never"}
      dpr={lowPower ? [1, 1.25] : [1, 1.6]}
      camera={{ fov: 38, near: 0.1, far: 40, position: [0, 0, 7.2] }}
      gl={{ antialias: true, alpha: true, stencil: false, powerPreference: "high-performance" }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      aria-hidden="true"
    >
      <Glow />
      <ambientLight intensity={0.55} />
      <directionalLight position={[2, 4, 5]} intensity={1.1} color="#ffffff" />
      <pointLight position={[-3.2, 0.6, 1.5]} intensity={14} color="#ff6a13" distance={7} />
      <pointLight position={[3.2, -0.3, 1.5]} intensity={14} color="#1f8fe5" distance={7} />
      <Rig>
        <FanUnit />
        <Streaks count={lowPower ? 700 : 1500} />
        <Motes count={lowPower ? 350 : 800} />
      </Rig>
    </Canvas>
  );
}
