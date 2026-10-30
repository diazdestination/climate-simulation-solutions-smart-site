"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { cinematic, heatForProgress } from "@/lib/cinematic-state";
import {
  fieldFragment,
  fieldVertex,
  orbFragment,
  orbVertex,
  particleFragment,
  particleVertex,
} from "./shaders";

type SceneProps = { lowPower: boolean; active: boolean };

/** Small deterministic PRNG so geometry generation stays pure across renders. */
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

/** Shared, lerped scene values updated once per frame by <Rig/>. */
const smooth = { heat: 0.18, progress: 0, px: 0, py: 0 };

function ThermalField() {
  const material = useRef<THREE.ShaderMaterial>(null);
  const { size } = useThree();
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uHeat: { value: 0.18 },
      uAspect: { value: 1 },
      uPointer: { value: new THREE.Vector2() },
    }),
    [],
  );
  useFrame((state) => {
    const m = material.current;
    if (!m) return;
    m.uniforms.uTime.value = state.clock.elapsedTime;
    m.uniforms.uHeat.value = smooth.heat;
    m.uniforms.uAspect.value = size.width / Math.max(size.height, 1);
    m.uniforms.uPointer.value.set(smooth.px, smooth.py);
  });
  return (
    <mesh frustumCulled={false} renderOrder={-10}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={fieldVertex}
        fragmentShader={fieldFragment}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  );
}

function AirflowParticles({ count }: { count: number }) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const { gl } = useThree();
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    const angle = new Float32Array(count);
    const radius = new Float32Array(count);
    const lift = new Float32Array(count);
    const rand = mulberry32(count * 7919 + 17);
    for (let i = 0; i < count; i++) {
      seed[i] = rand();
      angle[i] = rand() * Math.PI * 2;
      radius[i] = 1.55 + Math.pow(rand(), 1.6) * 1.9;
      lift[i] = (rand() - 0.5) * 2;
    }
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    g.setAttribute("aAngle", new THREE.BufferAttribute(angle, 1));
    g.setAttribute("aRadius", new THREE.BufferAttribute(radius, 1));
    g.setAttribute("aLift", new THREE.BufferAttribute(lift, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 6);
    return g;
  }, [count]);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uHeat: { value: 0.18 },
      uPixelRatio: { value: gl.getPixelRatio() },
      uSize: { value: 26 },
    }),
    [gl],
  );
  useFrame((state) => {
    const m = material.current;
    if (!m) return;
    m.uniforms.uTime.value = state.clock.elapsedTime;
    m.uniforms.uHeat.value = smooth.heat;
  });
  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={particleVertex}
        fragmentShader={particleFragment}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function CoreOrb() {
  const material = useRef<THREE.ShaderMaterial>(null);
  const ringA = useRef<THREE.Mesh>(null);
  const ringB = useRef<THREE.Mesh>(null);
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uHeat: { value: 0.18 } }), []);
  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    if (material.current) {
      material.current.uniforms.uTime.value = t;
      material.current.uniforms.uHeat.value = smooth.heat;
    }
    if (ringA.current) {
      ringA.current.rotation.z += delta * 0.08;
      ringA.current.rotation.x = -0.45 + Math.sin(t * 0.2) * 0.05;
    }
    if (ringB.current) {
      ringB.current.rotation.z -= delta * 0.05;
      ringB.current.rotation.x = 0.9 + Math.cos(t * 0.17) * 0.05;
    }
  });
  const ringColor = useMemo(() => new THREE.Color("#a9f5e3"), []);
  return (
    <group>
      <mesh>
        <sphereGeometry args={[1.12, 96, 96]} />
        <shaderMaterial
          ref={material}
          uniforms={uniforms}
          vertexShader={orbVertex}
          fragmentShader={orbFragment}
        />
      </mesh>
      <mesh ref={ringA} rotation={[-0.45, 0, 0]}>
        <torusGeometry args={[1.75, 0.006, 8, 220]} />
        <meshBasicMaterial color={ringColor} transparent opacity={0.5} />
      </mesh>
      <mesh ref={ringB} rotation={[0.9, 0.3, 0]}>
        <torusGeometry args={[2.25, 0.004, 8, 240]} />
        <meshBasicMaterial color={ringColor} transparent opacity={0.28} />
      </mesh>
    </group>
  );
}

/** Reads the shared scroll state, eases it, and moves the camera and subject. */
function Rig({ children }: { children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null);
  const { size } = useThree();
  useFrame((state, delta) => {
    const k = 1 - Math.exp(-delta * 4.5);
    smooth.progress += (cinematic.progress - smooth.progress) * k;
    smooth.heat += (heatForProgress(cinematic.progress) - smooth.heat) * k;
    smooth.px += (cinematic.pointer.x - smooth.px) * k * 0.6;
    smooth.py += (cinematic.pointer.y - smooth.py) * k * 0.6;

    const wide = size.width / Math.max(size.height, 1) > 1.05;
    const p = smooth.progress;
    const settle = THREE.MathUtils.smoothstep(p, 0.62, 1);
    const g = group.current;
    if (g) {
      const sideX = wide ? 1.55 : 0;
      const sideY = wide ? -0.1 : 1.25;
      g.position.x = THREE.MathUtils.lerp(sideX, wide ? 0.7 : 0, settle) + smooth.px * 0.12;
      g.position.y = THREE.MathUtils.lerp(sideY, wide ? 0.15 : 1.05, settle) + smooth.py * 0.08;
      const baseScale = wide ? 1 : 0.58;
      g.scale.setScalar(baseScale * (1 - settle * 0.12));
      g.rotation.y += delta * 0.09;
      g.rotation.x = smooth.py * 0.18 + Math.sin(state.clock.elapsedTime * 0.25) * 0.04;
      g.rotation.z = -smooth.px * 0.08;
    }
    const cam = state.camera;
    cam.position.z = THREE.MathUtils.lerp(6.2, 4.9, THREE.MathUtils.smoothstep(p, 0.15, 1));
    cam.position.x = smooth.px * 0.18;
    cam.position.y = smooth.py * 0.12 + THREE.MathUtils.lerp(0, 0.2, p);
    cam.lookAt(0, THREE.MathUtils.lerp(0, 0.25, settle), 0);
  });
  return <group ref={group}>{children}</group>;
}

export default function HeroScene({ lowPower, active }: SceneProps) {
  const count = lowPower ? 900 : 2400;
  return (
    <Canvas
      className="cine-canvas"
      frameloop={active ? "always" : "never"}
      dpr={lowPower ? [1, 1.25] : [1, 1.6]}
      camera={{ fov: 42, near: 0.1, far: 50, position: [0, 0, 6.2] }}
      gl={{
        antialias: false,
        alpha: false,
        stencil: false,
        powerPreference: "high-performance",
      }}
      onCreated={({ gl }) => {
        gl.setClearColor("#061017", 1);
      }}
      aria-hidden="true"
    >
      <ThermalField />
      <Rig>
        <CoreOrb />
        <AirflowParticles count={count} />
      </Rig>
    </Canvas>
  );
}
