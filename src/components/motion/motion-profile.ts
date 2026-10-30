"use client";

import { useSyncExternalStore } from "react";

export type MotionProfile = {
  /** False until measured on the client. */
  ready: boolean;
  /** User prefers reduced motion or has a data-saver setting on. */
  reduced: boolean;
  /** WebGL is available in this browser. */
  webgl: boolean;
  /** Fewer cores or little memory: lower particle counts and DPR. */
  lowPower: boolean;
};

const initial: MotionProfile = { ready: false, reduced: false, webgl: false, lowPower: false };

function detectWebgl(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export function measureMotionProfile(): MotionProfile {
  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean };
    deviceMemory?: number;
  };
  const reduced =
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    Boolean(nav.connection?.saveData);
  const cores = nav.hardwareConcurrency ?? 8;
  const memory = nav.deviceMemory ?? 8;
  return {
    ready: true,
    reduced,
    webgl: detectWebgl(),
    lowPower: cores <= 4 || memory <= 4,
  };
}

let cached: MotionProfile | null = null;

function getSnapshot(): MotionProfile {
  if (!cached) cached = measureMotionProfile();
  return cached;
}

function getServerSnapshot(): MotionProfile {
  return initial;
}

function subscribe(onChange: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  const handler = () => {
    cached = null;
    onChange();
  };
  query.addEventListener("change", handler);
  return () => query.removeEventListener("change", handler);
}

/** Client-side motion capabilities. Returns `ready: false` during SSR and hydration. */
export function useMotionProfile(): MotionProfile {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
