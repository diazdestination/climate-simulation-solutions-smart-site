/**
 * Static, CSS-only visual used during SSR, while the WebGL bundle loads,
 * and for users who prefer reduced motion or lack WebGL.
 */
export function HeroFallback() {
  return (
    <div className="cine-fallback" aria-hidden="true">
      <div className="hero-visual">
        <div className="visual-ring ring-one" />
        <div className="visual-ring ring-two" />
        <div className="visual-core">
          <div className="core-shine" />
        </div>
      </div>
    </div>
  );
}
