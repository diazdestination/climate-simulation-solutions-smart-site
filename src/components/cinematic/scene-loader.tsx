"use client";

import dynamic from "next/dynamic";
import { HeroFallback } from "./hero-fallback";

/** Loads the WebGL scene only in the browser; the fallback renders on the server. */
export const SceneLoader = dynamic(() => import("./hero-scene"), {
  ssr: false,
  loading: () => <HeroFallback />,
});
