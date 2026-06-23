/**
 * Decorative animated gradient orbs for the hero region.
 * Pure CSS animations (no JS), respects prefers-reduced-motion via CSS.
 * Render above .hero-mesh for layered depth.
 */
export function HeroOrbs() {
  return (
    <div className="hero-orbs" aria-hidden="true">
      <div className="hero-orb hero-orb-1" />
      <div className="hero-orb hero-orb-2" />
      <div className="hero-orb hero-orb-3" />
    </div>
  );
}
